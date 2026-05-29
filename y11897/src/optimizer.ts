import {
  ResidentPoint,
  FacilityCandidate,
  RoadNetwork,
  ServiceRadiusConfig,
  OptimizationResult,
  ResultCategory,
  ValidationIssue,
  SelectionReport
} from './types';
import {
  calculateCoverage,
  CoverageCalculationOptions,
  ALGORITHM_DESCRIPTIONS
} from './core/coverage';
import { calculateFairnessMetrics, interpretFairness } from './core/fairness';
import { identifyBlindAreas, suggestBlindAreaSolutions } from './core/blindArea';
import { CalculationHistory, generateChangeReport } from './core/changeDetection';
import { DistanceMetric } from './core/distance';

export interface OptimizerConfig {
  distanceMetric?: DistanceMetric;
  useNetworkDistance?: boolean;
  minReasonableRadius?: number;
  maxReasonableRadius?: number;
}

export class CityServiceRadiusOptimizer {
  private residents: ResidentPoint[] = [];
  private facilities: FacilityCandidate[] = [];
  private network?: RoadNetwork;
  private history: CalculationHistory;
  private config: Required<OptimizerConfig>;

  constructor(config: OptimizerConfig = {}) {
    this.config = {
      distanceMetric: config.distanceMetric || 'euclidean',
      useNetworkDistance: config.useNetworkDistance || false,
      minReasonableRadius: config.minReasonableRadius || 100,
      maxReasonableRadius: config.maxReasonableRadius || 10000
    };
    this.history = new CalculationHistory();
  }

  setResidents(residents: ResidentPoint[]): void {
    this.residents = residents;
  }

  setFacilities(facilities: FacilityCandidate[]): void {
    this.facilities = facilities;
  }

  setNetwork(network: RoadNetwork): void {
    this.network = network;
  }

  addResident(resident: ResidentPoint): void {
    this.residents.push(resident);
  }

  addFacility(facility: FacilityCandidate): void {
    this.facilities.push(facility);
  }

  optimize(radiusConfig: ServiceRadiusConfig): OptimizationResult {
    const startTime = Date.now();

    const coverageOptions: Partial<CoverageCalculationOptions> = {
      distanceMetric: this.config.distanceMetric,
      useNetworkDistance: this.config.useNetworkDistance
    };

    const coverageResult = calculateCoverage(
      this.residents,
      this.facilities,
      radiusConfig,
      this.network,
      coverageOptions
    );

    const fairnessMetrics = calculateFairnessMetrics(
      this.residents,
      coverageResult.results
    );

    const blindAreas = identifyBlindAreas(
      this.residents,
      coverageResult.results
    );

    const effectiveRadius = this.convertToMeters(radiusConfig);

    const category = this.classifyResult(
      coverageResult.issues,
      fairnessMetrics
    );

    const changesFromPrevious = this.history.compareWithPrevious(
      effectiveRadius,
      coverageResult.results
    );

    this.history.addState(effectiveRadius, coverageResult.results);

    const calculationTime = Date.now() - startTime;

    return {
      category,
      coverageResults: coverageResult.results,
      fairnessMetrics,
      blindAreas,
      validationIssues: coverageResult.issues,
      calculationMetadata: {
        algorithm: coverageResult.algorithmInfo.name,
        formula: coverageResult.algorithmInfo.formula,
        calculationTime,
        timestamp: new Date(),
        parameters: {
          radiusConfig,
          options: coverageOptions,
          residentCount: this.residents.length,
          facilityCount: this.facilities.length
        }
      },
      changesFromPrevious: changesFromPrevious || undefined
    };
  }

  private convertToMeters(config: ServiceRadiusConfig): number {
    if (config.unit === 'meter') {
      return config.radius;
    } else {
      const walkSpeed = config.walkSpeed || 80;
      return config.radius * walkSpeed;
    }
  }

  private classifyResult(
    issues: ValidationIssue[],
    fairnessMetrics: any
  ): ResultCategory {
    const radiusTooShort = issues.some(
      i => i.type === 'radius_too_short' && i.severity === 'error'
    );
    if (radiusTooShort) {
      return 'radius_too_short';
    }

    const criticalErrors = issues.filter(i => i.severity === 'error');
    const hasNetworkIssues = issues.some(i => i.type === 'network_breakpoint');
    const hasDataIssues = issues.some(i => i.type === 'missing_data');
    const hasDuplicateIssues = issues.some(i => i.type === 'duplicate_population');

    if (criticalErrors.length > 0) {
      return 'radius_too_short';
    }

    const needsConfirmation =
      (hasNetworkIssues && issues.some(i => i.severity === 'warning')) ||
      (hasDataIssues && issues.some(i => i.severity === 'warning')) ||
      (hasDuplicateIssues && issues.some(i => i.severity === 'warning')) ||
      fairnessMetrics.giniCoefficient > 0.4 ||
      fairnessMetrics.populationCoverageRate < 0.6;

    if (needsConfirmation) {
      return 'needs_confirmation';
    }

    return 'usable';
  }

  generateReport(result: OptimizationResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(70));
    lines.push('城市服务半径优化分析报告');
    lines.push('='.repeat(70));
    lines.push('');

    const categoryText = {
      usable: '【可直接使用】',
      needs_confirmation: '【需要城市规划师确认】',
      radius_too_short: '【半径过短，暂时不能算】'
    };
    lines.push(`${categoryText[result.category]}`);
    lines.push('');

    lines.push('--- 算法信息 ---');
    lines.push(`算法: ${result.calculationMetadata.algorithm}`);
    lines.push(`公式: ${result.calculationMetadata.formula}`);
    lines.push(`计算耗时: ${result.calculationMetadata.calculationTime}ms`);
    lines.push('');

    lines.push('--- 覆盖情况 ---');
    lines.push(`居民点覆盖率: ${(result.fairnessMetrics.coverageRate * 100).toFixed(1)}%`);
    lines.push(`人口覆盖率: ${(result.fairnessMetrics.populationCoverageRate * 100).toFixed(1)}%`);
    lines.push(`覆盖人口: ${result.fairnessMetrics.coveredPopulation.toLocaleString()} / ${result.fairnessMetrics.totalPopulation.toLocaleString()} 人`);
    lines.push(`平均距离: ${result.fairnessMetrics.averageDistance.toFixed(1)} 米`);
    lines.push(`最远距离: ${result.fairnessMetrics.maxDistance.toFixed(1)} 米`);
    lines.push('');

    lines.push('--- 公平性指标 ---');
    const fairnessInterpretation = interpretFairness(result.fairnessMetrics);
    lines.push(`整体评价: ${fairnessInterpretation.overall === 'excellent' ? '优秀' : fairnessInterpretation.overall === 'good' ? '良好' : fairnessInterpretation.overall === 'fair' ? '一般' : '较差'}`);
    lines.push(`基尼系数: ${result.fairnessMetrics.giniCoefficient.toFixed(3)}`);
    lines.push(`泰尔指数: ${result.fairnessMetrics.theilIndex.toFixed(3)}`);
    lines.push('');

    if (result.blindAreas.length > 0) {
      lines.push('--- 盲区分析 ---');
      lines.push(`发现 ${result.blindAreas.length} 个盲区`);
      const solutions = suggestBlindAreaSolutions(result.blindAreas);
      solutions.forEach(s => lines.push(s));
      lines.push('');
    }

    if (result.validationIssues.length > 0) {
      lines.push('--- 数据校验问题 ---');
      const errorIssues = result.validationIssues.filter(i => i.severity === 'error');
      const warningIssues = result.validationIssues.filter(i => i.severity === 'warning');
      const infoIssues = result.validationIssues.filter(i => i.severity === 'info');

      if (errorIssues.length > 0) {
        lines.push(`【错误】 ${errorIssues.length} 项:`);
        errorIssues.forEach(i => lines.push(`  - ${i.message}`));
      }
      if (warningIssues.length > 0) {
        lines.push(`【警告】 ${warningIssues.length} 项:`);
        warningIssues.forEach(i => lines.push(`  - ${i.message}`));
      }
      if (infoIssues.length > 0) {
        lines.push(`【提示】 ${infoIssues.length} 项:`);
        infoIssues.forEach(i => lines.push(`  - ${i.message}`));
      }
      lines.push('');
    }

    if (result.changesFromPrevious) {
      lines.push('--- 与上次计算对比 ---');
      lines.push(generateChangeReport(result.changesFromPrevious));
      lines.push('');
    }

    lines.push('='.repeat(70));

    return lines.join('\n');
  }

  generateSelectionReport(result: OptimizationResult): SelectionReport {
    const blindAreaSolutions = suggestBlindAreaSolutions(result.blindAreas);
    const fairnessInterpretation = interpretFairness(result.fairnessMetrics);

    const recommendedFacilities = this.facilities
      .filter(f => !f.existing)
      .map(f => f.id);

    const analysis = this.generateAnalysisText(result, fairnessInterpretation);
    const suggestions = [...blindAreaSolutions];

    if (result.category === 'needs_confirmation') {
      suggestions.push('【注意】结果需要规划师确认，建议重点检查数据质量问题。');
    }

    if (result.fairnessMetrics.giniCoefficient > 0.3) {
      suggestions.push('【建议】空间分布公平性有待提升，考虑在距离较远的区域增加设施点。');
    }

    return {
      recommendedFacilities,
      analysis,
      suggestions,
      dataSources: ['居民点数据', '候选设施点数据', '服务半径配置', '步行路网数据(可选)']
    };
  }

  private generateAnalysisText(result: OptimizationResult, fairness: any): string {
    const parts: string[] = [];

    parts.push(`本次分析共涉及 ${this.residents.length} 个居民点，总人口 ${result.fairnessMetrics.totalPopulation.toLocaleString()} 人。`);
    parts.push(`候选设施点 ${this.facilities.length} 个。`);

    if (result.fairnessMetrics.populationCoverageRate >= 0.8) {
      parts.push('人口覆盖率较高，整体服务可达性良好。');
    } else if (result.fairnessMetrics.populationCoverageRate >= 0.6) {
      parts.push('人口覆盖率基本达标，但仍有优化空间。');
    } else {
      parts.push('人口覆盖率偏低，建议增加设施或调整服务半径。');
    }

    if (result.blindAreas.length > 0) {
      const totalBlindPopulation = result.blindAreas.reduce((sum, a) => sum + a.population, 0);
      parts.push(`存在 ${result.blindAreas.length} 个服务盲区，影响约 ${totalBlindPopulation.toLocaleString()} 人。`);
    }

    return parts.join(' ');
  }

  clearHistory(): void {
    this.history.clear();
  }

  getAlgorithmDescriptions(): typeof ALGORITHM_DESCRIPTIONS {
    return ALGORITHM_DESCRIPTIONS;
  }
}
