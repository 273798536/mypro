import React from 'react';
import { X, FileCode, Database, Tag, UserPen, Clock } from 'lucide-react';
import type { FailureLog, TrainingTask, SampleRecord } from '@/types';
import { formatTime } from '@/utils/time';

interface Props {
  log: FailureLog | null;
  task?: TrainingTask;
  samples?: SampleRecord[];
  onClose: () => void;
}

const levelColor: Record<string, string> = {
  critical: 'bg-danger/20 text-danger border-danger/40',
  error: 'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/40',
  warning: 'bg-amber/20 text-amber border-amber/40'
};

export const LogDetailDrawer: React.FC<Props> = ({ log, task, samples = [], onClose }) => {
  const open = !!log;
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-[520px] bg-surface border-l border-border-default z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {log && (
          <>
            <header className="px-6 py-4 border-b border-border-default flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${levelColor[log.level]}`}>
                    {log.level}
                  </span>
                  <span className="text-[10px] font-mono text-muted">LOG_ID {log.id}</span>
                </div>
                <h3 className="text-[14px] font-bold text-primary leading-snug">{log.message}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-elevated border border-border-default flex items-center justify-center text-secondary hover:text-primary hover:border-border-emphasis transition-all shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <section>
                <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <Clock className="w-3 h-3" /> 时间信息
                </div>
                <div className="data-grid text-[12px]">
                  <div className="grid grid-cols-2 divide-x divide-border-default">
                    <div className="p-3"><div className="text-muted text-[10px] mb-0.5">发生时间</div><div className="font-mono text-primary">{formatTime(log.occurTime)}</div></div>
                    <div className="p-3"><div className="text-muted text-[10px] mb-0.5">任务状态</div><div className="text-primary">{task?.status || 'unknown'}</div></div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <FileCode className="w-3 h-3" /> 堆栈追踪
                </div>
                <div className="rounded-lg bg-root border border-border-default p-4 overflow-hidden">
                  <div className="absolute inset-x-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-amber/30 to-transparent pointer-events-none" style={{ position: 'relative' }} />
                  <pre className="font-mono text-[11px] leading-relaxed text-secondary whitespace-pre-wrap">{log.stackTrace}</pre>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <Tag className="w-3 h-3" /> 关联任务
                </div>
                {task && (
                  <div className="rounded-lg bg-elevated/50 border border-border-default p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-[12px] font-bold text-primary">{task.taskName}</div>
                      <span className="chip text-amber">{task.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div><span className="text-muted">批次:</span> <span className="text-secondary font-mono">{task.sampleBatchId}</span></div>
                      <div><span className="text-muted">版本:</span> <span className="text-secondary font-mono">{task.versionId}</span></div>
                      <div><span className="text-muted">开始:</span> <span className="text-secondary font-mono">{formatShort(task.startTime)}</span></div>
                      <div><span className="text-muted">结束:</span> <span className="text-secondary font-mono">{task.endTime ? formatShort(task.endTime) : '-'}</span></div>
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <Database className="w-3 h-3" /> 关联样本
                </div>
                {log.relatedSampleIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {log.relatedSampleIds.map(sid => {
                      const s = samples.find(x => x.id === sid || x.batchId === sid.split('_').slice(0, 3).join('_'));
                      return (
                        <div key={sid} className="chip text-info" style={{ borderColor: 'rgba(59,130,246,0.5)' }}>
                          {sid}
                          {s && <span className="text-muted ml-1">×{s.count}</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted">无关联样本ID</div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <UserPen className="w-3 h-3" /> 人工修正记录
                </div>
                <div className="rounded-lg border border-dashed border-border-emphasis p-4 bg-elevated/30">
                  <div className="text-[11px] text-muted mb-2">点击主线分组后查看此失败节点的人工修正与公示备注</div>
                </div>
              </section>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

function formatShort(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
