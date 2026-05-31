import { PlateArchive, ParkingFlow, BindingRecord, DeferredRevenue, ProblemMark } from '../types';

export class DeferredRevenueEngine {
  static calculate(
    plate: PlateArchive,
    flows: ParkingFlow[],
    period: string
  ): DeferredRevenue {
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    
    const effectiveStart = new Date(plate.effectiveDate);
    const effectiveEnd = new Date(plate.expiryDate);
    
    const overlapStart = new Date(Math.max(periodStart.getTime(), effectiveStart.getTime()));
    const overlapEnd = new Date(Math.min(periodEnd.getTime(), effectiveEnd.getTime()));
    
    const daysInPeriod = periodEnd.getDate();
    const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    const recognitionRatio = overlapDays / daysInPeriod;
    
    const totalAmount = plate.monthlyFee;
    const recognizedAmount = Math.round(totalAmount * recognitionRatio * 100) / 100;
    const deferredAmount = Math.round((totalAmount - recognizedAmount) * 100) / 100;
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (plate.status !== 'active') {
      warnings.push(`车牌状态异常（${plate.status}），需确认递延处理`);
    }
    
    if (recognitionRatio < 1 && recognitionRatio > 0) {
      warnings.push(`当月仅部分生效（${overlapDays}/${daysInPeriod}天）`);
    }
    
    if (overlapDays === 0) {
      errors.push('当月无生效天数，收入确认失败');
    }
    
    return {
      id: `revenue-${Date.now()}`,
      plateId: plate.id,
      plateNumber: plate.plateNumber,
      period,
      totalAmount,
      recognizedAmount,
      deferredAmount,
      calculationDate: new Date().toISOString(),
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'normal',
      warnings,
      errors
    };
  }

  static detectSpecialScenarios(
    revenue: DeferredRevenue,
    bindings: BindingRecord[],
    flows: ParkingFlow[]
  ): ProblemMark[] {
    const problems: ProblemMark[] = [];
    const periodDate = new Date(revenue.period + '-01');
    const periodMonth = periodDate.getMonth();
    const periodYear = periodDate.getFullYear();

    bindings.forEach(binding => {
      if (binding.status === 'failed') {
        const bindDate = new Date(binding.bindTime);
        if (bindDate.getMonth() === periodMonth && bindDate.getFullYear() === periodYear) {
          problems.push({
            id: `problem-${Date.now()}-${Math.random()}`,
            traceId: '',
            problemType: 'binding_failure',
            severity: binding.failStep === 'approval' ? 'critical' : 'high',
            description: `车牌换绑失败：${binding.failReason || '未知原因'}`,
            triggerSource: `车牌换绑校验（${binding.id}）`,
            stuckPoint: this.getStuckPoint(binding),
            missingMaterial: this.getMissingMaterial(binding),
            nextSteps: this.getNextSteps(binding),
            responsibleParty: binding.operator,
            isResolved: false
          });
        }
      }
      
      if (binding.status === 'success') {
        const bindDate = new Date(binding.bindTime);
        if (bindDate.getMonth() !== periodMonth || bindDate.getFullYear() !== periodYear) {
          problems.push({
            id: `problem-${Date.now()}-${Math.random()}`,
            traceId: '',
            problemType: 'data_inconsistency',
            severity: 'high',
            description: '跨月换绑导致收入归属不清',
            triggerSource: '财务审批环节',
            stuckPoint: '审批阶段：跨月收入确认规则不明确',
            missingMaterial: ['跨月换绑收入拆分方案', '财务部门审批意见'],
            nextSteps: ['财务部门出具收入拆分方案', '运营部门确认换绑时间点'],
            responsibleParty: '财务主管',
            isResolved: false
          });
        }
      }
    });

    const unpaidFlows = flows.filter(f => f.paymentMethod === 'unpaid');
    if (unpaidFlows.length > 0) {
      problems.push({
        id: `problem-${Date.now()}-${Math.random()}`,
        traceId: '',
        problemType: 'deduction_mismatch',
        severity: 'medium',
        description: `存在${unpaidFlows.length}笔未结清临停费用`,
        triggerSource: '临停流水校验',
        stuckPoint: '费用结算阶段',
        missingMaterial: ['未结清费用的支付凭证'],
        nextSteps: ['联系车主结清费用'],
        responsibleParty: '运营专员',
        isResolved: false
      });
    }

    return problems;
  }

  private static getStuckPoint(binding: BindingRecord): string {
    const stepDescriptions: Record<string, string> = {
      validation: '数据校验阶段：费用未结清校验不通过',
      approval: '审批阶段：跨月收入确认规则不明确',
      system: '系统阶段：数据同步异常',
      data: '数据阶段：档案信息不完整'
    };
    return binding.failStep ? stepDescriptions[binding.failStep] : '未知阶段';
  }

  private static getMissingMaterial(binding: BindingRecord): string[] {
    const materials: Record<string, string[]> = {
      validation: ['未结清费用的支付凭证', '车主豁免申请（如有）'],
      approval: ['跨月换绑收入拆分方案', '财务部门审批意见'],
      system: ['系统错误日志', '技术部门分析报告'],
      data: ['完整的车牌档案信息', '车主身份证明']
    };
    return binding.failStep ? materials[binding.failStep] : ['相关证明材料'];
  }

  private static getNextSteps(binding: BindingRecord): string[] {
    const steps: Record<string, string[]> = {
      validation: ['联系车主结清临停费用', '或提交特殊审批申请'],
      approval: ['财务部门出具收入拆分方案', '运营部门确认换绑时间点'],
      system: ['联系技术部门排查问题', '提交系统故障工单'],
      data: ['补充完整的车牌档案信息', '重新提交换绑申请']
    };
    return binding.failStep ? steps[binding.failStep] : ['分析失败原因并处理'];
  }

  static recalculateOnPlateChange(
    oldPlate: PlateArchive,
    newPlate: PlateArchive,
    flows: ParkingFlow[],
    period: string
  ): { oldRevenue: DeferredRevenue; newRevenue: DeferredRevenue; adjustment: number } {
    const oldRevenue = this.calculate(oldPlate, flows, period);
    const newRevenue = this.calculate(newPlate, flows, period);
    const adjustment = newRevenue.recognizedAmount - oldRevenue.recognizedAmount;
    
    return { oldRevenue, newRevenue, adjustment };
  }
}
