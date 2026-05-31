import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface GaugeProps {
  label: string;
  value: number;
  unit?: string;
  color: string;
  icon: React.ReactNode;
  format?: (value: number) => string;
  history?: { time: number; value: number }[];
}

function Gauge({ label, value, unit = '', color, icon, format, history }: GaugeProps) {
  const displayValue = format ? format(value) : value.toFixed(4);
  const trend = history && history.length >= 2
    ? history[history.length - 1].value - history[history.length - 2].value
    : 0;

  return (
    <motion.div
      className="panel-glass p-4 relative overflow-hidden"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color }} />
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="data-label">{label}</span>
        </div>
        {trend !== 0 && (
          <span className={trend > 0 ? 'text-neon-green text-xs' : 'text-neon-red text-xs'}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </span>
        )}
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="gauge-value number-scroll" style={{ color }}>
          {displayValue}
        </span>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>

      {history && history.length > 1 && (
        <div className="mt-2 h-8">
          <svg width="100%" height="100%" viewBox="0 0 100 32" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={generateSparklinePath(history)}
              fill={`url(#gradient-${label})`}
              stroke={color}
              strokeWidth="1"
              opacity="0.8"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

function generateSparklinePath(data: { time: number; value: number }[]): string {
  if (data.length < 2) return '';

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 32 - ((d.value - min) / range) * 28 - 2;
    return `${x},${y}`;
  });

  const firstPoint = points[0].split(',');
  const lastPoint = points[points.length - 1].split(',');

  return `M ${firstPoint[0]},32 L ${points.join(' L ')} L ${lastPoint[0]},32 Z`;
}

export default function GreeksDashboard() {
  const { greeks, position, margin, time, score } = useGameStore();

  const formatDelta = (v: number) => v.toFixed(4);
  const formatGamma = (v: number) => v.toFixed(6);
  const formatVega = (v: number) => v.toFixed(4);
  const formatTheta = (v: number) => v.toFixed(4);
  const formatPrice = (v: number) => v.toFixed(2);

  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between panel-glass p-3">
        <div className="flex items-center gap-2">
          <Clock className="text-neon-cyan" size={18} />
          <span className="data-label">飞行时间</span>
        </div>
        <span className="font-mono text-xl text-neon-cyan">
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Gauge
          label="Delta"
          value={greeks.delta}
          color="#00f5ff"
          icon={<Activity size={16} />}
          format={formatDelta}
          history={greeks.deltaHistory.slice(-30)}
        />
        <Gauge
          label="Gamma"
          value={greeks.gamma}
          color="#aa66ff"
          icon={<Activity size={16} />}
          format={formatGamma}
          history={greeks.gammaHistory.slice(-30)}
        />
        <Gauge
          label="Vega"
          value={greeks.vega}
          color="#ffaa00"
          icon={<Activity size={16} />}
          format={formatVega}
          history={greeks.vegaHistory.slice(-30)}
        />
        <Gauge
          label="Theta"
          value={greeks.theta}
          color="#ff3366"
          icon={<Activity size={16} />}
          format={formatTheta}
          history={greeks.thetaHistory.slice(-30)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel-glass p-3">
          <div className="data-label mb-1">标的价格</div>
          <div className="font-mono text-lg text-neon-green">
            ${formatPrice(position.underlying)}
          </div>
        </div>
        <div className="panel-glass p-3">
          <div className="data-label mb-1">行权价格</div>
          <div className="font-mono text-lg text-neon-cyan">
            ${formatPrice(position.strike)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel-glass p-3">
          <div className="data-label mb-1">保证金比率</div>
          <div className={`font-mono text-lg ${
            margin.ratio < 1.2 ? 'text-neon-red' :
            margin.ratio < 1.5 ? 'text-neon-yellow' : 'text-neon-green'
          }`}>
            {margin.ratio.toFixed(2)}x
          </div>
          <div className="w-full bg-space-700 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                margin.ratio < 1.2 ? 'bg-neon-red' :
                margin.ratio < 1.5 ? 'bg-neon-yellow' : 'bg-neon-green'
              }`}
              style={{ width: `${Math.min(100, margin.ratio * 50)}%` }}
            />
          </div>
        </div>
        <div className="panel-glass p-3">
          <div className="data-label mb-1">当前得分</div>
          <div className={`font-mono text-lg ${
            score.total >= 800 ? 'text-neon-green' :
            score.total >= 500 ? 'text-neon-yellow' : 'text-neon-red'
          }`}>
            {score.total}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            基础: {score.baseScore} | 
            奖励: +{score.bonuses.reduce((s, b) => s + b.points, 0)} |
            扣分: -{score.riskDeductions.reduce((s, d) => s + d.points, 0)}
          </div>
        </div>
      </div>

      <div className="panel-glass p-3">
        <div className="data-label mb-2">仓位信息</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">类型:</span>
            <span className={`ml-2 ${position.type === 'call' ? 'text-neon-green' : 'text-neon-red'}`}>
              {position.type === 'call' ? '看涨 Call' : '看跌 Put'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">数量:</span>
            <span className="ml-2 font-mono text-neon-cyan">{position.quantity} 张</span>
          </div>
          <div>
            <span className="text-gray-400">剩余到期:</span>
            <span className="ml-2 font-mono text-neon-yellow">{position.expiry.toFixed(1)} 天</span>
          </div>
          <div>
            <span className="text-gray-400">仓位价值:</span>
            <span className="ml-2 font-mono text-neon-green">${position.currentValue.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
