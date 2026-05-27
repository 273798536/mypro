import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSourceType } from '@/types';

interface DataPreviewProps<T> {
  type: DataSourceType;
  data: T[];
  errors?: { row: number; message: string }[];
  maxRows?: number;
}

const typeHeaders: Record<DataSourceType, string[]> = {
  payment: ['流水号', '到账日期', '金额', '付款方', '来源'],
  invoice: ['发票号', '卖方名称', '发票金额', '剩余金额', '合同号', '状态'],
  seller: ['卖方名称', '账号', '开户行'],
  contract: ['合同号', '卖方ID', '保理费率', '开始日期', '结束日期'],
  fee: ['名称', '费率', '扣除方式'],
  report: ['拆分ID', '发票号', '拆分金额', '手续费', '实际到账'],
};

export default function DataPreview<T extends Record<string, unknown>>({
  type,
  data,
  errors = [],
  maxRows = 10,
}: DataPreviewProps<T>) {
  const displayData = data.slice(0, maxRows);
  const headers = typeHeaders[type];

  const getValue = (row: T, header: string): string => {
    const keyMap: Record<string, string[]> = {
      流水号: ['receiptNo', '流水号'],
      到账日期: ['receiptDate', '到账日期'],
      金额: ['totalAmount', '金额'],
      付款方: ['payer', '付款方'],
      来源: ['source', '来源'],
      发票号: ['invoiceNo', '发票号'],
      卖方名称: ['sellerName', '卖方名称'],
      发票金额: ['invoiceAmount', '发票金额'],
      剩余金额: ['remainAmount', '剩余金额'],
      合同号: ['contractNo', '合同号'],
      状态: ['status', '状态'],
      账号: ['accountNo', '账号'],
      开户行: ['bankName', '开户行'],
      卖方ID: ['sellerId', '卖方ID'],
      保理费率: ['factoringRate', '保理费率'],
      开始日期: ['startDate', '开始日期'],
      结束日期: ['endDate', '结束日期'],
      名称: ['name', '名称'],
      费率: ['rate', '费率'],
      扣除方式: ['type', '扣除方式'],
    };

    const keys = keyMap[header] || [header];
    for (const key of keys) {
      if (row[key] !== undefined) {
        const value = row[key];
        if (typeof value === 'number') {
          if (header.includes('费率') || header.includes('rate')) {
            return `${(value * 100).toFixed(2)}%`;
          }
          return value.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }
        return String(value);
      }
    }
    return '-';
  };

  const hasErrors = errors.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-800">
          数据预览 ({displayData.length}{data.length > maxRows ? ` / ${data.length}` : ''} 条)
        </h4>
        {hasErrors ? (
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{errors.length} 条数据异常</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">全部正常</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500 font-medium w-16">
                序号
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayData.map((row, index) => {
              const rowError = errors.find((e) => e.row === index + 2);
              return (
                <tr
                  key={index}
                  className={cn(
                    'transition-colors',
                    rowError ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  )}
                >
                  <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                  {headers.map((header) => (
                    <td
                      key={header}
                      className={cn(
                        'px-3 py-2 whitespace-nowrap',
                        rowError ? 'text-red-700' : 'text-slate-700'
                      )}
                    >
                      {getValue(row, header)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-2">异常详情：</p>
          <ul className="space-y-1">
            {errors.slice(0, 5).map((error, index) => (
              <li key={index} className="text-sm text-red-600">
                第 {error.row} 行：{error.message}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="text-sm text-red-500">
                还有 {errors.length - 5} 条异常...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
