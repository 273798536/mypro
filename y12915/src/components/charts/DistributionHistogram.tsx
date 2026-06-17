import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ComposedChart,
  Area,
} from 'recharts';
import type { ConfidenceInterval, HistogramBin } from '@/types';
import { calculateConfidenceInterval } from '@/utils/confidence';
import { cn } from '@/lib/utils';

interface HistogramDatum {
  binStart: number;
  binEnd: number;
  count: number;
}

interface DistributionHistogramProps {
  data?: HistogramDatum[];
  ci?: ConfidenceInterval;
  scores?: number[];
  histogram?: HistogramBin[];
  height?: number | string;
  title?: string;
  showCI?: boolean;
  className?: string;
  barColor?: string;
  ciColor?: string;
}

function buildHistogramFromScores(scores: number[], binCount: number = 10): HistogramDatum[] {
  const min = 0;
  const max = 100;
  const binWidth = (max - min) / binCount;
  const bins: HistogramDatum[] = Array.from({ length: binCount }, (_, i) => ({
    binStart: min + i * binWidth,
    binEnd: min + (i + 1) * binWidth,
    count: 0,
  }));
  for (const score of scores) {
    const clampedScore = Math.max(min, Math.min(max, score));
    let binIndex = Math.floor((clampedScore - min) / binWidth);
    if (binIndex >= binCount) binIndex = binCount - 1;
    if (binIndex < 0) binIndex = 0;
    bins[binIndex].count++;
  }
  return bins;
}

function convertHistogramBins(bins: HistogramBin[]): HistogramDatum[] {
  return bins.map((b) => ({
    binStart: b.range[0],
    binEnd: b.range[1],
    count: b.count,
  }));
}

export default function DistributionHistogram(props: DistributionHistogramProps) {
  const {
    ci: customCI,
    scores,
    histogram: customHistogram,
    height = 400,
    title,
    showCI = true,
    className,
  } = props;

  const { data, ci, yMax } = useMemo(() => {
    let histData: HistogramDatum[] = [];
    if (props.data && props.data.length > 0) {
      histData = props.data;
    } else if (customHistogram && customHistogram.length > 0) {
      histData = convertHistogramBins(customHistogram);
    } else if (scores && scores.length > 0) {
      histData = buildHistogramFromScores(scores, 10);
    }
    const computedCi = customCI ?? (scores ? calculateConfidenceInterval(scores) : undefined);
    const yMax = Math.max(...histData.map((d) => d.count), 1);
    return { data: histData, ci: computedCi, yMax };
  }, [props.data, customHistogram, scores, customCI]);

  const chartData = data.map((d) => ({
    ...d,
    range: `${d.binStart}-${d.binEnd}`,
    mid: (d.binStart + d.binEnd) / 2,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const countEntry = payload.find((p: any) => p.dataKey === 'count');
      const count = countEntry ? countEntry.value : d.count;
      return (
        <div className="bg-slate-800/95 backdrop-blur text-white px-4 py-3 rounded-lg shadow-xl border border-slate-600 text-sm">
          <div className="font-semibold text-sky-300 mb-1">区间 [{d.binStart}, {d.binEnd})</div>
          <div className="text-slate-200">数量: <span className="font-mono font-bold text-amber-300">{count}</span></div>
          {ci && (
            <div className="mt-2 pt-2 border-t border-slate-600 text-xs">
              <div>均值: <span className="font-mono text-purple-300">{ci.mean.toFixed(2)}</span></div>
              <div>95% CI: [{ci.lower.toFixed(2)}, {ci.upper.toFixed(2)}]</div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <div className="text-sm font-semibold text-slate-200 mb-3">{title}</div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="ciGradientHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="barGradientHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

            {showCI && ci && (
              <ReferenceArea
                x1={ci.lower}
                x2={ci.upper}
                y1={0}
                y2={yMax}
                fill="url(#ciGradientHist)"
                stroke="none"
              />
            )}

            <XAxis
              dataKey="mid"
              type="number"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              label={{ value: '分数', position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 13 }}
            />
            <YAxis
              stroke="#94A3B8"
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              label={{ value: '数量', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 13 }}
            />

            {showCI && ci && (
              <ReferenceLine
                x={ci.mean}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{
                  value: `均值 ${ci.mean.toFixed(1)}`,
                  position: 'top',
                  fill: '#F59E0B',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="rect"
              wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }}
            />

            <Bar
              dataKey="count"
              name="样本分布"
              radius={[4, 4, 0, 0]}
              barSize={Math.max(12, (400 / Math.max(data.length, 1)) * 0.8)}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill="url(#barGradientHist)" />
              ))}
            </Bar>

            {showCI && ci && (
              <Bar
                dataKey={() => 0}
                name="95%置信区间"
                fill="url(#ciGradientHist)"
                legendType="rect"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
