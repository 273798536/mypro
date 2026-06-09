import { useEffect } from 'react';
import { useDraftStore } from '@/store/draftStore';
import { DraftSidebar } from '@/components/DraftSidebar';
import { TopBar } from '@/components/TopBar';
import { SpectrumChart, ErrorDistributionChart } from '@/components/Charts';
import { summarizeAvailability } from '@/hooks/useErrorAnalysis';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, FileBarChart, Beaker } from 'lucide-react';

export default function Home() {
  const { drafts, initStore, activeDraftId, setActiveDraft } = useDraftStore();

  useEffect(() => {
    if (drafts.length === 0) initStore();
  }, [drafts.length, initStore]);

  useEffect(() => {
    if (!activeDraftId && drafts.length > 0) {
      setActiveDraft(drafts[0].id);
    }
  }, [activeDraftId, drafts, setActiveDraft]);

  const activeDraft = drafts.find((d) => d.id === activeDraftId);

  const overallStats = drafts.reduce(
    (acc, d) => {
      const s = summarizeAvailability(d.dataRows);
      acc.available += s.available;
      acc.pending += s.pending;
      acc.recollect += s.recollect;
      acc.total += s.total;
      return acc;
    },
    { available: 0, pending: 0, recollect: 0, total: 0 },
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <DraftSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 grid grid-cols-4 gap-4">
            <OverviewCard
              icon={<FileBarChart size={18} />}
              label="草稿总数"
              value={drafts.length}
              sub="份计算草稿"
              color="indigo"
            />
            <OverviewCard
              icon={<CheckCircle2 size={18} />}
              label="累计可用"
              value={overallStats.available}
              sub={`占比 ${overallStats.total > 0 ? Math.round((overallStats.available / overallStats.total) * 100) : 0}%`}
              color="emerald"
            />
            <OverviewCard
              icon={<AlertTriangle size={18} />}
              label="待处理"
              value={overallStats.pending}
              sub="暂缓项待复核"
              color="amber"
            />
            <OverviewCard
              icon={<XCircle size={18} />}
              label="需重采集"
              value={overallStats.recollect}
              sub="实验重做项"
              color="rose"
            />
          </div>

          {activeDraft ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[360px]">
                <SpectrumChart draft={activeDraft} />
              </div>
              <div className="h-[360px]">
                <ErrorDistributionChart rows={activeDraft.dataRows} />
              </div>
            </div>
          ) : (
            <div className="flex h-[360px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
              <div className="text-center">
                <TrendingUp size={40} className="mx-auto mb-2 opacity-50" />
                <p>从左侧选择草稿查看频谱分析</p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4">
            <WorkflowGuide />
            <QuickHints />
          </div>
        </main>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const palette: Record<string, string> = {
    indigo: 'from-indigo-500/10 to-violet-500/10 text-indigo-700 ring-indigo-100',
    emerald: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 ring-emerald-100',
    amber: 'from-amber-500/10 to-orange-500/10 text-amber-700 ring-amber-100',
    rose: 'from-rose-500/10 to-red-500/10 text-rose-700 ring-rose-100',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${palette[color]} p-4 ring-1 ring-inset transition hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-600">{label}</div>
          <div className="mt-1 font-serif text-3xl font-bold">{value}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-white/70 shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function WorkflowGuide() {
  const steps = [
    { n: 1, t: '录入数据', d: '允许空值、重复、备注混排，不强制清理' },
    { n: 2, t: '公式计算', d: '配置窗函数与截止频率，执行FFT' },
    { n: 3, t: '误差分析', d: '逐条给出：补材料 或 改口径' },
    { n: 4, t: '标记可用性', d: '可用 / 暂缓 / 重新采集' },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 font-serif text-sm font-bold text-slate-800">助教工作流</h3>
      <ol className="space-y-2.5">
        {steps.map((s) => (
          <li key={s.n} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
              {s.n}
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-800">{s.t}</div>
              <div className="text-[11px] text-slate-500">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuickHints() {
  const hints = [
    { t: '异常不只是红色数字', d: '每条误差都告诉你是补材料还是改口径' },
    { t: '数据不干净也能工作', d: '空值灰斜体、重复橙色边、备注蓝色角标' },
    { t: '图表明细同源', d: '导出的 CSV、JSON、图表来自同一批数据' },
    { t: '运营视图一眼分清', d: '绿色直接用，黄色找助教复核' },
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Beaker size={14} className="text-indigo-600" />
        <h3 className="font-serif text-sm font-bold text-slate-800">使用提示</h3>
      </div>
      <ul className="space-y-2.5">
        {hints.map((h, i) => (
          <li key={i} className="rounded-lg bg-slate-50 p-2.5">
            <div className="text-xs font-semibold text-slate-800">{h.t}</div>
            <div className="text-[11px] text-slate-500">{h.d}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
