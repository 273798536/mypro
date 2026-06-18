import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, RotateCw, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { REJUDGE_RESULTS } from '@/data/samples'
import { normalizeRawSample } from '@/utils/fieldMap'
import { getEvent } from '@/utils/drift'
import { PageHeader } from '@/components/PageHeader'
import { Badge, changeTone, processingTone } from '@/components/Badge'
import { DimensionBars } from '@/components/DimensionBars'
import { Storyline } from '@/components/Storyline'

export default function SampleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const samples = useStore((s) => s.samples)
  const rejudge = useStore((s) => s.rejudge)
  const sample = useMemo(() => samples.find((s) => s.sampleId === id), [samples, id])
  const normalized = useMemo(
    () => (sample ? normalizeRawSample(sample.rawFields) : null),
    [sample],
  )

  if (!sample) {
    return (
      <div className="animate-rise py-20 text-center">
        <p className="text-ink-500">未找到样本 {id}</p>
        <button onClick={() => navigate('/')} className="btn btn-ghost mt-3">
          返回工作台
        </button>
      </div>
    )
  }

  const newEvent = getEvent(sample, 'new')
  const rejudgeResult = id ? REJUDGE_RESULTS[id] : undefined
  const canExplain = sample.explainsChange === true
  const explanationText = rejudgeResult?.explanation ?? newEvent?.rationale ?? ''

  return (
    <div className="animate-rise">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-[12px] text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        返回对比工作台
      </Link>

      <PageHeader
        eyebrow={`${sample.sampleId} · ${sample.source} · ${sample.gradeLevel}`}
        title={sample.essayTitle}
        desc="版本主线：旧模型判定 → 人工修正（保留） → 新模型判定。人工修正作为独立层永不被新结果覆盖。"
        right={
          <div className="flex items-center gap-1.5">
            <Badge tone={changeTone(sample.changeStatus)}>{sample.changeStatus}</Badge>
            <Badge tone={processingTone(sample.processingStatus)}>{sample.processingStatus}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="panel relative p-6">
            <span className="absolute left-0 top-6 bottom-6 w-px bg-change/40" />
            <div className="num mb-3 text-[10px] uppercase tracking-[0.18em] text-ink-400">作文正文</div>
            <p className="font-serif text-[16px] leading-[1.95] text-ink-800 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-[44px] first-letter:leading-[0.8] first-letter:text-change">
              {sample.essayContent}
            </p>
          </div>

          <div className="panel p-5">
            <div className="num mb-4 text-[10px] uppercase tracking-[0.18em] text-ink-400">评分维度对比</div>
            <DimensionBars rows={sample.dimensions} />
          </div>

          <div className="panel p-5">
            <div className="num mb-4 text-[10px] uppercase tracking-[0.18em] text-ink-400">
              字段归一 · 来源与处理状态保留
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-sm bg-consistent-soft/50 p-2.5">
                <div className="num text-[10px] text-ink-400">来源（归一保留）</div>
                <div className="text-[12px] text-ink-900">{normalized?.canonical.source ?? '—'}</div>
              </div>
              <div className="rounded-sm bg-consistent-soft/50 p-2.5">
                <div className="num text-[10px] text-ink-400">处理状态（归一保留）</div>
                <div className="text-[12px] text-ink-900">
                  {normalized?.canonical.processingStatus ?? '—'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(sample.rawFields).map((k) => (
                <span
                  key={k}
                  className="num rounded-xs bg-ink-900/[0.04] px-1.5 py-0.5 text-[10px] text-ink-500"
                >
                  {k}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">
              运营主管字段命名前后不一，已归一为统一字段；来源与处理状态始终保留。
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="num mb-4 text-[10px] uppercase tracking-[0.18em] text-ink-400">版本主线</div>
            <Storyline events={sample.storyline} />
          </div>

          <div className="panel border-change/20 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-change" />
              <span className="text-[13px] font-semibold text-ink-900">改判原因解释</span>
            </div>
            {newEvent ? (
              <p className="text-[13px] leading-relaxed text-ink-700">{newEvent.rationale}</p>
            ) : (
              <p className="text-[13px] text-ink-400">
                尚无新模型结果。{sample.rejudgeable ? '可对这条旧模型误判样本执行回灌重判，看新结果能否解释改判。' : '新模型结果待回灌。'}
              </p>
            )}
          </div>

          {(sample.rejudgeable || canExplain) && (
            <div className="panel border-manual/30 bg-manual-soft/40 p-5">
              <div className="mb-2 flex items-center gap-2">
                <RotateCw className="h-3.5 w-3.5 text-manual-deep" />
                <span className="text-[13px] font-semibold text-ink-900">误判样本回灌验证</span>
              </div>

              {sample.rejudgeable ? (
                <div>
                  <p className="mb-3 text-[13px] leading-relaxed text-ink-700">
                    这是一条来自「{sample.source}」的旧模型误判样本。将其放回新模型重判，看新结果能否解释为什么改判。
                  </p>
                  <button onClick={() => sample.sampleId && rejudge(sample.sampleId)} className="btn btn-primary w-full">
                    <RotateCw className="h-3.5 w-3.5" />
                    回灌重判
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone="consistent">
                      <CheckCircle2 className="h-3 w-3" />
                      能解释改判
                    </Badge>
                    <span className="num text-[11px] text-ink-400">回灌已完成</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-700">{explanationText}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
