import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  RefreshCw,
  ChevronRight,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Archive,
  Layers,
  FileText,
  X,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StatusBadge from '@/components/StatusBadge';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

const RULE_OPTIONS = [
  { label: 'HJ 164-2020 基础规范', value: '《地下水环境监测技术规范》HJ 164-2020' },
  { label: 'HJ 164-2020 + 北京细则 V2.1', value: '《地下水环境监测技术规范》HJ 164-2020 + 北京市补充细则V2.1' },
  { label: '水源地保护区专项', value: '《地下水环境监测技术规范》HJ 164-2020 + 水源地保护区专项细则V1.5' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const tasks = useTaskStore(s => s.tasks);
  const createTask = useTaskStore(s => s.createTask);
  const rerunTask = useTaskStore(s => s.rerunTask);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRule, setNewRule] = useState(RULE_OPTIONS[1].value);

  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    unconfirmed: tasks.reduce((sum, t) => sum + t.unconfirmedCount, 0),
    anomalies: tasks.reduce((sum, t) => sum + t.anomalyCount, 0),
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const task = createTask(newName.trim(), newRule);
    setShowCreate(false);
    setNewName('');
    navigate(`/workbench/${task.id}`);
  };

  const handleRerun = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    rerunTask(taskId);
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <AppHeader />

      <main className="relative">
        <div className="grid-bg absolute inset-0 pointer-events-none opacity-40" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 0%, rgba(62, 115, 187, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(233, 69, 96, 0.08) 0%, transparent 50%)',
          }}
        />

        <div className="relative container max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-primary-50 glow-text mb-2">
                预审任务中心
              </h2>
              <p className="text-primary-300/70 text-sm">
                启动新任务、重跑历史检测、查看计算口径 — 三件事讲清就够
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-900/50 hover:shadow-primary-700/60 hover:from-primary-400 hover:to-primary-500 transition-all"
            >
              <Plus size={18} />
              <span>启动新预审</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { label: '任务总数', value: stats.total, icon: Layers, color: 'text-primary-300', bg: 'from-primary-500/20' },
              { label: '计算中', value: stats.running, icon: RefreshCw, color: 'text-warning', bg: 'from-warning/20' },
              { label: '异常点总数', value: stats.anomalies, icon: AlertTriangle, color: 'text-danger', bg: 'from-danger/20' },
              { label: '待确认', value: stats.unconfirmed, icon: Clock, color: 'text-warning', bg: 'from-warning/15' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative gradient-border rounded-xl bg-dark-800/60 backdrop-blur-sm p-5 overflow-hidden"
              >
                <div className={cn('absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br opacity-40 blur-2xl', stat.bg)} />
                <div className="relative flex items-center justify-between mb-3">
                  <span className="text-xs text-primary-300/70 tracking-wider uppercase">{stat.label}</span>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <p className={cn('text-3xl font-semibold font-serif', stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="relative gradient-border rounded-2xl bg-dark-800/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-700/30">
              <h3 className="font-serif text-lg text-primary-100">任务列表</h3>
              <div className="text-xs text-primary-400/70">共 {tasks.length} 条</div>
            </div>

            <div className="divide-y divide-primary-700/20">
              {tasks.map((task, idx) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/workbench/${task.id}`)}
                  className="w-full text-left p-5 hover:bg-primary-700/10 transition flex items-center gap-5 group cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                      task.status === 'completed' && 'bg-success/15 text-success',
                      task.status === 'running' && 'bg-primary-400/20 text-primary-200',
                      task.status === 'pending' && 'bg-gray-500/20 text-gray-300',
                      task.status === 'archived' && 'bg-gray-600/20 text-gray-400',
                    )}
                  >
                    {task.status === 'completed' && <CheckCircle2 size={22} />}
                    {task.status === 'running' && <RefreshCw size={22} className="animate-spin" />}
                    {task.status === 'pending' && <Clock size={22} />}
                    {task.status === 'archived' && <Archive size={22} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-base font-medium text-primary-50 truncate group-hover:text-white transition">
                        {task.name}
                      </p>
                      <StatusBadge type="task-status" value={task.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-primary-300/60">
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        {task.wellCount} 口井
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {task.anomalyCount} 处异常
                        {task.unconfirmedCount > 0 && (
                          <span className="text-danger ml-1">（{task.unconfirmedCount} 待确认）</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        口径 {task.calculationVersion}
                      </span>
                      <span>创建：{task.createdAt}</span>
                      <span>更新：{task.updatedAt}</span>
                      <span>操作人：{task.operator}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(task.status === 'completed' || task.status === 'archived') && (
                      <button
                        onClick={(e) => handleRerun(task.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-primary-300 border border-primary-600/40 hover:border-primary-500 hover:text-primary-100 hover:bg-primary-700/20 transition"
                      >
                        <RefreshCw size={13} />
                        重跑
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workbench/${task.id}`);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-primary-600/20 text-primary-100 border border-primary-500/40 hover:bg-primary-600/30 hover:border-primary-400 transition"
                    >
                      {task.status === 'pending' ? (
                        <>
                          <Play size={14} />
                          启动
                        </>
                      ) : (
                        <>
                          进入
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm">
            <div className="w-[480px] rounded-2xl bg-dark-800 border border-primary-600/40 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-primary-700/30">
                <h3 className="font-serif text-lg text-primary-100">启动新预审</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-primary-400 hover:text-primary-200 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm text-primary-200 mb-2">任务名称</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="如：朝阳区XX片区地下水监测井碰撞预审"
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-900/60 border border-primary-700/40 text-primary-100 placeholder-primary-500/50 focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-primary-200 mb-2">计算口径</label>
                  <div className="space-y-2">
                    {RULE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setNewRule(opt.value)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-lg border transition text-sm',
                          newRule === opt.value
                            ? 'bg-primary-600/20 border-primary-500 text-primary-100'
                            : 'bg-dark-900/40 border-primary-700/30 text-primary-300 hover:border-primary-600/50',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {newRule && (
                    <p className="mt-2 text-xs text-primary-400/70 font-mono bg-dark-900/40 px-3 py-2 rounded border border-primary-700/20">
                      {newRule}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-700/30 bg-dark-900/40">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-md text-sm text-primary-300 hover:text-primary-100 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className={cn(
                    'px-5 py-2 rounded-md text-sm font-medium transition flex items-center gap-2',
                    newName.trim()
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-900/40 hover:from-primary-400 hover:to-primary-500'
                      : 'bg-primary-700/30 text-primary-400 cursor-not-allowed',
                  )}
                >
                  <Play size={15} />
                  启动并进入工作台
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
