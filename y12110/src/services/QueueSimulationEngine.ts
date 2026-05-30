import type { VisitRecord, WindowShift, SimulationResult, QueueEvent, QueueTrace, WindowActivity, WaitDistribution, OptimizationSuggestion } from '@/types';

export class QueueSimulationEngine {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  simulate(
    visits: VisitRecord[],
    windows: WindowShift[],
    experimentId: string,
    dataGroup: 'normal' | 'boundary' | 'badInput'
  ): SimulationResult {
    const validVisits = visits.filter(v => v.dataGroup === dataGroup || dataGroup === 'normal');
    const sortedVisits = [...validVisits].sort((a, b) => 
      new Date(a.arriveTime).getTime() - new Date(b.arriveTime).getTime()
    );

    const events: QueueEvent[] = [];
    const waitTimes: number[] = [];
    const queueLengths: number[] = [];
    const windowActivity: WindowActivity[] = windows.map(w => ({
      windowNo: w.windowNo,
      busyTime: 0,
      idleTime: 0,
      servedCount: 0
    }));

    const windowEndTimes: Map<number, number> = new Map();
    windows.forEach(w => windowEndTimes.set(w.windowNo, 0));

    let queue: VisitRecord[] = [];
    let totalServed = 0;
    let maxWaitTime = 0;
    let totalWaitTime = 0;

    const dayStart = new Date(sortedVisits[0]?.arriveTime || new Date());
    dayStart.setHours(8, 0, 0, 0);
    const dayStartTime = dayStart.getTime();

    for (const visit of sortedVisits) {
      if (visit.status === 'noShow') {
        events.push({
          time: (new Date(visit.arriveTime).getTime() - dayStartTime) / 60000,
          type: 'noShow',
          visitorId: visit.visitorId
        });
        continue;
      }

      const arriveTime = (new Date(visit.arriveTime).getTime() - dayStartTime) / 60000;
      events.push({
        time: arriveTime,
        type: 'arrive',
        visitorId: visit.visitorId
      });

      let assignedWindow: number | null = null;
      let earliestEndTime = Infinity;

      for (const window of windows) {
        if (window.isTemporaryClosed) {
          const closeStart = window.closeStartTime ? 
            (new Date(window.closeStartTime).getTime() - dayStartTime) / 60000 : 0;
          const closeEnd = window.closeEndTime ?
            (new Date(window.closeEndTime).getTime() - dayStartTime) / 60000 : 0;
          if (arriveTime >= closeStart && arriveTime < closeEnd) continue;
        }

        const wEndTime = windowEndTimes.get(window.windowNo) || 0;
        const availableTime = Math.max(wEndTime, arriveTime);
        
        if (availableTime < earliestEndTime) {
          earliestEndTime = availableTime;
          assignedWindow = window.windowNo;
        }
      }

      if (assignedWindow !== null) {
        const waitTime = Math.max(0, earliestEndTime - arriveTime);
        waitTimes.push(waitTime);
        totalWaitTime += waitTime;
        maxWaitTime = Math.max(maxWaitTime, waitTime);

        const serviceStart = earliestEndTime;
        const serviceEnd = serviceStart + visit.serviceDuration;

        events.push({
          time: serviceStart,
          type: 'startService',
          visitorId: visit.visitorId,
          windowNo: assignedWindow
        });

        events.push({
          time: serviceEnd,
          type: 'endService',
          visitorId: visit.visitorId,
          windowNo: assignedWindow
        });

        windowEndTimes.set(assignedWindow, serviceEnd);
        const activity = windowActivity.find(a => a.windowNo === assignedWindow);
        if (activity) {
          activity.busyTime += visit.serviceDuration;
          activity.servedCount++;
        }

        totalServed++;
      } else {
        queue.push(visit);
      }

      queueLengths.push(queue.length);
    }

    events.sort((a, b) => a.time - b.time);

    const avgWaitTime = waitTimes.length > 0 ? totalWaitTime / waitTimes.length : 0;
    const avgQueueLength = queueLengths.length > 0 
      ? queueLengths.reduce((a, b) => a + b, 0) / queueLengths.length 
      : 0;

    const windowUtilization = this.calculateUtilization(windows, events);
    const waitDistribution = this.generateWaitDistribution(waitTimes);
    const optimization = this.generateOptimization({
      avgWaitTime,
      maxWaitTime,
      avgQueueLength,
      windowUtilization,
      totalServed
    }, windows.length, events);

    const queueTrace: QueueTrace = {
      timeline: events,
      windowActivity
    };

    return {
      id: this.generateId(),
      experimentId,
      dataGroup,
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      maxWaitTime: Math.round(maxWaitTime * 10) / 10,
      avgQueueLength: Math.round(avgQueueLength * 10) / 10,
      windowUtilization: Math.round(windowUtilization * 100) / 100,
      totalServed,
      queueTrace,
      optimization,
      waitDistribution
    };
  }

  calculateUtilization(windows: WindowShift[], events: QueueEvent[]): number {
    if (windows.length === 0) return 0;

    const totalServiceTime = events
      .filter(e => e.type === 'endService')
      .reduce((sum) => sum + 5, 0);

    const totalAvailableTime = windows.length * 480;

    return totalAvailableTime > 0 ? totalServiceTime / totalAvailableTime : 0;
  }

  generateWaitDistribution(waitTimes: number[]): WaitDistribution {
    const buckets = [
      { range: '0-5分钟', count: 0, min: 0, max: 5 },
      { range: '5-10分钟', count: 0, min: 5, max: 10 },
      { range: '10-20分钟', count: 0, min: 10, max: 20 },
      { range: '20-30分钟', count: 0, min: 20, max: 30 },
      { range: '30分钟以上', count: 0, min: 30, max: Infinity }
    ];

    for (const time of waitTimes) {
      for (const bucket of buckets) {
        if (time >= bucket.min && time < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    const sortedTimes = [...waitTimes].sort((a, b) => a - b);
    const p90Index = Math.floor(sortedTimes.length * 0.9);
    const p95Index = Math.floor(sortedTimes.length * 0.95);

    return {
      buckets: buckets.map(({ range, count }) => ({ range, count })),
      percentile90: sortedTimes[p90Index] || 0,
      percentile95: sortedTimes[p95Index] || 0
    };
  }

  private generateOptimization(
    metrics: { avgWaitTime: number; maxWaitTime: number; avgQueueLength: number; windowUtilization: number; totalServed: number },
    currentWindows: number,
    events: QueueEvent[]
  ): OptimizationSuggestion {
    let recommendedWindows = currentWindows;

    if (metrics.avgWaitTime > 15 || metrics.maxWaitTime > 30) {
      recommendedWindows = Math.min(currentWindows + 2, 10);
    } else if (metrics.windowUtilization < 0.4 && currentWindows > 2) {
      recommendedWindows = currentWindows - 1;
    }

    const peakHourSuggestions: string[] = [];
    const hourCounts: { [key: number]: number } = {};

    for (const event of events) {
      if (event.type === 'arrive') {
        const hour = Math.floor(event.time / 60);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([hour]) => `${parseInt(hour) + 8}:00-${parseInt(hour) + 9}:00`);

    if (peakHours.length > 0) {
      peakHourSuggestions.push(`高峰时段 ${peakHours.join('、')} 建议增加机动窗口`);
    }

    if (metrics.avgQueueLength > 3) {
      peakHourSuggestions.push('平均队列长度较长，建议设置引导人员提前预审材料');
    }

    const costAnalysis = `当前配置 ${currentWindows} 个窗口，建议配置 ${recommendedWindows} 个窗口。
${recommendedWindows > currentWindows 
  ? `增加 ${recommendedWindows - currentWindows} 个窗口预计可将平均等待时间降低约 ${Math.round(metrics.avgWaitTime * 0.4)} 分钟`
  : recommendedWindows < currentWindows
  ? `减少 ${currentWindows - recommendedWindows} 个窗口预计可节省人力成本约 ${Math.round((currentWindows - recommendedWindows) / currentWindows * 100)}%`
  : '当前配置合理，无需调整'}`;

    return {
      recommendedWindows,
      peakHourSuggestions,
      costAnalysis
    };
  }
}
