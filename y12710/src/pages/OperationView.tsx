import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Eye } from 'lucide-react';
import { useDraftStore } from '@/store/draftStore';
import { AvailabilityBadge, ReviewBadge } from '@/components/AvailabilityBadge';
import type { DataRow } from '@/types';

export default function OperationView() {
  const { drafts, initStore } = useDraftStore();

  useEffect(() => {
    if (drafts.length === 0) initStore();
  }, [drafts.length, initStore]);

  const allRows = drafts.flatMap((d) =>
    d.dataRows.map((r) => ({ ...r, draftTitle: d.title, draftId: d.id })),
  );

  const available = allRows.filter((r) => r.availability === 'available');
  const pending = allRows.filter((r) => r.availability === 'pending');
  const recollect = allRows.filter((r) => r.availability === 'recollect');
  const unmarked = allRows.filter((r) => r.availability === null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-8 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-indigo-600"
            >
              <ArrowLeft size={14} /> 返回助教工作台
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="flex items-center gap-2 font-serif text-xl font-bold text-slate-900">
                <Eye size={18} className="text-indigo-600" />
                运营视图
              </h1>
              <p className="text-xs text-slate-500">一眼分清：直接用 / 找助教复核</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Pill icon={<CheckCircle2 size={12} />} label="直接用" count={available.length} color="emerald" />
            <Pill icon={<AlertTriangle size={12} />} label="找助教" count={pending.length} color="amber" />
            <Pill icon={<XCircle size={12} />} label="需重做" count={recollect.length} color="rose" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-8 py-8">
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-white p-5 shadow-sm">
          <div className="grid grid-cols-4 gap-6">
            <LegendItem
              color="bg-emerald-500"
              title="可直接使用"
              desc="助教已复核通过，可直接下载使用"
              count={available.length}
            />
            <LegendItem
              color="bg-amber-500"
              title="需找助教复核"
              desc="数据暂缓使用，请先与助教沟通"
              count={pending.length}
            />
            <LegendItem
              color="bg-rose-500"
              title="需重新采集"
              desc="实验重做，不要使用这些数据"
              count={recollect.length}
            />
            <LegendItem
              color="bg-slate-400"
              title="助教未标记"
              desc="等待助教完成可用性分类"
              count={unmarked.length}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <StatusColumn
            title="✅ 可直接使用"
            subtitle="助教已确认可用"
            rows={available}
            tone="emerald"
          />
          <StatusColumn
            title="⚠️ 需复核"
            subtitle="请先联系助教"
            rows={pending}
            tone="amber"
          />
          <StatusColumn
            title="🔴 重新采集"
            subtitle="请勿使用这些数据"
            rows={recollect}
            tone="rose"
          />
        </div>
      </main>
    </div>
  );
}

function Pill({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'emerald' | 'amber' | 'rose';
}) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${map[color]}`}>
      {icon}
      {label} · <b>{count}</b>
    </span>
  );
}

function LegendItem({
  color,
  title,
  desc,
  count,
}: {
  color: string;
  title: string;
  desc: string;
  count: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${color} ring-4 ring-white/60`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <span className="font-mono text-xs text-slate-500">{count} 条</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function StatusColumn({
  title,
  subtitle,
  rows,
  tone,
}: {
  title: string;
  subtitle: string;
  rows: (DataRow & { draftTitle: string; draftId: string })[];
  tone: 'emerald' | 'amber' | 'rose';
}) {
  const toneMap = {
    emerald: {
      header: 'from-emerald-500 to-teal-500',
      card: 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300',
      tag: 'bg-emerald-100 text-emerald-700',
    },
    amber: {
      header: 'from-amber-500 to-orange-500',
      card: 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
      tag: 'bg-amber-100 text-amber-700',
    },
    rose: {
      header: 'from-rose-500 to-red-500',
      card: 'border-rose-200 bg-rose-50/40 hover:border-rose-300',
      tag: 'bg-rose-100 text-rose-700',
    },
  };
  const t = toneMap[tone];

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`rounded-t-2xl bg-gradient-to-r ${t.header} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[11px] opacity-85">{subtitle}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
            {rows.length}
          </span>
        </div>
      </div>
      <div className="max-h-[600px] flex-1 space-y-2 overflow-y-auto p-3">
        {rows.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-400">暂无数据</div>
        )}
        {rows.map((row) => (
          <div key={row.id} className={`group rounded-lg border p-3 transition ${t.card}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-500">
                {row.draftTitle} · #{row.index}
              </span>
              <AvailabilityBadge status={row.availability} />
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <Field label="频率" value={row.xValue?.toString() ?? '—'} />
              <Field label="原始" value={row.yValue?.toString() ?? '—'} />
              <Field label="滤波后" value={row.filteredAmplitude?.toString() ?? '—'} />
            </div>
            {row.remark && (
              <div className="mt-1.5 rounded bg-white/70 px-2 py-1 text-[10px] text-slate-600 ring-1 ring-inset ring-slate-200">
                📝 {row.remark}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <ReviewBadge status={row.reviewStatus} />
              <Link
                to={`/draft/${row.draftId}`}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100"
              >
                跳助教草稿 <ExternalLink size={9} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-slate-700">{value}</div>
    </div>
  );
}
