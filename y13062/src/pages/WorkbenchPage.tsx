import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PanelLeft, PanelRight, AlertTriangle, CheckCircle2, Clock, History, Download, Camera, RefreshCw } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import CadCanvas from '@/components/CadCanvas';
import FilterPanel from '@/components/FilterPanel';
import AnomalyList from '@/components/AnomalyList';
import AnomalyDetail from '@/components/AnomalyDetail';
import StatusBadge from '@/components/StatusBadge';
import { useTaskStore } from '@/store/taskStore';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { cn } from '@/lib/utils';

export default function WorkbenchPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const task = useTaskStore(s => s.getTask(taskId || ''));
  const initTask = useWorkbenchStore(s => s.initTask);
  const saveViewSnapshot = useWorkbenchStore(s => s.saveViewSnapshot);
  const anomalies = useWorkbenchStore(s => s.anomalies);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (taskId) initTask(taskId);
  }, [taskId, initTask]);

  const counts = useMemo(
    () => ({
      total: anomalies.length,
      unconfirmed: anomalies.filter(a => a.status === 'unconfirmed').length,
      abnormal: anomalies.filter(a => a.status === 'confirmed_abnormal').length,
      normal: anomalies.filter(a => a.status === 'confirmed_normal').length,
    }),
    [anomalies],
  );

  const handleSaveView = () => {
    if (!task) return;
    saveViewSnapshot(`${task.name.slice(0, 8)} - 全局视图`);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  if (!task) {
    return (
      <div className="min-h-screen bg-dark-900">
        <AppHeader />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-primary-400 px-6">
          <AlertTriangle size={40} className="mb-4 opacity-50" />
          <p className="text-lg mb-2">任务不存在</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 rounded-md text-sm bg-primary-600/30 text-primary-100 border border-primary-500/40 hover:bg-primary-600/40 transition"
          >
            返回任务列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <AppHeader />

      <div className="h-12 bg-dark-800/60 border-b border-primary-700/30 flex items-center px-4 gap-3 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-primary-300/80">
          <StatusBadge type="task-status" value={task.status} size="sm" />
        </div>
        <div className="h-4 w-px bg-primary-700/30" />

        <StatChip icon={<AlertTriangle size={12} className="text-danger" />} label="异常总数" value={counts.total} />
        <StatChip icon={<Clock size={12} className="text-warning" />} label="待确认" value={counts.unconfirmed} highlight={counts.unconfirmed > 0} />
        <StatChip icon={<AlertTriangle size={12} className="text-danger" />} label="确认异常" value={counts.abnormal} />
        <StatChip icon={<CheckCircle2 size={12} className="text-success" />} label="确认正常" value={counts.normal} />

        <div className="h-4 w-px bg-primary-700/30 ml-2" />
        <div className="text-primary-400/70 flex items-center gap-1.5 max-w-[360px] truncate">
          <span>计算口径:</span>
          <span className="text-primary-200 font-mono text-[11px] truncate">{task.calculationRule}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleSaveView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition"
          >
            <Camera size={13} />
            保存当前视角
          </button>
          <button
            onClick={() => navigate(`/workbench/${taskId}/history`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-primary-300 border border-primary-600/30 hover:bg-primary-700/20 hover:text-primary-100 transition"
          >
            <History size={13} />
            历史时间线
          </button>
          <button
            onClick={() => navigate(`/workbench/${taskId}/export`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-primary-600/30 text-primary-100 border border-primary-500/40 hover:bg-primary-600/40 transition"
          >
            <Download size={13} />
            导出
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            'w-72 shrink-0 border-r border-primary-700/30 bg-dark-800/40 flex flex-col transition-all duration-300',
            !leftOpen && 'w-0 -ml-72 opacity-0',
          )}
        >
          <div className="flex-1 overflow-hidden">
            <FilterPanel />
          </div>
          <div className="border-t border-primary-700/30 h-80 shrink-0 overflow-hidden">
            <AnomalyList />
          </div>
        </div>

        <div className="flex-1 flex flex-col relative min-w-0">
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            <ToggleBtn active={leftOpen} onClick={() => setLeftOpen(v => !v)} label="切换左侧面板" />
          </div>
          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            <ToggleBtn active={rightOpen} onClick={() => setRightOpen(v => !v)} label="切换右侧面板" reverse />
          </div>
          <div className="flex-1 p-3 min-h-0">
            <CadCanvas onSaveView={handleSaveView} />
          </div>
        </div>

        <div
          className={cn(
            'w-80 shrink-0 border-l border-primary-700/30 bg-dark-800/40 flex flex-col transition-all duration-300',
            !rightOpen && 'w-0 -mr-80 opacity-0',
          )}
        >
          <AnomalyDetail />
        </div>
      </div>

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-float">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success/20 text-success border border-success/40 shadow-lg backdrop-blur-sm">
            <CheckCircle2 size={16} />
            <span className="text-sm">视角快照已保存，可在右侧面板或历史中恢复</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-md',
      highlight ? 'bg-warning/10 border border-warning/30' : 'bg-dark-900/40',
    )}>
      {icon}
      <span className="text-primary-400/70">{label}:</span>
      <span className={cn('font-mono font-medium', highlight ? 'text-warning' : 'text-primary-100')}>{value}</span>
    </div>
  );
}

function ToggleBtn({ active, onClick, label, reverse }: { active: boolean; onClick: () => void; label: string; reverse?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'w-8 h-8 rounded-lg bg-dark-800/80 backdrop-blur-sm border border-primary-700/40 flex items-center justify-center text-primary-300 hover:text-primary-100 hover:bg-dark-700 transition',
      )}
    >
      {reverse
        ? active ? <PanelRight size={15} /> : <PanelLeft size={15} />
        : active ? <PanelLeft size={15} /> : <PanelRight size={15} />
      }
    </button>
  );
}
