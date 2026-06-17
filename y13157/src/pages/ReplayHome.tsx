import { useMemo } from 'react'
import { useReplayStore } from '@/store/useReplayStore'
import PageHeader from '@/components/PageHeader'
import VersionSelector from '@/components/VersionSelector'
import StepCard from '@/components/StepCard'
import AnomalyBanner from '@/components/AnomalyBanner'
import { detectDirectionError, detectUnitError } from '@/utils/detect'
import type { Anomaly } from '@/types'

export default function ReplayHome() {
  const {
    steps,
    paramValues,
    anomalies,
    currentVersionId,
    paramVersions,
    expandedStepId,
    toggleStep,
  } = useReplayStore()

  const currentVersion = paramVersions.find((v) => v.id === currentVersionId)

  const currentParams = useMemo(
    () => paramValues.filter((p) => p.versionId === currentVersionId),
    [paramValues, currentVersionId],
  )

  const autoDetected = currentParams
    .map((p) => detectUnitError(p) ?? detectDirectionError(p))
    .filter((a): a is Anomaly => a !== null)

  const directionErr = autoDetected.find((a) => a.type === 'direction')

  return (
    <div>
      <PageHeader
        title="热泵循环参数回放"
        subtitle={`${currentVersion?.name} · 操作人 ${currentVersion?.operator} · ${currentVersion?.createdAt}`}
      >
        <VersionSelector />
      </PageHeader>

      <div className="p-6 space-y-6">
        {directionErr && (
          <div className="border-2 border-industrial-red rounded-lg p-4 bg-industrial-red/10">
            <div className="text-industrial-red font-bold mb-2 flex items-center gap-2">
              ⚠️ 检测到方向符号写反，将影响回放结果
            </div>
            <pre className="text-sm text-white whitespace-pre-wrap font-mono leading-relaxed">
              {directionErr.actionHint}
            </pre>
          </div>
        )}

        {anomalies
          .filter((a) => a.status !== 'resolved')
          .map((a) => (
            <AnomalyBanner key={a.id} anomaly={a} />
          ))}

        <div>
          <div className="text-sm text-industrial-muted mb-3">
            步骤时间线 · 共 {steps.length} 条记录（含 1 条撤回）
          </div>
          <div className="relative pl-6">
            <div className="absolute left-[17px] top-2 bottom-2 w-px bg-industrial-border" />
            <div className="space-y-4">
              {steps.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  params={currentParams.filter((p) => p.stepId === step.id)}
                  anomalies={anomalies.filter((a) => a.stepId === step.id)}
                  expanded={expandedStepId === step.id}
                  onToggle={() => toggleStep(step.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
