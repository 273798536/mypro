import type { TraceLink, TraceNode, AlarmRecord, MaintenanceResult, ComponentProbability } from '@/types'

export function buildTraceLinks(
  alarms: AlarmRecord[],
  maintenances: MaintenanceResult[],
  probabilities: ComponentProbability[]
): TraceLink[] {
  const links: TraceLink[] = []

  for (const prob of probabilities) {
    const relatedAlarms = alarms.filter(a => a.alarmType === prob.component || a.sensorSerial.startsWith(prob.component))
    const relatedMaintenances = maintenances.filter(m => m.component === prob.component)

    const forwardPath: TraceNode[] = relatedAlarms.map(alarm => {
      const alarmNode: TraceNode = {
        id: alarm.id,
        type: 'alarm',
        label: `${alarm.alarmType} (${alarm.sensorSerial})`,
        sensorSerial: alarm.sensorSerial,
        timestamp: alarm.timestamp,
        children: [],
      }

      const matchingMaint = relatedMaintenances.filter(m => m.relatedAlarmIds.includes(alarm.id))
      alarmNode.children = matchingMaint.map(m => ({
        id: m.id,
        type: 'maintenance' as const,
        label: `${m.action} (${m.confirmed ? '确认' : m.excluded ? '排除' : '处理中'})`,
        timestamp: m.timestamp,
        children: [],
      }))

      return alarmNode
    })

    if (forwardPath.length === 0 && relatedMaintenances.length > 0) {
      forwardPath.push(...relatedMaintenances.map(m => ({
        id: m.id,
        type: 'maintenance' as const,
        label: `${m.component}: ${m.action}`,
        timestamp: m.timestamp,
        children: [],
      })))
    }

    const resultNode: TraceNode = {
      id: prob.component,
      type: 'result',
      label: `${prob.component} (${(prob.probability * 100).toFixed(1)}%)`,
      children: forwardPath,
    }

    const backwardPath: TraceNode[] = [{
      ...resultNode,
      children: buildBackwardTree(prob, alarms, relatedMaintenances),
    }]

    links.push({ forwardPath: [resultNode], backwardPath })
  }

  return links
}

function buildBackwardTree(
  prob: ComponentProbability,
  alarms: AlarmRecord[],
  maintenances: MaintenanceResult[]
): TraceNode[] {
  const sensorNodes: TraceNode[] = []

  const relatedAlarms = alarms.filter(a => a.alarmType === prob.component)
  const sensorGroups = new Map<string, AlarmRecord[]>()

  for (const alarm of relatedAlarms) {
    const existing = sensorGroups.get(alarm.sensorSerial) ?? []
    existing.push(alarm)
    sensorGroups.set(alarm.sensorSerial, existing)
  }

  for (const [serial, alarmList] of sensorGroups) {
    const sensorNode: TraceNode = {
      id: `sensor-${serial}`,
      type: 'alarm',
      label: `传感器 ${serial}`,
      sensorSerial: serial,
      children: alarmList.map(a => ({
        id: a.id,
        type: 'alarm' as const,
        label: `${a.alarmType} = ${a.convertedValue.toFixed(2)} ${a.baseUnit}`,
        sensorSerial: serial,
        timestamp: a.timestamp,
        children: [],
      })),
    }
    sensorNodes.push(sensorNode)
  }

  const relatedMaint = maintenances.filter(m => m.component === prob.component)
  for (const m of relatedMaint) {
    sensorNodes.push({
      id: m.id,
      type: 'maintenance',
      label: `维修: ${m.action} (${m.confirmed ? '确认' : m.excluded ? '排除' : '处理中'})`,
      timestamp: m.timestamp,
      children: [],
    })
  }

  return sensorNodes
}
