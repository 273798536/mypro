import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { usePhysicsStore } from '@/store/physicsStore';
import { useGameStore } from '@/store/gameStore';
import { formatActionType } from '@/utils/export';

export const TemperatureChart: React.FC = () => {
  const { temperatureHistory, temperature } = usePhysicsStore();
  const { currentOrder, actions } = useGameStore();

  const chartData = temperatureHistory.map((point, index) => {
    const action = actions.find(a => a.id === point.actionId);
    return {
      time: index + 1,
      temperature: point.temperature,
      action: action ? formatActionType(action.type) : null,
      actionId: point.actionId,
    };
  });

  if (chartData.length === 0) {
    chartData.push({
      time: 0,
      temperature: 25,
      action: null,
      actionId: undefined,
    });
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-bold">{data.temperature.toFixed(1)}°C</p>
          {data.action && <p className="text-sm text-gray-600">操作: {data.action}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display">温度变化曲线</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              label={{ value: '操作次数', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: '温度(°C)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {currentOrder && (
              <>
                <ReferenceLine
                  y={currentOrder.targetTemperature}
                  stroke="#27AE60"
                  strokeDasharray="5 5"
                  label={{ value: `目标: ${currentOrder.targetTemperature}°C`, position: 'right' }}
                />
                <ReferenceLine
                  y={currentOrder.targetTemperature - 5}
                  stroke="#F39C12"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={currentOrder.targetTemperature + 5}
                  stroke="#F39C12"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              </>
            )}
            
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#E67E22"
              strokeWidth={3}
              dot={{ fill: '#E67E22', r: 4 }}
              activeDot={{ r: 6, fill: '#D35400' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>目标温度</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>实际温度</span>
          </span>
        </div>
        <div className="text-gray-600">
          当前: {temperature.toFixed(1)}°C
        </div>
      </div>
    </div>
  );
};
