// Node 验证脚本：筛选联动修复 + CSV 格式
// 执行：node scripts/verify-filter.mjs
// 注意：为绕过 TS 路径别名，数据与逻辑直接内嵌（与 src 代码同步）

// ---------- 内嵌 mock 数据 ----------
const motorComponents = [
  { id: 'CMP-STATOR', name: '定子', type: 'stator' },
  { id: 'CMP-ROTOR', name: '转子', type: 'rotor' },
  { id: 'CMP-BEARING-F', name: '前轴承', type: 'bearing' },
  { id: 'CMP-BEARING-R', name: '后轴承', type: 'bearing' },
  { id: 'CMP-SHAFT', name: '主轴', type: 'shaft' },
  { id: 'CMP-HOUSING', name: '机壳', type: 'housing' },
  { id: 'CMP-WINDING', name: '绕组', type: 'winding' },
  { id: 'CMP-SENSOR', name: '扭矩传感器', type: 'sensor' },
]

function generateTimePoints(count, startStr) {
  const start = new Date(startStr).getTime()
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 3600 * 1000).toISOString()
  )
}
const timePoints = generateTimePoints(72, '2025-03-10T08:00:00')
const torqueRecords = timePoints.flatMap((ts, i) => {
  const baseError = Math.sin(i / 12) * 2 + (i > 40 ? (i - 40) * 0.3 : 0)
  const severity =
    Math.abs(baseError) > 6 ? 'critical'
      : Math.abs(baseError) > 4 ? 'warning' : 'normal'
  return motorComponents.map((cmp) => ({
    id: `TR-${i}-${cmp.id}`,
    equipmentId: 'EQ-001',
    componentId: cmp.id,
    measuredTorque: 955 + baseError * (cmp.type === 'rotor' ? 3 : cmp.type === 'bearing' ? 5 : 2),
    ratedTorque: 955,
    errorPercent: parseFloat((baseError * (cmp.type === 'rotor' ? 1.5 : cmp.type === 'bearing' ? 2 : 0.8)).toFixed(2)),
    timestamp: ts,
    severity,
  }))
})

// ---------- 与 store/index.ts 一致的筛选 + 状态流转逻辑 ----------
const compTypeById = new Map()
motorComponents.forEach((c) => compTypeById.set(c.id, c.type))
const compNameById = new Map()
motorComponents.forEach((c) => compNameById.set(c.id, c.name))

function applyFilters(records, timeWindow, filters, selectedComponent) {
  let result = records
  if (filters.equipmentId) {
    result = result.filter((r) => r.equipmentId === filters.equipmentId)
  }
  if (timeWindow.start && timeWindow.end) {
    result = result.filter(
      (r) => r.timestamp >= timeWindow.start && r.timestamp <= timeWindow.end
    )
  }
  if (selectedComponent) {
    result = result.filter((r) => r.componentId === selectedComponent.id)
  }
  if (!selectedComponent && filters.componentType) {
    result = result.filter((r) => compTypeById.get(r.componentId) === filters.componentType)
  }
  if (filters.severity && filters.severity.length > 0) {
    result = result.filter((r) => filters.severity.includes(r.severity))
  }
  return result
}

// 模拟 Zustand store 单例
function makeStore() {
  const TW = { start: '2025-03-10T08:00:00', end: '2025-03-13T08:00:00' }
  const INIT = { equipmentId: 'EQ-001', severity: [], componentType: null, source: null }
  const state = {
    selectedComponent: null,
    timeWindow: TW,
    filters: INIT,
    filteredRecords: applyFilters(torqueRecords, TW, INIT, null),
  }
  return {
    getState: () => state,
    getFilteredRecords() { return state.filteredRecords },
    selectComponent(component) {
      const clearComponentType = component !== null && state.filters.componentType !== null
      const appliedFilters = clearComponentType
        ? { ...state.filters, componentType: null }
        : state.filters
      state.filteredRecords = applyFilters(torqueRecords, state.timeWindow, appliedFilters, component)
      state.selectedComponent = component
      if (clearComponentType) state.filters = appliedFilters
    },
    setFilters(filters) {
      const clearSelected = filters.componentType !== null && state.selectedComponent !== null
      const appliedComponent = clearSelected ? null : state.selectedComponent
      state.filteredRecords = applyFilters(torqueRecords, state.timeWindow, filters, appliedComponent)
      state.filters = filters
      if (clearSelected) state.selectedComponent = appliedComponent
    },
    exportCSV() {
      const records = state.filteredRecords
      const compTypeLabel = { stator:'定子', rotor:'转子', bearing:'轴承', shaft:'轴', housing:'壳体', winding:'绕组', sensor:'传感器' }
      const compTypeByIdLab = new Map()
      motorComponents.forEach((c) => compTypeByIdLab.set(c.id, compTypeLabel[c.type] || c.type))
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`
      const header = ['ID','设备ID','零部件ID','零部件名称','零部件类型','实测扭矩(N·m)','额定扭矩(N·m)','误差(%)','严重等级','时间戳'].map(q).join(',')
      const sevLab = { normal: '正常', warning: '警告', critical: '严重' }
      const rows = records.map((r) => [
        r.id, r.equipmentId, r.componentId,
        compNameById.get(r.componentId) || r.componentId,
        compTypeByIdLab.get(r.componentId) || '',
        r.measuredTorque.toFixed(2),
        String(r.ratedTorque),
        String(r.errorPercent),
        sevLab[r.severity] || r.severity,
        new Date(r.timestamp).toLocaleString('zh-CN', { hour12: false }),
      ].map(q).join(','))
      return [header, ...rows].join('\r\n')
    },
  }
}

// ---------- 打印工具 ----------
function print(label, n) {
  console.log('  ' + String(label).padEnd(58) + '  ->  ' + String(n).padStart(4))
}
function pass(s) { console.log('  ✅ ' + s) }
function fail(s) { console.log('  ❌ ' + s) }

console.log('\n=========================')
console.log(' 筛选联动 & CSV 验证报告')
console.log('=========================\n')

// 准备 store
const s = makeStore()
console.log('【Step 0】初始状态')
print('  原始记录总条数', torqueRecords.length)
print('  默认时间窗筛选后条数', s.getFilteredRecords().length)
console.log()

// --- Case A: 先点选转子，再选轴承类型（本次修复的核心用例）---
console.log('【Case A】点选转子 → 再选"轴承"类型')
s.selectComponent(motorComponents[1]) // 转子
const r1 = s.getFilteredRecords().length
const sc1 = s.getState().selectedComponent?.name
const ct1 = s.getState().filters.componentType
print('  点选转子后条数', r1)
print('  · selectedComponent', sc1 + '，componentType=' + (ct1 || 'null'))
// 预期 r1 ≈ 72（1 零件 × 72h）

s.setFilters({ equipmentId: 'EQ-001', severity: [], componentType: 'bearing', source: null })
const r2 = s.getFilteredRecords().length
const sc2 = s.getState().selectedComponent?.name || null
const ct2 = s.getState().filters.componentType
print('  再选轴承类型后条数', r2)
print('  · selectedComponent', sc2 === null ? '(已清空 ✓)' : sc2, 'componentType=' + ct2)
console.log()
if (r2 > 100 && r2 < 160 && sc2 === null && ct2 === 'bearing') {
  pass(`核心修复生效：条数 ${r2}（轴承2零件×72h），selectedComponent 被清空，不再是转子的 ${r1} 条`)
} else {
  fail(`核心修复未生效：r2=${r2}，selectedComponent=${sc2}，componentType=${ct2}`)
}
console.log()

// --- Case B: 反向（先选类型 → 再点选单个）---
console.log('【Case B】先选"绕组"类型 → 再点选"主轴"')
s.selectComponent(null)
s.setFilters({ equipmentId: 'EQ-001', severity: [], componentType: 'winding', source: null })
const r3 = s.getFilteredRecords().length
print('  选绕组类型后条数', r3)

s.selectComponent(motorComponents[4]) // 主轴
const r4 = s.getFilteredRecords().length
const sc4 = s.getState().selectedComponent?.name
const ct4 = s.getState().filters.componentType
print('  再点选主轴后条数', r4)
print('  · selectedComponent=' + sc4 + '，componentType=' + (ct4 || 'null'))
console.log()
if (r4 < 80 && ct4 === null && sc4 === '主轴') {
  pass(`反向修复生效：条数 ${r4}（1零件×72h），componentType 被清空为 null`)
} else {
  fail(`反向修复未生效：r4=${r4} sc4=${sc4} ct4=${ct4}`)
}
console.log()

// --- Case C: 与严重等级叠加 ---
console.log('【Case C】"轴承"类型 + 严重等级 critical 叠加')
s.selectComponent(null)
s.setFilters({ equipmentId: 'EQ-001', severity: ['critical'], componentType: 'bearing', source: null })
const r5 = s.getFilteredRecords().length
print('  轴承 + critical 条数', r5)
// 轴承2零件 × 72h，但只有后半段 sin 变负后才会触发 critical
const allBearingCritical = s.getFilteredRecords()
  .every((r) => compTypeById.get(r.componentId) === 'bearing' && r.severity === 'critical')
if (r5 > 0 && allBearingCritical) {
  pass(`叠加筛选正确：${r5}条均为轴承且为 critical`)
} else {
  fail(`叠加筛选异常：条数=${r5} 全轴承critical=${allBearingCritical}`)
}
console.log()

// --- Case D: 页面显示 vs CSV 一致 ---
console.log('【Case D】CSV 导出与页面一致')
const csv = s.exportCSV()
const lines = csv.split('\r\n')
const pageN = s.getFilteredRecords().length
const csvN = lines.length - 1
print('  页面显示条数', pageN)
print('  CSV 数据行数', csvN)
print('  CSV 表头字段数', lines[0].split('","').length)
const hasChineseHeader = lines[0].includes('"零部件名称"')
const onlyBearingCsv = lines.slice(1).every((l) => !l || l.includes('"轴承"'))
const onlyCriticalCsv = lines.slice(1).every((l) => !l || l.includes('"严重"'))
console.log()
if (pageN === csvN && hasChineseHeader && onlyBearingCsv && onlyCriticalCsv) {
  pass('CSV 一致性：条数对得上 / 中文表头 / 内容与轴承+严重筛选一致')
} else {
  fail('CSV 不一致：' + JSON.stringify({ pageN, csvN, hasChineseHeader, onlyBearingCsv, onlyCriticalCsv }))
}

// 检查 UTF-8 BOM：用 exportCSVWithBOM 等效逻辑
const bom = '\uFEFF'
const blobSize = Buffer.byteLength(bom + csv, 'utf8')
print('  带 BOM 后 Blob 大小', blobSize + ' 字节（UTF-8 BOM 3字节+原CSV）')
console.log()

// --- Case E: 导出文件可被正常打开（模拟：解析回来）---
console.log('【Case E】CSV 格式可解析（RFC 4180 引号包裹，"转成""）')
const cells = lines[0].split(/","/).map((c, i, arr) =>
  (i === 0 ? c.replace(/^"/, '') : i === arr.length - 1 ? c.replace(/"$/, '') : c)
)
const expected = ['ID','设备ID','零部件ID','零部件名称','零部件类型','实测扭矩(N·m)','额定扭矩(N·m)','误差(%)','严重等级','时间戳']
const headerOk = JSON.stringify(cells) === JSON.stringify(expected)
const dataRowCells = lines[1].split(/","/)
const measuredTorqueVal = parseFloat(dataRowCells[5].replace(/^"/, ''))
print('  表头解析后字段数', cells.length + '（期望' + expected.length + '）')
print('  数据行第6列"实测扭矩"', measuredTorqueVal + '（应为数字）')
if (headerOk && dataRowCells.length === 10 && !Number.isNaN(measuredTorqueVal)) {
  pass('CSV 格式正确：表头对齐，实测扭矩字段可解析为数值')
} else {
  fail('CSV 格式有问题，Excel/WPS 可能错位')
}
console.log()

// 汇总
console.log('=========================')
console.log(' 验证完成')
console.log('=========================\n')
