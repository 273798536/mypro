import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useGameStore } from '../store/gameStore';
import { generateSettlementReport, exportReportToJson } from '../utils/gameUtils';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const state = useGameStore();
  const [exported, setExported] = useState(false);

  const report = useMemo(() => generateSettlementReport(state), [state]);

  const radarData = [
    { subject: '命中率', A: report.hitRate * 100, fullMark: 100 },
    { subject: '击穿防御', A: report.breakdownAnalysis.total > 0 
      ? (report.breakdownAnalysis.prevented / report.breakdownAnalysis.total * 100) 
      : 100, fullMark: 100 },
    { subject: '数据一致性', A: Math.max(0, 100 - report.stats.dirtyReads * 10), fullMark: 100 },
    { subject: '时效性', A: Math.max(0, 100 - report.stats.expiredReads * 8), fullMark: 100 },
    { subject: '响应速度', A: Math.max(0, 100 - report.stats.timeouts * 5), fullMark: 100 },
  ];

  const barData = [
    { name: '脏数据读取', value: report.stats.dirtyReads, color: '#EF4444' },
    { name: '过期读取', value: report.stats.expiredReads, color: '#F59E0B' },
    { name: '请求超时', value: report.stats.timeouts, color: '#8B5CF6' },
    { name: '缓存击穿', value: report.stats.breakdowns, color: '#EF4444' },
  ];

  const handleExport = () => {
    const json = exportReportToJson(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-battle-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleReplay = () => {
    navigate('/replay');
  };

  const handleRestart = () => {
    state.resetGame();
    navigate('/');
  };

  const getGrade = (score: number): { grade: string; color: string; message: string } => {
    if (score >= 500) return { grade: 'S', color: 'text-yellow-400', message: '缓存大师！完美的策略！' };
    if (score >= 300) return { grade: 'A', color: 'text-tech-green', message: '优秀！你的缓存策略很有效' };
    if (score >= 100) return { grade: 'B', color: 'text-tech-cyan', message: '不错！还有优化空间' };
    if (score >= 0) return { grade: 'C', color: 'text-tech-orange', message: '及格，需要更多练习' };
    return { grade: 'D', color: 'text-tech-red', message: '加油！学习缓存策略再来挑战' };
  };

  const gradeInfo = getGrade(report.totalScore);

  return (
    <div className="min-h-screen bg-tech-dark p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">🎮 游戏结算</h1>
          <p className="text-gray-400">让我们来分析一下你的缓存策略</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-tech-blue/50 to-tech-purple/30 rounded-2xl p-8 border border-tech-cyan/20 mb-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-12">
            <div className="text-center">
              <div className={`text-8xl font-bold ${gradeInfo.color} mb-2`}>
                {gradeInfo.grade}
              </div>
              <div className="text-gray-400">{gradeInfo.message}</div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-24">总分:</span>
                <span className={`text-3xl font-bold font-mono ${
                  report.totalScore >= 0 ? 'text-tech-green' : 'text-tech-red'
                }`}>
                  {report.totalScore}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-24">命中率:</span>
                <span className="text-2xl font-bold font-mono text-tech-cyan">
                  {(report.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-24">处理请求:</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {report.totalRequests}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400 w-24">击穿拦截:</span>
                <span className="text-2xl font-bold font-mono">
                  <span className="text-tech-green">{report.breakdownAnalysis.prevented}</span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-tech-red">{report.breakdownAnalysis.total}</span>
                </span>
              </div>
            </div>

            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280' }} />
                  <Radar
                    name="能力值"
                    dataKey="A"
                    stroke="#06B6D4"
                    fill="#06B6D4"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-tech-blue/30 rounded-xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>⚠️</span> 错误统计
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF' }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-tech-blue/30 rounded-xl p-6 border border-gray-700"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🔍</span> 缓存击穿分析
            </h3>
            
            <div className={`p-4 rounded-lg mb-4 ${
              report.breakdownAnalysis.occurred === 0
                ? 'bg-tech-green/20 border border-tech-green/50'
                : 'bg-tech-red/20 border border-tech-red/50'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {report.breakdownAnalysis.occurred === 0 ? '✅' : '⚠️'}
                </span>
                <div>
                  <div className={`font-bold ${
                    report.breakdownAnalysis.occurred === 0 ? 'text-tech-green' : 'text-tech-red'
                  }`}>
                    {report.breakdownAnalysis.occurred === 0
                      ? '所有缓存击穿都被成功拦截！'
                      : `有 ${report.breakdownAnalysis.occurred} 次缓存击穿未被拦截`
                    }
                  </div>
                  <div className="text-sm text-gray-400">
                    {report.breakdownAnalysis.occurred === 0
                      ? '你的热点key防护策略非常有效'
                      : '建议关注热点key的提前预热和永不过期策略'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">击穿尝试总数</span>
                <span className="text-white font-mono">{report.breakdownAnalysis.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">成功拦截</span>
                <span className="text-tech-green font-mono">{report.breakdownAnalysis.prevented}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">拦截成功率</span>
                <span className={`font-mono ${
                  report.breakdownAnalysis.total > 0 && report.breakdownAnalysis.occurred === 0
                    ? 'text-tech-green'
                    : 'text-tech-orange'
                }`}>
                  {report.breakdownAnalysis.total > 0
                    ? `${(report.breakdownAnalysis.prevented / report.breakdownAnalysis.total * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {report.penalties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-tech-blue/30 rounded-xl p-6 border border-gray-700 mb-8"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📝</span> 扣分明细
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {report.penalties.slice(0, 20).map((item, index) => (
                <motion.div
                  key={item.event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-tech-red"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(item.event.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                      </span>
                      <span className="font-mono text-tech-red font-bold">
                        {item.event.scoreChange}
                      </span>
                    </div>
                    <span className="text-white font-medium">{item.event.message}</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    <span className="text-tech-orange">原因：</span>{item.reason}
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="text-tech-cyan">建议：</span>{item.suggestion}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <button
            onClick={handleExport}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
              exported
                ? 'bg-tech-green text-white'
                : 'bg-tech-cyan text-tech-dark hover:bg-tech-cyan/80'
            }`}
          >
            {exported ? '✅ 已导出' : '📄 导出战报'}
          </button>
          <button
            onClick={handleReplay}
            className="px-8 py-3 bg-tech-purple text-white rounded-xl font-bold hover:bg-tech-purple/80 transition-all flex items-center gap-2"
          >
            🎬 复盘模式
          </button>
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            🔄 再来一局
          </button>
        </motion.div>
      </div>
    </div>
  );
};
