import { FIELD_ALIAS_MAP, STANDARD_FIELDS } from '@/types'
import type { FieldMapping } from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function guessFieldMapping(originalField: string): { guessed: string; reason: string } {
  const normalized = originalField.trim()

  if (FIELD_ALIAS_MAP[normalized]) {
    return {
      guessed: FIELD_ALIAS_MAP[normalized],
      reason: `中文别名"${normalized}"直接匹配到标准字段`,
    }
  }

  const lower = normalized.toLowerCase().replace(/[-_\s]/g, '')
  for (const [alias, standard] of Object.entries(FIELD_ALIAS_MAP)) {
    if (alias.toLowerCase().replace(/[-_\s]/g, '') === lower) {
      return {
        guessed: standard,
        reason: `忽略大小写和分隔符后，"${normalized}"匹配到别名"${alias}"`,
      }
    }
  }

  for (const sf of STANDARD_FIELDS) {
    if (sf.toLowerCase().replace(/[-_\s]/g, '') === lower) {
      return {
        guessed: sf,
        reason: `"${normalized}"与标准字段"${sf}"完全匹配(忽略格式)`,
      }
    }
  }

  for (const sf of STANDARD_FIELDS) {
    if (lower.includes(sf) || sf.includes(lower)) {
      return {
        guessed: sf,
        reason: `"${normalized}"包含标准字段"${sf}"的子串，可能是缩写或变体`,
      }
    }
  }

  return {
    guessed: 'unknown',
    reason: `无法匹配"${normalized}"到任何已知字段，请手动指定`,
  }
}

export function parseFieldsFromData(data: string): string[] {
  const trimmed = data.trim()

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return Object.keys(parsed[0])
    }
  } catch {
    // JSON 解析失败，继续尝试 CSV 解析
  }

  const lines = trimmed.split('\n').filter(l => l.trim())
  if (lines.length > 0) {
    const firstLine = lines[0]
    if (firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes('|')) {
      let separator = ','
      if (firstLine.split('\t').length > firstLine.split(',').length) separator = '\t'
      if (firstLine.split('|').length > firstLine.split(separator).length) separator = '|'
      return firstLine.split(separator).map(f => f.trim()).filter(Boolean)
    }
  }

  return []
}

export function generateFieldMappings(fields: string[]): FieldMapping[] {
  return fields.map(field => {
    const { guessed, reason } = guessFieldMapping(field)
    return {
      id: generateId(),
      originalField: field,
      guessedField: guessed,
      reason,
      status: 'pending' as const,
    }
  })
}
