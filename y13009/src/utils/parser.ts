import type { ImportResultItem } from '@/types'

export function parseImportText(text: string): ImportResultItem[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items: ImportResultItem[] = []
  let currentSource = '手动粘贴导入'

  for (const line of lines) {
    const headerMatch = line.match(/^(?:来源|发件人|From|Subject|主题)[:：]\s*(.+)$/i)
    if (headerMatch) {
      currentSource = headerMatch[1].slice(0, 60)
      continue
    }

    const m = line.match(/(?:批次|batch|Batch|编号)[:：]?\s*([A-Za-z0-9\-_]+)[,，\s\t]+(?:金额|amount|Amount)[:：]?\s*(-?\d+(?:\.\d+)?)/)
    if (m) {
      items.push({
        batchNo: m[1],
        amount: parseFloat(m[2]),
        source: currentSource,
      })
      continue
    }

    const m2 = line.match(/^([A-Za-z0-9\-_]{4,})[,，\s\t]+(-?\d+(?:\.\d+)?)(?:[,，\s\t]+(.+))?$/)
    if (m2) {
      items.push({
        batchNo: m2[1],
        amount: parseFloat(m2[2]),
        source: m2[3]?.trim() || currentSource,
      })
    }
  }

  return items
}
