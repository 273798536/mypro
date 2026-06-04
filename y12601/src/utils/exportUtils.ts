import type { DraftRecord, DraftEntry, ExportBlock } from '@/types/draft'

export function generateExportText(draft: DraftRecord): string {
  const blocks: ExportBlock[] = []

  blocks.push({
    title: `=== 细胞切片涂色练习 - 标注导出 ===`,
    lines: [
      `关卡：${draft.levelName}`,
      `练习时间：${draft.createdAt}`,
      `命中率：${Math.round(draft.accuracy * 100)}%`,
      `标注总数：${draft.entryCount}`,
      `问题数：${draft.issueCount}`,
      '',
      draft.summary,
    ],
  })

  const correctEntries = draft.entries.filter((e) => e.isCorrect && !e.hasIssue)
  if (correctEntries.length > 0) {
    blocks.push({
      title: '--- 正确标注 ---',
      lines: correctEntries.map((e) =>
        `${e.positionLabel}：涂色${e.userColorName}，判定正确（来源：${e.sourceName}）`
      ),
    })
  }

  const mismatchEntries = draft.entries.filter((e) => e.issueType === 'mismatch')
  if (mismatchEntries.length > 0) {
    blocks.push({
      title: '--- 涂色错误 ---',
      lines: mismatchEntries.flatMap((e) => [
        `${e.positionLabel}：`,
        `  涂色结果：${e.userColorName}`,
        `  正确结果：${e.correctColorName}`,
        `  来源：${e.sourceName}`,
        `  说明：${e.issueDescription}`,
        '',
      ]),
    })
  }

  const duplicateEntries = draft.entries.filter((e) => e.isDuplicate)
  if (duplicateEntries.length > 0) {
    blocks.push({
      title: '--- 重复标注 ---',
      lines: duplicateEntries.flatMap((e) => [
        `${e.positionLabel} 出现重复标注：`,
        `  涂色结果：${e.userColorName}`,
        `  正确结果：${e.correctColorName}`,
        `  判定：${e.isCorrect ? '正确' : '错误'}`,
        `  来源：${e.sourceName}`,
        `  备注：${e.notes}`,
        `  重复原因：${e.duplicateReason}`,
        '',
      ]),
    })
  }

  const unitEntries = draft.entries.filter((e) => e.issueType === 'missing_unit')
  if (unitEntries.length > 0) {
    blocks.push({
      title: '--- 漏填单位 ---',
      lines: unitEntries.flatMap((e) => [
        `${e.positionLabel}：`,
        `  备注：${e.notes}`,
        `  说明：${e.issueDescription}`,
        '',
      ]),
    })
  }

  const nameEntries = draft.entries.filter((e) => e.issueType === 'inconsistent_name')
  if (nameEntries.length > 0) {
    blocks.push({
      title: '--- 字段名不一致 ---',
      lines: nameEntries.flatMap((e) => [
        `${e.positionLabel}：`,
        `  备注：${e.notes}`,
        `  说明：${e.issueDescription}`,
        '',
      ]),
    })
  }

  return blocks
    .map((b) => [b.title, ...b.lines].join('\n'))
    .join('\n\n')
}

export function copyExportText(text: string): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      return true
    }
    return false
  } catch (err) {
    console.error('[Export] Failed to copy:', err)
    return false
  }
}
