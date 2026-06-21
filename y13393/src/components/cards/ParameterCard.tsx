import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import type { Parameter } from '@/types';
import { validateBoundary } from '@/services/costCalculator';
import { formatNumber } from '@/utils/formatters';

interface ParameterCardProps {
  parameter: Parameter;
  delay?: number;
  editable?: boolean;
  onValueChange?: (name: string, value: number) => void;
}

export default function ParameterCard({
  parameter,
  delay = 0,
  editable = false,
  onValueChange,
}: ParameterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const boundary = validateBoundary(parameter);
  const isOutOfBounds = !boundary.valid;

  const range = parameter.maxBoundary - parameter.minBoundary;
  const position = ((parameter.value - parameter.minBoundary) / range) * 100;
  const clampedPosition = Math.max(0, Math.min(100, position));

  return (
    <motion.div
      className={`card ${isOutOfBounds ? 'border-red-500/50 animate-breathe' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div 
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{parameter.name}</h3>
              {isOutOfBounds && (
                <span className="badge badge-error">
                  <AlertTriangle className="w-3 h-3" />
                  超出边界
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{parameter.description}</p>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors ml-4">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          {editable ? (
            <input
              type="number"
              value={parameter.value}
              onChange={(e) => onValueChange?.(parameter.name, Number(e.target.value))}
              className="text-2xl font-bold text-white font-mono-display bg-transparent border-b border-slate-600 focus:border-blue-500 outline-none w-32"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-2xl font-bold text-white font-mono-display animate-number-scroll">
              {formatNumber(parameter.value)}
            </span>
          )}
          <span className="text-sm text-slate-500">{parameter.unit}</span>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{parameter.minBoundary}{parameter.unit}</span>
            <span>边界范围</span>
            <span>{parameter.maxBoundary}{parameter.unit}</span>
          </div>
          <div className="progress-bar relative">
            <div 
              className="absolute left-0 top-0 h-full bg-slate-700 rounded-full"
              style={{ width: '100%' }}
            />
            <div
              className={`progress-fill absolute top-0 left-0 ${
                isOutOfBounds ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${clampedPosition}%` }}
            />
            {isOutOfBounds && position > 100 && (
              <div className="absolute right-0 top-0 h-full w-1 bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="pt-4 border-t border-slate-700/50 mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-1">计算公式</p>
              <code className="formula-node text-blue-300">{parameter.formula}</code>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-slate-500">数据来源</p>
              <p className="text-slate-300">{parameter.source}</p>
            </div>
            <div>
              <p className="text-slate-500">当前状态</p>
              <p className={isOutOfBounds ? 'text-red-400' : 'text-emerald-400'}>
                {isOutOfBounds ? boundary.message : '正常范围内'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
