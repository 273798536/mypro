import { useEffect, useRef } from 'react';
import { Camera as CameraIcon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import FlowFieldScene from '@/components/three/FlowFieldScene';
import ViewpointToolbar from '@/components/ui/ViewpointToolbar';
import DataImportPanel from '@/components/ui/DataImportPanel';
import TraceabilityPanel from '@/components/ui/TraceabilityPanel';
import TimeSlider, { ConclusionList } from '@/components/ui/TimeSlider';
import ScreenshotExportModal from '@/components/ui/ScreenshotExportModal';
import { useDataStore } from '@/store/useDataStore';
import { useViewStore } from '@/store/useViewStore';
import { useExportStore } from '@/store/useExportStore';
import { canvasToDataUrl } from '@/utils/screenshot';

export default function RenderView() {
  const loadMock = useDataStore((s) => s.loadMockData);
  const loadViewpoints = useViewStore((s) => s.loadInitialViewpoints);
  const loadConclusions = useExportStore((s) => s.loadInitialConclusions);
  const loadExports = useExportStore((s) => s.loadExports);
  const openExport = useExportStore((s) => s.openExportModal);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const sceneWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMock();
    loadViewpoints();
    loadConclusions();
    loadExports();
  }, [loadMock, loadViewpoints, loadConclusions, loadExports]);

  const takeScreenshot = () => {
    const canvas = sceneWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvasToDataUrl(canvas);
    openExport(url);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-row relative">
        <aside
          className={`shrink-0 flex flex-col gap-3 p-3 transition-all duration-300 overflow-hidden ${
            leftOpen ? 'w-80' : 'w-0 p-0'
          }`}
        >
          <DataImportPanel />
          <TraceabilityPanel />
        </aside>

        <button
          className="absolute top-1/2 -translate-y-1/2 z-10 panel-ocean p-1.5 text-slate-400 hover:text-data-cyan transition-colors"
          style={{ left: leftOpen ? 312 : 0 }}
          onClick={() => setLeftOpen(!leftOpen)}
          title={leftOpen ? '收起左侧面板' : '展开左侧面板'}
        >
          {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <main className="flex-1 min-w-0 relative bg-ocean-950">
          <ViewpointToolbar />
          <div ref={sceneWrapRef} className="absolute inset-0">
            <FlowFieldScene />
          </div>

          <button
            onClick={takeScreenshot}
            className="absolute bottom-4 right-4 btn-ocean-primary flex items-center gap-1.5 shadow-glow-cyan z-10"
            title="截图导出"
          >
            <CameraIcon className="w-4 h-4" />
            <span>截图导出</span>
          </button>

          <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 z-10 text-right leading-relaxed">
            <div>左键拖动：旋转</div>
            <div>滚轮：缩放</div>
            <div>点击粒子：选中 / 溯源</div>
          </div>
        </main>

        <button
          className="absolute top-1/2 -translate-y-1/2 z-10 panel-ocean p-1.5 text-slate-400 hover:text-data-cyan transition-colors"
          style={{ right: rightOpen ? 312 : 0 }}
          onClick={() => setRightOpen(!rightOpen)}
          title={rightOpen ? '收起右侧面板' : '展开右侧面板'}
        >
          {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>

        <aside
          className={`shrink-0 flex flex-col gap-3 p-3 transition-all duration-300 overflow-hidden ${
            rightOpen ? 'w-80' : 'w-0 p-0'
          }`}
        >
          <ConclusionList />
        </aside>
      </div>

      <div className="shrink-0 p-3">
        <TimeSlider />
      </div>

      <ScreenshotExportModal />
    </div>
  );
}
