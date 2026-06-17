import { Link } from "react-router-dom";
import {
  Waypoints,
  CircleCheck,
  TriangleAlert,
  Octagon,
  Layers,
  FileWarning,
  Link2Off,
  GitCompareArrows,
  ArrowUpRight,
  Boxes,
} from "lucide-react";
import { useCheckStore } from "@/store/useCheckStore";
import { computeKpis, KIND_LABEL, KIND_COLOR, materialById } from "@/data/selectors";
import { Panel, SectionTitle, KpiCard, EmptyState } from "@/components/ui/Card";
import { StatusBadge, MaterialChip, Dot } from "@/components/ui/Badge";
import ShardDistChart from "@/components/charts/ShardDistChart";
import MaterialStackChart from "@/components/charts/MaterialStackChart";
import SeverityDonut from "@/components/charts/SeverityDonut";

const COV_LABEL: Record<string, string> = { ok: "口径一致", partial: "口径待对齐", missing: "缺失" };
const COV_TONE: Record<string, "emerald" | "amber" | "rose"> = {
  ok: "emerald",
  partial: "amber",
  missing: "rose",
};

function fmtTime(iso: string) {
  return iso.replace("T", " ").replace(/\+08:00$/, "");
}

export default function Overview() {
  const { batch } = useCheckStore();
  const k = computeKpis(batch);
  const issues = batch.routes.filter((r) => r.status !== "pass");
  const fkBroken = batch.fkChains.filter((f) => f.broken);
  const approvedOverride = batch.overrides.find((o) => o.status === "approved");

  return (
    <div className="space-y-5">
      {/* Hero / batch source strip */}
      <Panel className="scan overflow-hidden p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky/40 bg-sky/10 text-sky">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="num text-base font-semibold text-zinc-50">
                  {batch.id}
                </span>
                <span className="chip border-emerald/30 text-emerald-soft">
                  <Dot tone="emerald" pulse /> 同一批数据源
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-500">
                {batch.label} · {batch.cluster} · 生成 {fmtTime(batch.generatedAt)}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {batch.materials.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <Dot tone={COV_TONE[m.coverage]} />
                <span className="font-mono text-[10px] text-ink-500">
                  {KIND_LABEL[m.kind]}
                </span>
                <span
                  className="font-mono text-[10px] font-semibold"
                  style={{ color: KIND_COLOR[m.kind] }}
                >
                  {COV_LABEL[m.coverage]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="路由总数" value={k.total} tone="sky" icon={<Waypoints className="h-4 w-4" />} delay={0} hint={`${batch.cluster.split("·")[0]}`} />
        <KpiCard label="通过" value={k.pass} tone="emerald" icon={<CircleCheck className="h-4 w-4" />} delay={60} />
        <KpiCard label="未通过" value={k.warn + k.fail} tone="amber" icon={<TriangleAlert className="h-4 w-4" />} delay={120} hint={`告警 ${k.warn} · 阻断 ${k.fail}`} />
        <KpiCard label="阻断问题" value={k.critical} tone="rose" icon={<Octagon className="h-4 w-4" />} delay={180} hint="需立即处置" />
        <KpiCard label="材料覆盖" value={`${k.materialCoverage}/${k.materialTotal}`} tone="violet" icon={<Layers className="h-4 w-4" />} delay={240} hint="口径对齐进度" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <SectionTitle title="分片分布" subtitle="按目标库统计路由与问题" icon={<Waypoints className="h-4 w-4" />} />
          <ShardDistChart batch={batch} />
        </Panel>
        <Panel>
          <SectionTitle title="各材料检查结果" subtitle="检查依据来自哪份材料" icon={<Layers className="h-4 w-4" />} />
          <MaterialStackChart batch={batch} />
        </Panel>
        <Panel>
          <SectionTitle title="问题严重度分布" subtitle="整体健康度" icon={<Octagon className="h-4 w-4" />} />
          <SeverityDonut batch={batch} />
          <div className="mt-2 flex justify-center gap-4 font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-emerald-soft"><span className="h-2 w-2 rounded-full bg-emerald" />通过 {k.pass}</span>
            <span className="flex items-center gap-1.5 text-amber-soft"><span className="h-2 w-2 rounded-full bg-amber" />告警 {k.warn}</span>
            <span className="flex items-center gap-1.5 text-rose-soft"><span className="h-2 w-2 rounded-full bg-rose" />阻断 {k.fail}</span>
          </div>
        </Panel>
      </div>

      {/* Material caliber + key issues */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle title="材料口径一览" subtitle="三类材料各自的口径与覆盖" icon={<Layers className="h-4 w-4" />} />
          <div className="space-y-3">
            {batch.materials.map((m) => (
              <div key={m.id} className="rounded-lg border border-line bg-ink-850/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <MaterialChip kind={m.kind} name={m.name} />
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-ink-500">
                    <Dot tone={COV_TONE[m.coverage]} />
                    {COV_LABEL[m.coverage]} · {m.rows.toLocaleString()} 行
                  </span>
                </div>
                <div className="mt-2 font-mono text-[11px] leading-relaxed text-ink-500">
                  <span className="text-zinc-400">口径：</span>
                  {m.caliber}
                </div>
                <div className="mt-1 text-[11px] text-ink-500">{m.note}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title="本批次关键问题"
            subtitle="直达明细 / 审计 / 对比，全部同源"
            icon={<TriangleAlert className="h-4 w-4" />}
          />
          {issues.length === 0 && !fkBroken.length && !approvedOverride ? (
            <EmptyState title="本批次无关键问题" hint="所有路由检查通过，材料口径一致。" icon={<CircleCheck className="h-8 w-8" />} />
          ) : (
            <div className="space-y-2.5">
              {batch.badData && (
                <IssueRow
                  to="/backup"
                  tone="amber"
                  icon={<FileWarning className="h-4 w-4" />}
                  title="备份记录含坏数据"
                  desc={batch.badData.looksLike}
                  tag={batch.badData.rowId}
                />
              )}
              {fkBroken.map((f) => (
                <IssueRow
                  key={f.id}
                  to="/audit"
                  tone="rose"
                  icon={<Link2Off className="h-4 w-4" />}
                  title={`外键断链 ${f.from} → ${f.to}`}
                  desc={f.detail}
                  tag={`卡在 ${materialById(batch, f.stuckMaterialId)?.name ?? ""}`}
                />
              ))}
              {approvedOverride && (
                <IssueRow
                  to="/schema"
                  tone="violet"
                  icon={<GitCompareArrows className="h-4 w-4" />}
                  title={`权限越权已复核通过 ${approvedOverride.id}`}
                  desc={`${approvedOverride.change} · ${approvedOverride.why}`}
                  tag={`${approvedOverride.applicant} → ${approvedOverride.approver}`}
                />
              )}
              {issues.map((r) => (
                <IssueRow
                  key={r.id}
                  to="/routes"
                  tone={r.status === "fail" ? "rose" : "amber"}
                  icon={<Waypoints className="h-4 w-4" />}
                  title={`${r.id} · ${r.logicTable} → ${r.targetDb}.${r.targetTable}`}
                  desc={r.issue}
                  tag={<StatusBadge status={r.status} />}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function IssueRow({
  to,
  tone,
  icon,
  title,
  desc,
  tag,
}: {
  to: string;
  tone: "amber" | "rose" | "violet";
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    amber: "border-amber/30 hover:border-amber/50",
    rose: "border-rose/30 hover:border-rose/50",
    violet: "border-violet/30 hover:border-violet/50",
  };
  const text: Record<string, string> = {
    amber: "text-amber",
    rose: "text-rose",
    violet: "text-violet",
  };
  return (
    <Link
      to={to}
      className={`group flex items-start gap-3 rounded-lg border ${ring[tone]} bg-ink-850/40 p-3 transition-all hover:bg-ink-850/70`}
    >
      <span className={`mt-0.5 ${text[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-zinc-100">{title}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{desc}</p>
        <div className="mt-1.5">{typeof tag === "string" ? <span className="chip">{tag}</span> : tag}</div>
      </div>
    </Link>
  );
}
