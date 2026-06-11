import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Layers, History, Download, ChevronRight, FileText } from 'lucide-react';
import { useTaskStore, taskStatusLabel } from '@/store/taskStore';

export default function AppHeader() {
  const location = useLocation();
  const params = useParams<{ taskId: string }>();
  const task = useTaskStore(s => s.getTask(params.taskId || ''));

  const isWorkbench = location.pathname.startsWith('/workbench');

  return (
    <header className="h-16 bg-dark-800/80 backdrop-blur-sm border-b border-primary-700/40 flex items-center px-6 sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-3 mr-8">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/50">
          <Layers size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold text-primary-100 tracking-wide">
            地下水监测井碰撞预审
          </h1>
          <p className="text-[10px] text-primary-300/60 tracking-widest uppercase">
            Collision Pre-Review System
          </p>
        </div>
      </Link>

      {isWorkbench && task && (
        <nav className="flex items-center text-sm">
          <Link to="/" className="text-primary-300 hover:text-primary-100 transition flex items-center gap-1">
            <Home size={14} />
            <span>预审任务</span>
          </Link>
          <ChevronRight size={14} className="mx-2 text-primary-500" />
          <span className="text-primary-200 font-medium max-w-[320px] truncate">
            {task.name}
          </span>
          <span className="ml-3 px-2 py-0.5 rounded text-xs bg-primary-700/40 text-primary-200 border border-primary-600/30">
            {taskStatusLabel[task.status]}
          </span>

          <div className="ml-8 flex items-center gap-1">
            <Link
              to={`/workbench/${task.id}`}
              className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1.5 ${
                location.pathname === `/workbench/${task.id}`
                  ? 'bg-primary-600/30 text-primary-100 border border-primary-500/40'
                  : 'text-primary-300 hover:text-primary-100 hover:bg-primary-700/20'
              }`}
            >
              <Layers size={14} />
              工作台
            </Link>
            <Link
              to={`/workbench/${task.id}/history`}
              className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1.5 ${
                location.pathname === `/workbench/${task.id}/history`
                  ? 'bg-primary-600/30 text-primary-100 border border-primary-500/40'
                  : 'text-primary-300 hover:text-primary-100 hover:bg-primary-700/20'
              }`}
            >
              <History size={14} />
              历史时间线
            </Link>
            <Link
              to={`/workbench/${task.id}/export`}
              className={`px-3 py-1.5 rounded-md text-sm transition flex items-center gap-1.5 ${
                location.pathname === `/workbench/${task.id}/export`
                  ? 'bg-primary-600/30 text-primary-100 border border-primary-500/40'
                  : 'text-primary-300 hover:text-primary-100 hover:bg-primary-700/20'
              }`}
            >
              <Download size={14} />
              导出中心
            </Link>
          </div>
        </nav>
      )}

      <div className="ml-auto flex items-center gap-4">
        {task && (
          <div className="flex items-center gap-2 text-xs text-primary-300/80">
            <FileText size={13} />
            <span>计算口径:</span>
            <span className="text-primary-200">{task.calculationVersion}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-danger-500 flex items-center justify-center text-xs font-semibold text-white">
            乔
          </div>
          <span className="text-sm text-primary-200">评审助理 · 阿乔</span>
        </div>
      </div>
    </header>
  );
}
