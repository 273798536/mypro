import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus, PencilLine, RotateCw } from 'lucide-react'
import type { Sample } from '@/data/types'
import { getEvent } from '@/utils/drift'
import { Badge, changeTone, processingTone } from './Badge'

function ScoreCell({ score, band }: { score?: number; band?: string }) {
  if (score == null) {
    return <span className="num text-[12px] text-ink-400">待回灌</span>
  }
  return (
    <div className="leading-tight">
      <span className="num text-[14px] font-semibold text-ink-900">{score}</span>
      <span className="num text-[10px] text-ink-400">/{band?.slice(0, 1)}</span>
    </div>
  )
}

function Delta({ sample }: { sample: Sample }) {
  const oldE = getEvent(sample, 'old')
  const newE = getEvent(sample, 'new')
  if (!oldE || !newE) {
    return <span className="num text-[11px] text-ink-400">—</span>
  }
  const delta = newE.score - oldE.score
  if (delta === 0) {
    return (
      <span className="num inline-flex items-center gap-0.5 text-[12px] text-consistent-deep">
        <Minus className="h-3 w-3" /> 0
      </span>
    )
  }
  const up = delta > 0
  const tone = sample.changeStatus === '漂移待确认' ? 'text-drift-deep' : 'text-change-deep'
  return (
    <span className={`num inline-flex items-center gap-0.5 text-[12px] font-semibold ${tone}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? '+' : ''}
      {delta}
    </span>
  )
}

const ROW_BAR: Record<Sample['changeStatus'], string> = {
  改判: 'bg-change',
  一致: 'bg-consistent',
  漂移待确认: 'bg-drift',
}

export function SampleTable({ samples }: { samples: Sample[] }) {
  const navigate = useNavigate()

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink-900/10 bg-ink-900/[0.02] text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-3 py-2.5 font-medium">样本编号</th>
              <th className="px-3 py-2.5 font-medium">来源</th>
              <th className="px-3 py-2.5 font-medium">作文题目</th>
              <th className="px-3 py-2.5 font-medium">年级</th>
              <th className="px-3 py-2.5 text-center font-medium">旧模型</th>
              <th className="px-3 py-2.5 text-center font-medium">新模型</th>
              <th className="px-3 py-2.5 text-center font-medium">Δ</th>
              <th className="px-3 py-2.5 font-medium">人工修正</th>
              <th className="px-3 py-2.5 font-medium">改判</th>
              <th className="px-3 py-2.5 font-medium">处理</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => {
              const oldE = getEvent(s, 'old')
              const newE = getEvent(s, 'new')
              const manualE = getEvent(s, 'manual')
              const hasRejudge = s.processingStatus === '已回灌'
              return (
                <tr
                  key={s.sampleId}
                  onClick={() => navigate(`/sample/${s.sampleId}`)}
                  className="group relative cursor-pointer border-b border-ink-900/[0.06] row-hover last:border-0"
                >
                  <td className="relative px-3 py-2.5">
                    <span className={`absolute left-0 top-0 h-full w-[3px] ${ROW_BAR[s.changeStatus]}`} />
                    <span className="num text-[12px] font-medium text-ink-900">{s.sampleId}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[12px] text-ink-600">{s.source}</span>
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5">
                    <span className="block truncate font-serif text-[14px] text-ink-900" title={s.essayTitle}>
                      {s.essayTitle}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="num text-[12px] text-ink-600">{s.gradeLevel}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell score={oldE?.score} band={oldE?.band} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ScoreCell score={newE?.score} band={newE?.band} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Delta sample={s} />
                  </td>
                  <td className="px-3 py-2.5">
                    {manualE ? (
                      <Badge tone="manual">
                        <PencilLine className="h-3 w-3" />
                        {manualE.score}
                      </Badge>
                    ) : hasRejudge ? (
                      <Badge tone="manual">
                        <RotateCw className="h-3 w-3" />
                        回灌
                      </Badge>
                    ) : (
                      <span className="num text-[11px] text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={changeTone(s.changeStatus)}>{s.changeStatus}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={processingTone(s.processingStatus)}>{s.processingStatus}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {samples.length === 0 && (
        <div className="py-12 text-center text-[13px] text-ink-400">当前口径下无样本，请调整筛选条件。</div>
      )}
    </div>
  )
}
