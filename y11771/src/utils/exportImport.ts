import type { RobotArm, Obstacle, SafetyZone, HistoryEntry } from './kinematics'

export interface ExportData {
  version: string
  exportedAt: string
  arm: RobotArm
  obstacles: Obstacle[]
  safetyZones: SafetyZone[]
  history: HistoryEntry[]
}

export function exportToJSON(
  arm: RobotArm,
  obstacles: Obstacle[],
  safetyZones: SafetyZone[],
  history: HistoryEntry[]
): void {
  const data: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    arm,
    obstacles,
    safetyZones,
    history,
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.download = `机械臂方案_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.json`
  link.href = url
  link.click()

  URL.revokeObjectURL(url)
}

export function importFromJSON(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportData
        if (!validateExportData(data)) {
          reject(new Error('数据格式校验失败：缺少必要字段'))
          return
        }
        resolve(data)
      } catch (err) {
        reject(new Error('JSON解析失败：' + (err as Error).message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

function validateExportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') return false
  if (!data.arm || !Array.isArray(data.arm.joints)) return false
  if (!Array.isArray(data.obstacles)) return false
  if (!Array.isArray(data.safetyZones)) return false

  for (const j of data.arm.joints) {
    if (typeof j.id !== 'number' || typeof j.angle !== 'number') return false
    if (typeof j.minAngle !== 'number' || typeof j.maxAngle !== 'number') return false
    if (typeof j.length !== 'number') return false
  }

  return true
}
