import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { TideData } from '@/types';
import { useAppStore } from '@/store/appStore';

interface TideChartProps {
  tideData: TideData[];
}

export function TideChart({ tideData }: TideChartProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    tideData.length > 0 ? tideData[0].date : null
  );
  const { tideCompareDate, setTideCompareDate } = useAppStore();

  const selectedTide = tideData.find((td) => td.date === selectedDate);
  const compareTide = tideData.find((td) => td.date === tideCompareDate);

  const chartData = selectedTide?.hourlyHeights?.map((h) => {
    const timeStr = h.time.split(' ')[1]?.split(':')[0] || '0';
    return {
      time: `${timeStr}时`,
      height: h.height,
      compareHeight: compareTide?.hourlyHeights?.find(
        (ch) => ch.time.split(' ')[1]?.split(':')[0] === timeStr
      )?.height,
    };
  }) || [];

  return (
    <div className="bg-slate-800/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">潮高曲线</span>
        <div className="flex gap-1">
          {tideData.slice(0, 4).map((td) => (
            <button
              key={td.date}
              onClick={() => setSelectedDate(td.date)}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                selectedDate === td.date
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {td.date.slice(5)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-32 mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area
              type="monotone"
              dataKey="height"
              stroke="#00D4AA"
              strokeWidth={2}
              fill="url(#tideGradient)"
              name={selectedDate || '潮高'}
            />
            {compareTide && (
              <Area
                type="monotone"
                dataKey="compareHeight"
                stroke="#FF6B35"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#compareGradient)"
                name={`对比 ${tideCompareDate?.slice(5)}`}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-cyan-400 rounded" />
          <span className="text-slate-400">当日潮高</span>
        </div>
        {compareTide && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-400 rounded" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-400">对比日</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2">选择对比日期:</div>
        <div className="flex flex-wrap gap-1">
          {tideData.map((td) => (
            <button
              key={`compare-${td.date}`}
              onClick={() => setTideCompareDate(tideCompareDate === td.date ? null : td.date)}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                tideCompareDate === td.date
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {td.date.slice(5)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
