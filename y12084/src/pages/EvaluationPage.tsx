import { useState, useCallback } from 'react';
import TopToolbar from '@/components/layout/TopToolbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import FilterBar from '@/components/panels/FilterBar';
import Scene3D from '@/components/three/Scene3D';
import DataMergeModal from '@/components/modals/DataMergeModal';
import ViewpointModal from '@/components/modals/ViewpointModal';
import ReportModal from '@/components/modals/ReportModal';
import { useAppStore } from '@/store/useAppStore';
import { AlertTriangle, MousePointer, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function EvaluationPage() {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([80, 60, 80]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const isDataMerged = useAppStore(state => state.isDataMerged);
  const { saveViewpoint, toggleViewpointModal } = useAppStore(state => state.actions);

  const handleCameraChange = useCallback((position: [number, number, number], target: [number, number, number]) => {
    setCameraPosition(position);
    setCameraTarget(target);
  }, []);

  const handleSaveViewpoint = useCallback(() => {
    const name = `视角 ${Date.now()}`;
    saveViewpoint(name, cameraPosition, cameraTarget);
  }, [saveViewpoint, cameraPosition, cameraTarget]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900">
      <TopToolbar
        onSaveViewpoint={handleSaveViewpoint}
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
      />

      {!isDataMerged && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-400">
            ⚠️ 建筑体块与风向玫瑰数据存在冲突，需要人工确认后才能进行完整的风廊评估。
            <button
              onClick={() => useAppStore.getState().actions.toggleDataMergeModal(true)}
              className="ml-2 px-2 py-0.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs rounded transition-colors"
            >
              立即处理
            </button>
          </p>
        </div>
      )}

      <FilterBar />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />

        <div className="flex-1 relative">
          <Scene3D onCameraChange={handleCameraChange} />

          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <MousePointer size={12} className="text-cyan-400" />
                <span>左键旋转</span>
              </div>
              <div className="flex items-center gap-1">
                <ZoomIn size={12} className="text-cyan-400" />
                <span>滚轮缩放</span>
              </div>
              <div className="flex items-center gap-1">
                <RotateCcw size={12} className="text-cyan-400" />
                <span>右键平移</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-mono text-slate-400">
            <div>相机: ({cameraPosition.map(v => v.toFixed(1)).join(', ')})</div>
            <div>目标: ({cameraTarget.map(v => v.toFixed(1)).join(', ')})</div>
          </div>
        </div>

        <RightSidebar />
      </div>

      <DataMergeModal />
      <ViewpointModal />
      <ReportModal />
    </div>
  );
}
