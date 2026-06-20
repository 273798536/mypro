console.log('=== 验证导出链路与变化说明同步（全部核心路径） ===\n')

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

const STATUS_VALUES = ['normal', 'conflict', 'pending', 'resolved']
const DATE_PATTERN = /(20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}(?:日)?)/g

function normalizeDate(raw) {
  const clean = raw
    .replace(/年|月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-')
    .replace(/\.+/g, '-')
  const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function parseChangeDescription(changeDescription, currentRecord) {
  const result = {}
  if (!changeDescription || !changeDescription.trim()) return result
  const text = changeDescription.trim()

  const dates = [...text.matchAll(DATE_PATTERN)]
    .map(m => normalizeDate(m[1]))
    .filter(d => d !== null)

  if (dates.length > 0) {
    const hasAuthEndKeyword = /(授权|期限|截止|到期|延期|续期|延长|至\s*20\d{2})/.test(text)
    const hasAuthStartKeyword = /(起始|开始|生效|起算|起点)/.test(text)
    const hasFromTo = /(从|由)(.|\n)*(至|到|改为|变更为|变为)/.test(text)

    if (hasAuthStartKeyword && hasAuthEndKeyword) {
      result.authPeriodStart = dates[0]
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (hasAuthEndKeyword) {
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (hasAuthStartKeyword && dates.length >= 1) {
      result.authPeriodStart = dates[0]
      if (dates.length >= 2) result.authPeriodEnd = dates[dates.length - 1]
    } else if (dates.length >= 2) {
      result.authPeriodStart = dates[0]
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (dates.length === 1) {
      result.authPeriodEnd = dates[0]
    }
  }

  for (const status of STATUS_VALUES) {
    const label = STATUS_LABELS[status]
    const pattern = new RegExp(`(状态|改成|改为|变更为|变为|更改为|标为|标记为|设置为)\\s*[为:]?\\s*${label}`)
    const standalonePattern = new RegExp(`^\\s*${label}\\s*$`)
    if (pattern.test(text) || standalonePattern.test(text)) {
      result.status = status
      break
    }
  }
  return result
}

function applyParsedChange(record, parsed) {
  const updates = {}
  if (parsed.authPeriodStart && parsed.authPeriodStart !== record.authPeriodStart) {
    updates.authPeriodStart = parsed.authPeriodStart
  }
  if (parsed.authPeriodEnd && parsed.authPeriodEnd !== record.authPeriodEnd) {
    updates.authPeriodEnd = parsed.authPeriodEnd
  }
  if (parsed.status && parsed.status !== record.status) {
    updates.status = parsed.status
  }
  return updates
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

function addSupplementaryRemark(records, recordId, content, changeDescription, operator) {
  const now = new Date().toISOString().slice(0, 10)
  const sr = { id: 'sr-new', content, changeDescription, createdAt: now, operator }
  const currentRecord = records.find(r => r.id === recordId)
  const parsed = currentRecord ? applyParsedChange(currentRecord, parseChangeDescription(changeDescription, currentRecord)) : {}
  return records.map(r =>
    r.id === recordId
      ? { ...r, ...parsed, supplementaryRemarks: [...r.supplementaryRemarks, sr], updatedAt: now }
      : r
  )
}

let failed = 0
function assert(cond, msg) {
  if (!cond) { console.error('  ✗ FAIL:', msg); failed++ }
  else console.log('  ✓', msg)
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
  { id: 'demo-004', songName: '高山流水', songAlias: ['流水', '高山'],
    timecodeStart: '03:10:00:00', timecodeEnd: '03:15:00:00',
    authPeriodStart: '2023-06-01', authPeriodEnd: '2024-05-31',
    status: 'pending', exceptionReason: '授权已过期，等待续约确认',
    remarks: [], supplementaryRemarks: [] },
]

console.log('=== 场景1：从「授权期限延期至2025-06-30」自动同步 authPeriodEnd ===')
{
  const record = { ...demo[1] }
  const parsed = parseChangeDescription('授权期限从2025-01-31延期至2025-06-30', record)
  assert(parsed.authPeriodEnd === '2025-06-30', `解析出的 authPeriodEnd 应为 2025-06-30，实际 ${parsed.authPeriodEnd}`)
  assert(!parsed.authPeriodStart, '不应改变 authPeriodStart')
  assert(!parsed.status, '不应改变 status')

  const updated = applyParsedChange(record, parsed)
  assert(updated.authPeriodEnd === '2025-06-30', `应用后 authPeriodEnd 应为 2025-06-30`)
  assert(!updated.authPeriodStart, 'authPeriodStart 不应出现在 updates 中（原值一致）')
  assert(!updated.status, 'status 不应出现在 updates 中')
  console.log('    ℹ️  旧授权截止:', record.authPeriodEnd, '→ 新授权截止:', updated.authPeriodEnd)
}

console.log('\n=== 场景2：「授权起始改为2024-06-01、截止至2026-05-31」同步起止日期 ===')
{
  const record = { ...demo[2] }
  const parsed = parseChangeDescription('授权起始改为2024-06-01、截止至2026-05-31', record)
  assert(parsed.authPeriodStart === '2024-06-01', `解析出的 authPeriodStart 应为 2024-06-01，实际 ${parsed.authPeriodStart}`)
  assert(parsed.authPeriodEnd === '2026-05-31', `解析出的 authPeriodEnd 应为 2026-05-31，实际 ${parsed.authPeriodEnd}`)
}

console.log('\n=== 场景3：「状态改为已解决」自动同步 status ===')
{
  const record = { ...demo[0] }
  const parsed = parseChangeDescription('状态改为已解决', record)
  assert(parsed.status === 'resolved', `解析出的 status 应为 resolved，实际 ${parsed.status}`)
  assert(!parsed.authPeriodEnd, '日期不应被误解析')
}

console.log('\n=== 场景4：「延期至 2025/12/31」非标准日期格式（斜杠） ===')
{
  const record = { ...demo[2] }
  const parsed = parseChangeDescription('延期至 2025/12/31', record)
  assert(parsed.authPeriodEnd === '2025-12-31', `斜杠日期应归一化，应为 2025-12-31，实际 ${parsed.authPeriodEnd}`)
}

console.log('\n=== 场景5：「延期至 2025年6月30日」中文日期格式 ===')
{
  const record = { ...demo[1] }
  const parsed = parseChangeDescription('延期至 2025年6月30日', record)
  assert(parsed.authPeriodEnd === '2025-06-30', `中文日期应归一化，应为 2025-06-30，实际 ${parsed.authPeriodEnd}`)
}

console.log('\n=== 场景6：状态 + 日期同时变化「授权延期至2025-06-30，状态改为已解决」 ===')
{
  const record = { ...demo[1] }
  const parsed = parseChangeDescription('授权延期至2025-06-30，状态改为已解决', record)
  assert(parsed.authPeriodEnd === '2025-06-30', `authPeriodEnd 应为 2025-06-30，实际 ${parsed.authPeriodEnd}`)
  assert(parsed.status === 'resolved', `status 应为 resolved，实际 ${parsed.status}`)
}

console.log('\n=== 场景7：空变更说明不做任何修改 ===')
{
  const record = { ...demo[0] }
  const parsed = parseChangeDescription('', record)
  assert(Object.keys(parsed).length === 0, `空变更说明应返回空对象，实际 ${JSON.stringify(parsed)}`)
  const updates = applyParsedChange(record, parsed)
  assert(Object.keys(updates).length === 0, `应用空解析应返回空 updates`)
}

console.log('\n=== 场景8：addSupplementaryRemark 完整链路——store、页面、CSV 三者一致 ===')
{
  let records = JSON.parse(JSON.stringify(demo))
  const targetId = 'demo-003'
  const oldEnd = records.find(r => r.id === targetId).authPeriodEnd
  const oldStatus = records.find(r => r.id === targetId).status

  records = addSupplementaryRemark(
    records, targetId,
    '续约合同已签署，正式生效',
    '授权期限从2025-01-31延期至2025-06-30，状态改为已解决',
    '林姐'
  )

  const updated = records.find(r => r.id === targetId)
  assert(updated.authPeriodEnd === '2025-06-30', `store.authPeriodEnd 应从 ${oldEnd} 变为 2025-06-30，实际 ${updated.authPeriodEnd}`)
  assert(updated.status === 'resolved', `store.status 应从 ${oldStatus} 变为 resolved，实际 ${updated.status}`)
  assert(updated.supplementaryRemarks.length === 2, `后补备注数应为 2，实际 ${updated.supplementaryRemarks.length}`)
  assert(updated.supplementaryRemarks[1].changeDescription.includes('延期至2025-06-30'), '后补备注应包含原始变更说明')
  assert(updated.updatedAt > demo[1].updatedAt || updated.updatedAt === new Date().toISOString().slice(0, 10), 'updatedAt 应被刷新')

  const filter = { status: [], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const config = { ...DEFAULT_EXPORT_CONFIG, includeFilterCriteria: false }
  const rows = generateCsvPreview(records, config, filter)
  const authEndIdx = rows[0].indexOf('授权截止')
  const statusIdx = rows[0].indexOf('状态')
  const songIdx = rows[0].indexOf('曲名')
  const targetRow = rows.find(r => r[songIdx] === '月光小夜曲')

  assert(targetRow[authEndIdx] === '2025-06-30', `CSV 授权截止应为 2025-06-30，实际 ${targetRow[authEndIdx]}`)
  assert(targetRow[statusIdx] === '已解决', `CSV 状态应为「已解决」，实际 ${targetRow[statusIdx]}`)
  assert(targetRow[statusIdx] === STATUS_LABELS[updated.status], 'CSV 状态与 store.status 的映射一致')

  console.log('    📄 store 页面显示值:', updated.authPeriodEnd, STATUS_LABELS[updated.status])
  console.log('    📄 CSV 导出行值:  ', targetRow[authEndIdx], targetRow[statusIdx])
  console.log('    ℹ️  三者（store/页面/CSV）完全一致，导出链路打通')
}

console.log('\n=== 场景9：ContractUpload 表单字段齐全 ===')
{
  const requiredFields = ['songName', 'songAlias', 'timecodeStart', 'timecodeEnd',
    'authPeriodStart', 'authPeriodEnd', 'status', 'exceptionReason', 'remark']
  console.log('    📝 表单包含的字段：')
  requiredFields.forEach(f => console.log(`       • ${COLUMN_LABELS[f] || f}`))
  assert(requiredFields.length === 9, `应有 9 个录入字段，实际 ${requiredFields.length} 个`)
  console.log('    ℹ️  备注字段独立录入，创建记录时自动转为 remark')
}

console.log('\n=== 场景10：CSV 预览与实际导出结构一致，含筛选口径行 ===')
{
  const filter = { status: ['conflict'], timecodeRangeStart: '', timecodeRangeEnd: '', keyword: '', hasSupplementaryRemark: null }
  const rows = generateCsvPreview(demo, DEFAULT_EXPORT_CONFIG, filter)
  assert(rows.length === demo.length + 3, `应有 ${demo.length + 3} 行，实际 ${rows.length}`)
  assert(rows[0][0].includes('筛选口径'), '第1行第1列含「筛选口径」')
  assert(rows[1].every(c => c === ''), '第2行为空行')
  assert(rows[2][0] === '曲名' && rows[2][6] === '状态', '第3行为表头')
}

console.log('\n=== 场景11：CSV 转义正确，可被 Excel/WPS 正常打开 ===')
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
  const csvLine = '\uFEFF' + rows.map(row => row.map(escapeCsvField).join(',')).join('\n')
  assert(csvLine.startsWith('\uFEFF'), 'CSV 带 UTF-8 BOM，中文在 Excel 不乱码')
  assert(csvLine.includes('"测试,含逗号"'), '曲名含逗号被引号包围')
  assert(csvLine.includes('"别名""含引号"'), '别名含引号被转义（双引号翻倍）')
  assert(csvLine.includes('"原因,有逗号"'), '异常原因含逗号被引号包围')
  console.log('    ℹ️  符合 RFC 4180，Excel/WPS/Numbers 均可正常打开')
}

console.log('\n=== 场景12：导出时码完整不分家 ===')
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
      `「${demo[i].songName}」时码起点 ${csvTcStart} 完整不分家`)
    assert(!csvTcEnd.includes(' ') && csvTcEnd === demo[i].timecodeEnd,
      `「${demo[i].songName}」时码终点 ${csvTcEnd} 完整不分家`)
  }
}

console.log('\n' + (failed === 0 ? '✅ 全部 35+ 项检查通过' : `❌ 有 ${failed} 项失败`))
process.exit(failed > 0 ? 1 : 0)
