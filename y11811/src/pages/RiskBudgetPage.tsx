import { Play, AlertCircle, TrendingUp, Shield, Target } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { usePortfolioStore } from '@/store/portfolioStore'
import StatusCard from '@/components/StatusCard'

function RiskBudgetPage() {
  const {
    holdings,
    industries,
    riskBudget,
    constraintChecks,
    currentRiskScore,
    updateRiskBudget,
    runChecks,
  } = usePortfolioStore()

  const latestCheck = constraintChecks[constraintChecks.length - 1]

  const radarData = currentRiskScore
    ? [
        { dimension: '集中度', score: currentRiskScore.concentration, fullMark: 100 },
        { dimension: '波动率', score: currentRiskScore.volatility, fullMark: 100 },
        { dimension: '回撤控制', score: currentRiskScore.drawdown, fullMark: 100 },
        { dimension: '流动性', score: currentRiskScore.liquidity, fullMark: 100 },
        { dimension: '合规性', score: currentRiskScore.compliance, fullMark: 100 },
      ]
    : []

  const handleRunChecks = () => {
    runChecks()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">风险预算</h2>
          <p className="text-neutral-muted mt-1">设置风险参数，运行约束检查</p>
        </div>
        <button
          onClick={handleRunChecks}
          disabled={holdings.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-accent-emerald text-white rounded-lg hover:bg-accent-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
        >
          <Play className="w-5 h-5" />
          运行约束检查
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-accent-amber" />
          风险预算参数
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-neutral-muted mb-2">波动率上限 (%)</label>
            <input
              type="number"
              value={riskBudget.volatilityLimit}
              onChange={(e) =>
                updateRiskBudget({ volatilityLimit: parseFloat(e.target.value) || 0 }, '调整波动率上限')
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              step="0.5"
            />
            <p className="text-xs text-neutral-muted mt-1">组合年化波动率阈值</p>
          </div>
          <div>
            <label className="block text-sm text-neutral-muted mb-2">最大回撤限制 (%)</label>
            <input
              type="number"
              value={riskBudget.drawdownLimit}
              onChange={(e) =>
                updateRiskBudget({ drawdownLimit: parseFloat(e.target.value) || 0 }, '调整回撤限制')
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              step="0.5"
            />
            <p className="text-xs text-neutral-muted mt-1">历史模拟最大回撤阈值</p>
          </div>
          <div>
            <label className="block text-sm text-neutral-muted mb-2">行业集中度阈值 (%)</label>
            <input
              type="number"
              value={riskBudget.industryConcentration}
              onChange={(e) =>
                updateRiskBudget({ industryConcentration: parseFloat(e.target.value) || 0 }, '调整行业集中度')
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              step="1"
            />
            <p className="text-xs text-neutral-muted mt-1">单一行业最大权重占比</p>
          </div>
        </div>
      </div>

      {latestCheck && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">约束检查结果</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatusCard
              title="权重检查"
              status={latestCheck.weightCheck.passed ? 'pass' : 'fail'}
              detail={latestCheck.weightCheck.detail}
            />

            <StatusCard
              title="行业超限检查"
              status={latestCheck.industryCheck.passed ? 'pass' : 'fail'}
              detail={latestCheck.industryCheck.detail}
            >
              {latestCheck.industryCheck.violations.length > 0 && (
                <div className="space-y-2 mt-2">
                  {latestCheck.industryCheck.violations.map((v) => (
                    <div
                      key={v.industryId}
                      className="flex items-center gap-2 text-sm text-accent-danger"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {v.industryName}: {v.currentWeight.toFixed(1)}% > {v.maxWeight}% (超{v.overage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </StatusCard>

            <StatusCard
              title="禁买标的检查"
              status={latestCheck.prohibitedCheck.passed ? 'pass' : 'fail'}
              detail={latestCheck.prohibitedCheck.detail}
            >
              {latestCheck.prohibitedCheck.prohibitedFunds.length > 0 && (
                <div className="space-y-1 mt-2">
                  {latestCheck.prohibitedCheck.prohibitedFunds.map((f, i) => (
                    <div key={i} className="text-sm text-accent-danger flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </StatusCard>
          </div>
        </div>
      )}

      {currentRiskScore && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              风险雷达图
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Radar
                    name="风险评分"
                    dataKey="score"
                    stroke="#1B2A4A"
                    fill="#1B2A4A"
                    fillOpacity={0.3}
                  />
                  <Tooltip formatter={(value: number) => [`${value} 分`, '得分']} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-emerald" />
              风险分数详解
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-primary">综合评分</span>
                  <span className="text-3xl font-bold text-primary">{currentRiskScore.overall}</span>
                </div>
                <p className="text-sm text-neutral-muted">{currentRiskScore.explanations.overall}</p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'concentration', label: '集中度', score: currentRiskScore.concentration },
                  { key: 'volatility', label: '波动率', score: currentRiskScore.volatility },
                  { key: 'drawdown', label: '回撤控制', score: currentRiskScore.drawdown },
                  { key: 'liquidity', label: '流动性', score: currentRiskScore.liquidity },
                  { key: 'compliance', label: '合规性', score: currentRiskScore.compliance },
                ].map((item) => (
                  <div key={item.key} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm font-bold text-primary">{item.score} 分</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-danger via-accent-amber to-accent-emerald transition-all"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-muted mt-1">
                      {currentRiskScore.explanations[item.key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!latestCheck && !currentRiskScore && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">还未运行约束检查</h3>
          <p className="text-neutral-muted">
            点击上方"运行约束检查"按钮，查看组合的风险预算合规情况
          </p>
        </div>
      )}
    </div>
  )
}

export default RiskBudgetPage
