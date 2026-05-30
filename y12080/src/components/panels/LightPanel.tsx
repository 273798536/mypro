import { useStageStore } from '../../store/useStageStore';
import { Lightbulb, AlertTriangle, Clock, Check } from 'lucide-react';

export function LightPanel() {
  const { lights, selectedLightId, setSelectedLight, updateLight } = useStageStore();
  
  const selectedLight = lights.find(l => l.id === selectedLightId);
  
  return (
    <div className="h-full flex flex-col bg-gray-900/90 text-white">
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Lightbulb size={16} />
          灯位管理
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {lights.map((light) => (
          <div
            key={light.id}
            className={`
              p-2 rounded-lg cursor-pointer transition-all
              ${selectedLightId === light.id
                ? 'bg-cyan-900/50 border border-cyan-500'
                : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'
            }
            `}
            onClick={() => setSelectedLight(light.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono font-bold">{light.name}</span>
              <span
                className={`
                px-1.5 py-0.5 rounded text-[10px] font-mono
                ${light.status === 'normal' ? 'bg-green-900/50 text-green-400' : ''}
                ${light.status === 'pending' ? 'bg-amber-900/50 text-amber-400' : ''}
                ${light.status === 'conflict' ? 'bg-red-900/50 text-red-400' : ''}
              `}
              >
                {light.status === 'normal' && <Check size={10} className="inline" />}
                {light.status === 'pending' && <Clock size={10} className="inline" />}
                {light.status === 'conflict' && <AlertTriangle size={10} className="inline" />}
                {' '}{light.status === 'normal' ? '正常' : light.status === 'pending' ? '待确认' : '冲突'}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              {light.type.toUpperCase()} · {light.angle}° · {Math.round(light.intensity * 100) / 100}
            </div>
          </div>
        ))}
      </div>
      
      {selectedLight && (
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <h3 className="text-xs font-bold mb-2">参数设置</h3>
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400">位置</label>
              <div className="font-mono text-[10px]">
                {selectedLight.position.map(v => v.toFixed(1)).join(', ')}
              </div>
            </div>
            <div>
              <label className="text-gray-400">目标</label>
              <div className="font-mono text-[10px]">
                {selectedLight.target.map(v => v.toFixed(1)).join(', ')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400">角度</label>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={selectedLight.angle}
                  onChange={(e) => updateLight(selectedLight.id, { angle: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-gray-400">亮度</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={selectedLight.intensity}
                  onChange={(e) => updateLight(selectedLight.id, { intensity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400">颜色</label>
              <input
                type="color"
                value={selectedLight.color}
                onChange={(e) => updateLight(selectedLight.id, { color: e.target.value })}
                className="w-full h-6"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
