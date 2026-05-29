import type { WarehouseReceipt, InspectionReport, PledgeContract, Warning, WarningType, WarningLevel, WarningStatus, QualityGrade } from '../../shared/types';

const gradeValues: Record<QualityGrade, number> = {
  A: 1, B: 2, C: 3, D: 4
};

const gradeLabels: Record<WarningType, string> = {
  quality_downgrade: '质检降级',
  duplicate_receipt: '重复仓单',
  price_gap: '价格缺口',
  normal: '正常'
};

const warehouseReceipts: WarehouseReceipt[] = [
  {
    id: 'r1',
    receiptNo: 'WH-2024-001',
    customerName: '华东粮油贸易有限公司',
    goodsName: '大豆',
    quantity: 1000,
    unit: '吨',
    warehouse: '上海外高桥保税仓',
    storageDate: '2024-03-15',
    expiryDate: '2025-03-14',
    status: 'normal',
    originalValue: 5000000
  },
  {
    id: 'r2',
    receiptNo: 'WH-2024-002',
    customerName: '华北粮食集团',
    goodsName: '玉米',
    quantity: 800,
    unit: '吨',
    warehouse: '天津港保税仓',
    storageDate: '2024-04-20',
    expiryDate: '2025-04-19',
    status: 'normal',
    originalValue: 3200000
  },
  {
    id: 'r3',
    receiptNo: 'WH-2024-003',
    customerName: '华南农产品有限公司',
    goodsName: '小麦',
    quantity: 1500,
    unit: '吨',
    warehouse: '广州南沙港仓',
    storageDate: '2024-05-10',
    expiryDate: '2025-05-09',
    status: 'normal',
    originalValue: 4500000
  },
  {
    id: 'r4',
    receiptNo: 'WH-2024-004',
    customerName: '中原粮油股份有限公司',
    goodsName: '大豆',
    quantity: 1200,
    unit: '吨',
    warehouse: '郑州中储粮库',
    storageDate: '2024-06-01',
    expiryDate: '2025-05-31',
    status: 'duplicate',
    originalValue: 6000000
  },
  {
    id: 'r5',
    receiptNo: 'WH-2024-005',
    customerName: '东北粮食贸易有限公司',
    goodsName: '稻谷',
    quantity: 2000,
    unit: '吨',
    warehouse: '大连北良港仓',
    storageDate: '2024-02-28',
    expiryDate: '2025-02-27',
    status: 'normal',
    originalValue: 6000000
  }
];

const inspectionReports: InspectionReport[] = [
  {
    id: 'i1',
    receiptId: 'r1',
    receiptNo: 'WH-2024-001',
    inspectionDate: '2024-03-16',
    inspector: '张三',
    qualityGrade: 'A',
    qualityScore: 92,
    moistureContent: 12.5,
    impurityContent: 0.8,
    unitWeight: 760,
    remarks: '品质优良，符合国家标准一等',
    isDowngraded: false
  },
  {
    id: 'i2',
    receiptId: 'r2',
    receiptNo: 'WH-2024-002',
    inspectionDate: '2024-04-21',
    inspector: '李四',
    qualityGrade: 'A',
    qualityScore: 90,
    moistureContent: 13.0,
    impurityContent: 1.0,
    unitWeight: 750,
    remarks: '初检合格',
    isDowngraded: false
  },
  {
    id: 'i3',
    receiptId: 'r2',
    receiptNo: 'WH-2024-002',
    inspectionDate: '2024-05-15',
    inspector: '王五',
    qualityGrade: 'C',
    qualityScore: 72,
    moistureContent: 15.5,
    impurityContent: 2.5,
    unitWeight: 730,
    remarks: '复检发现霉变超标，从A级降为C级',
    isDowngraded: true,
    previousGrade: 'A'
  },
  {
    id: 'i4',
    receiptId: 'r3',
    receiptNo: 'WH-2024-003',
    inspectionDate: '2024-05-11',
    inspector: '赵六',
    qualityGrade: 'A',
    qualityScore: 91,
    moistureContent: 12.8,
    impurityContent: 0.9,
    unitWeight: 770,
    remarks: '品质良好',
    isDowngraded: false
  },
  {
    id: 'i5',
    receiptId: 'r4',
    receiptNo: 'WH-2024-004',
    inspectionDate: '2024-06-02',
    inspector: '钱七',
    qualityGrade: 'B',
    qualityScore: 82,
    moistureContent: 13.5,
    impurityContent: 1.2,
    unitWeight: 755,
    remarks: '检验合格',
    isDowngraded: false
  },
  {
    id: 'i6',
    receiptId: 'r5',
    receiptNo: 'WH-2024-005',
    inspectionDate: '2024-03-01',
    inspector: '孙八',
    qualityGrade: 'A',
    qualityScore: 93,
    moistureContent: 13.2,
    impurityContent: 0.7,
    unitWeight: 780,
    remarks: '优质稻谷',
    isDowngraded: false
  },
  {
    id: 'i7',
    receiptId: 'r1',
    receiptNo: 'WH-2024-001',
    inspectionDate: '2024-05-20',
    inspector: '周九',
    qualityGrade: 'C',
    qualityScore: 70,
    moistureContent: 16.0,
    impurityContent: 3.0,
    unitWeight: 720,
    remarks: '仓储期间受潮严重，品质下降明显，从A级降为C级',
    isDowngraded: true,
    previousGrade: 'A'
  }
];

const pledgeContracts: PledgeContract[] = [
  {
    id: 'c1',
    receiptId: 'r1',
    receiptNo: 'WH-2024-001',
    contractNo: 'PL-2024-001',
    customerName: '华东粮油贸易有限公司',
    pledgedQuantity: 1000,
    unit: '吨',
    agreedGrade: 'A',
    pledgeRate: 0.7,
    originalUnitPrice: 5000,
    currentUnitPrice: 3500,
    pledgedAmount: 3500000,
    remainingPrincipal: 4000000,
    startDate: '2024-03-20',
    endDate: '2024-09-19',
    status: 'active'
  },
  {
    id: 'c2',
    receiptId: 'r2',
    receiptNo: 'WH-2024-002',
    contractNo: 'PL-2024-002',
    customerName: '华北粮食集团',
    pledgedQuantity: 800,
    unit: '吨',
    agreedGrade: 'A',
    pledgeRate: 0.7,
    originalUnitPrice: 4000,
    currentUnitPrice: 2800,
    pledgedAmount: 2240000,
    remainingPrincipal: 2500000,
    startDate: '2024-04-25',
    endDate: '2024-10-24',
    status: 'active'
  },
  {
    id: 'c3',
    receiptId: 'r3',
    receiptNo: 'WH-2024-003',
    contractNo: 'PL-2024-003',
    customerName: '华南农产品有限公司',
    pledgedQuantity: 1500,
    unit: '吨',
    agreedGrade: 'A',
    pledgeRate: 0.7,
    originalUnitPrice: 3000,
    currentUnitPrice: 2800,
    pledgedAmount: 3150000,
    remainingPrincipal: 3000000,
    startDate: '2024-05-15',
    endDate: '2024-11-14',
    status: 'active'
  },
  {
    id: 'c4',
    receiptId: 'r4',
    receiptNo: 'WH-2024-004',
    contractNo: 'PL-2024-004',
    customerName: '中原粮油股份有限公司',
    pledgedQuantity: 600,
    unit: '吨',
    agreedGrade: 'B',
    pledgeRate: 0.65,
    originalUnitPrice: 5000,
    currentUnitPrice: 4800,
    pledgedAmount: 1950000,
    remainingPrincipal: 1800000,
    startDate: '2024-06-05',
    endDate: '2024-12-04',
    status: 'active'
  },
  {
    id: 'c5',
    receiptId: 'r4',
    receiptNo: 'WH-2024-004',
    contractNo: 'PL-2024-005',
    customerName: '中原粮油股份有限公司',
    pledgedQuantity: 500,
    unit: '吨',
    agreedGrade: 'B',
    pledgeRate: 0.65,
    originalUnitPrice: 5000,
    currentUnitPrice: 4800,
    pledgedAmount: 1625000,
    remainingPrincipal: 1500000,
    startDate: '2024-06-10',
    endDate: '2024-12-09',
    status: 'active'
  },
  {
    id: 'c6',
    receiptId: 'r5',
    receiptNo: 'WH-2024-005',
    contractNo: 'PL-2024-006',
    customerName: '东北粮食贸易有限公司',
    pledgedQuantity: 2000,
    unit: '吨',
    agreedGrade: 'A',
    pledgeRate: 0.7,
    originalUnitPrice: 3000,
    currentUnitPrice: 2950,
    pledgedAmount: 4200000,
    remainingPrincipal: 3800000,
    startDate: '2024-03-05',
    endDate: '2024-09-04',
    status: 'active'
  }
];

function generateWarnings(): Warning[] {
  const warnings: Warning[] = [];
  let warningId = 1;

  warehouseReceipts.forEach(receipt => {
    const receiptInspections = inspectionReports.filter(i => i.receiptId === receipt.id);
    const receiptContracts = pledgeContracts.filter(c => c.receiptId === receipt.id);
    const latestInspection = receiptInspections[receiptInspections.length - 1];

    if (receiptContracts.length > 1) {
      const totalPledged = receiptContracts.reduce((sum, c) => sum + c.pledgedQuantity, 0);
      const duplicateAmount = receiptContracts.slice(1).reduce((sum, c) => sum + c.remainingPrincipal, 0);
      
      warnings.push({
        id: `w${warningId++}`,
        type: 'duplicate_receipt',
        level: 'high',
        status: 'pending',
        receiptId: receipt.id,
        receiptNo: receipt.receiptNo,
        customerName: receipt.customerName,
        goodsName: receipt.goodsName,
        warningTime: '2024-06-15T10:30:00',
        description: `仓单重复质押：仓单数量${receipt.quantity}吨，累计质押${totalPledged}吨，超出${totalPledged - receipt.quantity}吨`,
        riskAmount: duplicateAmount,
        receipt,
        inspections: receiptInspections,
        contracts: receiptContracts,
        reviews: []
      });
    }

    if (latestInspection?.isDowngraded) {
      const contract = receiptContracts[0];
      if (contract && gradeValues[latestInspection.qualityGrade] > gradeValues[contract.agreedGrade]) {
        const originalValue = contract.originalUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
        const currentValue = contract.currentUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
        const riskAmount = Math.max(0, contract.remainingPrincipal - currentValue);
        
        warnings.push({
          id: `w${warningId++}`,
          type: 'quality_downgrade',
          level: riskAmount > 100000 ? 'high' : 'medium',
          status: 'pending',
          receiptId: receipt.id,
          receiptNo: receipt.receiptNo,
          customerName: receipt.customerName,
          goodsName: receipt.goodsName,
          warningTime: latestInspection.inspectionDate + 'T14:00:00',
          description: `质检降级：合同约定${contract.agreedGrade}级，实际${latestInspection.qualityGrade}级，风险敞口${(riskAmount / 10000)}万元`,
          riskAmount,
          receipt,
          inspections: receiptInspections,
          contracts: receiptContracts,
          reviews: []
        });
      }
    }

    if (receiptContracts.length === 1 && !latestInspection?.isDowngraded) {
      const contract = receiptContracts[0];
      const currentValue = contract.currentUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
      const priceGap = contract.remainingPrincipal - currentValue;
      
      if (priceGap > 0) {
        warnings.push({
          id: `w${warningId++}`,
          type: 'price_gap',
          level: priceGap > 500000 ? 'high' : 'medium',
          status: 'pending',
          receiptId: receipt.id,
          receiptNo: receipt.receiptNo,
          customerName: receipt.customerName,
          goodsName: receipt.goodsName,
          warningTime: '2024-06-20T09:00:00',
          description: `价格缺口：当前估值${(currentValue / 10000).toFixed(0)}万元，剩余本金${(contract.remainingPrincipal / 10000).toFixed(0)}万元，缺口${(priceGap / 10000).toFixed(0)}万元`,
          riskAmount: priceGap,
          receipt,
          inspections: receiptInspections,
          contracts: receiptContracts,
          reviews: []
        });
      }
    }

    if (receiptContracts.length === 1 && !latestInspection?.isDowngraded) {
      const contract = receiptContracts[0];
      const currentValue = contract.currentUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
      if (currentValue >= contract.remainingPrincipal) {
        warnings.push({
          id: `w${warningId++}`,
          type: 'normal',
          level: 'low',
          status: 'pending',
          receiptId: receipt.id,
          receiptNo: receipt.receiptNo,
          customerName: receipt.customerName,
          goodsName: receipt.goodsName,
          warningTime: '2024-06-25T08:00:00',
          description: '正常：三档数据一致，无异常',
          riskAmount: 0,
          receipt,
          inspections: receiptInspections,
          contracts: receiptContracts,
          reviews: []
        });
      }
    }
  });

  return warnings;
}

let warningsData = generateWarnings();

export { warehouseReceipts, inspectionReports, pledgeContracts, warningsData, gradeValues, gradeLabels };
