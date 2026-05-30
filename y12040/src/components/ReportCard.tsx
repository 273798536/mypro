import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateReportCard, formatDuration } from '../utils/reportGenerator';
import { getFunctionExpression } from '../utils/mathEngine';
import { Trophy, Target, Zap, Lightbulb, Calculator, Clock, XCircle, CheckCircle2, History } from 'lucide-react';

interface ReportCardProps {
  onPlayAgain: () => void;
}

export const ReportCard = ({ onPlayAgain }: ReportCardProps) => {
  const {
    startTime,
    endTime,
    score,
    currentParams,
    history,
    collisions,
  } = useGameStore();

  const report = useMemo(() => {
    if (!startTime || !endTime) return null;
    
    const paramChanges = history
      .filter(h => h.type === 'param_change' && h.params)
      .map(h => h.params!);

    return generateReportCard(
      startTime,
      endTime,
      score,
      currentParams,
      paramChanges,
      collisions,
      history
    );
  }, [startTime, endTime, score, currentParams, history, collisions]);

  if (!report) return null;

  const getGrade = (score: number): { grade: string; color: string; emoji: string } => {
    if (score >= 900) return { grade: 'A+', color: 'text-success-500', emoji: '🏆' };
    if (score >= 800) return { grade: 'A', color: 'text-success-500', emoji: '🌟' };
    if (score >= 700) return { grade: 'B', color: 'text-curve-500', emoji: '👍' };
    if (score >= 600) return { grade: 'C', color: 'text-warning-500', emoji: '💪' };
    return { grade: 'D', color: 'text-ski-500', emoji: '🔄' };
  };

  const gradeInfo = getGrade(report.totalScore);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="bg-gradient-to-r from-mountain-600 to-mountain-700 text-white p-8 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <Trophy className="text-yellow-400" />
                滑雪成绩单
              </h1>
              <p className="text-mountain-200 mt-2">函数图像滑雪赛 · 数学挑战</p>
            </div>
            <div className="text-right">
              <div className={`text-6xl font-display font-bold ${gradeInfo.color}`}>
                {gradeInfo.emoji} {gradeInfo.grade}
              </div>
              <div className="text-5xl font-display font-bold mt-2">
                {report.totalScore}
                <span className="text-2xl text-mountain-300 ml-2">分</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-snow-50 rounded-xl p-4 text-center">
              <Clock className="mx-auto text-mountain-500 mb-2" size={24} />
              <p className="text-xs text-gray-500">用时</p>
              <p className="text-xl font-bold text-mountain-700">
                {formatDuration(report.startTime, report.endTime)}
              </p>
            </div>
            <div className="bg-snow-50 rounded-xl p-4 text-center">
              <Target className="mx-auto text-ski-500 mb-2" size={24} />
              <p className="text-xs text-gray-500">碰撞次数</p>
              <p className={`text-xl font-bold ${report.collisions.length === 0 ? 'text-success-500' : 'text-ski-500'}`}>
                {report.collisions.length}
              </p>
            </div>
            <div className="bg-snow-50 rounded-xl p-4 text-center">
              <Calculator className="mx-auto text-curve-500 mb-2" size={24} />
              <p className="text-xs text-gray-500">参数调整</p>
              <p className="text-xl font-bold text-curve-600">
                {report.paramChanges.length}
              </p>
            </div>
            <div className="bg-snow-50 rounded-xl p-4 text-center">
              <Zap className="mx-auto text-warning-500 mb-2" size={24} />
              <p className="text-xs text-gray-500">最终函数</p>
              <p className="text-sm font-mono font-bold text-warning-600">
                {getFunctionExpression(report.finalParams)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-mountain-50 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-bold text-mountain-700 mb-4">
                <Lightbulb size={20} className="text-warning-500" />
                参数影响分析
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {report.conclusions.paramEffect}
              </p>
            </div>

            <div className="bg-curve-50 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-bold text-curve-700 mb-4">
                <Zap size={20} />
                速度与碰撞分析
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {report.conclusions.speedAnalysis}
              </p>
            </div>
          </div>

          <div className="bg-warning-50 rounded-xl p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold text-warning-700 mb-4">
              <Target size={20} />
              数学学习建议
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {report.conclusions.suggestions}
            </p>
          </div>

          <div className="bg-gradient-to-r from-mountain-50 to-curve-50 rounded-xl p-5 border-2 border-mountain-200">
            <h3 className="flex items-center gap-2 text-lg font-bold text-mountain-700 mb-4">
              <Calculator size={20} />
              数学结论总结
            </h3>
            <p className="text-gray-700 leading-relaxed font-mono text-sm">
              {report.conclusions.mathSummary}
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-700 mb-4">
              <History size={20} />
              操作时间线
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {report.history.slice(-10).reverse().map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.type === 'collision' ? 'bg-ski-100 text-ski-600' :
                    entry.type === 'finish' ? 'bg-success-100 text-success-600' :
                    entry.type === 'start' ? 'bg-curve-100 text-curve-600' :
                    'bg-mountain-100 text-mountain-600'
                  }`}>
                    {entry.type === 'collision' ? <XCircle size={16} /> :
                     entry.type === 'finish' ? <CheckCircle2 size={16} /> :
                     entry.type === 'start' ? <Zap size={16} /> :
                     <Calculator size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.collisions.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ski-600 mb-4">
                <XCircle size={20} />
                碰撞记录详情
              </h3>
              <div className="space-y-2">
                {report.collisions.map((collision, index) => (
                  <div key={collision.id} className="bg-ski-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ski-700">碰撞 #{index + 1}</p>
                      <p className="text-xs text-gray-500">
                        位置: ({collision.position.x.toFixed(0)}, {collision.position.y.toFixed(0)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">当时参数</p>
                      <p className="text-xs font-mono text-ski-600">
                        a={collision.params.a.toFixed(3)}, b={collision.params.b.toFixed(2)}, c={collision.params.c.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-2 bg-gradient-to-r from-curve-500 to-curve-600 hover:from-curve-600 hover:to-curve-700 text-white font-bold py-4 px-10 rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              <Zap size={20} />
              再来一次
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
