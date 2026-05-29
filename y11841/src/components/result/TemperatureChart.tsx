import React from 'react';
import { Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemperatureChartProps {
  temperatureHistory: { time: number; temp: number }[];
}

const TemperatureChart: React.FC<TemperatureChartProps> = ({ temperatureHistory }) => {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTemp = 12;
  const minTemp = 0;
  const criticalTemp = 8;

  const getX = (index: number) => {
    if (temperatureHistory.length <= 1) return padding.left;
    return padding.left + (index / (temperatureHistory.length - 1)) * chartWidth;
  };

  const getY = (temp: number) => {
    return padding.top + chartHeight - ((temp - minTemp) / (maxTemp - minTemp)) * chartHeight;
  };

  const criticalY = getY(criticalTemp);

  const pathData = temperatureHistory
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.temp);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaData = `${pathData} L ${getX(temperatureHistory.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const maxTempValue = Math.max(...temperatureHistory.map(p => p.temp));
  const hasExceeded = maxTempValue > criticalTemp;

  return (
    <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-6">
      <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
        <Thermometer className={hasExceeded ? 'w-5 h-5 text-cold-chain-danger' : 'w-5 h-5 text-cold-chain-success'} />
        温度变化曲线
      </h2>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-xs text-gray-400 font-mono">最高温度</div>
          <div className={cn(
            'font-mono text-2xl font-bold',
            hasExceeded ? 'text-cold-chain-danger' : 'text-cold-chain-success'
          )}>
            {maxTempValue.toFixed(1)}°C
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-mono">临界温度</div>
          <div className="font-mono text-2xl font-bold text-cold-chain-warning">
            {criticalTemp}°C
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-mono">是否超标</div>
          <div className={cn(
            'font-mono text-lg font-bold',
            hasExceeded ? 'text-cold-chain-danger' : 'text-cold-chain-success'
          )}>
            {hasExceeded ? '是 ⚠️' : '否 ✓'}
          </div>
        </div>
      </div>

      <div className="relative bg-cold-chain-dark rounded-lg p-2">
        <svg width={width} height={height} className="w-full h-auto">
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F53F3F" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#FF7D00" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00B42A" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00B42A" />
              <stop offset="70%" stopColor="#FF7D00" />
              <stop offset="100%" stopColor="#F53F3F" />
            </linearGradient>
          </defs>

          {[0, 2, 4, 6, 8, 10, 12].map(temp => (
            <g key={temp}>
              <line
                x1={padding.left}
                y1={getY(temp)}
                x2={width - padding.right}
                y2={getY(temp)}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 5}
                y={getY(temp) + 4}
                fill="#9CA3AF"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {temp}°C
              </text>
            </g>
          ))}

          <line
            x1={padding.left}
            y1={criticalY}
            x2={width - padding.right}
            y2={criticalY}
            stroke="#F53F3F"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <text
            x={width - padding.right}
            y={criticalY - 5}
            fill="#F53F3F"
            fontSize="10"
            textAnchor="end"
            fontFamily="monospace"
          >
            临界温度 {criticalTemp}°C
          </text>

          <path
            d={areaData}
            fill="url(#tempGradient)"
            opacity="0.3"
          />

          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {temperatureHistory.filter((_, i) => i % Math.ceil(temperatureHistory.length / 10) === 0 || i === temperatureHistory.length - 1).map((point, i) => {
            const originalIndex = temperatureHistory.indexOf(point);
            const x = getX(originalIndex);
            const y = getY(point.temp);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={point.temp > criticalTemp ? '#F53F3F' : point.temp > 6 ? '#FF7D00' : '#00B42A'}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y - 8}
                  fill="#D1D5DB"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {point.temp.toFixed(1)}
                </text>
              </g>
            );
          })}

          <text
            x={width / 2}
            y={height - 5}
            fill="#9CA3AF"
            fontSize="10"
            textAnchor="middle"
            fontFamily="monospace"
          >
            时间 →
          </text>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-mono text-gray-500">
        <span>开始时间</span>
        <span>结束时间</span>
      </div>
    </div>
  );
};

export default TemperatureChart;
