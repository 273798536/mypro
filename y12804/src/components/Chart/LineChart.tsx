import { useState } from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  status?: 'normal' | 'warning' | 'abnormal';
  id?: string;
}

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  yAxisLabel?: string;
  referenceRange?: {
    min: number;
    max: number;
  };
  height?: number;
  onPointClick?: (point: ChartDataPoint, index: number) => void;
  detailsComponent?: React.ReactNode;
}

export default function LineChart({
  data,
  title,
  yAxisLabel,
  referenceRange,
  height = 280,
  onPointClick,
  detailsComponent,
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 100;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.map((d) => d.value);
  if (referenceRange) {
    allValues.push(referenceRange.min, referenceRange.max);
  }

  const minValue = Math.min(...allValues) * 0.9;
  const maxValue = Math.max(...allValues) * 1.1;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  const getY = (value: number) => {
    return padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
  };

  const getX = (index: number) => {
    return padding.left + index * xStep;
  };

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`)
    .join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    return minValue + ((maxValue - minValue) * i) / yTicks;
  });

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        {title && <h4 className="text-sm font-medium text-primary-700 mb-3">{title}</h4>}
        <svg
          viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${height}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
        >
          {referenceRange && (
            <rect
              x={padding.left}
              y={getY(referenceRange.max)}
              width={chartWidth}
              height={getY(referenceRange.min) - getY(referenceRange.max)}
              fill="#d1fae5"
              fillOpacity="0.4"
            />
          )}

          {yTickValues.map((value, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={getY(value)}
                y2={getY(value)}
                stroke="#e9ecef"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={getY(value)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-neutral-500"
                style={{ fontSize: '10px' }}
              >
                {value.toFixed(1)}
              </text>
            </g>
          ))}

          <path
            d={pathD}
            fill="none"
            stroke="#0080e6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            const pointColor =
              d.status === 'abnormal'
                ? '#dc2626'
                : d.status === 'warning'
                ? '#f59e0b'
                : '#0080e6';

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onPointClick?.(d, i)}
                className="cursor-pointer"
              >
                <circle
                  cx={getX(i)}
                  cy={getY(d.value)}
                  r={hoveredIndex === i ? 6 : 4}
                  fill="white"
                  stroke={pointColor}
                  strokeWidth="2"
                />
                {hoveredIndex === i && (
                  <g>
                    <rect
                      x={getX(i) - 40}
                      y={getY(d.value) - 28}
                      width="80"
                      height="20"
                      rx="3"
                      fill="#102a43"
                    />
                    <text
                      x={getX(i)}
                      y={getY(d.value) - 14}
                      textAnchor="middle"
                      fill="white"
                      style={{ fontSize: '11px', fontWeight: 500 }}
                    >
                      {d.value.toFixed(2)} {yAxisLabel || ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {data.map((d, i) => (
            <text
              key={`label-${i}`}
              x={getX(i)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="fill-neutral-500"
              style={{ fontSize: '10px' }}
            >
              {d.label}
            </text>
          ))}

          {yAxisLabel && (
            <text
              x={12}
              y={height / 2}
              textAnchor="middle"
              transform={`rotate(-90, 12, ${height / 2})`}
              className="fill-neutral-500"
              style={{ fontSize: '11px' }}
            >
              {yAxisLabel}
            </text>
          )}
        </svg>

        {referenceRange && (
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-success-200 border border-success-300"></span>
              <span>参考范围: {referenceRange.min} - {referenceRange.max} {yAxisLabel || ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-medical-500 bg-white"></span>
              <span>正常</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-red-500 bg-white"></span>
              <span>异常</span>
            </div>
          </div>
        )}
      </div>

      {detailsComponent && (
        <div className="w-72 border-l border-neutral-200 pl-4">
          {detailsComponent}
        </div>
      )}
    </div>
  );
}
