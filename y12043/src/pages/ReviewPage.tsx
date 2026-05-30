import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { generateReviewAnalysis } from '@/engine/review';
import { ReviewAnalysis } from '@/types';
import { PerformanceSummary } from '@/components/review/PerformanceSummary';
import { DecisionTimeline } from '@/components/review/DecisionTimeline';
import { MazeVisualization } from '@/components/game/MazeVisualization';
import { ArrowLeft, Home, RotateCcw } from 'lucide-react';

export default function ReviewPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { getGameById, getActiveConfig, startGame } = useGameStore();
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);

  const game = gameId ? getGameById(gameId) : undefined;
  const config = getActiveConfig();

  useEffect(() => {
    if (game) {
      const result = generateReviewAnalysis(game, config.funds);
      setAnalysis(result);
    }
  }, [game, config.funds]);

  if (!game || !analysis) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-gray-500">游戏记录不存在</div>
      </div>
    );
  }

  const visitedNodes = game.decisions.map(d => d.nodeId);
  const routeDecisions = game.decisions.map(d => ({
    nodeId: d.nodeId,
    routeBranch: d.routeBranch,
  }));

  const handlePlayAgain = () => {
    startGame(100000);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </button>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
            >
              <RotateCcw className="w-4 h-4" />
              再玩一次
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5">
            <PerformanceSummary analysis={analysis} />
          </div>

          <div className="col-span-7 space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">迷宫路线回顾</h3>
              <MazeVisualization
                currentNodeId={game.currentNode}
                visitedNodes={visitedNodes}
                decisions={routeDecisions}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <DecisionTimeline
                decisions={game.decisions}
                funds={config.funds}
              />
            </div>
          </div>
        </div>

        {analysis.keyMistakes.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 错因分析与修正建议</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">关键失误点</h4>
                <div className="space-y-3">
                  {analysis.keyMistakes.map((mistake, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-red-800">第{mistake.step}步 - {mistake.type}</span>
                      </div>
                      <p className="text-sm text-red-700 mb-2">{mistake.description}</p>
                      <p className="text-sm text-red-600">影响: {mistake.impact.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-3">修正建议</h4>
                <div className="space-y-3">
                  {analysis.keyMistakes.map((mistake, i) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500">💡</span>
                        <span className="text-sm text-emerald-700">{mistake.suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
