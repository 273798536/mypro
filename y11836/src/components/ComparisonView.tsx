import { useGameStore } from '@/store/useGameStore';
import GameGrid from './GameGrid';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ComparisonView() {
  const { firstRunGrid, firstRunScore, score, showComparison } = useGameStore();
  
  if (!showComparison || !firstRunGrid || !firstRunScore) return null;

  const scoreDiff = score ? score.totalScore - firstRunScore.totalScore : 0;

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-lg p-5">
      <h3 className="text-xl font-bold text-slate-700 mb-4 text-center">🔄 两次规划对比</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <GameGrid 
            customGrid={firstRunGrid} 
            interactive={false}
            title="第一次规划"
          />
          <div className="text-center mt-3">
            <span className="text-2xl font-bold text-slate-700">
              {firstRunScore.totalScore} 分
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="hidden lg:flex items-center justify-center h-full">
            <ArrowRight size={40} className="text-purple-400" />
          </div>
          <div className="lg:hidden">
            <ArrowRight size={32} className="text-purple-400 rotate-90 my-2" />
          </div>
        </div>

        <div>
          <GameGrid 
            showChanges={true}
            interactive={false}
            title="第二次规划（黄色闪烁=变化）"
          />
          <div className="text-center mt-3">
            <span className="text-2xl font-bold text-slate-700">
              {score?.totalScore || 0} 分
            </span>
            <span className={`ml-3 text-lg font-semibold flex items-center justify-center gap-1 ${
              scoreDiff > 0 ? 'text-green-500' : scoreDiff < 0 ? 'text-red-500' : 'text-slate-400'
            }`}>
              {scoreDiff > 0 ? <TrendingUp size={20} /> : scoreDiff < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
              {scoreDiff > 0 ? '+' : ''}{scoreDiff}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <h4 className="font-semibold text-yellow-700 mb-2">💡 讲解员提示</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• 黄色闪烁的格子是两次规划不同的地方</li>
          <li>• 对比两次得分，看看哪些改进有效</li>
          <li>• 讨论：为什么添加消防站/绿地能提高分数？</li>
          <li>• 思考：如果只能放3个消防站，应该放在哪里？</li>
        </ul>
      </div>
    </div>
  );
}
