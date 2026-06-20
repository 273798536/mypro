import React, { useEffect, useState } from 'react';
import {
  Clock, FileCheck, Download, Search, FilterX,
  Database, Tag, SlidersHorizontal, UserPen, BarChart3, AlertTriangle, Puzzle,
  FileText, CheckCircle2, AlertOctagon
} from 'lucide-react';
import { CardShell } from '@/components/layout/CardShell';
import { TimelineAxis } from '@/components/timeline/TimelineAxis';
import { ConsistencyBadge } from '@/components/timeline/ConsistencyBadge';
import { useTimelineStore } from '@/stores/timelineStore';
import { useExportStore } from '@/stores/exportStore';
import type { EventType, TimelineEvent } from '@/types';
import { formatTime } from '@/utils/time';

const typeFilters: { key: EventType; label: string; Icon: React.ElementType; color: string }[] = [
  { key: 'sample', label: '样本', Icon: Database, color: 'text-info' },
  { key: 'version', label: '版本', Icon: Tag, color: 'text-[#a855f7]' },
  { key: 'threshold', label: '阈值', Icon: SlidersHorizontal, color: 'text-[#ec4899]' },
  { key: 'correction', label: '人工修正', Icon: UserPen, color: 'text-amber' },
  { key: 'metric', label: '指标', Icon: BarChart3, color: 'text-emerald' },
  { key: 'failure', label: '失败/备注', Icon: AlertTriangle, color: 'text-danger' },
  { key: 'feature', label: '特征', Icon: Puzzle, color: 'text-[#f97316]' }
];

const TimelinePage: React.FC = () => {
  const tStore = useTimelineStore();
  const eStore = useExportStore();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    tStore.init();
  }, []);

  const toggleFilter = (t: EventType) => {
    const has = tStore.typeFilter.includes(t);
    tStore.setTypeFilter(has ? tStore.typeFilter.filter(x => x !== t) : [...tStore.typeFilter, t]);
  };

  const exportFile = (format: 'csv' | 'json') => {
    eStore.exportTimeline(format, tStore.filteredEvents, tStore.consistencyReport);
  };

  const report = tStore.consistencyReport;

  return (
    <div className="p-8 space-y-5 max-w-[1600px] mx-auto">
      <CardShell
        accent="emerald"
        title={<div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-emerald" strokeWidth={2} />历史时间线 · 完整链路追踪</div>}
        subtitle="样本入库 → 版本发布 → 阈值调整 → 人工修正 → 指标发布 → 失败事件，串联为完整可追溯链路"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => tStore.runCheck()}
              disabled={tStore.isChecking}
              className="btn-operate !text-[11px] !py-1.5 !px-3"
            >
              <FileCheck className="w-3.5 h-3.5" strokeWidth={2} />
              {tStore.isChecking ? '校验中...' : '一致性校验'}
            </button>
            <button onClick={() => exportFile('csv')} disabled={eStore.isExporting} className="btn-operate !text-[11px] !py-1.5 !px-3">
              <FileText className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => exportFile('json')} disabled={eStore.isExporting} className="btn-operate !text-[11px] !py-1.5 !px-3">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        }
      >
        {eStore.isExporting && (
          <div className="mb-5 rounded-lg bg-info/10 border border-info/40 p-3 flex items-center gap-3 animate-stagger-in">
            <div className="w-full max-w-sm h-1.5 rounded-full bg-root overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-info to-emerald transition-all duration-100"
                style={{ width: `${eStore.exportProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-secondary">导出进度 {eStore.exportProgress}%</span>
          </div>
        )}

        {report && (
          <div className={`mb-5 rounded-xl p-4 flex items-start justify-between gap-4 animate-stagger-in ${
            report.inconsistent > 0
              ? 'bg-danger/10 border border-danger/40 glow-ring-red'
              : 'bg-emerald/10 border border-emerald/40 glow-ring-emerald'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${report.inconsistent > 0 ? 'bg-danger/20' : 'bg-emerald/20'}`}>
                {report.inconsistent > 0
                  ? <AlertOctagon className="w-5 h-5 text-danger" strokeWidth={2} />
                  : <CheckCircle2 className="w-5 h-5 text-emerald animate-draw-check" strokeWidth={2.5} />}
              </div>
              <div>
                <div className={`text-[14px] font-bold ${report.inconsistent > 0 ? 'text-danger' : 'text-emerald'}`}>
                  一致性校验报告
                </div>
                <div className="text-[11px] text-secondary mt-0.5">{report.summary}</div>
                {report.inconsistentIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.inconsistentIds.map(id => (
                      <span key={id} className="chip !text-[10px] text-danger bg-danger/15 border-danger/40">
                        REF: {id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ConsistencyBadge status="consistent" />
              <span className="text-[11px] text-muted font-mono">x {report.consistent}</span>
              {report.inconsistent > 0 && (
                <>
                  <div className="w-px h-5 bg-border-default mx-1" />
                  <ConsistencyBadge status="inconsistent" />
                  <span className="text-[11px] text-muted font-mono">x {report.inconsistent}</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {typeFilters.map(f => {
              const active = tStore.typeFilter.includes(f.key);
              const Icon = f.Icon;
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={`chip !py-1 !px-2.5 transition-all ${
                    active
                      ? `${f.color} bg-current/10 border-current/40`
                      : 'text-muted hover:text-secondary'
                  }`}
                >
                  <Icon className="w-3 h-3" strokeWidth={2} />
                  {f.label}
                </button>
              );
            })}
            {tStore.typeFilter.length > 0 && (
              <button
                onClick={() => tStore.setTypeFilter([])}
                className="chip !py-1 !px-2.5 text-muted hover:text-secondary"
              >
                <FilterX className="w-3 h-3" strokeWidth={2} /> 清除筛选
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
            <input
              placeholder="搜索标题..."
              className="w-56 h-8 pl-8 pr-3 rounded-lg bg-elevated border border-border-default text-[11px] text-primary placeholder:text-muted focus:outline-none focus:border-emerald/40"
            />
          </div>
        </div>

        <div className="relative px-2">
          <TimelineAxis events={tStore.filteredEvents} onSelect={setSelectedEvent} />
        </div>
      </CardShell>

      {selectedEvent && (
        <CardShell
          accent="info"
          title={<div className="flex items-center gap-2"><Search className="w-4 h-4 text-info" />事件详情 · {selectedEvent.refId}</div>}
          subtitle="页面状态与底层文件记录对比"
          actions={<button onClick={() => setSelectedEvent(null)} className="btn-operate !py-1.5 !px-3 !text-[11px]">关闭</button>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">基本信息</div>
              <div className="data-grid text-[12px]">
                <div className="grid grid-cols-2 divide-x divide-border-default">
                  <div className="p-3"><div className="text-muted text-[10px] mb-0.5">事件类型</div><div className="font-semibold text-primary">{selectedEvent.eventType}</div></div>
                  <div className="p-3"><div className="text-muted text-[10px] mb-0.5">发生时间</div><div className="font-mono text-primary">{formatTime(selectedEvent.eventTime)}</div></div>
                  <div className="p-3 col-span-2"><div className="text-muted text-[10px] mb-0.5">标题</div><div className="font-semibold text-primary">{selectedEvent.title}</div></div>
                  <div className="p-3 col-span-2"><div className="text-muted text-[10px] mb-0.5">描述</div><div className="text-secondary">{selectedEvent.description}</div></div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2">状态一致性（导出前必查）</div>
              <div className="rounded-xl bg-root border border-border-default p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted">页面显示状态 hash</span>
                  <span className="font-mono text-[11px] text-primary">{selectedEvent.pageStatusHash.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted">底层文件记录 hash</span>
                  <span className="font-mono text-[11px] text-primary">{selectedEvent.fileStatusHash.slice(0, 8)}...</span>
                </div>
                <div className="h-px bg-border-default" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-primary">一致性结论</span>
                  <ConsistencyBadge status={selectedEvent.isConsistent} />
                </div>
                {selectedEvent.isConsistent !== 'consistent' && (
                  <div className="rounded-lg p-3 bg-danger/10 border border-danger/30 text-[11px] text-danger">
                    ⚠ 页面显示与底层文件记录不一致，导出前请人工复核此条记录。不一致将被写入导出文件的校验报告。
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardShell>
      )}

      {eStore.lastExportLog && (
        <div className="fixed bottom-6 right-6 z-40 animate-stagger-in">
          <div className="rounded-xl bg-emerald/15 border border-emerald/40 glow-ring-emerald px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald animate-draw-check" strokeWidth={2.5} />
            <div>
              <div className="text-[12px] font-semibold text-emerald">导出完成</div>
              <div className="text-[10px] text-secondary">{eStore.lastExportLog}</div>
            </div>
            <button onClick={eStore.clearLog} className="ml-2 text-muted hover:text-primary text-[11px]">×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
