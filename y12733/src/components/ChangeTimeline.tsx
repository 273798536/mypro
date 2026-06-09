import { useCondProbStore } from '@/store/useCondProbStore';
import { REVIEW_STATUS_LABEL } from '@/types';

const FIELD_LABEL: Record<string, string> = {
  condition: '条件描述',
  outcome: '结果描述',
  jointCount: '交集样本数',
  conditionCount: '条件样本数',
  probability: '概率值',
  status: '数据状态',
  reviewStatus: '审核状态',
  explanation: '解释说明',
  isBoundary: '边界标记',
  boundaryNote: '边界说明',
  import: '导入更新',
};

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChangeTimeline({ paramId }: { paramId: string }) {
  const getChangelogs = useCondProbStore((s) => s.getChangelogs);
  const logs = getChangelogs(paramId);

  if (logs.length === 0) {
    return <p className="text-xs text-ink-400 italic py-2">暂无变更记录，首次录入或从示例数据加载。</p>;
  }

  return (
    <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
      {logs.map((log) => (
        <li key={log.id} className="relative pl-4">
          <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-ink-300 ring-4 ring-ink-100" />
          <div className="text-xs">
            <div className="flex items-center gap-2 text-ink-700">
              <span className="font-medium">{FIELD_LABEL[log.field] ?? log.field}</span>
              <span className="text-ink-400">·</span>
              <span className="text-ink-400 font-mono">{formatDate(log.timestamp)}</span>
              <span className="text-ink-400">·</span>
              <span className="text-ink-500">{log.operator}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {log.field === 'status' || log.field === 'reviewStatus' ? (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                    {REVIEW_STATUS_LABEL[log.oldValue as keyof typeof REVIEW_STATUS_LABEL] ?? log.oldValue}
                  </span>
                  <span className="text-ink-400">→</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    {REVIEW_STATUS_LABEL[log.newValue as keyof typeof REVIEW_STATUS_LABEL] ?? log.newValue}
                  </span>
                </>
              ) : (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono max-w-[160px] truncate">
                    {log.oldValue || '（空）'}
                  </span>
                  <span className="text-ink-400">→</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono max-w-[160px] truncate">
                    {log.newValue || '（空）'}
                  </span>
                </>
              )}
            </div>
            {log.reason && (
              <div className="mt-1 text-xs text-ink-500">理由：{log.reason}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
