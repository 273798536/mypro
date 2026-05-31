import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Clock, TrendingUp, AlertTriangle, Layers, Moon, Calculator } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getRiskTextColor, getSeverityColor, getSeverityLabel } from '../../utils/riskAnalysis';

export function ReviewPage() {
  const navigate = useNavigate();
  const { score, scoreBreakdown, records, risks, placedSources, currentTurn, maxTurns, gameResult, resetGame } = useGameStore();
  const [selectedTurn, setSelectedTurn] = useState<number>(currentTurn);
  const [isPlaying, setIsPlaying] = useState(false);

  const mixingPoints = useMemo(() => {
    return risks.filter((r) => r.type === 'source_overlap').map((risk) => ({
      turn: risk.triggeredAt,
      title: risk.title,
      description: risk.description,
      cause: risk.cause,
    }));
  }, [risks]);

  const handlePlay = () => {
    setIsPlaying(true);
    let turn = 1;
    const interval = setInterval(() => {
      if (turn >= maxTurns) {
        clearInterval(interval);
        setIsPlaying(false);
        return;
      }
      turn++;
      setSelectedTurn(turn);
    }, 1500);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const totalSourcesPlaced = records.soundSources.filter((r) => r.action === 'place').length;
  const avgMood = Object.values(useGameStore.getState().residentMood).reduce((a, b) => a + b, 0) /
    Object.keys(useGameStore.getState().residentMood).length;

  const getScoreChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'source':
        return '声源操作';
      case 'mood':
        return '居民情绪';
      case 'governance':
        return '治理措施';
      case 'penalty':
        return '扣分惩罚';
      default:
        return category;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/game')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>返回游戏</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">📊 游戏复盘分析</h1>
          </div>
          <button
            onClick={() => {
              resetGame();
              navigate('/game');
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            重新开始
          </button>
        </div>

        <div className={`p-6 rounded-2xl mb-6 ${
          gameResult === 'win'
            ? 'bg-gradient-to-r from-green-500 to-eco-600'
            : 'bg-gradient-to-r from-orange-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {gameResult === 'win' ? '🎉 任务完成！' : '💡 学习机会'}
              </h2>
              <p className="text-white/80">
                {gameResult === 'win'
                  ? '你成功平衡了城市发展与声环境保护，居民满意度良好！'
                  : '城市声环境管理遇到了挑战，让我们一起分析原因，下次做得更好！'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">最终得分</p>
              <p className="text-4xl font-bold text-white">{score}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock size={16} />
              <span>总回合数</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{currentTurn}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Layers size={16} />
              <span>放置声源</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalSourcesPlaced}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp size={16} />
              <span>平均满意度</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{avgMood.toFixed(0)}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <AlertTriangle size={16} />
              <span>风险事件</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{risks.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">⏱️ 时间轴回放</h3>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setSelectedTurn(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={() => setSelectedTurn(maxTurns)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between">
              {Array.from({ length: maxTurns }, (_, i) => i + 1).map((turn) => (
                <div key={turn} className="relative flex flex-col items-center">
                  <button
                    onClick={() => setSelectedTurn(turn)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                      turn === selectedTurn
                        ? 'bg-primary-600 text-white scale-110 shadow-lg'
                        : turn < selectedTurn
                        ? 'bg-primary-200 text-primary-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {turn}
                  </button>
                  {mixingPoints.some((p) => p.turn === turn) && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" title="声源混合点" />
                  )}
                </div>
              ))}
            </div>
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-10" />
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary-600"></span>
              <span>已完成回合</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>声源混合触发点</span>
            </div>
          </div>
        </div>

        {mixingPoints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 声源混合触发点分析</h3>
            <div className="space-y-4">
              {mixingPoints.map((point, index) => (
                <div
                  key={index}
                  className="border-l-4 border-warning-overlap bg-red-50 rounded-r-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{point.title}</h4>
                    <span className="text-xs bg-warning-overlap text-white px-2 py-0.5 rounded-full">
                      第 {point.turn} 回合
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{point.description}</p>
                  <div className="bg-white p-3 rounded-lg text-sm">
                    <p className="font-medium text-gray-700 mb-1">触发原因：</p>
                    <p className="text-gray-600">{point.cause}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 评分影响分析</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {scoreBreakdown.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无评分记录</p>
              ) : (
                scoreBreakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        第 {item.turn} 回合
                      </span>
                      <span className="text-sm text-gray-600">{getCategoryLabel(item.category)}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getScoreChangeColor(item.change)}`}>
                        {item.change > 0 ? '+' : ''}{item.change}
                      </p>
                      <p className="text-xs text-gray-500">{item.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ 风险事件汇总</h3>

            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Moon size={18} className="text-warning-night" />
                  <span className="text-gray-700">夜间阈值超标</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  risks.filter((r) => r.type === 'night_threshold').length > 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {risks.filter((r) => r.type === 'night_threshold').length} 次
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-warning-overlap" />
                  <span className="text-gray-700">声源重叠</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  risks.filter((r) => r.type === 'source_overlap').length > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {risks.filter((r) => r.type === 'source_overlap').length} 次
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-warning-decibel" />
                  <span className="text-gray-700">分贝计算误区</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  risks.filter((r) => r.type === 'decibel_error').length > 0
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {risks.filter((r) => r.type === 'decibel_error').length} 次
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">详细风险列表</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className={getRiskTextColor(risk.type)}>{risk.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(risk.severity)}`}>
                      {getSeverityLabel(risk.severity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📚 学习要点总结</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Moon size={20} className="text-orange-600" />
                <h4 className="font-semibold text-orange-800">夜间阈值</h4>
              </div>
              <p className="text-sm text-orange-700">
                夜间噪声标准比白天严格10dB。居民区夜间阈值为45dB，超过会严重影响居民休息。
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-800">声源重叠</h4>
              </div>
              <p className="text-sm text-red-700">
                多个声源在同一区域叠加会产生复合噪声，影响远大于单个声源，应尽量分散布置。
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Calculator size={20} className="text-purple-600" />
                <h4 className="font-semibold text-purple-800">分贝计算</h4>
              </div>
              <p className="text-sm text-purple-700">
                分贝是对数单位，不能直接相加。公式：L_total = 10 × log10(Σ 10^(Li/10))
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
