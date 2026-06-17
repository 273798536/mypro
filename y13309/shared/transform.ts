import type { MaterialFlags, RawMaterial, Sample, SampleStatus } from './types'

export function materialFlags(
  raw: Pick<RawMaterial, 'citations' | 'canonicalName' | 'materialName'>,
): MaterialFlags {
  const citationMissing = !raw.citations || raw.citations.length === 0
  const nameMismatch = Boolean(
    raw.canonicalName && raw.materialName && raw.materialName !== raw.canonicalName,
  )
  return { citationMissing, nameMismatch }
}

export function statusFor(raw: RawMaterial): SampleStatus {
  const { citationMissing, nameMismatch } = materialFlags(raw)
  return citationMissing || nameMismatch ? 'exception' : 'pending'
}

export function isBadMaterial(s: Pick<Sample, 'citationMissing' | 'nameMismatch'>): boolean {
  return s.citationMissing || s.nameMismatch
}

export function toSample(raw: RawMaterial, now: string, id: string): Sample {
  const { citationMissing, nameMismatch } = materialFlags(raw)
  const status: SampleStatus = citationMissing || nameMismatch ? 'exception' : 'pending'
  const reevaluated = raw.reevaluated ?? false
  return {
    id,
    materialName: raw.materialName,
    canonicalName: raw.canonicalName,
    nameMismatch,
    materialContent: raw.materialContent,
    question: raw.question,
    citations: raw.citations ?? [],
    citationMissing,
    modelOutput: raw.modelOutput,
    conclusion: raw.conclusion,
    status,
    threshold: raw.threshold,
    thresholdVersion: raw.thresholdVersion,
    oldJudgment: raw.oldJudgment,
    judgmentChangeReason: raw.judgmentChangeReason,
    reevaluated,
    createdAt: now,
    history: [
      { at: now, action: 'import', note: reevaluated ? '改判样本导入' : undefined },
    ],
  }
}
