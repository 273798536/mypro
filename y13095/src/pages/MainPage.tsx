import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DetailPanel } from '@/components/layout/DetailPanel';
import { MapCanvas } from '@/components/map/MapCanvas';
import { OrphanList } from '@/components/orphan/OrphanList';
import { usePointStore } from '@/store/usePointStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useViewStore } from '@/store/useViewStore';
import { usePresetStore } from '@/store/usePresetStore';
import { useOrphanStore } from '@/store/useOrphanStore';
import { mockCorridors } from '@/data/mockData';
import type { Point } from '@/types';
import { useViewportSize } from '@/hooks/useViewportSize';

export default function MainPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(true);
  const [showOrphan, setShowOrphan] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const { loadPoints, points, selectedPointId, setSelectedPoint } = usePointStore();
  const { loadHistory } = useHistoryStore();
  const { loadView, viewCondition, setCenter, setZoom } = useViewStore();
  const { loadPresets } = usePresetStore();
  const { loadScreenshots } = useOrphanStore();

  const { width, height } = useViewportSize();

  useEffect(() => {
    loadPoints();
    loadHistory();
    loadView();
    loadPresets();
    loadScreenshots();

    const guideSeen = localStorage.getItem('low_altitude_corridor_guide_seen');
    if (!guideSeen) {
      setTimeout(() => {
        setShowGuide(true);
        localStorage.setItem('low_altitude_corridor_guide_seen', 'true');
      }, 500);
    }
  }, [loadPoints, loadHistory, loadView, loadPresets, loadScreenshots]);

  const handlePointClick = useCallback((point: Point) => {
    setSelectedPoint(point.id);
    setDetailOpen(true);
  }, [setSelectedPoint]);

  const handleViewChange = useCallback((centerLng: number, centerLat: number, zoom: number) => {
    setCenter(centerLng, centerLat);
    setZoom(zoom);
  }, [setCenter, setZoom]);

  const handleZoomIn = () => {
    setZoom(viewCondition.zoom + 0.5);
  };

  const handleZoomOut = () => {
    setZoom(viewCondition.zoom - 0.5);
  };

  const handleResetView = () => {
    setCenter(116.4200, 39.9300);
    setZoom(3.5);
  };

  const canvasWidth = width - (sidebarOpen ? 288 : 0) - (detailOpen ? 320 : 0);
  const canvasHeight = height - 56;

  return (
    <div className="h-screen flex flex-col bg-space-950 text-space-100 overflow-hidden">
      <Header onShowOrphan={() => setShowOrphan(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-space-800 hover:bg-space-700 p-1.5 rounded-r-lg border border-l-0 border-space-600 text-space-400 hover:text-space-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div className="flex-1 relative">
          <MapCanvas
            width={Math.max(canvasWidth, 400)}
            height={Math.max(canvasHeight, 300)}
            viewCondition={viewCondition}
            points={points}
            corridors={mockCorridors}
            selectedPointId={selectedPointId}
            onPointClick={handlePointClick}
            onViewChange={handleViewChange}
          />

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 bg-space-800/90 hover:bg-space-700 backdrop-blur-sm border border-space-600 rounded-lg flex items-center justify-center text-space-300 hover:text-space-100 transition-colors btn-hover"
              title="放大"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 bg-space-800/90 hover:bg-space-700 backdrop-blur-sm border border-space-600 rounded-lg flex items-center justify-center text-space-300 hover:text-space-100 transition-colors btn-hover"
              title="缩小"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={handleResetView}
              className="w-9 h-9 bg-space-800/90 hover:bg-space-700 backdrop-blur-sm border border-space-600 rounded-lg flex items-center justify-center text-space-300 hover:text-space-100 transition-colors btn-hover"
              title="重置视图"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 bg-space-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-space-600 text-[10px] text-space-400 font-mono">
            中心: {viewCondition.centerLng.toFixed(4)}, {viewCondition.centerLat.toFixed(4)} | 缩放: ×{viewCondition.zoom.toFixed(1)}
          </div>

          <div className="absolute top-4 right-4 bg-space-800/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-space-600">
            <div className="text-[10px] text-space-400 mb-1.5">图例</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-aviation-green" />
                <span className="text-[10px] text-space-300">正常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-aviation-red animate-pulse" />
                <span className="text-[10px] text-space-300">异常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-aviation-orange" />
                <span className="text-[10px] text-space-300">待复核</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                <span className="text-[10px] text-space-300">未检查</span>
              </div>
            </div>
          </div>
        </div>

        {!detailOpen && (
          <button
            onClick={() => setDetailOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-space-800 hover:bg-space-700 p-1.5 rounded-l-lg border border-r-0 border-space-600 text-space-400 hover:text-space-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <DetailPanel isOpen={detailOpen} onToggle={() => setDetailOpen(!detailOpen)} />
      </div>

      <OrphanList isOpen={showOrphan} onClose={() => setShowOrphan(false)} />
    </div>
  );
}
