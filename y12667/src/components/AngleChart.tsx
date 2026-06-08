import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import type { AngleDataPoint } from '@shared/types';

interface Props {
  data: AngleDataPoint[];
  currentFrameIndex?: number;
}

export default function AngleChart({ data, currentFrameIndex = 0 }: Props) {
  const chartData = data.map((d, i) => ({
    ...d,
    timeLabel: `${Math.floor(d.timestamp / 60)}:${String((d.timestamp % 60) / 10).padStart(2, '0')[0]}0`,
    frameIndex: i,
  }));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            >
              <Label value="时间 (分:秒)" position="insideBottom" offset={-4} fill="#64748b" fontSize={11} />
            </XAxis>
            <YAxis
              stroke="#64748b"
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            >
              <Label value="绳索角度 (°)" angle={-90} position="insideLeft" fill="#64748b" fontSize={11} offset={4} />
            </YAxis>
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: '#94a3b8', fontFamily: 'IBM Plex Mono' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as AngleDataPoint & { explanation: string };
                return (
                  <div className="px-3 py-2 text-xs">
                    <div className="font-mono text-safety-blue mb-1">角度: {d.angle.toFixed(1)}°</div>
                    <div className="text-slate-300 max-w-[260px] leading-relaxed">{d.explanation}</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={75} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.2}>
              <Label value="预警线 75°" position="right" fill="#eab308" fontSize={10} />
            </ReferenceLine>
            <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.2}>
              <Label value="危险线 85°" position="right" fill="#ef4444" fontSize={10} />
            </ReferenceLine>
            <ReferenceLine y={25} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1.2}>
              <Label value="最小角 25°" position="right" fill="#3b82f6" fontSize={10} />
            </ReferenceLine>
            {chartData[currentFrameIndex] && (
              <ReferenceLine x={chartData[currentFrameIndex].timeLabel} stroke="#10b981" strokeWidth={1.5} />
            )}
            <Line
              type="monotone"
              dataKey="angle"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const isCurrent = index === currentFrameIndex;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? 5 : 3}
                    fill={isCurrent ? '#10b981' : '#f97316'}
                    stroke="#0b1220"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-2 flex gap-4 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-safety-orange" />
          绳索角度
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-safety-yellow" style={{ borderTop: '1px dashed #eab308' }} />
          预警阈值
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-safety-red" style={{ borderTop: '1px dashed #ef4444' }} />
          危险阈值
        </div>
      </div>
    </div>
  );
}
