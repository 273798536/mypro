import { Trash2, Layers, Clock, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useViewStore } from "@/stores/viewStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useFilterStore } from "@/stores/filterStore";
import type { ViewSnapshot } from "@/shared/types";

function fmt(d: number) {
  return new Date(d).toLocaleString("zh-CN", { hour12: false });
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function SnapshotGrid() {
  const navigate = useNavigate();
  const snapshots = useViewStore((s) => s.snapshots);
  const deleteSnapshot = useViewStore((s) => s.deleteSnapshot);
  const setPendingRestoreSnapshotId = useViewStore(
    (s) => s.setPendingRestoreSnapshotId
  );
  const seek = usePlaybackStore((s) => s.seek);
  const setFilters = useFilterStore((s) => s.setFilters);
  const selectObject = useFilterStore((s) => s.selectObject);

  const applySnapshot = (snap: ViewSnapshot) => {
    seek(snap.timestamp);
    setFilters(snap.filters);
    selectObject(snap.selectedObjectId ?? null);
    setPendingRestoreSnapshotId(snap.id);
    navigate("/");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[15px] text-silver-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cable-400" />
          视图快照
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-silver-500 font-mono flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            点击卡片将跳回工作台并恢复相机视角
          </span>
          <span className="text-[11px] text-silver-400 font-mono">
            {snapshots.length} 条记录
          </span>
        </div>
      </div>
      {snapshots.length === 0 ? (
        <div className="text-center text-silver-400 text-[12px] py-12 font-mono glass rounded-lg border border-mine-700/40">
          暂无保存的视图快照
          <div className="text-[10px] mt-1 text-silver-500">
            在工作台右上角点击"保存视图"可记录当前相机、筛选与时间点
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="group relative glass rounded-lg border border-mine-700/50 overflow-hidden hover:border-cable-500/40 transition cursor-pointer"
              onClick={() => applySnapshot(snap)}
            >
              <div className="aspect-video bg-gradient-to-br from-mine-800 to-mine-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-cable-500/20 border border-cable-500/40 flex items-center justify-center shadow-glow-cable">
                    <Layers className="w-5 h-5 text-cable-400" />
                  </div>
                </div>
                <div className="absolute inset-0 scan-bg pointer-events-none" />
              </div>
              <div className="p-2.5">
                <div className="text-[12px] text-silver-200 font-mono truncate">
                  {snap.name}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-silver-400 font-mono">
                  <Clock className="w-3 h-3" />
                  {fmtTime(snap.timestamp)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {snap.filters.floors.map((f) => (
                    <span
                      key={f}
                      className="px-1 py-0.5 rounded text-[9px] bg-mine-700/70 text-silver-300 font-mono"
                    >
                      {f}
                    </span>
                  ))}
                  {snap.filters.types.map((t) => (
                    <span
                      key={t}
                      className="px-1 py-0.5 rounded text-[9px] bg-mine-700/70 text-silver-300 font-mono"
                    >
                      {t}
                    </span>
                  ))}
                  {snap.selectedObjectId && (
                    <span className="px-1 py-0.5 rounded text-[9px] bg-cable-500/20 text-cable-300 border border-cable-500/30 font-mono">
                      选中
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-silver-500 font-mono mt-1">
                  {fmt(snap.createdAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSnapshot(snap.id);
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded bg-mine-900/70 border border-mine-600 text-silver-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-cable-400 hover:border-cable-500/40 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
