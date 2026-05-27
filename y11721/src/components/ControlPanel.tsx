import { useState } from 'react';
import { MapPin, Calendar, Sun, Cloud, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useSolarStore } from '../store/solarStore';
import { cn } from '../lib/utils';

const LOCATIONS = [
  { name: '北京', lat: 39.9, lng: 116.4, timezone: 'Asia/Shanghai' },
  { name: '上海', lat: 31.2, lng: 121.5, timezone: 'Asia/Shanghai' },
  { name: '广州', lat: 23.1, lng: 113.3, timezone: 'Asia/Shanghai' },
  { name: '东京', lat: 35.7, lng: 139.7, timezone: 'Asia/Tokyo' },
  { name: '纽约', lat: 40.7, lng: -74.0, timezone: 'America/New_York' },
  { name: '伦敦', lat: 51.5, lng: -0.1, timezone: 'Europe/London' },
];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  description: string;
}

function Slider({ label, value, min, max, step, unit, onChange, icon, description }: SliderProps) {
  const setHoveredInfo = useSolarStore(state => state.setHoveredInfo);

  return (
    <div
      className="space-y-2"
      onMouseEnter={() => setHoveredInfo({ key: label, value: `${value}${unit}`, description })}
      onMouseLeave={() => setHoveredInfo(null)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-mono text-emerald-400">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
}

export function ControlPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { params, setParams } = useSolarStore();

  return (
    <div className={cn(
      "absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 transition-all duration-300 z-10",
      isExpanded ? "h-auto" : "h-auto"
    )}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          参数控制
        </h2>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="w-4 h-4" />
              地理位置
            </label>
            <select
              value={params.location.name}
              onChange={(e) => {
                const loc = LOCATIONS.find(l => l.name === e.target.value);
                if (loc) setParams({ location: loc });
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {LOCATIONS.map(loc => (
                <option key={loc.name} value={loc.name}>{loc.name}</option>
              ))}
            </select>
            <div className="flex gap-2 text-xs text-gray-500">
              <span>纬度: {params.location.lat.toFixed(1)}°</span>
              <span>经度: {params.location.lng.toFixed(1)}°</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <Calendar className="w-4 h-4" />
              日期
            </label>
            <input
              type="date"
              value={params.date}
              onChange={(e) => setParams({ date: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <Slider
            label="倾角"
            value={params.tiltAngle}
            min={0}
            max={90}
            step={1}
            unit="°"
            onChange={(v) => setParams({ tiltAngle: v })}
            icon={<Sun className="w-4 h-4" />}
            description="太阳能板与水平面的夹角，影响太阳光入射角度"
          />

          <Slider
            label="天气系数"
            value={params.weatherFactor}
            min={0.1}
            max={1.0}
            step={0.05}
            unit=""
            onChange={(v) => setParams({ weatherFactor: v })}
            icon={<Cloud className="w-4 h-4" />}
            description="天气对光照的影响系数，1.0为晴天，0.1为阴天"
          />

          <Slider
            label="面板面积"
            value={params.panelArea}
            min={1}
            max={50}
            step={0.5}
            unit="㎡"
            onChange={(v) => setParams({ panelArea: v })}
            icon={<Layers className="w-4 h-4" />}
            description="太阳能板的总面积，直接影响总发电量"
          />
        </div>
      )}
    </div>
  );
}
