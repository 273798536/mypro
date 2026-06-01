import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  Settings,
  ArrowRight,
  FileWarning,
} from 'lucide-react';
import type { ContradictionResult } from '@/types';
import { VALVE_NAMES } from '@/data/valveCoefficients';
import { cn, formatNumber } from '@/lib/utils';

interface ContradictionPanelProps {
  contradictions: ContradictionResult[];
}

export const ContradictionPanel: React.FC<ContradictionPanelProps> = ({
  contradictions,
}) => {
  const errors = contradictions.filter(c => c.severity === 'error');
  const warnings = contradictions.filter(c => c.severity === 'warning');

  const getTypeIcon = (type: ContradictionResult['type']) => {
    switch (type) {
      case 'diameter_flow_mismatch':
        return <AlertTriangle className="w-4 h-4" />;
      case 'segment_inconsistent':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unit_error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'branch_missing':
        return <FileWarning className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeName = (type: ContradictionResult['type']) => {
    switch (type) {
      case 'diameter_flow_mismatch':
        return '管径-流量不匹配';
      case 'segment_inconsistent':
        return '管路段不一致';
      case 'unit_error':
        return '单位错误';
      case 'branch_missing':
        return '支路数据缺失';
      default:
        return '未知';
    }
  };

  if (contradictions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-card p-6 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-success-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-industrial-text mb-2">无矛盾检测</h3>
        <p className="text-sm text-industrial-textMuted">
          所有参数一致性检查通过，未发现管径-流量不匹配或数据不一致问题
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="tech-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-warning-500/20 rounded">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
          </div>
          <div>
            <h3 className="font-semibold text-industrial-text">矛盾与警告</h3>
            <p className="text-xs text-industrial-textMuted">
              {errors.length} 项错误 | {warnings.length} 项警告
            </p>
          </div>
        </div>
        {errors.length > 0 && (
          <div className="animate-pulse text-xs px-2 py-1 bg-danger-500/20 text-danger-400 border border-danger-500/50 rounded">
            需要关注
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {contradictions.map((contradiction, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'p-4 rounded border',
              contradiction.severity === 'error'
                ? 'bg-danger-500/10 border-danger-500/50 danger-glow'
                : 'bg-warning-500/10 border-warning-500/50 warning-glow'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-1.5 rounded mt-0.5',
                contradiction.severity === 'error'
                  ? 'bg-danger-500/20 text-danger-400'
                  : 'bg-warning-500/20 text-warning-400'
              )}>
                {getTypeIcon(contradiction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded font-medium',
                    contradiction.severity === 'error'
                      ? 'bg-danger-500/30 text-danger-400'
                      : 'bg-warning-500/30 text-warning-400'
                  )}>
                    {getTypeName(contradiction.type)}
                  </span>
                  <span className="text-xs text-industrial-textMuted">
                    {contradiction.severity === 'error' ? '错误' : '警告'}
                  </span>
                </div>
                <p className="text-sm text-industrial-text mb-3">
                  {contradiction.message}
                </p>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-primary-900/30 rounded text-xs">
                      <div className="text-industrial-textMuted mb-1">检测值 A</div>
                      <div className="font-mono text-industrial-text">
                        {contradiction.evidence.fieldA.name}: {formatNumber(contradiction.evidence.fieldA.value)} {contradiction.evidence.fieldA.unit}
                      </div>
                    </div>
                    {contradiction.evidence.fieldB && (
                      <div className="p-2 bg-primary-900/30 rounded text-xs">
                        <div className="text-industrial-textMuted mb-1">检测值 B</div>
                        <div className="font-mono text-industrial-text">
                          {contradiction.evidence.fieldB.name}: {formatNumber(contradiction.evidence.fieldB.value)} {contradiction.evidence.fieldB.unit}
                        </div>
                      </div>
                    )}
                  </div>

                  {contradiction.evidence.valveSnapshot && (
                    <div className="p-3 bg-primary-900/30 rounded border border-primary-700/30">
                      <div className="flex items-center gap-2 text-xs text-industrial-textMuted mb-2">
                        <Settings className="w-3.5 h-3.5" />
                        <span>阀门状态快照（已留存证据）</span>
                        <Clock className="w-3.5 h-3.5 ml-auto" />
                        <span className="font-mono">
                          {new Date(contradiction.evidence.valveSnapshot.snapshotTimestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-industrial-textMuted">类型: </span>
                          <span className="font-mono text-industrial-text">
                            {VALVE_NAMES[contradiction.evidence.valveSnapshot.valveType]}
                          </span>
                        </div>
                        <div>
                          <span className="text-industrial-textMuted">开度: </span>
                          <span className="font-mono text-warning-400">
                            {contradiction.evidence.valveSnapshot.openingPercentage}%
                          </span>
                        </div>
                        <div>
                          <span className="text-industrial-textMuted">半开: </span>
                          <span className={cn(
                            'font-mono',
                            contradiction.evidence.valveSnapshot.isHalfOpen
                              ? 'text-warning-400'
                              : 'text-success-400'
                          )}>
                            {contradiction.evidence.valveSnapshot.isHalfOpen ? '是' : '否'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-2 bg-success-500/10 border border-success-500/30 rounded text-xs">
                    <Info className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-success-400 font-medium">建议: </span>
                      <span className="text-industrial-textMuted">
                        {contradiction.evidence.suggestion}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
