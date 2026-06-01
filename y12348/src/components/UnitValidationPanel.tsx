import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Info,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import type { UnitValidationResult } from '@/types';
import { cn } from '@/lib/utils';
import { useCalculationStore } from '@/store/calculationStore';
import { validateUnits } from '@/utils/unitConverter';

interface UnitValidationPanelProps {
  showLive?: boolean;
}

export const UnitValidationPanel: React.FC<UnitValidationPanelProps> = ({
  showLive = true,
}) => {
  const { session, selectedPressureUnit, addEvidenceSnapshot } = useCalculationStore();

  const validations = showLive
    ? validateUnits(
        session.mainSegments,
        session.totalFlowRate,
        session.flowRateUnit,
        session.fluid,
        session.mainValve,
        session.branches
      )
    : (session.results?.unitValidations || []);

  const errors = validations.filter(v => v.errorType === 'invalid' || v.errorType === 'inconsistent');
  const warnings = validations.filter(v => v.errorType === 'suspicious');
  const hasIssues = errors.length > 0 || warnings.length > 0;

  const handleApplySuggestion = (validation: UnitValidationResult) => {
    if (!validation.suggestedUnit) return;

    const fieldParts = validation.field.split('.');
    const segmentName = fieldParts[0];
    const fieldName = fieldParts[1];

    const beforeState: Record<string, unknown> = {
      field: validation.field,
      value: validation.value,
      unit: validation.currentUnit,
    };

    const afterState: Record<string, unknown> = {
      field: validation.field,
      value: validation.value,
      unit: validation.suggestedUnit,
    };

    addEvidenceSnapshot({
      type: 'unit_correction',
      description: `单位修正: ${validation.field} 从 ${validation.currentUnit} 改为 ${validation.suggestedUnit}`,
      beforeState,
      afterState,
      timestamp: Date.now(),
    });
  };

  const getSeverityIcon = (type: UnitValidationResult['errorType']) => {
    switch (type) {
      case 'invalid':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'inconsistent':
        return <XCircle className="w-4 h-4 text-danger-500" />;
      case 'suspicious':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-success-500" />;
    }
  };

  const getSeverityClass = (type: UnitValidationResult['errorType']) => {
    switch (type) {
      case 'invalid':
      case 'inconsistent':
        return 'border-danger-500/50 bg-danger-500/10';
      case 'suspicious':
        return 'border-warning-500/50 bg-warning-500/10';
      default:
        return 'border-success-500/50 bg-success-500/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="tech-card p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded',
            hasIssues ? 'bg-warning-500/20' : 'bg-success-500/20'
          )}>
            {hasIssues ? (
              <AlertTriangle className={cn(
                'w-5 h-5',
                errors.length > 0 ? 'text-danger-500' : 'text-warning-500'
              )} />
            ) : (
              <CheckCircle className="w-5 h-5 text-success-500" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-industrial-text">单位校验</h3>
            <p className="text-xs text-industrial-textMuted">
              {errors.length} 项错误 | {warnings.length} 项警告
            </p>
          </div>
        </div>
        {showLive && hasIssues && (
          <div className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded animate-pulse">
            实时校验中
          </div>
        )}
      </div>

      {!hasIssues ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
          <p className="text-industrial-textMuted">所有单位校验通过</p>
          <p className="text-xs text-industrial-textMuted/70 mt-1">
            未发现疑似单位错误或不一致
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {validations.map((validation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'p-3 rounded border',
                getSeverityClass(validation.errorType)
              )}
            >
              <div className="flex items-start gap-2">
                {getSeverityIcon(validation.errorType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-industrial-text">
                      {validation.field}
                    </span>
                    <span className="text-industrial-textMuted">
                      {validation.value} {validation.currentUnit}
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-industrial-textMuted">
                    {validation.message}
                  </p>
                  
                  {validation.suggestedUnit && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleApplySuggestion(validation)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        改为 {validation.value} {validation.suggestedUnit}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <span className="text-xs text-industrial-textMuted/70">
                        (置信度: {(validation.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!showLive && session.results?.evidenceChain && session.results.evidenceChain.length > 0 && (
        <div className="mt-4 pt-4 border-t border-industrial-border">
          <h4 className="text-sm font-medium text-industrial-text mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-400" />
            证据链记录
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {session.results.evidenceChain
              .filter(e => e.type === 'unit_correction')
              .map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="p-2 bg-primary-900/30 rounded text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-industrial-text">{snapshot.description}</span>
                    <span className="font-mono text-industrial-textMuted">
                      {new Date(snapshot.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-industrial-textMuted">
                    <span className="font-mono">
                      {JSON.stringify(snapshot.beforeState)}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-mono">
                      {JSON.stringify(snapshot.afterState)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
