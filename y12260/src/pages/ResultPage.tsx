import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { ScoreCalculator } from '@/engine/ScoreCalculator';
import { ConflictDetector } from '@/engine/ConflictDetector';
import { cn } from '@/lib/utils';
import {
  Trophy,
  ArrowLeft,
  RotateCcw,
  Play,
  FileText,
  Link2Off,
  Box,
  Users,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Clock,
  Zap
} from 'lucide-react';

export const ResultPage = () => {
  const navigate = useNavigate();
  const {
    score,
    baseScore,
    penalties,
    conflicts,
    level,
    placedDevices,
    cables,
    walkPaths,
    timeLeft,
    totalTime,
    restartGame,
    buildReviewHistory,
    scoreResult
  } = useGameStore();

  const result = scoreResult || ScoreCalculator.calculate(
    placedDevices,
    cables,
    walkPaths,
    conflicts,
    level,
    timeLeft,
    totalTime
  );

  const cableConflicts = conflicts.filter(c => c.type === 'cable_cross');
  const deviceConflicts = conflicts.filter(c => c.type === 'device_block');
  const walkConflicts = conflicts.filter(c => c.type === 'walk_conflict');

  const handleReview = () => {
    buildReviewHistory();
    navigate('/review');
  };

  const handleReport = () => {
    navigate('/report');
  };

  const handleRestart = () => {
    restartGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          <span>返回游戏</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">游戏结算</h1>
          <p className="text-slate-400">{level.name}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-500">
            <span>关卡版本: {level.version}</span>
            <span>•</span>
            <span>来源: {level.source}</span>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <Trophy size={32} style={{ color: ScoreCalculator.getRatingColor(result.rating) }} />
                <div className="text-left">
                  <div className="text-sm text-slate-400">评级</div>
                  <div
                    className="text-5xl font-bold"
                    style={{ color: ScoreCalculator.getRatingColor(result.rating) }}
                  >
                    {result.rating}
                  </div>
                </div>
              </div>
              <p className="text-slate-300 max-w-md">
                {ScoreCalculator.getRatingDescription(result.rating)}
              </p>
            </div>

            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">最终得分</div>
              <div className="text-6xl font-bold text-yellow-400 font-mono mb-2">
                {result.totalScore}
              </div>
              <div className="text-sm text-slate-500">
                满分约 {result.baseScore + result.timeBonus} 分
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <Zap size={20} className="text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400 font-mono">+{result.deviceScore}</div>
              <div className="text-xs text-slate-400">设备得分</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                <Link2Off size={20} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">+{result.cableScore}</div>
              <div className="text-xs text-slate-400">线缆得分</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400 font-mono">+{result.timeBonus}</div>
              <div className="text-xs text-slate-400">时间奖励</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                <Minus size={20} className="text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400 font-mono">-{result.penalties}</div>
              <div className="text-xs text-slate-400">冲突扣分</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-400" />
            冲突明细
          </h2>

          {conflicts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
              <p className="text-lg text-slate-300">太棒了！没有发现任何冲突</p>
              <p className="text-slate-500 mt-1">你的调度非常完美，可以直接用于现场演出</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cableConflicts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2Off size={18} className="text-red-400" />
                    <span className="font-semibold text-red-400">线缆穿越</span>
                    <span className="text-sm text-red-400/70">
                      ({cableConflicts.length}处，共扣{cableConflicts.reduce((s, c) => s + c.penalty, 0)}分)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cableConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="bg-slate-800/50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-slate-200">{conflict.description}</div>
                          <div className="text-red-400 font-mono ml-4 flex-shrink-0">
                            -{conflict.penalty}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          位置: {conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deviceConflicts.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Box size={18} className="text-orange-400" />
                    <span className="font-semibold text-orange-400">设备遮挡</span>
                    <span className="text-sm text-orange-400/70">
                      ({deviceConflicts.length}处，共扣{deviceConflicts.reduce((s, c) => s + c.penalty, 0)}分)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {deviceConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="bg-slate-800/50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-slate-200">{conflict.description}</div>
                          <div className="text-orange-400 font-mono ml-4 flex-shrink-0">
                            -{conflict.penalty}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          位置: {conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {walkConflicts.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-yellow-400" />
                    <span className="font-semibold text-yellow-400">走位冲突</span>
                    <span className="text-sm text-yellow-400/70">
                      ({walkConflicts.length}处，共扣{walkConflicts.reduce((s, c) => s + c.penalty, 0)}分)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {walkConflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="bg-slate-800/50 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-slate-200">{conflict.description}</div>
                          <div className="text-yellow-400 font-mono ml-4 flex-shrink-0">
                            -{conflict.penalty}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          位置: {conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleReview}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-all duration-200 shadow-lg shadow-purple-500/30 active:scale-95"
          >
            <Play size={18} />
            查看复盘
          </button>
          <button
            onClick={handleReport}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-all duration-200 shadow-lg shadow-cyan-500/30 active:scale-95"
          >
            <FileText size={18} />
            导出报告
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-700 text-slate-200 rounded-xl font-semibold hover:bg-slate-600 transition-all duration-200 active:scale-95"
          >
            <RotateCcw size={18} />
            再玩一次
          </button>
        </div>
      </div>
    </div>
  );
};
