import { useNavigate } from 'react-router-dom'
import { levels } from '@/data/levels'
import { useGameStore } from '@/store/gameStore'
import type { LevelId } from '@/types'

const difficultyColors: Record<string, string> = {
  '入门': 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30',
  '进阶': 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30',
  '挑战': 'bg-[var(--color-error)]/20 text-[var(--color-error)] border-[var(--color-error)]/30',
}

export default function LevelSelect() {
  const navigate = useNavigate()
  const startLevel = useGameStore((s) => s.startLevel)

  const handleSelect = (id: LevelId) => {
    startLevel(id)
    navigate(`/game/${id}`)
  }

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            🎫 港股打新排队局
          </h1>
          <p className="text-[var(--color-text-dim)] text-sm md:text-base">
            投资者教育互动原型 — 申购卡、资金槽、中签号三栏对齐，真实参与结算
          </p>
        </div>

        <div className="mb-8 p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
          <h2 className="text-sm font-bold mb-2 text-[var(--color-text-dim)]">📖 规则说明</h2>
          <ul className="text-xs text-[var(--color-text-dim)] space-y-1">
            <li>• 每关有初始资金和若干可申购新股，选择申购后资金被锁定</li>
            <li>• 中签号公布后，中签扣款、未中签退款；冻资不足和退款延迟会醒目提示</li>
            <li>• 所有问题指向具体来源材料（申购卡字段、资金槽区域、结算银行等）</li>
            <li>• 复盘面板可查看完整资金流水、时间线和成绩统计，支持导出</li>
          </ul>
        </div>

        <div className="grid gap-5">
          {levels.map((level, idx) => (
            <button
              key={level.id}
              onClick={() => handleSelect(level.id)}
              className="group text-left p-5 md:p-6 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-light)] hover:border-[var(--color-success)]/50 transition-all duration-200 hover:translate-y-[-2px]"
            >
              <div className="flex items-start gap-4">
                <div className="font-mono text-4xl font-bold text-[var(--color-text-dim)] group-hover:text-[var(--color-success)] transition-colors">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-bold">{level.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${difficultyColors[level.difficulty]}`}>
                      {level.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-dim)] mb-3">{level.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {level.learningPoints.map((point) => (
                      <span
                        key={point}
                        className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-light)] text-[var(--color-text-dim)] border border-[var(--color-border)]"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <div className="font-mono text-xs text-[var(--color-text-dim)]">
                    初始资金 HK$ <span className="text-[var(--color-success)] font-semibold">{level.initialFunds.toLocaleString()}</span>
                    {' · '}
                    {level.stocks.length}只可申购 {' · '}
                    {level.problems.length > 0 ? (
                      <span className="text-[var(--color-error)]">{level.problems.length}个问题可能触发</span>
                    ) : (
                      <span className="text-[var(--color-success)]">无异常问题</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
