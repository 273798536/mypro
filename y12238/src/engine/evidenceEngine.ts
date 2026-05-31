import { Evidence, EvidenceType, Truck, GateDecision } from '@/types';

export class EvidenceEngine {
  private evidences: Map<string, Evidence[]> = new Map();

  recordVersionChange(
    sessionId: string,
    truck: Truck,
    oldRemark: string,
    newRemark: string
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-version-${Date.now()}-${truck.id}`,
      type: 'version_change',
      content: `集卡 [${truck.plateNumber}] 备注变更："${oldRemark}" → "${newRemark}"，版本v${truck.currentVersion - 1}→v${truck.currentVersion}`,
      timestamp: new Date(),
      reference: `${truck.id}-v${truck.currentVersion}`,
      truckId: truck.id,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  recordYardUpdate(
    sessionId: string,
    oldVersion: number,
    newVersion: number,
    message: string
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-yard-${Date.now()}`,
      type: 'yard_update',
      content: `堆场版本更新：v${oldVersion} → v${newVersion}。${message}`,
      timestamp: new Date(),
      reference: `yard-v${newVersion}`,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  recordShiftOvertime(
    sessionId: string,
    truck: Truck,
    overtimeMinutes: number
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-shift-${Date.now()}-${truck.id}`,
      type: 'shift_overtime',
      content: `集卡 [${truck.plateNumber}] 司机 [${truck.driverName}] ${truck.shiftRecord.shiftType}已超时${overtimeMinutes}分钟`,
      timestamp: new Date(),
      reference: truck.shiftRecord.id,
      truckId: truck.id,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  recordGateConflict(
    sessionId: string,
    truck: Truck,
    decision: GateDecision,
    expectedDecision: string,
    shiftEvidence: string
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-conflict-${Date.now()}-${truck.id}`,
      type: 'gate_conflict',
      content: `闸口判定冲突：集卡 [${truck.plateNumber}] 期望判定"${expectedDecision}"，实际判定"${decision.conclusion}"。${shiftEvidence}`,
      timestamp: new Date(),
      reference: decision.id,
      truckId: truck.id,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  recordAppointmentOverdue(
    sessionId: string,
    truck: Truck,
    overdueMinutes: number
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-appt-${Date.now()}-${truck.id}`,
      type: 'appointment_overdue',
      content: `集卡 [${truck.plateNumber}] 预约 [${truck.appointmentNo}] 已过号${overdueMinutes}分钟`,
      timestamp: new Date(),
      reference: truck.appointmentNo,
      truckId: truck.id,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  recordGateDecision(
    sessionId: string,
    decision: GateDecision,
    truck: Truck
  ): Evidence {
    const evidence: Evidence = {
      id: `evidence-decision-${Date.now()}-${truck.id}`,
      type: 'gate_conflict',
      content: `闸口${decision.gateNo}判定：集卡 [${truck.plateNumber}] → ${decision.conclusion}。司机班次：${truck.shiftRecord.shiftType}，${truck.shiftRecord.isOvertime ? '已超时' : '正常'}`,
      timestamp: decision.timestamp,
      reference: decision.id,
      truckId: truck.id,
    };
    this.addEvidence(sessionId, evidence);
    return evidence;
  }

  private addEvidence(sessionId: string, evidence: Evidence): void {
    if (!this.evidences.has(sessionId)) {
      this.evidences.set(sessionId, []);
    }
    this.evidences.get(sessionId)!.push(evidence);
    console.log('[证据记录]', evidence.content, evidence.timestamp.toLocaleTimeString());
  }

  getEvidenceChain(sessionId: string): Evidence[] {
    return this.evidences.get(sessionId) || [];
  }

  getEvidencesByTruck(sessionId: string, truckId: string): Evidence[] {
    return this.getEvidenceChain(sessionId).filter(e => e.truckId === truckId);
  }

  getEvidencesByType(sessionId: string, type: EvidenceType): Evidence[] {
    return this.getEvidenceChain(sessionId).filter(e => e.type === type);
  }

  clearSession(sessionId: string): void {
    this.evidences.delete(sessionId);
  }

  generateEvidenceSummary(sessionId: string): string {
    const chain = this.getEvidenceChain(sessionId);
    const typeCounts: Record<EvidenceType, number> = {
      version_change: 0,
      yard_update: 0,
      shift_overtime: 0,
      gate_conflict: 0,
      appointment_overdue: 0,
    };
    
    chain.forEach(e => {
      typeCounts[e.type]++;
    });

    return `证据链摘要：
- 备注变更：${typeCounts.version_change} 次
- 堆场更新：${typeCounts.yard_update} 次
- 班次超时：${typeCounts.shift_overtime} 次
- 闸口冲突：${typeCounts.gate_conflict} 次
- 预约过号：${typeCounts.appointment_overdue} 次
总计：${chain.length} 条证据记录`;
  }

  getTypeLabel(type: EvidenceType): string {
    const labels: Record<EvidenceType, string> = {
      version_change: '版本变更',
      yard_update: '堆场更新',
      shift_overtime: '班次超时',
      gate_conflict: '闸口冲突',
      appointment_overdue: '预约过号',
    };
    return labels[type];
  }
}

export const evidenceEngine = new EvidenceEngine();
