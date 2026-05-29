import ToolBar from '@/components/ToolBar';
import GameGrid from '@/components/GameGrid';
import ControlPanel from '@/components/ControlPanel';
import ResultPanel from '@/components/ResultPanel';
import ComparisonView from '@/components/ComparisonView';
import { useGameStore } from '@/store/useGameStore';

export default function Home() {
  const { phase, selectedTool, showComparison } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      <header className="bg-white shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏙️</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">城市规划积木赛</h1>
              <p className="text-sm text-slate-500">用积木搭建你的理想城市！</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">🏬 商业区</span>
            <span className="flex items-center gap-1">🏠 住宅区</span>
            <span className="flex items-center gap-1">🛣️ 道路</span>
            <span className="flex items-center gap-1">🌲 绿地</span>
            <span className="flex items-center gap-1">🚒 消防站</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {phase === 'result' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <GameGrid interactive={false} />
              {showComparison && <ComparisonView />}
            </div>
            <ResultPanel />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <ToolBar />
              <ControlPanel />
            </div>

            <div className="lg:col-span-6 flex flex-col items-center">
              {selectedTool === null && phase === 'planning' && (
                <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  👆 请从左侧选择一种建筑工具，然后点击网格放置
                </div>
              )}
              <GameGrid />
              {showComparison && <ComparisonView />}
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <h3 className="text-lg font-bold text-slate-700 mb-3">📖 游戏说明</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="font-semibold text-orange-700 mb-1">🎯 目标</p>
                    <p>平衡交通、消防和绿地，打造高分城市！</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-blue-700 mb-1">🛣️ 交通</p>
                    <p>道路要连通，建筑旁边要有路</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="font-semibold text-red-700 mb-1">🚒 消防</p>
                    <p>消防站覆盖半径2格，保护所有建筑</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-semibold text-green-700 mb-1">🌲 绿地</p>
                    <p>绿地覆盖周围2格，让居民享受绿色</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-semibold text-purple-700 mb-1">🔄 进阶玩法</p>
                    <p>第一次规划后点击"保存"，第二次规划后自动对比改进效果！</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 bg-slate-800 text-slate-400 text-center text-sm">
        <p>城市规划积木赛 - 规划馆互动教学工具</p>
        <p className="mt-1 text-xs">理解城市规划中的平衡与取舍</p>
      </footer>
    </div>
  );
}
