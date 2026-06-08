import { useMemo, useState } from "react";
import { Layers, Eye, AlertTriangle, CheckCircle, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDataStore } from "@/store/dataStore";
import { useGameStore } from "@/store/gameStore";
import type { SectionPlane, SectionStatus } from "@/types";
import { formatTimestamp } from "@/utils/format";

const statusMeta: Record<
  SectionStatus,
  { label: string; cls: string; dot: string; Icon: LucideIcon }
> = {
  normal: {
    label: "正常",
    cls: "bg-cool-400/15 text-cool-400 border-cool-400/30",
    dot: "bg-cool-400",
    Icon: Circle,
  },
  overrun: {
    label: "越界",
    cls: "bg-alert-400/15 text-alert-400 border-alert-400/40",
    dot: "bg-alert-400 animate-pulse",
    Icon: AlertTriangle,
  },
  resolved: {
    label: "已修正",
    cls: "bg-lime-400/15 text-lime-400 border-lime-400/40",
    dot: "bg-lime-400",
    Icon: CheckCircle,
  },
};

interface SectionCardProps {
  plane: SectionPlane;
  isSelected: boolean;
  onSelect: () => void;
}

function SectionCard({ plane, isSelected, onSelect }: SectionCardProps) {
  const meta = statusMeta[plane.status];
  const { Icon } = meta;
  const conclusion = useDataStore((s) => s.getPlaneConclusion(plane.id));

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-3 transition-all border ${
        isSelected
          ? "bg-white/10 border-lime-400/40 shadow-glow"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-cool-400 border border-white/10">
            <Layers size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              剖面 {plane.index}-{plane.index}
            </div>
            <div className="text-[10px] font-mono-app text-zinc-500">
              {plane.normalAxis} = {plane.position.toFixed(1)}m
            </div>
          </div>
        </div>
        <span className={`badge border ${meta.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {plane.overrunNote && (
        <div className="text-[11px] text-alert-300/90 bg-alert-400/10 rounded-lg px-2 py-1.5 mb-2 border border-alert-400/20">
          <Icon size={11} className="inline -mt-0.5 mr-1" />
          {plane.overrunNote}
        </div>
      )}
      {plane.resolutionNote && (
        <div className="text-[11px] text-lime-300/90 bg-lime-400/10 rounded-lg px-2 py-1.5 mb-2 border border-lime-400/20">
          <CheckCircle size={11} className="inline -mt-0.5 mr-1" />
          {plane.resolutionNote}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] font-mono-app text-zinc-500">
        <span>
          {conclusion ? `结论：${conclusion.content.slice(0, 24)}…` : "暂无结论"}
        </span>
        <Eye size={12} className={isSelected ? "text-lime-400" : ""} />
      </div>
    </button>
  );
}

export default function SectionList() {
  const planes = useDataStore((s) => s.planes);
  const activeDatasetId = useDataStore((s) => s.activeDatasetId);
  const datasets = useDataStore((s) => s.datasets);
  const selectedPlaneId = useGameStore((s) => s.selectedPlaneId);
  const selectPlane = useGameStore((s) => s.selectPlane);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);

  const [filter, setFilter] = useState<"all" | SectionStatus>("all");

  const visible = useMemo(
    () =>
      planes
        .filter((p) => !activeDatasetId || p.datasetId === activeDatasetId)
        .filter((p) => filter === "all" || p.status === filter)
        .sort((a, b) => a.index - b.index),
    [planes, activeDatasetId, filter],
  );

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);

  const handleSelect = (plane: SectionPlane) => {
    selectPlane(plane.id === selectedPlaneId ? null : plane.id);
    if (plane.id !== selectedPlaneId) {
      const target =
        plane.normalAxis === "X"
          ? ([plane.position, 7.5, 0] as [number, number, number])
          : plane.normalAxis === "Y"
            ? ([0, plane.position, 0] as [number, number, number])
            : ([0, 7.5, plane.position] as [number, number, number]);
      setCameraFocus({
        position: [target[0] + 28, target[1] + 20, target[2] + 32],
        target,
      });
    }
  };

  const counts = useMemo(() => {
    const base = planes.filter(
      (p) => !activeDatasetId || p.datasetId === activeDatasetId,
    );
    return {
      all: base.length,
      normal: base.filter((p) => p.status === "normal").length,
      overrun: base.filter((p) => p.status === "overrun").length,
      resolved: base.filter((p) => p.status === "resolved").length,
    };
  }, [planes, activeDatasetId]);

  return (
    <div className="glass-card p-3 md:p-4 flex flex-col h-full min-h-0">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Layers size={14} className="text-cool-400" /> 剖切面列表
          </div>
          <span className="text-[10px] font-mono-app text-zinc-500">
            共 {counts.all} 条
          </span>
        </div>
        {activeDataset && (
          <div className="text-[11px] text-zinc-400 mb-2">
            {activeDataset.buildingName} · {activeDataset.fileName}
            <div className="text-[10px] text-zinc-500 font-mono-app">
              导入 {formatTimestamp(activeDataset.importedAt)}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "全部", counts.all],
              ["overrun", "越界", counts.overrun],
              ["resolved", "已修正", counts.resolved],
              ["normal", "正常", counts.normal],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              onClick={() => setFilter(key as "all" | SectionStatus)}
              className={`text-[11px] px-2 py-1 rounded-lg border transition ${
                filter === key
                  ? "bg-lime-400/15 border-lime-400/40 text-lime-400"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label} <span className="opacity-60">({n})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divider-soft mb-3" />

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
        {visible.length === 0 && (
          <div className="text-center text-xs text-zinc-500 py-8">
            该筛选下无剖面记录
          </div>
        )}
        {visible.map((p) => (
          <SectionCard
            key={p.id}
            plane={p}
            isSelected={selectedPlaneId === p.id}
            onSelect={() => handleSelect(p)}
          />
        ))}
      </div>
    </div>
  );
}
