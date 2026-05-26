import * as XLSX from 'xlsx';
import type { Customer, Repayment, Guarantee, Approval, MultiSourceImportData, ImportResult } from '../types';
import { generateId, getRecentMonths } from './dateUtils';

export async function parseCSVFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        resolve([]);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = parseCSVLine(line);
          const obj: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            obj[header] = values[i]?.trim() ?? '';
          });
          return obj;
        });
      
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheets = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        return XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      });
      resolve(sheets);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function validateCustomerData(rows: Record<string, unknown>[]): ImportResult<Customer[]> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const customers: Customer[] = [];
  
  rows.forEach((row, index) => {
    const lineNum = index + 2;
    
    if (!row['客户名称']) {
      errors.push(`第 ${lineNum} 行：客户名称不能为空`);
      return;
    }
    
    if (!row['身份证号']) {
      errors.push(`第 ${lineNum} 行：身份证号不能为空`);
      return;
    }
    
    const customer: Customer = {
      id: generateId(),
      name: String(row['客户名称'] || ''),
      idCard: String(row['身份证号'] || ''),
      creditAmount: Number(row['授信额度(元)'] || row['授信额度'] || 0),
      startDate: String(row['授信起始日'] || row['起始日'] || new Date().toISOString().split('T')[0]),
      expiryDate: String(row['授信到期日'] || row['到期日'] || ''),
      status: 'normal',
      source: '批量导入',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      anomalies: []
    };
    
    if (!customer.expiryDate) {
      warnings.push(`第 ${lineNum} 行：未设置到期日，默认状态为正常`);
    }
    
    if (customer.creditAmount <= 0) {
      warnings.push(`第 ${lineNum} 行：授信额度为0或为空`);
    }
    
    customers.push(customer);
  });
  
  return {
    success: errors.length === 0,
    data: customers,
    errors,
    warnings
  };
}

export function validateMultiSourceData(
  customerRows: Record<string, unknown>[],
  repaymentRows: Record<string, unknown>[] = [],
  guaranteeRows: Record<string, unknown>[] = [],
  approvalRows: Record<string, unknown>[] = []
): ImportResult<MultiSourceImportData> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const customerMap = new Map<string, Customer>();
  const repayments: Repayment[] = [];
  const guarantees: Guarantee[] = [];
  const approvals: Approval[] = [];
  
  customerRows.forEach((row, index) => {
    const lineNum = index + 2;
    
    if (!row['客户名称'] || !row['身份证号']) {
      errors.push(`客户表第 ${lineNum} 行：客户名称和身份证号必填`);
      return;
    }
    
    const customer: Customer = {
      id: generateId(),
      name: String(row['客户名称'] || ''),
      idCard: String(row['身份证号'] || ''),
      creditAmount: Number(row['授信额度(元)'] || row['授信额度'] || 0),
      startDate: String(row['授信起始日'] || row['起始日'] || ''),
      expiryDate: String(row['授信到期日'] || row['到期日'] || ''),
      status: 'normal',
      source: String(row['数据来源'] || '批量导入'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      anomalies: []
    };
    
    customerMap.set(customer.idCard, customer);
  });
  
  const idCardToId = new Map<string, string>();
  customerMap.forEach((customer, idCard) => {
    idCardToId.set(idCard, customer.id);
  });
  
  repaymentRows.forEach((row, index) => {
    const lineNum = index + 2;
    const idCard = String(row['身份证号'] || '');
    const customerId = idCardToId.get(idCard);
    
    if (!customerId) {
      warnings.push(`还款流水第 ${lineNum} 行：未找到对应客户，已跳过`);
      return;
    }
    
    const month = String(row['月份'] || '');
    if (!month) {
      warnings.push(`还款流水第 ${lineNum} 行：月份为空，已跳过`);
      return;
    }
    
    repayments.push({
      id: generateId(),
      customerId,
      month,
      amount: Number(row['还款金额'] || 0),
      status: row['状态'] === 'missing' ? 'missing' : row['状态'] === 'overdue' ? 'overdue' : 'normal',
      source: String(row['数据来源'] || '还款流水导入')
    });
  });
  
  guaranteeRows.forEach((row, index) => {
    const lineNum = index + 2;
    const idCard = String(row['身份证号'] || '');
    const customerId = idCardToId.get(idCard);
    
    if (!customerId) {
      warnings.push(`担保信息第 ${lineNum} 行：未找到对应客户，已跳过`);
      return;
    }
    
    const type = String(row['担保类型'] || 'mortgage');
    if (!['mortgage', 'pledge', 'guarantor'].includes(type)) {
      warnings.push(`担保信息第 ${lineNum} 行：担保类型无效，使用默认抵押`);
    }
    
    guarantees.push({
      id: generateId(),
      customerId,
      type: (['mortgage', 'pledge', 'guarantor'].includes(type) ? type : 'mortgage') as 'mortgage' | 'pledge' | 'guarantor',
      guarantor: String(row['担保人/物'] || ''),
      startDate: String(row['担保起始日'] || ''),
      expiryDate: String(row['担保到期日'] || ''),
      status: 'valid',
      source: String(row['数据来源'] || '担保信息导入')
    });
  });
  
  approvalRows.forEach((row, index) => {
    const lineNum = index + 2;
    const idCard = String(row['身份证号'] || '');
    const customerId = idCardToId.get(idCard);
    
    if (!customerId) {
      warnings.push(`审批记录第 ${lineNum} 行：未找到对应客户，已跳过`);
      return;
    }
    
    const result = String(row['审批结果'] || 'pending');
    if (!['approved', 'rejected', 'pending', 'withdrawn'].includes(result)) {
      warnings.push(`审批记录第 ${lineNum} 行：审批结果无效，使用默认待审批`);
    }
    
    approvals.push({
      id: generateId(),
      customerId,
      stage: String(row['审批阶段'] || ''),
      result: (['approved', 'rejected', 'pending', 'withdrawn'].includes(result) ? result : 'pending') as 'approved' | 'rejected' | 'pending' | 'withdrawn',
      opinion: String(row['审批意见'] || ''),
      operator: String(row['操作人'] || ''),
      timestamp: String(row['审批时间'] || new Date().toISOString()),
      isWithdrawn: row['是否撤回'] === 'true' || row['是否撤回'] === '是',
      source: String(row['数据来源'] || '审批记录导入')
    });
  });
  
  return {
    success: errors.length === 0,
    data: {
      customers: Array.from(customerMap.values()),
      repayments,
      guarantees,
      approvals
    },
    errors,
    warnings
  };
}

export function parseFile(file: File): Promise<Record<string, unknown>[] | Record<string, unknown>[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  }
  
  return Promise.reject(new Error('不支持的文件格式，请上传 CSV 或 Excel 文件'));
}

export function generateEmptyRepayments(customerId: string, monthCount: number = 12): Repayment[] {
  return getRecentMonths(monthCount).map(month => ({
    id: generateId(),
    customerId,
    month,
    amount: 0,
    status: 'normal' as const,
    source: '系统生成'
  }));
}
