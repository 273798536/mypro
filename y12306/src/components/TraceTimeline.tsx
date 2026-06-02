import React from 'react';
import { CheckCircle, AlertTriangle, Settings, Lightbulb } from 'lucide-react';
import { TraceLog, TraceLogType } from '../types';
import { cn } from '@/lib/utils';

interface TraceTimelineProps {
  logs: TraceLog[];
  className?: string;
}

const logTypeConfig: Record<TraceLogType, { icon: React.ElementType; color: string; bgColor: string }> = {
  constraint: { icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  decision: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  conflict: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  resolution: { icon: Lightbulb, color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ logs, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {logs.map((log, index) => {
        const config = logTypeConfig[log.type];
        const Icon = config.icon;

        return (
          <div key={index} className="relative flex gap-4">
            {index < logs.length - 1 && (
              <div
                className="absolute left-5 top-10 w-0.5 h-full bg-slate-200"
                style={{ height: 'calc(100% + 16px)' }}
              />
            )}

            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10',
                config.bgColor
              )}
            >
              <Icon className={cn('w-5 h-5', config.color)} />
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-400 font-mono">
                  步骤 {log.step}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700">{log.description}</p>
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                  {Object.entries(log.details).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-slate-400">{key}:</span>
                      <span className="font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
