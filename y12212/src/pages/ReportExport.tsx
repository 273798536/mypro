import { useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  AlertTriangle,
  Calculator,
  Eye,
  Download,
  Filter,
} from 'lucide-react';
import type { UserType, UserCategory, ExceptionType } from '../../shared/types';
import {
  USER_TYPE_LABELS,
  USER_CATEGORY_LABELS,
  EXCEPTION_TYPE_LABELS,
} from '../../shared/types';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/utils/api';

interface ReportRow {
  [key: string]: string | number;
  human_readable?: string;
}

const reportTypes = [
  {
    key: 'detail',
    label: '复核明细报表',
    description: '包含每笔账单的复核详情、阶梯用量及计算明细',
    icon: FileSpreadsheet,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconBg: 'bg-blue-100',
  },
  {
    key: 'exception',
    label: '异常分析报表',
    description: '汇总各类异常的分布、处理状态及趋势分析',
    icon: AlertTriangle,
    color: 'bg-red-50 border-red-200 text-red-700',
    iconBg: 'bg-red-100',
  },
  {
    key: 'settlement',
    label: '结算汇总报表',
    description: '按用户类型、月份汇总应收金额与实收金额',
    icon: Calculator,
    color: 'bg-green-50 border-green-200 text-green-700',
    iconBg: 'bg-green-100',
  },
];

export default function ReportExport() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [billingMonthStart, setBillingMonthStart] = useState('');
  const [billingMonthEnd, setBillingMonthEnd] = useState('');
  const [userType, setUserType] = useState<UserType | ''>('');
  const [userCategory, setUserCategory] = useState<UserCategory | ''>('');
  const [exceptionType, setExceptionType] = useState<ExceptionType | ''>('');
  const [includeHumanReadable, setIncludeHumanReadable] = useState(true);
  const [previewData, setPreviewData] = useState<ReportRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handlePreview = async () => {
    if (!selectedType) return;
    setPreviewing(true);
    try {
      const params = new URLSearchParams();
      params.set('type', selectedType);
      if (billingMonthStart) params.set('month_start', billingMonthStart);
      if (billingMonthEnd) params.set('month_end', billingMonthEnd);
      if (userType) params.set('user_type', userType);
      if (userCategory) params.set('user_category', userCategory);
      if (exceptionType) params.set('exception_type', exceptionType);
      params.set('human_readable', String(includeHumanReadable));
      const data = await apiGet<ReportRow[]>(`/reports/preview?${params.toString()}`);
      if (data.length > 0) {
        const cols = Object.keys(data[0]);
        setPreviewColumns(cols);
      } else {
        setPreviewColumns([]);
      }
      setPreviewData(data);
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const body = {
        type: selectedType,
        month_start: billingMonthStart || undefined,
        month_end: billingMonthEnd || undefined,
        user_type: userType || undefined,
        user_category: userCategory || undefined,
        exception_type: exceptionType || undefined,
        human_readable: includeHumanReadable,
        format,
      };
      await apiPost('/report/export', body);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileDown className="h-6 w-6 text-[#3b82f6]" />
        <h2 className="text-xl font-bold text-[#1e3a5f]">报表导出中心</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          const active = selectedType === rt.key;
          return (
            <button
              key={rt.key}
              onClick={() => setSelectedType(rt.key)}
              className={cn(
                'flex flex-col items-center gap-3 rounded-lg border-2 p-5 text-center transition-all',
                active
                  ? rt.color + ' ring-2 ring-offset-1 ring-[#3b82f6]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className={cn('rounded-lg p-3', active ? rt.iconBg : 'bg-gray-100')}>
                <Icon className={cn('h-7 w-7', active ? '' : 'text-gray-500')} />
              </div>
              <div>
                <p className="font-semibold">{rt.label}</p>
                <p className="mt-1 text-xs text-gray-500">{rt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#1e3a5f]">
          <Filter className="h-4 w-4" />
          筛选条件
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">账单月份（起）</label>
            <input
              type="month"
              value={billingMonthStart}
              onChange={(e) => setBillingMonthStart(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">账单月份（止）</label>
            <input
              type="month"
              value={billingMonthEnd}
              onChange={(e) => setBillingMonthEnd(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">用户类型</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            >
              <option value="">全部</option>
              {Object.entries(USER_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">用户分类</label>
            <select
              value={userCategory}
              onChange={(e) => setUserCategory(e.target.value as UserCategory | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            >
              <option value="">全部</option>
              {Object.entries(USER_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">异常类型</label>
            <select
              value={exceptionType}
              onChange={(e) => setExceptionType(e.target.value as ExceptionType | '')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            >
              <option value="">全部</option>
              {Object.entries(EXCEPTION_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={includeHumanReadable}
              onChange={(e) => setIncludeHumanReadable(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6]"
            />
            <span className="text-sm text-gray-700">包含说人话解释</span>
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={handlePreview}
            disabled={!selectedType || previewing}
            className={cn(
              'flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium text-white transition-colors',
              selectedType
                ? 'bg-[#3b82f6] hover:bg-[#2563eb]'
                : 'cursor-not-allowed bg-gray-300'
            )}
          >
            <Eye className="h-4 w-4" />
            {previewing ? '加载中...' : '预览'}
          </button>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-[#1e3a5f]">预览结果</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {previewColumns.map((col) => (
                    <th
                      key={col}
                      className={cn(
                        'whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-gray-600',
                        col === 'human_readable' && 'bg-yellow-50'
                      )}
                    >
                      {col === 'human_readable' ? '说人话' : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 even:bg-gray-50/50">
                    {previewColumns.map((col) => (
                      <td
                        key={col}
                        className={cn(
                          'whitespace-nowrap px-4 py-2 text-gray-700',
                          col === 'human_readable' && 'bg-yellow-50 font-medium text-yellow-800'
                        )}
                      >
                        {row[col] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-md bg-[#10b981] px-5 py-2 text-sm font-medium text-white hover:bg-[#059669] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              导出 Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-md bg-[#ef4444] px-5 py-2 text-sm font-medium text-white hover:bg-[#dc2626] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              导出 PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
