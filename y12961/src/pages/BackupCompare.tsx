import {
  DatabaseBackup,
  FileWarning,
  ArrowRight,
  User,
  Clock,
  GitCompareArrows,
  CircleDot,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import { useCheckStore } from "@/store/useCheckStore";
import { backupChanged } from "@/data/selectors";
import { Panel, SectionTitle, EmptyState } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { BackupVersion } from "@/data/types";

function fmtTime(iso: string) {
  return iso.replace("T", " ").replace(/\+08:00$/, "");
}

export default function BackupCompare() {
  const { batch } = useCheckStore();
  const { old: o, new: n } = batch.backupVersions;
  const changed = backupChanged(batch);
  const bad = batch.badData;

  return (
    <div className="space-y-4">
      <Panel className={cn(changed && "scan")}>
        <SectionTitle
          title="备份记录新旧结论并排"
          subtitle="别让安全审计员猜影响范围 · 旧结论 vs 新结论"
          icon={<DatabaseBackup className="h-4 w-4" />}
          right={
            changed ? (
              <span className="chip border-amber/40 text-amber-soft">
                <CircleAlert className="h-2.5 w-2.5" /> 结论已修订
              </span>
            ) : (
              <span className="chip border-emerald/40 text-emerald-soft">
                <CheckCircle2 className="h-2.5 w-2.5" /> 本批次未变更
              </span>
            )
          }
        />

        {changed ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <VersionCard v={o} tone="old" />
            <VersionCard v={n} tone="new" />
          </div>
        ) : (
          <EmptyState
            title="本批次备份结论未变更"
            hint={`${o.changedBy} 于 ${fmtTime(o.changedAt)} 生成，新旧结论一致。`}
            icon={<CheckCircle2 className="h-8 w-8" />}
          />
        )}
      </Panel>

      {/* Impact scope diff */}
      {changed && (
        <Panel>
          <SectionTitle
            title="影响范围变化"
            subtitle="旧影响范围 → 新影响范围，并排看清楚"
            icon={<GitCompareArrows className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ImpactList title="旧结论影响范围" items={o.impact} tone="old" />
            <ImpactList title="新结论影响范围" items={n.impact} tone="new" />
          </div>
        </Panel>
      )}

      {/* Bad data sample */}
      {bad ? (
        <Panel className="border-amber/30">
          <SectionTitle
            title="真实坏数据样例"
            subtitle="围着备份记录这条线 · 像平时材料里混进来的小麻烦"
            icon={<FileWarning className="h-4 w-4" />}
            right={<span className="chip border-amber/40 text-amber-soft">{bad.rowId}</span>}
          />
          <div className="overflow-hidden rounded-lg border border-amber/20 bg-amber/[0.03]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
              <Cell label="期望（口径基准）" value={bad.expected} tone="emerald" />
              <div className="flex items-center justify-center border-y border-line md:border-y-0 md:border-x">
                <ArrowRight className="h-5 w-5 text-amber" />
              </div>
              <Cell label="实际（材料里混进来的）" value={bad.actual} tone="rose" />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line md:grid-cols-4">
              <Meta label="表" value={bad.table} />
              <Meta label="字段" value={bad.field} />
              <Meta label="坏值" value={bad.value} />
              <Meta label="来源行" value={bad.rowId} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-ink-850/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-soft">
                <FileWarning className="h-3 w-3" /> 为什么像小麻烦
              </div>
              <p className="text-[12px] leading-relaxed text-zinc-300">{bad.reason}</p>
            </div>
            <div className="rounded-lg border border-amber/20 bg-amber/[0.04] p-3 stripes">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-soft">
                <CircleDot className="h-3 w-3" /> 看起来像
              </div>
              <p className="text-[12px] leading-relaxed text-zinc-200">{bad.looksLike}</p>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function VersionCard({ v, tone }: { v: BackupVersion; tone: "old" | "new" }) {
  const isNew = tone === "new";
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5",
        isNew ? "border-sky/30 bg-sky/[0.03]" : "border-line bg-ink-850/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 font-mono text-[11px] font-semibold", isNew ? "text-sky-soft" : "text-ink-500")}>
          {isNew ? "新结论" : "旧结论"}
          <ArrowRight className={cn("h-3 w-3", isNew ? "text-sky" : "text-ink-600")} />
        </span>
        <SeverityBadge severity={v.severity} />
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-100">{v.conclusion}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-mono text-ink-500">
          <User className="h-3 w-3" /> {v.changedBy}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-ink-500">
          <Clock className="h-3 w-3" /> {fmtTime(v.changedAt)}
        </div>
      </div>
      <div className="mt-2.5 rounded-md border border-line bg-ink-900/50 p-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-600">修订理由</div>
        <p className="mt-0.5 text-[11px] text-ink-500">{v.rationale}</p>
      </div>
    </div>
  );
}

function ImpactList({ title, items, tone }: { title: string; items: string[]; tone: "old" | "new" }) {
  const isNew = tone === "new";
  return (
    <div className={cn("rounded-lg border p-3", isNew ? "border-sky/20 bg-sky/[0.03]" : "border-line bg-ink-850/40")}>
      <div className={cn("mb-2 font-mono text-[10px] uppercase tracking-wider", isNew ? "text-sky-soft" : "text-ink-500")}>
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", isNew ? "bg-sky" : "bg-rose")} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" }) {
  const t = tone === "emerald" ? "text-emerald-soft" : "text-rose-soft";
  return (
    <div className="p-3.5">
      <div className={cn("mb-1 font-mono text-[10px] uppercase tracking-wider", t)}>{label}</div>
      <div className={cn("num text-[13px] font-medium", t)}>{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900/60 p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-ink-600">{label}</div>
      <div className="mt-0.5 font-mono text-[11px] text-zinc-300">{value}</div>
    </div>
  );
}
