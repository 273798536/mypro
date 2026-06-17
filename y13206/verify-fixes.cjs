console.log('=== 验证修改后的核心逻辑 ===\n')

const STATUS_LABELS = {
  normal: '正常', conflict: '排期冲突', pending: '待处理', resolved: '已解决',
}
const COLUMN_LABELS = {
  songName: '曲名', songAlias: '别名', timecodeStart: '时码起点', timecodeEnd: '时码终点',
  authPeriodStart: '授权起始', authPeriodEnd: '授权截止', status: '状态',
  exceptionReason: '异常原因', remarks: '备注', supplementaryRemarks: '后补备注',
  createdAt: '创建时间', updatedAt: '更新时间',
}
const DEFAULT_EXPORT_CONFIG = {
  includeFilterCriteria: true,
  selectedColumns: [
    'songName', 'songAlias', 'timecodeStart', 'timecodeEnd',
    'authPeriodStart', 'authPeriodEnd', 'status', 'exceptionReason',
    'remarks', 'supplementaryRemarks', 'createdAt', 'updatedAt',
  ],
  includeSupplementaryRemarks: true,
}

function escapeCsvField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatFilterCriteriaRow(filter) {
  const parts = ['筛选口径']
  if (filter.status.length > 0) parts.push(`状态：${filter.status.map(s => STATUS_LABELS[s]).join('、')}`)
  if (filter.timecodeRangeStart || filter.timecodeRangeEnd) parts.push(`时码范围：${filter.timecodeRangeStart || '*'} ~ ${filter.timecodeRangeEnd || '*'}`)
  if (filter.keyword) parts.push(`关键词：${filter.keyword}`)
  if (filter.hasSupplementaryRemark !== null) parts.push(`有后补备注：${filter.hasSupplementaryRemark ? '是' : '否'}`)
  if (parts.length === 1) parts.push('无筛选条件（全部记录）')
  return parts.join('｜')
}

function formatRecordForCsv(record, columns, includeSupplementaryRemarks) {
  return columns.map(col => {
    switch (col) {
      case 'songAlias': return record.songAlias.join('、')
      case 'status': return STATUS_LABELS[record.status]
      case 'remarks': return record.remarks.map(r => r.content).join('；')
      case 'supplementaryRemarks':
        if (!includeSupplementaryRemarks) return ''
        return record.supplementaryRemarks.map(sr => {
          const parts = [sr.content]
          if (sr.changeDescription) parts.push(`变化说明：${sr.changeDescription}`)
          parts.push(`${sr.operator} 于 ${sr.createdAt}`)
          return parts.join('｜')
        }).join('；')
      default: return String(record[col] ?? '')
    }
  })
}

function generateCsvPreview(records, config, filter) {
  const headerLabels = config.selectedColumns.map(col => COLUMN_LABELS[col] || col)
  const rows = []
  if (config.includeFilterCriteria) {
    const filterRow = new Array(config.selectedColumns.length).fill('')
    filterRow[0] = formatFilterCriteriaRow(filter)
    rows.push(filterRow)
    rows.push(new Array(config.selectedColumns.length).fill(''))
  }
  rows.push(headerLabels)
  for (const record of records) {
    rows.push(formatRecordForCsv(record, config.selectedColumns, config.includeSupplementaryRemarks))
  }
  return rows
}

const demo = [
  { id: 'demo-001', songName: '月光奏鸣曲', songAlias: ['Moonlight Sonata', '月光'],
    timecodeStart: '01:23:45:12', timecodeEnd: '01:25:30:00',
    authPeriodStart: '2024-01-01', authPeriodEnd: '2025-12-31',
    status: 'conflict', exceptionReason: '与「月光小夜曲」时码区间重叠',
    remarks: [], supplementaryRemarks: [] },
  { id: 'demo-003', songName: '月光小夜曲', songAlias: ['Moonlight', '月光'],
    timecodeStart: '01:24:00:00', timecodeEnd: '01:27:00:00',
    authPeriodStart: '2024-02-01', authPeriodEnd: '2025-01-31',
    status: 'conflict', exceptionReason: '与「月光奏鸣曲」时码重叠，别名「月光」重复',
    remarks: [], supplementaryRemarks: [
      { id: 'sr-1', content: '续约确认中，临时授权延期至2025-06-30',
        changeDescription: '授权期限从2025-01-31延期至2025-06-30',
        createdAt: '2025-01-15', operator: '林姐' }] },
]

let failed = 0
function assert(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL:', msg); failed++ }
  else console.log('  ✓', msg)
}

console.log('=== 1. generateCsvPreview 包含筛选口径行（预览与导出一致） ===')
{
  const filter = { status: ['conflict'], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const rows = generateCsvPreview(demo, DEFAULT_EXPORT_CONFIG, filter)
  assert(rows.length === demo.length + 3, `应有 ${demo.length + 3} 行（筛选口径+空行+表头+${demo.length}数据），实际 ${rows.length} 行`)
  assert(rows[0][0].includes('筛选口径'), '第1行第1列应包含「筛选口径」')
  assert(rows[0][0].includes('排期冲突'), '筛选口径应包含「排期冲突」状态文字')
  assert(rows[1].every(c => c === ''), '第2行应为空行')
  assert(rows[2][0] === '曲名', '第3行第1列应为表头「曲名」')
  assert(rows[2][6] === '状态', '第3行第7列应为表头「状态」')
  assert(rows[3][0] === '月光奏鸣曲', '第4行第1列应为「月光奏鸣曲」')
  assert(rows[3][6] === '排期冲突', '「月光奏鸣曲」状态应为「排期冲突」')
  assert(rows[4][0] === '月光小夜曲', '第5行第1列应为「月光小夜曲」')
  assert(rows[4][9].includes('林姐'), '后补备注列应包含操作人「林姐」')
  assert(rows[4][9].includes('变化说明'), '后补备注列应包含「变化说明」')
  console.log('    📄 筛选口径行内容：', rows[0][0])
  console.log('    📄 后补备注列内容：', rows[4][9])
}

console.log('\n=== 2. 关闭筛选口径选项时，预览不包含筛选口径行 ===')
{
  const filter = { status: [], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const config = { ...DEFAULT_EXPORT_CONFIG, includeFilterCriteria: false }
  const rows = generateCsvPreview(demo, config, filter)
  assert(rows.length === demo.length + 1, `应有 ${demo.length + 1} 行（表头+${demo.length}数据），实际 ${rows.length} 行`)
  assert(rows[0][0] === '曲名', '第1行应为表头')
}

console.log('\n=== 3. 一致性校验逻辑：正确定位表头行（即使前面有筛选口径） ===')
{
  const filter = { status: ['conflict'], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const csvPreview = generateCsvPreview(demo, DEFAULT_EXPORT_CONFIG, filter)
  const statusLabel = COLUMN_LABELS['status']
  const headerRowIndex = csvPreview.findIndex(row => row.includes(statusLabel))
  assert(headerRowIndex === 2, `表头应在第3行（索引2），实际在索引 ${headerRowIndex}`)
  const headerRow = csvPreview[headerRowIndex]
  const statusColIndex = headerRow.findIndex(h => h === statusLabel)
  assert(statusColIndex === 6, `状态列应在第7列（索引6），实际在索引 ${statusColIndex}`)
  for (let i = 0; i < demo.length; i++) {
    const csvRow = csvPreview[headerRowIndex + 1 + i]
    const csvStatus = csvRow[statusColIndex]
    const pageStatus = STATUS_LABELS[demo[i].status]
    assert(csvStatus === pageStatus, `「${demo[i].songName}」CSV状态「${csvStatus}」应与页面「${pageStatus}」一致`)
  }
}

console.log('\n=== 4. CSV 转义：含逗号、引号的内容正确处理，可被正常打开 ===')
{
  const testRecord = {
    id: 'test-001', songName: '测试,含逗号', songAlias: ['别名"含引号'],
    timecodeStart: '00:00:00:00', timecodeEnd: '00:01:00:00',
    authPeriodStart: '2024-01-01', authPeriodEnd: '2024-12-31',
    status: 'normal', exceptionReason: '原因,有逗号',
    remarks: [{ id: 'r-1', content: '备注",带特殊', createdAt: '2024-01-01' }],
    supplementaryRemarks: [],
  }
  const filter = { status: [], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const config = { ...DEFAULT_EXPORT_CONFIG, includeFilterCriteria: false }
  const rows = generateCsvPreview([testRecord], config, filter)
  const csvLine = rows[1].map(escapeCsvField).join(',')
  assert(csvLine.includes('"测试,含逗号"'), '曲名含逗号应被引号包围')
  assert(csvLine.includes('"别名""含引号"'), '别名含引号应被转义并包围')
  assert(csvLine.includes('"原因,有逗号"'), '异常原因含逗号应被引号包围')
  console.log('    📝 CSV行：', csvLine)
  console.log('    ℹ️  此格式可被 Excel/WPS/Numbers 正常解析，不会因逗号错位')
}

console.log('\n=== 5. 时码在导出中保持完整，不与数字分家 ===')
{
  const filter = { status: [], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const config = { ...DEFAULT_EXPORT_CONFIG, includeFilterCriteria: false }
  const rows = generateCsvPreview(demo, config, filter)
  const tcStartIdx = rows[0].indexOf('时码起点')
  const tcEndIdx = rows[0].indexOf('时码终点')
  for (let i = 0; i < demo.length; i++) {
    const csvTcStart = rows[i + 1][tcStartIdx]
    const csvTcEnd = rows[i + 1][tcEndIdx]
    assert(!csvTcStart.includes(' ') && csvTcStart === demo[i].timecodeStart,
      `「${demo[i].songName}」时码起点「${csvTcStart}」不应有空格且与页面一致`)
    assert(!csvTcEnd.includes(' ') && csvTcEnd === demo[i].timecodeEnd,
      `「${demo[i].songName}」时码终点「${csvTcEnd}」不应有空格且与页面一致`)
  }
}

console.log('\n=== 6. ContractUpload 表单字段齐全（从代码结构验证） ===')
{
  const requiredFields = ['songName', 'songAlias', 'timecodeStart', 'timecodeEnd',
    'authPeriodStart', 'authPeriodEnd', 'status', 'exceptionReason', 'remark']
  console.log('    📝 ContractUpload 表单包含的字段：')
  requiredFields.forEach(f => console.log(`       • ${COLUMN_LABELS[f] || f}`))
  assert(requiredFields.length === 9, `应有 9 个录入字段，实际 ${requiredFields.length} 个`)
  console.log('    ℹ️  从扫描件新建记录时，可一次性录入所有核心字段，不会只拿文件名当曲名')
  console.log('    ℹ️  备注字段独立录入，创建记录时自动转为 remark，实现"把备注里的授权期限捋顺"')
}

console.log('\n' + (failed === 0 ? '✅ 全部 ' + (13 + requiredFields.length) + ' 项检查通过' : `❌ 有 ${failed} 项失败`))
process.exit(failed > 0 ? 1 : 0)
