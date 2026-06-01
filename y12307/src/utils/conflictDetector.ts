import type { UnitConflict, CalibrationConflict, AlarmRecord, LocalizationReport } from '@/types'
import { areUnitsCompatible, convertToBase } from './unitConversion'

export function detectUnitConflicts(
  existingAlarms: AlarmRecord[],
  incomingAlarm: AlarmRecord
): UnitConflict[] {
  const conflicts: UnitConflict[] = []
  let cId = 0

  for (const existing of existingAlarms) {
    if (existing.sensorSerial === incomingAlarm.sensorSerial && existing.alarmType === incomingAlarm.alarmType) {
      if (existing.rawUnit !== incomingAlarm.rawUnit && areUnitsCompatible(existing.rawUnit, incomingAlarm.rawUnit)) {
        const existingBase = convertToBase(existing.rawValue, existing.rawUnit)
        const incomingBase = convertToBase(incomingAlarm.rawValue, incomingAlarm.rawUnit)
        if (existingBase && incomingBase) {
          const diff = Math.abs(existingBase.converted - incomingBase.converted)
          const avg = (Math.abs(existingBase.converted) + Math.abs(incomingBase.converted)) / 2
          if (avg > 0 && diff / avg > 0.1) {
            conflicts.push({
              id: `uc-${cId++}`,
              field: `${incomingAlarm.alarmType}@${incomingAlarm.sensorSerial}`,
              existingValue: `${existing.rawValue} ${existing.rawUnit}`,
              incomingValue: `${incomingAlarm.rawValue} ${incomingAlarm.rawUnit}`,
              existingUnit: existing.rawUnit,
              incomingUnit: incomingAlarm.rawUnit,
              resolved: false,
              sourceType: 'alarm',
              sourceId: incomingAlarm.id,
            })
          }
        }
      }
    }
  }

  return conflicts
}

export function detectCalibrationConflicts(
  existingAlarms: AlarmRecord[],
  report: LocalizationReport
): CalibrationConflict[] {
  const conflicts: CalibrationConflict[] = []
  let cId = 0

  if (report.priorStrength > 0.7) {
    const relatedAlarms = existingAlarms.filter(a =>
      report.componentRanking.some(r => r.component === a.alarmType)
    )
    if (relatedAlarms.length < 3) {
      conflicts.push({
        id: `cc-${cId++}`,
        field: 'priorStrength',
        existingCalibration: `先验强度 ${(report.priorStrength * 100).toFixed(1)}%`,
        incomingCalibration: `仅 ${relatedAlarms.length} 条报警支撑`,
        autoModified: false,
        sourceType: 'report',
        sourceId: report.id,
      })
    }
  }

  return conflicts
}

export function detectAllConflicts(
  alarms: AlarmRecord[],
  newAlarm?: AlarmRecord,
  reports?: LocalizationReport[]
): { unitConflicts: UnitConflict[]; calibrationConflicts: CalibrationConflict[] } {
  const unitConflicts: UnitConflict[] = []
  const calibrationConflicts: CalibrationConflict[] = []

  if (newAlarm) {
    unitConflicts.push(...detectUnitConflicts(alarms, newAlarm))
  }

  if (reports) {
    for (const report of reports) {
      calibrationConflicts.push(...detectCalibrationConflicts(alarms, report))
    }
  }

  return { unitConflicts, calibrationConflicts }
}
