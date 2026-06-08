import {
  Database,
  Clock,
  User,
  Wrench,
  FileCheck,
  ChevronRight,
  Layers,
} from "lucide-react";
import type { SectionPlane } from "@/types";
import { useDataStore } from "@/store/dataStore";
import { useGameStore } from "@/store/gameStore";
import { formatTimestamp } from "@/utils/format";

interface TraceChainViewProps {
  planeId?: string | null;
}

export default function TraceChainView({ planeId }: TraceChainViewProps) {
  const selectedPlaneId = useGameStore((s) => s.selectedPlaneId);
  const planes = useDataStore((s) => s.planes);
  const datasets = useDataStore((s) => s.datasets);
  const conclusions = useDataStore((s) => s.conclusions);
  const traceChains = useDataStore((s) => s.traceChains);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);
  const selectPlane = useGameStore((s) => s.selectPlane);

  const activeId = planeId ?? selectedPlaneId;

  const targetChains = activeId
    ? traceChains.filter((t) => t.planeId === activeId)
    : traceChains;

  const stepNodes = [
    { key: "dataset", label: "来源数据", Icon: Database, color: "text-cool-400" },
    { key: "import", label: "导入时间", Icon: Clock, color: "text-cool-400" },
    { key: "operator", label: "操作人", Icon: User, color: "text-zinc-300" },
    { key: "action", label: "修正动作", Icon: Wrench, color: "text-lime-400" },
    { key: "conclusion", label: "最终结论", Icon: FileCheck, color: "text-lime-400" },
  ];

  const handleJump = (plane: SectionPlane) => {
    selectPlane(plane.id);
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
  };

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Layers size={14} className="text-alert-400" /> 剖切面追溯链路
        </div>
        <span className="text-[11px] font-mono-app text-zinc-500">
          可倒查：从结论一路回到来源
        </span>
      </div>

      {targetChains.length === 0 && (
        <div className="text-center py-6 text-xs text-zinc-500">
          当前剖切面暂无追溯记录。在工作台标记越界或已修正后，将自动生成链路。
        </div>
      )}

      <div className="space-y-5">
        {targetChains.map((chain) => {
          const plane = planes.find((p) => p.id === chain.planeId);
          const ds = datasets.find((d) => d.id === chain.sourceDataset);
          const conclusion = conclusions.find((c) => c.id === chain.conclusionId);
          if (!plane) return null;

          const values = {
            dataset: ds ? `${ds.fileName} · ${ds.buildingName}` : "未知来源",
            import: formatTimestamp(chain.importTime),
            operator: chain.operatorName,
            action: chain.correctionAction,
            conclusion: conclusion
              ? conclusion.content.slice(0, 60) + (conclusion.content.length > 60 ? "…" : "")
              : "（尚未生成结论）",
          };

          return (
            <div key={chain.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleJump(plane)}
                  className="text-left group"
                >
                  <div className="text-sm font-semibold text-zinc-100 group-hover:text-lime-400 transition">
                    剖面 {plane.index}-{plane.index}
                    <span className="ml-2 text-[10px] font-mono-app text-zinc-500 group-hover:text-lime-400">
                      → 回跳三维视图
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-app text-zinc-500">
                    {plane.normalAxis} = {plane.position.toFixed(1)}m
                  </div>
                </button>
              </div>

              <div className="flex flex-col md:flex-row items-stretch gap-0">
                {stepNodes.map((node, i) => (
                  <div key={node.key} className="flex-1 flex items-stretch gap-0">
                    <div
                      className={`flex-1 rounded-xl border border-white/10 bg-white/5 p-3 relative ${
                        i === stepNodes.length - 1 ? "border-lime-400/30 bg-lime-400/5" : ""
                      }`}
                    >
                      <div
                        className={`text-[10px] font-mono-app flex items-center gap-1 mb-1 ${node.color}`}
                      >
                        <node.Icon size={10} /> {node.label}
                      </div>
                      <div className="text-[11px] text-zinc-200 leading-relaxed">
                        {values[node.key as keyof typeof values]}
                      </div>
                    </div>
                    {i < stepNodes.length - 1 && (
                      <div className="hidden md:flex items-center px-1">
                        <ChevronRight size={16} className="text-zinc-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
