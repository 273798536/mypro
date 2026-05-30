import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings, Music, AlertTriangle, Star, Train } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sampleTracks } from '../data/sampleTracks';
import { Track } from '../types';
import { getDifficultyLabel, getDifficultyStars } from '../utils/rhythmUtils';
import { useGameStore } from '../store/gameStore';

export const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, setSettings } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleStartGame = (trackId: string) => {
    navigate(`/game/${trackId}`);
  };

  const syncopationCount = (track: Track) => 
    track.notes.filter(n => n.isSyncopated).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-4">
            <Train className="text-yellow-400" size={48} />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              节拍火车调度员
            </span>
            <Train className="text-yellow-400" size={48} />
          </h1>
          <p className="text-gray-400 text-lg">
            把每个音符火车调度到正确的轨道上！
          </p>
        </motion.div>

        <div className="flex justify-end mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Settings size={20} />
            游戏设置
          </motion.button>
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-800 rounded-xl p-6 mb-8"
          >
            <h3 className="text-xl font-bold text-white mb-4">游戏设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">判定灵敏度</label>
                <select
                  value={settings.sensitivity}
                  onChange={(e) => setSettings({ sensitivity: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">简单 - 判定窗口宽松</option>
                  <option value="normal">普通 - 标准判定</option>
                  <option value="hard">困难 - 严格判定</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">显示备注</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSettings({ showRemarks: !settings.showRemarks })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.showRemarks ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.showRemarks ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <span className="text-white">{settings.showRemarks ? '开启' : '关闭'}</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">容错模式</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSettings({ toleranceMode: !settings.toleranceMode })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.toleranceMode ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.toleranceMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <span className="text-white">{settings.toleranceMode ? '开启' : '关闭'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Music className="text-blue-400" />
          选择曲目
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sampleTracks.map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => handleStartGame(track.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                      {track.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {track.description}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play size={24} className="text-white ml-1" />
                  </motion.div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Star className="text-yellow-400" size={16} />
                    <span>{getDifficultyStars(track.difficulty)}</span>
                    <span className="ml-1">({getDifficultyLabel(track.difficulty)})</span>
                  </div>
                  <div className="text-gray-400">
                    <span className="text-blue-400 font-mono">{track.bpm}</span> BPM
                  </div>
                  <div className="text-gray-400">
                    <span className="text-green-400 font-mono">{track.notes.length}</span> 音符
                  </div>
                  <div className="text-gray-400">
                    <span className="text-orange-400 font-mono">{syncopationCount(track)}</span> 切分音
                  </div>
                  {track.hasDirtyData && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <AlertTriangle size={16} />
                      <span>含脏数据</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-2 bg-gray-700">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: `${(track.difficulty / 5) * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">🎮 操作说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-1 bg-gray-700 rounded text-white font-mono">D F J K</kbd>
              <span>或 <kbd className="px-2 py-0.5 bg-gray-700 rounded text-white font-mono text-sm">1 2 3 4</kbd> 调度到对应轨道</span>
            </div>
            <div className="flex items-start gap-3">
              <kbd className="px-3 py-1 bg-gray-700 rounded text-white font-mono">空格</kbd>
              <span>暂停 / 继续游戏</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚂</span>
              <span>黄色闪烁的是切分音，需要更精准的节奏</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <span>脏数据曲目包含备注、延迟或缺失字段</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
