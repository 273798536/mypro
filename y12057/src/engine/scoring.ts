import { v4 as uuidv4 } from 'uuid';
import type { 
  GameScore, 
  ScoreBreakdown, 
  Deduction, 
  GameEvent,
  GameState,
  Deployment
} from './types';
import { severityToNumber } from './types';

const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  congestionManagement: 0.25,
  patrolCoverage: 0.2,
  emergencyResponse: 0.25,
  resourceAllocation: 0.15,
  overallSituation: 0.15
};

export class ScoringEngine {
  private maxScore: number = 100;
  private deductions: Deduction[] = [];
  private eventResponseTimes: Map<string, number> = new Map();

  public calculateScore(state: GameState): GameScore {
    const breakdown = this.calculateBreakdown(state);
    const totalScore = this.calculateWeightedScore(breakdown);
    const grade = this.getGrade(totalScore);

    return {
      id: uuidv4(),
      gameId: state.id,
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown,
      deductions: [...this.deductions],
      grade
    };
  }

  private calculateBreakdown(state: GameState): ScoreBreakdown {
    return {
      congestionManagement: this.calculateCongestionManagement(state),
      patrolCoverage: this.calculatePatrolCoverage(state),
      emergencyResponse: this.calculateEmergencyResponse(state),
      resourceAllocation: this.calculateResourceAllocation(state),
      overallSituation: this.calculateOverallSituation(state)
    };
  }

  private calculateCongestionManagement(state: GameState): number {
    let score = 100;

    const avgCongestion = state.snapshots.reduce(
      (sum, s) => sum + s.congestionIndex, 
      0
    ) / Math.max(1, state.snapshots.length);

    if (avgCongestion > 1.5) {
      score -= 40;
      this.addDeduction(
        'congestionManagement',
        40,
        `平均拥堵指数过高 (${avgCongestion.toFixed(2)})，未能有效管理出口拥堵`
      );
    } else if (avgCongestion > 1.2) {
      score -= 25;
      this.addDeduction(
        'congestionManagement',
        25,
        `平均拥堵指数偏高 (${avgCongestion.toFixed(2)})，需要加强人流疏导`
      );
    } else if (avgCongestion > 0.9) {
      score -= 10;
      this.addDeduction(
        'congestionManagement',
        10,
        `存在间歇性拥堵 (平均指数: ${avgCongestion.toFixed(2)})`
      );
    }

    const congestionEvents = state.events.filter(e => e.type === 'exit_congestion');
    const unresolvedCongestion = congestionEvents.filter(e => !e.resolved);
    
    if (unresolvedCongestion.length > 0) {
      score -= unresolvedCongestion.length * 15;
      for (const event of unresolvedCongestion) {
        this.addDeduction(
          'congestionManagement',
          15,
          `出口拥堵事件未及时处理: ${event.title}`,
          event.id
        );
      }
    }

    const stageOverflowEvents = state.events.filter(e => e.type === 'stage_overflow');
    const resolvedStageOverflow = stageOverflowEvents.filter(e => e.resolved);
    for (const event of resolvedStageOverflow) {
      const responseTime = (event.resolutionTime || 0) - event.timestamp;
      if (responseTime > 120) {
        score -= 20;
        this.addDeduction(
          'congestionManagement',
          20,
          `舞台过载事件响应过慢 (${responseTime}秒)`,
          event.id
        );
      }
    }

    return Math.max(0, score);
  }

  private calculatePatrolCoverage(state: GameState): number {
    let score = 100;

    const avgCoverage = state.snapshots.reduce(
      (sum, s) => sum + s.patrolCoverage, 
      0
    ) / Math.max(1, state.snapshots.length);

    const coverageScore = avgCoverage * 100;
    score = coverageScore;

    if (avgCoverage < 0.5) {
      this.addDeduction(
        'patrolCoverage',
        50,
        `巡逻覆盖率过低 (平均: ${(avgCoverage * 100).toFixed(1)}%)，存在大面积巡逻空窗`
      );
    } else if (avgCoverage < 0.7) {
      this.addDeduction(
        'patrolCoverage',
        30,
        `巡逻覆盖率不足 (平均: ${(avgCoverage * 100).toFixed(1)}%)`
      );
    }

    const patrolGapEvents = state.events.filter(e => e.type === 'patrol_gap');
    for (const event of patrolGapEvents) {
      if (!event.resolved) {
        score -= 10;
        this.addDeduction(
          'patrolCoverage',
          10,
          `巡逻空窗未处理: ${event.description.substring(0, 50)}...`,
          event.id
        );
      }
    }

    return Math.max(0, score);
  }

  private calculateEmergencyResponse(state: GameState): number {
    let score = 100;

    const emergencyEvents = state.events.filter(e => 
      ['medical_emergency', 'disturbance', 'weather_change'].includes(e.type)
    );

    for (const event of emergencyEvents) {
      const sevNum = severityToNumber(event.severity);
      if (!event.resolved) {
        const penalty = sevNum * 10;
        score -= penalty;
        this.addDeduction(
          'emergencyResponse',
          penalty,
          `紧急事件未处理: ${event.title} (严重程度: ${event.severity})`,
          event.id
        );
      } else if (event.resolutionTime) {
        const responseTime = event.resolutionTime - event.timestamp;
        const expectedTime = sevNum * 30;
        
        if (responseTime > expectedTime * 2) {
          const penalty = sevNum * 8;
          score -= penalty;
          this.addDeduction(
            'emergencyResponse',
            penalty,
            `响应时间过长: ${event.title} (用时${responseTime}秒，预期${expectedTime}秒)`,
            event.id
          );
        } else if (responseTime > expectedTime) {
          const penalty = sevNum * 4;
          score -= penalty;
          this.addDeduction(
            'emergencyResponse',
            penalty,
            `响应时间偏慢: ${event.title} (用时${responseTime}秒，预期${expectedTime}秒)`,
            event.id
          );
        }
      }
    }

    const avgRisk = state.snapshots.reduce(
      (sum, s) => sum + s.riskLevel, 
      0
    ) / Math.max(1, state.snapshots.length);

    if (avgRisk > 3.5) {
      score -= 25;
      this.addDeduction(
        'emergencyResponse',
        25,
        `整体风险水平持续过高 (平均: ${avgRisk.toFixed(1)}/5)`
      );
    } else if (avgRisk > 2.5) {
      score -= 15;
      this.addDeduction(
        'emergencyResponse',
        15,
        `整体风险水平偏高 (平均: ${avgRisk.toFixed(1)}/5)`
      );
    }

    return Math.max(0, score);
  }

  private calculateResourceAllocation(state: GameState): number {
    let score = 100;

    const totalDeployed = state.deployments.reduce(
      (sum, d) => sum + d.count, 
      0
    );

    if (totalDeployed === 0) {
      score -= 80;
      this.addDeduction(
        'resourceAllocation',
        80,
        '未部署任何安保力量'
      );
      return Math.max(0, score);
    }

    const maxUnits = 20;
    if (totalDeployed > maxUnits) {
      score -= 30;
      this.addDeduction(
        'resourceAllocation',
        30,
        `过度部署 (${totalDeployed}人，建议不超过${maxUnits}人)，资源浪费`
      );
    } else if (totalDeployed < 8) {
      score -= 20;
      this.addDeduction(
        'resourceAllocation',
        20,
        `部署不足 (${totalDeployed}人，建议至少8人)`
      );
    }

    const fixedPosts = state.deployments.filter(d => d.unitType === 'fixed_post');
    const patrols = state.deployments.filter(d => d.unitType === 'patrol');
    const emergency = state.deployments.filter(d => d.unitType === 'emergency_response');

    if (fixedPosts.length === 0) {
      score -= 15;
      this.addDeduction(
        'resourceAllocation',
        15,
        '未在出口等关键位置部署固定岗哨'
      );
    }

    if (patrols.length === 0) {
      score -= 15;
      this.addDeduction(
        'resourceAllocation',
        15,
        '未部署巡逻队，无法主动发现问题'
      );
    }

    if (emergency.length === 0) {
      score -= 10;
      this.addDeduction(
        'resourceAllocation',
        10,
        '未预留应急响应队，突发事件响应能力不足'
      );
    }

    const exits = state.snapshots.length > 0 ? 4 : 0;
    const fixedNearExits = fixedPosts.length;
    if (exits > 0 && fixedNearExits < Math.ceil(exits / 2)) {
      score -= 10;
      this.addDeduction(
        'resourceAllocation',
        10,
        '出口处固定岗部署不足，建议每个主要出口至少部署1组'
      );
    }

    return Math.max(0, score);
  }

  private calculateOverallSituation(state: GameState): number {
    let score = 100;

    const unresolvedEvents = state.events.filter(e => !e.resolved).length;
    if (unresolvedEvents > 3) {
      score -= 20;
      this.addDeduction(
        'overallSituation',
        20,
        `多个事件积压未处理 (${unresolvedEvents}件)`
      );
    } else if (unresolvedEvents > 0) {
      score -= unresolvedEvents * 5;
    }

    const criticalDecisions = state.decisions.filter(d => d.markedCritical);
    if (criticalDecisions.length === 0 && state.events.length > 3) {
      score -= 10;
      this.addDeduction(
        'overallSituation',
        10,
        '未标记任何关键决策点，不利于后续复盘分析'
      );
    }

    const decisionsWithSources = state.decisions.filter(d => d.dataSourceIds.length > 0);
    const missingSourceRatio = decisionsWithSources.length / Math.max(1, state.decisions.length);
    
    if (missingSourceRatio < 0.5) {
      score -= 15;
      this.addDeduction(
        'overallSituation',
        15,
        '多数决策未关联数据源，决策可追溯性不足'
      );
    }

    const weatherPenalty = this.calculateWeatherPenalty(state);
    score -= weatherPenalty;

    return Math.max(0, score);
  }

  private calculateWeatherPenalty(state: GameState): number {
    const severeWeatherSnapshots = state.snapshots.filter(
      s => s.weather === 'heavy_rain' || s.weather === 'storm'
    );

    if (severeWeatherSnapshots.length === 0) return 0;

    const ratio = severeWeatherSnapshots.length / state.snapshots.length;
    
    if (ratio > 0.3) {
      const hasEmergency = state.deployments.some(d => d.unitType === 'emergency_response');
      if (!hasEmergency) {
        return 20;
      }
      return 10;
    }
    
    return 0;
  }

  private calculateWeightedScore(breakdown: ScoreBreakdown): number {
    let total = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
      total += breakdown[key as keyof ScoreBreakdown] * weight;
    }
    return total;
  }

  private getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  private addDeduction(
    category: keyof ScoreBreakdown,
    points: number,
    reason: string,
    eventId?: string
  ): void {
    this.deductions.push({
      id: uuidv4(),
      category,
      points,
      reason,
      eventId,
      timestamp: Date.now()
    });
  }

  public resetDeductions(): void {
    this.deductions = [];
    this.eventResponseTimes.clear();
  }

  public getDeductions(): Deduction[] {
    return [...this.deductions];
  }

  public calculateRiskLevel(
    congestionIndex: number,
    patrolCoverage: number,
    activeEvents: number,
    weather: string
  ): number {
    let risk = 0;

    risk += congestionIndex * 2;
    risk += (1 - patrolCoverage) * 2;
    risk += activeEvents * 0.5;

    const weatherRisk: Record<string, number> = {
      clear: 0,
      cloudy: 0.2,
      rain: 0.8,
      heavy_rain: 1.5,
      storm: 2.5
    };
    risk += weatherRisk[weather] || 0;

    return Math.min(5, Math.max(1, risk));
  }

  public getScoreInterpretation(score: number, grade: string): {
    overall: string;
    strengths: string[];
    improvements: string[];
  } {
    const strengths: string[] = [];
    const improvements: string[] = [];

    let overall: string;
    switch (grade) {
      case 'S':
        overall = '杰出的安保指挥表现！您的决策精准，资源调配合理，成功应对了所有挑战。';
        strengths.push('决策响应迅速准确');
        strengths.push('资源配置高效合理');
        strengths.push('风险控制能力卓越');
        break;
      case 'A':
        overall = '优秀的安保指挥！整体表现出色，仅有少量可以改进的地方。';
        strengths.push('多数事件处理得当');
        strengths.push('巡逻覆盖较为全面');
        break;
      case 'B':
        overall = '良好的安保指挥。基本完成任务，但在一些方面还有提升空间。';
        strengths.push('能够应对主要突发事件');
        strengths.push('安保部署基本合理');
        break;
      case 'C':
        overall = '及格的安保指挥。存在明显的管理漏洞，需要加强训练。';
        improvements.push('提高事件响应速度');
        improvements.push('优化安保资源配置');
        break;
      case 'D':
        overall = '安保指挥存在较大问题。多项关键指标不达标，存在安全隐患。';
        improvements.push('重点训练出口拥堵处置');
        improvements.push('建立完善的巡逻机制');
        improvements.push('加强应急响应预案学习');
        break;
      default:
        overall = '安保指挥严重不合格。存在重大安全隐患，必须重新学习基础操作。';
        improvements.push('学习安保基本理论');
        improvements.push('练习基础部署策略');
        improvements.push('研究应急预案');
    }

    if (score < 70) {
      improvements.push('建议结合复盘功能分析每一个扣分项');
      improvements.push('参考安保预案v3.2文档改进决策流程');
    }

    return { overall, strengths, improvements };
  }
}
