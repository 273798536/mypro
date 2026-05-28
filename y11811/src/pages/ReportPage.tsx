import { useState } from 'react'
import { FileText, Download, Calendar, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import StatusCard from '@/components/StatusCard'

function ReportPage() {
  const { portfolio, holdings, riskBudget, constraintChecks, currentRiskScore, generateReport, reports } =
    usePortfolioStore()

  const [selectedReport, setSelectedReport] = useState<string | null>(null)

  const handleGenerateReport = () => {
    const report = generateReport()
    setSelectedReport(report.id)
  }

  const displayReport = selectedReport
    ? reports.find((r) => r.id === selectedReport)
    : constraintChecks.length > 0
    ? {
        id: 'current',
        portfolioId: portfolio.id,
        version: '当前预览',
        generatedAt: new Date().toISOString(),
        constraintChecks: constraintChecks.slice(-1),
        riskScore: currentRiskScore,
        holdings,
        riskBudget,
      }
    : null

  const latestCheck = displayReport?.constraintChecks[displayReport.constraintChecks.length - 1]

  const allPassed = latestCheck
    ? latestCheck.weightCheck.passed && latestCheck.industryCheck.passed && latestCheck.prohibitedCheck.passed
    : false

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExport = () => {
    if (!displayReport) return

    const reportContent = `
================================================================================
                      公募组合风险预算报告
================================================================================

【报告编号】 ${displayReport.id}
【版本】 ${displayReport.version}
【生成时间】 ${formatDate(displayReport.generatedAt)}
【组合名称】 ${portfolio.name}
【组合描述】 ${portfolio.description}

================================================================================
                           一、风险预算参数
================================================================================

  波动率上限：        ${riskBudget.volatilityLimit}%
  最大回撤限制：      ${riskBudget.drawdownLimit}%
  行业集中度阈值：    ${riskBudget.industryConcentration}%

================================================================================
                           二、基金持仓明细
================================================================================

序号    基金代码    基金名称                    权重(%)    行业分类    状态
--------------------------------------------------------------------------------
${displayReport.holdings
  .map(
    (h, i) =>
      `  ${(i + 1).toString().padEnd(4)}  ${h.fundCode.padEnd(8)}  ${h.fundName.padEnd(24)}  ${h.weight
        .toString()
        .padEnd(8)}  ${h.industryName.padEnd(8)}  ${h.isProhibited ? '禁买' : '正常'}`
  )
  .join('\n')}

  合计：${displayReport.holdings.reduce((sum, h) => sum + h.weight, 0).toFixed(2)}%

================================================================================
                           三、约束检查结果
================================================================================

  权重检查：      ${latestCheck?.weightCheck.passed ? '✅ 通过' : '❌ 未通过'}
  ${latestCheck?.weightCheck.detail}

  行业检查：      ${latestCheck?.industryCheck.passed ? '✅ 通过' : '❌ 未通过'}
  ${latestCheck?.industryCheck.detail}

  禁买检查：      ${latestCheck?.prohibitedCheck.passed ? '✅ 通过' : '❌ 未通过'}
  ${latestCheck?.prohibitedCheck.detail}

================================================================================
                           四、风险评分
================================================================================

  综合评分：        ${displayReport.riskScore?.overall || 0} 分

  集中度：          ${displayReport.riskScore?.concentration || 0} 分
  ${displayReport.riskScore?.explanations.concentration || ''}

  波动率：          ${displayReport.riskScore?.volatility || 0} 分
  ${displayReport.riskScore?.explanations.volatility || ''}

  回撤控制：        ${displayReport.riskScore?.drawdown || 0} 分
  ${displayReport.riskScore?.explanations.drawdown || ''}

  流动性：          ${displayReport.riskScore?.liquidity || 0} 分
  ${displayReport.riskScore?.explanations.liquidity || ''}

  合规性：          ${displayReport.riskScore?.compliance || 0} 分
  ${displayReport.riskScore?.explanations.compliance || ''}

================================================================================
                           五、综合结论
================================================================================

  ${allPassed
    ? '✅ 组合通过所有约束检查，风险预算符合要求。'
    : '⚠️  组合存在违规项，请调整持仓后重新检查。'}

  ${displayReport.riskScore?.explanations.overall || ''}

================================================================================
                        报告生成：公募组合风险预算系统
================================================================================
`

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `风险预算报告_${displayReport.version}_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">报告导出</h2>
          <p className="text-neutral-muted mt-1">生成并导出风险预算报告，所有明细可追溯</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={holdings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            生成报告
          </button>
          <button
            onClick={handleExport}
            disabled={!displayReport}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-amber" />
            历史报告版本
          </h3>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  selectedReport === report.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-primary">{report.version}</span>
                  <span className="text-sm text-neutral-muted">{formatDate(report.generatedAt)}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {displayReport ? (
        <div className="bg-white rounded-xl shadow-card p-8">
          <div className="text-center border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-2xl font-bold text-primary">公募组合风险预算报告</h2>
            <p className="text-neutral-muted mt-2">
              {displayReport.version} · {formatDate(displayReport.generatedAt)}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">一、风险预算参数</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-neutral-muted">波动率上限</div>
                  <div className="text-xl font-bold text-primary mt-1">{riskBudget.volatilityLimit}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-neutral-muted">最大回撤限制</div>
                  <div className="text-xl font-bold text-primary mt-1">{riskBudget.drawdownLimit}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-neutral-muted">行业集中度阈值</div>
                  <div className="text-xl font-bold text-primary mt-1">{riskBudget.industryConcentration}%</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">二、约束检查结果</h3>
              <div className="grid grid-cols-3 gap-4">
                <StatusCard
                  title="权重检查"
                  status={latestCheck?.weightCheck.passed ? 'pass' : 'fail'}
                  detail={latestCheck?.weightCheck.detail || ''}
                />
                <StatusCard
                  title="行业检查"
                  status={latestCheck?.industryCheck.passed ? 'pass' : 'fail'}
                  detail={latestCheck?.industryCheck.detail || ''}
                />
                <StatusCard
                  title="禁买检查"
                  status={latestCheck?.prohibitedCheck.passed ? 'pass' : 'fail'}
                  detail={latestCheck?.prohibitedCheck.detail || ''}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">三、风险评分</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: '集中度', score: displayReport.riskScore?.concentration || 0 },
                  { label: '波动率', score: displayReport.riskScore?.volatility || 0 },
                  { label: '回撤控制', score: displayReport.riskScore?.drawdown || 0 },
                  { label: '流动性', score: displayReport.riskScore?.liquidity || 0 },
                  { label: '合规性', score: displayReport.riskScore?.compliance || 0 },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-sm text-neutral-muted">{item.label}</div>
                    <div className="text-2xl font-bold text-primary mt-2">{item.score}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">综合评分</span>
                  <span className="text-3xl font-bold text-primary">
                    {displayReport.riskScore?.overall || 0}
                  </span>
                  <span className="text-sm text-neutral-muted">分</span>
                </div>
                <p className="text-sm text-neutral-muted mt-2">
                  {displayReport.riskScore?.explanations.overall}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-primary mb-3">四、基金持仓明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-3">基金代码</th>
                      <th className="text-left py-2 px-3">基金名称</th>
                      <th className="text-right py-2 px-3">权重(%)</th>
                      <th className="text-left py-2 px-3">行业分类</th>
                      <th className="text-center py-2 px-3">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayReport.holdings.map((h) => (
                      <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono">{h.fundCode}</td>
                        <td className="py-2 px-3">{h.fundName}</td>
                        <td className="py-2 px-3 text-right font-mono">{h.weight.toFixed(1)}</td>
                        <td className="py-2 px-3">{h.industryName}</td>
                        <td className="py-2 px-3 text-center">
                          {h.isProhibited ? (
                            <span className="text-accent-danger">
                              <XCircle className="w-4 h-4 inline" />
                            </span>
                          ) : (
                            <span className="text-accent-emerald">
                              <CheckCircle className="w-4 h-4 inline" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 rounded-lg text-center">
              <div
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium ${
                  allPassed ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-amber/10 text-accent-amber'
                }`}
              >
                {allPassed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center">⚠️</span>
                )}
                {allPassed
                  ? '组合通过所有约束检查，风险预算符合要求'
                  : '组合存在违规项，请调整持仓后重新检查'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无报告数据</h3>
          <p className="text-neutral-muted">
            请先在"风险预算"页面运行约束检查，然后在此处生成报告
          </p>
        </div>
      )}
    </div>
  )
}

export default ReportPage
