import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import type { Payload } from 'recharts/types/component/DefaultLegendContent';

const TYPE_COLORS: Record<string, string> = {
  temperature: '#00E5A0',
  humidity: '#60A5FA',
  pressure: '#A78BFA',
};

export default function TimeSeriesChart() {
  const filteredData = useStore((s) => s.filteredData);
  const setSelectedSensor = useStore((s) => s.setSelectedSensor);
  const selectedSensorName = useStore((s) => s.selectedSensorName);

  const { chartData, sensors } = useMemo(() => {
    const timeMap = new Map<string, Record<string, number | string>>();
    const sensorSet = new Set<string>();

    for (const d of filteredData) {
      sensorSet.add(d.sensorName);
      const time = d.timestamp.slice(11, 16);
      if (!timeMap.has(time)) timeMap.set(time, { time });
      const entry = timeMap.get(time)!;
      entry[d.sensorName] = d.value;
    }

    const chartData = Array.from(timeMap.values()).sort((a, b) =>
      String(a.time).localeCompare(String(b.time))
    );
    return { chartData, sensors: Array.from(sensorSet) };
  }, [filteredData]);

  const handleClick = (params: { dataKey?: string }) => {
    if (params.dataKey) {
      setSelectedSensor(params.dataKey);
    }
  };

  const renderLegend = (props: { payload?: Payload[] }) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-3 px-4">
        {payload?.map((entry) => {
          const isSelected = entry.value === selectedSensorName;
          return (
            <li
              key={entry.value}
              onClick={() => handleClick({ dataKey: entry.value as string })}
              className={`flex items-center gap-1 text-xs cursor-pointer transition-opacity ${
                isSelected ? 'opacity-100 underline' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400">{entry.value}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
        暂无数据，请调整筛选条件
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} onClick={(e) => { if (e?.activePayload?.[0]) handleClick({ dataKey: e.activePayload[0].dataKey as string }); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            stroke="#374151"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            stroke="#374151"
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#e5e7eb',
            }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#9CA3AF' }}
            content={renderLegend}
          />
          {sensors.map((name) => {
            const record = filteredData.find((d) => d.sensorName === name);
            const color = record ? TYPE_COLORS[record.type] ?? '#00E5A0' : '#00E5A0';
            return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
