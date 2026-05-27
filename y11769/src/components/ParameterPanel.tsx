import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Play, Pause, Eye, EyeOff } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';

function CollapsibleSection({ title, defaultOpen = true, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-700/50">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider hover:bg-white/5"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function SliderInput({ label, value, min, max, step = 1, onChange, invalid = false }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  invalid?: boolean;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-300">{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-16 rounded px-1.5 py-0.5 text-xs text-white bg-zinc-800 border text-right ${
            invalid ? 'border-red-500' : 'border-zinc-600'
          }`}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-orange-500 h-1.5"
      />
    </div>
  );
}

export default function ParameterPanel() {
  const epicenter = useSandboxStore(s => s.epicenter);
  const layers = useSandboxStore(s => s.layers);
  const stations = useSandboxStore(s => s.stations);
  const isAnimating = useSandboxStore(s => s.isAnimating);
  const animationSpeed = useSandboxStore(s => s.animationSpeed);
  const showPWave = useSandboxStore(s => s.showPWave);
  const showSWave = useSandboxStore(s => s.showSWave);
  const showRayPaths = useSandboxStore(s => s.showRayPaths);
  const showWavefront = useSandboxStore(s => s.showWavefront);

  const setEpicenterDepth = useSandboxStore(s => s.setEpicenterDepth);
  const updateLayer = useSandboxStore(s => s.updateLayer);
  const addStation = useSandboxStore(s => s.addStation);
  const removeStation = useSandboxStore(s => s.removeStation);
  const updateStation = useSandboxStore(s => s.updateStation);
  const toggleAnimation = useSandboxStore(s => s.toggleAnimation);
  const setAnimationSpeed = useSandboxStore(s => s.setAnimationSpeed);
  const setShowPWave = useSandboxStore(s => s.setShowPWave);
  const setShowSWave = useSandboxStore(s => s.setShowSWave);
  const setShowRayPaths = useSandboxStore(s => s.setShowRayPaths);
  const setShowWavefront = useSandboxStore(s => s.setShowWavefront);

  const depth = -epicenter.position[1];
  const epicX = epicenter.position[0];

  return (
    <div className="w-[280px] h-full overflow-y-auto bg-[#0a0e1a]/90 text-sm" style={{ scrollbarWidth: 'thin' }}>
      <CollapsibleSection title="震源参数">
        <SliderInput
          label="震源深度 (km)"
          value={depth}
          min={0}
          max={35}
          step={0.5}
          onChange={setEpicenterDepth}
        />
        <SliderInput
          label="震源X位置"
          value={epicX}
          min={-150}
          max={150}
          step={1}
          onChange={v => {
            useSandboxStore.getState().setEpicenterPosition([v, epicenter.position[1], epicenter.position[2]]);
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection title="地层参数">
        {layers.map(layer => {
          const pInvalid = layer.pVelocity <= 0;
          const sInvalid = layer.sVelocity <= 0;
          return (
            <div key={layer.id} className="mb-3 border border-zinc-700/50 rounded p-2">
              <div className="text-xs text-white font-semibold mb-1.5">{layer.name}</div>
              <div className={`rounded p-1.5 mb-1 ${pInvalid ? 'border border-red-500 bg-red-500/10' : ''}`}>
                <SliderInput
                  label="P波速度 (km/s)"
                  value={layer.pVelocity}
                  min={0}
                  max={10}
                  step={0.1}
                  onChange={v => updateLayer(layer.id, { pVelocity: v })}
                  invalid={pInvalid}
                />
                {pInvalid && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                    <EyeOff size={10} /> 速度值无效
                  </div>
                )}
              </div>
              <div className={`rounded p-1.5 mb-1 ${sInvalid ? 'border border-red-500 bg-red-500/10' : ''}`}>
                <SliderInput
                  label="S波速度 (km/s)"
                  value={layer.sVelocity}
                  min={0}
                  max={6}
                  step={0.1}
                  onChange={v => updateLayer(layer.id, { sVelocity: v })}
                  invalid={sInvalid}
                />
                {sInvalid && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                    <EyeOff size={10} /> 速度值无效
                  </div>
                )}
              </div>
              <div className="flex gap-3 text-[10px] text-zinc-400 mt-1">
                <span>层顶: {layer.topDepth}km</span>
                <span>层底: {layer.bottomDepth}km</span>
              </div>
            </div>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection title="测站管理">
        {stations.map(station => (
          <div key={station.id} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-zinc-400 w-20 truncate">{station.label}</span>
            <input
              type="number"
              value={station.position[0]}
              min={-150}
              max={150}
              step={1}
              onChange={e => updateStation(station.id, {
                position: [Number(e.target.value), 0, 0],
              })}
              className="w-16 rounded px-1.5 py-0.5 text-xs text-white bg-zinc-800 border border-zinc-600 text-right"
            />
            <span className="text-[10px] text-zinc-500">km</span>
            <button
              onClick={() => removeStation(station.id)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const newX = epicX + 50;
            addStation([newX, 0, 0]);
          }}
          className="flex items-center gap-1 mt-2 px-2 py-1 text-xs text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/10 transition-colors"
        >
          <Plus size={12} /> 添加测站
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="显示控制">
        <div className="space-y-2">
          <ToggleRow label="P波" checked={showPWave} onChange={setShowPWave} />
          <ToggleRow label="S波" checked={showSWave} onChange={setShowSWave} />
          <ToggleRow label="射线路径" checked={showRayPaths} onChange={setShowRayPaths} />
          <ToggleRow label="波前动画" checked={showWavefront} onChange={setShowWavefront} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-300">动画速度</span>
            <span className="text-xs text-white">{animationSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            value={animationSpeed}
            min={0.5}
            max={3}
            step={0.1}
            onChange={e => setAnimationSpeed(Number(e.target.value))}
            className="w-full accent-orange-500 h-1.5"
          />
        </div>
        <button
          onClick={toggleAnimation}
          className="flex items-center justify-center gap-1.5 w-full mt-3 py-1.5 text-xs text-white bg-orange-500/20 border border-orange-500/40 rounded hover:bg-orange-500/30 transition-colors"
        >
          {isAnimating ? <Pause size={12} /> : <Play size={12} />}
          {isAnimating ? '暂停' : '播放'}
        </button>
      </CollapsibleSection>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
          checked
            ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
            : 'border-zinc-600 text-zinc-500 bg-zinc-800'
        }`}
      >
        {checked ? <Eye size={10} /> : <EyeOff size={10} />}
        {checked ? '显示' : '隐藏'}
      </button>
    </div>
  );
}
