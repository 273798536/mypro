export interface VcfInfo {
  [key: string]: string | number | boolean | string[]
}

export interface VcfRecord {
  chrom: string
  pos: number
  id: string | null
  ref: string
  alt: string[]
  qual: number | null
  filter: string[] | null
  info: VcfInfo
  format?: string[]
  samples?: Record<string, string>
}

export interface VcfParseResult {
  records: VcfRecord[]
  hash: string
  recordCount: number
  meta: string[]
  warnings: string[]
  errors: string[]
}

export class VcfParserError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(lineNumber !== undefined ? `${message} (行 ${lineNumber})` : message)
    this.name = 'VcfParserError'
  }
}

const VALID_BASES = /^[ATCGNatcgn]+$/

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseInfoField(infoStr: string): VcfInfo {
  const info: VcfInfo = {}
  if (infoStr === '.' || infoStr === '') return info

  const fields = infoStr.split(';')
  for (const field of fields) {
    const eqIdx = field.indexOf('=')
    if (eqIdx === -1) {
      info[field] = true
    } else {
      const key = field.slice(0, eqIdx)
      const value = field.slice(eqIdx + 1)

      if (value.includes(',')) {
        info[key] = value.split(',')
      } else {
        const num = Number(value)
        info[key] = isNaN(num) ? value : num
      }
    }
  }
  return info
}

function parseSamples(formatStr: string, sampleStrs: string[]): Record<string, string> {
  const formats = formatStr.split(':')
  const samples: Record<string, string> = {}

  for (let i = 0; i < sampleStrs.length; i++) {
    const values = sampleStrs[i].split(':')
    for (let j = 0; j < formats.length; j++) {
      const key = i === 0 ? formats[j] : `sample_${i}_${formats[j]}`
      samples[key] = values[j] || '.'
    }
  }

  return samples
}

export function parseVcfSync(content: string): VcfParseResult {
  const lines = content.split(/\r?\n/)
  const meta: string[] = []
  const records: VcfRecord[] = []
  const warnings: string[] = []
  const errors: string[] = []
  let headerFound = false

  if (lines.length === 0 || lines.every(l => l.trim() === '')) {
    throw new VcfParserError('VCF文件为空')
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNumber = i + 1

    if (line === '') continue

    if (line.startsWith('##')) {
      meta.push(line.slice(2))
      continue
    }

    if (line.startsWith('#CHROM')) {
      headerFound = true
      continue
    }

    if (line.startsWith('#')) {
      continue
    }

    if (!headerFound) {
      warnings.push(`行 ${lineNumber}: 数据行出现在表头之前, 跳过`)
      continue
    }

    const fields = line.split('\t')

    if (fields.length < 8) {
      errors.push(`行 ${lineNumber}: 至少需要8列数据, 实际 ${fields.length} 列, 跳过`)
      continue
    }

    try {
      const [chrom, posStr, idStr, ref, altStr, qualStr, filterStr, infoStr, formatStr, ...sampleStrs] = fields

      if (!chrom) {
        throw new VcfParserError('CHROM 字段不能为空', lineNumber)
      }

      const pos = parseInt(posStr, 10)
      if (isNaN(pos) || pos <= 0) {
        throw new VcfParserError(`POS 不是有效正整数: ${posStr}`, lineNumber)
      }

      const id = idStr === '.' ? null : idStr

      if (!VALID_BASES.test(ref)) {
        throw new VcfParserError(`REF 包含无效碱基: ${ref}`, lineNumber)
      }

      const alt = altStr === '.' ? [] : altStr.split(',').map(a => a.trim())
      for (const allele of alt) {
        if (allele !== '<DEL>' && allele !== '<INS>' && allele !== '<DUP>' && !allele.startsWith('<') && !VALID_BASES.test(allele) && allele !== '*') {
          warnings.push(`行 ${lineNumber}: ALT 等位基因可能包含非标准字符: ${allele}`)
        }
      }

      const qual = qualStr === '.' ? null : parseFloat(qualStr)
      if (qual !== null && (isNaN(qual) || qual < 0)) {
        throw new VcfParserError(`QUAL 不是有效非负数: ${qualStr}`, lineNumber)
      }

      const filter = filterStr === '.' ? null : filterStr.split(';')

      const info = parseInfoField(infoStr)

      const record: VcfRecord = {
        chrom,
        pos,
        id,
        ref: ref.toUpperCase(),
        alt: alt.map(a => a.toUpperCase()),
        qual,
        filter,
        info,
      }

      if (formatStr) {
        record.format = formatStr.split(':')
        if (sampleStrs.length > 0) {
          record.samples = parseSamples(formatStr, sampleStrs)
        }
      }

      records.push(record)
    } catch (e) {
      if (e instanceof VcfParserError) {
        errors.push(e.message)
      } else {
        errors.push(`行 ${lineNumber}: 解析错误 - ${(e as Error).message}`)
      }
    }
  }

  if (!headerFound) {
    throw new VcfParserError('未找到 #CHROM 表头行')
  }

  return {
    records,
    hash: '',
    recordCount: records.length,
    meta,
    warnings,
    errors,
  }
}

export async function parseVcf(content: string): Promise<VcfParseResult> {
  const result = parseVcfSync(content)
  const hash = await computeHash(content)
  return { ...result, hash }
}

export function formatVcfRecord(record: VcfRecord): string {
  const fields: string[] = [
    record.chrom,
    String(record.pos),
    record.id || '.',
    record.ref,
    record.alt.length === 0 ? '.' : record.alt.join(','),
    record.qual === null ? '.' : String(record.qual),
    record.filter === null ? '.' : record.filter.join(';'),
  ]

  const infoEntries = Object.entries(record.info)
  if (infoEntries.length === 0) {
    fields.push('.')
  } else {
    const infoStr = infoEntries
      .map(([key, value]) => {
        if (value === true) return key
        if (Array.isArray(value)) return `${key}=${value.join(',')}`
        return `${key}=${String(value)}`
      })
      .join(';')
    fields.push(infoStr)
  }

  if (record.format) {
    fields.push(record.format.join(':'))
  }

  return fields.join('\t')
}
