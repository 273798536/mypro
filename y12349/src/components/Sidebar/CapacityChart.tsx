import { useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { useBatteryStore } from '../../store/useBatteryStore';
import { exponentialDecay } from '../../utils/fitting';

export interface CapacityChartHandle {
  getChartRef: () => HTMLDivElement | null;
}

export const CapacityChart = forwardRef<CapacityChartHandle>((_, ref) => {
  const { 
    currentBatch, 
    currentCycleIndex, 
    fittingParams, 
    filteredCycles, 
    filters,
    calculateFitting,
    resetFilters
  } = useBatteryStore();
  const chartRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getChartRef: () => chartRef.current
  }));

  useEffect(() => {
    calculateFitting();
  }, []);

  const isFiltered = 
    filters.chargeRateRange[0] !== 0 ||
    filters.chargeRateRange[1] !== 5 ||
    filters.temperatureRange[0] !== 20 ||
    filters.temperatureRange[1] !== 50 ||
    filters.anomalyTypes.length > 0;

  const chartData = useMemo(() => {
    if (!filteredCycles || filteredCycles.length === 0) return [];
    
    const step = Math.max(1, Math.floor(filteredCycles.length / 100));
    return filteredCycles
      .filter((_, i) => i % step === 0)
      .map((cycle) => {
        const fitted = fittingParams 
          ? exponentialDecay(cycle.cycleNumber, fittingParams.a, fittingParams.b, fittingParams.c)
          : null;
        
        return {
          cycle: cycle.cycleNumber,
          capacity: cycle.capacityRetention,
          fitted: fitted
        };
      });
  }, [filteredCycles, fittingParams]);

  const currentCycleData = currentBatch?.cycles[currentCycleIndex];
  
  const hasFilteredCurrentCycle = filteredCycles.some(
    c => c.cycleNumber === currentCycleData?.cycleNumber
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-dark-lighter">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm text-gray-300">容量衰减曲线</h3>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
            >
              重置筛选
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          {fittingParams && (
            <span className="text-gray-400 font-mono">
              R² = {fittingParams.rSquared.toFixed(4)}
            </span>
          )}
          <span className={`font-mono ${isFiltered ? 'text-yellow-400' : 'text-gray-500'}`}>
            {filteredCycles.length} / {currentBatch?.cycles.length || 0} 条
            {isFiltered && ' (已筛选)'}
          </span>
        </div>
        {isFiltered && (
          <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-500/10 rounded px-2 py-1">
            筛选: {filters.chargeRateRange[0]}C-{filters.chargeRateRange[1]}C | {filters.temperatureRange[0]}°C-{filters.temperatureRange[1]}°C
          </div>
        )}
      </div>
      <div ref={chartRef} className="flex-1 p-2">
        {filteredCycles.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            筛选条件下无数据，请调整筛选范围
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="cycle"
                stroke="#64748B"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickLine={false}
              />
              <YAxis
                domain={[60, 100]}
                stroke="#64748B"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#06B6D4' }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)}%`,
                  name === 'capacity' ? '实际容量' : name === 'fitted' ? '拟合曲线' : name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: 'EOL 80%', position: 'right', fill: '#F59E0B', fontSize: 10 }} />
              {currentCycleData && hasFilteredCurrentCycle && (
                <ReferenceLine x={currentCycleData.cycleNumber} stroke="#06B6D4" strokeWidth={2} />
              )}
              <Line
                type="monotone"
                dataKey="capacity"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={false}
                name="实际容量"
                isAnimationActive={false}
              />
              {fittingParams && (
                <Line
                  type="monotone"
                  dataKey="fitted"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="拟合曲线"
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

CapacityChart.displayName = 'CapacityChart';
