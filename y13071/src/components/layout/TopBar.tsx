import { Camera, History, ClipboardCheck, User, Mountain } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useFilterStore } from "@/stores/filterStore";
import { useViewStore } from "@/stores/viewStore";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useCameraSync } from "@/hooks/useCameraSync";

interface Props {
  cameraSync: ReturnType<typeof useCameraSync>;
  onOpenAnnotation: () => void;
}

export function TopBar({ cameraSync, onOpenAnnotation }: Props) {
  const loc = useLocation();
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp);
  const filters = useFilterStore((s) => s.filters);
  const selectedObjectId = useFilterStore((s) => s.selectedObjectId);
  const saveSnapshot = useViewStore((s) => s.saveSnapshot);
  const addHistory = useAnnotationStore((s) => s.addHistory);

  const navClass = (p: string) =>
    loc.pathname === p
      ? "text-cable-400 border-b-2 border-cable-500"
      : "text-silver-300 hover:text-cable-300";

  const handleSaveView = () => {
    const snap = saveSnapshot({
      name: `视图 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
      timestamp: currentTimestamp,
      camera: cameraSync.getCameraState(),
      filters,
      selectedObjectId: selectedObjectId ?? undefined,
    });
    addHistory("SAVE_VIEW", snap.id, "阿乔");
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-30 glass border-b border-mine-700/60">
      <div className="flex items-center justify-between px-5 h-14">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-cable-500/20 flex items-center justify-center shadow-glow-cable">
            <Mountain className="w-5 h-5 text-cable-400" />
          </div>
          <div>
            <div className="font-display font-semibold text-silver-200 tracking-wide text-[15px]">
              山地索道站时序回放
            </div>
            <div className="text-[10px] text-silver-400 font-mono -mt-0.5">
              CABLEWAY · TIMELINE REVIEW
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 font-display text-[13px]">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded transition ${navClass("/")}`}
          >
            工作台
          </Link>
          <Link
            to="/history"
            className={`px-3 py-1.5 rounded transition ${navClass("/history")}`}
          >
            视图与历史
          </Link>
          <Link
            to="/review"
            className={`px-3 py-1.5 rounded transition ${navClass("/review")}`}
          >
            材料审核
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAnnotation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] border border-mine-600 text-silver-300 hover:bg-mine-700/60 hover:text-cable-300 transition font-mono"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            评审批注
          </button>
          <button
            onClick={handleSaveView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] bg-cable-500/15 border border-cable-500/40 text-cable-300 hover:bg-cable-500/25 shadow-glow-cable transition font-mono"
          >
            <Camera className="w-3.5 h-3.5" />
            保存视图
          </button>
          <Link
            to="/history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] border border-mine-600 text-silver-300 hover:bg-mine-700/60 hover:text-cable-300 transition font-mono"
          >
            <History className="w-3.5 h-3.5" />
            历史
          </Link>
          <div className="w-8 h-8 rounded-full bg-mine-700 border border-mine-600 flex items-center justify-center">
            <User className="w-4 h-4 text-silver-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
