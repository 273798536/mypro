import { useMemo } from 'react';
import Scene3D from '../components/three/Scene3D';
import FilterPanel from '../components/visualization/FilterPanel';
import PointDetailPanel from '../components/visualization/PointDetailPanel';
import ClippingControl from '../components/visualization/ClippingControl';
import { useAppStore } from '../store';
import { SHIP_LIST } from '../types';
import { Maximize2, Minimize2, RotateCcw, MousePointer } from 'lucide-react';
import { useState } from 'react';

const SHIP_COLORS = ['#3E92CC', '#2ECC71', '#F39C12'];

export default function Visualization() {
  const { trackPoints, selectedTrackPoint, filters, viewMode, resetFilters, resetClippingPlanes } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const filteredPoints = useMemo(() => {
    let filtered = [...trackPoints];
    
    if (filters.shipIds.length > 0) {
      filtered = filtered.filter(p => filters.shipIds.includes(p.shipId));
    }
    
    if (filters.timeRange) {
      const [start, end] = filters.timeRange;
      filtered = filtered.filter(p => p.timestamp >= start && p.timestamp <= end);
    }
    
    const [minDepth, maxDepth] = filters.depthRange;
    filtered = filtered.filter(p => p.depth >= minDepth && p.depth <= maxDepth);
    
    if (filters.dataQualities.length > 0) {
      filtered = filtered.filter(p => filters.dataQualities.includes(p.dataQuality));
    }
    
    return filtered;
  }, [trackPoints, filters]);

  const statistics = useMemo(() => {
    const total = filteredPoints.length;
    const anomalies = filteredPoints.filter(p => p.depth < 0).length;
    const ships = new Set(filteredPoints.map(p => p.shipId)).size;
    
    return { total, anomalies, ships };
  }, [filteredPoints]);

  const handleResetView = () => {
    resetFilters();
    resetClippingPlanes();
  };

  return (
    <div className="flex h-screen bg-ocean-gradient bg-grid-pattern bg-grid overflow-hidden">
      <div className="flex-shrink-0">
        <FilterPanel />
      </div>

      <div className="flex-1 relative flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-ocean-950/90 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-ocean-100">3D船舶轨迹可视化</h2>
              <p className="text-xs text-ocean-400 mt-0.5">
                {viewMode === 'marine_affairs' ? '海事处视角' : '安全员视角'} · 
                共 {statistics.total} 个轨迹点 · {statistics.ships} 艘船舶 · 
                {statistics.anomalies > 0 && (
                  <span className="text-data-recollect ml-1">{statistics.anomalies} 个异常点</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 mr-4">
                {SHIP_LIST.map((ship, index) => (
                  <div key={ship.id} className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: SHIP_COLORS[index % SHIP_COLORS.length] }}
                    />
                    <span className="text-xs text-ocean-300">{ship.name}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleResetView}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置视图
              </button>
              
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {isFullscreen ? (
                  <><Minimize2 className="w-3.5 h-3.5" /> 退出全屏</>
                ) : (
                  <><Maximize2 className="w-3.5 h-3.5" /> 全屏</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <Scene3D points={filteredPoints} />
          
          <ClippingControl />
          
          <div className="absolute bottom-4 left-4 z-10">
            <div className="glass-panel p-3 text-xs">
              <div className="flex items-center gap-2 text-ocean-300 mb-2">
                <MousePointer className="w-3.5 h-3.5" />
                <span>操作提示</span>
              </div>
              <div className="space-y-1 text-ocean-400">
                <p>• 左键拖拽旋转视角</p>
                <p>• 滚轮缩放</p>
                <p>• 点击轨迹点查看详情</p>
              </div>
            </div>
          </div>

          {selectedTrackPoint && (
            <div className="absolute bottom-4 right-4 z-10 max-w-xs">
              <div className="glass-panel p-3 text-xs">
                <p className="text-ocean-300 mb-1">已选中</p>
                <p className="text-ocean-100 font-medium">{selectedTrackPoint.shipName}</p>
                <p className="text-ocean-400 font-mono">
                  {selectedTrackPoint.longitude.toFixed(4)}°E, {selectedTrackPoint.latitude.toFixed(4)}°N
                </p>
                <p className={`font-mono ${selectedTrackPoint.depth < 0 ? 'text-data-recollect' : 'text-ocean-300'}`}>
                  深度: {selectedTrackPoint.depth.toFixed(2)}m
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <PointDetailPanel />
      </div>
    </div>
  );
}
