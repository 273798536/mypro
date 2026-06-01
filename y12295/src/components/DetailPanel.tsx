import { useMemo, useState } from 'react';
import { Info, Copy, Check, Clock, User, Image, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStarmapStore } from '../store/useStarmapStore';
import { generateColorScale } from '../utils/colorUtils';

export function DetailPanel() {
  const dataPoints = useStarmapStore(s => s.dataPoints);
  const selectedPointIds = useStarmapStore(s => s.selectedPointIds);
  const updateConfidence = useStarmapStore(s => s.updateConfidence);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showConfidenceEditor, setShowConfidenceEditor] = useState(false);
  const [newConfidence, setNewConfidence] = useState(0.8);
  const [operatorName, setOperatorName] = useState('算法工程师');
  
  const selectedPoints = useMemo(() => {
    return dataPoints.filter(p => selectedPointIds.includes(p.id));
  }, [dataPoints, selectedPointIds]);
  
  const labels = useMemo(() => {
    const uniqueLabels = new Set(dataPoints.map(p => p.trueLabel));
    return Array.from(uniqueLabels).sort();
  }, [dataPoints]);
  
  const colorScale = useMemo(() => generateColorScale(labels), [labels]);
  
  const handleCopyVector = (vector: number[], id: string) => {
    navigator.clipboard.writeText(vector.join(', '));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handleBatchUpdateConfidence = () => {
    const pointIds = selectedPoints.map(p => p.id);
    updateConfidence(pointIds, newConfidence, operatorName);
    setShowConfidenceEditor(false);
  };
  
  if (selectedPoints.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">点击3D星图中的数据点</p>
        <p className="text-xs mt-1">查看样本向量、真实标签和分组信息</p>
        <p className="text-xs mt-2 text-gray-600">按住 Shift 可多选</p>
      </div>
    );
  }
  
  if (selectedPoints.length > 1) {
    const hasConfidenceUpdates = selectedPoints.some(p => p.confidenceUpdatedAt);
    
    return (
      <div className="h-full flex flex-col p-4 overflow-y-auto gap-4">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">已选择 {selectedPoints.length} 个样本</div>
          <button
            onClick={() => setShowConfidenceEditor(!showConfidenceEditor)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-md transition-colors"
          >
            批量补录置信度
          </button>
        </div>
        
        {showConfidenceEditor && (
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">置信度值</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={newConfidence}
                onChange={(e) => setNewConfidence(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-right text-xs text-gray-400 mt-1">{(newConfidence * 100).toFixed(0)}%</div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">操作人</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm"
              />
            </div>
            <button
              onClick={handleBatchUpdateConfidence}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-md transition-colors"
            >
              确认补录
            </button>
          </div>
        )}
        
        {hasConfidenceUpdates && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>置信度补录标记</span>
            </div>
            <p className="text-xs text-amber-300">
              已选中的样本中 {selectedPoints.filter(p => p.confidenceUpdatedAt).length} 个已有置信度补录记录
            </p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {selectedPoints.map(point => (
            <div
              key={point.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colorScale(point.trueLabel) }}
                />
                <span className="text-white text-sm">{point.trueLabel}</span>
                <span className="text-gray-500 text-xs ml-auto">{point.group}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>ID: {point.id.slice(0, 8)}...</span>
                <span>置信度: {(point.confidence * 100).toFixed(0)}%</span>
              </div>
              {point.confidenceUpdatedAt && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-amber-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>补录于 {new Date(point.confidenceUpdatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    <span>操作人: {point.confidenceUpdatedBy}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  const point = selectedPoints[0];
  const labelColor = colorScale(point.trueLabel);
  
  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: labelColor, boxShadow: `0 0 12px ${labelColor}` }}
          />
          <span className="text-white font-semibold text-lg">{point.trueLabel}</span>
          {point.predictedLabel && (
            <span className={`text-sm ${point.predictedLabel !== point.trueLabel ? 'text-red-400' : 'text-green-400'}`}>
              → {point.predictedLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">ID: {point.id}</div>
      </div>
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">原始向量</span>
          <button
            onClick={() => handleCopyVector(point.vector, point.id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copiedId === point.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copiedId === point.id ? '已复制' : '复制'}
          </button>
        </div>
        <div className="font-mono text-xs text-gray-400 bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
          [{point.vector.map(v => v.toFixed(4)).join(', ')}]
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">真实标签</div>
          <div className="text-white font-semibold">{point.trueLabel}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">分组</div>
          <div className="text-white font-semibold">{point.group}</div>
        </div>
      </div>
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">置信度</span>
          <span className="text-white font-bold">{(point.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${point.confidence * 100}%`,
              background: point.confidence > 0.7
                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                : point.confidence > 0.4
                ? 'linear-gradient(90deg, #eab308, #facc15)'
                : 'linear-gradient(90deg, #ef4444, #f87171)',
            }}
          />
        </div>
      </div>
      
      {point.confidenceUpdatedAt && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>置信度补录记录</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Clock className="w-3 h-3" />
              <span>补录时间: {new Date(point.confidenceUpdatedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-amber-200">
              <User className="w-3 h-3" />
              <span>操作人: {point.confidenceUpdatedBy}</span>
            </div>
          </div>
        </div>
      )}
      
      {point.isOccluded && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>遮挡警告</span>
          </div>
          <p className="text-xs text-orange-300">{point.occlusionReason || '该样本在高密度区域被遮挡'}</p>
        </div>
      )}
      
      {point.screenshots.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-3">
            <Image className="w-4 h-4" />
            <span>关联截图 ({point.screenshots.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {point.screenshots.slice(0, 6).map(shot => (
              <div
                key={shot.id}
                className="aspect-square rounded border border-gray-600 overflow-hidden bg-gray-900 group relative"
                title={new Date(shot.timestamp).toLocaleString()}
              >
                <img
                  src={shot.thumbnail}
                  alt="Screenshot"
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white">
                    {new Date(shot.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">3D嵌入坐标</div>
        <div className="font-mono text-xs text-cyan-400">
          X: {point.embedding[0].toFixed(4)}<br />
          Y: {point.embedding[1].toFixed(4)}<br />
          Z: {point.embedding[2].toFixed(4)}
        </div>
      </div>
    </div>
  );
}
