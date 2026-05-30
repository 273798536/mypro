import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Home, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getTrackById } from '../data/sampleTracks';
import { getErrorLabel, getErrorColor } from '../utils/errorAnalysis';
import { formatTime } from '../utils/rhythmUtils';
import { ErrorType } from '../types';

export const ResultPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const track = trackId ? getTrackById(trackId) : null;
  
  const {
    score,
    maxCombo,
    judgments,
    errors,
    resetGame
  } = useGameStore();

  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  if (!track) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">未找到曲目</div>
      </div>
    );
  }

  const totalNotes = track.notes.length;
  const perfectCount = judgments.filter(j => j.judgment === 'perfect').length;
  const greatCount = judgments.filter(j => j.judgment === 'great').length;
  const goodCount = judgments.filter(j => j.judgment === 'good').length;
  const missCount = judgments.filter(j => 
    j.judgment === 'miss' || j.judgment === 'early' || j.judgment === 'late'
  ).length;
  const accuracy = totalNotes > 0 
    ? Math.round(((perfectCount + greatCount + goodCount) / totalNotes) * 100) 
    : 0;

  const getGrade = () => {
    if (accuracy >= 95) return { grade: 'S', color: 'text-yellow-400', bg: 'from-yellow-400 to-orange-500' };
    if (accuracy >= 85) return { grade: 'A', color: 'text-green-400', bg: 'from-green-400 to-emerald-500' };
    if (accuracy >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'from-blue-400 to-cyan-500' };
    if (accuracy >= 50) return { grade: 'C', color: 'text-purple-400', bg: 'from-purple-400 to-pink-500' };
    return { grade: 'D', color: 'text-red-400', bg: 'from-red-400 to-rose-500' };
  };

  const gradeInfo = getGrade();

  const errorTypeStats = errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<ErrorType, number>);

  const handleReplay = () => {
    setIsReplaying(true);
    setTimeout(() => {
      resetGame();
      navigate(`/game/${trackId}`);
    }, 500);
  };

  const handleBackToMenu = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-2">🎯 结算</h1>
          <p className="text-gray-400">{track.name}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className={`w-32 h-32 rounded-full bg-gradient-to-br ${gradeInfo.bg} flex items-center justify-center shadow-2xl`}
              >
                <span className={`text-6xl font-bold text-white ${gradeInfo.color}`}>
                  {gradeInfo.grade}
                </span>
              </motion.div>
              <div className="mt-4 text-gray-400">评级</div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 font-mono">
                    {score.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">总分</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 font-mono">
                    {accuracy}%
                  </div>
                  <div className="text-sm text-gray-400">准确率</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 font-mono">
                    {maxCombo}
                  </div>
                  <div className="text-sm text-gray-400">最高连击</div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-300">Perfect: {perfectCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-300">Great: {greatCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-gray-300">Good: {goodCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-300">Miss: {missCount}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            错因分析
          </h2>

          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              🎉 太棒了！没有检测到明显错误！
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 mb-6">
                {Object.entries(errorTypeStats).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: getErrorColor(type as ErrorType) + '20' }}
                  >
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getErrorColor(type as ErrorType) }}
                    />
                    <span className="text-white font-medium">
                      {getErrorLabel(type as ErrorType)}
                    </span>
                    <span className="text-white font-bold">{count}次</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {errors.map((error, index) => (
                  <motion.div
                    key={error.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="rounded-xl overflow-hidden"
                    style={{ borderLeft: `4px solid ${getErrorColor(error.type)}` }}
                  >
                    <button
                      onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                      className="w-full p-4 bg-gray-700 hover:bg-gray-600 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span 
                          className="px-3 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: getErrorColor(error.type) }}
                        >
                          {getErrorLabel(error.type)}
                        </span>
                        <span className="text-gray-300">{error.description}</span>
                        <span className="text-gray-500 text-sm font-mono">
                          {formatTime(error.time)}
                        </span>
                      </div>
                      {expandedError === error.id ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedError === error.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-750 overflow-hidden"
                        >
                          <div className="p-4 bg-gray-750">
                            <div className="text-sm text-gray-400 mb-2">💡 修正建议：</div>
                            <div className="space-y-2">
                              {error.suggestion.split('\n').map((suggestion, i) => (
                                <div key={i} className="flex items-start gap-2 text-gray-300">
                                  <span className="text-green-400">•</span>
                                  <span>{suggestion}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToMenu}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
          >
            <Home size={20} />
            返回菜单
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReplay}
            disabled={isReplaying}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {isReplaying ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RotateCcw size={20} />
              </motion.div>
            ) : (
              <RotateCcw size={20} />
            )}
            再来一局
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
