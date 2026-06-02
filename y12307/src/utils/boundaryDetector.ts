import type { BoundaryWarning, AlarmRecord, MaintenanceResult, ComponentProbability, LocalizationReport } from '@/types'

const SAMPLE_SIZE_THRESHOLD = 5
const PRIOR_STRENGTH_THRESHOLD = 0.7
const LABEL_DELAY_HOURS = 72

export function detectBoundaryWarnings(
  alarms: AlarmRecord[],
  maintenances: MaintenanceResult[],
  probabilities: ComponentProbability[],
  reports: LocalizationReport[]
): BoundaryWarning[] {
  const warnings: BoundaryWarning[] = []
  let warnId = 0

  for (const alarm of alarms) {
    if (alarm.sampleSize < SAMPLE_SIZE_THRESHOLD) {
      warnings.push({
        id: `bw-${warnId++}`,
        type: 'sample_too_small',
        component: alarm.alarmType,
        material: alarm.material,
        object: alarm.object,
        detail: `传感器 ${alarm.sensorSerial} 的"${alarm.alarmType}"报警仅 ${alarm.sampleSize} 个样本（阈值 ${SAMPLE_SIZE_THRESHOLD}），${alarm.material}/${alarm.object}的统计推断不可靠，建议补充采样或降低置信度要求`,
        severity: alarm.sampleSize <= 2 ? 'error' : 'warning',
      })
    }
  }

  for (const prob of probabilities) {
    if (prob.probability > PRIOR_STRENGTH_THRESHOLD) {
      const relatedAlarms = alarms.filter(a => a.alarmType === prob.component || a.material === prob.material)
      const totalSamples = relatedAlarms.reduce((s, a) => s + a.sampleSize, 0)

      const relatedReports = reports.filter(r =>
        r.componentRanking.some(cr => cr.component === prob.component)
      )
      const reportDriven = relatedReports.some(r => r.priorStrength > PRIOR_STRENGTH_THRESHOLD)

      if (totalSamples < SAMPLE_SIZE_THRESHOLD * 2 || reportDriven) {
        const isReportDriven = reportDriven && totalSamples < SAMPLE_SIZE_THRESHOLD * 2
        warnings.push({
          id: `bw-${warnId++}`,
          type: 'prior_too_strong',
          component: prob.component,
          material: prob.material,
          object: prob.object,
          detail: isReportDriven
            ? `"${prob.component}"后验概率 ${(prob.probability * 100).toFixed(1)}% 过高，${prob.material}/${prob.object}受报告先验驱动（${relatedReports.map(r => r.source + ' 先验' + (r.priorStrength * 100).toFixed(0) + '%').join('、')}），支撑样本仅 ${totalSamples} 个，建议审查先验来源或增加独立观测`
            : `"${prob.component}"后验概率 ${(prob.probability * 100).toFixed(1)}% 过高，但支撑样本仅 ${totalSamples} 个，${prob.material}/${prob.object}的先验可能主导了更新结果，建议审查先验设定或增加观测`,
          severity: totalSamples <= SAMPLE_SIZE_THRESHOLD ? 'error' : 'warning',
        })
      }
    }
  }

  for (const report of reports) {
    if (report.priorStrength > 0.8) {
      const hasLowSampleComponents = report.componentRanking.some(cr => {
        const relatedAlarms = alarms.filter(a => a.alarmType === cr.component)
        return relatedAlarms.reduce((s, a) => s + a.sampleSize, 0) < SAMPLE_SIZE_THRESHOLD
      })
      if (hasLowSampleComponents) {
        warnings.push({
          id: `bw-${warnId++}`,
          type: 'prior_too_strong',
          component: report.componentRanking[0]?.component ?? report.source,
          material: report.componentRanking[0]?.material ?? '未指定',
          object: report.componentRanking[0]?.object ?? '未指定',
          detail: `报告"${report.source}"先验强度 ${(report.priorStrength * 100).toFixed(0)}% 过高，且相关部件样本不足，报告结论可能主导更新结果，建议审查报告来源可靠性`,
          severity: 'warning',
        })
      }
    }
  }

  for (const m of maintenances) {
    if (m.labelDelayDetected) {
      warnings.push({
        id: `bw-${warnId++}`,
        type: 'label_lag',
        component: m.component,
        material: m.material,
        object: m.object,
        detail: `${m.material}/${m.object}的"${m.component}"维修结果标签滞后超过 ${LABEL_DELAY_HOURS}h，当前标签可能不代表实际状态，建议复核标签时效性`,
        severity: 'warning',
      })
    }
  }

  return warnings
}

export function checkLabelDelay(maintenanceTimestamp: string, alarmTimestamp: string): boolean {
  const mt = new Date(maintenanceTimestamp).getTime()
  const at = new Date(alarmTimestamp).getTime()
  const diffHours = Math.abs(mt - at) / (1000 * 60 * 60)
  return diffHours > LABEL_DELAY_HOURS
}
