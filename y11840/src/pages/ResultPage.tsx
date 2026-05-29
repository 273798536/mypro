import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { ErrorFilter } from '@/components/ErrorFilter';
import { RuleMatchTimeline } from '@/components/RuleMatchTimeline';
import { Trophy, Home, RotateCcw, BookOpen, Target, Clock, CheckCircle2, XCircle, Database, Zap } from 'lucide-react';
import type { ErrorType, DecisionRecord } from '@/types';
import { ERROR_TYPE_LABELS } from '@/types';

export default function ResultPage() {
  const navigate = useNavigate();
  const { resultStats, decisionRecords, resetGame, initGame, difficulty, score, totalScore } = useGameStore();
  const [selectedFilter, setSelectedFilter] = useState<ErrorType | 'all' | 'correct' | 'wrong'>('all');
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!resultStats) {
      navigate('/');
    }
  }, [resultStats, navigate]);

  useEffect(() => {
    if (resultStats) {
      const targetScore = resultStats.score;
      const duration = 2000;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(targetScore * easeProgress));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [resultStats]);

  const handleRestart = () => {
    const cardCount = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15;
    initGame(difficulty, cardCount);
    navigate('/game');
  };

  const handleHome = () => {
    resetGame();
    navigate('/');
  };

  const filteredRecords = decisionRecords.filter(record => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'correct') return record.isCorrect;
    if (selectedFilter === 'wrong') return !record.isCorrect;
    return record.errorType === selectedFilter;
  });

  if (!resultStats) return null;

  const levelColors = {
    S: 'from-yellow-400 to-orange-500',
    A: 'from-emerald-400 to-green-500',
    B: 'from-blue-400 to-cyan-500',
    C: 'from-orange-400 to-amber-500',
    D: 'from-red-400 to-rose-500',
  };

  const levelDescriptions = {
    S: '🌟 卓越！你是分流大师！',
    A: '👏 优秀！继续保持！',
    B: '👍 良好，还有提升空间！',
    C: '💪 继续努力，多练习！',
    D: '📚 需要加强学习规则！',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e508_1px,transparent_1px),linear-gradient(to_bottom,#4f46e508_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-6">
            <Trophy className="w-4 h-4" />
            <span>挑战完成</span>
          </div>
          
          <div className="relative inline-block mb-4">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${levelColors[resultStats.level]} flex items-center justify-center mx-auto shadow-2xl animate-pulse-slow`}>
              <span className="text-5xl font-bold text-white">{resultStats.level}</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${levelColors[resultStats.level]} transition-all duration-1000`}
                  style={{ width: `${(score / Math.max(totalScore, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">{levelDescriptions[resultStats.level]}</h1>
          <p className="text-gray-400">
            难度: {difficulty === 'easy' ? '新手模式' : difficulty === 'medium' ? '进阶模式' : '挑战模式'}
          </p>
        </header>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 text-center">
            <Target className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white font-mono mb-1">
              {displayScore}
              <span className="text-lg text-gray-500">/{totalScore}</span>
            </div>
            <div className="text-sm text-gray-400">最终得分</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-emerald-400 font-mono mb-1">
              {resultStats.correctCount}
              <span className="text-lg text-gray-500">/{resultStats.totalCards}</span>
            </div>
            <div className="text-sm text-gray-400">正确决策</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 text-center">
            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-red-400 font-mono mb-1">
              {resultStats.wrongCount}
            </div>
            <div className="text-sm text-gray-400">错误决策</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 text-center">
            <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-cyan-400 font-mono mb-1">
              {(resultStats.avgResponseTime / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-400">平均响应</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              正确率
            </h3>
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold text-white font-mono">
                    {(resultStats.accuracy * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-slate-700">
                <div
                  style={{ width: `${resultStats.accuracy * 100}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-yellow-400" />
              脏数据处理
            </h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 font-mono mb-2">
                {resultStats.dirtyDataHandled}
              </div>
              <p className="text-sm text-gray-400">条包含脏数据的会话已自动处理</p>
            </div>
          </div>
        </div>

        {resultStats.wrongCount > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              错误类型分布
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.keys(ERROR_TYPE_LABELS) as ErrorType[]).map(type => {
                const count = resultStats.errorBreakdown[type];
                if (count === 0) return null;
                const percentage = (count / resultStats.wrongCount) * 100;
                return (
                  <div key={type} className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-400 font-mono">{count}</div>
                    <div className="text-xs text-gray-400 mb-2">{ERROR_TYPE_LABELS[type]}</div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8">
          <ErrorFilter
            errorBreakdown={resultStats.errorBreakdown}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            correctCount={resultStats.correctCount}
            wrongCount={resultStats.wrongCount}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-white font-semibold mb-4">
            决策记录 ({filteredRecords.length} 条)
          </h3>
          {filteredRecords.length > 0 ? (
            <RuleMatchTimeline records={filteredRecords} />
          ) : (
            <div className="text-center py-12 text-gray-400">
              暂无符合筛选条件的记录
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再来一局
          </button>
          <button
            onClick={() => navigate('/rules')}
            className="flex items-center gap-2 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all duration-300"
          >
            <BookOpen className="w-4 h-4" />
            查看规则
          </button>
          <button
            onClick={handleHome}
            className="flex items-center gap-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium rounded-xl border border-slate-700 transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
