import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';
import { trajectories } from '@/data/trajectories';
import { accidents } from '@/data/accidents';

export const Timeline: React.FC = () => {
  const hourlyData = useMemo(() => {
    const hours: Record<number, { trajectories: number; accidents: number }> = {};
    for (let i = 8; i <= 18; i++) {
      hours[i] = { trajectories: 0, accidents: 0 };
    }

    trajectories.forEach((t) => {
      const hour = new Date(t.startTime).getHours();
      if (hours[hour]) hours[hour].trajectories++;
    });

    accidents.forEach((a) => {
      const hour = new Date(a.time).getHours();
      if (hours[hour]) hours[hour].accidents++;
    });

    return Object.entries(hours).map(([hour, data]) => ({
      time: `${hour}:00`,
      hour: Number(hour),
      人流: data.trajectories,
      事故: data.accidents,
    }));
  }, []);

  return (
    <div className="h-28 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex">
      <div className="w-48 p-3 border-r border-white/10 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-white/80 text-xs font-medium">24小时概览</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-white/50">今日人流</span>
            <span className="text-white/90 font-mono">{trajectories.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">今日事故</span>
            <span className="text-red-400 font-mono">{accidents.length}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">运营正常</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2EC4B6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2EC4B6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="人流"
              stroke="#2EC4B6"
              strokeWidth={2}
              fill="url(#flowGradient)"
            />
            <Line
              type="monotone"
              dataKey="事故"
              stroke="#E71D36"
              strokeWidth={2}
              dot={{ fill: '#E71D36', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="w-32 p-3 border-l border-white/10 flex flex-col justify-center">
        <div className="text-xs text-white/50 mb-2">图例</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-cyan-400 rounded" />
            <span className="text-white/60 text-xs">人流</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500 rounded" />
            <span className="text-white/60 text-xs">事故</span>
          </div>
        </div>
      </div>
    </div>
  );
};
