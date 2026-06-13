import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Legend,
} from 'recharts';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import type { DataPoint, AnomalyInfo } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

const anomalyColorMap: Record<string, string> = {
  extreme: '#ff6b35',
  noise: '#f59e0b',
  missing: '#ef4444',
};

const anomalyLabelMap: Record<string, string> = {
  extreme: '极端值',
  noise: '疑似噪声',
  missing: '数据缺失',
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  const dataset = useSpeckleStore((s) => s.dataset);
  if (!active || !payload || !dataset) return null;

  const point = dataset.dataPoints.find((d) => d.timestamp === label);
  if (!point) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
      <div className="text-xs text-slate-400 mb-2">采样点 #{label} · {point.sourceRow}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-sm text-slate-300">{entry.name}</span>
            <span className="text-sm font-mono text-white ml-auto">{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {point.anomaly && (
        <div className="mt-3 pt-2 border-t border-slate-700">
          <div
            className="text-xs font-semibold px-2 py-0.5 rounded inline-block"
            style={{ background: `${anomalyColorMap[point.anomaly.type]}22`, color: anomalyColorMap[point.anomaly.type] }}
          >
            {anomalyLabelMap[point.anomaly.type]}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{point.anomaly.description}</p>
          <p className="text-[11px] text-slate-500 mt-1">点击查看追溯详情 →</p>
        </div>
      )}
    </div>
  );
}

function AnomalyDot(props: {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
  dataKey: string;
}) {
  const { cx, cy, payload, dataKey } = props;
  const selectAnomaly = useSpeckleStore((s) => s.selectAnomaly);
  const selectedAnomaly = useSpeckleStore((s) => s.selectedAnomaly);

  if (!payload?.anomaly || !cx || !cy) return null;
  if (dataKey !== 'intensity') return null;

  const isSelected = selectedAnomaly?.id === payload.anomaly.id;
  const color = anomalyColorMap[payload.anomaly.type];

  return (
    <g style={{ cursor: 'pointer' }} onClick={() => selectAnomaly(payload.anomaly as AnomalyInfo)}>
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={isSelected ? 0.2 : 0.1}>
        {!isSelected && (
          <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
        )}
        {!isSelected && (
          <animate attributeName="opacity" values="0.15;0.02;0.15" dur="2s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx={cx} cy={cy} r={7} fill={color} stroke="white" strokeWidth={2} />
      {isSelected && <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={2} />}
    </g>
  );
}

export function SpeckleChart() {
  const dataset = useSpeckleStore((s) => s.dataset);
  const [activeParams, setActiveParams] = useState({
    intensity: true,
    contrast: true,
    stability: true,
  });

  const anomalyRegions = useMemo(() => {
    if (!dataset) return [];
    const regions: Array<{ start: number; end: number; anomaly: AnomalyInfo }> = [];
    const seen = new Set<string>();
    dataset.dataPoints.forEach((p) => {
      if (p.anomaly && !seen.has(p.anomaly.id)) {
        seen.add(p.anomaly.id);
        regions.push({
          start: p.anomaly.affectedRangeStart,
          end: p.anomaly.affectedRangeEnd,
          anomaly: p.anomaly,
        });
      }
    });
    return regions;
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" strokeLinecap="round" />
              <path d="M7 15l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">点击右上角「放样例」加载演示数据</p>
        </div>
      </div>
    );
  }

  const paramConfig = [
    { key: 'intensity', name: '强度', color: '#22d3ee' },
    { key: 'contrast', name: '对比度', color: '#a78bfa' },
    { key: 'stability', name: '稳定性', color: '#34d399' },
  ] as const;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">参数曲线图</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            共 {dataset.dataPoints.length} 个采样点，检测到 {dataset.summary.anomalyCount} 处异常
          </p>
        </div>
        <div className="flex items-center gap-2">
          {paramConfig.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveParams((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeParams[p.key]
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-slate-900/50 text-slate-500 border border-transparent hover:text-slate-400'
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="h-full w-full rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataset.dataPoints} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <defs>
                {paramConfig.map((p) => (
                  <linearGradient key={p.key} id={`shadow-${p.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="timestamp"
                stroke="#475569"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                label={{ value: '采样序号', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
              />

              <YAxis
                stroke="#475569"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                domain={[0, 1.6]}
                tickFormatter={(v) => v.toFixed(1)}
              />

              <Tooltip content={<CustomTooltip />} />

              {anomalyRegions.map((r, idx) => (
                <ReferenceArea
                  key={`ra-${idx}`}
                  x1={r.start}
                  x2={r.end}
                  stroke={anomalyColorMap[r.anomaly.type]}
                  strokeOpacity={0.4}
                  fill={anomalyColorMap[r.anomaly.type]}
                  fillOpacity={0.08}
                />
              ))}

              {activeParams.intensity && (
                <Line
                  type="monotone"
                  dataKey="intensity"
                  name="强度"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  dot={(props) => <AnomalyDot {...props} dataKey="intensity" />}
                  activeDot={{ r: 5, stroke: '#22d3ee', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}
              {activeParams.contrast && (
                <Line
                  type="monotone"
                  dataKey="contrast"
                  name="对比度"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: '#a78bfa', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}
              {activeParams.stability && (
                <Line
                  type="monotone"
                  dataKey="stability"
                  name="稳定性"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, stroke: '#34d399', strokeWidth: 2, fill: '#0f172a' }}
                />
              )}

              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                wrapperStyle={{ paddingBottom: '8px' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
