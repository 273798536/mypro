import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { LEVELS } from '../data/levels';
import { StarRating } from '../components/StarRating';
import { Play, History, Trophy, Clock, Target, ChevronRight } from 'lucide-react';

export const Home: React.FC = () => {
  const { startGame, setPage, bestScores, gameHistory } = useGameStore();

  const getLevelStats = (levelId: number) => {
    const levelRecords = gameHistory.filter(r => r.levelId === levelId);
    return {
      played: levelRecords.length,
      best: bestScores[levelId] || 0,
      bestStars: levelRecords.length > 0 
        ? Math.max(...levelRecords.map(r => r.starRating)) 
        : 0,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aviation-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-aviation-100 text-aviation-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Target size={16} />
            机场地服培训系统
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            航班行李分拣快线
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            沉浸式学习行李分拣规则，掌握转机行李、超规件和延误航班的分流操作
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Clock, label: '单局时长', value: '3-6分钟' },
            { icon: Trophy, label: '关卡数量', value: '5个关卡' },
            { icon: Target, label: '训练重点', value: '5大场景' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-aviation-100 rounded-lg text-aviation-600">
                  <item.icon size={24} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">{item.label}</div>
                  <div className="text-2xl font-bold text-gray-800">{item.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">选择关卡</h2>
          <button
            onClick={() => setPage('history')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <History size={18} />
            查看历史记录
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEVELS.map((level, index) => {
            const stats = getLevelStats(level.id);
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden group"
              >
                <div className={`p-6 ${
                  level.difficulty <= 2 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                    : level.difficulty <= 4 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50'
                      : 'bg-gradient-to-r from-red-50 to-orange-50'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">关卡 {level.id}</div>
                      <h3 className="text-xl font-bold text-gray-800">{level.name}</h3>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < level.difficulty ? 'bg-warning-500' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{level.description}</p>
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {level.focusAreas.map(area => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500">时长</div>
                      <div className="font-mono font-bold text-gray-700">
                        {Math.floor(level.duration / 60)}分钟
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">行李数</div>
                      <div className="font-mono font-bold text-gray-700">
                        {level.baggageCount}件
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">最高分</div>
                      <div className="font-mono font-bold text-aviation-600">
                        {stats.best}
                      </div>
                    </div>
                  </div>

                  {stats.played > 0 && (
                    <div className="flex items-center justify-between mb-4 py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">最佳成绩</span>
                      <StarRating rating={stats.bestStars} size={16} />
                    </div>
                  )}

                  <button
                    onClick={() => startGame(level.id)}
                    className="w-full py-3 bg-aviation-500 hover:bg-aviation-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
                  >
                    <Play size={18} />
                    开始挑战
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">游戏规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">1.</span>
                查看行李牌信息：航班号、目的地、重量、转机时间、是否延误
              </p>
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">2.</span>
                超规行李（重量≥30kg）必须送往超规通道
              </p>
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">3.</span>
                转机时间不足30分钟的行李应走加急转机通道
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">4.</span>
                延误航班的行李应送往延误通道
              </p>
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">5.</span>
                普通行李根据航班号送往对应登机口
              </p>
              <p className="flex items-start gap-2">
                <span className="text-aviation-500 font-bold">6.</span>
                在时间结束前尽可能多地正确分拣行李获取高分
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
