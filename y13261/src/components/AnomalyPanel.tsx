import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import type { Anomaly } from '@/types';
import { cn } from '@/lib/utils';

interface AnomalyPanelProps {
  anomalies: Anomaly[];
  onResolve?: (anomalyId: string) => void;
  onStepClick?: (stepIndex: number) => void;
}

function AnomalyCard({
  anomaly,
  onResolve,
  onStepClick,
}: {
  anomaly: Anomaly;
  onResolve?: () => void;
  onStepClick?: (stepIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    onStepClick?.(index);
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        anomaly.resolved
          ? 'border-steel-100 bg-steel-50/50'
          : 'border-warning-200 bg-warning-50/30'
      )}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {anomaly.resolved ? (
              <CheckCircle
                size={20}
                className="text-success-500 flex-shrink-0 mt-0.5"
              />
            ) : (
              <AlertTriangle
                size={20}
                className="text-warning-500 flex-shrink-0 mt-0.5"
              />
            )}
            <div className="flex-1">
              <h4
                className={cn(
                  'font-medium text-sm',
                  anomaly.resolved ? 'text-steel-500' : 'text-steel-700'
                )}
              >
                {anomaly.title}
              </h4>
              <p className="text-xs text-steel-500 mt-1 line-clamp-2">
                {anomaly.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!anomaly.resolved && (
              <span className="px-2 py-0.5 bg-warning-500 text-white text-xs rounded">
                待处理
              </span>
            )}
            {expanded ? (
              <ChevronDown size={18} className="text-steel-400" />
            ) : (
              <ChevronRight size={18} className="text-steel-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          <div className="pt-2 border-t border-warning-100">
            <div className="text-xs text-steel-400 mb-2">影响说明</div>
            <p className="text-sm text-steel-600 leading-relaxed">
              {anomaly.impact}
            </p>
          </div>

          <div>
            <div className="text-xs text-steel-400 mb-3 flex items-center gap-2">
              <ArrowRight size={12} />
              下一步操作建议
            </div>
            <div className="space-y-2">
              {anomaly.nextSteps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => handleStepClick(index)}
                  className={cn(
                    'w-full text-left p-3 rounded-md text-sm transition-all flex items-start gap-3',
                    currentStep === index
                      ? 'bg-primary-50 border border-primary-200 text-primary-700'
                      : 'bg-white border border-steel-100 text-steel-600 hover:border-primary-200 hover:bg-primary-50/50'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5',
                      currentStep === index
                        ? 'bg-primary-500 text-white'
                        : 'bg-steel-100 text-steel-500'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{step}</span>
                  <ChevronRight
                    size={16}
                    className={cn(
                      'flex-shrink-0 mt-0.5',
                      currentStep === index
                        ? 'text-primary-500'
                        : 'text-steel-300'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {!anomaly.resolved && onResolve && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              className="w-full py-2 bg-success-500 hover:bg-success-600 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              标记为已处理
            </button>
          )}

          {anomaly.resolved && anomaly.resolvedAt && (
            <div className="text-xs text-steel-400 text-center pt-2">
              已于 {anomaly.resolvedAt} 处理完成
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnomalyPanel({
  anomalies,
  onResolve,
  onStepClick,
}: AnomalyPanelProps) {
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle size={32} className="text-success-300 mx-auto mb-2" />
        <p className="text-sm text-steel-400">暂无异常</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning-500" />
          <span className="text-sm font-medium text-steel-700">异常提醒</span>
        </div>
        {unresolvedCount > 0 && (
          <span className="px-2 py-0.5 bg-warning-100 text-warning-600 text-xs rounded">
            {unresolvedCount} 项待处理
          </span>
        )}
      </div>

      <div className="space-y-3">
        {anomalies.map((anomaly) => (
          <AnomalyCard
            key={anomaly.id}
            anomaly={anomaly}
            onResolve={() => onResolve?.(anomaly.id)}
            onStepClick={onStepClick}
          />
        ))}
      </div>
    </div>
  );
}
