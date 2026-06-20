import React from 'react';
import type { FailureLog, FailureGroup, TrainingTask } from '@/types';
import { formatShortTime } from '@/utils/time';
import { AlertTriangle, Zap } from 'lucide-react';

interface Props {
  group: FailureGroup;
  logs: FailureLog[];
  task: TrainingTask;
  selected: boolean;
  taskColor: string;
  onSelectLog: (logId: string) => void;
}

const levelStyle = {
  critical: { color: 'bg-danger', text: 'text-danger', label: '严重' },
  error: { color: 'bg-[#f97316]', text: 'text-[#f97316]', label: '错误' },
  warning: { color: 'bg-amber', text: 'text-amber', label: '警告' }
};

export const FailureLane: React.FC<Props> = ({ group, logs, task, selected, taskColor, onSelectLog }) => {
  const startTime = logs.length > 0 ? new Date(logs[0].occurTime).getTime() : 0;
  const endTime = logs.length > 0 ? new Date(logs[logs.length - 1].occurTime).getTime() : startTime;
  const duration = Math.max(endTime - startTime, 60000);
  const laneStart = new Date(task.startTime).getTime();
  const taskEnd = task.endTime ? new Date(task.endTime).getTime() : laneStart + duration;
  const taskDuration = Math.max(taskEnd - laneStart, duration);
  const laneDuration = taskDuration * 1.2;

  return (
    <div className={`relative rounded-xl p-4 border transition-all duration-200 ${
      selected ? 'border-amber/50 bg-elevated/60 glow-ring-amber' : 'border-border-default bg-surface hover:bg-hover/40'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${taskColor} animate-pulse-amber`} />
          <div>
            <div className="font-mono text-[12px] font-bold text-primary">{task.taskName}</div>
            <div className="text-[10px] text-muted">{group.status.toUpperCase()} · {logs.length} 条日志</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
          {logs.map(l => (
            <span key={l.id} className={`chip ${levelStyle[l.level].text}`} style={{ borderColor: 'currentColor', opacity: 0.5 }}>
              {levelStyle[l.level].label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-20 rounded-lg bg-root/60 border border-border-default overflow-hidden">
        <div className="absolute inset-y-0 left-0 right-0 bg-grid-fade opacity-40" />
        <div
          className="absolute top-3 h-14 rounded-md border opacity-60"
          style={{
            left: `${Math.max(((startTime - laneStart) / laneDuration) * 100, 2)}%`,
            width: `${Math.max(((duration) / laneDuration) * 100, 8)}%`,
            background: `linear-gradient(90deg, ${taskColor}22, ${taskColor}44)`,
            borderColor: taskColor
          }}
        />
        {logs.map((log, idx) => {
          const relTime = new Date(log.occurTime).getTime() - laneStart;
          const left = `${Math.min((relTime / laneDuration) * 100, 95)}%`;
          return (
            <button
              key={log.id}
              onClick={() => onSelectLog(log.id)}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left }}
            >
              <div className={`relative w-4 h-4 rounded-full border-2 ${levelStyle[log.level].color} -translate-x-1/2 ${
                selected ? 'animate-pulse-amber' : 'group-hover:scale-150'
              } transition-transform duration-200`}>
                <AlertTriangle className="w-2 h-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />
              </div>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                <div className="bg-elevated border border-border-emphasis rounded-md px-2.5 py-1.5 shadow-xl">
                  <div className="text-[10px] font-mono text-muted mb-0.5">{formatShortTime(log.occurTime)}</div>
                  <div className={`text-[11px] font-semibold ${levelStyle[log.level].text} max-w-[240px] truncate`}>
                    {log.message}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {group.causalChain.map((link, idx) => {
          const fromRel = new Date(logs.find(l => l.id === link.from)?.occurTime || '').getTime() - laneStart;
          const toRel = new Date(logs.find(l => l.id === link.to)?.occurTime || '').getTime() - laneStart;
          const left1 = `${Math.min((fromRel / laneDuration) * 100, 95)}%`;
          const left2 = `${Math.min((toRel / laneDuration) * 100, 95)}%`;
          return (
            <div
              key={`link-${idx}`}
              className="absolute top-4 h-[2px] animate-stroke-path"
              style={{
                left: left1,
                width: `calc(${left2} - ${left1})`,
                background: `linear-gradient(90deg, ${taskColor}, transparent)`,
                opacity: 0.5
              }}
            >
              <div className="absolute -top-1 right-0 text-amber">
                <Zap className="w-3 h-3" strokeWidth={2.5} />
              </div>
            </div>
          );
        })}
        <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[9px] font-mono text-muted/70">
          <span>{formatShortTime(task.startTime)}</span>
          <span>{task.endTime ? formatShortTime(task.endTime) : '进行中'}</span>
        </div>
      </div>
    </div>
  );
};
