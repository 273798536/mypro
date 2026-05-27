import * as XLSX from 'xlsx';
import type { Portfolio } from '../types/portfolio';
import type { Asset } from '../types/portfolio';

export async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else if (result instanceof ArrayBuffer) {
        resolve(new TextDecoder().decode(result));
      } else {
        reject(new Error('无法读取文件'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(transformExcelData(jsonData));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function transformExcelData(data: any[]): any[] {
  return data.map(row => {
    const transformed: any = {
      name: row['组合名称'] || row['name'] || '',
      source: row['来源'] || row['source'] || 'Excel导入',
      weights: {}
    };

    const weightPattern = /^weight_(.+)$|^权重[：:]\s*(.+)$/i;
    
    for (const [key, value] of Object.entries(row)) {
      if (key === '预期收益' || key === 'expectedReturn') {
        transformed.expectedReturn = typeof value === 'number' ? value : parseFloat(String(value)) / 100;
      } else if (key === '波动率' || key === 'volatility') {
        transformed.volatility = typeof value === 'number' ? value : parseFloat(String(value)) / 100;
      } else if (key === '最大回撤' || key === 'maxDrawdown') {
        transformed.maxDrawdown = typeof value === 'number' ? value : parseFloat(String(value)) / 100;
      } else if (key === '夏普比率' || key === 'sharpeRatio') {
        transformed.sharpeRatio = typeof value === 'number' ? value : parseFloat(String(value));
      } else {
        const weightMatch = key.match(weightPattern);
        if (weightMatch) {
          const assetId = weightMatch[1] || weightMatch[2];
          transformed.weights[assetId] = typeof value === 'number' ? value : parseFloat(String(value)) / 100;
        } else if (key.startsWith('a') && /^a\d+$/.test(key)) {
          transformed.weights[key] = typeof value === 'number' ? value : parseFloat(String(value)) / 100;
        }
      }
    }

    return transformed;
  });
}

export async function parseJsonFile(file: File): Promise<any[]> {
  const content = await readFile(file);
  try {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    throw new Error('JSON格式错误');
  }
}

export async function parseCsvFile(file: File): Promise<any[]> {
  const content = await readFile(file);
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV文件格式错误：至少需要表头和一行数据');
  }

  const headers = parseCsvLine(lines[0]);
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: any = { weights: {} };
    
    headers.forEach((header, idx) => {
      const value = values[idx] || '';
      
      if (header === 'name' || header === '组合名称') {
        row.name = value;
      } else if (header === 'source' || header === '来源') {
        row.source = value;
      } else if (header === 'expectedReturn' || header === '预期收益') {
        row.expectedReturn = parseFloat(value) / 100;
      } else if (header === 'volatility' || header === '波动率') {
        row.volatility = parseFloat(value) / 100;
      } else if (header === 'maxDrawdown' || header === '最大回撤') {
        row.maxDrawdown = parseFloat(value) / 100;
      } else if (header === 'sharpeRatio' || header === '夏普比率') {
        row.sharpeRatio = parseFloat(value);
      } else if (header.startsWith('weight_') || /^权重[：:]\s*.+/.test(header)) {
        const assetId = header.replace(/^weight_/, '').replace(/^权重[：:]\s*/, '');
        row.weights[assetId] = parseFloat(value) / 100;
      } else if (header.startsWith('a') && /^a\d+$/.test(header)) {
        row.weights[header] = parseFloat(value) / 100;
      }
    });

    data.push(row);
  }

  return data;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export async function parseImportFile(
  file: File,
  assets: Asset[]
): Promise<{ data: any[]; fileType: 'xlsx' | 'csv' | 'json' }> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let data: any[];
  let fileType: 'xlsx' | 'csv' | 'json';
  
  if (extension === 'xlsx' || extension === 'xls') {
    data = await parseExcelFile(file);
    fileType = 'xlsx';
  } else if (extension === 'csv') {
    data = await parseCsvFile(file);
    fileType = 'csv';
  } else if (extension === 'json') {
    data = await parseJsonFile(file);
    fileType = 'json';
  } else {
    throw new Error('不支持的文件格式，请上传Excel、CSV或JSON文件');
  }

  return { data, fileType };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPortfoliosToJson(portfolios: Portfolio[]): void {
  const data = JSON.stringify(portfolios, null, 2);
  downloadFile(data, `portfolios_${Date.now()}.json`, 'application/json');
}

export function exportPortfoliosToExcel(
  portfolios: Portfolio[],
  assets: Asset[]
): void {
  const wb = XLSX.utils.book_new();
  
  const portfolioData = portfolios.map(p => ({
    '组合ID': p.id,
    '组合名称': p.name,
    '来源': p.source,
    '版本': p.version,
    '预期收益(%)': (p.expectedReturn * 100).toFixed(2),
    '波动率(%)': (p.volatility * 100).toFixed(2),
    '最大回撤(%)': (p.maxDrawdown * 100).toFixed(2),
    '夏普比率': p.sharpeRatio.toFixed(3),
    '状态': p.status,
    '创建时间': new Date(p.createdAt).toLocaleString('zh-CN'),
    '更新时间': new Date(p.updatedAt).toLocaleString('zh-CN'),
    ...Object.fromEntries(
      assets.map(a => [
        `${a.name}权重(%)`,
        ((p.weights[a.id] || 0) * 100).toFixed(2)
      ])
    ),
    '异常信息': p.anomalies.map(a => a.message).join('; ')
  }));
  
  const ws = XLSX.utils.json_to_sheet(portfolioData);
  XLSX.utils.book_append_sheet(wb, ws, '投资组合');
  
  if (portfolios.some(p => p.anomalies.length > 0)) {
    const anomalyData = portfolios.flatMap(p =>
      p.anomalies.map(a => ({
        '组合ID': p.id,
        '组合名称': p.name,
        '异常类型': a.type,
        '严重程度': a.severity,
        '异常信息': a.message,
        '详细信息': JSON.stringify(a.details)
      }))
    );
    const ws2 = XLSX.utils.json_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(wb, ws2, '异常信息');
  }
  
  const assetData = assets.map(a => ({
    '资产ID': a.id,
    '资产名称': a.name,
    '代码': a.code,
    '类别': a.category || '',
    '预期收益(%)': (a.expectedReturn * 100).toFixed(2),
    '波动率(%)': (a.volatility * 100).toFixed(2),
    '最大回撤(%)': (a.maxDrawdown * 100).toFixed(2)
  }));
  const ws3 = XLSX.utils.json_to_sheet(assetData);
  XLSX.utils.book_append_sheet(wb, ws3, '资产信息');
  
  XLSX.writeFile(wb, `portfolios_${Date.now()}.xlsx`);
}

export function generateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
