import React, { useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { LeftPanel } from '@/components/layout/LeftPanel';
import { RightPanel } from '@/components/layout/RightPanel';
import { BottomBar } from '@/components/layout/BottomBar';
import { MapCanvas } from '@/components/canvas/MapCanvas';
import { MaterialViewer } from '@/components/material/MaterialViewer';
import { ReplayModal } from '@/components/replay/ReplayModal';
import { ReportModal } from '@/components/report/ReportModal';
import { useAppStore } from '@/store/useAppStore';
import { useActionLog } from '@/hooks/useActionLog';
import { Point } from '@/types';

export const AuditGame: React.FC = () => {
  const { addPoint, gameStatus, selectedMaterialId } = useAppStore();
  const { undo, redo } = useActionLog();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      if (e.key === 'Escape') {
        if (selectedMaterialId) {
          useAppStore.getState().selectMaterial(null);
        }
      }

      if (e.key === ' ' && gameStatus === 'playing') {
        e.preventDefault();
        useAppStore.getState().pauseGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedMaterialId, gameStatus]);

  const handleCanvasMark = (point: Point) => {
    addPoint(point);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-100 overflow-hidden">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedMaterialId && gameStatus === 'playing' && (
            <div className="bg-accent/10 px-4 py-2 border-b border-accent/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent font-medium">📍</span>
                <span>已选中素材，点击地图进行标记</span>
                <span className="text-xs text-neutral-500 ml-2">
                  （按 ESC 取消选择）
                </span>
              </div>
              <button
                onClick={() => useAppStore.getState().selectMaterial(null)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                取消选择
              </button>
            </div>
          )}
          
          <MapCanvas onMark={handleCanvasMark} />
        </div>
        
        <RightPanel />
      </div>
      
      <BottomBar />

      <MaterialViewer />
      <ReplayModal />
      <ReportModal />
    </div>
  );
};
