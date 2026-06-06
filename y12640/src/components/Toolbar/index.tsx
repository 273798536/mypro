import { Play, Pause, RotateCcw, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useNavigate } from 'react-router-dom';

export default function Toolbar() {
  const navigate = useNavigate();
  const { status, historyIndex, history, undo, redo, reset, settle, pause, resume, currentSample } = useCanvasStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleStartPause = () => {
    if (status === 'idle') return;
    if (status === 'running') {
      pause();
    } else if (status === 'paused') {
      resume();
    }
  };

  const isPaused = status === 'paused';
  const isRunning = status === 'running';
  const showStartPause = !!(currentSample && (isRunning || isPaused));

  return (
    <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full">
          <span className="text-slate-300 text-xs font-medium">状态:</span>
          <span className={`text-xs font-bold ${
            status === 'running' ? 'text-green-400' :
            status === 'paused' ? 'text-yellow-400' :
            status === 'settled' ? 'text-blue-400' :
            'text-slate-400'
          }`}>
            {status === 'idle' ? '待开始' :
             status === 'running' ? '运行中' :
             status === 'paused' ? '已暂停' :
             '已结算'}
          </span>
        </div>

        {currentSample && (
          <div className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 rounded-full">
            <span className="text-slate-400 text-xs">样例:</span>
            <span className="text-slate-200 text-xs font-medium">{currentSample.name}</span>
          </div>
        )}

        {showStartPause && history.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-slate-700/50 rounded-full">
            <span className="text-slate-400 text-xs">步数:</span>
            <span className="text-slate-200 text-xs font-medium">{historyIndex + 1}/{history.length}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showStartPause && (
          <button
            onClick={handleStartPause}
            disabled={status === 'settled'}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            } disabled:bg-slate-800 disabled:opacity-50`}
          >
            {isPaused ? (
              <>
                <Play size={16} />
                继续
              </>
            ) : (
              <>
                <Pause size={16} />
                暂停
              </>
            )}
          </button>
        )}

        <button
          onClick={undo}
          disabled={!canUndo || status !== 'running'}
          title={status !== 'running' ? '仅运行中可撤销' : canUndo ? '撤销上一步' : '无历史可撤销'}
          className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
        >
          <Undo2 size={16} />
          撤销
        </button>

        <button
          onClick={redo}
          disabled={!canRedo || status !== 'running'}
          title={status !== 'running' ? '仅运行中可重做' : canRedo ? '重做下一步' : '无历史可重做'}
          className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
        >
          <Redo2 size={16} />
          重做
        </button>

        <button
          onClick={reset}
          disabled={status === 'idle'}
          className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
        >
          <RotateCcw size={16} />
          重开
        </button>

        <button
          onClick={settle}
          disabled={status !== 'running' && status !== 'paused'}
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <CheckCircle2 size={16} />
          结算
        </button>

        {status === 'settled' && (
          <button
            onClick={() => navigate('/review')}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            复盘
          </button>
        )}
      </div>
    </div>
  );
}
