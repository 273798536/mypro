import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, Layers, FileWarning, GitCompare } from "lucide-react";
import { useTopologyStore, statusLabel } from "../store/topologyStore";
import { useMemo } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tint: string;
  hint?: string;
}

function StatCard({ label, value, icon: Icon, tint, hint }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold text-slate-900 tabular-nums">
          {value}
        </div>
        {hint && <div className="mt-1 text-[11px] text-slate-400 leading-snug">{hint}</div>}
      </div>
    </div>
  );
}

export default function StatsCards() {
  const { records, getFilteredRecords } = useTopologyStore();
  const filtered = useMemo(() => getFilteredRecords(), [getFilteredRecords]);

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, warning: 0, error: 0, re_run: 0, total: filtered.length };
    filtered.forEach((r) => (c[r.status] += 1));
    return c;
  }, [filtered]);

  const {
    idMismatch,
    versionMismatch,
    hasLate,
    bySource,
    maxDeviation,
    avgDeviation,
    rerunCount,
  } = useMemo(() => {
    let idMismatch = 0,
      versionMismatch = 0,
      hasLate = 0,
      rerunCount = 0;
    const bySource: Record<string, number> = { unit: 0, parameter: 0, sample: 0, unknown: 0 };
    let totalAbsDev = 0,
      maxDev = 0;
    filtered.forEach((r) => {
      if (r.sampleNo !== r.declaredSampleNo) idMismatch++;
      if (r.parameterVersion !== r.declaredParameterVersion) versionMismatch++;
      if (r.attachments.some((a) => a.type === "late")) hasLate++;
      bySource[r.changeSource] = (bySource[r.changeSource] || 0) + 1;
      const abs = Math.abs(r.deviationPct);
      totalAbsDev += abs;
      if (abs > maxDev) maxDev = abs;
      rerunCount += Math.max(0, r.runHistory.length - 1);
    });
    return {
      idMismatch,
      versionMismatch,
      hasLate,
      bySource,
      maxDeviation: Number(maxDev.toFixed(2)),
      avgDeviation: filtered.length ? Number((totalAbsDev / filtered.length).toFixed(2)) : 0,
      rerunCount,
    };
  }, [filtered]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="本批记录数"
        value={`${counts.total} / ${records.length}`}
        icon={Layers}
        tint="bg-slate-100 text-slate-600"
        hint="筛选后 / 总数"
      />
      <StatCard
        label={statusLabel("verified")}
        value={counts.verified}
        icon={CheckCircle2}
        tint="bg-emerald-50 text-emerald-600"
        hint={`占比 ${counts.total ? Math.round((counts.verified / counts.total) * 100) : 0}%`}
      />
      <StatCard
        label={statusLabel("warning")}
        value={counts.warning}
        icon={AlertTriangle}
        tint="bg-amber-50 text-amber-600"
        hint="需关注但非阻断"
      />
      <StatCard
        label={statusLabel("error")}
        value={counts.error}
        icon={XCircle}
        tint="bg-rose-50 text-rose-600"
        hint="问题项待处理"
      />
      <StatCard
        label={statusLabel("pending")}
        value={counts.pending}
        icon={Clock}
        tint="bg-sky-50 text-sky-600"
        hint="等待首轮验算"
      />
      <StatCard
        label="累计重跑"
        value={rerunCount}
        icon={RefreshCw}
        tint="bg-indigo-50 text-indigo-600"
        hint="所有记录总重跑次数"
      />

      <StatCard
        label="编号冲突"
        value={idMismatch}
        icon={FileWarning}
        tint="bg-orange-50 text-orange-600"
        hint="样本/登记编号不一致"
      />
      <StatCard
        label="参数版本不一致"
        value={versionMismatch}
        icon={GitCompare}
        tint="bg-cyan-50 text-cyan-600"
        hint="需以采集文件为准"
      />
      <StatCard
        label="含晚到附件"
        value={hasLate}
        icon={FileWarning}
        tint="bg-violet-50 text-violet-600"
        hint="已补挂到对应记录"
      />
      <StatCard
        label="单位换算类"
        value={bySource.unit}
        icon={GitCompare}
        tint="bg-fuchsia-50 text-fuchsia-600"
        hint="变化来源=单位"
      />
      <StatCard
        label="平均偏差率"
        value={`${avgDeviation}%`}
        icon={AlertTriangle}
        tint="bg-slate-50 text-slate-600"
        hint={`最大 ${maxDeviation}%`}
      />
      <StatCard
        label="参数版本类"
        value={bySource.parameter}
        icon={GitCompare}
        tint="bg-teal-50 text-teal-600"
        hint="变化来源=参数"
      />
    </section>
  );
}
