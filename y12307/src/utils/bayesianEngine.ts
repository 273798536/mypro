import type { AlarmRecord, MaintenanceResult, ComponentProbability, EvidenceItem, ComponentPrior } from '@/types'

export function bayesianUpdate(
  priors: ComponentPrior[],
  alarms: AlarmRecord[],
  maintenances: MaintenanceResult[]
): { probabilities: ComponentProbability[]; evidenceChain: EvidenceItem[] } {
  const components = new Map<string, ComponentPrior>()
  for (const p of priors) {
    components.set(p.component, { ...p, prior: p.prior })
  }

  for (const alarm of alarms) {
    if (!components.has(alarm.alarmType)) {
      components.set(alarm.alarmType, {
        component: alarm.alarmType,
        prior: 1 / Math.max(components.size, 1),
        material: alarm.material,
        object: alarm.object,
      })
    }
  }

  for (const m of maintenances) {
    if (!components.has(m.component)) {
      components.set(m.component, {
        component: m.component,
        prior: 1 / Math.max(components.size, 1),
        material: m.material,
        object: m.object,
      })
    }
  }

  const likelihoods = new Map<string, number>()
  for (const [comp] of components) {
    likelihoods.set(comp, 1.0)
  }

  const evidenceChain: EvidenceItem[] = []
  let evId = 0

  for (const alarm of alarms) {
    const comp = alarm.alarmType
    const current = likelihoods.get(comp) ?? 1.0
    const sampleFactor = Math.min(alarm.sampleSize / 10, 2.0)
    const boost = 1.0 + sampleFactor * 0.3
    likelihoods.set(comp, current * boost)

    for (const [otherComp] of components) {
      if (otherComp !== comp) {
        const other = likelihoods.get(otherComp) ?? 1.0
        likelihoods.set(otherComp, other * 0.95)
      }
    }

    evidenceChain.push({
      sourceId: alarm.id,
      sourceType: 'alarm',
      description: `传感器 ${alarm.sensorSerial} 报警: ${alarm.alarmType} = ${alarm.convertedValue.toFixed(2)} ${alarm.baseUnit}`,
      contributionToRank: `↑ ${comp} 似然提升 ×${boost.toFixed(2)}`,
      confidence: Math.min(alarm.sampleSize / 10, 1.0),
    })
    evId++
  }

  for (const m of maintenances) {
    const comp = m.component
    const current = likelihoods.get(comp) ?? 1.0

    if (m.confirmed) {
      likelihoods.set(comp, current * 1.5)
      evidenceChain.push({
        sourceId: m.id,
        sourceType: 'maintenance',
        description: `维修确认: ${comp} 故障已确认 (${m.action})`,
        contributionToRank: `↑↑ ${comp} 似然提升 ×1.50`,
        confidence: 0.9,
      })
    } else if (m.excluded) {
      likelihoods.set(comp, current * 0.3)
      evidenceChain.push({
        sourceId: m.id,
        sourceType: 'maintenance',
        description: `维修排除: ${comp} 故障已排除 (${m.action})`,
        contributionToRank: `↓↓ ${comp} 似然降低 ×0.30`,
        confidence: 0.9,
      })
    } else {
      evidenceChain.push({
        sourceId: m.id,
        sourceType: 'maintenance',
        description: `维修记录: ${comp} 处理中 (${m.action})`,
        contributionToRank: `→ ${comp} 似然不变`,
        confidence: 0.5,
      })
    }
    evId++
  }

  let numeratorSum = 0
  const numerators = new Map<string, number>()
  for (const [comp, prior] of components) {
    const likelihood = likelihoods.get(comp) ?? 1.0
    const num = prior.prior * likelihood
    numerators.set(comp, num)
    numeratorSum += num
  }

  const probabilities: ComponentProbability[] = []
  const sortedComps = [...numerators.entries()].sort((a, b) => b[1] - a[1])

  for (let i = 0; i < sortedComps.length; i++) {
    const [comp, num] = sortedComps[i]
    const prob = numeratorSum > 0 ? num / numeratorSum : 0
    const priorInfo = components.get(comp)!
    probabilities.push({
      component: comp,
      probability: prob,
      previousRank: i + 1,
      currentRank: i + 1,
      rankChanged: false,
      material: priorInfo.material,
      object: priorInfo.object,
    })
  }

  return { probabilities, evidenceChain }
}

export function computeRankChanges(
  previous: ComponentProbability[],
  current: ComponentProbability[]
): ComponentProbability[] {
  const prevMap = new Map(previous.map(p => [p.component, p.currentRank]))
  const sorted = [...current].sort((a, b) => b.probability - a.probability)

  return sorted.map((item, idx) => {
    const newRank = idx + 1
    const oldRank = prevMap.get(item.component) ?? newRank
    return {
      ...item,
      previousRank: oldRank,
      currentRank: newRank,
      rankChanged: oldRank !== newRank,
    }
  })
}
