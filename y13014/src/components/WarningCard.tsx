import { AlertTriangle, Eye, FileText, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WarningRecord } from '@/types';
import { RISK_LABEL } from '@/types';
import StatusBadge from './StatusBadge';

interface Props {
  warning: WarningRecord;
  index?: number;
}

const riskColor: Record<WarningRecord['riskLevel'], string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-sky-600 bg-sky-50',
};

const statusBar: Record<WarningRecord['status'], string> = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  returned: 'bg-slate-400',
};

export default function WarningCard({ warning, index = 0 }: Props) {
  const navigate = useNavigate();
  const latestRemark = warning.remarks[warning.remarks.length - 1];

  return (
    <div
      className="group relative bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 hover:shadow-md hover:ring-slate-300 transition overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 10) * 80}ms` }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusBar[warning.status]}`} />

      {warning.isNegativeCorrection && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium ring-1 ring-red-600/20 animate-breathing-red">
          <MinusCircle size={12} />
          负数冲正
        </div>
      )}

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-slate-900 truncate">{warning.billNo}</span>
              <StatusBadge status={warning.status} size="sm" />
            </div>
            <div className="text-sm text-slate-600 truncate">{warning.customerName}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-mono text-lg font-semibold ${warning.amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              ¥{warning.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{warning.createDate}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${riskColor[warning.riskLevel]}`}>
            <AlertTriangle size={11} />
            {RISK_LABEL[warning.riskLevel]}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 ring-1 ring-slate-200">
            {warning.riskType}
          </span>
          {warning.remarks.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-deep-sea-700 bg-deep-sea-50">
              <FileText size={11} />
              备注 {warning.remarks.length}
            </span>
          )}
          {warning.screenshots.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-sky-700 bg-sky-50">
              截图 {warning.screenshots.length}
            </span>
          )}
        </div>

        {latestRemark && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3 line-clamp-2 ring-1 ring-slate-100">
            <span className="font-medium text-slate-600">{latestRemark.author}：</span>
            {latestRemark.content}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-400">
            {warning.operator ? `操作人：${warning.operator}` : '待处理'}
          </div>
          <button
            onClick={() => navigate(`/warning/${warning.id}`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-deep-sea-700 hover:bg-deep-sea-50 rounded-lg transition"
          >
            <Eye size={14} />
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}
