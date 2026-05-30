import type { PulseRecord, ScoreData } from '../store/gameStore'

export interface ExportData {
  timestamp: string
  level: number
  score: ScoreData
  pulses: PulseRecord[]
  pathDecisions: {
    turn: number
    selectedPath: number | null
    pathDirection: string
    wasSafe: boolean
    confidence: number
  }[]
}

export function generateExportData(
  level: number,
  score: ScoreData,
  pulses: PulseRecord[],
  pathDecisions: ExportData['pathDecisions']
): ExportData {
  return {
    timestamp: new Date().toISOString(),
    level,
    score,
    pulses,
    pathDecisions,
  }
}

export function downloadJson(data: ExportData, filename?: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `sonar-report-L${data.level}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
