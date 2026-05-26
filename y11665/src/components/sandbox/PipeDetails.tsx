import { useWaterStore } from '@/store/useWaterStore';
import { Info, Database, Wrench, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function PipeDetails() {
  const { segments, selectedSegmentId, selectSegment } = useWaterStore();
  const [showCorrections, setShowCorrections] = useState(true);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);

  if (!selectedSegment) {
    return (
      <div className="p-4 border border-slate-700/50 rounded-lg bg-slate-900/50">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Info size={14} />
          <span>点击3D视图中的管道查看详情</span>
        </div>
      </div>
    );
  }

  const dataQualityColor = selectedSegment.dataQuality === 'good' ? 'text-emerald-400' :
    selectedSegment.dataQuality === 'boundary' ? 'text-amber-400' : 'text-red-400';
  const dataQualityLabel = selectedSegment.dataQuality === 'good' ? '正常' :
    selectedSegment.dataQuality === 'boundary' ? '边界' : '异常';

  return (
    <div className="p-4 border border-cyan-500/30 rounded-lg bg-slate-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold text-sm">{selectedSegment.id}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${dataQualityColor} border-current`}>
            {dataQualityLabel}
          </span>
        </div>
        <button
          onClick={() => selectSegment(null)}
          className="text-slate-400 hover:text-white text-xs"
        >
          关闭
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-slate-400">起始节点</div>
          <div className="text-white font-mono">{selectedSegment.fromNode}</div>
        </div>
        <div>
          <div className="text-slate-400">终止节点</div>
          <div className="text-white font-mono">{selectedSegment.toNode}</div>
        </div>
        <div>
          <div className="text-slate-400">材质</div>
          <div className="text-white">{selectedSegment.material}</div>
        </div>
        <div>
          <div className="text-slate-400">管径</div>
          <div className="text-white font-mono">DN{selectedSegment.diameter}</div>
        </div>
        <div>
          <div className="text-slate-400">基础压力</div>
          <div className="text-white font-mono">{selectedSegment.basePressure.toFixed(2)} MPa</div>
        </div>
        <div>
          <div className="text-slate-400">当前压力</div>
          <div className={`font-mono ${selectedSegment.currentPressure < 0.14 ? 'text-red-400' : 'text-emerald-400'}`}>
            {selectedSegment.currentPressure.toFixed(2)} MPa
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <Database size={12} />
          <span>数据来源</span>
        </div>
        <div className="text-white text-xs">{selectedSegment.source}</div>
      </div>

      {selectedSegment.corrections.length > 0 && (
        <div className="pt-2 border-t border-slate-700/50">
          <button
            onClick={() => setShowCorrections(!showCorrections)}
            className="flex items-center gap-2 text-xs text-amber-400 mb-2"
          >
            <Wrench size={12} />
            <span>修正痕迹 ({selectedSegment.corrections.length})</span>
            {showCorrections ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showCorrections && (
            <div className="space-y-2">
              {selectedSegment.corrections.map(corr => (
                <div key={corr.id} className="bg-slate-800/50 rounded p-2 text-xs">
                  <div className="flex items-center gap-1 text-slate-400 mb-1">
                    <AlertTriangle size={10} />
                    <span>{corr.operator}</span>
                    <span className="text-slate-500">{new Date(corr.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-white">{corr.field}: <span className="text-red-400 line-through">{corr.oldValue}</span> → <span className="text-emerald-400">{corr.newValue}</span></div>
                  <div className="text-slate-400 mt-1">{corr.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
