import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { History, Filter, Clock, FileCheck, Upload, Eye, Settings, Layers, RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import TimelineNode from '@/components/TimelineNode';
import StatusBadge from '@/components/StatusBadge';
import { useTaskStore } from '@/store/taskStore';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { cn } from '@/lib/utils';
import type { TimelineEventType } from '@/types';

const FILTER_OPTIONS: { value: TimelineEventType | 'all'; label: string; icon: typeof Eye }[] = [
  { value: 'all', label: '全部', icon: History },
  { value: 'status_change', label: '状态变更', icon: FileCheck },
  { value: 'material_upload', label: '材料上传', icon: Upload },
  { value: 'view_saved', label: '视角保存', icon: Eye },
  { value: 'rule_changed', label: '规则变更', icon: Settings },
  { value: 'task_created', label: '任务创建', icon: Layers },
  { value: 'task_rerun', label: '重跑任务', icon: RefreshCw },
];

export default function HistoryPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const task = useTaskStore(s => s.getTask(taskId || ''));
  const initTask = useWorkbenchStore(s => s.initTask);
  const timeline = useWorkbenchStore(s => s.timeline);

  const [filter, setFilter] = useState<TimelineEventType | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    if (taskId) initTask(taskId);
  }, [taskId, initTask]);

  const filtered = timeline.filter(e => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (
        !e.description.toLowerCase().includes(kw) &&
        !(e.anomalyName || '').toLowerCase().includes(kw) &&
        !e.operator.toLowerCase().includes(kw)
      ) return false;
    }
    return true;
  });

  const stats = {
    total: timeline.length,
    statusChange: timeline.filter(e => e.type === 'status_change').length,
    material: timeline.filter(e => e.type === 'material_upload').length,
    view: timeline.filter(e => e.type === 'view_saved').length,
  };

  if (!task) return null;

  return (
    <div className="min-h-screen bg-dark-900">
      <AppHeader />

      <main className="relative">
        <div className="grid-bg absolute inset-0 pointer-events-none opacity-30" />

        <div className="relative container max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/50">
                <History size={22} className="text-white" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold text-primary-50 glow-text">
                  历史时间线
                </h2>
                <p className="text-sm text-primary-300/70 mt-0.5">
                  人工确认前后变化、材料补录记录、视角快照 — 社区公示前复盘时可解释给负责人
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3">
              <StatCard label="事件总数" value={stats.total} icon={Clock} color="text-primary-300" />
              <StatCard label="状态变更" value={stats.statusChange} icon={FileCheck} color="text-success" />
              <StatCard label="材料补录" value={stats.material} icon={Upload} color="text-warning" />
              <StatCard label="视角快照" value={stats.view} icon={Eye} color="text-primary-200" />
            </div>
          </div>

          <div className="relative gradient-border rounded-2xl bg-dark-800/50 backdrop-blur-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-primary-700/30">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索描述 / 井名 / 操作人"
                  className="pl-9 pr-4 py-2 rounded-md bg-dark-900/60 border border-primary-700/40 text-sm text-primary-100 placeholder-primary-500/60 focus:border-primary-500 focus:outline-none transition w-64"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {FILTER_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFilter(opt.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition',
                        active
                          ? 'bg-primary-600/30 border-primary-500/50 text-primary-100'
                          : 'bg-dark-900/40 border-primary-700/30 text-primary-400 hover:border-primary-600/50 hover:text-primary-200',
                      )}
                    >
                      <Icon size={12} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setExpandAll(v => !v)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-primary-400 hover:text-primary-200 transition"
              >
                {expandAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expandAll ? '全部收起' : '全部展开'}
              </button>
            </div>

            <div className="px-5 py-6">
              <div className="flex items-center justify-between mb-2 text-xs text-primary-400/70">
                <span>显示 {filtered.length} / {timeline.length} 条记录</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span>确认</span>
                  <span className="w-2 h-2 rounded-full bg-warning ml-2" />
                  <span>材料/重跑</span>
                  <span className="w-2 h-2 rounded-full bg-primary-400 ml-2" />
                  <span>视角/规则</span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-primary-500/60">
                  <History size={36} className="mb-3 opacity-40" />
                  <p className="text-sm">暂无匹配的历史记录</p>
                </div>
              ) : (
                filtered.map((event, i) => (
                  <TimelineNode
                    key={event.id}
                    event={event}
                    isLast={i === filtered.length - 1}
                    defaultExpanded={expandAll}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-dark-800/30 border border-primary-700/20 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                <Filter size={15} className="text-primary-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-primary-100 font-medium mb-1">复盘说明</p>
                <p className="text-xs text-primary-300/70 leading-relaxed">
                  本时间线完整记录"地下水监测井碰撞预审"任务自创建以来的全部操作：任务启动、计算口径切换、
                  每一处异常的人工确认前后状态、所有后补CAD材料（标记为"不覆盖原判断"）、负责人复核时保存的视角快照。
                  社区公示前可直接据此向负责人逐项解释，无需依赖手工记录或CAD截图。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Eye; color: string }) {
  return (
    <div className="relative rounded-xl bg-dark-800/60 border border-primary-700/30 p-4 overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary-500/10 blur-2xl" />
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-primary-400/70">{label}</span>
        <Icon size={15} className={color} />
      </div>
      <p className={cn('text-2xl font-semibold font-serif', color)}>{value}</p>
    </div>
  );
}
