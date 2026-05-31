import { Trophy, TrendingUp, TrendingDown, AlertTriangle, Zap, Flame, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useGameStore } from '../../store/gameStore';
import { SCORE_RULES } from '../../utils/scoring';

export function ScoreBoard() {
  const navigate = useNavigate();
  const { score, scoreBreakdown, stats, cacheStrategy, queueScheduler } = useGameStore();

  const scoreData = [
    { name: '基础分', value: scoreBreakdown.base, color: '#81C784' },
    { name: '缓存命中', value: scoreBreakdown.cacheHitBonus, color: '#4CAF50' },
    { name: '脏数据', value: scoreBreakdown.dirtyDataPenalty, color: '#D32F2F' },
    { name: '回源限流', value: scoreBreakdown.sourceLimitPenalty, color: '#FF9800' },
    { name: '顾客投诉', value: scoreBreakdown.complaintPenalty, color: '#F44336' },
    { name: '缓存击穿', value: scoreBreakdown.breakdownPenalty, color: '#9C27B0' },
  ];

  const pieData = [
    { name: '缓存命中', value: stats.cacheHits, color: '#81C784' },
    { name: '缓存未命中', value: stats.cacheMisses, color: '#1565C0' },
    { name: '缓存过期', value: stats.cacheExpired, color: '#FFD54F' },
  ];

  const performanceData = [
    { name: '完成订单', value: stats.completedOrders, total: stats.totalOrders },
    { name: '缓存命中', value: stats.cacheHits, total: stats.cacheHits + stats.cacheMisses },
    { name: '顾客满意', value: stats.completedOrders - stats.customerComplaints, total: stats.completedOrders },
  ];

  const getGrade = () => {
    if (score >= 800) return { grade: 'S', color: '#FFD700', desc: '缓存大师' };
    if (score >= 500) return { grade: 'A', color: '#81C784', desc: '优秀厨师' };
    if (score >= 200) return { grade: 'B', color: '#64B5F6', desc: '熟练厨师' };
    if (score >= 0) return { grade: 'C', color: '#FFD54F', desc: '实习厨师' };
    return { grade: 'D', color: '#D32F2F', desc: '需要培训' };
  };

  const gradeInfo = getGrade();
  const hitRate = stats.cacheHits + stats.cacheMisses > 0
    ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)
    : '0.0';
  const completionRate = stats.totalOrders > 0
    ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-[#2D2A26] p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}>
            🎉 游戏结算
          </h1>
          <p className="text-gray-400">
            策略: {cacheStrategy} | 调度: {queueScheduler}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="default" className="p-6 text-center">
              <div className="text-6xl font-bold mb-2" style={{ color: gradeInfo.color, fontFamily: "'Bebas Neue', sans-serif" }}>
                {gradeInfo.grade}
              </div>
              <div className="text-lg text-gray-300 mb-4">{gradeInfo.desc}</div>
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-8 h-8 text-[#FFD54F]" />
                <span className="text-5xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {score}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">最终得分</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="default" className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#81C784]" />
                核心指标
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Users className="w-4 h-4" /> 订单完成率
                  </span>
                  <span className="text-xl font-bold text-[#81C784]">{completionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> 缓存命中率
                  </span>
                  <span className="text-xl font-bold text-[#64B5F6]">{hitRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Flame className="w-4 h-4" /> 峰值并发回源
                  </span>
                  <span className="text-xl font-bold text-[#FF7A18]">{stats.maxConcurrentSource}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 总处理订单
                  </span>
                  <span className="text-xl font-bold text-white">{stats.completedOrders}/{stats.totalOrders}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="default" className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FFD54F]" />
                问题统计
              </h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${stats.cacheBreakdowns > 0 ? 'bg-[#9C27B0]/20 border border-[#9C27B0]/50' : 'bg-[#1D1A17]'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">💥 缓存击穿</span>
                    <span className={`font-bold ${stats.cacheBreakdowns > 0 ? 'text-[#9C27B0]' : 'text-gray-500'}`}>
                      {stats.cacheBreakdowns} 次
                    </span>
                  </div>
                  {stats.cacheBreakdowns > 0 && (
                    <p className="text-xs text-[#9C27B0] mt-1">扣 {stats.cacheBreakdowns * 30} 分</p>
                  )}
                </div>

                <div className={`p-3 rounded-lg ${stats.dirtySpreads > 0 ? 'bg-[#D32F2F]/20 border border-[#D32F2F]/50' : 'bg-[#1D1A17]'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">⚠️ 脏数据扩散</span>
                    <span className={`font-bold ${stats.dirtySpreads > 0 ? 'text-[#D32F2F]' : 'text-gray-500'}`}>
                      {stats.dirtySpreads} 次
                    </span>
                  </div>
                  {stats.dirtySpreads > 0 && (
                    <p className="text-xs text-[#D32F2F] mt-1">扣 {stats.dirtySpreads * 20} 分</p>
                  )}
                </div>

                <div className={`p-3 rounded-lg ${stats.expiredMisreads > 0 ? 'bg-[#FF9800]/20 border border-[#FF9800]/50' : 'bg-[#1D1A17]'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">📖 过期误读</span>
                    <span className={`font-bold ${stats.expiredMisreads > 0 ? 'text-[#FF9800]' : 'text-gray-500'}`}>
                      {stats.expiredMisreads} 次
                    </span>
                  </div>
                  {stats.expiredMisreads > 0 && (
                    <p className="text-xs text-[#FF9800] mt-1">扣 {stats.expiredMisreads * 15} 分</p>
                  )}
                </div>

                <div className={`p-3 rounded-lg ${stats.customerComplaints > 0 ? 'bg-[#F44336]/20 border border-[#F44336]/50' : 'bg-[#1D1A17]'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">😡 顾客投诉</span>
                    <span className={`font-bold ${stats.customerComplaints > 0 ? 'text-[#F44336]' : 'text-gray-500'}`}>
                      {stats.customerComplaints} 次
                    </span>
                  </div>
                  {stats.customerComplaints > 0 && (
                    <p className="text-xs text-[#F44336] mt-1">扣 {stats.customerComplaints * 10} 分</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="default" className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#81C784]" />
                分数构成
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#3D3833" />
                    <XAxis type="number" stroke="#666" />
                    <YAxis dataKey="name" type="category" stroke="#999" width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1D1A17', border: '1px solid #3D3833', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="default" className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FFD54F]" />
                缓存访问分布
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1D1A17', border: '1px solid #3D3833', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#999' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card variant="default" className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📋 计分规则说明
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SCORE_RULES.map((rule, index) => (
                <div key={index} className="p-3 bg-[#1D1A17] rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">{rule.event}</span>
                    <span className={`text-sm font-bold ${
                      rule.score.startsWith('+') ? 'text-[#81C784]' : 'text-[#D32F2F]'
                    }`}>
                      {rule.score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{rule.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-4"
        >
          <Button variant="secondary" size="lg" onClick={() => navigate('/review')}>
            📜 查看复盘
          </Button>
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            🔄 再来一局
          </Button>
          <Button variant="ghost" size="lg" onClick={() => navigate('/guide')}>
            📖 查看说明
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
