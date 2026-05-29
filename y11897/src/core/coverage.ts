import {
  ResidentPoint,
  FacilityCandidate,
  RoadNetwork,
  ServiceRadiusConfig,
  CoverageResult,
  ValidationIssue
} from '../types';
import { euclideanDistance, DistanceMetric, getDistanceCalculator, CALCULATION_FORMULA } from './distance';
import { NetworkGraph, validateNetwork } from './network';

export interface CoverageCalculationOptions {
  distanceMetric: DistanceMetric;
  useNetworkDistance: boolean;
}

export interface CoverageCalculationResult {
  results: CoverageResult[];
  issues: ValidationIssue[];
  algorithmInfo: {
    name: string;
    formula: string;
    description: string;
  };
}

export const ALGORITHM_DESCRIPTIONS = {
  straight_line: {
    name: '直线距离法',
    formula: CALCULATION_FORMULA.euclidean,
    description: '使用欧几里得几何公式计算两点之间的直线距离。适用于初步估算或路网数据缺失的情况。'
  },
  network_distance: {
    name: '路网距离法',
    formula: 'd = d_access1 + d_road + d_access2',
    description: '基于实际步行路网计算最短路径距离。先找到居民点和设施点最近的路网节点，再计算路网内的最短路径，最后加上接入距离。'
  },
  manhattan: {
    name: '曼哈顿距离法',
    formula: CALCULATION_FORMULA.manhattan,
    description: '计算两点在网格状街道中的行走距离，适用于规整的城市街区布局。'
  }
};

export function calculateCoverage(
  residents: ResidentPoint[],
  facilities: FacilityCandidate[],
  radiusConfig: ServiceRadiusConfig,
  network?: RoadNetwork,
  options: Partial<CoverageCalculationOptions> = {}
): CoverageCalculationResult {
  const startTime = Date.now();

  const defaultOptions: CoverageCalculationOptions = {
    distanceMetric: 'euclidean',
    useNetworkDistance: false
  };

  const finalOptions = { ...defaultOptions, ...options };
  const issues: ValidationIssue[] = [];
  const effectiveRadius = convertToMeters(radiusConfig);

  issues.push(...validateRadius(effectiveRadius, radiusConfig));
  issues.push(...validateResidents(residents));
  issues.push(...validateFacilities(facilities));

  let algorithmInfo = ALGORITHM_DESCRIPTIONS.straight_line;
  let calculateDistance: (r: ResidentPoint, f: FacilityCandidate) => number;

  if (finalOptions.useNetworkDistance && network) {
    const networkIssues = validateNetwork(network);
    issues.push(...networkIssues);

    const graph = new NetworkGraph(network);
    algorithmInfo = ALGORITHM_DESCRIPTIONS.network_distance;

    calculateDistance = (r, f) => {
      const result = graph.calculateNetworkDistance(r.coordinate, f.coordinate);
      return result.distance;
    };
  } else if (finalOptions.distanceMetric === 'manhattan') {
    algorithmInfo = ALGORITHM_DESCRIPTIONS.manhattan;
    const calculator = getDistanceCalculator('manhattan');
    calculateDistance = (r, f) => calculator(r.coordinate, f.coordinate);
  } else {
    const calculator = getDistanceCalculator(finalOptions.distanceMetric);
    calculateDistance = (r, f) => calculator(r.coordinate, f.coordinate);
  }

  const results: CoverageResult[] = residents.map(resident => {
    let minDistance = Infinity;
    let nearestFacilityId: string | null = null;

    const allFacilities = facilities.map(facility => {
      const distance = calculateDistance(resident, facility);
      const withinRadius = distance <= effectiveRadius;

      if (distance < minDistance) {
        minDistance = distance;
        nearestFacilityId = facility.id;
      }

      return {
        facilityId: facility.id,
        distance,
        withinRadius
      };
    });

    return {
      residentId: resident.id,
      covered: minDistance <= effectiveRadius,
      distance: minDistance,
      nearestFacilityId,
      nearestFacilityDistance: minDistance,
      allFacilities
    };
  });

  return {
    results,
    issues,
    algorithmInfo
  };
}

function convertToMeters(config: ServiceRadiusConfig): number {
  if (config.unit === 'meter') {
    return config.radius;
  } else {
    const walkSpeed = config.walkSpeed || 80;
    return config.radius * walkSpeed;
  }
}

function validateRadius(radius: number, originalConfig: ServiceRadiusConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (radius <= 0) {
    issues.push({
      type: 'radius_too_short',
      severity: 'error',
      message: `服务半径必须大于0，当前值: ${originalConfig.radius} ${originalConfig.unit}`,
      details: { providedRadius: originalConfig.radius, unit: originalConfig.unit }
    });
  }

  const MIN_REASONABLE_RADIUS = 50;
  if (radius > 0 && radius < MIN_REASONABLE_RADIUS) {
    issues.push({
      type: 'radius_too_short',
      severity: 'warning',
      message: `服务半径 ${radius} 米过短，可能无法覆盖任何居民点。建议社区医院设置为 500-1000 米，学校设置为 1000-2000 米。`,
      details: {
        providedRadius: radius,
        minRecommended: { hospital: 500, school: 1000 },
        reason: checkShortRadiusReason(radius)
      }
    });
  }

  const MAX_REASONABLE_RADIUS = 10000;
  if (radius > MAX_REASONABLE_RADIUS) {
    issues.push({
      type: 'radius_too_short',
      severity: 'info',
      message: `服务半径 ${radius} 米过大，可能超出实际步行可达范围。`,
      details: { providedRadius: radius, maxRecommended: MAX_REASONABLE_RADIUS }
    });
  }

  return issues;
}

function checkShortRadiusReason(radius: number): string[] {
  const reasons: string[] = [];

  if (radius < 50) {
    reasons.push('可能混淆了单位，输入的是分钟而非米？');
  }
  if (radius > 0 && radius < 100) {
    reasons.push('可能误将公里当作米输入？');
  }
  if (radius < 200) {
    reasons.push('对于城市公共服务设施，此半径通常仅适用于楼栋级服务点');
  }

  return reasons.length > 0 ? reasons : ['请确认服务半径的单位是否正确'];
}

function validateResidents(residents: ResidentPoint[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idSet = new Set<string>();
  const coordMap = new Map<string, string[]>();

  for (const resident of residents) {
    if (idSet.has(resident.id)) {
      issues.push({
        type: 'duplicate_population',
        severity: 'warning',
        message: `存在重复的居民点ID: ${resident.id}，可能导致人口重复计算`,
        details: { residentId: resident.id }
      });
    }
    idSet.add(resident.id);

    const coordKey = `${resident.coordinate.x.toFixed(4)},${resident.coordinate.y.toFixed(4)}`;
    if (coordMap.has(coordKey)) {
      const existingIds = coordMap.get(coordKey)!;
      existingIds.push(resident.id);
      issues.push({
        type: 'duplicate_population',
        severity: 'warning',
        message: `居民点 ${resident.id} 与 ${existingIds.slice(0, -1).join(', ')} 位置重合，请确认是否为同一地点重复录入`,
        details: { residentIds: existingIds, coordinate: coordKey }
      });
    } else {
      coordMap.set(coordKey, [resident.id]);
    }

    if (resident.population <= 0) {
      issues.push({
        type: 'missing_data',
        severity: 'warning',
        message: `居民点 ${resident.id} 人口数据异常: ${resident.population}`,
        details: { residentId: resident.id, population: resident.population }
      });
    }
  }

  return issues;
}

function validateFacilities(facilities: FacilityCandidate[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (facilities.length === 0) {
    issues.push({
      type: 'missing_data',
      severity: 'error',
      message: '未提供任何候选设施点，无法进行覆盖计算',
      details: {}
    });
  }

  const idSet = new Set<string>();
  for (const facility of facilities) {
    if (idSet.has(facility.id)) {
      issues.push({
        type: 'duplicate_population',
        severity: 'warning',
        message: `存在重复的设施点ID: ${facility.id}`,
        details: { facilityId: facility.id }
      });
    }
    idSet.add(facility.id);
  }

  return issues;
}
