import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, MapPin, Zap, Clock, RotateCcw, Play, Download, Home } from 'lucide-react';
import { useGame } from '../store/gameContext';
import { getLevelById } from '../data/levels';
import { getScoreGrade, analyzeFailureReasonFromReplay, generateSuccessTips } from '../utils/scoringUtils';
import { getReplays, downloadReplay, updateHighScore, unlockLevel } from '../utils/storage';
import { manhattanDistance } from '../utils/gridUtils';
import { Button } from '../components/ui/Button';
import type { ReplayRecord, ScoreResult } from '../types/game';

export const ResultPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { state } = useGame();
  
  const [replay, setReplay] = useState<ReplayRecord | null>(null);
  const [showTrajectory, setShowTrajectory] = useState(false);

  const level = getLevelById(Number(levelId));

  useEffect(() => {
    const replays = getReplays();
    const latestReplay = replays.find(r => r.levelId === Number(levelId));
    if (latestReplay) {
      setReplay(latestReplay);
    }
  }, [levelId]);

  useEffect(() => {
    if (replay && replay.result === 'success') {
      updateHighScore(Number(levelId), replay.finalScore);
      unlockLevel(Number(levelId) + 1);
    }
  }, [replay, levelId]);

  const handleDownloadReplay = () => {
    if (replay) {
      downloadReplay(replay);
    }
  };

  if (!replay || !level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const scoreResult: ScoreResult = (() => {
    if (!replay.guessPosition) {
      return { score: replay.finalScore, accuracy: 0, distance: 0, distanceScore: 0, turnEfficiency: 0, energyBonus: 0 };
    }
    const distance = manhattanDistance(replay.guessPosition, replay.actualPosition);
    const distanceScore = Math.max(0, 1000 - distance * 100);
    const turnEfficiency = Math.max(0, 500 - replay.turnsUsed * 50);
    const energyBonus = replay.energyLeft * 2;
    const accuracy = Math.max(0, 100 - distance * 10);
    return { score: replay.finalScore, accuracy, distance, distanceScore, turnEfficiency, energyBonus };
  })();

  const grade = getScoreGrade(replay.finalScore);
  const isSuccess = replay.result === 'success';
  const failureReasons = isSuccess ? [] : analyzeFailureReasonFromReplay(replay);
  const tips = isSuccess ? generateSuccessTips(scoreResult) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <h1 className="text-3xl font-bold text-white">游戏结果</h1>
          <div className="w-24" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-800/80 rounded-2xl p-8 border border-slate-700 mb-6"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 ${
                isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              <Trophy className={`w-16 h-16 ${isSuccess ? 'text-green-400' : 'text-red-400'}`} />
            </motion.div>
            <h2 className={`text-4xl font-bold mb-2 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {isSuccess ? '任务成功！' : '任务失败'}
            </h2>
            <p className="text-slate-400 text-lg">
              {isSuccess ? '你成功定位了潜艇的位置！' : replay.failReason || '未能准确定位潜艇'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-1">评级</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className={`text-6xl font-bold ${grade.color}`}
              >
                {grade.grade}
              </motion.div>
              <p className={`text-sm ${grade.color}`}>{grade.label}</p>
            </div>
            <div className="h-24 w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-1">最终得分</p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-5xl font-bold text-cyan-400"
              >
                {replay.finalScore}
              </motion.div>
              <p className="text-slate-500 text-sm">目标分数: {level.targetScore}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm mb-1">准确率</p>
              <p className="text-2xl font-bold text-white">{scoreResult.accuracy}%</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm mb-1">使用回合</p>
              <p className="text-2xl font-bold text-white">{replay.turnsUsed}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <Zap className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm mb-1">扫描次数</p>
              <p className="text-2xl font-bold text-white">{replay.scanHistory.length}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              位置对比
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">你的猜测</p>
                {replay.guessPosition ? (
                  <p className="text-xl font-bold text-blue-400">
                    ({replay.guessPosition.x}, {replay.guessPosition.y})
                  </p>
                ) : (
                  <p className="text-slate-500">未提交</p>
                )}
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-sm mb-1">实际位置</p>
                <p className="text-xl font-bold text-red-400">
                  ({replay.actualPosition.x}, {replay.actualPosition.y})
                </p>
              </div>
            </div>
          </div>

          {!isSuccess && failureReasons.length > 0 && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-red-400 mb-2">失败原因分析</h3>
              <ul className="space-y-1">
                {failureReasons.map((reason, index) => (
                  <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isSuccess && tips.length > 0 && (
            <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-2">提升建议</h3>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-green-400">💡</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="primary" onClick={() => navigate(`/game/${levelId}`)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              再玩一次
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/replay/${replay.id}`)}>
              <Play className="w-4 h-4 mr-2" />
              查看回放
            </Button>
            <Button variant="secondary" onClick={handleDownloadReplay}>
              <Download className="w-4 h-4 mr-2" />
              导出数据
            </Button>
            {isSuccess && level.id < 5 && (
              <Button variant="success" onClick={() => navigate(`/game/${level.id + 1}`)}>
                下一关
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
