import Papa from 'papaparse';

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  meta: {
    headers: string[];
    rowCount: number;
  };
}

export function parseCSV<T = Record<string, string>>(file: File): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (result) => {
        resolve({
          data: result.data as T[],
          errors: result.errors.map((e) => e.message),
          meta: {
            headers: result.meta.fields || [],
            rowCount: result.data.length,
          },
        });
      },
    });
  });
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    throw new Error('没有数据可导出');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) {
            return '';
          }
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function detectDelimiter(content: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const firstLine = content.split('\n')[0] || '';

  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

export function generateSampleCSV(type: 'order' | 'statement' | 'bill' | 'rate'): string {
  const samples: Record<string, string> = {
    order: `订单号,客户名称,币种,金额,订单日期,来源
ORD001,ABC贸易公司,USD,10000,2024-01-15,手动录入
ORD002,XYZ进出口,EUR,8500,2024-01-16,ERP系统`,
    statement: `水单号,交易日期,币种,到账金额,银行,付款人信息,来源
TXN001,2024-01-20,CNY,69000,招商银行,ABC TRADE CO.,银行导出
TXN002,2024-01-21,CNY,62000,工商银行,XYZ IMPORT,银行导出`,
    bill: `账单号,平台,账单日期,币种,总金额,手续费,净金额,关联订单,来源
BILL001,PayPal,2024-01-19,USD,10000,300,9700,ORD001,平台导出
BILL002,Stripe,2024-01-20,EUR,8500,255,8245,ORD002,平台导出`,
    rate: `源币种,目标币种,汇率,日期,来源
USD,CNY,6.90,2024-01-15,央行中间价
EUR,CNY,7.45,2024-01-16,央行中间价`,
  };

  return samples[type] || '';
}

export function downloadTemplate(type: 'order' | 'statement' | 'bill' | 'rate'): void {
  const content = generateSampleCSV(type);
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filenames: Record<string, string> = {
    order: '客户订单导入模板',
    statement: '银行水单导入模板',
    bill: '平台账单导入模板',
    rate: '汇率数据导入模板',
  };

  link.setAttribute('href', url);
  link.setAttribute('download', `${filenames[type]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
