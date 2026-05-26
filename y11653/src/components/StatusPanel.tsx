import React from 'react';
import { Gauge, DollarSign, Clock, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { INDICATOR_LABELS, INDICATOR_UNITS, INDICATOR_COLORS, STANDARD_THRESHOLDS, CHEMICALS } from '@/data/chemicals';
import type { WaterQuality } from '@/types';
import { cn } from '@/lib/utils';

const KEY_INDICATORS: (keyof WaterQuality)[] = ['cod', 'ammonia', 'totalPhosphorus', 'turbidity'];

export function StatusPanel() {
  const { status, currentTime, totalTime, currentWater, inletWater, score, totalCost, operations } = useGameStore();

  const getIndicatorStatus = (indicator: keyof WaterQuality, value: number) => {
    if (indicator === 'ph') {
      const [min, max] = STANDARD_THRESHOLDS.ph;
      if (value >= min && value <= max) return 'success';
      if (value < min - 1 || value > max + 1) return 'danger';
      return 'warning';
    }
    const threshold = STANDARD_THRESHOLDS[indicator as keyof Omit<WaterQuality, 'ph'>] as number;
    if (value <= threshold) return 'success';
    if (value <= threshold * 1.5) return 'warning';
    return 'danger';
  };

  const getTrendIcon = (indicator: keyof WaterQuality) => {
    if (operations.length === 0) return <Minus className="w-4 h-4 text-slate-500" />;
    const lastOp = operations[operations.length - 1];
    const before = lastOp.beforeQuality[indicator];
    const after = lastOp.afterQuality[indicator];
    if (indicator === 'ph') {
      const target = 7.5;
      const beforeDist = Math.abs(before - target);
      const afterDist = Math.abs(after - target);
      if (afterDist < beforeDist) return <TrendingDown className="w-4 h-4 text-green-400" />;
      if (afterDist > beforeDist) return <TrendingUp className="w-4 h-4 text-red-400" />;
      return <Minus className="w-4 h-4 text-slate-500" />;
    }
    if (after < before) return <TrendingDown className="w-4 h-4 text-green-400" />;
    if (after > before) return <TrendingUp className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  const progress = (currentTime / totalTime) * 100;

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-orange-400" />
          状态监测
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {status === 'idle' ? (
          <div className="text-center text-slate-500 py-8">
            <Gauge className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>点击"开始模拟"查看实时数据</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">运行进度</span>
                <span className="text-sm font-mono text-white">
                  {currentTime} / {totalTime} 分钟
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <DollarSign className="w-3 h-3" />
                  累计成本
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  ¥{totalCost.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Target className="w-3 h-3" />
                  当前得分
                </div>
                <div className="text-xl font-bold text-yellow-400 font-mono">
                  {score}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
                <Clock className="w-3 h-3" />
                进水水质
              </div>
              <div className="space-y-2">
                {KEY_INDICATORS.map((indicator) => (
                  <div key={indicator} className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{INDICATOR_LABELS[indicator]}</span>
                    <span className="text-sm text-white font-mono">
                      {inletWater[indicator].toFixed(1)} {INDICATOR_UNITS[indicator]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300">出水指标</h3>
              {KEY_INDICATORS.map((indicator) => {
                const value = currentWater[indicator];
                const status = getIndicatorStatus(indicator, value);
                const threshold = STANDARD_THRESHOLDS[indicator as keyof Omit<WaterQuality, 'ph'>] as number;
                const progress = Math.min(100, (value / (threshold * 2)) * 100);

                return (
                  <div key={indicator} className="p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: INDICATOR_COLORS[indicator] }}
                        />
                        <span className="text-sm text-slate-300">{INDICATOR_LABELS[indicator]}</span>
                        {getTrendIcon(indicator)}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-bold font-mono',
                          status === 'success' && 'text-green-400',
                          status === 'warning' && 'text-yellow-400',
                          status === 'danger' && 'text-red-400'
                        )}
                      >
                        {value.toFixed(1)} {INDICATOR_UNITS[indicator]}
                      </span>
                    </div>
                    <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          status === 'success' && 'bg-green-500',
                          status === 'warning' && 'bg-yellow-500',
                          status === 'danger' && 'bg-red-500'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/50"
                        style={{ left: `${(threshold / (threshold * 2)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                      <span>0</span>
                      <span>阈值: {threshold}</span>
                    </div>
                  </div>
                );
              })}

              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: INDICATOR_COLORS.ph }}
                    />
                    <span className="text-sm text-slate-300">pH值</span>
                    {getTrendIcon('ph')}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-bold font-mono',
                      getIndicatorStatus('ph', currentWater.ph) === 'success' && 'text-green-400',
                      getIndicatorStatus('ph', currentWater.ph) === 'warning' && 'text-yellow-400',
                      getIndicatorStatus('ph', currentWater.ph) === 'danger' && 'text-red-400'
                    )}
                  >
                    {currentWater.ph.toFixed(1)}
                  </span>
                </div>
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-red-500 via-green-500 to-red-500"
                    style={{ left: '15%', width: '37.5%' }}
                  />
                  <div
                    className="absolute top-0 w-2 h-full bg-white rounded-full transition-all duration-300"
                    style={{ left: `${Math.min(100, Math.max(0, (currentWater.ph / 14) * 100))}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                  <span>0</span>
                  <span>范围: 6-9</span>
                  <span>14</span>
                </div>
              </div>
            </div>

            {operations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">最近操作</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {operations.slice(-3).reverse().map((op, idx) => (
                    <div key={op.id} className="p-2 bg-slate-800 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Step {operations.length - idx}</span>
                        <span className="text-slate-500">第{op.timestamp ? '' : ''}时间点</span>
                      </div>
                      <div className="text-slate-300 mt-1">
                        {CHEMICALS.find(c => c.id === op.chemicalId)?.name.split(' ')[0]}: {op.dosage} mg/L × {op.mixingTime}min
                      </div>
                      <div className="text-yellow-400 mt-1">成本: ¥{op.cost.toFixed(2)}</div>
                      {op.anomalies.length > 0 && (
                        <div className="text-red-400 mt-1">
                          异常: {op.anomalies.map(a => {
                            const names: Record<string, string> = {
                              overdose: '投药过量',
                              insufficient_mixing: '搅拌不足',
                              rebound: '指标反弹',
                              ph_extreme: 'pH异常',
                            };
                            return names[a] || a;
                          }).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
