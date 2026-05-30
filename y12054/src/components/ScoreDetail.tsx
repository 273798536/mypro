import type { ScoreCategory } from '@/types'

interface ScoreDetailProps {
  deductions: Array<{ beat: number; category: ScoreCategory; description: string; points: number; affectedMusicianId?: string }>
  categorySummary: Record<string, number>
  totalScore: number
  maxScore: number
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  delay: { icon: '⏱', label: '延迟进入', color: '#ffbb00' },
  volume_overflow: { icon: '🔊', label: '声部盖过', color: '#ff4444' },
  volume_imbalance: { icon: '📊', label: '音量失衡', color: '#ff6b35' },
  queue_block: { icon: '⚡', label: '队列堵塞', color: '#bb00ff' },
  response_delay: { icon: '🕐', label: '响应延迟', color: '#00bbff' },
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#00ff88'
  if (score >= 70) return '#00bbff'
  if (score >= 50) return '#ffbb00'
  return '#ff4444'
}

function getGradeLabel(score: number): string {
  if (score >= 90) return '完美排练 🎵'
  if (score >= 70) return '良好排练'
  if (score >= 50) return '需要改进'
  return '排练失败'
}

export default function ScoreDetail({ deductions, categorySummary, totalScore, maxScore }: ScoreDetailProps) {
  const scoreColor = getScoreColor(totalScore)
  const gradeLabel = getGradeLabel(totalScore)

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="font-display text-4xl transition-colors duration-500" style={{ color: scoreColor }}>
          {totalScore}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          总分 {totalScore}/{maxScore}
        </div>
        <div
          className="font-display text-sm mt-2 px-3 py-1 rounded-full inline-block"
          style={{ backgroundColor: `${scoreColor}15`, color: scoreColor }}
        >
          {gradeLabel}
        </div>
      </div>

      <div className="flex gap-3">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <div
            key={key}
            className="flex-1 rounded-lg p-3 text-center"
            style={{ backgroundColor: '#1a1a2e', border: `1px solid ${config.color}30` }}
          >
            <div className="text-lg">{config.icon}</div>
            <div className="text-[10px] text-gray-400 mt-1">{config.label}</div>
            <div className="font-display text-sm mt-1" style={{ color: config.color }}>
              {(categorySummary[key] ?? 0) > 0 ? `扣 ${categorySummary[key]} 分` : '0 分'}
            </div>
          </div>
        ))}
      </div>

      <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
        {deductions.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">无扣分记录</div>
        )}
        {deductions.map((d, i) => {
          const config = CATEGORY_CONFIG[d.category]
          return (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-3 rounded-lg mb-1"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <span className="text-xs text-gray-500 w-10 shrink-0">Beat {d.beat}</span>
              <span className="text-sm shrink-0">{config?.icon}</span>
              <span className="text-xs text-gray-300 flex-1">{d.description}</span>
              <span className="font-display text-xs shrink-0" style={{ color: config?.color ?? '#ff4444' }}>
                -{d.points}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
