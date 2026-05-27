import { useState } from 'react';
import { Settings, Atom, Magnet, Filter } from 'lucide-react';
import { useParticleStore } from '../../store/useParticleStore';
import { useMagneticFieldStore } from '../../store/useMagneticFieldStore';
import { PARTICLE_INFO, ParticleType } from '../../types/particle';
import { twMerge } from 'tailwind-merge';

type TabType = 'particles' | 'magnetic' | 'filter';

export default function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('particles');
  const { filteredTypes, toggleParticleType } = useParticleStore();
  const { field, setStrength, setDirection, toggleVisibility } = useMagneticFieldStore();

  const tabs = [
    { id: 'particles' as TabType, label: '粒子', icon: Atom },
    { id: 'magnetic' as TabType, label: '磁场', icon: Magnet },
    { id: 'filter' as TabType, label: '筛选', icon: Filter },
  ];

  return (
    <div className="absolute left-4 top-4 w-72 bg-chamber-900/90 backdrop-blur-md rounded-xl border border-chamber-700/50 overflow-hidden z-10">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-chamber-700/50">
        <Settings className="w-5 h-5 text-blue-400" />
        <h2 className="font-orbitron text-sm font-bold text-white">控制面板</h2>
      </div>

      <div className="flex border-b border-chamber-700/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={twMerge(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all',
                activeTab === tab.id
                  ? 'bg-chamber-800/50 text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-chamber-800/30'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-jetbrains">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'particles' && <ParticleSettings />}
        {activeTab === 'magnetic' && (
          <MagneticSettings
            field={field}
            setStrength={setStrength}
            setDirection={setDirection}
            toggleVisibility={toggleVisibility}
          />
        )}
        {activeTab === 'filter' && (
          <FilterSettings
            filteredTypes={filteredTypes}
            toggleParticleType={toggleParticleType}
          />
        )}
      </div>
    </div>
  );
}

function ParticleSettings() {
  const particles = useParticleStore((state) => state.particles);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300 font-jetbrains">粒子总数</span>
        <span className="text-lg font-orbitron text-blue-400">{particles.length}</span>
      </div>
      <div className="text-xs text-gray-500 font-jetbrains">
        点击3D视图中的粒子轨迹可查看详细信息
      </div>
    </div>
  );
}

interface MagneticSettingsProps {
  field: any;
  setStrength: (s: number) => void;
  setDirection: (d: any) => void;
  toggleVisibility: () => void;
}

function MagneticSettings({
  field,
  setStrength,
  setDirection,
  toggleVisibility,
}: MagneticSettingsProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300 font-jetbrains">磁场强度</span>
          <span className="text-sm font-orbitron text-blue-400">
            {field.strength.toFixed(2)} T
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={field.strength}
          onChange={(e) => setStrength(parseFloat(e.target.value))}
          className="w-full h-2 bg-chamber-800 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div>
        <div className="text-sm text-gray-300 font-jetbrains mb-2">磁场方向</div>
        <div className="grid grid-cols-3 gap-2">
          {['X', 'Y', 'Z'].map((axis) => (
            <button
              key={axis}
              onClick={() => {
                const dir: any = { x: 0, y: 0, z: 0 };
                dir[axis.toLowerCase()] = 1;
                setDirection(dir);
              }}
              className={twMerge(
                'py-2 rounded-lg text-sm font-jetbrains transition-all',
                field.direction[axis.toLowerCase() as keyof typeof field.direction] === 1
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                  : 'bg-chamber-800/50 text-gray-400 border border-chamber-700/50 hover:border-chamber-600'
              )}
            >
              +{axis}
            </button>
          ))}
          {['X', 'Y', 'Z'].map((axis) => (
            <button
              key={`-${axis}`}
              onClick={() => {
                const dir: any = { x: 0, y: 0, z: 0 };
                dir[axis.toLowerCase()] = -1;
                setDirection(dir);
              }}
              className={twMerge(
                'py-2 rounded-lg text-sm font-jetbrains transition-all',
                field.direction[axis.toLowerCase() as keyof typeof field.direction] === -1
                  ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                  : 'bg-chamber-800/50 text-gray-400 border border-chamber-700/50 hover:border-chamber-600'
              )}
            >
              -{axis}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300 font-jetbrains">显示磁场线</span>
        <button
          onClick={toggleVisibility}
          className={twMerge(
            'w-12 h-6 rounded-full transition-all relative',
            field.isVisible ? 'bg-blue-500' : 'bg-chamber-700'
          )}
        >
          <div
            className={twMerge(
              'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
              field.isVisible ? 'left-7' : 'left-1'
            )}
          />
        </button>
      </div>
    </div>
  );
}

interface FilterSettingsProps {
  filteredTypes: ParticleType[];
  toggleParticleType: (type: ParticleType) => void;
}

function FilterSettings({ filteredTypes, toggleParticleType }: FilterSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-300 font-jetbrains mb-3">粒子类型筛选</div>
      {(Object.keys(PARTICLE_INFO) as ParticleType[]).map((type) => {
        const info = PARTICLE_INFO[type];
        const isActive = filteredTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleParticleType(type)}
            className={twMerge(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-all border',
              isActive
                ? 'bg-chamber-800/50 border-chamber-600'
                : 'bg-chamber-900/50 border-chamber-800/50 opacity-50'
            )}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: info.color, boxShadow: `0 0 10px ${info.color}` }}
            />
            <div className="flex-1 text-left">
              <div className="text-sm text-white font-jetbrains">{info.name}</div>
              <div className="text-xs text-gray-500 font-jetbrains">{info.symbol}</div>
            </div>
            <div
              className={twMerge(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                isActive ? 'bg-blue-500 border-blue-500' : 'border-chamber-600'
              )}
            >
              {isActive && <span className="text-white text-xs">✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
