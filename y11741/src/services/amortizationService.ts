import type {
  CloudBill,
  ReservedInstance,
  SharedGateway,
  Project,
  AmortizationRecord,
  Anomaly,
  Tag,
} from '@/types';

const generateId = (): string => {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const calculateAmortization = (
  bills: CloudBill[],
  reserved: ReservedInstance[],
  gateways: SharedGateway[],
  projects: Project[]
): AmortizationRecord[] => {
  const records: AmortizationRecord[] = [];
  const periods = [...new Set(bills.map(b => b.billDate.substring(0, 7)))];

  for (const period of periods) {
    const periodBills = bills.filter(b => b.billDate.startsWith(period));

    for (const project of projects) {
      const directCost = calculateDirectCost(project, periodBills);
      const reservedDeduction = allocateReservedInstance(reserved, project, period);
      const sharedAllocation = allocateSharedGatewayCost(gateways, project);

      const totalAmount = directCost - reservedDeduction + sharedAllocation;

      const record: AmortizationRecord = {
        id: generateId(),
        period,
        projectId: project.id,
        totalAmount: Math.round(totalAmount * 100) / 100,
        reservedDeduction: Math.round(reservedDeduction * 100) / 100,
        sharedAllocation: Math.round(sharedAllocation * 100) / 100,
        directCost: Math.round(directCost * 100) / 100,
        sources: {
          reservedInstanceId: reservedDeduction > 0 ? reserved[0]?.id : undefined,
          sharedGatewayId: sharedAllocation > 0 ? gateways[0]?.id : undefined,
        },
        tags: [...project.tags, { key: 'period', value: period }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      records.push(record);
    }
  }

  return records;
};

const calculateDirectCost = (project: Project, bills: CloudBill[]): number => {
  const totalBillAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const projectShare = 1 / 6;

  return totalBillAmount * projectShare;
};

export const detectAnomalies = (
  record: AmortizationRecord,
  allRecords: AmortizationRecord[],
  bills: CloudBill[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const periodBills = bills.filter(b => b.billDate.startsWith(record.period));

  const projectTags = record.tags.filter(t => t.key !== 'period');
  if (projectTags.length === 0) {
    anomalies.push({
      id: generateId(),
      type: 'missing_tag',
      severity: 'warning',
      projectId: record.projectId,
      amortizationId: record.id,
      description: '摊销记录缺少业务标签，无法准确归集成本',
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  if (record.reservedDeduction > record.directCost) {
    anomalies.push({
      id: generateId(),
      type: 'deduction_error',
      severity: 'error',
      projectId: record.projectId,
      amortizationId: record.id,
      description: '预留实例抵扣金额计算错误，抵扣金额超过直接成本',
      amount: record.reservedDeduction - record.directCost,
      detectedAt: new Date().toISOString(),
      resolved: false,
    });
  }

  const previousRecords = allRecords.filter(
    r => r.projectId === record.projectId && r.period < record.period
  );

  if (previousRecords.length > 0) {
    const averageCost = previousRecords.reduce((sum, r) => sum + r.totalAmount, 0) / previousRecords.length;

    if (record.totalAmount > averageCost * 1.2 && averageCost > 0) {
      const growthRate = (record.totalAmount - averageCost) / averageCost;
      anomalies.push({
        id: generateId(),
        type: 'peak_cost',
        severity: 'info',
        projectId: record.projectId,
        amortizationId: record.id,
        description: `成本异常峰值: 本月成本较历史平均值增长 ${(growthRate * 100).toFixed(1)}%`,
        amount: record.totalAmount - averageCost,
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }
  }

  return anomalies;
};

export const allocateSharedGatewayCost = (
  gateways: SharedGateway[],
  project: Project
): number => {
  let totalAllocation = 0;

  for (const gateway of gateways) {
    if (gateway.projects.includes(project.id)) {
      const share = 1 / gateway.projects.length;
      totalAllocation += gateway.totalCost * share;
    }
  }

  return totalAllocation;
};

export const allocateReservedInstance = (
  reserved: ReservedInstance[],
  project: Project,
  period: string
): number => {
  let totalDeduction = 0;
  const periodDate = new Date(`${period}-01`);

  for (const ri of reserved) {
    const effectiveDate = new Date(ri.effectiveDate);
    const expirationDate = new Date(ri.expirationDate);

    if (periodDate >= effectiveDate && periodDate <= expirationDate) {
      const monthlyCost = ri.totalCost / 12;
      totalDeduction += monthlyCost * 0.3;
    }
  }

  return totalDeduction;
};

export default {
  calculateAmortization,
  detectAnomalies,
  allocateSharedGatewayCost,
  allocateReservedInstance,
};
