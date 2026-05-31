import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, XCircle } from 'lucide-react';
import type { Case } from '@/types';
import { RISK_TYPE_LABELS, RISK_TYPE_COLORS } from '@/types';

interface RiskAnalysisProps {
  cases: Case[];
}

export const RiskAnalysis = ({ cases }: RiskAnalysisProps) => {
  const allRisks = cases.flatMap((c) => c.risks);
  const riskTypes = ['auth_expired', 'sample_exceed', 'name_confusion', 'missing_evidence'];

  const riskStats = riskTypes
    .map((type) => {
      const total = allRisks.filter((r) => r.type === type).length;
      const discovered = allRisks.filter((r) => r.type === type && r.isDiscovered).length;
      return {
        type,
        label: RISK_TYPE_LABELS[type as keyof typeof RISK_TYPE_LABELS],
        total,
        discovered,
        rate: total > 0 ? Math.round((discovered / total) * 100) : 0,
        color: RISK_TYPE_COLORS[type as keyof typeof RISK_TYPE_COLORS],
      };
    })
    .filter((r) => r.total > 0);

  const totalRisks = allRisks.length;
  const totalDiscovered = allRisks.filter((r) => r.isDiscovered).length;
  const overallRate = totalRisks > 0 ? Math.round((totalDiscovered / totalRisks) * 100) : 0;

  const getRateColor = (rate: number) => {
    if (rate >= 100) return 'text-success-400';
    if (rate >= 66) return 'text-accent-400';
    if (rate >= 33) return 'text-orange-400';
    return 'text-danger-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-panel p-6"
    >
      <h3 className="text-xl font-serif font-bold text-white mb-6 flex items-center gap-3">
        <AlertTriangle className="text-danger-400" size={24} />
        风险识别分析
      </h3>

      <div className="bg-white/5 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60">总体识别率</span>
          <span className={`text-2xl font-bold ${getRateColor(overallRate)}`}>
            {overallRate}%
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallRate}%` }}
            transition={{ duration: 1, delay: 0.7 }}
            className="h-full bg-gradient-to-r from-accent-500 to-success-500 rounded-full"
          />
        </div>
        <p className="text-white/60 text-sm mt-2">
          已发现 {totalDiscovered} / {totalRisks} 个风险点
        </p>
      </div>

      <div className="space-y-4">
        {riskStats.map((stat, index) => (
          <motion.div
            key={stat.type}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
            className="bg-white/5 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="text-white font-medium">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {stat.rate >= 100 ? (
                  <TrendingUp className="text-success-400" size={16} />
                ) : (
                  <XCircle className="text-danger-400" size={16} />
                )}
                <span className={`font-bold ${getRateColor(stat.rate)}`}>
                  {stat.rate}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.rate}%` }}
                transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color }}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">
              {stat.discovered} / {stat.total} 个已识别
            </p>
          </motion.div>
        ))}
      </div>

      {overallRate < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1 }}
          className="mt-6 p-4 bg-danger-500/10 border border-danger-500/30 rounded-lg"
        >
          <p className="text-danger-300 text-sm">
            💡 <strong>改进建议：</strong>
            {riskStats.find((r) => r.rate < 100)?.type === 'auth_expired' && (
              <span className="block mt-1">
                特别注意「授权过期」风险——看到授权证书时，先检查有效期！就像看食品保质期一样，过期了就不能用。
              </span>
            )}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
