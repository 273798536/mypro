import type { RiskScore } from '../../types'
import { getScoreLevel, getScoreColor } from '../../engines/scoreEngine'

interface ScoreExplanationProps {
  riskScore: RiskScore
}

export default function ScoreExplanation({ riskScore }: ScoreExplanationProps) {
  const level = getScoreLevel(riskScore.totalScore)
  const color = getScoreColor(riskScore.totalScore)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="text-3xl font-bold"
          style={{ color }}
        >
          {riskScore.totalScore}
        </div>
        <div
          className="px-2 py-0.5 rounded text-xs font-semibold"
          style={{ backgroundColor: color + '22', color }}
        >
          {level}
        </div>
      </div>

      <div className="space-y-2">
        {riskScore.factors.map((factor) => {
          const barColor = getScoreColor(factor.contribution)
          const barWidth = Math.min(factor.contribution, 100)
          return (
            <div key={factor.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{factor.name}</span>
                <span className="text-gray-500">
                  权重{(factor.weight * 100).toFixed(0)}% · 原始值{factor.rawValue.toFixed(2)} · 贡献{factor.contribution.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 bg-[#2a2a4a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              {factor.anomalySource && (
                <div className="text-[10px] text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {factor.anomalySource}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
