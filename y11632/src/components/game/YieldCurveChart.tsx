import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface YieldCurveChartProps {
  points: { term: number; yield: number }[];
  currentDirection: 'up' | 'down' | 'flat';
  expectedDirection: 'up' | 'down' | 'flat';
  onAdjust: (direction: 'up' | 'down' | 'flat') => void;
  disabled?: boolean;
}

export default function YieldCurveChart({
  points,
  currentDirection,
  expectedDirection,
  onAdjust,
  disabled,
}: YieldCurveChartProps) {
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const minYield = Math.min(...points.map(p => p.yield)) - 1;
  const maxYield = Math.max(...points.map(p => p.yield)) + 1;

  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTerm = Math.max(...points.map(p => p.term));

  const getX = (term: number) => padding.left + (term / maxTerm) * chartWidth;
  const getY = (yld: number) =>
    padding.top + chartHeight - ((yld - minYield) / (maxYield - minYield)) * chartHeight;

  const shiftAmount = currentDirection === 'up' ? 0.5 : currentDirection === 'down' ? -0.5 : 0;

  const adjustedPoints = points.map(p => ({
    ...p,
    yield: p.yield + shiftAmount,
  }));

  const originalPath = points.map((p, i) => {
    const x = getX(p.term);
    const y = getY(p.yield);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const adjustedPath = adjustedPoints.map((p, i) => {
    const x = getX(p.term);
    const y = getY(p.yield);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const handleDragStart = () => setDragging(true);
  const handleDragEnd = () => setDragging(false);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="bg-slate-900 rounded-xl"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ECDC4" />
            <stop offset="100%" stopColor="#D4A843" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={`h-${i}`}
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={width - padding.right}
            y2={padding.top + chartHeight * ratio}
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}

        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={`v-${i}`}
            x1={padding.left + chartWidth * ratio}
            y1={padding.top}
            x2={padding.left + chartWidth * ratio}
            y2={height - padding.bottom}
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}

        <path
          d={originalPath}
          fill="none"
          stroke="#4B5563"
          strokeWidth="2"
          strokeDasharray="6"
          opacity={0.5}
        />

        <motion.path
          d={adjustedPath}
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />

        {adjustedPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={getX(p.term)}
            cy={getY(p.yield)}
            r={5}
            fill="#D4A843"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
        ))}

        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={getX(p.term)}
            y={height - padding.bottom + 15}
            fill="#9CA3AF"
            fontSize="10"
            textAnchor="middle"
          >
            {p.term}年
          </text>
        ))}

        {[minYield, (minYield + maxYield) / 2, maxYield].map((y, i) => (
          <text
            key={`y-${i}`}
            x={padding.left - 8}
            y={getY(y) + 4}
            fill="#9CA3AF"
            fontSize="10"
            textAnchor="end"
          >
            {y.toFixed(1)}%
          </text>
        ))}

        {dragging && (
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            className="cursor-grab"
          />
        )}
      </svg>

      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={() => onAdjust('up')}
          disabled={disabled}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200
            ${currentDirection === 'up'
              ? 'bg-rose-500 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <TrendingUp className="w-3 h-3" />
          利率上升
        </button>
        <button
          onClick={() => onAdjust('flat')}
          disabled={disabled}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200
            ${currentDirection === 'flat'
              ? 'bg-slate-500 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Minus className="w-3 h-3" />
          平稳
        </button>
        <button
          onClick={() => onAdjust('down')}
          disabled={disabled}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200
            ${currentDirection === 'down'
              ? 'bg-emerald-500 text-white shadow-lg'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <TrendingDown className="w-3 h-3" />
          利率下降
        </button>
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-slate-400">
        预期方向：
        {expectedDirection === 'up' && <span className="text-rose-400">利率上升</span>}
        {expectedDirection === 'flat' && <span className="text-slate-300">平稳</span>}
        {expectedDirection === 'down' && <span className="text-emerald-400">利率下降</span>}
      </div>
    </div>
  );
}
