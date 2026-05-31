import * as XLSX from 'xlsx';
import type {
  ReserveCalculation,
  DuplicateClaimGroup,
  BatchMismatch,
  AuditTrail,
  RollingReport,
  ShipmentRecord,
  MaintenanceOrder,
  ReserveRule,
} from '../../shared/types';
import { formatCurrency, formatDate } from './calculationEngine';

interface ExportOptions {
  includeHash?: boolean;
  includeEvidence?: boolean;
}

export function exportToExcel(
  calculations: ReserveCalculation[],
  options: ExportOptions = {}
): void {
  const wb = XLSX.utils.book_new();
  
  const summaryData = calculations.map(c => ({
    '型号': c.model,
    '批次': c.batchNo,
    '计算日期': c.calcDate,
    '规则版本': c.ruleVersion,
    '期初余额': c.beginningReserve,
    '本期计提': c.currentAccrual,
    '本期冲回': c.currentWriteBack,
    '期末余额': c.endingReserve,
    '出货金额': c.shipmentAmount,
    '有效索赔金额': c.claimAmount,
    '重复索赔金额': c.duplicateClaimAmount,
    '数据哈希': options.includeHash ? c.dataSnapshot.dataHash : '',
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '准备金汇总');
  
  const detailData: any[] = [];
  calculations.forEach(c => {
    c.calculationSteps.forEach(step => {
      detailData.push({
        '型号': c.model,
        '批次': c.batchNo,
        '步骤': step.stepNo,
        '描述': step.description,
        '公式': step.formula,
        '计算结果': formatCurrency(step.result),
        '证据': options.includeEvidence ? (step.evidence || '') : '',
      });
    });
  });
  
  const ws2 = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, ws2, '计算明细');
  
  if (options.includeHash) {
    const metaData = [{
      '生成时间': new Date().toLocaleString('zh-CN'),
      '数据快照哈希': calculations[0]?.dataSnapshot.dataHash || '',
      '规则版本': calculations[0]?.ruleVersion || '',
      '数据记录数': calculations.length,
    }];
    const ws3 = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, ws3, '元数据');
  }
  
  XLSX.writeFile(wb, `准备金计算_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportDuplicateClaimsToExcel(
  groups: DuplicateClaimGroup[],
  audits: AuditTrail[]
): void {
  const wb = XLSX.utils.book_new();
  
  const groupData = groups.map(g => ({
    '重复组编号': g.id,
    '设备编号': g.serialNumber,
    '故障类型': g.faultType,
    '检测日期': g.detectedDate,
    '置信度': `${g.confidenceScore}%`,
    '检测依据': g.detectionBasis,
    '状态': g.status === 'pending' ? '待处理' : '已处理',
    '索赔笔数': g.claims.length,
    '涉及金额': formatCurrency(g.claims.reduce((s, c) => s + c.claimAmount, 0)),
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(groupData);
  XLSX.utils.book_append_sheet(wb, ws1, '重复索赔汇总');
  
  const claimData: any[] = [];
  groups.forEach(g => {
    g.claims.forEach((claim, idx) => {
      const audit = audits.find(a => a.claimId === claim.id);
      claimData.push({
        '重复组编号': g.id,
        '序号': idx + 1,
        '索赔单编号': claim.id,
        '设备编号': claim.serialNumber,
        '批次': claim.batchNo,
        '故障类型': claim.faultType,
        '索赔日期': claim.claimDate,
        '索赔金额': formatCurrency(claim.claimAmount),
        '状态': claim.claimStatus,
        '维修单号': claim.repairOrderNo,
        '是否标记重复': claim.isDuplicate ? '是' : '否',
        '审核结果': audit ? (audit.auditResult === 'confirmed' ? '已确认' : '已驳回') : '未审核',
        '审核人': audit?.auditor || '',
        '审核时间': audit?.auditTime || '',
        '审核意见': audit?.auditComment || '',
      });
    });
  });
  
  const ws2 = XLSX.utils.json_to_sheet(claimData);
  XLSX.utils.book_append_sheet(wb, ws2, '索赔明细');
  
  XLSX.writeFile(wb, `重复索赔分析_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportBatchMismatchesToExcel(
  mismatches: BatchMismatch[]
): void {
  const wb = XLSX.utils.book_new();
  
  const data = mismatches.map(m => ({
    '错配编号': m.id,
    '设备编号': m.serialNumber,
    '出货批次': m.shipmentBatch,
    '索赔批次': m.claimBatch,
    '出货日期': m.shipmentRecord.shipmentDate,
    '索赔日期': m.maintenanceOrder.claimDate,
    '质保期限(月)': m.shipmentRecord.warrantyMonths,
    '是否在质保期内': m.withinWarranty ? '是' : '否',
    '故障类型': m.maintenanceOrder.faultType,
    '索赔金额': formatCurrency(m.maintenanceOrder.claimAmount),
    '状态': m.status === 'pending' ? '待处理' : '已处理',
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '批次错配');
  
  XLSX.writeFile(wb, `批次错配分析_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRollingReportToExcel(
  report: RollingReport
): void {
  const wb = XLSX.utils.book_new();
  
  const coverData = [
    { '项': '报告编号', '值': report.id },
    { '项': '报告日期', '值': report.reportDate },
    { '项': '统计期间', '值': report.period },
    { '项': '生成人', '值': report.generatedBy },
    { '项': '规则版本', '值': report.version },
    { '项': '数据快照哈希', '值': report.dataSnapshot.dataHash },
    { '项': '生成时间', '值': new Date().toLocaleString('zh-CN') },
  ];
  
  const ws0 = XLSX.utils.json_to_sheet(coverData);
  XLSX.utils.book_append_sheet(wb, ws0, '报告封面');
  
  const calcData = report.calculations.map(c => ({
    '型号': c.model,
    '批次': c.batchNo,
    '期初余额': formatCurrency(c.beginningReserve),
    '本期计提': formatCurrency(c.currentAccrual),
    '本期冲回': formatCurrency(c.currentWriteBack),
    '期末余额': formatCurrency(c.endingReserve),
    '规则版本': c.ruleVersion,
    '数据哈希': c.dataSnapshot.dataHash,
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(calcData);
  XLSX.utils.book_append_sheet(wb, ws1, '准备金计算');
  
  const dupData = report.duplicateClaims.map(g => ({
    '设备编号': g.serialNumber,
    '故障类型': g.faultType,
    '置信度': `${g.confidenceScore}%`,
    '检测依据': g.detectionBasis,
    '涉及笔数': g.claims.length,
    '涉及金额': formatCurrency(g.claims.reduce((s, c) => s + c.claimAmount, 0)),
    '状态': g.status === 'pending' ? '待处理' : '已处理',
  }));
  
  const ws2 = XLSX.utils.json_to_sheet(dupData);
  XLSX.utils.book_append_sheet(wb, ws2, '重复索赔');
  
  const mismatchData = report.batchMismatches.map(m => ({
    '设备编号': m.serialNumber,
    '出货批次': m.shipmentBatch,
    '索赔批次': m.claimBatch,
    '是否在保': m.withinWarranty ? '是' : '否',
    '状态': m.status === 'pending' ? '待处理' : '已处理',
  }));
  
  const ws3 = XLSX.utils.json_to_sheet(mismatchData);
  XLSX.utils.book_append_sheet(wb, ws3, '批次错配');
  
  const auditData = report.auditTrails.map(a => ({
    '索赔单编号': a.claimId,
    '审核结果': a.auditResult === 'confirmed' ? '已确认' : '已驳回',
    '审核人': a.auditor,
    '审核时间': formatDate(a.auditTime),
    '审核意见': a.auditComment,
    '证据': a.evidence,
  }));
  
  const ws4 = XLSX.utils.json_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, ws4, '审核留痕');
  
  XLSX.writeFile(wb, `滚动报告_${report.period}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
