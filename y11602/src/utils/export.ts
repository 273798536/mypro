import * as XLSX from 'xlsx';
import type { Customer, Repayment, Guarantee, Approval } from '../types';
import { getStatusLabel } from './statusMachine';

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const value = row[h];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value ?? '';
    }).join(','))
  ].join('\n');
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportCustomerList(customers: Customer[], filename = '授信清单') {
  const data = customers.map(c => ({
    '客户名称': c.name,
    '身份证号': c.idCard,
    '授信额度(元)': c.creditAmount,
    '授信起始日': c.startDate,
    '授信到期日': c.expiryDate,
    '当前状态': getStatusLabel(c.status),
    '异常数量': c.anomalies.length,
    '数据来源': c.source,
    '创建时间': c.createdAt,
    '更新时间': c.updatedAt
  }));
  
  exportToExcel([{ name: '授信清单', data }], filename);
}

export function exportRiskReport(
  customers: Customer[],
  _repayments: Repayment[],
  guarantees: Guarantee[],
  approvals: Approval[],
  filename = '风险报告'
) {
  const abnormalCustomers = customers.filter(c => c.anomalies.length > 0);
  
  const customerData = abnormalCustomers.map(c => ({
    '客户名称': c.name,
    '身份证号': c.idCard,
    '授信额度(元)': c.creditAmount,
    '到期日': c.expiryDate,
    '当前状态': getStatusLabel(c.status),
    '异常信息': c.anomalies.map(a => a.message).join('; ')
  }));
  
  const guaranteeData = guarantees
    .filter(g => g.status !== 'valid')
    .map(g => {
      const customer = customers.find(c => c.id === g.customerId);
      return {
        '客户名称': customer?.name || '',
        '担保类型': g.type === 'mortgage' ? '抵押' : g.type === 'pledge' ? '质押' : '保证',
        '担保人/物': g.guarantor,
        '到期日': g.expiryDate,
        '状态': g.status === 'expired' ? '已过期' : '即将到期',
        '数据来源': g.source
      };
    });
  
  const approvalData = approvals
    .filter(a => a.isWithdrawn)
    .map(a => {
      const customer = customers.find(c => c.id === a.customerId);
      return {
        '客户名称': customer?.name || '',
        '审批阶段': a.stage,
        '审批结果': a.result,
        '审批意见': a.opinion,
        '操作人': a.operator,
        '审批时间': a.timestamp,
        '数据来源': a.source
      };
    });
  
  exportToExcel([
    { name: '异常客户', data: customerData },
    { name: '担保异常', data: guaranteeData },
    { name: '审批撤回', data: approvalData }
  ], filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
