import { useMemo } from 'react';
import type { ChartDataPoint } from '../types';

interface Props {
  data: ChartDataPoint[];
}

export function Chart({ data }: Props) {
  const maxValue = useMemo(() => {
    const max = Math.max(
      ...data.map((d) => d.normal + d.disputed + d.overdue + d.overridden),
    );
    return max === 0 ? 1 : max;
  }, [data]);

  const chartHeight = 200;
  const barWidth = 40;
  const gap = 20;
  const totalWidth = data.length * (barWidth + gap);

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <span>暂无数据</span>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <svg
        width={Math.max(totalWidth + 60, 300)}
        height={chartHeight + 60}
        className="chart-svg"
      >
        <line
          x1={40}
          y1={chartHeight}
          x2={totalWidth + 40}
          y2={chartHeight}
          stroke="#d1d5db"
          strokeWidth={1}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={40}
              y1={chartHeight * (1 - ratio)}
              x2={totalWidth + 40}
              y2={chartHeight * (1 - ratio)}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={35}
              y={chartHeight * (1 - ratio) + 4}
              fontSize="10"
              textAnchor="end"
              fill="#6b7280"
            >
              {Math.round((maxValue * ratio) / 1000)}k
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const total = d.normal + d.disputed + d.overdue + d.overridden;
          const baseX = 40 + i * (barWidth + gap);
          let currentY = chartHeight;
          const normalH = (d.normal / maxValue) * chartHeight;
          const disputedH = (d.disputed / maxValue) * chartHeight;
          const overdueH = (d.overdue / maxValue) * chartHeight;
          const overriddenH = (d.overridden / maxValue) * chartHeight;

          return (
            <g key={d.period}>
              <rect
                x={baseX}
                y={currentY - normalH}
                width={barWidth}
                height={normalH}
                fill="#10b981"
                opacity={0.85}
              >
                <title>正常: ¥{d.normal.toLocaleString()}</title>
              </rect>
              {disputedH > 0 && (
                <rect
                  x={baseX}
                  y={currentY - normalH - disputedH}
                  width={barWidth}
                  height={disputedH}
                  fill="#a855f7"
                  opacity={0.85}
                >
                  <title>争议: ¥{d.disputed.toLocaleString()}</title>
                </rect>
              )}
              {overdueH > 0 && (
                <rect
                  x={baseX}
                  y={currentY - normalH - disputedH - overdueH}
                  width={barWidth}
                  height={overdueH}
                  fill="#ef4444"
                  opacity={0.85}
                >
                  <title>逾期: ¥{d.overdue.toLocaleString()}</title>
                </rect>
              )}
              {overriddenH > 0 && (
                <rect
                  x={baseX}
                  y={currentY - normalH - disputedH - overdueH - overriddenH}
                  width={barWidth}
                  height={overriddenH}
                  fill="#f59e0b"
                  opacity={0.85}
                >
                  <title>改判: ¥{d.overridden.toLocaleString()}</title>
                </rect>
              )}
              <text
                x={baseX + barWidth / 2}
                y={chartHeight + 16}
                fontSize="11"
                textAnchor="middle"
                fill="#374151"
              >
                {d.period}
              </text>
              <text
                x={baseX + barWidth / 2}
                y={chartHeight + 30}
                fontSize="10"
                textAnchor="middle"
                fill="#9ca3af"
              >
                ¥{(total / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><i style={{ background: '#10b981' }} />正常</span>
        <span><i style={{ background: '#a855f7' }} />争议</span>
        <span><i style={{ background: '#ef4444' }} />逾期</span>
        <span><i style={{ background: '#f59e0b' }} />改判</span>
      </div>
    </div>
  );
}
