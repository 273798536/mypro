import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Settings, History, Users, Database, Trophy, Ship } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useHistoryStore } from '../store/historyStore';
import { DIFFICULTY_LABELS } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const { settings, setSettings, setPlayerName, playerName } = useGameStore();
  const { loadRecords, records, getTopScores } = useHistoryStore();
  const [showSettings, setShowSettings] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const topScores = getTopScores(5);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      setPlayerName('匿名学员');
    }
    navigate('/game');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Ship className="w-16 h-16 text-primary-300" />
          <h1 className="text-5xl font-black text-white tracking-tight">
            码头闸口验放赛
          </h1>
        </div>
        <p className="text-xl text-primary-200/80 max-w-2xl">
          训练快速识别箱号、核对预约、拦截危品，成为最优秀的闸口操作员！
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setRole('student')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                role === 'student'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Users className="w-5 h-5" />
              学员模式
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <Database className="w-5 h-5" />
              管理员
            </button>
          </div>

          {role === 'student' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  学员姓名
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="input-field text-lg"
                />
              </div>

              {!showSettings ? (
                <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                  <span>
                    模式: {settings.gameMode === 'quick' ? '快速模式' : '自定义'} · 
                    难度: {DIFFICULTY_LABELS[settings.difficulty]} · 
                    {settings.totalTime}秒
                  </span>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1 text-primary-300 hover:text-primary-200"
                  >
                    <Settings className="w-4 h-4" />
                    自定义设置
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 mb-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        游戏时间 (秒)
                      </label>
                      <input
                        type="number"
                        value={settings.totalTime}
                        onChange={(e) => setSettings({ totalTime: Number(e.target.value) })}
                        className="input-field"
                        min="60"
                        max="600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        车辆数量
                      </label>
                      <input
                        type="number"
                        value={settings.vehicleCount}
                        onChange={(e) => setSettings({ vehicleCount: Number(e.target.value) })}
                        className="input-field"
                        min="3"
                        max="20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      难度选择
                    </label>
                    <select
                      value={settings.difficulty}
                      onChange={(e) => setSettings({ difficulty: e.target.value as any })}
                      className="input-field"
                    >
                      <option value="easy">简单</option>
                      <option value="medium">中等</option>
                      <option value="hard">困难</option>
                      <option value="mixed">混合</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-sm text-primary-300 hover:text-primary-200"
                  >
                    收起设置
                  </button>
                </motion.div>
              )}

              <button
                onClick={handleStartGame}
                className="w-full btn-success text-xl py-4 flex items-center justify-center gap-3"
              >
                <Play className="w-7 h-7" />
                开始验放挑战
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/history')}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <History className="w-5 h-5" />
                  历史记录
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => navigate('/admin')}
                className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-3"
              >
                <Database className="w-6 h-6" />
                材料管理
              </button>
              <button
                onClick={() => navigate('/admin/import')}
                className="w-full btn-warning text-lg py-4 flex items-center justify-center gap-3"
              >
                <Settings className="w-6 h-6" />
                导入数据
              </button>
              <button
                onClick={() => navigate('/history')}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <History className="w-5 h-5" />
                查看全员成绩
              </button>
            </div>
          )}
        </div>

        {topScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-warning-400" />
              <h2 className="text-xl font-bold text-white">排行榜</h2>
            </div>
            <div className="space-y-2">
              {topScores.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? 'bg-warning-500 text-white'
                          : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                          ? 'bg-orange-700 text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-white font-medium">
                      {record.playerName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-success-400">
                      {record.totalScore}
                    </span>
                    <span className="text-white/40 text-sm ml-2">
                      {((record.correctCount / record.totalCount) * 100).toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-white/40 text-sm"
      >
        <p>💡 提示：注意核对箱号、预约信息和危品标记，避免误放！</p>
      </motion.div>
    </div>
  );
}
