import { Link } from "react-router-dom";
import {
  ShieldAlert,
  User,
  Clock,
  Link2Off,
  Link2,
  FileSearch,
  ArrowRight,
  GitCompareArrows,
  CheckCircle2,
  CircleDashed,
  XCircle,
} from "lucide-react";
import { useCheckStore } from "@/store/useCheckStore";
import { materialById } from "@/data/selectors";
import { Panel, SectionTitle, EmptyState } from "@/components/ui/Card";
import { MaterialChip } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { OverrideStatus } from "@/data/types";

function fmtTime(iso: string) {
  if (!iso) return "待定";
  return iso.replace("T", " ").replace(/\+08:00$/, "");
}

const OVR_META: Record<OverrideStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "已复核通过", tone: "text-emerald border-emerald/40 bg-emerald/10", icon: CheckCircle2 },
  pending: { label: "待复核", tone: "text-amber border-amber/40 bg-amber/10", icon: CircleDashed },
  rejected: { label: "已驳回", tone: "text-rose border-rose/40 bg-rose/10", icon: XCircle },
};

export default function AuditTrail() {
  const { batch } = useCheckStore();
  const overrides = [...batch.overrides].sort((a, b) =>
    (b.requestedAt || "").localeCompare(a.requestedAt || ""),
  );
  const broken = batch.fkChains.filter((f) => f.broken);
  const intact = batch.fkChains.filter((f) => !f.broken);
  const approved = batch.overrides.find((o) => o.status === "approved");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Permission override history */}
      <Panel>
        <SectionTitle
          title="权限越权复核历史"
          subtitle="谁改 · 何时改 · 为什么改"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        {overrides.length === 0 ? (
          <EmptyState title="本批次无权限越权记录" hint="未发生权限变更。" icon={<ShieldAlert className="h-8 w-8" />} />
        ) : (
          <ol className="relative ml-1 border-l border-line">
            {overrides.map((o, i) => {
              const m = OVR_META[o.status];
              const Icon = m.icon;
              return (
                <li key={o.id} className="mb-5 ml-5 last:mb-0">
                  <span className="absolute -left-[7px] mt-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-ink-900 bg-sky" />
                  <div
                    className={cn(
                      "rounded-lg border bg-ink-850/40 p-3.5",
                      o.status === "approved" ? "border-violet/30" : "border-line",
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="num text-[12px] font-semibold text-zinc-100">{o.id}</span>
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px]", m.tone)}>
                        <Icon className="h-2.5 w-2.5" /> {m.label}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                      <Field icon={<User className="h-3 w-3" />} label="申请人" value={o.applicant} />
                      <Field icon={<User className="h-3 w-3" />} label="审批人" value={o.approver} />
                      <Field icon={<Clock className="h-3 w-3" />} label="申请时间" value={fmtTime(o.requestedAt)} />
                      <Field icon={<Clock className="h-3 w-3" />} label="决定时间" value={fmtTime(o.decidedAt)} />
                    </div>

                    <div className="mt-2.5 rounded-md border border-line bg-ink-900/50 p-2">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-600">变更内容</div>
                      <div className="mt-0.5 font-mono text-[12px] text-sky-soft">{o.change}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">范围：{o.scope}</div>
                    </div>

                    <div className="mt-2 flex items-start gap-1.5">
                      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-600">为什么</span>
                      <span className="text-[11px] text-zinc-300">{o.why}</span>
                    </div>

                    {o.id === approved?.id && (
                      <Link
                        to="/schema"
                        className="mt-3 flex items-center gap-1.5 rounded-md border border-violet/30 bg-violet/5 px-2.5 py-1.5 text-[11px] text-violet-soft transition-colors hover:border-violet/50"
                      >
                        <GitCompareArrows className="h-3 w-3" />
                        本越权触发 Schema 前后差别，查看对比
                        <ArrowRight className="ml-auto h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      {/* FK broken chain tracing */}
      <Panel>
        <SectionTitle
          title="外键断链追踪"
          subtitle="审计组只看报告也能知道卡在哪份材料"
          icon={<Link2Off className="h-4 w-4" />}
          right={
            <span className={cn("chip", broken.length ? "border-rose/40 text-rose-soft" : "border-emerald/40 text-emerald-soft")}>
              {broken.length} 断 / {intact.length} 通
            </span>
          }
        />
        {batch.fkChains.length === 0 ? (
          <EmptyState title="本批次无外键链路" icon={<Link2 className="h-8 w-8" />} />
        ) : (
          <div className="space-y-3">
            {broken.map((f) => {
              const mat = materialById(batch, f.stuckMaterialId);
              return (
                <div key={f.id} className="rounded-lg border border-rose/30 bg-rose/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <Link2Off className="h-4 w-4 text-rose" />
                    <span className="num text-[12px] font-semibold text-zinc-100">{f.id}</span>
                    <span className="chip border-rose/40 text-rose-soft">断裂</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 font-mono text-[12px]">
                    <span className="text-zinc-200">{f.from}</span>
                    <span className="text-ink-600">@</span>
                    <span className="text-amber-soft">{f.fromDb}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-rose" />
                    <span className="text-zinc-200">{f.to}</span>
                    <span className="text-ink-600">@</span>
                    <span className="text-amber-soft">{f.toDb}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{f.detail}</p>

                  <div className="mt-3 rounded-md border border-line bg-ink-900/60 p-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                      <FileSearch className="h-3 w-3" /> 卡在哪份材料上
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {mat && <MaterialChip kind={mat.kind} name={mat.name} />}
                      <span className="chip text-amber-soft border-amber/30">{f.evidenceLine}</span>
                      <Link to="/routes" className="ml-auto flex items-center gap-1 chip border-sky/30 text-sky-soft hover:bg-sky/10">
                        查看路由依据 <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                    <div className="mt-1.5 font-mono text-[10px] text-ink-500">
                      材料口径：{mat?.caliber}
                    </div>
                  </div>
                </div>
              );
            })}

            {intact.length > 0 && (
              <div className="rounded-lg border border-line bg-ink-850/40 p-3">
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                  <Link2 className="h-3 w-3 text-emerald" /> 完整链路（对照）
                </div>
                <div className="space-y-1.5">
                  {intact.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-zinc-300">{f.from}</span>
                      <span className="text-ink-600">@{f.fromDb}</span>
                      <ArrowRight className="h-3 w-3 text-emerald" />
                      <span className="text-zinc-300">{f.to}</span>
                      <span className="text-ink-600">@{f.toDb}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-ink-900/40 px-2 py-1.5">
      <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ink-600">
        {icon} {label}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-zinc-200">{value}</div>
    </div>
  );
}
