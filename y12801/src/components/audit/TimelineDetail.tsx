import { User, Clock } from 'lucide-react';
import type { AuditLog } from '@/types';

interface TimelineDetailProps {
  log: AuditLog;
}

const ENTITY_LABELS: Record<string, string> = {
  batch: '批次操作',
  review: '复核操作',
  anomaly: '异常复核',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function TimelineDetail({ log }: TimelineDetailProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-800">{log.action}</h4>
          <span className="text-xs text-slate-400">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {log.operator}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(log.operatedAt)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">操作详情</p>
          <p className="text-sm text-slate-700">{log.detail}</p>
        </div>

        {log.beforeData && log.afterData && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">数据变更</p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-1/4">字段</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-1/3">变更前</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-1/3">变更后</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys({ ...log.beforeData, ...log.afterData }).map(key => {
                    const oldVal = log.beforeData?.[key];
                    const newVal = log.afterData?.[key];
                    const oldStr = oldVal === null || oldVal === undefined ? '-' : typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal);
                    const newStr = newVal === null || newVal === undefined ? '-' : typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal);
                    const changed = oldStr !== newStr;
                    return (
                      <tr key={key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-2.5 text-slate-600 text-xs font-medium">{key}</td>
                        <td className={`px-4 py-2.5 text-xs ${changed ? 'diff-old line-through bg-red-50' : 'text-slate-600'}`}>
                          {oldStr}
                        </td>
                        <td className={`px-4 py-2.5 text-xs ${changed ? 'diff-new underline bg-teal-50' : 'text-slate-600'}`}>
                          {newStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(!log.beforeData && !log.afterData) && (
          <p className="text-xs text-slate-400 italic">无数据变更记录</p>
        )}
      </div>
    </div>
  );
}
