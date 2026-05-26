import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Scene } from '@/components/three/Scene';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { AnomalyList } from '@/components/ui/AnomalyList';
import { DataPointInfo } from '@/components/ui/DataPointInfo';
import { useAppStore, useFilteredDataPoints } from '@/store/useAppStore';
import type { ProcessedDataPoint } from '@/types';
import {
  Layers,
  MousePointer2,
  ZoomIn,
  RotateCcw,
  X,
} from 'lucide-react';

const Home = () => {
  const {
    dataPoints,
    hoveredPoint,
    selectedPoint,
    setHoveredPoint,
    setSelectedPoint,
    loadMockData,
    isLoading,
  } = useAppStore();
  const filteredPoints = useFilteredDataPoints();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const handlePointHover = (point: ProcessedDataPoint | null) => {
    setHoveredPoint(point);
    setShowTooltip(!!point);
  };

  const handlePointClick = (point: ProcessedDataPoint) => {
    setSelectedPoint(point.id === selectedPoint?.id ? null : point);
  };

  return (
    <div id="app-container" className="h-screen w-screen flex flex-col bg-[#0A1628] overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 p-4 space-y-4 overflow-y-auto border-r border-slate-800">
          <FilterPanel />
          
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <Layers size={16} className="text-cyan-400" />
              图例说明
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-400">正常数据点</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-slate-400">警告级异常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-slate-400">错误级异常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-400">严重级异常</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
              <MousePointer2 size={16} className="text-cyan-400" />
              操作提示
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <RotateCcw size={12} />
                <span>左键拖拽 - 旋转视角</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomIn size={12} />
                <span>滚轮 - 缩放</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointer2 size={12} />
                <span>点击数据点 - 查看详情</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">加载数据中...</p>
              </div>
            </div>
          ) : dataPoints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Layers size={32} className="text-slate-600" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  暂无数据
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  点击顶部"加载示例数据"按钮查看波动率曲面演示
                </p>
              </div>
            </div>
          ) : (
            <>
              <Scene
                dataPoints={filteredPoints}
                hoveredPoint={hoveredPoint}
                selectedPoint={selectedPoint}
                onPointHover={handlePointHover}
                onPointClick={handlePointClick}
              />

              {showTooltip && hoveredPoint && (
                <div
                  className="absolute pointer-events-none z-10 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl"
                  style={{
                    left: '50%',
                    bottom: '20px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">到期日:</span>
                      <span className="text-white ml-1">{hoveredPoint.expirationDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">执行价:</span>
                      <span className="text-white ml-1">{hoveredPoint.strikePrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">波动率:</span>
                      <span className="text-cyan-400 font-medium ml-1">
                        {(hoveredPoint.impliedVolatility * 100).toFixed(2)}%
                      </span>
                    </div>
                    {hoveredPoint.anomalies.length > 0 && (
                      <div className="px-2 py-0.5 bg-rose-950 text-rose-400 rounded text-xs">
                        {hoveredPoint.anomalies.length} 个异常
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 text-xs text-slate-500 bg-slate-900/80 px-3 py-2 rounded-lg">
                显示 {filteredPoints.length} / {dataPoints.length} 个数据点
              </div>
            </>
          )}
        </div>

        <div className="w-80 p-4 space-y-4 overflow-y-auto border-l border-slate-800">
          {selectedPoint ? (
            <DataPointInfo
              point={selectedPoint}
              onClose={() => setSelectedPoint(null)}
            />
          ) : (
            <div className="bg-slate-800/50 rounded-lg border border-dashed border-slate-700 p-6 text-center">
              <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <MousePointer2 size={20} className="text-slate-500" />
              </div>
              <p className="text-sm text-slate-500">点击数据点查看详细信息</p>
            </div>
          )}

          <AnomalyList />

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">坐标轴</span>
              <button
                onClick={() => {}}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                重置
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-cyan-500" />
                  <span className="text-slate-400">X轴 - 到期日</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500" />
                  <span className="text-slate-400">Y轴 - 波动率</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-pink-500" />
                  <span className="text-slate-400">Z轴 - 执行价</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTooltip && hoveredPoint && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-2 shadow-2xl flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              {hoveredPoint.expirationDate} | K={hoveredPoint.strikePrice}
            </span>
            <span className="text-cyan-400 font-bold">
              {(hoveredPoint.impliedVolatility * 100).toFixed(2)}%
            </span>
            {hoveredPoint.anomalies.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-950 text-rose-400 rounded text-xs">
                异常
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
