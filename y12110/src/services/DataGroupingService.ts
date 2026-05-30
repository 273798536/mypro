import type { VisitRecord, DataGroup } from '@/types';

export class DataGroupingService {
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  detectBoundaryValues(visits: VisitRecord[]): VisitRecord[] {
    if (visits.length === 0) return [];

    const durations = visits.map(v => v.serviceDuration).filter(d => d > 0);
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 10;
    const stdDuration = durations.length > 1
      ? Math.sqrt(durations.reduce((a, b) => a + Math.pow(b - avgDuration, 2), 0) / durations.length)
      : 5;

    const boundaryVisits: VisitRecord[] = [];

    for (const visit of visits) {
      let isBoundary = false;
      let notes: string[] = [];

      if (visit.serviceDuration > 0) {
        const zScore = (visit.serviceDuration - avgDuration) / stdDuration;
        if (Math.abs(zScore) > 2) {
          isBoundary = true;
          notes.push(`服务时长${zScore > 0 ? '过长' : '过短'}: ${visit.serviceDuration}分钟`);
        }
      }

      if (visit.serviceDuration <= 0) {
        isBoundary = true;
        notes.push('服务时长异常');
      }

      if (visit.status === 'noShow') {
        isBoundary = true;
        notes.push('预约爽约');
      }

      if (isBoundary) {
        boundaryVisits.push({
          ...visit,
          id: this.generateId(),
          dataGroup: 'boundary' as DataGroup,
          notes: notes.join('; ')
        });
      }
    }

    return boundaryVisits;
  }

  detectBadInput(visits: VisitRecord[]): VisitRecord[] {
    const badInputs: VisitRecord[] = [];

    for (const visit of visits) {
      let isBad = false;
      let notes: string[] = [];

      if (!visit.visitorId || visit.visitorId.trim() === '') {
        isBad = true;
        notes.push('访客ID为空');
      }

      if (!visit.arriveTime) {
        isBad = true;
        notes.push('到达时间为空');
      }

      if (visit.serviceDuration < 0) {
        isBad = true;
        notes.push(`服务时长为负数: ${visit.serviceDuration}`);
      }

      if (visit.appointmentTime && visit.arriveTime) {
        const apptTime = new Date(visit.appointmentTime).getTime();
        const arrTime = new Date(visit.arriveTime).getTime();
        if (arrTime < apptTime - 3600000) {
          isBad = true;
          notes.push('到达时间早于预约时间超过1小时');
        }
      }

      if (isBad) {
        badInputs.push({
          ...visit,
          id: this.generateId(),
          dataGroup: 'badInput' as DataGroup,
          notes: notes.join('; ')
        });
      }
    }

    return badInputs;
  }

  groupData(visits: VisitRecord[]): {
    normal: VisitRecord[];
    boundary: VisitRecord[];
    badInput: VisitRecord[];
  } {
    const normal: VisitRecord[] = [];
    const boundary = this.detectBoundaryValues(visits);
    const badInput = this.detectBadInput(visits);

    const boundaryIds = new Set(boundary.map(v => v.visitorId));
    const badInputIds = new Set(badInput.map(v => v.visitorId));

    for (const visit of visits) {
      if (!boundaryIds.has(visit.visitorId) && !badInputIds.has(visit.visitorId)) {
        normal.push({
          ...visit,
          dataGroup: 'normal' as DataGroup
        });
      }
    }

    return { normal, boundary, badInput };
  }
}
