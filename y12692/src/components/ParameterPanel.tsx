import { useState } from "react";
import { ChevronDown, ChevronRight, Play, RotateCcw } from "lucide-react";
import { useLatticeStore } from "@/store/useLatticeStore";
import type { BatchRecord, LatticeParameters } from "@/types";
import { defaultParameters } from "@/utils/sampleData";
import { cn } from "@/lib/utils";

type ParamGroupKey = "lattice" | "angles" | "layers" | "offset";

const GROUPS: {
  key: ParamGroupKey;
  title: string;
  fields: { key: keyof LatticeParameters; label: string; unit: string; step: number; min?: number; max?: number }[];
}[] = [
  {
    key: "lattice",
    title: "晶格常数",
    fields: [
      { key: "a", label: "a", unit: "Å", step: 0.05, min: 1 },
      { key: "b", label: "b", unit: "Å", step: 0.05, min: 1 },
      { key: "c", label: "c", unit: "Å", step: 0.05, min: 1 },
    ],
  },
  {
    key: "angles",
    title: "晶轴夹角",
    fields: [
      { key: "alpha", label: "α", unit: "°", step: 1, min: 30, max: 150 },
      { key: "beta", label: "β", unit: "°", step: 1, min: 30, max: 150 },
      { key: "gamma", label: "γ", unit: "°", step: 1, min: 30, max: 150 },
    ],
  },
  {
    key: "layers",
    title: "堆叠层数",
    fields: [
      { key: "layersX", label: "X", unit: "层", step: 1, min: 1, max: 8 },
      { key: "layersY", label: "Y", unit: "层", step: 1, min: 1, max: 8 },
      { key: "layersZ", label: "Z", unit: "层", step: 1, min: 1, max: 8 },
    ],
  },
  {
    key: "offset",
    title: "偏移量",
    fields: [
      { key: "offsetX", label: "X", unit: "Å", step: 0.1 },
      { key: "offsetY", label: "Y", unit: "Å", step: 0.1 },
      { key: "offsetZ", label: "Z", unit: "Å", step: 0.1 },
    ],
  },
];

function NumField({
  value,
  step,
  min,
  max,
  onChange,
}: {
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          const next = Math.max(min ?? -Infinity, value - step);
          onChange(Number(next.toFixed(3)));
        }}
        className="h-6 w-5 rounded-sm border border-ink-500/50 text-ink-100 hover:bg-ink-500/40"
      >
        −
      </button>
      <input
        type="number"
        className="num-input h-7 text-center"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
      <button
        type="button"
        onClick={() => {
          const next = Math.min(max ?? Infinity, value + step);
          onChange(Number(next.toFixed(3)));
        }}
        className="h-6 w-5 rounded-sm border border-ink-500/50 text-ink-100 hover:bg-ink-500/40"
      >
        +
      </button>
    </div>
  );
}

function ParamGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-ink-500/25">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-mono uppercase tracking-widest text-ink-100 hover:bg-ink-600/30"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="grid grid-cols-1 gap-2 px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export default function ParameterPanel({ batch }: { batch: BatchRecord }) {
  const updateParameter = useLatticeStore((s) => s.updateParameter);
  const updateMaterialName = useLatticeStore((s) => s.updateMaterialName);
  const runDetection = useLatticeStore((s) => s.runDetection);
  const newBatch = useLatticeStore((s) => s.newBatch);
  const loadSample = useLatticeStore((s) => s.loadSample);

  const [open, setOpen] = useState<Record<ParamGroupKey, boolean>>({
    lattice: true,
    angles: false,
    layers: true,
    offset: true,
  });

  return (
    <aside className="panel flex h-full w-80 flex-col shrink-0 overflow-hidden animate-fade-in">
      <div className="panel-header">
        <div>
          <div className="section-title text-base">参数联动面板</div>
          <div className="label mt-0.5">所有修改记入同批次记录 · 与碰撞检测共用</div>
        </div>
        <span className="chip border-lattice/40 text-lattice">{batch.batchId}</span>
      </div>

      <div className="px-3 pt-3">
        <label className="label block">材料名称</label>
        <input
          className="num-input mt-1"
          value={batch.materialName}
          onChange={(e) => updateMaterialName(e.target.value)}
        />
      </div>

      <div className="mt-2 flex-1 overflow-y-auto">
        {GROUPS.map((g) => (
          <ParamGroup
            key={g.key}
            title={g.title}
            open={open[g.key]}
            onToggle={() => setOpen((s) => ({ ...s, [g.key]: !s[g.key] }))}
          >
            {g.fields.map((f) => (
              <div
                key={f.key}
                className="grid grid-cols-[54px_1fr_44px] items-center gap-2"
              >
                <span className="font-mono text-sm text-ink-50">{f.label}</span>
                <NumField
                  value={batch.parameters[f.key] as number}
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  onChange={(v) => updateParameter(f.key, v as never)}
                />
                <span className="text-right text-[11px] font-mono text-ink-200/70">
                  {f.unit}
                </span>
              </div>
            ))}
          </ParamGroup>
        ))}
      </div>

      <div className="space-y-2 border-t border-ink-500/25 p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={runDetection}
            className="btn-primary flex items-center justify-center gap-1"
          >
            <Play size={12} />
            运行碰撞检测
          </button>
          <button
            type="button"
            onClick={() => {
              Object.keys(defaultParameters).forEach((k) =>
                updateParameter(
                  k as keyof LatticeParameters,
                  defaultParameters[k as keyof LatticeParameters] as never,
                  "重置为默认参数",
                ),
              );
            }}
            className="btn-ghost flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} />
            重置参数
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={newBatch}
            className="btn-ghost"
          >
            新建空白批次
          </button>
          <button
            type="button"
            onClick={loadSample}
            className={cn(
              "btn",
              "border-lattice/60 text-lattice hover:bg-lattice/10",
            )}
          >
            加载 NaCl 示例
          </button>
        </div>
        <div className="pt-1 text-center text-[10px] font-mono text-ink-200/50">
          运行时间 {new Date(batch.runTimestamp).toLocaleString("zh-CN")}
        </div>
      </div>
    </aside>
  );
}
