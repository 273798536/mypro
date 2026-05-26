import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, FileText, Calculator, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { useClaimStore } from '@/store/claimStore';
import { Card } from '@/components/UI';
import type { OperationType } from '@/types';

const operationIcons: Record<OperationType, typeof Edit3> = {
  create: FileText,
  update: Edit3,
  calculate: Calculator,
  approve: CheckCircle,
  reject: XCircle,
};

const operationLabels: Record<OperationType, string> = {
  create: '创建',
  update: '更新',
  calculate: '计算',
  approve: '通过',
  reject: '驳回',
};

const operationColors: Record<OperationType, string> = {
  create: 'bg-blue-100 text-blue-700',
  update: 'bg-purple-100 text-purple-700',
  calculate: 'bg-orange-100 text-orange-700',
  approve: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
};

export default function ClaimHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const claim = useClaimStore((state) => state.getClaimById(id || ''));

  if (!claim) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">理赔单不存在</p>
        <button
          onClick={() => navigate('/claims')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  const sortedHistory = [...claim.history].sort(
    (a, b) => new Date(b.operateAt).getTime() - new Date(a.operateAt).getTime()
  );

  const formatValue = (value: unknown): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'number') {
      if (value >= 1000) return `¥${value.toLocaleString()}`;
      if (value < 1 && value > 0) return `${(value * 100).toFixed(0)}%`;
      return value.toString();
    }
    return String(value);
  };

  const getChangedFields = (before: Record<string, unknown>, after: Record<string, unknown>) => {
    const fields: { key: string; before: unknown; after: unknown }[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    allKeys.forEach((key) => {
      if (key === 'history' || key === 'updatedAt' || key === 'createdAt') return;
      const beforeVal = JSON.stringify(before[key]);
      const afterVal = JSON.stringify(after[key]);
      if (beforeVal !== afterVal) {
        fields.push({ key, before: before[key], after: after[key] });
      }
    });
    return fields;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/claims/${claim.id}`)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">操作历史</h1>
          <p className="text-sm text-slate-500 mt-1">
            理赔单 {claim.id} | {claim.claimant}
          </p>
        </div>
      </div>

      <div className="relative">
        {sortedHistory.map((entry, index) => {
          const Icon = operationIcons[entry.operation];
          const changes = getChangedFields(
            entry.beforeData as Record<string, unknown>,
            entry.afterData as Record<string, unknown>
          );
          const isLatest = index === 0;

          return (
            <div key={entry.id} className="relative pl-8 pb-8 last:pb-0">
              {index < sortedHistory.length - 1 && (
                <div className="absolute left-3 top-6 w-0.5 h-full bg-slate-200" />
              )}
              <div
                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                  isLatest ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Icon size={12} />
              </div>

              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${operationColors[entry.operation]}`}
                      >
                        <Icon size={10} />
                        {operationLabels[entry.operation]}
                      </span>
                      <span className="text-xs text-slate-400">{entry.version}</span>
                    </div>
                    <p className="text-sm text-slate-600">{entry.reason}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <User size={12} />
                      {entry.operator}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Clock size={10} />
                      {new Date(entry.operateAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>

                {changes.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">变更内容</div>
                    <div className="space-y-2">
                      {changes.map((change) => (
                        <div key={change.key} className="grid grid-cols-3 gap-4 text-sm">
                          <div className="font-medium text-slate-700">{change.key}</div>
                          <div className="text-slate-500 line-through">
                            {change.before !== undefined ? formatValue(change.before) : '-'}
                          </div>
                          <div className="text-green-600 font-medium">
                            {change.after !== undefined ? formatValue(change.after) : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {sortedHistory.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p>暂无操作记录</p>
        </div>
      )}
    </div>
  );
}
