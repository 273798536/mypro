import { useEffect, useState, useRef } from "react";
import { CablewayScene } from "@/components/three/CablewayScene";
import { TopBar } from "@/components/layout/TopBar";
import { FilterPanel } from "@/components/layout/FilterPanel";
import { AnomalyQueue } from "@/components/layout/AnomalyQueue";
import { Timeline } from "@/components/playback/Timeline";
import { AnnotationDrawer } from "@/components/annotation/AnnotationDrawer";
import { useFilterStore } from "@/stores/filterStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useViewStore } from "@/stores/viewStore";
import { useCameraSync } from "@/hooks/useCameraSync";
import { Mountain, Info, Layers, CheckCircle2, X } from "lucide-react";
import { cablewayObjects } from "@/utils/mockData";
import { timestampStates } from "@/utils/mockData";
import type { ObjectStatus, ViewSnapshot } from "@/shared/types";

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function lookupStatus(objectId: string, ts: number): ObjectStatus {
  const states = timestampStates.filter((s) => s.objectId === objectId);
  if (states.length === 0) return "NORMAL";
  states.sort((a, b) => a.timestamp - b.timestamp);
  let found = states[0];
  for (const s of states) {
    if (s.timestamp <= ts) found = s;
    else break;
  }
  return found.status;
}

export default function Workbench() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [restoreToast, setRestoreToast] = useState<ViewSnapshot | null>(null);
  const cameraSync = useCameraSync();
  const selectedObjectId = useFilterStore((s) => s.selectedObjectId);
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp);
  const snapshots = useViewStore((s) => s.snapshots);
  const pendingRestoreSnapshotId = useViewStore(
    (s) => s.pendingRestoreSnapshotId
  );
  const setPendingRestoreSnapshotId = useViewStore(
    (s) => s.setPendingRestoreSnapshotId
  );
  const attemptRef = useRef(0);

  const selected = selectedObjectId
    ? cablewayObjects.find((o) => o.id === selectedObjectId)
    : null;
  const status = selected ? lookupStatus(selected.id, currentTimestamp) : null;

  const STATUS_META: Record<ObjectStatus, { label: string; cls: string }> = {
    NORMAL: { label: "运行正常", cls: "bg-pass-500/15 text-pass-400 border-pass-500/30" },
    WARNING: { label: "指标逼近", cls: "bg-fix-500/15 text-fix-400 border-fix-500/30" },
    ERROR: { label: "参数超限", cls: "bg-cable-500/15 text-cable-400 border-cable-500/30" },
  };

  useEffect(() => {
    if (!pendingRestoreSnapshotId) return;
    const target = snapshots.find((s) => s.id === pendingRestoreSnapshotId);
    if (!target) {
      setPendingRestoreSnapshotId(null);
      return;
    }

    let cancelled = false;
    attemptRef.current = 0;

    const tryRestore = () => {
      if (cancelled) return;
      attemptRef.current += 1;
      const controls = cameraSync.controlsRef?.current;
      if (controls && typeof controls.target?.set === "function") {
        cameraSync.restore(target.camera);
        setRestoreToast(target);
        setPendingRestoreSnapshotId(null);
        setTimeout(() => {
          if (!cancelled) setRestoreToast(null);
        }, 3500);
      } else if (attemptRef.current < 40) {
        setTimeout(tryRestore, 60);
      } else {
        setPendingRestoreSnapshotId(null);
      }
    };
    tryRestore();

    return () => {
      cancelled = true;
    };
  }, [pendingRestoreSnapshotId, snapshots, cameraSync, setPendingRestoreSnapshotId]);

  return (
    <div className="w-full h-full relative overflow-hidden scan-bg">
      <CablewayScene cameraSync={cameraSync} />
      <TopBar cameraSync={cameraSync} onOpenAnnotation={() => setDrawerOpen(true)} />
      <FilterPanel />
      <AnomalyQueue cameraSync={cameraSync} />
      <Timeline />

      {restoreToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 glass rounded-lg border border-pass-500/40 bg-pass-500/10 px-4 py-2.5 flex items-center gap-3 shadow-glow-cable animate-float-up">
          <CheckCircle2 className="w-4 h-4 text-pass-400 flex-shrink-0" />
          <div className="text-[12px] font-mono text-silver-200">
            已恢复视图快照：<span className="text-pass-300">{restoreToast.name}</span>
            <span className="text-silver-400 ml-2">@ {formatTime(restoreToast.timestamp)}</span>
          </div>
          <button
            onClick={() => setRestoreToast(null)}
            className="ml-2 w-5 h-5 rounded hover:bg-mine-700/60 text-silver-400 hover:text-silver-200 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selected && status && (
        <div className="absolute left-72 top-20 z-20 glass rounded-lg border border-mine-700/60 p-3 w-64 animate-float-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-cable-500/15 border border-cable-500/40 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-cable-400" />
            </div>
            <div>
              <div className="text-[13px] text-silver-200 font-display">{selected.name}</div>
              <div className="text-[10px] text-silver-400 font-mono">{selected.type}</div>
            </div>
            <span
              className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono border ${STATUS_META[status].cls}`}
            >
              {STATUS_META[status].label}
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-silver-400">楼层</span>
              <span className="text-silver-200">{selected.floor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-400">单位</span>
              <span className="text-silver-200">{selected.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-400">坐标</span>
              <span className="text-silver-200">
                {selected.position.map((n) => n.toFixed(1)).join(", ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-400">回放时刻</span>
              <span className="text-silver-200">{formatTime(currentTimestamp)}</span>
            </div>
          </div>
          <div className="flex gap-1 mt-3 pt-2 border-t border-mine-700/50">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] bg-mine-700/50 border border-mine-600 text-silver-300 hover:text-cable-300 hover:border-cable-500/40 font-mono transition"
            >
              <Info className="w-3 h-3" />
              添加批注
            </button>
            <button
              onClick={() => cameraSync.flyTo(selected.position, 10)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] bg-mine-700/50 border border-mine-600 text-silver-300 hover:text-cable-300 hover:border-cable-500/40 font-mono transition"
            >
              <Layers className="w-3 h-3" />
              对焦
            </button>
          </div>
        </div>
      )}

      <AnnotationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
