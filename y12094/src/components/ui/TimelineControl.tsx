import { useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import useAppStore from '@/store/useAppStore';
import { rainfallData } from '@/data/mockData';

export default function TimelineControl() {
  const currentTimeIndex = useAppStore((state) => state.currentTimeIndex);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playSpeed = useAppStore((state) => state.playSpeed);
  const showMissingRainfall = useAppStore((state) => state.showMissingRainfall);
  const setCurrentTimeIndex = useAppStore((state) => state.setCurrentTimeIndex);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeIndex((currentTimeIndex + 1) % rainfallData.length);
    }, 1000 / playSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, currentTimeIndex, setCurrentTimeIndex]);

  const chartData = useMemo(() => {
    return rainfallData.map((item, index) => ({
      ...item,
      day: index + 1,
      isCurrent: index === currentTimeIndex,
    }));
  }, [currentTimeIndex]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const index = data.activePayload[0].payload.day - 1;
      setCurrentTimeIndex(index);
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm border-t border-slate-700 px-4 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTimeIndex(0)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              title="回到开始"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setCurrentTimeIndex(rainfallData.length - 1)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              title="跳到最后"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <div className="text-white text-sm">
            <span className="text-slate-400">日期:</span>
            <span className="ml-2 font-medium">{rainfallData[currentTimeIndex]?.timestamp}</span>
          </div>
          <div className="text-white text-sm">
            <span className="text-slate-400">降雨量:</span>
            <span className={`ml-2 font-medium ${
              rainfallData[currentTimeIndex]?.isMissing ? 'text-red-400' : 'text-blue-400'
            }`}>
              {rainfallData[currentTimeIndex]?.isMissing
                ? '缺测'
                : `${rainfallData[currentTimeIndex]?.rainfall}mm`}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>播放速度:</span>
            <select
              value={playSpeed}
              onChange={(e) => useAppStore.getState().setPlaySpeed(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} onClick={handleBarClick}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                interval={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number, name: string, props: any) => {
                  if (props.payload.isMissing) {
                    return ['雨量缺测', '状态'];
                  }
                  return [`${value}mm`, '降雨量'];
                }}
                labelFormatter={(label) => `第 ${label} 天`}
              />
              <Bar dataKey="rainfall" radius={[2, 2, 0, 0]} cursor="pointer">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isMissing && showMissingRainfall
                        ? '#ef4444'
                        : entry.isCurrent
                        ? '#3b82f6'
                        : '#60a5fa'
                    }
                    opacity={entry.isCurrent ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
