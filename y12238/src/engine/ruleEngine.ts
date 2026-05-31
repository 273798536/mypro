import { Truck, DecisionType, RuleViolation, Conflict, ConflictType } from '@/types';

export class RuleEngine {
  validateDecision(
    truck: Truck,
    decision: DecisionType,
    currentYardVersion: number
  ): { isValid: boolean; violations: RuleViolation[]; conflicts: Conflict[] } {
    const violations: RuleViolation[] = [];
    const conflicts: Conflict[] = [];

    const expectedDecision = truck.expectedDecision;
    if (decision !== expectedDecision) {
      violations.push({
        ruleId: 'rule-gate-consistency',
        description: `闸口判定与集卡状态不一致。当前状态建议${this.getDecisionLabel(expectedDecision)}，但判定为${this.getDecisionLabel(decision)}`,
        severity: 'error',
        evidence: `司机班次：${truck.shiftRecord.shiftType}，${truck.shiftRecord.isOvertime ? '已超时' : '正常'}`,
      });
      conflicts.push({
        id: `conflict-${Date.now()}-${truck.id}`,
        type: 'remark_mismatch',
        description: `判定不一致：期望${this.getDecisionLabel(expectedDecision)}，实际${this.getDecisionLabel(decision)}`,
        evidenceRef: truck.shiftRecord.id,
        truckId: truck.id,
      });
    }

    if (truck.shiftRecord.isOvertime && decision === 'release') {
      violations.push({
        ruleId: 'rule-shift-overtime',
        description: `司机班次已超时${truck.shiftRecord.overtimeMinutes || 0}分钟，不建议放行`,
        severity: 'warning',
        evidence: `班次：${truck.shiftRecord.shiftType}，开始时间：${truck.shiftRecord.startTime.toLocaleTimeString()}`,
      });
      conflicts.push({
        id: `conflict-shift-${Date.now()}-${truck.id}`,
        type: 'shift_overtime',
        description: `班次超时情况下放行存在风险`,
        evidenceRef: truck.shiftRecord.id,
        truckId: truck.id,
      });
    }

    const appointmentOverdue = this.checkAppointmentOverdue(truck);
    if (appointmentOverdue && decision === 'release') {
      violations.push({
        ruleId: 'rule-appointment-overdue',
        description: '预约已过号，建议重新排队',
        severity: 'warning',
        evidence: `预约时间：${truck.appointmentTime.toLocaleString()}`,
      });
      conflicts.push({
        id: `conflict-appt-${Date.now()}-${truck.id}`,
        type: 'appointment_overdue',
        description: '预约过号状态下放行',
        evidenceRef: truck.id,
        truckId: truck.id,
      });
    }

    if (decision === 'transfer') {
      const yardCompatible = this.checkYardVersionCompatibility(truck, currentYardVersion);
      if (!yardCompatible) {
        violations.push({
          ruleId: 'rule-yard-version',
          description: `当前堆场版本v${currentYardVersion}与集卡转场目标不兼容`,
          severity: 'error',
          evidence: `集卡备注：${truck.currentRemark}`,
        });
        conflicts.push({
          id: `conflict-yard-${Date.now()}-${truck.id}`,
          type: 'yard_version_mismatch',
          description: `堆场版本v${currentYardVersion}与转场目标冲突`,
          evidenceRef: `yard-v${currentYardVersion}`,
          truckId: truck.id,
        });
      }
    }

    return {
      isValid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      conflicts,
    };
  }

  checkAppointmentOverdue(truck: Truck): boolean {
    const now = new Date();
    const overdueThreshold = 15 * 60 * 1000;
    return now.getTime() - truck.appointmentTime.getTime() > overdueThreshold;
  }

  checkYardVersionCompatibility(truck: Truck, yardVersion: number): boolean {
    const remark = truck.currentRemark;
    if (!remark.includes('转场至')) {
      return true;
    }
    if (yardVersion >= 2 && remark.includes('C区')) {
      return false;
    }
    if (yardVersion >= 2 && remark.includes('A区')) {
      return false;
    }
    return true;
  }

  checkShiftOvertime(truck: Truck): boolean {
    return truck.shiftRecord.isOvertime;
  }

  inferExpectedDecision(truck: Truck, yardVersion: number): DecisionType {
    const remark = truck.currentRemark.toLowerCase();
    
    if (remark.includes('转场')) {
      return this.checkYardVersionCompatibility(truck, yardVersion) ? 'transfer' : 'detain';
    }
    
    if (remark.includes('查验') || remark.includes('检查') || remark.includes('待检验') || 
        remark.includes('危险品') || remark.includes('海关') || remark.includes('保税') ||
        remark.includes('监管')) {
      return 'detain';
    }
    
    if (this.checkShiftOvertime(truck)) {
      return 'detain';
    }
    
    if (this.checkAppointmentOverdue(truck)) {
      return 'detain';
    }
    
    return 'release';
  }

  getDecisionLabel(decision: DecisionType): string {
    const labels: Record<DecisionType, string> = {
      release: '放行',
      detain: '暂扣',
      transfer: '转场',
    };
    return labels[decision];
  }

  getConflictTypeLabel(type: ConflictType): string {
    const labels: Record<ConflictType, string> = {
      remark_mismatch: '备注不一致',
      yard_version_mismatch: '堆场版本冲突',
      shift_overtime: '班次超时',
      appointment_overdue: '预约过号',
      wrong_queue_order: '排队顺序错误',
    };
    return labels[type];
  }
}

export const ruleEngine = new RuleEngine();
