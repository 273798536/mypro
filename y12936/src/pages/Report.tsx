import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileWarning, ArrowUpRight, Pin, ShieldCheck, Layers3 } from "lucide-react";
import { useAppStore, leakIsComplete } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { Gauge } from "@/components/ui/Gauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MATERIAL_META } from "@/lib/domain";
import type { MaterialType, Sample } from "@/types";
import { cn } from "@/lib/utils";

interface StuckGroup {
  material: string;
  type: MaterialType;
  samples: Sample[];
  repeatCount: number;
}

function aggregateStuck(samples: Sample[]): StuckGroup[] {
  const map = new Map<string, StuckGroup>();
  for (const s of samples) {
    if (!s.stuckMaterial) continue;
    const stuckType =
      s.materials.find((m) => m.label === s.stuckMaterial)?.type ?? ("missing_unit" as MaterialType);
    const g = map.get(s.stuckMaterial) ?? {
      material: s.stuckMaterial,
      type: stuckType,
      samples: [],
      repeatCount: 0,
    };
    g.samples.push(s);
    g.repeatCount = Math.max(g.repeatCount, s.stuckCount ?? 1);
    map.set(s.stuckMaterial, g);
  }
  return Array.from(map.values()).sort((a, b) => b.repeatCount - a.repeatCount);
}

export default function Report() {
  const samples = useAppStore((s) => s.samples);
  const leaks = useAppStore((s) => s.leaks);
  const exportReport = useAppStore((s) => s.exportReport);
  const lastExportedAt = useAppStore((s) => s.lastExportedAt);
  const navigate = useNavigate();

  const [toast, setToast] = useState<string | null>(null);

  const overall =
    samples.reduce((acc, s) => acc + Math.max(0, 1 - Math.abs(s.offlineMetric - s.onlineMetric)), 0) /
    Math.max(1, samples.length);

  const stuckGroups = useMemo(() => aggregateStuck(samples), [samples]);
  const aligned = samples.filter((s) => s.status === "clean").length;

  const handleExport = () => {
    const ids = exportReport();
    const version = useAppStore.getState().exportVersion;
    setToast(`已导出报告 #${version}，${ids.length} 条判断改判，可在评测回放查看前后差别。`);
    setTimeout(() => setToast(null), 6000);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="final report · read-only for training group"
        title="报告总览"
        desc="训练组即使只看这份最终报告，也能知道脏样本重复卡在哪份材料上。导出若改判，会自动写入评测回放。"
        right={
          <button onClick={handleExport} className="btn-signal">
            <Download className="h-3.5 w-3.5" />
            导出报告
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl space-y-5">
          {toast && (
            <div className="animate-fade-up flex items-center justify-between gap-3 rounded-md border border-signal-500/30 bg-signal-500/10 px-3 py-2.5">
              <span className="text-xs text-signal-200">{toast}</span>
              <button onClick={() => navigate("/replay")} className="link-soft flex items-center gap-1 text-xs">
                去评测回放 <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          )}

          <section className="panel grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center">
              <Gauge value={overall} label="对齐度" size={116} />
            </div>
            <Stat label="对齐样本" value={aligned} tone="text-signal-300" />
            <Stat label="脏样本" value={samples.filter((s) => s.status === "dirty").length} tone="text-warn-300" />
            <Stat label="泄漏待处理" value={leaks.filter((l) => !leakIsComplete(l)).length} tone="text-danger-300" />
          </section>

          <section className="panel p-4">
            <SectionLabel right={<Pin className="h-3 w-3 text-warn-400" />}>
              脏样本溯源 · 重复卡在哪份材料
            </SectionLabel>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              按材料聚合脏样本，标注历史重复卡住次数——根因材料一目了然。
            </p>
            <div className="mt-3 space-y-2">
              {stuckGroups.map((g) => {
                const meta = MATERIAL_META[g.type];
                return (
                  <div key={g.material} className="panel-tight p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("chip", meta.chip)}>{meta.label}</span>
                        <span className="font-mono text-xs text-ink-200">{g.material}</span>
                      </div>
                      <span className="chip border-warn-400/30 bg-warn-400/10 text-warn-300">
                        重复卡住 ×{g.repeatCount}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.samples.map((s) => (
                        <span key={s.id} className="flex items-center gap-1.5 rounded border border-ink-800 bg-ink-950/40 px-1.5 py-0.5">
                          <span className="font-mono text-[10px] text-ink-300">{s.id}</span>
                          <span className="text-[10px] text-ink-500">{s.group}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {stuckGroups.length === 0 && (
                <div className="rounded-md border border-dashed border-ink-800 px-3 py-4 text-center font-mono text-[11px] text-ink-600">
                  无脏样本卡点
                </div>
              )}
            </div>
          </section>

          <section className="panel p-4">
            <SectionLabel right={<Layers3 className="h-3 w-3 text-ink-600" />}>
              最终判定 · 训练组可读
            </SectionLabel>
            <div className="mt-3 overflow-hidden rounded-lg border border-ink-800">
              <table className="w-full text-left">
                <thead className="bg-ink-850">
                  <tr className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                    <th className="px-3 py-2 font-medium">样本</th>
                    <th className="px-3 py-2 font-medium">分组</th>
                    <th className="px-3 py-2 font-medium">状态</th>
                    <th className="px-3 py-2 font-medium">最终判定</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {samples.map((s) => {
                    const lk = leaks.find((l) => l.sampleId === s.id);
                    const complete = lk ? leakIsComplete(lk) : true;
                    return (
                      <tr key={s.id} className="text-xs hover:bg-ink-850/50">
                        <td className="px-3 py-2 font-mono text-ink-200">{s.id}</td>
                        <td className="px-3 py-2 text-ink-400">{s.group}</td>
                        <td className="px-3 py-2"><StatusBadge status={s.status} size="sm" /></td>
                        <td className="px-3 py-2 text-ink-300">
                          {s.status === "clean" && <span className="text-signal-300">对齐良好</span>}
                          {s.status === "fixed" && <span className="text-info-300">已修正，对齐</span>}
                          {s.status === "dirty" && (
                            <span className="text-warn-300">脏数据，卡在「{s.stuckMaterial}」</span>
                          )}
                          {s.status === "leak" && (
                            <span className={complete ? "text-signal-300" : "text-danger-300"}>
                              泄漏{complete ? "·三件事已齐" : "·三件事未齐"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="panel p-4">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-warn-400" />
                <span className="text-sm text-ink-200">待处理脏样本</span>
              </div>
              <div className="mt-2 font-mono text-2xl text-warn-300">
                {samples.filter((s) => s.status === "dirty").length}
              </div>
              <p className="mt-1 text-[11px] text-ink-500">主要根因：旧表未更新、补录备注被盖过、单位漏填。</p>
            </div>
            <div className="panel p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-signal-300" />
                <span className="text-sm text-ink-200">泄漏处理完成度</span>
              </div>
              <div className="mt-2 font-mono text-2xl text-signal-300">
                {leaks.filter((l) => leakIsComplete(l)).length}/{leaks.length}
              </div>
              <p className="mt-1 text-[11px] text-ink-500">重复运行 / 补录 / 人工确认 三件事做齐方为完成。</p>
            </div>
          </section>

          <div className="pb-2 text-center font-mono text-[10px] text-ink-700">
            {lastExportedAt ? `报告已导出 · ${lastExportedAt}` : "报告尚未导出"} · 训练组只读
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col justify-center border-l border-ink-800 px-2 first:border-l-0">
      <div className="field-label">{label}</div>
      <div className={cn("num mt-1 font-mono text-3xl font-semibold", tone)}>{value}</div>
    </div>
  );
}
