import { useMemo, useState, useCallback } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Layers, Filter, RotateCcw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useStarmapStore } from '../store/useStarmapStore';
import { generateColorScale } from '../utils/colorUtils';
import { getQualityWarnings } from '../utils/dataQuality';

export function FilterPanel() {
  const dataPoints = useStarmapStore(s => s.dataPoints);
  const filters = useStarmapStore(s => s.filters);
  const qualityReport = useStarmapStore(s => s.qualityReport);
  const toggleLabel = useStarmapStore(s => s.toggleLabel);
  const toggleGroup = useStarmapStore(s => s.toggleGroup);
  const setConfidenceRange = useStarmapStore(s => s.setConfidenceRange);
  const setShowOverlapOnly = useStarmapStore(s => s.setShowOverlapOnly);
  const setShowOccluded = useStarmapStore(s => s.setShowOccluded);
  const resetFilters = useStarmapStore(s => s.resetFilters);
  
  const [confidenceMin, setConfidenceMin] = useState(filters.confidenceRange[0]);
  const [confidenceMax, setConfidenceMax] = useState(filters.confidenceRange[1]);
  
  const labels = useMemo(() => {
    const uniqueLabels = new Set(dataPoints.map(p => p.trueLabel));
    return Array.from(uniqueLabels).sort();
  }, [dataPoints]);
  
  const groups = useMemo(() => {
    const uniqueGroups = new Set(dataPoints.map(p => p.group));
    return Array.from(uniqueGroups).sort();
  }, [dataPoints]);
  
  const colorScale = useMemo(() => generateColorScale(labels), [labels]);
  const warnings = useMemo(() => getQualityWarnings(qualityReport), [qualityReport]);
  
  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const numValue = Math.min(value, confidenceMax - 0.01);
    setConfidenceMin(numValue);
    setConfidenceRange([numValue, confidenceMax]);
  }, [confidenceMax, setConfidenceRange]);
  
  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const numValue = Math.max(value, confidenceMin + 0.01);
    setConfidenceMax(numValue);
    setConfidenceRange([confidenceMin, numValue]);
  }, [confidenceMin, setConfidenceRange]);
  
  if (dataPoints.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        请导入数据或加载示例
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">
      {warnings.length > 0 && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>数据质量警示</span>
          </div>
          <ul className="text-xs text-orange-300 space-y-1">
            {warnings.slice(0, 3).map((warning, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Filter className="w-4 h-4" />
          <span>筛选条件</span>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          重置
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <Layers className="w-4 h-4" />
            <span>类别筛选</span>
          </div>
          <div className="space-y-1.5">
            {labels.map(label => (
              <div key={label} className="flex items-center gap-2">
                <Checkbox.Root
                  checked={filters.selectedLabels.includes(label)}
                  onCheckedChange={() => toggleLabel(label)}
                  className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                >
                  <Checkbox.Indicator className="text-white">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colorScale(label), boxShadow: `0 0 6px ${colorScale(label)}` }}
                />
                <span className="text-sm text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <span className="text-xs">🎯</span>
            <span>置信度区间</span>
          </div>
          <div className="px-2 space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={confidenceMin}
                onChange={handleMinChange}
                className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-10 text-right">{(confidenceMin * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={confidenceMax}
                onChange={handleMaxChange}
                className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-10 text-right">{(confidenceMax * 100).toFixed(0)}%</span>
            </div>
            <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                style={{ left: `${confidenceMin * 100}%`, width: `${(confidenceMax - confidenceMin) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        <div>
          <div className="text-sm text-gray-300 mb-2">分组筛选</div>
          <div className="flex flex-wrap gap-1.5">
            {groups.map(group => (
              <button
                key={group}
                onClick={() => toggleGroup(group)}
                className={`px-2 py-1 text-xs rounded-md border transition-all ${
                  filters.selectedGroups.includes(group)
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">仅显示重叠区域</span>
            <button
              onClick={() => setShowOverlapOnly(!filters.showOverlapOnly)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                filters.showOverlapOnly ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  filters.showOverlapOnly ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {filters.showOccluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>显示遮挡样本</span>
            </div>
            <button
              onClick={() => setShowOccluded(!filters.showOccluded)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                filters.showOccluded ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  filters.showOccluded ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
