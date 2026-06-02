import type { ReinspectionSuggestion, ComponentProbability, BoundaryWarning, EvidenceItem, LocalizationReport } from '@/types'

export function generateReinspectionSuggestions(
  probabilities: ComponentProbability[],
  warnings: BoundaryWarning[],
  evidenceChain: EvidenceItem[],
  reports: LocalizationReport[]
): ReinspectionSuggestion[] {
  const suggestions: ReinspectionSuggestion[] = []
  let sId = 0

  const highProbLowConf = probabilities.filter(p => {
    if (p.probability < 0.3) return false
    const relatedWarnings = warnings.filter(w => w.component === p.component)
    return relatedWarnings.some(w => w.type === 'sample_too_small' || w.type === 'prior_too_strong')
  })

  for (const prob of highProbLowConf) {
    const relatedWarnings = warnings.filter(w => w.component === prob.component)
    const sampleWarning = relatedWarnings.find(w => w.type === 'sample_too_small')
    const priorWarning = relatedWarnings.find(w => w.type === 'prior_too_strong')

    const reportSources = reports
      .filter(r => r.componentRanking.some(cr => cr.component === prob.component))
      .map(r => r.source)

    let reason = ''
    if (sampleWarning && priorWarning) {
      reason = `${prob.material}/${prob.object}的"${prob.component}"概率 ${(prob.probability * 100).toFixed(1)}% 但样本不足且先验过强，结论不可靠，建议重新采样并审查先验设定`
    } else if (sampleWarning) {
      reason = `${prob.material}/${prob.object}的"${prob.component}"概率 ${(prob.probability * 100).toFixed(1)}% 但样本不足，建议补充观测后再判断`
    } else if (priorWarning) {
      reason = `${prob.material}/${prob.object}的"${prob.component}"概率 ${(prob.probability * 100).toFixed(1)}% 但先验主导，建议审查先验来源或增加独立证据`
    }

    if (reportSources.length > 0 && priorWarning) {
      reason += `（报告来源: ${reportSources.join('、')}）`
    }

    const relatedIds = evidenceChain
      .filter(e => e.description.includes(prob.component))
      .map(e => e.sourceId)

    suggestions.push({
      id: `rs-${sId++}`,
      component: prob.component,
      material: prob.material,
      object: prob.object,
      reason,
      priority: prob.probability > 0.5 ? 'high' : 'medium',
      relatedEvidenceIds: relatedIds,
    })
  }

  const lagWarnings = warnings.filter(w => w.type === 'label_lag')
  for (const lag of lagWarnings) {
    suggestions.push({
      id: `rs-${sId++}`,
      component: lag.component,
      material: lag.material,
      object: lag.object,
      reason: `${lag.material}/${lag.object}的"${lag.component}"标签滞后，当前标签可能失效，建议复核标签并重新评估`,
      priority: 'medium',
      relatedEvidenceIds: [],
    })
  }

  const topComponent = probabilities[0]
  if (topComponent && topComponent.probability > 0.4) {
    const hasSuggestion = suggestions.some(s => s.component === topComponent.component)
    if (!hasSuggestion) {
      suggestions.push({
        id: `rs-${sId++}`,
        component: topComponent.component,
        material: topComponent.material,
        object: topComponent.object,
        reason: `${topComponent.material}/${topComponent.object}的"${topComponent.component}"为最高概率故障源 (${(topComponent.probability * 100).toFixed(1)}%)，建议优先对该材料/对象进行复检确认`,
        priority: 'high',
        relatedEvidenceIds: evidenceChain.slice(0, 3).map(e => e.sourceId),
      })
    }
  }

  for (const report of reports) {
    if (report.priorStrength > 0.8) {
      const hasRelatedSuggestion = suggestions.some(s =>
        report.componentRanking.some(cr => cr.component === s.component)
      )
      if (!hasRelatedSuggestion) {
        const topRanking = report.componentRanking[0]
        if (topRanking) {
          suggestions.push({
            id: `rs-${sId++}`,
            component: topRanking.component,
            material: topRanking.material,
            object: topRanking.object,
            reason: `${topRanking.material}/${topRanking.object}的"${topRanking.component}"受报告"${report.source}"强先验驱动（先验 ${(report.priorStrength * 100).toFixed(0)}%），独立观测不足，建议对报告结论做独立验证`,
            priority: 'medium',
            relatedEvidenceIds: [report.id],
          })
        }
      }
    }
  }

  return suggestions.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 }
    return prio[a.priority] - prio[b.priority]
  })
}
