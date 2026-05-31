import { useState, useEffect } from 'react';
import { ParameterPanel } from '../components/workbench/ParameterPanel';
import { InfoPanel } from '../components/workbench/InfoPanel';
import { TerminalLog } from '../components/workbench/TerminalLog';
import { RiskSurfaceCanvas } from '../components/3d/RiskSurfaceCanvas';
import { useAppStore } from '../store/useAppStore';
import type { SurfacePoint } from '../types';
import { Plus, Target } from 'lucide-react';

export function WorkbenchPage() {
  const {
    holdings,
    analysisResult,
    analysisParams,
    annotations,
    highlightedRegion,
    selectedBondId,
    runAnalysis,
    addAnnotation,
    removeAnnotation,
    setSelectedBond,
    appendTerminalLog
  } = useAppStore();

  const [selectedPoint, setSelectedPoint] = useState<SurfacePoint | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');

  useEffect(() => {
    if (!analysisResult) {
      runAnalysis();
    }
  }, [analysisResult, runAnalysis]);

  const handlePointClick = (point: SurfacePoint) => {
    setSelectedPoint(point);
    if (point.bondIds.length > 0) {
      setSelectedBond(point.bondIds[0]);
    }
    
    appendTerminalLog({
      level: 'info',
      message: `选中曲面点: 久期${point.x.toFixed(2)}年, 收益率${point.y.toFixed(2)}%, 风险值${point.z.toFixed(2)}`
    });
  };

  const handleAddAnnotation = () => {
    if (!selectedPoint || !annotationContent.trim() || !analysisResult) return;
    
    addAnnotation({
      analysisId: analysisResult.analysisId,
      type: 'manual_note',
      x: selectedPoint.x,
      y: selectedPoint.y,
      z: selectedPoint.z,
      content: annotationContent,
      createdBy: '当前用户'
    });
    
    setAnnotationContent('');
    setShowAnnotationModal(false);
    
    appendTerminalLog({
      level: 'success',
      message: `已添加标注: ${annotationContent}`
    });
  };

  const defaultBounds = {
    xMin: analysisParams.durationRange[0],
    xMax: analysisParams.durationRange[1],
    yMin: analysisParams.yieldRange[0],
    yMax: analysisParams.yieldRange[1],
    zMin: 0,
    zMax: 10
  };

  const bounds = analysisResult?.surfaceData.length
    ? {
        xMin: Math.min(...analysisResult.surfaceData.flat().map(p => p.x)),
        xMax: Math.max(...analysisResult.surfaceData.flat().map(p => p.x)),
        yMin: Math.min(...analysisResult.surfaceData.flat().map(p => p.y)),
        yMax: Math.max(...analysisResult.surfaceData.flat().map(p => p.y)),
        zMin: Math.min(...analysisResult.surfaceData.flat().map(p => p.z)),
        zMax: Math.max(...analysisResult.surfaceData.flat().map(p => p.z))
      }
    : defaultBounds;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <ParameterPanel />
        
        <div className="flex-1 flex flex-col relative bg-gradient-to-b from-slate-900 to-slate-950">
          {analysisResult ? (
            <>
              <RiskSurfaceCanvas
                surfaceData={analysisResult.surfaceData}
                bounds={bounds}
                holdings={holdings}
                annotations={annotations}
                highlightedRegion={highlightedRegion}
                onPointClick={handlePointClick}
                onAnnotationRemove={removeAnnotation}
                selectedBondId={selectedBondId}
              />
              
              {selectedPoint && (
                <div className="absolute top-4 left-4 bg-slate-900/95 border border-slate-700 rounded-lg p-4 backdrop-blur-sm shadow-xl max-w-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Target size={14} className="text-blue-400" />
                      选中区域
                    </div>
                    <button
                      onClick={() => setShowAnnotationModal(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                    >
                      <Plus size={12} />
                      标注
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">久期 (X轴)</span>
                      <span className="text-blue-400 font-mono">{selectedPoint.x.toFixed(2)}年</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">收益率 (Y轴)</span>
                      <span className="text-emerald-400 font-mono">{selectedPoint.y.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">风险值 (Z轴)</span>
                      <span className="text-amber-400 font-mono">{selectedPoint.z.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">关联债券</span>
                      <span className="text-slate-200 font-mono">{selectedPoint.bondIds.length}只</span>
                    </div>
                    {selectedPoint.isOutlier && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px]">
                        ⚠ 该区域为异常点，风险值显著偏离
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="mt-3 w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-700 rounded hover:border-slate-600"
                  >
                    关闭
                  </button>
                </div>
              )}

              <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 backdrop-blur-sm">
                <div className="text-[10px] text-slate-500 mb-2">风险值色阶</div>
                <div className="flex items-center gap-1">
                  <div className="w-24 h-3 rounded" style={{
                    background: 'linear-gradient(to right, rgb(30, 64, 175), rgb(120, 53, 15))'
                  }} />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {bounds.zMin.toFixed(1)} - {bounds.zMax.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 backdrop-blur-sm text-xs">
                <div className="text-slate-400 mb-1">操作提示</div>
                <ul className="text-slate-500 space-y-1 text-[10px]">
                  <li>• 拖拽旋转视角</li>
                  <li>• 滚轮缩放</li>
                  <li>• 右键平移</li>
                  <li>• 点击曲面查看详情</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">正在生成风险曲面...</p>
              </div>
            </div>
          )}
        </div>
        
        <InfoPanel />
      </div>
      
      <TerminalLog />

      {showAnnotationModal && selectedPoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">添加标注</h3>
            <div className="mb-4 text-xs text-slate-400">
              位置: 久期{selectedPoint.x.toFixed(2)}年, 收益率{selectedPoint.y.toFixed(2)}%
            </div>
            <textarea
              value={annotationContent}
              onChange={(e) => setAnnotationContent(e.target.value)}
              placeholder="输入标注内容..."
              className="w-full h-32 bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAnnotationModal(false)}
                className="flex-1 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddAnnotation}
                disabled={!annotationContent.trim()}
                className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
