import * as XLSX from 'xlsx';
import type { Customer } from '../types';
import { generateId } from './dateUtils';

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

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

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      resolve(jsonData as Record<string, unknown>[]);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function validateCustomerData(rows: Record<string, unknown>[]): ImportResult<Customer> {
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

export function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSVFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  }
  
  return Promise.reject(new Error('不支持的文件格式，请上传 CSV 或 Excel 文件'));
}
