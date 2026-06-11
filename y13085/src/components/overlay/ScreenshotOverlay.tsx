import { useCallback } from "react";
import { useSceneStore } from "../../hooks/useSceneStore";
import type { Viewpoint } from "../../data/types";
import { Camera, Download, RotateCcw } from "lucide-react";

export default function ScreenshotOverlay() {
  const { viewpoints, addViewpoint, removeViewpoint, setSelectedObjectId, setFilterState, selectedObjectId, filterState } = useSceneStore();

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const thumbnailUrl = canvas.toDataURL("image/png");

    const vp: Viewpoint = {
      id: `vp-${Date.now()}`,
      name: `截图 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
      cameraPosition: [0, 6, 10],
      cameraTarget: [0, 1, 0],
      zoom: 1,
      selectedObjectId,
      filterState: { ...filterState },
      savedAt: new Date().toISOString(),
      thumbnailUrl,
    };

    addViewpoint(vp);
  }, [selectedObjectId, filterState, addViewpoint]);

  const handleRestore = useCallback(
    (vp: Viewpoint) => {
      if (vp.selectedObjectId) {
        setSelectedObjectId(vp.selectedObjectId);
      }
      if (vp.filterState) {
        setFilterState(vp.filterState);
      }
    },
    [setSelectedObjectId, setFilterState]
  );

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
      <button
        onClick={handleScreenshot}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A2E]/90 border border-copper/40 rounded text-xs text-copper hover:bg-copper/10 transition-colors backdrop-blur-sm"
        title="保存当前视角截图"
      >
        <Camera size={13} />
        截图
      </button>

      {viewpoints.length > 0 && (
        <div className="bg-[#1A1A2E]/90 border border-zinc-700/40 rounded backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-1.5 border-b border-zinc-800/40">
            <span className="text-[10px] text-zinc-500">已保存视角</span>
          </div>
          {viewpoints.map((vp) => (
            <div
              key={vp.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800/40 cursor-pointer transition-colors"
              onClick={() => handleRestore(vp)}
            >
              <img
                src={vp.thumbnailUrl}
                alt={vp.name}
                className="w-10 h-7 rounded object-cover border border-zinc-700/30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-300 truncate">{vp.name}</p>
                <p className="text-[9px] text-zinc-600">
                  {vp.savedAt.slice(11, 16)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeViewpoint(vp.id);
                }}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <RotateCcw size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
