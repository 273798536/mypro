import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Thermometer, Battery, AlertTriangle, AlertCircle, Plus } from 'lucide-react';

export function SampleList() {
  const {
    samples,
    selectedSampleId,
    newlyAddedSampleId,
    actions: { selectSample, addBoundarySample, clearNewlyAdded }
  } = useAppStore();

  const normalSamples = samples.filter(s => s.type !== 'gap');
  const gapSamples = samples.filter(s => s.type === 'gap');
  const hasBoundarySample = samples.some(s => s.type === 'boundary');
  const newlyAddedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newlyAddedSampleId && newlyAddedRef.current) {
      newlyAddedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => clearNewlyAdded(), 3000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedSampleId, clearNewlyAdded]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'boundary': return { text: '边界', color: 'bg-orange-500' };
      case 'gap': return { text: '缺口', color: 'bg-yellow-500' };
      default: return { text: '正常', color: 'bg-emerald-500' };
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur border-r border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Battery className="w-5 h-5 text-cyan-400" />
          现场样本
        </h2>
        <p className="text-xs text-slate-400 mt-1">共 {normalSamples.length} 组有效样本</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {normalSamples.map((sample) => {
          const typeLabel = getTypeLabel(sample.type);
          const isSelected = selectedSampleId === sample.id;
          const isNewlyAdded = newlyAddedSampleId === sample.id;

          return (
            <div
              key={sample.id}
              ref={isNewlyAdded ? newlyAddedRef : null}
              onClick={() => selectSample(sample.id)}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300
                ${isSelected ? 'ring-2 ring-cyan-400 scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-lg'}
                ${sample.type === 'boundary' ? 'ring-1 ring-orange-500/50' : ''}
                ${isNewlyAdded ? 'animate-pulse-slow' : ''}
              `}
            >
              {isNewlyAdded && (
                <div className="absolute inset-0 bg-orange-500/20 animate-pulse z-10 pointer-events-none" />
              )}

              <div className="relative aspect-video bg-slate-800">
                <img
                  src={sample.photoUrl}
                  alt={sample.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${typeLabel.color}`}>
                    {typeLabel.text}
                  </span>
                </div>
                {sample.type === 'boundary' && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-800/90">
                <div className="font-medium text-sm text-slate-100 truncate">
                  {sample.name}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    {sample.temperature}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    {sample.soc}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  内阻: {sample.internalResistance.toFixed(3)} mΩ
                </div>
              </div>
            </div>
          );
        })}

        {!hasBoundarySample && (
          <button
            onClick={addBoundarySample}
            className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg
              text-slate-400 hover:text-orange-400 hover:border-orange-500/50
              hover:bg-orange-500/5 transition-all duration-200 flex flex-col items-center gap-2"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">补充边界样本</span>
            <span className="text-[11px] text-slate-500">混入一条贴近现场的边界数据</span>
          </button>
        )}
      </div>

      {gapSamples.length > 0 && (
        <div className="p-3 border-t border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">采样缺口 ({gapSamples.length})</span>
          </div>
          <p className="text-[11px] text-yellow-400/70">
            已单独拎出，不混入正常结果统计
          </p>
        </div>
      )}
    </div>
  );
}
