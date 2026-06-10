import { SpectrumPeak } from '../types'

export function generateImportHash(
  batchId: string,
  instrumentNo: string,
  analysisDate: string,
  peaks: SpectrumPeak[],
): string {
  const peakSig = peaks
    .map((p) => `${p.retentionTime.toFixed(3)}-${p.area.toFixed(0)}`)
    .sort()
    .join('|')
  const raw = `${batchId}|${instrumentNo}|${analysisDate}|${peakSig}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }
  return `h${Math.abs(hash).toString(36)}`
}

export function detectPeakOverlap(peaks: SpectrumPeak[]): {
  hasOverlap: boolean
  overlapDetails: string[]
} {
  const details: string[] = []
  const threshold = 0.05
  for (let i = 0; i < peaks.length; i++) {
    for (let j = i + 1; j < peaks.length; j++) {
      const a = peaks[i]
      const b = peaks[j]
      const distance = Math.abs(a.retentionTime - b.retentionTime)
      const avgWidth = (a.width + b.width) / 2
      if (distance < avgWidth * threshold * 10) {
        const nameA = a.compoundName || `峰@${a.retentionTime.toFixed(2)}min`
        const nameB = b.compoundName || `峰@${b.retentionTime.toFixed(2)}min`
        details.push(
          `${nameA} 与 ${nameB} 保留时间差 ${distance.toFixed(3)} 分钟，小于峰宽均值的 50%，判定为谱峰重叠`,
        )
      }
    }
  }
  return { hasOverlap: details.length > 0, overlapDetails: details }
}

export function generatePlainOverlapExplanation(details: string[]): string {
  if (details.length === 0) return ''
  return (
    '这份谱图出现了 ' +
    details.length +
    ' 处谱峰重叠，意思是：在同一个出峰时间段内有两个或多个物质同时出信号，仪器没法把它们完全分开。' +
    '出现这种情况说明本次标准液的检测结果可能不准，不能直接用于判断有效期，需要重新配液或换检测条件再测一次。'
  )
}
