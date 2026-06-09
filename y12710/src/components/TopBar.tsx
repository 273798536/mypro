import { Plus, Download, Play, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useDraftStore } from '@/store/draftStore';
import { downloadDraft } from '@/utils/export';
import { useNavigate } from 'react-router-dom';
import { summarizeAvailability } from '@/hooks/useErrorAnalysis';
import { CheckCircle2, AlertTriangle, XCircle, Minus } from 'lucide-react';

export function TopBar() {
  const { drafts, activeDraftId, isOperationView, toggleOperationView, runCalculation, createDraft, addVersionLog } =
    useDraftStore();
  const active = drafts.find((d) => d.id === activeDraftId);
  const nav = useNavigate();

  const stats = active ? summarizeAvailability(active.dataRows) : null;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">
            {active ? active.title : '工作台'}
          </h2>
          {active && (
            <p className="text-xs text-slate-500">
              {active.author} · {active.currentVersion} · 更新于 {active.updatedAt}
            </p>
          )}
        </div>

        {stats && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <StatCard
              icon={<CheckCircle2 size={16} className="text-emerald-600" />}
              label="可用"
              count={stats.available}
              pct={stats.availablePct}
              color="emerald"
            />
            <StatCard
              icon={<AlertTriangle size={16} className="text-amber-600" />}
              label="暂缓"
              count={stats.pending}
              pct={stats.pendingPct}
              color="amber"
            />
            <StatCard
              icon={<XCircle size={16} className="text-rose-600" />}
              label="重新采集"
              count={stats.recollect}
              pct={stats.recollectPct}
              color="rose"
            />
            <StatCard
              icon={<Minus size={16} className="text-slate-500" />}
              label="未标记"
              count={stats.unmarked}
              pct={0}
              color="slate"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const d = createDraft('新计算草稿', '当前助教');
            nav(`/draft/${d.id}`);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 hover:shadow-sm"
        >
          <Plus size={16} /> 新建草稿
        </button>

        <button
          onClick={toggleOperationView}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 hover:shadow-sm"
        >
          {isOperationView ? <EyeOff size={16} /> : <Eye size={16} />}
          {isOperationView ? '退出运营视图' : '运营视图'}
        </button>

        {active && (
          <>
            <button
              onClick={() => {
                runCalculation(active.id);
                addVersionLog(active.id, '重新执行公式计算与反例生成', '当前助教');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 hover:shadow-sm"
            >
              <Play size={14} /> 执行计算
            </button>
            <button
              onClick={() => downloadDraft(active)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 hover:shadow-md"
            >
              <Download size={16} /> 导出结果
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function StatCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  pct: number;
  color: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const ring: Record<string, string> = {
    emerald: 'ring-emerald-100 bg-emerald-50',
    amber: 'ring-amber-100 bg-amber-50',
    rose: 'ring-rose-100 bg-rose-50',
    slate: 'ring-slate-100 bg-slate-50',
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ring-1 ring-inset ${ring[color]}`}>
      {icon}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-sm font-bold text-slate-800">{count}</span>
      </div>
    </div>
  );
}
