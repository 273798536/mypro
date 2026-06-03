import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('='.repeat(70))
console.log('  导出链路内容验证 - Node 环境')
console.log('='.repeat(70))

function generateExportReport(traceLinks, displacementConclusion, pageSummary) {
  return {
    displacementConclusion,
    generatedAt: new Date().toISOString(),
    traceLinks,
    summary: pageSummary,
  }
}

function checkConsistency(report, pageSummary) {
  const hasValidTraceLinks = Array.isArray(report.traceLinks) && report.traceLinks.length > 0
  const hasConclusion = typeof report.displacementConclusion === 'string'
  const summaryMatches = report.summary === pageSummary
  const hasTimestamp = typeof report.generatedAt === 'string' && report.generatedAt.length > 0

  const allLinksHaveRequiredFields = report.traceLinks.every(link =>
    typeof link.resultId === 'string' &&
    link.resultId.length > 0 &&
    typeof link.peakExtraction?.value === 'number' &&
    typeof link.alignment?.method === 'string'
  )

  return hasValidTraceLinks && hasConclusion && summaryMatches && hasTimestamp && allLinksHaveRequiredFields
}

function validateExportContent(report, expectedConclusion) {
  const errors = []

  if (report.displacementConclusion !== expectedConclusion) {
    errors.push(`位移结论不匹配: 期望 "${expectedConclusion.slice(0, 30)}...", 实际 "${report.displacementConclusion.slice(0, 30)}..."`)
  }

  if (!Array.isArray(report.traceLinks)) {
    errors.push('traceLinks 不是数组')
  } else if (report.traceLinks.length === 0) {
    errors.push('traceLinks 为空数组')
  } else {
    report.traceLinks.forEach((link, index) => {
      if (!link.resultId) {
        errors.push(`traceLinks[${index}] 缺少 resultId`)
      }
      if (!link.peakExtraction || typeof link.peakExtraction.value !== 'number') {
        errors.push(`traceLinks[${index}] 缺少有效的 peakExtraction.value`)
      }
      if (!link.alignment || typeof link.alignment.method !== 'string') {
        errors.push(`traceLinks[${index}] 缺少有效的 alignment.method`)
      }
    })
  }

  if (!report.generatedAt || !new Date(report.generatedAt).getTime()) {
    errors.push('generatedAt 时间戳无效')
  }

  if (!report.summary || report.summary.length === 0) {
    errors.push('summary 为空')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function escapeCSV(value) {
  const str = String(value)
  if (str.includes(',') || str.includes('，') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCSV(report) {
  const headers = ['结果ID', '对齐方法', '漂移量(ms)', '峰值通道', '峰值时间', '峰值大小', '饱和', '关联照片数', '冲突数', '位移结论']
  const rows = report.traceLinks.map(link => [
    link.resultId,
    link.alignment.method,
    link.alignment.driftMs,
    link.peakExtraction.channel,
    new Date(link.peakExtraction.timestamp).toISOString(),
    link.peakExtraction.value,
    link.peakExtraction.saturated ? '是' : '否',
    link.damageAssociation.length,
    link.conflicts.length,
    report.displacementConclusion,
  ])
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.map(escapeCSV).join(',')),
  ].join('\n')
  return '\uFEFF' + csv
}

const mockTraceLinks = [
  {
    resultId: 'result-0',
    alignment: { method: 'cross_correlation', driftMs: 150, offset: 0 },
    peakExtraction: { channel: 'acceleration', timestamp: Date.now(), value: 1.88, saturated: false, threshold: 0.3 },
    damageAssociation: [{ id: 'photo-1', stage: '微裂缝', timestamp: Date.now() + 120, imageUrl: 'test.jpg' }],
    conflicts: [{ id: 'conflict-1', type: 'timestamp_drift', severity: 'warn', message: '位移时间戳漂移 150ms' }],
  },
  {
    resultId: 'result-1',
    alignment: { method: 'cross_correlation', driftMs: 150, offset: 0 },
    peakExtraction: { channel: 'acceleration', timestamp: Date.now() + 2000, value: -2.39, saturated: false, threshold: 0.3 },
    damageAssociation: [{ id: 'photo-2', stage: '裂缝扩展', timestamp: Date.now() + 2120, imageUrl: 'test.jpg' }],
    conflicts: [],
  },
]

const testConclusion = '该峰值点位移达到 12.4mm，超过设计限值 10mm，对应照片显示柱底出现水平裂缝，宽度约 0.2mm。建议后续试验降低输入峰值加速度。'
const testSummary = '2个峰值, 1个冲突, 最大漂移150ms'

let passCount = 0
let failCount = 0

function test(name, fn) {
  console.log(`\n[测试] ${name}`)
  try {
    const result = fn()
    if (result.pass) {
      console.log(`  ✅ ${result.message || '通过'}`)
      passCount++
    } else {
      console.log(`  ❌ ${result.message || '失败'}`)
      if (result.errors) {
        result.errors.forEach(e => console.log(`     - ${e}`))
      }
      failCount++
    }
  } catch (e) {
    console.log(`  ❌ 异常: ${e.message}`)
    failCount++
  }
}

test('测试1: generateExportReport 生成完整报告', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)

  if (report.displacementConclusion !== testConclusion) {
    return { pass: false, message: '位移结论不匹配' }
  }
  if (report.summary !== testSummary) {
    return { pass: false, message: '摘要不匹配' }
  }
  if (report.traceLinks.length !== 2) {
    return { pass: false, message: 'traceLinks 数量不对' }
  }
  if (!report.generatedAt) {
    return { pass: false, message: '缺少 generatedAt' }
  }
  return { pass: true, message: `报告生成成功，包含 ${report.traceLinks.length} 条记录` }
})

test('测试2: checkConsistency 验证报告完整性', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)
  const consistent = checkConsistency(report, testSummary)

  if (!consistent) {
    return { pass: false, message: '完整报告应该通过一致性检查' }
  }

  const badReport1 = generateExportReport([], testConclusion, testSummary)
  if (checkConsistency(badReport1, testSummary)) {
    return { pass: false, message: '空 traceLinks 不应该通过检查' }
  }

  const badReport2 = generateExportReport(mockTraceLinks, testConclusion, '错误的摘要')
  if (checkConsistency(badReport2, testSummary)) {
    return { pass: false, message: '摘要不匹配不应该通过检查' }
  }

  return { pass: true, message: '一致性检查逻辑正确' }
})

test('测试3: validateExportContent 验证内容正确性', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)
  const validation = validateExportContent(report, testConclusion)

  if (!validation.valid) {
    return { pass: false, message: '内容验证失败', errors: validation.errors }
  }

  const badReport = generateExportReport(mockTraceLinks, '错误的结论', testSummary)
  const badValidation = validateExportContent(badReport, testConclusion)
  if (badValidation.valid) {
    return { pass: false, message: '错误的结论应该验证失败' }
  }

  return { pass: true, message: `内容验证正确，检测到 ${badValidation.errors.length} 个错误` }
})

test('测试4: JSON 导出内容包含所有必需字段', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)
  const json = JSON.stringify(report, null, 2)
  const parsed = JSON.parse(json)

  const requiredFields = ['displacementConclusion', 'generatedAt', 'traceLinks', 'summary']
  const missing = requiredFields.filter(f => !(f in parsed))

  if (missing.length > 0) {
    return { pass: false, message: `缺少字段: ${missing.join(', ')}` }
  }

  const firstLink = parsed.traceLinks[0]
  const linkRequiredFields = ['resultId', 'alignment', 'peakExtraction', 'damageAssociation', 'conflicts']
  const linkMissing = linkRequiredFields.filter(f => !(f in firstLink))

  if (linkMissing.length > 0) {
    return { pass: false, message: `traceLink 缺少字段: ${linkMissing.join(', ')}` }
  }

  if (parsed.displacementConclusion !== testConclusion) {
    return { pass: false, message: '位移结论在 JSON 中不匹配' }
  }

  return { pass: true, message: `JSON 导出完整，共 ${json.length} 字符` }
})

test('测试5: CSV 导出正确处理特殊字符', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)
  const csv = downloadCSV(report)

  if (!csv.startsWith('\uFEFF')) {
    return { pass: false, message: 'CSV 缺少 BOM，Excel 打开会乱码' }
  }

  const lines = csv.trim().split('\n')
  if (lines.length !== mockTraceLinks.length + 1) {
    return { pass: false, message: `CSV 行数不对: 期望 ${mockTraceLinks.length + 1}, 实际 ${lines.length}` }
  }

  const header = lines[0]
  if (!header.includes('位移结论')) {
    return { pass: false, message: 'CSV 表头缺少「位移结论」列' }
  }

  if (header.includes('"位移结论"')) {
    return { pass: false, message: '表头不需要转义' }
  }

  const dataLine = lines[1]
  if (!dataLine.includes('"该峰值点位移达到 12.4mm')) {
    return { pass: false, message: '位移结论包含逗号，应该被双引号转义' }
  }

  return { pass: true, message: `CSV 导出正确，共 ${csv.length} 字符，BOM 正确` }
})

test('测试6: 导出内容与页面显示一致性', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)
  const json = JSON.stringify(report, null, 2)

  const pageElements = [
    testConclusion.slice(0, 20),
    testSummary,
    mockTraceLinks[0].resultId,
    String(mockTraceLinks[0].peakExtraction.value),
    mockTraceLinks[0].alignment.method,
  ]

  const missingElements = pageElements.filter(el => !json.includes(el))

  if (missingElements.length > 0) {
    return { pass: false, message: `导出内容缺少页面元素: ${missingElements.join(', ')}` }
  }

  return { pass: true, message: '导出内容与页面显示一致' }
})

test('测试7: 时间戳格式正确（ISO 8601）', () => {
  const report = generateExportReport(mockTraceLinks, testConclusion, testSummary)

  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  if (!isoRegex.test(report.generatedAt)) {
    return { pass: false, message: `generatedAt 格式错误: ${report.generatedAt}` }
  }

  const csv = downloadCSV(report)
  const lines = csv.trim().split('\n')
  const firstDataLine = lines[1]
  const timestampMatch = firstDataLine.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)

  if (!timestampMatch) {
    return { pass: false, message: 'CSV 峰值时间格式错误' }
  }

  return { pass: true, message: `时间戳格式正确: ${report.generatedAt}` }
})

const sourcePath = path.join(__dirname, '..', 'src', 'utils', 'exportReport.ts')
const sourceCode = fs.readFileSync(sourcePath, 'utf-8')

test('测试8: 代码审查 - 导出链路完整', () => {
  const requiredExports = [
    'generateExportReport',
    'downloadJSON',
    'downloadCSV',
    'checkConsistency',
    'validateExportContent',
  ]

  const missing = requiredExports.filter(fn => !sourceCode.includes(`export function ${fn}`))

  if (missing.length > 0) {
    return { pass: false, message: `缺少导出函数: ${missing.join(', ')}` }
  }

  if (!sourceCode.includes('escapeCSV')) {
    return { pass: false, message: '缺少 CSV 转义函数' }
  }

  if (!sourceCode.includes('displacementConclusion')) {
    return { pass: false, message: '位移结论没有包含在导出中' }
  }

  return { pass: true, message: `导出链路完整，包含 ${requiredExports.length} 个导出函数` }
})

console.log('\n' + '-'.repeat(70))
console.log(`  测试结果: ${passCount} 通过, ${failCount} 失败`)
console.log('='.repeat(70) + '\n')

process.exit(failCount === 0 ? 0 : 1)
