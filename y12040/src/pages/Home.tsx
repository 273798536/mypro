import { useGameStore } from '../store/gameStore';
import { GameCanvas } from '../components/GameCanvas';
import { ParamControlPanel } from '../components/ParamControlPanel';
import { ReportCard } from '../components/ReportCard';
import { Mountain, BookOpen, Info } from 'lucide-react';

export default function Home() {
  const { status, resetGame } = useGameStore();

  const handlePlayAgain = () => {
    resetGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mountain-50 via-snow-50 to-mountain-100">
      <header className="bg-gradient-to-r from-mountain-700 to-mountain-800 text-white py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mountain className="text-curve-400" size={32} />
            <div>
              <h1 className="text-2xl font-display font-bold">函数图像滑雪赛</h1>
              <p className="text-mountain-200 text-sm">Quadratic Function Ski Challenge</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-mountain-200">
            <BookOpen size={16} />
            <span>数学实践 · 二次函数</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg border border-mountain-100">
          <div className="flex items-start gap-3">
            <Info className="text-mountain-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-mountain-700 mb-1">游戏说明</p>
              <p>调整二次函数 y = ax² + bx + c 的参数，生成滑雪曲线。让滑雪者沿曲线滑行，尽可能避开障碍物到达终点！</p>
              <p className="text-xs text-gray-500 mt-1">提示：参数 a 控制开口方向和大小，b 控制对称轴位置，c 控制曲线上下平移。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start justify-center">
          <ParamControlPanel />
          <div className="flex-1 max-w-3xl">
            <GameCanvas />
            
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white/80 rounded-xl p-4 shadow-md border border-mountain-100">
                <p className="text-xs text-gray-500 mb-1">游戏状态</p>
                <p className="text-lg font-bold text-mountain-700">
                  {status === 'idle' && '🎯 准备开始'}
                  {status === 'playing' && '⛷️ 滑行中...'}
                  {status === 'paused' && '⏸️ 已暂停'}
                  {status === 'finished' && '🏁 已完成'}
                </p>
              </div>
              <div className="bg-white/80 rounded-xl p-4 shadow-md border border-mountain-100">
                <p className="text-xs text-gray-500 mb-1">障碍物数量</p>
                <p className="text-lg font-bold text-warning-600">4 个</p>
              </div>
              <div className="bg-white/80 rounded-xl p-4 shadow-md border border-mountain-100">
                <p className="text-xs text-gray-500 mb-1">满分</p>
                <p className="text-lg font-bold text-success-500">1000 分</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-curve-50 to-mountain-50 rounded-2xl p-6 border border-curve-200">
          <h3 className="text-lg font-bold text-mountain-700 mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-curve-500" />
            数学知识点
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-mono font-bold text-ski-500 text-lg mb-2">参数 a</p>
              <p className="text-sm text-gray-600">a {'>'} 0 时开口向上，a {'<'} 0 时开口向下</p>
              <p className="text-xs text-gray-400 mt-1">|a| 越大，开口越窄</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-mono font-bold text-ski-500 text-lg mb-2">参数 b</p>
              <p className="text-sm text-gray-600">对称轴位置：x = -b/(2a)</p>
              <p className="text-xs text-gray-400 mt-1">b 影响曲线左右偏移</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-mono font-bold text-ski-500 text-lg mb-2">参数 c</p>
              <p className="text-sm text-gray-600">Y 轴截距，曲线与 Y 轴交点</p>
              <p className="text-xs text-gray-400 mt-1">c 使曲线上下平移</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-mountain-800 text-mountain-300 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>函数图像滑雪赛 · 让数学学习更有趣 🎿</p>
        </div>
      </footer>

      {status === 'finished' && <ReportCard onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
