import type { ShipmentRecord, MaintenanceOrder, ReserveRule, AuditTrail } from '../../shared/types';

const MODELS = [
  { model: 'CNC-M200', category: '数控机床', warranty: 24, priceRange: [80000, 150000] },
  { model: 'ROBOT-R10', category: '工业机器人', warranty: 18, priceRange: [200000, 350000] },
  { model: 'PLC-C500', category: '控制器', warranty: 12, priceRange: [15000, 35000] },
  { model: 'MOTOR-M30', category: '伺服电机', warranty: 12, priceRange: [8000, 20000] },
];

const FAULT_TYPES = ['主轴故障', '伺服报警', 'PLC通讯异常', '轴承磨损', '电路板损坏', '液压系统泄漏', '传动皮带断裂', '传感器失效', '驱动器故障', '编码器异常', '温控器故障', '显示屏故障'];

function randomDate(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time).toISOString().split('T')[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateBatchNo(model: string, year: number): string {
  const month = String(randomInt(1, 12)).padStart(2, '0');
  return `${model}-${year}${month}`;
}

function generateSerialNo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}${randomInt(1000, 9999)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function generateShipmentRecords(count: number = 500): ShipmentRecord[] {
  const records: ShipmentRecord[] = [];
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2025-12-31');
  for (let i = 0; i < count; i++) {
    const modelInfo = MODELS[randomInt(0, MODELS.length - 1)];
    const shipmentDate = randomDate(startDate, endDate);
    const year = parseInt(shipmentDate.split('-')[0]);
    records.push({
      id: `SHIP-${String(i + 1).padStart(6, '0')}`,
      model: modelInfo.model,
      batchNo: generateBatchNo(modelInfo.model, year),
      shipmentDate,
      quantity: randomInt(1, 5),
      unitPrice: randomFloat(modelInfo.priceRange[0], modelInfo.priceRange[1]),
      serialNumber: generateSerialNo(),
      warrantyMonths: modelInfo.warranty,
    });
  }
  return records.sort((a, b) => new Date(a.shipmentDate).getTime() - new Date(b.shipmentDate).getTime());
}

export function generateMaintenanceOrders(shipments: ShipmentRecord[], count: number = 300): MaintenanceOrder[] {
  const orders: MaintenanceOrder[] = [];
  for (let i = 0; i < count && orders.length < count; i++) {
    const shipment = shipments[randomInt(0, Math.min(shipments.length - 1, i + randomInt(0, 100)))];
    const shipmentDateObj = new Date(shipment.shipmentDate);
    const maxClaimDate = new Date(shipmentDateObj);
    maxClaimDate.setMonth(maxClaimDate.getMonth() + 18);
    const claimDate = randomDate(shipmentDateObj, maxClaimDate);
    const hasDuplicate = Math.random() < 0.15;
    const hasBatchMismatch = Math.random() < 0.1;
    const faultType = FAULT_TYPES[randomInt(0, FAULT_TYPES.length - 1)];
    
    let batchNo = shipment.batchNo;
    if (hasBatchMismatch) {
      const batchSuffix = shipment.batchNo.slice(-2);
      const batchPrefix = shipment.batchNo.slice(0, -2);
      const wrongSuffix = String((parseInt(batchSuffix) + randomInt(1, 9)) % 100).padStart(2, '0');
      batchNo = batchPrefix + wrongSuffix;
    }
    orders.push({
      id: `MAINT-${String(orders.length + 1).padStart(6, '0')}`,
      serialNumber: shipment.serialNumber,
      batchNo,
      faultType,
      claimDate,
      claimAmount: randomFloat(500, 5000),
      claimStatus: hasDuplicate ? 'duplicate' : (Math.random() < 0.2 ? 'pending' : 'approved'),
      repairOrderNo: `RO${randomInt(20230000, 20259999)}`,
      isDuplicate: hasDuplicate,
      batchMismatch: hasBatchMismatch,
      confidenceScore: hasDuplicate ? randomFloat(80, 100) : undefined,
      detectionBasis: hasDuplicate ? '设备编号+故障类型相同，索赔日期相差≤30天' : undefined,
    });
    if (hasDuplicate && orders.length < count) {
      const claimDateObj = new Date(claimDate);
      const nextClaimDate = new Date(claimDateObj);
      nextClaimDate.setDate(nextClaimDate.getDate() + randomInt(1, 20));
      orders.push({
        id: `MAINT-${String(orders.length + 1).padStart(6, '0')}`,
        serialNumber: shipment.serialNumber,
        batchNo: shipment.batchNo,
        faultType,
        claimDate: randomDate(claimDateObj, nextClaimDate),
        claimAmount: randomFloat(500, 5000),
        claimStatus: 'duplicate',
        repairOrderNo: `RO${randomInt(20230000, 20259999)}`,
        isDuplicate: true,
        confidenceScore: randomFloat(80, 100),
        detectionBasis: '设备编号+故障类型相同，索赔日期相差≤30天',
      });
    }
  }
  return orders.sort((a, b) => new Date(a.claimDate).getTime() - new Date(b.claimDate).getTime());
}

export function generateReserveRules(): ReserveRule[] {
  const rules: ReserveRule[] = [];
  const versions = ['v1.0', 'v1.1', 'v1.2', 'v2.0', 'v2.1'];
  const creators = ['张会计', '李主管', '王经理', '赵总监', '陈总'];
  const changeReasons = [
    '初始版本',
    '根据2024年Q1索赔率调整计提比例',
    '延长部分型号质保期限调整',
    '会计准则变更，调整滚动计算周期',
    '优化重复索赔处理规则',
  ];
  
  versions.forEach((version, idx) => {
    MODELS.forEach((modelInfo, modelIdx) => {
      const baseRate = 0.03 + (modelIdx * 0.01);
      const rateAdjustment = idx * 0.005;
      rules.push({
        id: `RULE-${version}-${modelInfo.model}`,
        version,
        model: modelInfo.model,
        effectiveDate: idx === 0 ? '2023-01-01' : `202${3 + idx}-01-01`,
        expiryDate: idx === versions.length - 1 ? '2099-12-31' : `202${3 + idx}-12-31`,
        reserveRate: parseFloat((baseRate + rateAdjustment).toFixed(4)),
        rollbackMonths: 12 + idx,
        createdBy: creators[idx],
        changeReason: changeReasons[idx],
        isActive: idx === versions.length - 1,
        exceptionClauses: [
          '人为损坏不在保修范围',
          '超过质保期的索赔需特殊审批',
          '批量质量问题适用特殊计提比例+5%',
        ],
      });
    });
  });
  
  return rules;
}

export function generateAuditTrails(orders: MaintenanceOrder[]): AuditTrail[] {
  const trails: AuditTrail[] = [];
  const auditors = ['张会计', '李主管', '王经理'];
  orders
    .filter(o => o.isDuplicate || o.batchMismatch)
    .forEach((order, idx) => {
      if (Math.random() < 0.6) {
        const claimDate = new Date(order.claimDate);
        const auditDate = new Date(claimDate);
        auditDate.setDate(auditDate.getDate() + 7);
        trails.push({
          id: `AUDIT-${String(idx + 1).padStart(6, '0')}`,
          claimId: order.id,
          auditResult: Math.random() < 0.7 ? 'confirmed' : 'rejected',
          auditor: auditors[randomInt(0, auditors.length - 1)],
          auditTime: randomDate(claimDate, auditDate),
          auditComment: Math.random() < 0.7 ? '经核实确认为重复索赔，予以驳回' : '经核实为正常索赔，予以通过',
          evidence: `规则版本: v2.1, 检测依据: ${order.detectionBasis || '批次核对'}`,
        });
      }
    });
  return trails;
}

export function generateDataHash(data: any): string {
  return hashString(JSON.stringify(data) + Date.now().toString());
}

export const mockShipments = generateShipmentRecords(520);
export const mockOrders = generateMaintenanceOrders(mockShipments, 320);
export const mockRules = generateReserveRules();
export const mockAuditTrails = generateAuditTrails(mockOrders);

export function getActiveRules(): ReserveRule[] {
  return mockRules.filter(r => r.isActive);
}

export function getRuleByVersion(version: string): ReserveRule[] {
  return mockRules.filter(r => r.version === version);
}

export function getRuleVersions(): string[] {
  return Array.from(new Set(mockRules.map(r => r.version)));
}
