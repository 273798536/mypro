import type {
  MemberBehavior,
  RecallPriorityItem,
  CalculationConfig,
  MemberState,
  DataAnomaly,
} from '../types';

export class PriorityEngine {
  private config: CalculationConfig;

  constructor(config: CalculationConfig) {
    this.config = config;
  }

  calculatePriorities(
    churnProbabilities: Record<string, number>,
    behaviors: MemberBehavior[],
    anomalies: DataAnomaly[]
  ): RecallPriorityItem[] {
    const memberData = this.groupByMember(behaviors);
    const items: RecallPriorityItem[] = [];

    Object.entries(churnProbabilities).forEach(([memberId, churnProb]) => {
      const memberBehaviors = memberData[memberId] || [];
      const memberAnomalies = anomalies.filter(a => a.memberId === memberId);

      if (memberBehaviors.length > 0) {
        const sorted = memberBehaviors.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const latest = sorted[0];
        const priorityScore = this.calculatePriorityScore(memberId, churnProb, memberBehaviors);

        items.push({
          memberId,
          memberName: latest.memberName,
          churnProbability: churnProb,
          priorityScore,
          rank: 0,
          currentState: latest.state,
          suggestedAction: this.suggestAction(churnProb, latest.state, memberAnomalies),
          anomalies: memberAnomalies,
          value: latest.value,
          tenureDays: this.calculateTenure(latest.joinDate),
          lastActive: latest.timestamp,
        });
      }
    });

    return this.sortByPriority(items);
  }

  calculatePriorityScore(
    memberId: string,
    churnProb: number,
    behaviors: MemberBehavior[]
  ): number {
    const { weights } = this.config;

    const probScore = churnProb * weights.probability;

    const valueScore = this.calculateValueScore(behaviors) * weights.value;

    const tenureScore = this.calculateTenureScore(behaviors) * weights.tenure;

    return probScore + valueScore + tenureScore;
  }

  sortByPriority(items: RecallPriorityItem[]): RecallPriorityItem[] {
    const sorted = [...items].sort((a, b) => b.priorityScore - a.priorityScore);
    return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  suggestAction(
    churnProb: number,
    currentState: MemberState,
    anomalies: DataAnomaly[]
  ): string {
    const hasHighSeverity = anomalies.some(a => a.severity === 'high');
    const hasDuplicateTouch = anomalies.some(a => a.type === 'duplicate_touch');

    if (hasHighSeverity) {
      const anomalyTypes = [...new Set(anomalies.filter(a => a.severity === 'high').map(a => a.type))];
      return `【数据异常】存在${anomalyTypes.length}类高优先级异常，请先修正数据后再制定召回策略`;
    }

    if (churnProb >= this.config.churnThreshold) {
      if (currentState === 'dormant') {
        if (hasDuplicateTouch) {
          return '【紧急召回】沉睡高风险用户，建议调整触达频次后发送专属优惠券';
        }
        return '【紧急召回】沉睡高风险用户，建议立即发送专属优惠+人工关怀';
      }
      if (currentState === 'inactive') {
        return '【优先召回】不活跃高风险用户，建议推送个性化内容+限时活动';
      }
      if (currentState === 'active') {
        return '【预警关注】活跃但高流失风险，建议提前介入，推送高价值权益';
      }
      if (currentState === 'churned') {
        return '【流失召回】已流失用户，建议发送大额召回礼包+VIP客服回访';
      }
      return '【高风险】流失风险较高，建议立即触达';
    }

    if (churnProb >= this.config.churnThreshold * 0.7) {
      if (currentState === 'dormant') {
        return '【常规召回】沉睡用户，建议每周推送精选内容';
      }
      if (currentState === 'inactive') {
        return '【保持关注】不活跃用户，建议增加互动类活动触达';
      }
      return '【关注】中等流失风险，建议维持正常触达频率';
    }

    if (currentState === 'active') {
      return '【维护】活跃用户，建议持续提供优质服务和权益';
    }
    if (currentState === 'recalled') {
      return '【巩固】刚召回用户，建议前30天重点关怀，防止再次流失';
    }

    return '【正常】低流失风险，维持常规运营即可';
  }

  private calculateValueScore(behaviors: MemberBehavior[]): number {
    const values = behaviors.map(b => b.value || 0).filter(v => v > 0);
    if (values.length === 0) return 0.5;

    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const maxValue = Math.max(...values, 1);
    return Math.min(1, avgValue / maxValue);
  }

  private calculateTenureScore(behaviors: MemberBehavior[]): number {
    const latest = behaviors[0];
    const tenureDays = this.calculateTenure(latest.joinDate);

    if (tenureDays <= 0) return 0.5;
    if (tenureDays >= 365) return 1;
    return tenureDays / 365;
  }

  private calculateTenure(joinDate?: string): number {
    if (!joinDate) return 0;
    const now = new Date();
    const join = new Date(joinDate);
    return Math.floor((now.getTime() - join.getTime()) / (24 * 60 * 60 * 1000));
  }

  private groupByMember(
    behaviors: MemberBehavior[]
  ): Record<string, MemberBehavior[]> {
    return behaviors.reduce((acc, b) => {
      if (!b.memberId.startsWith('synth_')) {
        if (!acc[b.memberId]) {
          acc[b.memberId] = [];
        }
        acc[b.memberId].push(b);
      }
      return acc;
    }, {} as Record<string, MemberBehavior[]>);
  }
}
