import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Gauge, AlertTriangle } from 'lucide-react';
import type { ValveConfig, ValveType } from '@/types';
import { VALVE_NAMES, VALVE_COEFFICIENTS } from '@/data/valveCoefficients';
import { TechSelect, TechInput } from './common/TechInput';
import { cn } from '@/lib/utils';

interface ValveControlProps {
  valve: ValveConfig;
  onChange: (updates: Partial<ValveConfig>) => void;
  title?: string;
  showEvidence?: boolean;
}

export const ValveControl: React.FC<ValveControlProps> = ({
  valve,
  onChange,
  title = '阀门控制',
  showEvidence = true,
}) => {
  const valveTypes: { value: ValveType; label: string }[] = [
    { value: 'gate', label: VALVE_NAMES.gate },
    { value: 'globe', label: VALVE_NAMES.globe },
    { value: 'ball', label: VALVE_NAMES.ball },
    { value: 'butterfly', label: VALVE_NAMES.butterfly },
    { value: 'check', label: VALVE_NAMES.check },
  ];

  const currentK = VALVE_COEFFICIENTS[valve.valveType].openingCurve(valve.openingPercentage);
  const isHalfOpenWarning = valve.isHalfOpen && valve.openingPercentage < 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="tech-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-800 rounded">
            <Settings className="w-5 h-5 text-primary-400" />
          </div>
          <h3 className="font-semibold text-industrial-text">{title}</h3>
        </div>
        {isHalfOpenWarning && (
          <div className="flex items-center gap-1 px-2 py-1 bg-warning-500/20 border border-warning-500/50 rounded text-warning-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>半开状态</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TechSelect
          label="阀门类型"
          value={valve.valveType}
          onChange={(e) => onChange({ valveType: e.target.value as ValveType })}
          options={valveTypes}
          prefix={<Settings className="w-4 h-4" />}
        />

        <div className="space-y-1">
          <label className="tech-label flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              阀门开度
            </span>
            <span className="font-mono text-primary-400">
              {valve.openingPercentage}%
            </span>
          </label>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={valve.openingPercentage}
              onChange={(e) => onChange({ openingPercentage: Number(e.target.value) })}
              className="w-full h-2 bg-primary-900 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between mt-1 text-xs text-industrial-textMuted font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onChange({ openingPercentage: 50 })}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs rounded border transition-all',
                valve.openingPercentage === 50
                  ? 'bg-warning-500/20 border-warning-500 text-warning-400'
                  : 'bg-industrial-surface border-industrial-border text-industrial-textMuted hover:border-warning-500/50 hover:text-warning-400'
              )}
            >
              半开 (50%)
            </button>
            <button
              onClick={() => onChange({ openingPercentage: 100 })}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs rounded border transition-all',
                valve.openingPercentage === 100
                  ? 'bg-success-500/20 border-success-500 text-success-400'
                  : 'bg-industrial-surface border-industrial-border text-industrial-textMuted hover:border-success-500/50 hover:text-success-400'
              )}
            >
              全开 (100%)
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-primary-900/30 rounded border border-industrial-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-industrial-textMuted">当前阻力系数 Kv</span>
          <span className="font-mono text-primary-400">{currentK.toFixed(4)}</span>
        </div>
        {showEvidence && (
          <div className="mt-2 pt-2 border-t border-industrial-border">
            <div className="text-xs text-industrial-textMuted">
              <div className="flex justify-between">
                <span>状态快照时间</span>
                <span className="font-mono text-industrial-text">
                  {new Date(valve.snapshotTimestamp).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span>半开标记</span>
                <span className={cn(
                  'font-mono',
                  valve.isHalfOpen ? 'text-warning-400' : 'text-success-400'
                )}>
                  {valve.isHalfOpen ? '是 (已留存证据)' : '否'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: #1E88E5;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #64B5F6;
          box-shadow: 0 0 10px rgba(30, 136, 229, 0.5);
          transition: all 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(30, 136, 229, 0.8);
        }
      `}</style>
    </motion.div>
  );
};
