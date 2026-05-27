import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Play, History, Star, Target, Zap } from 'lucide-react';
import { LEVELS } from '@/config/levels';
import { getGameRecords } from '@/utils/storage';
import { GameRecord } from '@/types';
import { useGameStore } from '@/store/gameStore';

const difficultyColors = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  hard: 'bg-red-100 text-red-700 border-red-300',
};

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const startGame = useGameStore(state => state.startGame);
  const [recentRecords, setRecentRecords] = useState<GameRecord[]>([]);

  useEffect(() => {
    const records = getGameRecords().slice(0, 5);
    setRecentRecords(records);
  }, []);

  const handleStartGame = (levelId: string) => {
    startGame(levelId);
    navigate(`/game/${levelId}`);
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #d4a84b 1px, transparent 1px), radial-gradient(circle at 75% 75%, #d4a84b 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Target className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            税务稽核线索牌
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            通过卡牌推理，识别发票异常链路，提升财税风险识别能力
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-white font-bold mb-2">卡牌推理</h3>
            <p className="text-slate-400 text-sm">
              将发票、客户、付款记录关联分析，找出异常链条
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-bold mb-2">风险识别</h3>
            <p className="text-slate-400 text-sm">
              同票重复、上下游不匹配、付款滞后等多种异常
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold mb-2">评分报告</h3>
            <p className="text-slate-400 text-sm">
              生成专业稽核报告，支持导出和回看推理过程
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Play className="w-6 h-6 text-amber-400" />
            选择关卡
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {LEVELS.map((level, index) => (
              <div
                key={level.id}
                onClick={() => handleStartGame(level.id)}
                className="group bg-slate-800/70 backdrop-blur rounded-xl p-6 border-2 border-slate-600 hover:border-amber-500 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      difficultyColors[level.difficulty]
                    }`}
                  >
                    {difficultyLabels[level.difficulty]}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                  {level.name}
                </h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {level.description}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>时限: {Math.floor(level.timeLimit / 60)}分钟</span>
                  <span>
                    异常: {level.anomalies.duplicateInvoices + level.anomalies.mismatchChains + level.anomalies.delayedPayments} 处
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <History className="w-6 h-6 text-amber-400" />
              最近记录
            </h2>
            {recentRecords.length > 0 && (
              <button
                onClick={handleViewHistory}
                className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
              >
                查看全部 →
              </button>
            )}
          </div>

          {recentRecords.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700 text-center">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">暂无游戏记录，选择关卡开始你的第一次稽核吧！</p>
            </div>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      关卡
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      得分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      评级
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      识别/异常
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {recentRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                        {record.levelName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-amber-400 font-bold text-lg">{record.score}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex w-10 h-10 rounded-full items-center justify-center font-bold ${
                            record.grade === 'S'
                              ? 'bg-amber-500 text-white'
                              : record.grade === 'A'
                              ? 'bg-emerald-500 text-white'
                              : record.grade === 'B'
                              ? 'bg-blue-500 text-white'
                              : record.grade === 'C'
                              ? 'bg-slate-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {record.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        {record.detectedAnomalies}/{record.totalAnomalies}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                        {new Date(record.completedAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => navigate(`/replay/${record.id}`)}
                          className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                        >
                          回放
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
