import React from 'react';
import { Zap, Gauge, Flame, Target, Clock, Route, Activity } from 'lucide-react';
import { useRideStore } from '@/store/useRideStore';
import { getPowerZoneInfo } from '@/utils/powerCalculator';
import { POWER_ZONES } from '@/types';

const ResultDisplay: React.FC = () => {
  const { currentResult, currentInput, ftp } = useRideStore();

  if (!currentResult) {
    return (
      <div className="card h-full flex items-center justify-center">
        <div className="text-center py-16">
          <Activity className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500">输入数据后自动计算结果</p>
        </div>
      </div>
    );
  }

  const zoneInfo = getPowerZoneInfo(currentResult.power, ftp);

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-lg">功率输出</h3>
          </div>
          <span
            className="badge text-sm px-3 py-1.5"
            style={{ backgroundColor: `${zoneInfo.color}20`, color: zoneInfo.color }}
          >
            Z{zoneInfo.zone} {zoneInfo.name}
          </span>
        </div>
        <div className="card-body">
          <div className="text-center py-8">
            <div className="font-mono text-7xl font-bold mb-2" style={{ color: zoneInfo.color }}>
              {currentResult.power}
            </div>
            <div className="text-dark-400 text-lg">瓦特 (W)</div>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <div className="text-center">
                <div className="font-mono text-2xl font-semibold text-dark-200">
                  {currentResult.powerPerKg}
                </div>
                <div className="text-dark-500">W/kg</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-semibold text-dark-200">
                  {((currentResult.power / ftp) * 100).toFixed(0)}%
                </div>
                <div className="text-dark-500">FTP占比</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-dark-500 mb-2">
              <span>功率区间分布</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              {POWER_ZONES.map((zone) => (
                <div
                  key={zone.zone}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((zone.max - zone.min) * 100)}%`,
                    backgroundColor: zone.color,
                    opacity: currentResult.powerZone === zone.zone ? 1 : 0.4,
                  }}
                  title={`Z${zone.zone} ${zone.name}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-dark-500 mt-1">
              <span>0%</span>
              <span>55%</span>
              <span>75%</span>
              <span>90%</span>
              <span>105%</span>
              <span>120%</span>
              <span>150%+</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-primary-400" />
              <span className="text-dark-400 text-sm">速度</span>
            </div>
            <div className="font-mono text-3xl font-bold text-dark-100">
              {currentResult.speed}
              <span className="text-lg text-dark-500 ml-1">km/h</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary-400" />
              <span className="text-dark-400 text-sm">齿比</span>
            </div>
            <div className="font-mono text-3xl font-bold text-dark-100">
              {currentResult.gearRatio}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-dark-400 text-sm">卡路里</span>
            </div>
            <div className="font-mono text-3xl font-bold text-dark-100">
              {currentResult.calories}
              <span className="text-lg text-dark-500 ml-1">kcal</span>
            </div>
          </div>
        </div>
        {currentResult.distance && (
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-3">
                <Route className="w-4 h-4 text-primary-400" />
                <span className="text-dark-400 text-sm">距离</span>
              </div>
              <div className="font-mono text-3xl font-bold text-dark-100">
                {currentResult.distance}
                <span className="text-lg text-dark-500 ml-1">km</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">阻力分解</h3>
        </div>
        <div className="card-body space-y-3">
          <ResistanceBar
            name="滚动阻力"
            value={currentResult.rollingResistance}
            total={currentResult.rollingResistance + currentResult.gravityResistance + currentResult.aerodynamicDrag}
            color="#52C41A"
          />
          <ResistanceBar
            name="坡度阻力"
            value={currentResult.gravityResistance}
            total={currentResult.rollingResistance + currentResult.gravityResistance + currentResult.aerodynamicDrag}
            color="#FAAD14"
          />
          <ResistanceBar
            name="空气阻力"
            value={currentResult.aerodynamicDrag}
            total={currentResult.rollingResistance + currentResult.gravityResistance + currentResult.aerodynamicDrag}
            color="#165DFF"
          />
        </div>
      </div>
    </div>
  );
};

interface ResistanceBarProps {
  name: string;
  value: number;
  total: number;
  color: string;
}

const ResistanceBar: React.FC<ResistanceBarProps> = ({ name, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-dark-300">{name}</span>
        <span className="font-mono text-dark-200">{value}W ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default ResultDisplay;
