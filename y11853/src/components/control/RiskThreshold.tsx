import { AlertTriangle } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useUIStore } from '../../store/uiStore';

export function RiskThreshold() {
  const riskThresholds = useUIStore(s => s.riskThresholds);
  const setRiskThresholds = useUIStore(s => s.setRiskThresholds);
  const highlightRisk = useUIStore(s => s.highlightRisk);
  const setHighlightRisk = useUIStore(s => s.setHighlightRisk);
  const showAxes = useUIStore(s => s.showAxes);
  const setShowAxes = useUIStore(s => s.setShowAxes);
  const showGrid = useUIStore(s => s.showGrid);
  const setShowGrid = useUIStore(s => s.setShowGrid);
  
  const handleLowThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value < riskThresholds.medium) {
      setRiskThresholds({ ...riskThresholds, low: value });
    }
  };
  
  const handleMediumThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > riskThresholds.low) {
      setRiskThresholds({ ...riskThresholds, medium: value });
    }
  };
  
  const riskLevels = [
    { value: 'all', label: '全部', color: 'bg-slate-500' },
    { value: 'low', label: '低风险', color: 'bg-emerald-500' },
    { value: 'medium', label: '中风险', color: 'bg-amber-500' },
    { value: 'high', label: '高风险', color: 'bg-red-500' },
  ] as const;
  
  return (
    <Panel title="风险控制" icon={<AlertTriangle size={16} />} className="w-full">
      <div className="space-y-5">
        <div>
          <label className="text-xs text-slate-400 mb-2 block">风险高亮</label>
          <div className="grid grid-cols-4 gap-1">
            {riskLevels.map(level => (
              <button
                key={level.value}
                onClick={() => setHighlightRisk(level.value)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  highlightRisk === level.value
                    ? `${level.color} text-white shadow-lg`
                    : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/50'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-emerald-400">低/中风险阈值</span>
              <span className="text-slate-400">{(riskThresholds.low * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.3"
              step="0.01"
              value={riskThresholds.low}
              onChange={handleLowThresholdChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-400">中/高风险阈值</span>
              <span className="text-slate-400">{(riskThresholds.medium * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.5"
              step="0.01"
              value={riskThresholds.medium}
              onChange={handleMediumThresholdChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4 pt-2 border-t border-slate-700/30">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
            />
            显示坐标轴
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50"
            />
            显示网格
          </label>
        </div>
      </div>
    </Panel>
  );
}
