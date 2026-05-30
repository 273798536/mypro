import type { VisitRecord, WindowShift, SimulationResult, QueueEvent, AnomalyRecord } from '@/types';

export class AnomalyAnalysisService {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  analyzeNoShows(visits: VisitRecord[], results: SimulationResult): AnomalyRecord[] {
    const noShowRecords = visits.filter(v => v.status === 'noShow');
    if (noShowRecords.length === 0) return [];

    const noShowRate = (noShowRecords.length / visits.length) * 100;
    const impact = this.calculateNoShowImpact(noShowRecords, results);

    return [{
      id: this.generateId(),
      experimentId: results.experimentId,
      type: 'noShow',
      description: `检测到 ${noShowRecords.length} 例预约爽约，爽约率 ${noShowRate.toFixed(1)}%`,
      impact,
      rootCause: `主要原因可能包括：\n1. 预约后临时有事无法前往\n2. 忘记预约时间\n3. 对业务办理流程不清晰，误以为可以随时办理\n4. 预约系统缺乏提醒机制`,
      suggestion: `应对建议：\n1. 预约后发送短信/APP推送提醒，提前1天和提前1小时各提醒一次\n2. 建立爽约黑名单制度，连续爽约3次暂停预约资格1个月\n3. 优化预约流程，允许用户灵活改期\n4. 设置预约号源保留时间，超时未到自动取消并释放给其他用户`
    }];
  }

  analyzeAbnormalDuration(visits: VisitRecord[]): AnomalyRecord[] {
    const durations = visits.map(v => v.serviceDuration).filter(d => d > 0);
    if (durations.length === 0) return [];

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDuration = durations.length > 1
      ? Math.sqrt(durations.reduce((a, b) => a + Math.pow(b - avgDuration, 2), 0) / durations.length)
      : 5;

    const abnormalVisits = visits.filter(v => {
      if (v.serviceDuration <= 0) return true;
      const zScore = (v.serviceDuration - avgDuration) / stdDuration;
      return Math.abs(zScore) > 2;
    });

    if (abnormalVisits.length === 0) return [];

    const tooLong = abnormalVisits.filter(v => v.serviceDuration > avgDuration + stdDuration * 2);
    const tooShort = abnormalVisits.filter(v => v.serviceDuration > 0 && v.serviceDuration < avgDuration - stdDuration * 2);
    const invalid = abnormalVisits.filter(v => v.serviceDuration <= 0);

    const extraWaitTime = tooLong.reduce((sum, v) => sum + (v.serviceDuration - avgDuration), 0);

    return [{
      id: this.generateId(),
      experimentId: '',
      type: 'abnormalDuration',
      description: `检测到 ${abnormalVisits.length} 例服务时长异常：过长${tooLong.length}例，过短${tooShort.length}例，无效${invalid.length}例`,
      impact: {
        extraWaitTime: Math.round(extraWaitTime * 10) / 10,
        affectedCount: abnormalVisits.length
      },
      rootCause: `时长过长可能原因：\n1. 业务材料不齐全，需要反复沟通\n2. 业务复杂度高，涉及多个部门协同\n3. 办事人员业务不熟练\n\n时长过短可能原因：\n1. 材料预审不通过，直接退回\n2. 业务实际较为简单，预估时间不准\n3. 系统记录误差`,
      suggestion: `优化建议：\n1. 建立材料预审机制，提前审核材料完整性\n2. 加强窗口人员培训，提升业务熟练度\n3. 对复杂业务设立专门窗口，配置经验丰富的人员\n4. 优化服务时长预估算法，参考历史数据动态调整\n5. 引入叫号系统二次提醒，减少空号时间`
    }];
  }

  analyzeTemporaryClose(windows: WindowShift[], events: QueueEvent[]): AnomalyRecord[] {
    const closedWindows = windows.filter(w => w.isTemporaryClosed);
    if (closedWindows.length === 0) return [];

    const closePeriods = closedWindows.map(w => ({
      windowNo: w.windowNo,
      startTime: w.closeStartTime!,
      endTime: w.closeEndTime!
    }));

    const affectedEvents = events.filter(e => {
      if (e.type !== 'arrive') return false;
      const eventTime = new Date();
      eventTime.setHours(8, 0, 0, 0);
      eventTime.setMinutes(eventTime.getMinutes() + e.time);

      return closePeriods.some(p => {
        const start = new Date(p.startTime).getTime();
        const end = new Date(p.endTime).getTime();
        const evt = eventTime.getTime();
        return evt >= start && evt < end;
      });
    });

    const totalCloseMinutes = closePeriods.reduce((sum, p) => {
      const start = new Date(p.startTime).getTime();
      const end = new Date(p.endTime).getTime();
      return sum + (end - start) / 60000;
    }, 0);

    return [{
      id: this.generateId(),
      experimentId: '',
      type: 'temporaryClose',
      description: `检测到 ${closedWindows.length} 个窗口临时关闭，累计关闭 ${totalCloseMinutes.toFixed(0)} 分钟`,
      impact: {
        extraWaitTime: Math.round(affectedEvents.length * 5 * 10) / 10,
        affectedCount: affectedEvents.length
      },
      rootCause: `窗口临时关闭可能原因：\n1. 工作人员临时休息、用餐\n2. 设备故障或系统维护\n3. 紧急会议或培训\n4. 人员调配支援其他岗位`,
      suggestion: `应对建议：\n1. 合理安排轮班和休息时间，避免高峰时段窗口关闭\n2. 建立窗口备用机制，某窗口关闭时由机动窗口补位\n3. 提前公示窗口关闭时间，引导错峰办理\n4. 优化设备巡检流程，减少突发故障\n5. 在叫号系统中实时显示窗口状态，避免群众盲目等待`
    }];
  }

  private calculateNoShowImpact(noShows: VisitRecord[], results: SimulationResult) {
    const avgNoShowDuration = noShows.length > 0
      ? noShows.reduce((sum, v) => sum + Math.max(5, v.serviceDuration), 0) / noShows.length
      : 5;

    return {
      extraWaitTime: Math.round(noShows.length * avgNoShowDuration * 0.3 * 10) / 10,
      affectedCount: noShows.length
    };
  }
}
