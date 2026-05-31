import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ScoreBreakdown } from '@/types';

interface ScoreChartProps {
  breakdown: ScoreBreakdown;
  finalScore: number;
}

export const ScoreChart = ({ breakdown, finalScore }: ScoreChartProps) => {
  const chartData = [
    { name: '正确关联', value: breakdown.correctAssociation, color: '#10B981' },
    { name: '错误关联', value: breakdown.wrongAssociation, color: '#EF4444' },
    { name: '正确判定', value: breakdown.correctVerdict, color: '#10B981' },
    { name: '错误判定', value: breakdown.wrongVerdict, color: '#EF4444' },
    { name: '时间消耗', value: breakdown.timePenalty, color: '#F59E0B' },
    { name: '提前奖励', value: breakdown.timeBonus, color: '#3B82F6' },
    { name: '风险发现', value: breakdown.riskDiscovered, color: '#8B5CF6' },
    { name: '未完成扣分', value: breakdown.incompletePenalty, color: '#EF4444' },
  ].filter((item) => item.value !== 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-primary-800 border border-white/20 rounded-lg px-3 py-2 text-sm">
          <p className="text-white font-medium">{data.name}</p>
          <p style={{ color: data.color }} className="font-bold">
            {data.value > 0 ? '+' : ''}{Math.round(data.value)} 分
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-panel p-6"
    >
      <h3 className="text-xl font-serif font-bold text-white mb-6">得分构成分析</h3>
      
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-white/60 text-sm mb-1">最终得分</p>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.5, stiffness: 200 }}
            className="text-5xl font-bold text-accent-400 font-serif"
          >
            {Math.round(finalScore)}
          </motion.span>
          <span className="text-white/60 text-lg ml-2">分</span>
        </div>
        
        <div className="text-right">
          <p className="text-white/60 text-sm mb-1">时间消耗</p>
          <p className="text-white font-medium">
            {Math.abs(Math.round(breakdown.timePenalty))} 分
          </p>
          {breakdown.timeBonus > 0 && (
            <p className="text-success-400 text-sm">
              提前完成奖励 +{Math.round(breakdown.timeBonus)} 分
            </p>
          )}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-success-500/10 rounded-lg p-3 border border-success-500/30">
          <p className="text-success-400 text-xs mb-1">正确关联加分</p>
          <p className="text-white font-bold">+{breakdown.correctAssociation}</p>
        </div>
        <div className="bg-danger-500/10 rounded-lg p-3 border border-danger-500/30">
          <p className="text-danger-400 text-xs mb-1">错误关联扣分</p>
          <p className="text-white font-bold">{breakdown.wrongAssociation}</p>
        </div>
        <div className="bg-success-500/10 rounded-lg p-3 border border-success-500/30">
          <p className="text-success-400 text-xs mb-1">正确判定加分</p>
          <p className="text-white font-bold">+{breakdown.correctVerdict}</p>
        </div>
        <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
          <p className="text-purple-400 text-xs mb-1">风险发现奖励</p>
          <p className="text-white font-bold">+{breakdown.riskDiscovered}</p>
        </div>
      </div>
    </motion.div>
  );
};
