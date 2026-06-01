import { useMemo } from 'react';
import { Database, Layers, AlertTriangle, Activity, TrendingUp, Users } from 'lucide-react';
import { useStarmapStore } from '../store/useStarmapStore';
import { getQualityWarnings } from '../utils/dataQuality';

export function BottomStatusBar() {
  const dataPoints = useStarmapStore(s => s.dataPoints);
  const selectedPointIds = useStarmapStore(s => s.selectedPointIds);
  const qualityReport = useStarmapStore(s => s.qualityReport);
  const overlapRegions = useStarmapStore(s => s.overlapRegions);
  const datasetName = useStarmapStore(s => s.datasetName);
  const filters = useStarmapStore(s => s.filters);
  
  const labels = useMemo(() => {
    const uniqueLabels = new Set(dataPoints.map(p => p.trueLabel));
    return Array.from(uniqueLabels).sort();
  }, [dataPoints]);
  
  const filteredPoints = useMemo(() => {
    const overlapPointIds = new Set(overlapRegions.flatMap(r => 
      dataPoints.filter(p => {
        const dist = Math.sqrt(
          Math.pow(p.embedding[0] - r.center[0], 2) +
          Math.pow(p.embedding[1] - r.center[1], 2) +
          Math.pow(p.embedding[2] - r.center[2], 2)
        );
        return dist < r.size;
      }).map(p => p.id)
    ));
    
    return dataPoints.filter(p => {
      if (!filters.selectedLabels.includes(p.trueLabel)) return false;
      if (p.confidence < filters.confidenceRange[0] || p.confidence > filters.confidenceRange[1]) return false;
      if (!filters.selectedGroups.includes(p.group)) return false;
      if (filters.showOverlapOnly && !overlapPointIds.has(p.id)) return false;
      if (!filters.showOccluded && p.isOccluded) return false;
      return true;
    });
  }, [dataPoints, filters, overlapRegions]);
  
  const warnings = useMemo(() => getQualityWarnings(qualityReport), [qualityReport]);
  
  if (dataPoints.length === 0) {
    return null;
  }
  
  const avgConfidence = filteredPoints.length > 0
    ? filteredPoints.reduce((sum, p) => sum + p.confidence, 0) / filteredPoints.length
    : 0;
  
  const updatedPointsCount = dataPoints.filter(p => p.confidenceUpdatedAt).length;
  
  return (
    <div className="h-12 bg-gray-900/80 backdrop-blur-md border-t border-gray-700/50 flex items-center px-4 gap-6">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400 text-xs">
          总样本: <span className="text-white font-medium">{dataPoints.length}</span>
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400 text-xs">
          显示: <span className="text-white font-medium">{filteredPoints.length}</span>
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400 text-xs">
          类别: <span className="text-white font-medium">{labels.length}</span>
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          {labels.slice(0, 5).map((label, i) => (
            <div
              key={label}
              className="w-4 h-4 rounded-full border-2 border-gray-900"
              style={{
                backgroundColor: ['#00D4FF', '#FF00AA', '#00FF88', '#FFAA00', '#B388FF'][i % 5],
              }}
              title={label}
            />
          ))}
        </div>
      </div>
      
      <div className="w-px h-5 bg-gray-700" />
      
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-400" />
        <span className="text-gray-400 text-xs">
          重叠度: 
          <span className={`font-medium ml-1 ${
            qualityReport?.overlapScore && qualityReport.overlapScore > 0.5
              ? 'text-red-400'
              : qualityReport?.overlapScore && qualityReport.overlapScore > 0.25
              ? 'text-yellow-400'
              : 'text-green-400'
          }`}>
            {qualityReport ? `${(qualityReport.overlapScore * 100).toFixed(0)}%` : '-'}
          </span>
        </span>
        {overlapRegions.length > 0 && (
          <div className="h-1.5 w-24 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
              style={{ width: `${(qualityReport?.overlapScore || 0) * 100}%` }}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <span className="text-gray-400 text-xs">
          稳定性: 
          <span className={`font-medium ml-1 ${
            qualityReport?.stabilityScore && qualityReport.stabilityScore < 0.3
              ? 'text-red-400'
              : qualityReport?.stabilityScore && qualityReport.stabilityScore < 0.6
              ? 'text-yellow-400'
              : 'text-green-400'
          }`}>
            {qualityReport ? `${(qualityReport.stabilityScore * 100).toFixed(0)}%` : '-'}
          </span>
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-xs">
          平均置信度: 
          <span className="text-white font-medium ml-1">{(avgConfidence * 100).toFixed(1)}%</span>
        </span>
      </div>
      
      {updatedPointsCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-900/30 border border-amber-700/50 rounded">
          <span className="text-amber-400 text-[10px]">●</span>
          <span className="text-amber-300 text-[11px]">{updatedPointsCount} 个已补录</span>
        </div>
      )}
      
      {selectedPointIds.length > 0 && (
        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-blue-900/30 border border-blue-700/50 rounded">
          <span className="text-blue-400 text-[10px]">✓</span>
          <span className="text-blue-300 text-[11px]">已选 {selectedPointIds.length} 个</span>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-900/30 border border-orange-700/50 rounded animate-pulse">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          <span className="text-orange-300 text-[11px]">{warnings.length} 个警告</span>
        </div>
      )}
      
      {datasetName && (
        <div className="ml-auto text-gray-500 text-[11px]">
          {datasetName}
        </div>
      )}
    </div>
  );
}
