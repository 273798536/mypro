import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trash2,
  Play,
  Trophy,
  Calendar,
  User,
  Target,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import type { GameRecord } from '../types';

export default function History() {
  const navigate = useNavigate();
  const { records, loadRecords, deleteRecord, getTopScores } = useHistoryStore();
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const topScores = getTopScores(3);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-black text-white">历史记录</h1>
        </div>

        {topScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-warning-400" />
              <h2 className="text-xl font-bold text-white">排行榜</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {topScores.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`text-center p-4 rounded-xl ${
                    index === 0
                      ? 'bg-warning-500/20 border border-warning-500/50'
                      : index === 1
                      ? 'bg-gray-400/20 border border-gray-400/50'
                      : 'bg-orange-700/20 border border-orange-700/50'
                  }`}
                >
                  <div
                    className={`text-4xl font-black mb-2 ${
                      index === 0
                        ? 'text-warning-400'
                        : index === 1
                        ? 'text-gray-300'
                        : 'text-orange-400'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <p className="text-white font-medium mb-1">{record.playerName}</p>
                  <p className="text-2xl font-bold text-success-400">{record.totalScore}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-300" />
            全部记录
          </h2>

          {records.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无游戏记录</p>
              <p className="text-sm mt-2">完成一次游戏后，记录将显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedRecord?.id === record.id
                      ? 'bg-primary-500/20 border-primary-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-500/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-300" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{record.playerName}</p>
                        <p className="text-sm text-white/60 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(record.endTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-success-400">{record.totalScore}</p>
                        <p className="text-xs text-white/60">
                          {record.correctCount}/{record.totalCount} 题
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/replay/${record.id}`);
                          }}
                          className="p-2 rounded-lg bg-primary-500/30 hover:bg-primary-500/50 text-primary-300 transition-colors"
                          title="查看回放"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecord(record.id);
                          }}
                          className="p-2 rounded-lg bg-danger-500/30 hover:bg-danger-500/50 text-danger-300 transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedRecord?.id === record.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <Target className="w-6 h-6 text-success-400 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-success-400">
                            {((record.correctCount / record.totalCount) * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-white/60">正确率</p>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="w-6 h-6 text-primary-300 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-primary-300">
                            {record.totalScore}
                          </p>
                          <p className="text-xs text-white/60">得分</p>
                        </div>
                        <div className="text-center">
                          <Clock className="w-6 h-6 text-warning-400 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-warning-400">
                            {(
                              record.operations.reduce((sum, op) => sum + op.operationTime, 0) /
                              record.operations.length
                            ).toFixed(1)}s
                          </p>
                          <p className="text-xs text-white/60">平均耗时</p>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="w-6 h-6 text-danger-400 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-danger-400">
                            {Object.values(record.errorTypes).reduce((a, b) => a + b, 0)}
                          </p>
                          <p className="text-xs text-white/60">错误次数</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
