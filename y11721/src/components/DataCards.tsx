import { Sun, Zap, Thermometer, Compass } from 'lucide-react';
import { useSolarStore } from '../store/solarStore';

interface DataCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
  description: string;
}

function DataCard({ icon, label, value, unit, color, description }: DataCardProps) {
  const setHoveredInfo = useSolarStore(state => state.setHoveredInfo);

  return (
    <div
      className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-all duration-200 cursor-help"
      onMouseEnter={() => setHoveredInfo({ key: label, value: `${value}${unit}`, description })}
      onMouseLeave={() => setHoveredInfo(null)}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white font-mono">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

export function DataCards() {
  const results = useSolarStore(state => state.results);

  return (
    <div className="absolute bottom-4 left-4 right-88 z-10">
      <div className="grid grid-cols-4 gap-4 max-w-3xl">
        <DataCard
          icon={<Sun className="w-5 h-5 text-yellow-400" />}
          label="太阳高度角"
          value={results.solarElevation.toFixed(1)}
          unit="°"
          color="bg-yellow-500/20"
          description="太阳光与水平面的夹角，角度越大发电效率越高"
        />
        <DataCard
          icon={<Compass className="w-5 h-5 text-blue-400" />}
          label="太阳方位角"
          value={results.solarAzimuth.toFixed(1)}
          unit="°"
          color="bg-blue-500/20"
          description="太阳在水平面上的方向，0°为正北"
        />
        <DataCard
          icon={<Thermometer className="w-5 h-5 text-orange-400" />}
          label="辐照量"
          value={results.irradiation.toFixed(0)}
          unit="W/㎡"
          color="bg-orange-500/20"
          description="单位面积接收的太阳辐射功率"
        />
        <DataCard
          icon={<Zap className="w-5 h-5 text-emerald-400" />}
          label="估算功率"
          value={results.powerOutput.toFixed(2)}
          unit="kW"
          color="bg-emerald-500/20"
          description="基于当前参数估算的发电功率"
        />
      </div>
    </div>
  );
}
