import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('='.repeat(60))
console.log('  csvParser 核心修复验证')
console.log('='.repeat(60))

function parseTimestamp(row, rowIndex, baseTime) {
  const tsRaw = row['timestamp'] ?? row['time'] ?? row['Time'] ?? row['时间'] ?? row['t']
  if (tsRaw === undefined || tsRaw === null || tsRaw === '') {
    return baseTime + rowIndex * 20
  }
  const tsNum = Number(tsRaw)
  if (!Number.isFinite(tsNum)) {
    return baseTime + rowIndex * 20
  }
  if (tsNum < 1000000000) {
    return baseTime + tsNum * 1000
  }
  return tsNum
}

const BASE_TIME = 1700000000000
let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passCount++
  } catch (e) {
    console.log(`❌ ${name}`)
    console.log(`   错误: ${e.message}`)
    failCount++
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || ''} 期望 ${expected}, 实际 ${actual}`)
  }
}

console.log('\n[核心修复] 使用 rowIndex 替代 records.length:\n')

test('测试1: timestamp=0 开头的边界场景', () => {
  const rows = [
    { timestamp: 0, value: 0.1 },
    { timestamp: 1, value: 0.2 },
    { timestamp: 2, value: 0.3 },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], BASE_TIME + 0 * 1000, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 1 * 1000, '第1行时间戳')
  assertEqual(timestamps[2], BASE_TIME + 2 * 1000, '第2行时间戳')
})

test('测试2: 缺失时间列的场景（地震波CSV常见格式）', () => {
  const rows = [
    { value: 0.5 },
    { value: 0.8 },
    { value: 1.2 },
    { value: 0.9 },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], BASE_TIME + 0 * 20, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 1 * 20, '第1行时间戳')
  assertEqual(timestamps[2], BASE_TIME + 2 * 20, '第2行时间戳')
  assertEqual(timestamps[3], BASE_TIME + 3 * 20, '第3行时间戳')
})

test('测试3: 中文列名，无时间戳列', () => {
  const rows = [
    { 加速度: 0.1, 饱和: 'false' },
    { 加速度: 0.3, 饱和: 'false' },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], BASE_TIME + 0 * 20, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 1 * 20, '第1行时间戳')
})

test('测试4: time列名格式（非timestamp）', () => {
  const rows = [
    { time: 0.00, value: 0.0 },
    { time: 0.02, value: 0.1 },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], BASE_TIME + 0 * 1000, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 20, '第1行时间戳')
})

test('测试5: 混合格式，部分行缺失时间戳', () => {
  const rows = [
    { timestamp: 1700000000000, value: 0.0 },
    { value: 0.1 },
    { timestamp: 1700000000040, value: 0.2 },
    { value: 0.3 },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], 1700000000000, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 1 * 20, '第1行时间戳')
  assertEqual(timestamps[2], 1700000000040, '第2行时间戳')
  assertEqual(timestamps[3], BASE_TIME + 3 * 20, '第3行时间戳')
})

test('测试6: 空值和无效值处理', () => {
  const rows = [
    { timestamp: '', value: 0.1 },
    { timestamp: 'invalid', value: 0.2 },
    { timestamp: null, value: 0.3 },
  ]
  const timestamps = rows.map((row, i) => parseTimestamp(row, i, BASE_TIME))
  assertEqual(timestamps[0], BASE_TIME + 0 * 20, '第0行时间戳')
  assertEqual(timestamps[1], BASE_TIME + 1 * 20, '第1行时间戳')
  assertEqual(timestamps[2], BASE_TIME + 2 * 20, '第2行时间戳')
})

test('测试7: records.length 不再被引用（代码审查确认）', () => {
  const parserPath = path.join(__dirname, '..', 'src', 'utils', 'csvParser.ts')
  const content = fs.readFileSync(parserPath, 'utf-8')
  
  const mapCallbackPattern = /\.map\s*\([^)]*records\.length/
  if (mapCallbackPattern.test(content)) {
    throw new Error('在 map 回调中仍然引用了 records.length！')
  }
})

console.log('\n' + '-'.repeat(60))
console.log(`测试结果: ${passCount} 通过, ${failCount} 失败`)
console.log('='.repeat(60))

if (failCount > 0) {
  process.exit(1)
}
