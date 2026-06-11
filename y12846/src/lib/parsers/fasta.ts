export interface FastaRecord {
  id: string
  description?: string
  sequence: string
  length: number
  gcContent: number
}

export interface FastaParseResult {
  records: FastaRecord[]
  hash: string
  totalLength: number
  recordCount: number
}

export class FastaParserError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(lineNumber !== undefined ? `${message} (line ${lineNumber})` : message)
    this.name = 'FastaParserError'
  }
}

const VALID_BASES = /^[ATCGURYKMSWBDHVNatcgurykmswbdhvn]+$/

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function calculateGcContent(sequence: string): number {
  if (sequence.length === 0) return 0
  const gcCount = (sequence.match(/[GCgc]/g) || []).length
  return gcCount / sequence.length
}

export function parseFastaSync(content: string): FastaParseResult {
  const lines = content.split(/\r?\n/)
  const records: FastaRecord[] = []
  let currentId: string | null = null
  let currentDescription: string | undefined
  let currentSequence: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNumber = i + 1

    if (line === '') continue

    if (line.startsWith('>')) {
      if (currentId !== null) {
        const sequence = currentSequence.join('')
        records.push({
          id: currentId,
          description: currentDescription,
          sequence,
          length: sequence.length,
          gcContent: calculateGcContent(sequence),
        })
      }

      const headerLine = line.slice(1).trim()
      if (headerLine === '') {
        throw new FastaParserError('空的FASTA头部', lineNumber)
      }

      const firstSpace = headerLine.indexOf(' ')
      if (firstSpace === -1) {
        currentId = headerLine
        currentDescription = undefined
      } else {
        currentId = headerLine.slice(0, firstSpace)
        currentDescription = headerLine.slice(firstSpace + 1).trim() || undefined
      }
      currentSequence = []
    } else {
      if (currentId === null) {
        throw new FastaParserError('序列数据出现在FASTA头部之前', lineNumber)
      }

      if (!VALID_BASES.test(line)) {
        throw new FastaParserError(`无效的碱基字符: ${line}`, lineNumber)
      }

      currentSequence.push(line.toUpperCase())
    }
  }

  if (currentId !== null) {
    const sequence = currentSequence.join('')
    records.push({
      id: currentId,
      description: currentDescription,
      sequence,
      length: sequence.length,
      gcContent: calculateGcContent(sequence),
    })
  }

  if (records.length === 0) {
    throw new FastaParserError('未找到任何有效的FASTA记录')
  }

  return {
    records,
    hash: '',
    totalLength: records.reduce((sum, r) => sum + r.length, 0),
    recordCount: records.length,
  }
}

export async function parseFasta(content: string): Promise<FastaParseResult> {
  const result = parseFastaSync(content)
  const hash = await computeHash(content)
  return { ...result, hash }
}

export function formatFasta(record: FastaRecord, lineWidth: number = 70): string {
  const lines: string[] = []
  let header = `>${record.id}`
  if (record.description) {
    header += ` ${record.description}`
  }
  lines.push(header)

  for (let i = 0; i < record.sequence.length; i += lineWidth) {
    lines.push(record.sequence.slice(i, i + lineWidth))
  }

  return lines.join('\n')
}

export function getComplement(sequence: string): string {
  const complementMap: Record<string, string> = {
    A: 'T', T: 'A', U: 'A',
    C: 'G', G: 'C',
    R: 'Y', Y: 'R',
    K: 'M', M: 'K',
    S: 'S', W: 'W',
    B: 'V', V: 'B',
    D: 'H', H: 'D',
    N: 'N',
  }
  return sequence
    .split('')
    .map(base => complementMap[base.toUpperCase()] || base)
    .join('')
}

export function getReverseComplement(sequence: string): string {
  return getComplement(sequence).split('').reverse().join('')
}
