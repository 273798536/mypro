import type { BuoyParameter, AlarmRecord, ManualOverride, CausalLink, ParameterKey } from '@/types'

export function applyOverridesToData(
  rawData: BuoyParameter[],
  overrides: ManualOverride[],
  noiseParamIds: Set<string>,
): BuoyParameter[] {
  return rawData.map((param) => {
    let result = { ...param }

    if (noiseParamIds.has(param.id)) {
      const prevValid = findPrevValid(rawData, param.id, noiseParamIds)
      const nextValid = findNextValid(rawData, param.id, noiseParamIds)
      if (prevValid && nextValid) {
        const keys: ParameterKey[] = ['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure']
        keys.forEach((k) => {
          ;(result as any)[k] = +(((prevValid as any)[k] + (nextValid as any)[k]) / 2).toFixed(2)
        })
      }
    }

    const override = overrides.find(
      (o) => o.buoyId === param.buoyId && o.timestamp === param.timestamp,
    )
    if (override) {
      const key = override.parameterName as ParameterKey
      ;(result as any)[key] = override.newValue
    }

    return result
  })
}

function findPrevValid(
  data: BuoyParameter[],
  currentId: string,
  noiseIds: Set<string>,
): BuoyParameter | null {
  const idx = data.findIndex((d) => d.id === currentId)
  for (let i = idx - 1; i >= 0; i--) {
    if (!noiseIds.has(data[i].id)) return data[i]
  }
  return null
}

function findNextValid(
  data: BuoyParameter[],
  currentId: string,
  noiseIds: Set<string>,
): BuoyParameter | null {
  const idx = data.findIndex((d) => d.id === currentId)
  for (let i = idx + 1; i < data.length; i++) {
    if (!noiseIds.has(data[i].id)) return data[i]
  }
  return null
}

const THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  waveHeight: { warning: 5.5, critical: 10.0 },
  windSpeed: { warning: 10.0, critical: 15.0 },
}

export function recalculateAlarms(
  appliedData: BuoyParameter[],
  overrides: ManualOverride[],
): AlarmRecord[] {
  const alarms: AlarmRecord[] = []
  let alarmIdx = 1

  const keys: ParameterKey[] = ['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure']

  appliedData.forEach((param) => {
    keys.forEach((key) => {
      if (!(key in THRESHOLDS)) return
      const value = (param as any)[key] as number
      const thresholds = (THRESHOLDS as any)[key] as { warning: number; critical: number }

      if (value >= thresholds.critical) {
        alarms.push({
          id: `a${alarmIdx++}`,
          buoyId: param.buoyId,
          timestamp: param.timestamp,
          alarmType: `${getParamLabel(key)}超阈值(严重)`,
          severity: 'critical',
          parameterName: key,
          originalStatus: 'active',
          currentStatus: 'active',
          triggerValue: value,
          threshold: thresholds.critical,
        })
      } else if (value >= thresholds.warning) {
        alarms.push({
          id: `a${alarmIdx++}`,
          buoyId: param.buoyId,
          timestamp: param.timestamp,
          alarmType: `${getParamLabel(key)}超警告`,
          severity: 'warning',
          parameterName: key,
          originalStatus: 'active',
          currentStatus: 'active',
          triggerValue: value,
          threshold: thresholds.warning,
        })
      }
    })
  })

  return alarms
}

function getParamLabel(key: string): string {
  const labels: Record<string, string> = {
    waveHeight: '波高',
    wavePeriod: '波周期',
    waterTemp: '水温',
    windSpeed: '风速',
    pressure: '气压',
  }
  return labels[key] || key
}

export function buildCausalLinks(
  overrides: ManualOverride[],
  alarms: AlarmRecord[],
): CausalLink[] {
  const links: CausalLink[] = []
  let linkIdx = 1

  overrides.forEach((override) => {
    const affectedAlarms = alarms.filter(
      (a) => a.parameterName === override.parameterName && a.timestamp === override.timestamp,
    )

    if (affectedAlarms.length === 0) {
      links.push({
        id: `cl${linkIdx++}`,
        overrideId: override.id,
        affectedAlarmId: '',
        conclusionBefore: `触发报警（${getParamLabel(override.parameterName)}=${override.oldValue}）`,
        conclusionAfter: `报警消除（${getParamLabel(override.parameterName)}=${override.newValue}）`,
        impactDescription: `改判后${getParamLabel(override.parameterName)}从${override.oldValue}降到${override.newValue}，低于阈值，报警解除`,
      })
    } else {
      affectedAlarms.forEach((alarm) => {
        const stillTriggered = override.newValue >= alarm.threshold
        links.push({
          id: `cl${linkIdx++}`,
          overrideId: override.id,
          affectedAlarmId: alarm.id,
          conclusionBefore: `报警：${alarm.alarmType}（原值${override.oldValue}，阈值${alarm.threshold}）`,
          conclusionAfter: stillTriggered
            ? `报警仍在（改判后${override.newValue}仍超阈值${alarm.threshold}）`
            : `报警消除（改判后${override.newValue}低于阈值${alarm.threshold}）`,
          impactDescription: `改判值${override.oldValue}→${override.newValue}，${stillTriggered ? '未影响报警结论' : '导致报警状态变更'}`,
        })
      })
    }
  })

  return links
}
