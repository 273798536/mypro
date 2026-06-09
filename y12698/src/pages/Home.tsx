import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import HydrothermalScene from '../components/scene/HydrothermalScene';
import DataPanel from '../components/panels/DataPanel';
import ReviewPanel from '../components/panels/ReviewPanel';
import Toolbar from '../components/toolbar/Toolbar';
import { StatusBar } from '../components/common/StatusBar';
import LegendPanel from '../components/toolbar/LegendToggle';
import ScreenshotExportModal from '../components/modals/ScreenshotExportModal';
import { useDataStore } from '../store/dataStore';
import { useReviewStore } from '../store/reviewStore';
import { useSceneStore } from '../store/sceneStore';
import { useScreenshot } from '../hooks/useScreenshot';

export default function Home() {
  const glRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const initIfEmpty = useDataStore((s) => s.initIfEmpty);
  const showExport = useReviewStore((s) => s.showExportModal);
  const setShowExport = useReviewStore((s) => s.setShowExportModal);
  const { capture } = useScreenshot(glRef);

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  const handleExportClick = () => {
    const current = useDataStore.getState().records;
    const sel = useSceneStore.getState().selectedRecordId;
    const rec = current.find((r) => r.id === sel);
    capture(rec);
    setShowExport(true);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#040810] text-slate-100">
      <Toolbar glRef={glRef} cameraRef={cameraRef} onCaptureClick={handleExportClick} />
      <div className="flex min-h-0 flex-1">
        <DataPanel cameraRef={cameraRef} />
        <main className="relative flex-1">
          <HydrothermalScene glRef={glRef} cameraRef={cameraRef} />
          <LegendPanel />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] text-slate-400">
              <span className="font-mono text-[#00D4AA]">左键拖拽</span> 旋转 ·
              <span className="mx-1 font-mono text-[#00D4AA]">右键拖拽</span> 平移 ·
              <span className="ml-1 font-mono text-[#00D4AA]">滚轮</span> 缩放
            </p>
            <p className="mt-0.5 text-[9px] text-slate-500">
              点击数据点或左侧卡片查看详情；结论中 ⏱ 锚点可回溯
            </p>
          </div>
        </main>
        <ReviewPanel />
      </div>
      <StatusBar />
      {showExport && <ScreenshotExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
