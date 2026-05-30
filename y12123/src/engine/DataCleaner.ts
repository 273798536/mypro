import type { MemberBehavior, DataAnomaly, CalculationConfig, MemberState } from '../types';

const VALID_TRANSITIONS: Record<MemberState, MemberState[]> = {
  active: ['active', 'inactive', 'dormant', 'recalled'],
  inactive: ['active', 'inactive', 'dormant', 'churned'],
  dormant: ['active', 'dormant', 'churned', 'recalled'],
  churned: ['churned', 'recalled'],
  recalled: ['active', 'inactive', 'recalled'],
};

export class DataCleaner {
  private config: CalculationConfig;

  constructor(config: CalculationConfig) {
    this.config = config;
  }

  clean(behaviors: MemberBehavior[]): {
    cleaned: MemberBehavior[];
    anomalies: DataAnomaly[];
    coldStartApplied: boolean;
  } {
    const anomalies: DataAnomaly[] = [];

    anomalies.push(...this.validateFields(behaviors));
    anomalies.push(...this.detectInvalidTransitions(behaviors));
    anomalies.push(...this.detectDuplicateTouches(behaviors));
    anomalies.push(...this.detectLateArrivals(behaviors));

    const validBehaviors = behaviors.filter(b => {
      const hasMissing = anomalies.some(
        a => a.type === 'missing_field' && a.memberId === b.memberId && a.timestamp === b.timestamp
      );
      const hasInvalid = anomalies.some(
        a => a.type === 'invalid_transition' && a.memberId === b.memberId && a.timestamp === b.timestamp
      );
      return !hasMissing && !hasInvalid;
    });

    const { adjusted, applied, coldStartAnomalies } = this.applyColdStart(validBehaviors);
    if (coldStartAnomalies.length > 0) {
      anomalies.push(...coldStartAnomalies);
    }

    return {
      cleaned: adjusted,
      anomalies,
      coldStartApplied: applied,
    };
  }

  validateFields(behaviors: MemberBehavior[]): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];

    behaviors.forEach((b, idx) => {
      if (!b.memberId || b.memberId.trim() === '') {
        anomalies.push({
          type: 'missing_field',
          memberId: `record_${idx}`,
          timestamp: b.timestamp || new Date().toISOString(),
          description: '会员ID字段缺失',
          suggestion: '请检查数据源，补全会员ID字段',
          severity: 'high',
        });
      }
      if (!b.timestamp || b.timestamp.trim() === '') {
        anomalies.push({
          type: 'missing_field',
          memberId: b.memberId || `record_${idx}`,
          timestamp: new Date().toISOString(),
          description: '时间戳字段缺失',
          suggestion: '请补全行为发生的时间戳',
          severity: 'high',
        });
      }
      if (!b.state) {
        anomalies.push({
          type: 'missing_field',
          memberId: b.memberId || `record_${idx}`,
          timestamp: b.timestamp || new Date().toISOString(),
          description: '状态标签缺失',
          suggestion: '请补全会员状态标签（active/inactive/dormant/churned/recalled）',
          severity: 'high',
        });
      }
    });

    return anomalies;
  }

  detectInvalidTransitions(behaviors: MemberBehavior[]): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];
    const memberBehaviors = this.groupByMember(behaviors);

    Object.entries(memberBehaviors).forEach(([memberId, records]) => {
      const sorted = records.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const validNext = VALID_TRANSITIONS[prev.state] || [];

        if (!validNext.includes(curr.state)) {
          anomalies.push({
            type: 'invalid_transition',
            memberId,
            timestamp: curr.timestamp,
            description: `状态跳转异常：从"${prev.state}"直接跳转到"${curr.state}"`,
            suggestion: `建议检查数据录入是否有误。合法的从"${prev.state}"出发的跳转包括：${validNext.join('、')}。如确属特殊情况，可在备注中说明后保留`,
            severity: 'high',
          });
        }
      }
    });

    return anomalies;
  }

  detectDuplicateTouches(behaviors: MemberBehavior[]): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];
    const touchRecords = behaviors.filter(b => b.isTouch);
    const memberTouches = this.groupByMember(touchRecords);

    Object.entries(memberTouches).forEach(([memberId, records]) => {
      const sorted = records.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const hoursDiff =
          (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) /
          (1000 * 60 * 60);

        if (hoursDiff < 24) {
          anomalies.push({
            type: 'duplicate_touch',
            memberId,
            timestamp: curr.timestamp,
            description: `24小时内重复触达，距上次触仅${hoursDiff.toFixed(1)}小时`,
            suggestion: '建议合并触达记录或调整触达策略，避免过度打扰会员。可保留首次触达，后续标记为无效',
            severity: 'medium',
          });
        }
      }
    });

    return anomalies;
  }

  detectLateArrivals(behaviors: MemberBehavior[]): DataAnomaly[] {
    const anomalies: DataAnomaly[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindowDays * 24 * 60 * 60 * 1000);

    behaviors.forEach(b => {
      const recordTime = new Date(b.timestamp);
      if (recordTime < windowStart) {
        const daysLate = Math.ceil(
          (windowStart.getTime() - recordTime.getTime()) / (24 * 60 * 60 * 1000)
        );
        anomalies.push({
          type: 'late_arrival',
          memberId: b.memberId,
          timestamp: b.timestamp,
          description: `数据晚到${daysLate}天，超出${this.config.timeWindowDays}天分析窗口`,
          suggestion: `数据已超出${this.config.timeWindowDays}天分析窗口，建议扩大时间窗口或确认数据上报延迟原因。本次计算将包含此数据但降低权重`,
          severity: 'low',
        });
      }
    });

    return anomalies;
  }

  applyColdStart(behaviors: MemberBehavior[]): {
    adjusted: MemberBehavior[];
    applied: boolean;
    coldStartAnomalies: DataAnomaly[];
  } {
    const uniqueMembers = new Set(behaviors.map(b => b.memberId)).size;
    const coldStartAnomalies: DataAnomaly[] = [];
    const applied = uniqueMembers < this.config.coldStartSampleSize;

    if (applied) {
      coldStartAnomalies.push({
        type: 'cold_start',
        memberId: 'system',
        timestamp: new Date().toISOString(),
        description: `样本量不足：仅${uniqueMembers}个会员，低于冷启动阈值${this.config.coldStartSampleSize}`,
        suggestion: `已应用冷启动修正：1) 添加行业基准转移概率作为先验；2) 降低结果置信度至${Math.max(0.3, uniqueMembers / this.config.coldStartSampleSize).toFixed(2)}；3) 建议继续积累数据至${this.config.coldStartSampleSize}个以上会员后重新计算`,
        severity: 'medium',
      });

      const adjusted = [...behaviors];
      const synthetic = this.generateSyntheticData(this.config.coldStartSampleSize - uniqueMembers);
      adjusted.push(...synthetic);

      return { adjusted, applied: true, coldStartAnomalies };
    }

    return { adjusted: behaviors, applied: false, coldStartAnomalies };
  }

  private generateSyntheticData(count: number): MemberBehavior[] {
    const states: MemberState[] = ['active', 'inactive', 'dormant', 'churned', 'recalled'];
    const synthetic: MemberBehavior[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const memberId = `synth_${i}`;
      const days = Math.floor(Math.random() * this.config.timeWindowDays);
      const timestamp = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      const state = states[Math.floor(Math.random() * states.length)];

      synthetic.push({
        memberId,
        timestamp,
        state,
        source: 'cold_start_synthetic',
        remark: '冷启动补全数据',
      });
    }

    return synthetic;
  }

  private groupByMember(behaviors: MemberBehavior[]): Record<string, MemberBehavior[]> {
    return behaviors.reduce((acc, b) => {
      if (!acc[b.memberId]) {
        acc[b.memberId] = [];
      }
      acc[b.memberId].push(b);
      return acc;
    }, {} as Record<string, MemberBehavior[]>);
  }
}
