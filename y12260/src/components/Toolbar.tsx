import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';
import {
  MousePointer2,
  Move,
  Cable,
  User,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Square
} from 'lucide-react';
import { MUSICIAN_COLORS } from '@/data/devices';

const tools = [
  { id: 'select', icon: MousePointer2, label: '选择' },
  { id: 'place', icon: Move, label: '放置' },
  { id: 'cable', icon: Cable, label: '布线' },
  { id: 'walk', icon: User, label: '走位' },
  { id: 'delete', icon: Trash2, label: '删除' }
] as const;

const musicians = Object.keys(MUSICIAN_COLORS);

export const Toolbar = () => {
  const {
    currentTool,
    setTool,
    status,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    finishGame,
    currentMusician,
    setWalkMusician
  } = useGameStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setTool(tool.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                <Icon size={16} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {currentTool === 'walk' && (
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 ml-2">
            {musicians.map((musician) => (
              <button
                key={musician}
                onClick={() => setWalkMusician(musician)}
                className={cn(
                  'px-2 py-1.5 rounded text-xs font-medium transition-all duration-200',
                  currentMusician === musician
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                style={{
                  backgroundColor: currentMusician === musician ? MUSICIAN_COLORS[musician] : 'transparent'
                }}
              >
                {musician}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === 'idle' && (
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 active:scale-95"
          >
            <Play size={18} />
            开始游戏
          </button>
        )}

        {status === 'playing' && (
          <>
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-all duration-200 shadow-lg shadow-yellow-500/30 active:scale-95"
            >
              <Pause size={18} />
              暂停
            </button>
            <button
              onClick={finishGame}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/30 active:scale-95"
            >
              <Square size={18} />
              结束
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all duration-200 shadow-lg shadow-green-500/30 active:scale-95"
            >
              <Play size={18} />
              继续
            </button>
            <button
              onClick={finishGame}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/30 active:scale-95"
            >
              <Square size={18} />
              结束
            </button>
          </>
        )}

        <button
          onClick={restartGame}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-all duration-200 active:scale-95"
        >
          <RotateCcw size={18} />
          重开
        </button>
      </div>
    </div>
  );
};
