import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw, FileText, Play, CheckCircle, XCircle, AlertTriangle, Zap, TrendingUp, Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ReportGenerator } from '../engine/ReportGenerator';
import { InspectionReport } from '../types';
import { calculateRating, getRatingColor, formatTime } from '../utils/helpers';

export const ResultScreen = () => {
  const navigate = useNavigate();
  const { level, currentTime, score, battery, faults, objectives, resetGame } = useGameStore();
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const state = useGameStore.getState();
    const generatedReport = ReportGenerator.generateReport(state);
    setReport(generatedReport);
    
    localStorage.setItem('lastReport', JSON.stringify(generatedReport));
  }, []);

  if (!level || !report) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const rating = calculateRating(score);
  const ratingColor = getRatingColor(rating);
  
  const fixedFaults = faults.filter(f => f.status === 'fixed').length;

  const handleRestart = () => {
    resetGame();
    navigate('/');
  };

  const handleViewReport = () => {
    navigate('/report');
  };

  const handleReplay = () => {
    navigate('/replay');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-block mb-6"
          >
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: ratingColor + '20', border: `4px solid ${ratingColor}` }}
            >
              <span className="text-6xl font-bold" style={{ color: ratingColor }}>
                {rating}
              </span>
            </div>
          </motion.div>
          
          <h1 className="text-4xl font-bold mb-2">关卡完成！</h1>
          <p className="text-xl text-slate-400">{level.name}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Trophy className="w-6 h-6 text-yellow-400" />}
            label="最终得分"
            value={score.toString()}
            delay={0.3}
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
            label="处理故障"
            value={`${fixedFaults}/${faults.length}`}
            delay={0.4}
          />
          <StatCard
            icon={<Zap className="w-6 h-6 text-cyan-400" />}
            label="剩余电量"
            value={`${Math.round(battery)}%`}
            delay={0.5}
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-purple-400" />}
            label="用时"
            value={formatTime(currentTime)}
            delay={0.6}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              得分明细
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {report.scoreBreakdown.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                  className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
                >
                  <div>
                    <span className="text-slate-300">{item.category}</span>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <span className={`font-bold ${item.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.points >= 0 ? '+' : ''}{item.points}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              关卡目标
            </h3>
            <div className="space-y-3">
              {objectives.map((obj, index) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    obj.completed
                      ? 'bg-green-900/20 border-green-500/30'
                      : 'bg-red-900/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {obj.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-slate-300">{obj.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${obj.completed ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, (obj.current / obj.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{obj.current}/{obj.target}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              处理结果概览
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showDetails ? '收起详情' : '展开详情'}
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-red-900/20 rounded-lg border border-red-500/30">
              <p className="text-3xl font-bold text-red-400">{report.unhandledItems.length}</p>
              <p className="text-sm text-slate-400">未处理</p>
            </div>
            <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
              <p className="text-3xl font-bold text-green-400">{report.correctedItems.length}</p>
              <p className="text-sm text-slate-400">已修正</p>
            </div>
            <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <p className="text-3xl font-bold text-yellow-400">{report.needConfirmItems.length}</p>
              <p className="text-sm text-slate-400">待确认</p>
            </div>
          </div>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-slate-700 pt-4 space-y-4"
            >
              {report.unhandledItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-400 mb-2">未处理项：</h4>
                  <div className="space-y-2">
                    {report.unhandledItems.slice(0, 3).map(item => (
                      <div key={item.id} className="text-sm text-slate-400 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span>{item.areaName} - {item.type}</span>
                      </div>
                    ))}
                    {report.unhandledItems.length > 3 && (
                      <p className="text-xs text-slate-500">还有 {report.unhandledItems.length - 3} 项未显示</p>
                    )}
                  </div>
                </div>
              )}
              
              {report.correctedItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-2">已修正项：</h4>
                  <div className="space-y-2">
                    {report.correctedItems.slice(0, 3).map(item => (
                      <div key={item.id} className="text-sm text-slate-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>{item.areaName} - {item.type}</span>
                      </div>
                    ))}
                    {report.correctedItems.length > 3 && (
                      <p className="text-xs text-slate-500">还有 {report.correctedItems.length - 3} 项未显示</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            重新开始
          </button>
          <button
            onClick={handleReplay}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Play className="w-5 h-5" />
            查看回放
          </button>
          <button
            onClick={handleViewReport}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileText className="w-5 h-5" />
            完整报告
          </button>
        </motion.div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}

const StatCard = ({ icon, label, value, delay }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay }}
    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center"
  >
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-slate-400">{label}</p>
  </motion.div>
);
