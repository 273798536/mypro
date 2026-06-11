import { useEffect } from "react";
import { useSceneStore } from "../hooks/useSceneStore";
import ShowcaseScene from "../components/scene/ShowcaseScene";
import ObjectPropertyPanel from "../components/panels/ObjectPropertyPanel";
import MaterialPanel from "../components/panels/MaterialPanel";
import FilterBar from "../components/filters/FilterBar";
import TimeSlider from "../components/timeline/TimeSlider";
import ScreenshotOverlay from "../components/overlay/ScreenshotOverlay";
import PendingConfirmModal from "../components/overlay/PendingConfirmModal";
import { AlertTriangle, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReviewWorkbench() {
  const {
    pendingConfirms,
    setShowPendingModal,
    showPendingModal,
    selectedObjectId,
    lightObjects,
  } = useSceneStore();

  useEffect(() => {
    if (!showPendingModal) {
      const unresolved = pendingConfirms.find((pc) => !pc.resolved);
      if (unresolved) {
        const timer = setTimeout(() => {
          setShowPendingModal(true, unresolved.id);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pendingConfirms, showPendingModal, setShowPendingModal]);

  const pendingCount = pendingConfirms.filter((pc) => !pc.resolved).length;
  const currentLight = lightObjects.find((l) => l.id === selectedObjectId);

  return (
    <div className="h-screen flex flex-col bg-[#0E0E1A] text-zinc-200 overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 bg-[#12121E] border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-serif text-zinc-100 tracking-wide">
            博物馆展柜灯光空间复核
          </h1>
          <span className="text-[10px] text-zinc-600 border border-zinc-700/40 rounded px-1.5 py-0.5">
            复核工作台
          </span>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={() => {
                const unresolved = pendingConfirms.find((pc) => !pc.resolved);
                if (unresolved) setShowPendingModal(true, unresolved.id);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/20 border border-amber-700/40 rounded text-[11px] text-amber-400 hover:bg-amber-900/30 transition-colors"
            >
              <AlertTriangle size={12} />
              {pendingCount} 项待确认
            </button>
          )}
          <Link
            to="/timeline"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700/40 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <LinkIcon size={12} />
            历史时间线
          </Link>
        </div>
      </header>

      <FilterBar />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <ShowcaseScene />
          <ScreenshotOverlay />

          {currentLight && (
            <div className="absolute bottom-4 left-4 bg-[#1A1A2E]/90 backdrop-blur-sm border border-zinc-700/40 rounded px-3 py-2 z-10">
              <p className="text-[10px] text-zinc-500">当前选中</p>
              <p className="text-sm text-copper font-medium">{currentLight.name}</p>
            </div>
          )}
        </div>

        <aside className="w-[320px] border-l border-zinc-800/60 bg-[#12121E] flex flex-col min-h-0">
          <div className="border-b border-zinc-800/40">
            <ObjectPropertyPanel />
          </div>
          <div className="flex-1 min-h-0">
            <MaterialPanel />
          </div>
        </aside>
      </div>

      <TimeSlider />
      <PendingConfirmModal />
    </div>
  );
}
