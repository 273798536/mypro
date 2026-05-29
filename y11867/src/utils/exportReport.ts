import type { VoxelData, DetectedIssue, ExportReport } from '@/types'

export function generateWindConclusion(issues: DetectedIssue[], voxels: VoxelData[]): string {
  const windVoxels = voxels.filter((v) => v.category === 'wind' && v.windSpeed > 0)
  const reversalIssues = issues.filter((i) => i.type === 'wind_reversal')
  const criticalReversals = reversalIssues.filter((i) => i.severity === 'critical')

  if (windVoxels.length === 0) return '无有效风速数据'

  const avgSpeed = windVoxels.reduce((sum, v) => sum + v.windSpeed, 0) / windVoxels.length
  const maxSpeed = Math.max(...windVoxels.map((v) => v.windSpeed))

  let dirX = 0, dirZ = 0
  for (const v of windVoxels) {
    const mag = Math.sqrt(v.windDirection[0] ** 2 + v.windDirection[2] ** 2)
    if (mag > 0) {
      dirX += v.windDirection[0] / mag
      dirZ += v.windDirection[2] / mag
    }
  }
  const dominantAngle = Math.atan2(dirZ, dirX) * (180 / Math.PI)
  const compassDirs = ['东', '东北', '北', '西北', '西', '西南', '南', '东南']
  const dirIndex = Math.round(((dominantAngle + 360) % 360) / 45) % 8
  const dominantDir = compassDirs[dirIndex]

  let conclusion = `主导风向：${dominantDir}风（${Math.round(dominantAngle)}°），`

  if (criticalReversals.length > 0) {
    conclusion += `发现${criticalReversals.length}处行人区风向反转（严重），`
  }
  if (reversalIssues.length > criticalReversals.length) {
    conclusion += `${reversalIssues.length - criticalReversals.length}处一般风向反转，`
  }

  conclusion += `平均风速${avgSpeed.toFixed(1)}m/s，最大风速${maxSpeed.toFixed(1)}m/s`

  if (avgSpeed > 5) {
    conclusion += '。行人区风环境需重点关注'
  }

  return conclusion
}

export function exportReport(
  voxels: VoxelData[],
  buildings: { id: string; name: string }[],
  pedestrianZones: { id: string; name: string }[],
  issues: DetectedIssue[],
  windConclusion: string
): ExportReport {
  const windVoxels = voxels.filter((v) => v.category === 'wind' && v.windSpeed > 0)
  const avgSpeed = windVoxels.length > 0
    ? windVoxels.reduce((sum, v) => sum + v.windSpeed, 0) / windVoxels.length
    : 0
  const maxSpeed = windVoxels.length > 0
    ? Math.max(...windVoxels.map((v) => v.windSpeed))
    : 0
  const reversalCount = issues.filter((i) => i.type === 'wind_reversal').length

  let dirX = 0, dirZ = 0
  for (const v of windVoxels) {
    const mag = Math.sqrt(v.windDirection[0] ** 2 + v.windDirection[2] ** 2)
    if (mag > 0) {
      dirX += v.windDirection[0] / mag
      dirZ += v.windDirection[2] / mag
    }
  }
  const dominantAngle = Math.atan2(dirZ, dirX) * (180 / Math.PI)
  const compassDirs = ['东', '东北', '北', '西北', '西', '西南', '南', '东南']
  const dirIndex = Math.round(((dominantAngle + 360) % 360) / 45) % 8

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalVoxels: voxels.length,
      buildingCount: buildings.length,
      pedestrianZoneCount: pedestrianZones.length,
      issueCount: issues.length,
      windDirectionConclusion: windConclusion,
    },
    issues: issues.map((i) => ({
      ...i,
      description: i.description,
    })),
    windStatistics: {
      dominantDirection: `${compassDirs[dirIndex]}风（${Math.round(dominantAngle)}°）`,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      reversalCount,
    },
  }
}

export function downloadJsonReport(report: ExportReport): void {
  const json = JSON.stringify(report, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wind-voxel-report-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCsvSummary(
  voxels: VoxelData[],
  issues: DetectedIssue[],
  windConclusion: string
): void {
  const header = 'ID,位置X,位置Y,位置Z,风速,风向X,风向Y,风向Z,类型,区域ID,建筑ID\n'
  const rows = voxels.map((v) =>
    `${v.id},${v.position[0]},${v.position[1]},${v.position[2]},${v.windSpeed},${v.windDirection[0]},${v.windDirection[1]},${v.windDirection[2]},${v.category},${v.zoneId || ''},${v.buildingId || ''}`
  ).join('\n')

  const issueHeader = '\n\n问题ID,类型,严重程度,位置,描述,已确认\n'
  const issueRows = issues.map((i) =>
    `${i.id},${i.type},${i.severity},"(${i.position.join(',')})",${i.description},${i.confirmed}`
  ).join('\n')

  const summarySection = `\n\n风向结论: ${windConclusion}\n生成时间: ${new Date().toISOString()}`

  const csv = header + rows + issueHeader + issueRows + summarySection
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wind-voxel-data-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
