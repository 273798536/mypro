import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GitMerge, FileWarning, Filter, ListTree, UserPen, MessageSquarePlus,
  Eye, ArrowRightLeft
} from 'lucide-react';
import { CardShell } from '@/components/layout/CardShell';
import { FailureLane } from '@/components/failure/FailureLane';
import { LogDetailDrawer } from '@/components/failure/LogDetailDrawer';
import { PublicNoteForm } from '@/components/failure/PublicNoteForm';
import { ConsistencyBadge } from '@/components/timeline/ConsistencyBadge';
import { useFailureStore } from '@/stores/failureStore';
import { mockSamples } from '@/data/sampleData';
import { formatTime } from '@/utils/time';
import type { FailureGroup } from '@/types';

const taskColors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#f97316'];

const FailureQueuePage: React.FC = () => {
  const store = useFailureStore();
  const [activeGroup, setActiveGroup] = useState<FailureGroup | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    store.init();
    if (store.groups.length > 0 && !activeGroup) setActiveGroup(store.groups[0]);
  }, [store.groups.length]);

  const selectedLog = store.logs.find(l => l.id === store.selectedLogId) || null;
  const selectedTask = selectedLog ? store.tasks.find(t => t.id === selectedLog.taskId) : undefined;

  return (
    <div className="p-8 space-y-5 max-w-[1800px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <div className="space-y-5">
          <CardShell
            accent="amber" glow
            title={
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center">
                  <ListTree className="w-4 h-4 text-amber" strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-primary">失败主线拼接视图</span>
                    <span className="chip text-amber">{store.groups.length} 组主线</span>
                    <span className="chip text-muted">{store.logs.length} 条日志</span>
                    <span className="chip text-muted">{store.tasks.length} 个任务</span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">按样本关联和时间窗口自动聚类，泳道内用连线标注因果链</div>
                </div>
              </div>
            }
            actions={
              <div className="flex items-center gap-2">
                <button className="btn-operate !py-1.5 !px-3 !text-[11px]">
                  <Filter className="w-3.5 h-3.5" /> 筛选
                </button>
                <button className="btn-operate !py-1.5 !px-3 !text-[11px]">
                  <GitMerge className="w-3.5 h-3.5" /> 重新聚类
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {store.groups.map((group, idx) => (
                <div key={group.id} className="animate-stagger-in" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setActiveGroup(group)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all ${
                        activeGroup?.id === group.id
                          ? 'bg-amber/15 border border-amber/40'
                          : 'bg-root/50 hover:bg-elevated border border-transparent'
                      }`}
                    >
                      <div className="flex -space-x-1.5">
                        {group.taskIds.slice(0, 3).map((tid, i) => (
                          <div
                            key={tid}
                            className="w-4 h-4 rounded-full border-2 border-surface"
                            style={{ background: taskColors[i % taskColors.length] }}
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-primary truncate">{group.title}</div>
                        <div className="text-[10px] text-muted font-mono">{group.taskIds.join(' · ')}</div>
                      </div>
                      <span className={`chip !text-[10px] ${
                        group.status === 'resolved' ? 'text-emerald' :
                        group.status === 'noted' ? 'text-info' :
                        group.status === 'analyzing' ? 'text-amber' : 'text-muted'
                      }`}>{group.status}</span>
                    </button>
                    <button
                      onClick={() => { setActiveGroup(group); setFormOpen(true); }}
                      className="btn-operate !py-1.5 !px-3 !text-[11px]"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" /> 补公示备注
                    </button>
                  </div>

                  {activeGroup?.id === group.id && (
                    <div className="space-y-3">
                      {group.taskIds.map((tid, i) => {
                        const task = store.tasks.find(t => t.id === tid);
                        const laneLogs = group.logIds
                          .map(lid => store.logs.find(l => l.id === lid)!)
                          .filter(l => l.taskId === tid);
                        if (!task || laneLogs.length === 0) return null;
                        return (
                          <FailureLane
                            key={tid}
                            group={group}
                            logs={laneLogs}
                            task={task}
                            selected={true}
                            taskColor={taskColors[i % taskColors.length]}
                            onSelectLog={store.setSelectedLog}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardShell>

          {activeGroup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CardShell
                accent="amber"
                title={<div className="flex items-center gap-2"><UserPen className="w-4 h-4 text-amber" strokeWidth={2} />人工修正锚点</div>}
                subtitle={`该失败主线已追加 ${store.corrections.filter(c => c.groupId === activeGroup.id).length} 条人工修正`}
              >
                <div className="space-y-3">
                  {store.corrections.filter(c => c.groupId === activeGroup.id).length === 0 ? (
                    <div className="text-center py-8 text-[12px] text-muted border border-dashed border-border-emphasis rounded-xl">
                      暂无修正记录，点击右上角「补公示备注」添加
                    </div>
                  ) : (
                    store.corrections
                      .filter(c => c.groupId === activeGroup.id)
                      .map((cor, idx) => (
                        <div key={cor.id} className="animate-stagger-in rounded-xl bg-root/60 border border-border-default p-4" style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="chip text-amber">修正 #{idx + 1}</span>
                              <span className="text-[10px] font-mono text-muted">{formatTime(cor.createTime)}</span>
                            </div>
                            <span className="text-[11px] text-secondary">操作人: <span className="font-semibold text-primary">{cor.operator}</span></span>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                            <div className="rounded-lg p-3 bg-danger/10 border border-danger/30">
                              <div className="text-[10px] uppercase tracking-wider font-bold text-danger mb-1.5">原判断</div>
                              <div className="text-[12px] text-secondary leading-relaxed">{cor.originalJudgment}</div>
                            </div>
                            <div className="flex items-center justify-center">
                              <ArrowRightLeft className="w-5 h-5 text-amber" strokeWidth={2.5} />
                            </div>
                            <div className="rounded-lg p-3 bg-emerald/10 border border-emerald/30">
                              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald mb-1.5">新判断</div>
                              <div className="text-[12px] text-secondary leading-relaxed">{cor.newJudgment}</div>
                            </div>
                          </div>
                          {cor.reason && <div className="mt-3 p-2.5 rounded-md bg-elevated/50 text-[11px] text-muted">💡 {cor.reason}</div>}
                        </div>
                      ))
                  )}
                </div>
              </CardShell>

              <CardShell
                accent="info"
                title={<div className="flex items-center gap-2"><FileWarning className="w-4 h-4 text-info" strokeWidth={2} />社区公示备注</div>}
                subtitle="对外说明失败处理与判断变更，重点明确改变了哪些结论"
              >
                <div className="space-y-3">
                  {store.notes.filter(n => n.groupId === activeGroup.id).length === 0 ? (
                    <div className="text-center py-8 text-[12px] text-muted border border-dashed border-border-emphasis rounded-xl">
                      暂无公示备注
                    </div>
                  ) : (
                    store.notes
                      .filter(n => n.groupId === activeGroup.id)
                      .map((note, idx) => (
                        <div key={note.id} className="animate-stagger-in rounded-xl bg-info/[0.06] border border-info/30 p-4" style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="chip text-info">备注 #{idx + 1}</span>
                              <span className="text-[10px] font-mono text-muted">{formatTime(note.createTime)}</span>
                            </div>
                            <ConsistencyBadge status="consistent" size="sm" />
                          </div>
                          <div className="text-[12px] text-primary leading-relaxed mb-3">{note.content}</div>
                          <div className="rounded-lg bg-root/50 border border-border-default p-3">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-amber mb-2">此备注改变的判断</div>
                            <ul className="space-y-1.5">
                              {note.changedJudgments.map((j, i) => (
                                <li key={i} className="flex items-start gap-2 text-[11px] text-secondary leading-relaxed">
                                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                                  {j}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardShell>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <CardShell
            accent="amber"
            title={<div className="flex items-center gap-2"><Eye className="w-4 h-4 text-amber" />日志详情</div>}
            subtitle="点击左侧泳道中的节点查看完整信息"
          >
            {selectedLog ? (
              <div className="space-y-3 text-[12px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">错误级别</div>
                  <span className={`chip ${
                    selectedLog.level === 'critical' ? 'text-danger' :
                    selectedLog.level === 'error' ? 'text-[#f97316]' : 'text-amber'
                  }`}>{selectedLog.level.toUpperCase()}</span>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">消息</div>
                  <div className="rounded-lg bg-root border border-border-default p-3 text-secondary font-mono text-[11px] leading-relaxed">
                    {selectedLog.message}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted mb-1">堆栈</div>
                  <div className="rounded-lg bg-root border border-border-default p-3 text-secondary font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto">
                    {selectedLog.stackTrace}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-[10px] uppercase tracking-wider text-muted mb-1">发生时间</div><div className="font-mono text-primary">{formatTime(selectedLog.occurTime)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wider text-muted mb-1">关联任务</div><div className="font-mono text-primary truncate">{selectedLog.taskId}</div></div>
                </div>
                {selectedLog.relatedSampleIds.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted mb-1">关联样本</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLog.relatedSampleIds.map(s => <span key={s} className="chip text-info" style={{ borderColor: 'rgba(59,130,246,0.4)' }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[12px] text-muted">
                <FileWarning className="w-10 h-10 mx-auto mb-3 text-muted opacity-40" strokeWidth={1.5} />
                <div>请在左侧泳道选择具体日志</div>
              </div>
            )}
          </CardShell>

          <CardShell
            title="快捷操作"
            accent="emerald"
          >
            <div className="space-y-2">
              <button onClick={() => setFormOpen(true)} className="btn-operate w-full justify-between btn-primary">
                <span className="flex items-center gap-2"><MessageSquarePlus className="w-4 h-4" /> 添加修正与公示备注</span>
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <Link to="/timeline" className="btn-operate w-full justify-between">
                <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> 同步到历史时间线</span>
                <Eye className="w-4 h-4" />
              </Link>
              <Link to="/compare" className="btn-operate w-full justify-between">
                <span className="flex items-center gap-2"><UserPen className="w-4 h-4" /> 对比前版与当前版修正</span>
                <UserPen className="w-4 h-4" />
              </Link>
            </div>
          </CardShell>
        </div>
      </div>

      <LogDetailDrawer
        log={selectedLog}
        task={selectedTask}
        samples={mockSamples}
        onClose={() => store.setSelectedLog(null)}
      />
      <PublicNoteForm
        open={formOpen}
        group={activeGroup}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
};

export default FailureQueuePage;
