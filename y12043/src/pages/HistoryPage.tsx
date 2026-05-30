import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { games, getActiveConfig } = useGameStore();
  const config = getActiveConfig();

  const sortedGames = [...games].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </button>
          <h1 className="text-2xl font-bold text-gray-800">历史记录</h1>
          <div className="w-20"></div>
        </div>

        {sortedGames.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无游戏记录</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGames.map((game, index) => {
              const returnPercent = ((game.currentCapital - game.startCapital) / game.startCapital) * 100;
              const isPositive = returnPercent >= 0;

              return (
                <div
                  key={game.id}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => navigate(`/review/${game.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold">
                        #{sortedGames.length - index}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          游戏记录
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(game.startTime).toLocaleString('zh-CN')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          配置版本: {game.configVersion}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">
                        ¥{game.currentCapital.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="font-semibold">
                          {isPositive ? '+' : ''}{returnPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">步数</div>
                      <div className="font-semibold text-gray-700">{game.currentStep}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">决策次数</div>
                      <div className="font-semibold text-gray-700">{game.decisions.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">回撤次数</div>
                      <div className="font-semibold text-gray-700">{game.drawdowns.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">手续费</div>
                      <div className="font-semibold text-gray-700">
                        ¥{game.fees.reduce((s, f) => s + f.amount, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
