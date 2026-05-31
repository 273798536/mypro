import { useState } from 'react';
import {
  History,
  AlertTriangle,
  Clock,
  XCircle,
  Edit3,
  User,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { AdjustmentType } from '../types';

const typeConfig: Record<
  AdjustmentType,
  { label: string; icon: typeof AlertTriangle; color: string; bgColor: string }
> = {
  category_mismatch: {
    label: '科目串片',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  invoice_late: {
    label: '发票晚到',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  activity_cancelled: {
    label: '活动取消',
    icon: XCircle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
  manual_correction: {
    label: '手动修正',
    icon: Edit3,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
  },
};

export default function HistoryPage() {
  const { history } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredHistory =
    filterType === 'all'
      ? history
      : history.filter((h) => h.adjustmentType === filterType);

  const parseSnapshot = (snapshot: string) => {
    try {
      return JSON.parse(snapshot);
    } catch {
      return {};
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">调整历史</h1>
        <p className="text-slate-500 mt-1">查看所有费用调整记录，确保数据可追溯</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          全部
        </button>
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <config.icon className="w-4 h-4" />
            {config.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredHistory.map((record, index) => {
          const config = typeConfig[record.adjustmentType];
          const Icon = config.icon;
          const beforeData = parseSnapshot(record.beforeSnapshot);
          const afterData = parseSnapshot(record.afterSnapshot);
          const isExpanded = expandedId === record.id;

          return (
            <div
              key={record.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">
                        {config.label}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {record.operator}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {record.operatedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">原因</p>
                    <p className="text-slate-700 max-w-xs truncate">{record.reason}</p>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Eye className="w-5 h-5 text-slate-400" />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="pt-5">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-rose-50 rounded-xl p-5">
                        <h4 className="font-semibold text-rose-700 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          调整前
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(beforeData).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-xs text-rose-500 mb-1 capitalize">
                                {key === 'expenseCategory'
                                  ? '费用科目'
                                  : key === 'supplierName'
                                  ? '供应商'
                                  : key === 'amount'
                                  ? '金额'
                                  : key === 'remarks'
                                  ? '备注'
                                  : key === 'status'
                                  ? '状态'
                                  : key}
                              </p>
                              <p className="text-rose-800 font-medium">
                                {key === 'amount'
                                  ? `¥${Number(value).toLocaleString()}`
                                  : String(value) || '(空)'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-emerald-50 rounded-xl p-5">
                        <h4 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          调整后
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(afterData).map(([key, value]) => {
                            const hasChanged = beforeData[key] !== value;
                            return (
                              <div
                                key={key}
                                className={hasChanged ? 'bg-emerald-100 rounded-lg p-2 -m-2' : ''}
                              >
                                <p className="text-xs text-emerald-500 mb-1 capitalize">
                                  {key === 'expenseCategory'
                                    ? '费用科目'
                                    : key === 'supplierName'
                                    ? '供应商'
                                    : key === 'amount'
                                    ? '金额'
                                    : key === 'remarks'
                                    ? '备注'
                                    : key === 'status'
                                    ? '状态'
                                    : key}
                                </p>
                                <p className="text-emerald-800 font-medium">
                                  {key === 'amount'
                                    ? `¥${Number(value).toLocaleString()}`
                                    : String(value) || '(空)'}
                                </p>
                                {hasChanged && (
                                  <p className="text-xs text-emerald-600 mt-1">已修改</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">调整原因：</span>
                        {record.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无调整记录</p>
        </div>
      )}
    </div>
  );
}
