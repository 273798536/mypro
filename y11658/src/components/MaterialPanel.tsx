import { ChevronDown, FileSignature, History, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { Coil, Rail, Spreader, Task, Zone } from "@/types";
import { useMaterialStore } from "@/store/materialStore";

function diffSummary(item: { audit: { diff?: { field: string; from: unknown; to: unknown }[]; time: string; source: string; strategy: string }[] }) {
  const last = item.audit[item.audit.length - 1];
  if (!last) return "—";
  if (last.diff && last.diff.length > 0) {
    return last.diff
      .slice(0, 3)
      .map((d) => `${d.field}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`)
      .join("；");
  }
  return `来源 ${last.source}，策略 ${last.strategy}`;
}

export default function MaterialPanel() {
  const coils = useMaterialStore((s) => s.coils);
  const spreaders = useMaterialStore((s) => s.spreaders);
  const rails = useMaterialStore((s) => s.rails);
  const zones = useMaterialStore((s) => s.zones);
  const tasks = useMaterialStore((s) => s.tasks);
  const [tab, setTab] = useState<"coil" | "spreader" | "rail" | "zone" | "task">("coil");

  const tabs: { key: typeof tab; label: string; icon: typeof FileSignature }[] = [
    { key: "coil", label: "钢卷", icon: FileSignature },
    { key: "spreader", label: "吊具", icon: Plus },
    { key: "rail", label: "轨道", icon: History },
    { key: "zone", label: "作业区", icon: RefreshCw },
    { key: "task", label: "任务", icon: ChevronDown },
  ];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const renderCoils = () => (
    <Section title={`钢卷 (${coils.length})`}>
      <div className="grid gap-3">
        {coils.map((c: Coil) => (
          <div key={c.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">{c.name}</div>
              <div className="text-[11px] text-slate-500">{c.id}</div>
            </div>
            <div className="mt-1 text-slate-400">
              重量 {c.weight}t · 长 {c.length}m · 直径 {c.diameter}m · 重心 ({c.cog.x}, {c.cog.y})
            </div>
            <div className="mt-2 text-[11px] text-amber-300/80">最近修正：{diffSummary(c)}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  const renderSpreaders = () => (
    <Section title={`吊具 (${spreaders.length})`}>
      <div className="grid gap-3">
        {spreaders.map((s: Spreader) => (
          <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">{s.name}</div>
              <div className="text-[11px] text-slate-500">{s.id}</div>
            </div>
            <div className="mt-1 text-slate-400">
              载重 {s.capacity}t · 重心允许偏移 {s.offsetLimit}m
            </div>
            <div className="mt-2 text-[11px] text-amber-300/80">最近修正：{diffSummary(s)}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  const renderRails = () => (
    <Section title={`行车轨道 (${rails.length})`}>
      <div className="grid gap-3">
        {rails.map((r: Rail) => (
          <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">{r.name}</div>
              <div className="text-[11px] text-slate-500">{r.id}</div>
            </div>
            <div className="mt-1 text-slate-400">
              点数 {r.points.length} · 载重 {r.capacity}t
            </div>
            <div className="mt-2 text-[11px] text-amber-300/80">最近修正：{diffSummary(r)}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  const renderZones = () => (
    <Section title={`作业区 (${zones.length})`}>
      <div className="grid gap-3">
        {zones.map((z: Zone) => (
          <div key={z.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">{z.name}</div>
              <div
                className={
                  "rounded px-2 py-0.5 text-[11px] " +
                  (z.type === "danger"
                    ? "bg-rose-500/20 text-rose-300"
                    : z.type === "restricted"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300")
                }
              >
                {z.type}
              </div>
            </div>
            <div className="mt-1 text-slate-400">顶点 {z.polygon.length} 个</div>
            <div className="mt-2 text-[11px] text-amber-300/80">最近修正：{diffSummary(z)}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  const renderTasks = () => (
    <Section title={`任务 (${tasks.length})`}>
      <div className="grid gap-3">
        {tasks.map((t: Task) => (
          <div key={t.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-100">{t.name}</div>
              <div className="text-[11px] text-slate-500">{t.id}</div>
            </div>
            <div className="mt-1 text-slate-400">
              钢卷 {t.coilId} · 吊具 {t.spreaderId} · 轨道 {t.railId}
            </div>
            <div className="mt-2 text-[11px] text-amber-300/80">最近修正：{diffSummary(t)}</div>
          </div>
        ))}
      </div>
    </Section>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition " +
              (tab === t.key
                ? "bg-amber-500/15 text-amber-300"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800")
            }
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "coil" && renderCoils()}
      {tab === "spreader" && renderSpreaders()}
      {tab === "rail" && renderRails()}
      {tab === "zone" && renderZones()}
      {tab === "task" && renderTasks()}
    </div>
  );
}
