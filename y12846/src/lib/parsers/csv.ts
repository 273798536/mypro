export interface PrimerRecord {
  name: string
  batch: string
  forwardSequence: string
  reverseSequence: string
  forwardTm: number
  reverseTm: number
  warnings: string[]
}

export interface MutationRecord {
  sampleName: string
  position: number
  refBase: string
  altBase: string
  quality: number
  alleleFrequency: number
}

export interface CsvParseResult<T> {
  records: T[]
  hash: string
  recordCount: number
  warnings: string[]
  errors: string[]
}

export class CsvParserError extends Error {
  constructor(message: string, public lineNumber?: number, public field?: string) {
    let msg = message
    if (field) msg += ` (字段: ${field})`
    if (lineNumber !== undefined) msg += ` (行 ${lineNumber})`
    super(msg)
    this.name = 'CsvParserError'
  }
}

const VALID_DNA_BASES = /^[ATCGNatcgn]+$/

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === ',') {
        result.push(current.trim())
        current = ''
      } else if (char === '"') {
        inQuotes = true
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())

  return result
}

function validateHeader(actual: string[], expected: string[], lineNumber: number = 1): void {
  if (actual.length !== expected.length) {
    throw new CsvParserError(
      `表头列数不匹配: 期望 ${expected.length} 列, 实际 ${actual.length} 列`,
      lineNumber
    )
  }

  for (let i = 0; i < expected.length; i++) {
    const actualLower = actual[i].toLowerCase().trim()
    const expectedLower = expected[i].toLowerCase()
    if (actualLower !== expectedLower) {
      throw new CsvParserError(
        `表头不匹配: 期望 "${expected[i]}", 实际 "${actual[i]}"`,
        lineNumber
      )
    }
  }
}

function validateDnaSequence(seq: string, fieldName: string): string[] {
  const warnings: string[] = []

  if (seq.length === 0) {
    warnings.push(`${fieldName}: 序列为空`)
    return warnings
  }

  if (!VALID_DNA_BASES.test(seq)) {
    warnings.push(`${fieldName}: 包含无效碱基字符`)
  }

  if (seq.toUpperCase().includes('N')) {
    const nCount = (seq.match(/N/gi) || []).length
    warnings.push(`${fieldName}: 包含 ${nCount} 个模糊碱基 N`)
  }

  return warnings
}

export function parsePrimersCsvSync(content: string): CsvParseResult<PrimerRecord> {
  const expectedHeader = ['name', 'batch', 'forward_sequence', 'reverse_sequence', 'forward_tm', 'reverse_tm']
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '')
  const warnings: string[] = []
  const errors: string[] = []
  const records: PrimerRecord[] = []

  if (lines.length === 0) {
    throw new CsvParserError('CSV文件为空')
  }

  const header = parseCsvLine(lines[0])
  validateHeader(header, expectedHeader)

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const fields = parseCsvLine(lines[i])

    if (fields.length !== expectedHeader.length) {
      errors.push(`行 ${lineNumber}: 列数不匹配, 跳过该行`)
      continue
    }

    try {
      const [name, batch, forwardSequence, reverseSequence, forwardTmStr, reverseTmStr] = fields

      const recordWarnings: string[] = []

      if (!name.trim()) {
        throw new CsvParserError('引物名称不能为空', lineNumber, 'name')
      }
      if (!batch.trim()) {
        recordWarnings.push('批次号为空')
      }

      recordWarnings.push(...validateDnaSequence(forwardSequence, 'forward_sequence'))
      recordWarnings.push(...validateDnaSequence(reverseSequence, 'reverse_sequence'))

      const forwardTm = parseFloat(forwardTmStr)
      const reverseTm = parseFloat(reverseTmStr)

      if (isNaN(forwardTm)) {
        throw new CsvParserError(`forward_tm 不是有效数字: ${forwardTmStr}`, lineNumber, 'forward_tm')
      }
      if (isNaN(reverseTm)) {
        throw new CsvParserError(`reverse_tm 不是有效数字: ${reverseTmStr}`, lineNumber, 'reverse_tm')
      }

      if (forwardTm < 30 || forwardTm > 90) {
        recordWarnings.push(`forward_tm 值异常: ${forwardTm}°C (正常范围 30-90°C)`)
      }
      if (reverseTm < 30 || reverseTm > 90) {
        recordWarnings.push(`reverse_tm 值异常: ${reverseTm}°C (正常范围 30-90°C)`)
      }

      records.push({
        name: name.trim(),
        batch: batch.trim(),
        forwardSequence: forwardSequence.toUpperCase(),
        reverseSequence: reverseSequence.toUpperCase(),
        forwardTm,
        reverseTm,
        warnings: recordWarnings,
      })

      warnings.push(...recordWarnings.map(w => `行 ${lineNumber}: ${w}`))
    } catch (e) {
      if (e instanceof CsvParserError) {
        errors.push(e.message)
      } else {
        errors.push(`行 ${lineNumber}: 解析错误 - ${(e as Error).message}`)
      }
    }
  }

  if (records.length === 0 && errors.length > 0) {
    throw new CsvParserError(`未能解析任何有效记录: ${errors.join('; ')}`)
  }

  return {
    records,
    hash: '',
    recordCount: records.length,
    warnings,
    errors,
  }
}

export async function parsePrimersCsv(content: string): Promise<CsvParseResult<PrimerRecord>> {
  const result = parsePrimersCsvSync(content)
  const hash = await computeHash(content)
  return { ...result, hash }
}

export function parseMutationsCsvSync(content: string): CsvParseResult<MutationRecord> {
  const expectedHeader = ['sample_name', 'position', 'ref_base', 'alt_base', 'quality', 'allele_frequency']
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '')
  const warnings: string[] = []
  const errors: string[] = []
  const records: MutationRecord[] = []

  if (lines.length === 0) {
    throw new CsvParserError('CSV文件为空')
  }

  const header = parseCsvLine(lines[0])
  validateHeader(header, expectedHeader)

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const fields = parseCsvLine(lines[i])

    if (fields.length !== expectedHeader.length) {
      errors.push(`行 ${lineNumber}: 列数不匹配, 跳过该行`)
      continue
    }

    try {
      const [sampleName, positionStr, refBase, altBase, qualityStr, afStr] = fields

      if (!sampleName.trim()) {
        throw new CsvParserError('样本名称不能为空', lineNumber, 'sample_name')
      }

      const position = parseInt(positionStr, 10)
      if (isNaN(position) || position <= 0) {
        throw new CsvParserError(`position 不是有效正整数: ${positionStr}`, lineNumber, 'position')
      }

      const validBases = ['A', 'T', 'C', 'G', 'N']
      if (!validBases.includes(refBase.toUpperCase())) {
        throw new CsvParserError(`ref_base 不是有效碱基: ${refBase}`, lineNumber, 'ref_base')
      }
      if (!validBases.includes(altBase.toUpperCase()) && altBase !== '-' && !altBase.startsWith('+') && !altBase.startsWith('-')) {
        throw new CsvParserError(`alt_base 不是有效碱基: ${altBase}`, lineNumber, 'alt_base')
      }

      if (refBase.toUpperCase() === altBase.toUpperCase()) {
        warnings.push(`行 ${lineNumber}: ref_base 与 alt_base 相同`)
      }

      const quality = parseFloat(qualityStr)
      if (isNaN(quality) || quality < 0) {
        throw new CsvParserError(`quality 不是有效非负数: ${qualityStr}`, lineNumber, 'quality')
      }

      const alleleFrequency = parseFloat(afStr)
      if (isNaN(alleleFrequency) || alleleFrequency < 0 || alleleFrequency > 1) {
        throw new CsvParserError(`allele_frequency 不是有效 [0,1] 范围值: ${afStr}`, lineNumber, 'allele_frequency')
      }

      records.push({
        sampleName: sampleName.trim(),
        position,
        refBase: refBase.toUpperCase(),
        altBase: altBase.toUpperCase(),
        quality,
        alleleFrequency,
      })
    } catch (e) {
      if (e instanceof CsvParserError) {
        errors.push(e.message)
      } else {
        errors.push(`行 ${lineNumber}: 解析错误 - ${(e as Error).message}`)
      }
    }
  }

  if (records.length === 0 && errors.length > 0) {
    throw new CsvParserError(`未能解析任何有效记录: ${errors.join('; ')}`)
  }

  return {
    records,
    hash: '',
    recordCount: records.length,
    warnings,
    errors,
  }
}

export async function parseMutationsCsv(content: string): Promise<CsvParseResult<MutationRecord>> {
  const result = parseMutationsCsvSync(content)
  const hash = await computeHash(content)
  return { ...result, hash }
}
