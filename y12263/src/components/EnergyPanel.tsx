
import { Battery, Zap, Wind, AlertTriangle } from 'lucide-react';
import { WIND_LABELS } from '@/constants';
import { WindType } from '@/types';

interface EnergyPanelProps {
  currentBattery: number;
  maxBattery: number;
  currentConsumption: number;
  currentWind: WindType;
  windSpeed: number;
  isInHeadwind: boolean;
  returnMargin: number;
  requiredMargin: number;
}

export default function EnergyPanel({
  currentBattery,
  maxBattery,
  currentConsumption,
  currentWind,
  windSpeed,
  isInHeadwind,
  returnMargin,
  requiredMargin
}: EnergyPanelProps) {
  const batteryPercent = (currentBattery / maxBattery) * 100;
  const isLowBattery = batteryPercent < 30;
  const isCriticalBattery = batteryPercent < 15;
  const hasInsufficientMargin = returnMargin < requiredMargin;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5" />
        能量监控
      </h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-300 flex items-center gap-1">
              <Battery className="w-4 h-4" />
              电量
            </span>
            <span className={`font-mono text-lg ${
              isCriticalBattery ? 'text-red-500 animate-pulse' : 
              isLowBattery ? 'text-orange-400' : 'text-green-400'
            }`}>
              {Math.round(batteryPercent)}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                isCriticalBattery ? 'bg-gradient-to-r from-red-600 to-red-400' :
                isLowBattery ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                'bg-gradient-to-r from-green-600 to-cyan-400'
              } ${isInHeadwind ? 'animate-pulse' : ''}`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{Math.round(currentBattery)} mAh</span>
            <span>{maxBattery} mAh</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">实时功耗</div>
            <div className={`font-mono text-lg ${
              isInHeadwind ? 'text-red-400' : 'text-cyan-400'
            }`}>
              {Math.round(currentConsumption)}
              <span className="text-xs text-slate-500 ml-1">mAh/s</span>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Wind className="w-3 h-3" />
              风场状态
            </div>
            <div className={`font-bold ${
              currentWind === 'headwind' ? 'text-red-400' :
              currentWind === 'tailwind' ? 'text-green-400' :
              currentWind === 'crosswind' ? 'text-orange-400' :
              'text-slate-300'
            }`}>
              {WIND_LABELS[currentWind]}
              {windSpeed > 0 && <span className="text-xs ml-1">Lv.{windSpeed}</span>}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              返航安全余量
            </span>
            <span className={`text-xs ${
              hasInsufficientMargin ? 'text-red-400' : 'text-green-400'
            }`}>
              需要 {requiredMargin}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                hasInsufficientMargin ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, returnMargin)}%` }}
            />
          </div>
          <div className={`text-xs mt-1 ${
            hasInsufficientMargin ? 'text-red-400' : 'text-slate-400'
          }`}>
            {hasInsufficientMargin 
              ? '⚠️ 电量不足以安全返航！' 
              : `当前余量 ${returnMargin.toFixed(1)}%`
            }
          </div>
        </div>

        {isInHeadwind && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">逆风耗电预警</span>
            </div>
            <p className="text-xs text-red-300/70 mt-1">
              当前处于强逆风区域，能耗增加80%！建议立即调整航线。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
