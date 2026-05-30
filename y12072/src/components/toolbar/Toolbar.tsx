import { useState } from 'react';
import { FileText, RotateCcw, Maximize, Minimize, HelpCircle, Disc3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { FilterPanel } from './FilterPanel';
import { ViewManager } from './ViewManager';
import { FINGER_TYPE_COLORS } from '../../utils/colorScheme';
import { FINGER_TYPES } from '../../types';

export function Toolbar() {
  const navigate = useNavigate();
  const [showLegend, setShowLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const loadData = useAppStore(state => state.loadData);
  const filters = useAppStore(state => state.filters);
  const totalDuration = useAppStore(state => state.totalDuration);
  const setFilters = useAppStore(state => state.setFilters);
  const spacePoints = useAppStore(state => state.spacePoints);
  const filteredPoints = spacePoints.filter(point => {
    if (filters.fingerTypes.length > 0 && !filters.fingerTypes.includes(point.fingerType)) return false;
    const pointTime = point.y / 100 * totalDuration;
    if (pointTime < filters.timeRange[0] || pointTime > filters.timeRange[1]) return false;
    return true;
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const resetView = () => {
    setFilters({
      timeRange: [0, totalDuration],
      fingerTypes: [],
      frequencyRange: [0, 20000],
      quality: [],
      searchKeyword: ''
    });
    loadData();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-[#121218]/90 backdrop-blur-md border-b border-[#3A3A4A]">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Disc3 size={24} className="text-[#8B2323]" />
            <div>
              <h1 className="text-[#F5F0E6] font-bold text-sm" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                古琴声腔空间图
              </h1>
              <p className="text-[#A0A0A0] text-xs">
                显示 {filteredPoints.length} / {spacePoints.length} 个数据点
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FilterPanel />
          <ViewManager />
          
          <div className="relative">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E1E2A] hover:bg-[#2A2A3A] border border-[#3A3A4A] rounded transition-colors"
            >
              <HelpCircle size={16} className="text-[#F5F0E6]" />
              <span className="text-[#F5F0E6] text-sm">图例</span>
            </button>

            {showLegend && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E1E2A] border border-[#3A3A4A] rounded-lg shadow-xl z-50 p-3">
                <h4 className="text-[#F5F0E6] text-sm font-medium mb-2">指法类型配色</h4>
                <div className="grid grid-cols-2 gap-1">
                  {FINGER_TYPES.map(type => (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: FINGER_TYPE_COLORS[type] }}
                      />
                      <span className="text-[#A0A0A0]">{type}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#3A3A4A]">
                  <h4 className="text-[#F5F0E6] text-sm font-medium mb-2">坐标轴说明</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded" style={{ backgroundColor: '#8B2323' }} />
                      <span className="text-[#A0A0A0]">X轴 - 指法类型</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded" style={{ backgroundColor: '#27AE60' }} />
                      <span className="text-[#A0A0A0]">Y轴 - 时间</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded" style={{ backgroundColor: '#1A5276' }} />
                      <span className="text-[#A0A0A0]">Z轴 - 频段</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetView}
            className="p-2 bg-[#1E1E2A] hover:bg-[#2A2A3A] border border-[#3A3A4A] rounded transition-colors"
            title="重置视图"
          >
            <RotateCcw size={16} className="text-[#F5F0E6]" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-[#1E1E2A] hover:bg-[#2A2A3A] border border-[#3A3A4A] rounded transition-colors"
            title="全屏"
          >
            {isFullscreen ? (
              <Minimize size={16} className="text-[#F5F0E6]" />
            ) : (
              <Maximize size={16} className="text-[#F5F0E6]" />
            )}
          </button>

          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-3 py-2 bg-[#8B2323] hover:bg-[#A52A2A] rounded transition-colors"
          >
            <FileText size={16} className="text-white" />
            <span className="text-white text-sm">分析报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
