import { Play, Pause, RotateCcw, CheckCircle, ArrowLeft, Save, Layers } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';

export default function ControlPanel() {
  const { 
    phase, 
    isPaused, 
    firstRunGrid,
    startSimulation, 
    pauseSimulation, 
    resetGame, 
    showResult,
    goBackToPlanning,
    saveFirstRun,
    toggleComparison,
    showComparison,
    loadSample,
    clearGrid
  } = useGameStore();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 w-full">
      <h3 className="text-lg font-bold text-slate-700 mb-4 text-center">🎮 游戏控制</h3>
      
      <div className="space-y-3">
        {phase === 'planning' && (
          <>
            <button
              onClick={startSimulation}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-102 active:scale-98"
            >
              <Play size={20} />
              开始模拟
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={clearGrid}
                className="flex items-center justify-center gap-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-all"
              >
                <RotateCcw size={16} />
                清空画布
              </button>
              <button
                onClick={() => loadSample(1)}
                className="py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all"
              >
                样例 1
              </button>
            </div>
            
            <button
              onClick={() => loadSample(2)}
              className="w-full py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-all"
            >
              样例 2（有消防站和绿地）
            </button>

            {firstRunGrid && (
              <button
                onClick={toggleComparison}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  showComparison 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                }`}
              >
                <Layers size={16} />
                {showComparison ? '隐藏对比' : '对比第一次规划'}
              </button>
            )}
          </>
        )}

        {phase === 'simulating' && (
          <>
            <button
              onClick={pauseSimulation}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-102 active:scale-98 ${
                isPaused 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
              {isPaused ? '继续模拟' : '暂停'}
            </button>
            
            <button
              onClick={showResult}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-102 active:scale-98"
            >
              <CheckCircle size={20} />
              查看结算
            </button>
          </>
        )}

        {phase === 'result' && (
          <>
            <button
              onClick={saveFirstRun}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-all duration-200 hover:scale-102 active:scale-98"
            >
              <Save size={20} />
              保存并进行第二次规划
            </button>
            
            <button
              onClick={goBackToPlanning}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-all"
            >
              <ArrowLeft size={18} />
              返回修改
            </button>
            
            <button
              onClick={resetGame}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-medium transition-all"
            >
              <RotateCcw size={18} />
              重新开始
            </button>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          当前阶段：{
            phase === 'planning' ? '🖍️ 规划中' :
            phase === 'simulating' ? (isPaused ? '⏸️ 已暂停' : '▶️ 模拟中') :
            '📊 结算页面'
          }
        </p>
      </div>
    </div>
  );
}
