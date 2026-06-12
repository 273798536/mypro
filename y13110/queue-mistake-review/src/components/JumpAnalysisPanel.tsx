import type { JumpFactor } from '../types'

interface JumpAnalysisPanelProps {
  hasJump: boolean
  jumpFactors: JumpFactor[]
  summary: string
}

const factorTypeLabel: Record<string, string> = {
  threshold: '阈值/公式',
  unit: '单位变更',
  attachment: '附件影响'
}

const factorTypeColor: Record<string, string> = {
  threshold: 'bg-orange-100 text-orange-700 border-orange-200',
  unit: 'bg-blue-100 text-blue-700 border-blue-200',
  attachment: 'bg-purple-100 text-purple-700 border-purple-200'
}

const factorTypeIcon: Record<string, string> = {
  threshold: '📊',
  unit: '📐',
  attachment: '📎'
}

export default function JumpAnalysisPanel({
  hasJump,
  jumpFactors,
  summary
}: JumpAnalysisPanelProps) {
  if (!hasJump || jumpFactors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">↕️</span>
          <h4 className="font-semibold text-gray-800">结果跳变分析</h4>
        </div>
        <p className="text-sm text-gray-500">未检测到明显跳变因素，结果稳定。</p>
      </div>
    )
  }

  const primaryFactor = jumpFactors[0]
  const otherFactors = jumpFactors.slice(1)

  return (
    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚠️</span>
        <h4 className="font-semibold text-danger-800">结果跳变分析</h4>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
          检测到跳变
        </span>
      </div>

      <div className="bg-white/70 rounded-lg p-3 mb-3 border-l-4 border-danger-400">
        <p className="text-sm text-gray-700">{summary}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-white rounded-md border border-danger-200">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
            factorTypeColor[primaryFactor.type]
          }`}>
            {factorTypeIcon[primaryFactor.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800">{primaryFactor.factorName}</span>
              <span className="px-1.5 py-0.5 text-xs rounded bg-danger-100 text-danger-700 font-medium">
                主要因素 {primaryFactor.impactDegree}%
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              从「{primaryFactor.beforeValue}」变为「{primaryFactor.afterValue}」
            </div>
            <p className="text-sm text-gray-600">{primaryFactor.description}</p>
            
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-danger-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${primaryFactor.impactDegree}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {otherFactors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">其他影响因素</p>
            {otherFactors.map((factor, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-white/60 rounded-md text-sm">
                <span className="text-base">{factorTypeIcon[factor.type]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">{factor.factorName}</span>
                    <span className="text-xs text-gray-400">
                      影响度 {factor.impactDegree}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-warning-400 h-1 rounded-full"
                    style={{ width: `${factor.impactDegree}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-danger-200/50">
        <p className="text-xs text-danger-600">
          💡 建议：导出分析报告时请一并说明跳变原因，避免评审时产生疑问。
        </p>
      </div>
    </div>
  )
}
