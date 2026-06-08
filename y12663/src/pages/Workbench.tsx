import { useRef } from "react";
import SceneCanvas from "@/components/scene/SceneCanvas";
import GameControls from "@/components/ui/GameControls";
import SectionList from "@/components/ui/SectionList";
import ConclusionPanel from "@/components/ui/ConclusionPanel";
import { useGameStore } from "@/store/gameStore";
import { useDataStore } from "@/store/dataStore";
import { exportViewportScreenshot } from "@/services/screenshotService";
import type { SunlightDataset } from "@/types";
import { Layers, Sun, Box } from "lucide-react";

export default function Workbench() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedPlaneId = useGameStore((s) => s.selectedPlaneId);
  const planes = useDataStore((s) => s.planes);
  const datasets = useDataStore((s) => s.datasets);
  const activeDatasetId = useDataStore((s) => s.activeDatasetId);
  const addDataset = useDataStore((s) => s.addDataset);
  const incrementStat = useGameStore((s) => s.incrementStat);
  const pushLog = useGameStore((s) => s.pushLog);
  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const selectedPlane = planes.find((p) => p.id === selectedPlaneId);

  const handleImport = (
    candidate: Omit<SunlightDataset, "id" | "importedAt">,
  ) => {
    const ds = addDataset(candidate);
    incrementStat("totalRecords");
    pushLog({
      type: "import",
      targetId: ds.id,
      detail: { fileName: ds.fileName, buildingName: ds.buildingName },
      cameraSnapshot: {
        position: [55, 50, 70],
        target: [0, 5, 0],
      },
    });
  };

  const handleExportScreenshot = () => {
    const name = exportViewportScreenshot({
      canvas: canvasRef.current ?? undefined,
      buildingName: activeDataset?.buildingName,
      planeIndex: selectedPlane?.index,
    });
    if (name) {
      incrementStat("exportedCount");
      pushLog({
        type: "export_screenshot",
        targetId: selectedPlaneId ?? "viewport",
        detail: { fileName: name },
        cameraSnapshot: {
          position: [55, 50, 70],
          target: [0, 5, 0],
        },
      });
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col p-3 md:p-4 gap-3 z-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-400/30 to-cool-400/30 border border-white/15 flex items-center justify-center shadow-glow">
            <Sun size={20} className="text-lime-400" />
          </div>
          <div>
            <div className="text-base md:text-lg font-bold tracking-wide">
              教学楼日照体块盒
            </div>
            <div className="text-[11px] text-zinc-400 font-mono-app">
              Section · Sunlight · Block Inspector
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Box size={12} className="text-cool-400" /> 体块 {useDataStore.getState().blocks.length}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers size={12} className="text-lime-400" /> 剖面 {planes.length}
          </span>
        </div>
      </header>

      <GameControls
        onImportRequest={handleImport}
        onExportScreenshot={handleExportScreenshot}
      />

      <div
        ref={wrapRef}
        className="flex-1 min-h-0 grid gap-3"
        style={{
          gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr) minmax(300px, 380px)",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <SectionList />
        </div>

        <div className="glass-card p-2 min-h-0 overflow-hidden relative">
          <SceneCanvas canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>} />
          <div className="absolute bottom-3 left-3 text-[10px] font-mono-app text-zinc-400/80 bg-black/30 px-2 py-1 rounded-md border border-white/10">
            拖拽旋转 · 滚轮缩放 · 点击剖切面可选中
          </div>
          {activeDataset && (
            <div className="absolute top-3 left-3 text-[10px] font-mono-app text-zinc-300 bg-black/30 px-2 py-1 rounded-md border border-white/10">
              当前数据集：{activeDataset.buildingName}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-hidden">
          <ConclusionPanel />
        </div>
      </div>
    </div>
  );
}
