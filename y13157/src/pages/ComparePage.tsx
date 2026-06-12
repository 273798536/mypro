import { useMemo, useState } from 'react'
import { useReplayStore } from '@/store/useReplayStore'
import PageHeader from '@/components/PageHeader'
import {
  diffParamVersions,
  findResultChangingStep,
  dirLabel,
} from '@/utils/detect'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function ComparePage() {
  const { paramVersions, paramValues, steps } = useReplayStore()
  const [leftId, setLeftId] = useState(paramVersions[0].id)
  const [rightId, setRightId] = useState(paramVersions[1].id)

  const leftParams = useMemo(
    () => paramValues.filter((p) => p.versionId === leftId),
    [paramValues, leftId],
  )
  const rightParams = useMemo(
    () => paramValues.filter((p) => p.versionId === rightId),
    [paramValues, rightId],
  )

  const diffs = useMemo(
    () => diffParamVersions(leftParams, rightParams),
    [leftParams, rightParams],
  )
  const changingSteps = useMemo(() => findResultChangingStep(diffs), [diffs])

  const stepTitle = (stepId: string) =>
    steps.find((s) => s.id === stepId)?.title ?? stepId

  return (
    <div>
      <PageHeader
        title="参数版本对比"
        subtitle="切换左右版本查看差异，高亮行表示该参数发生变化"
      >
        <VersionPicker label="左版" value={leftId} onChange={setLeftId} versions={paramVersions.map(v=>({id:v.id,name:v.name}))} />
        <ArrowRight size={18} className="text-industrial-muted" />
        <VersionPicker label="右版" value={rightId} onChange={setRightId} versions={paramVersions.map(v=>({id:v.id,name:v.name}))} />
      </PageHeader>

      <div className="p-6 space-y-6">
        {changingSteps.length > 0 && (
          <div className="rounded-lg border border-industrial-orange/50 bg-industrial-orange/10 p-4 flex items-start gap-3">
            <Sparkles size={20} className="text-industrial-orange shrink-0 mt-0.5" />
            <div>
              <div className="text-industrial-orange font-semibold">
                导致最终结果变化的关键步骤
              </div>
              <div className="text-sm text-white mt-1">
                {changingSteps.map((s, i) => (
                  <span key={s}>
                    {i > 0 && <span className="text-industrial-muted mx-1">→</span>}
                    <span className="px-2 py-0.5 bg-industrial-orange/20 rounded">{s}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-industrial-border bg-industrial-card overflow-hidden">
          <div className="grid grid-cols-12 bg-industrial-panel text-xs text-industrial-muted font-semibold px-4 py-2">
            <div className="col-span-3">所属步骤</div>
            <div className="col-span-3">参数名称</div>
            <div className="col-span-3 text-right">{paramVersions.find(v=>v.id===leftId)?.name}</div>
            <div className="col-span-3 text-right">{paramVersions.find(v=>v.id===rightId)?.name}</div>
          </div>
          <div>
            {diffs.map((d) => {
              const isKeyChange = changingSteps.includes(d.paramName)
              return (
                <div
                  key={d.paramName}
                  className={[
                    'grid grid-cols-12 items-center px-4 py-3 text-sm border-t border-industrial-border/60',
                    d.changed ? 'animate-diff-highlight' : '',
                  ].join(' ')}
                >
                  <div className="col-span-3 text-industrial-muted text-xs">
                    {stepTitle(d.stepId)}
                  </div>
                  <div className="col-span-3 text-white font-mono">{d.paramName}</div>
                  <div
                    className={[
                      'col-span-3 text-right font-mono',
                      d.changed ? 'text-industrial-red' : 'text-industrial-text',
                      isKeyChange ? 'font-bold' : '',
                    ].join(' ')}
                  >
                    {d.oldVal}
                  </div>
                  <div
                    className={[
                      'col-span-3 text-right font-mono',
                      d.changed ? 'text-industrial-green' : 'text-industrial-text',
                      isKeyChange ? 'font-bold' : '',
                    ].join(' ')}
                  >
                    {d.newVal}
                    {isKeyChange && (
                      <span className="ml-2 text-xs text-industrial-orange">★</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-industrial-border bg-industrial-card p-4">
          <div className="text-sm text-industrial-muted mb-2">方向符号变化</div>
          <div className="flex flex-wrap gap-3">
            {rightParams
              .filter((p) => p.direction)
              .map((p) => {
                const left = leftParams.find((l) => l.paramName === p.paramName)
                const changed = left && left.direction !== p.direction
                return (
                  <div
                    key={p.id}
                    className={[
                      'px-3 py-2 rounded border text-sm font-mono',
                      changed
                        ? 'border-industrial-red/50 bg-industrial-red/10'
                        : 'border-industrial-border bg-industrial-panel',
                    ].join(' ')}
                  >
                    <div className="text-xs text-industrial-muted">{p.paramName}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={left?.direction === 'forward' ? 'text-industrial-red' : 'text-industrial-text'}>
                        {dirLabel(left?.direction)}
                      </span>
                      <ArrowRight size={14} className="text-industrial-muted" />
                      <span className={p.direction === 'reverse' ? 'text-industrial-green' : 'text-industrial-text'}>
                        {dirLabel(p.direction)}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

function VersionPicker({
  label,
  value,
  onChange,
  versions,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  versions: { id: string; name: string }[]
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-industrial-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-industrial-panel border border-industrial-border rounded px-3 py-1.5 text-white focus:outline-none focus:border-industrial-blue"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  )
}
