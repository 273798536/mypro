import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/common/StatusBadge';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SafetyStatusTable() {
  const safetyRules = useAppStore((s) => s.safetyRules);
  const runSafetyChecks = useAppStore((s) => s.runSafetyChecks);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const categoryLabels: Record<string, string> = {
    threshold: '阈值校验',
    consistency: '一致性',
    coverage: '覆盖率',
  };

  const handleRefresh = (id: string) => {
    setRefreshingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      runSafetyChecks();
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 800);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
            <th className="text-left font-semibold px-4 py-3">规则名</th>
            <th className="text-left font-semibold px-4 py-3">类别</th>
            <th className="text-left font-semibold px-4 py-3">页面状态</th>
            <th className="text-left font-semibold px-4 py-3">文件状态</th>
            <th className="text-left font-semibold px-4 py-3">一致性</th>
            <th className="text-right font-semibold px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {safetyRules.map((rule) => {
            const isInconsistent = rule.isConsistent === false;
            const pageStatusKey = rule.pageStatus ? 'pass' : 'fail';
            const fileStatusKey = rule.exportStatus ? 'pass' : 'fail';
            const isRefreshing = refreshingIds.has(rule.id);

            return (
              <tr
                key={rule.id}
                className={cn(
                  'relative transition-colors hover:bg-slate-700/30',
                  isInconsistent && 'row-pulse-red'
                )}
              >
                {isInconsistent && (
                  <td className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500 rounded-l" aria-hidden />
                )}
                <td className={cn('px-4 py-3 font-medium text-slate-100', isInconsistent && 'pl-5')}>
                  <div className="flex items-start gap-2">
                    {isInconsistent && (
                      <AlertTriangle size={14} className="mt-0.5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold">{rule.name}</div>
                      {rule.detail && (
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                          {rule.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/40">
                    {categoryLabels[rule.category ?? ''] ?? rule.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={pageStatusKey as any} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={fileStatusKey as any} />
                </td>
                <td className="px-4 py-3">
                  {rule.isConsistent ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                      <CheckCircle2 size={14} />
                      <span>一致</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-xs">
                      <AlertTriangle size={14} />
                      <span>
                        {rule.pageStatus ? '页面通过' : '页面关闭'}
                        /
                        {rule.exportStatus ? '文件启用' : '文件待确认'}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRefresh(rule.id)}
                    disabled={isRefreshing}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      'text-slate-300 bg-slate-700/40 hover:bg-sky-600/30 hover:text-sky-300 border border-slate-600/40 hover:border-sky-500/40',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <RefreshCw
                      size={13}
                      className={cn(isRefreshing && 'animate-spin')}
                    />
                    <span>重新校验</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
