import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  History,
  Map,
  Shield,
  Users,
  AlertTriangle,
  Database,
  ChevronRight,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { festivalMaps } from '../data/maps';
import { useHistoryStore } from '../store/useHistoryStore';

export default function Home() {
  const navigate = useNavigate();
  const { histories, loadHistories } = useHistoryStore();
  const [selectedMapId, setSelectedMapId] = useState<string>(festivalMaps[0]?.id || '');

  useEffect(() => {
    loadHistories();
  }, [loadHistories]);

  const selectedMap = festivalMaps.find(m => m.id === selectedMapId) || festivalMaps[0];

  const features = [
    {
      icon: Shield,
      title: '智能布阵',
      description: '拖拽部署安保力量，合理规划固定岗、巡逻队和应急队的位置',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: '人流模拟',
      description: '基于粒子系统的真实人流模拟，实时计算拥堵指数和巡逻覆盖率',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: AlertTriangle,
      title: '事件处置',
      description: '随机触发各类突发事件，考验应急响应和决策能力',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      icon: Database,
      title: '数据溯源',
      description: '每条决策都可追溯到原始数据来源，包含脏数据检测功能',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: BarChart3,
      title: '多维评分',
      description: '5大维度加权评分，详细的扣分明细和改进建议',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: History,
      title: '复盘分析',
      description: '完整的时间轴回放，支持变速播放和关键节点定位',
      color: 'from-emerald-500 to-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative bg-slate-800/50 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                音乐节安保布阵
              </h1>
              <p className="text-xs text-slate-400 tracking-widest">FESTIVAL SECURITY DEPLOYMENT SIMULATOR</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
          >
            <History className="w-5 h-5 text-emerald-400" />
            <span className="hidden sm:inline">历史记录</span>
            {histories.length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                {histories.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>面向活动安保主管的策略训练系统</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
              精准指挥
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              守护每一场盛会
            </span>
          </h2>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            通过真实的人流模拟和突发事件处置，训练您的安保指挥决策能力。
            每一次布阵都将影响最终的安全评分。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Map className="w-6 h-6 text-cyan-400" />
              选择场地
            </h3>
            
            <div className="space-y-3 mb-6">
              {festivalMaps.map(map => (
                <button
                  key={map.id}
                  onClick={() => setSelectedMapId(map.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                    selectedMapId === map.id
                      ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-2 border-cyan-500'
                      : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Map className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">{map.name}</div>
                    <div className="text-sm text-slate-400">
                      {map.elements.length}个区域 · {map.expectedAttendance}人 · {Math.floor(map.duration / 60)}分钟
                    </div>
                  </div>
                  {selectedMapId === map.id && (
                    <ChevronRight className="w-6 h-6 text-cyan-400" />
                  )}
                </button>
              ))}
            </div>

            {selectedMap && (
              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-bold text-slate-300 mb-3">场地信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">场地尺寸</div>
                    <div className="text-white">{selectedMap.width} × {selectedMap.height}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">预计人数</div>
                    <div className="text-white">{selectedMap.expectedAttendance}人</div>
                  </div>
                  <div>
                    <div className="text-slate-500">游戏时长</div>
                    <div className="text-white">{Math.floor(selectedMap.duration / 60)}分钟</div>
                  </div>
                  <div>
                    <div className="text-slate-500">区域数量</div>
                    <div className="text-white">{selectedMap.elements.length}个</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate(`/game/${selectedMapId}`)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-cyan-500/30"
            >
              <Play className="w-6 h-6" />
              开始游戏
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" />
              核心功能
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-cyan-900/30 via-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-cyan-500/20"
        >
          <div className="text-center max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              专为安保主管设计的训练工具
            </h3>
            <p className="text-slate-300 mb-6">
              不再需要手工判断出口拥堵。系统会自动注入脏数据样例，测试您对巡逻空窗、天气突变等情况的识别和处置能力。
              每一条决策都会被记录，支持完整的复盘分析和数据溯源。
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300">脏数据检测</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300">哈希去重</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">多维评分</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg">
                <History className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">持久化存储</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative border-t border-slate-800 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>音乐节安保布阵模拟器 · 活动安保指挥训练系统</p>
          <p className="mt-1">历史记录本地持久化存储 · 重启不丢失</p>
        </div>
      </footer>
    </div>
  );
}
