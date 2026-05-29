import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { RenewalRecord, Discount } from '@/types';
import { formatCurrency, formatDate, generateId, generateTraceCode } from '@/utils/format';

interface SimpleExportOptions {
  includeTraceCode?: boolean;
}

const generateRenewalExportData = (records: RenewalRecord[], includeTraceCode: boolean = true) => {
  return records.map((record) => {
    const data: Record<string, string | number> = {
      '车牌号': record.plateNumber,
      '业主姓名': record.ownerName,
      '楼栋': record.building,
      '房号': record.roomNumber,
      '续费月数': record.renewalMonths,
      '基础费用': formatCurrency(record.baseFee),
      '临停抵扣': formatCurrency(record.tempParkingDeduction),
      '优惠减免': formatCurrency(record.discountAmount),
      '实付金额': formatCurrency(record.totalAmount),
      '状态': record.status === 'pending' ? '待处理' : record.status === 'reviewed' ? '已复核' : record.status === 'confirmed' ? '已确认' : '已取消',
      '复核状态': record.reviewStatus === 'normal' ? '正常' : record.reviewStatus === 'warning' ? '待关注' : '异常',
      '创建时间': formatDate(record.createdAt),
      '备注': record.remarks || '',
    };
    if (includeTraceCode) {
      data['追溯码'] = record.traceCode;
    }
    return data;
  });
};

const generateDiscountExportData = (discounts: Discount[]) => {
  return discounts.map((discount) => ({
    '优惠名称': discount.name,
    '优惠类型': discount.type === 'percentage' ? '折扣比例' : discount.type === 'fixed' ? '固定金额' : '赠送月数',
    '优惠值': discount.type === 'percentage' ? `${discount.value}%` : discount.type === 'fixed' ? `${discount.value}元` : `${discount.value}个月`,
    '生效日期': formatDate(discount.effectiveDate),
    '到期日期': formatDate(discount.expiryDate),
    '状态': discount.isActive ? '有效' : '无效',
    '使用次数': `${discount.usedCount}/${discount.maxUsage}`,
    '备注': discount.remarks || '',
  }));
};

export const exportToExcel = (
  records: RenewalRecord[],
  options: SimpleExportOptions = {}
): void => {
  const { includeTraceCode = true } = options;
  const wb = XLSX.utils.book_new();
  const data = generateRenewalExportData(records, includeTraceCode);
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '续费清单');
  XLSX.writeFile(wb, `续费清单_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToCSV = (
  records: RenewalRecord[],
  options: SimpleExportOptions = {}
): void => {
  const { includeTraceCode = true } = options;
  const data = generateRenewalExportData(records, includeTraceCode);
  const csv = Papa.unparse(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `续费清单_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateExportFilename = (type: string, format: string): string => {
  const date = new Date().toISOString().split('T')[0];
  const typeNames: Record<string, string> = {
    renewal: '续费清单',
    deduction: '临停抵扣明细',
    discount: '优惠汇总',
    full: '完整导出',
  };
  return `${typeNames[type] || '导出'}_${date}.${format}`;
};

export const createExportRecord = (
  type: 'renewal' | 'deduction' | 'discount' | 'full',
  format: 'xlsx' | 'csv' | 'pdf',
  recordCount: number,
  fileSize: number,
  createdBy: string
) => {
  return {
    id: generateId(),
    exportType: type,
    format,
    recordCount,
    fileSize,
    createdAt: new Date().toISOString(),
    createdBy,
    traceCode: generateTraceCode(),
  };
};
