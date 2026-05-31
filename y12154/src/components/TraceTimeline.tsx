import React from 'react';
import {
  Building2,
  FileText,
  Filter,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { DataTrace, TraceStep } from '../types';
import { TRACE_STEP_LABELS, ABNORMAL_LEVEL_COLORS } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';
import { Card } from './ui/Card';

const stepIcons: Record<TraceStep, React.FC<any>> = {
  profile: Building2,
  raw: FileText,
  cleaning: Filter,
  calculation: Calculator,
  threshold: ShieldCheck,
  abnormal: AlertTriangle,
};

const stepColors: Record<TraceStep, string> = {
  profile: 'bg-blue-100 text-blue-700',
  raw: 'bg-slate-100 text-slate-700',
  cleaning: 'bg-amber-100 text-amber-700',
  calculation: 'bg-emerald-100 text-emerald-700',
  threshold: 'bg-indigo-100 text-indigo-700',
  abnormal: 'bg-red-100 text-red-700',
};

interface TraceTimelineProps {
  traces: DataTrace[];
  onStepClick?: (trace: DataTrace) => void;
  activeStep?: TraceStep;
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({
  traces,
  onStepClick,
  activeStep,
}) => {
  const steps: TraceStep[] = ['profile', 'raw', 'cleaning', 'calculation', 'threshold', 'abnormal'];

  const getTraceForStep = (step: TraceStep) => {
    return traces.find(t => t.traceStep === step);
  };

  return (
    <div className="relative">
      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200" />
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const trace = getTraceForStep(step);
          const Icon = stepIcons[step];
          const isActive = activeStep === step;
          const hasData = !!trace;

          return (
            <div
              key={step}
              className={`relative flex items-start space-x-4 p-4 rounded-lg transition-all cursor-pointer ${
                isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
              }`}
              onClick={() => trace && onStepClick?.(trace)}
            >
              <div
                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${
                  hasData ? stepColors[step] : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {TRACE_STEP_LABELS[step]}
                  </h4>
                  {trace && (
                    <span className="text-xs text-slate-500">
                      {formatDateTime(trace.operatedAt)}
                    </span>
                  )}
                </div>

                {trace ? (
                  <div className="mt-1">
                    <p className="text-sm text-slate-600">{trace.operation}</p>
                    {trace.operator && (
                      <p className="text-xs text-slate-400 mt-1">操作人: {trace.operator}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">暂无数据</p>
                )}

                {trace && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(trace.beforeData).length > 0 && (
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 font-medium mb-1">处理前</p>
                        <pre className="text-slate-700 whitespace-pre-wrap overflow-x-auto font-mono text-[10px]">
                          {JSON.stringify(trace.beforeData, null, 2).slice(0, 200)}
                          {JSON.stringify(trace.beforeData).length > 200 && '...'}
                        </pre>
                      </div>
                    )}
                    {Object.entries(trace.afterData).length > 0 && (
                      <div className="bg-emerald-50 rounded p-2">
                        <p className="text-emerald-600 font-medium mb-1">处理后</p>
                        <pre className="text-emerald-700 whitespace-pre-wrap overflow-x-auto font-mono text-[10px]">
                          {JSON.stringify(trace.afterData, null, 2).slice(0, 200)}
                          {JSON.stringify(trace.afterData).length > 200 && '...'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
