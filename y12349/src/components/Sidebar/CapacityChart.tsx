import { useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useBatteryStore } from '../../store/useBatteryStore';
import { exponentialDecay } from '../../utils/fitting';

export const CapacityChart = () => {
  const { currentBatch, currentCycleIndex, fittingParams, calculateFitting } = useBatteryStore();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculateFitting();
  }, []);

  const chartData = useMemo(() => {
    if (!currentBatch) return [];
    
    const step = Math.max(1, Math.floor(currentBatch.cycles.length / 100));
    return currentBatch.cycles
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
  }, [currentBatch, fittingParams]);

  const currentCycleData = currentBatch?.cycles[currentCycleIndex];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-dark-lighter">
        <h3 className="font-semibold text-sm text-gray-300 mb-2">容量衰减曲线</h3>
        {fittingParams && (
          <div className="text-xs text-gray-500 font-mono">
            R² = {fittingParams.rSquared.toFixed(4)}
          </div>
        )}
      </div>
      <div ref={chartRef} className="flex-1 p-2">
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
            />
            <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="5 5" />
            {currentCycleData && (
              <ReferenceLine x={currentCycleData.cycleNumber} stroke="#06B6D4" />
            )}
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={false}
              name="实际容量"
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
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
