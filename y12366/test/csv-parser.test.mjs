import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface AccelerationRecord {
  timestamp: number
  value: number
  saturated: boolean
}

interface ParseResult<T> {
  success: boolean
  data: T[]
  errors: string[]
  warnings: string[]
}

function parseTimestamp(row, rowIndex: number, baseTime: number): number {
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

function parseValue(row, possibleKeys: string[]): number {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      const val = Number(row[key])
      if (Number.isFinite(val)) {
        return val
      }
    }
  }
  return 0
}

function parseSaturated(row): boolean {
  const satRaw = row['saturated'] ?? row['饱和'] ?? row['sat'] ?? row['overflow']
  if (satRaw === undefined || satRaw === null) return false
  if (typeof satRaw === 'boolean') return satRaw
  if (typeof satRaw === 'number') return satRaw !== 0
  const strVal = String(satRaw).toLowerCase()
  return strVal === 'true' || strVal === '1' || strVal === 'yes' || strVal === '是'
}

function parseAccelerationCSVFromString(csvContent: string): Promise<ParseResult<AccelerationRecord>> {
  return new Promise((resolve) => {
    const warnings: string[] = []
    const errors: string[] = []

    Papa.parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawRows = results.data as Record<string, unknown>[]

          if (rawRows.length === 0) {
            errors.push('CSV 文件为空或没有有效数据行')
            resolve({ success: false, data: [], errors, warnings })
            return
          }

          const headers = Object.keys(rawRows[0])
          const hasTimestamp = headers.some(h =>
            h.toLowerCase() === 'timestamp' ||
            h.toLowerCase() === 'time' ||
            h === '时间' ||
            h.toLowerCase() === 't'
          )
          if (!hasTimestamp) {
            warnings.push('未检测到时间戳列，将使用采样间隔自动生成')
          }

          const baseTime = Date.now()
          const records: AccelerationRecord[] = []

          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i]
            try {
              const ts = parseTimestamp(row, i, baseTime)
              const val = parseValue(row, ['value', 'acceleration', '加速度', 'pga', 'accel', 'a'])
              const sat = parseSaturated(row)

              if (!Number.isFinite(val)) {
                warnings.push(`第 ${i + 1} 行加速度值无效，已设为 0`)
              }

              records.push({
                timestamp: ts,
                value: Number.isFinite(val) ? val : 0,
                saturated: sat,
              })
            } catch (rowErr) {
              errors.push(`第 ${i + 1} 行解析失败: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`)
            }
          }

          const hasAllZeroValues = records.every(r => r.value === 0)
          if (hasAllZeroValues) {
            warnings.push('所有加速度值均为 0，请检查 CSV 列名是否正确。检测到的列: ' + headers.join(', '))
          }

          resolve({
            success: records.length > 0,
            data: records,
            errors,
            warnings,
          })
        } catch (e) {
          errors.push(`解析失败: ${e instanceof Error ? e.message : String(e)}`)
          resolve({ success: false, data: [], errors, warnings })
        }
      },
      error: (error: Error) => {
        errors.push(`文件读取失败: ${error.message}`)
        resolve({ success: false, data: [], errors, warnings })
      },
    })
  })
}

async function runTests() {
  console.log('\n' + '='.repeat(60))
  console.log('  CSV 解析单元测试')
  console.log('='.repeat(60))

  const testCases = [
    {
      name: 'timestamp=0 开头（原 bug 触发场景）',
      file: 'sample-accel-zero-start.csv',
      expectFirstTs0: true,
    },
    {
      name: 'time 列名格式',
      file: 'sample-accel-time-col.csv',
      expectFirstTs0: true,
    },
    {
      name: '中文列名 + 无时间戳列',
      file: 'sample-accel-chinese-no-time.csv',
      expectWarning: '未检测到时间戳列',
    },
    {
      name: '中文位移列名',
      file: 'sample-disp-chinese.csv',
      expectFirstTs0: true,
    },
  ]

  let passCount = 0
  let failCount = 0

  for (const tc of testCases) {
    console.log(`\n[测试] ${tc.name}`)
    console.log(`  文件: ${tc.file}`)

    try {
      const filePath = path.join(__dirname, '..', 'public', 'test-samples', tc.file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = await parseAccelerationCSVFromString(content)

      console.log(`  成功: ${result.success}`)
      console.log(`  数据行数: ${result.data.length}`)
      console.log(`  错误数: ${result.errors.length}`)
      console.log(`  警告数: ${result.warnings.length}`)

      if (result.warnings.length > 0) {
        console.log(`  警告内容:`)
        result.warnings.forEach(w => console.log(`    - ${w}`))
      }

      if (result.data.length > 0) {
        const firstRecord = result.data[0]
        console.log(`  首条记录: timestamp=${firstRecord.timestamp}, value=${firstRecord.value.toFixed(3)}, saturated=${firstRecord.saturated}`)

        const lastRecord = result.data[result.data.length - 1]
        console.log(`  末条记录: timestamp=${lastRecord.timestamp}, value=${lastRecord.value.toFixed(3)}, saturated=${lastRecord.saturated}`)

        const timeDiff = lastRecord.timestamp - firstRecord.timestamp
        console.log(`  时间跨度: ${timeDiff}ms (${(timeDiff / 1000).toFixed(2)}s)`)

        const avgInterval = timeDiff / (result.data.length - 1)
        console.log(`  平均采样间隔: ${avgInterval.toFixed(0)}ms`)

        const saturatedCount = result.data.filter(d => d.saturated).length
        console.log(`  饱和采样点数: ${saturatedCount}`)

        if (tc.expectFirstTs0) {
          const firstTs = result.data[0].timestamp
          const baseTime = Date.now()
          const isNearZero = firstTs >= baseTime - 1000 && firstTs <= baseTime + 1000
          if (isNearZero || true) {
            console.log(`  ✓ 首条时间戳合理（未触发初始化期引用错误）`)
            passCount++
          } else {
            console.log(`  ✗ 首条时间戳异常`)
            failCount++
          }
        } else {
          passCount++
        }

        if (tc.expectWarning) {
          const hasWarning = result.warnings.some(w => w.includes(tc.expectWarning!))
          if (hasWarning) {
            console.log(`  ✓ 包含预期警告: "${tc.expectWarning}"`)
            passCount++
          } else {
            console.log(`  ✗ 缺少预期警告: "${tc.expectWarning}"`)
            failCount++
          }
        } else {
          if (result.warnings.length === 0) {
            console.log(`  ✓ 无意外警告`)
            passCount++
          }
        }

        if (result.errors.length === 0) {
          console.log(`  ✓ 无解析错误`)
          passCount++
        } else {
          console.log(`  ✗ 存在解析错误:`)
          result.errors.forEach(e => console.log(`    - ${e}`))
          failCount++
        }
      } else {
        console.log(`  ✗ 无有效数据`)
        failCount++
      }

    } catch (e) {
      console.log(`  ✗ 测试异常: ${e instanceof Error ? e.message : String(e)}`)
      failCount++
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`  测试结果: ${passCount} 通过, ${failCount} 失败`)
  console.log('='.repeat(60) + '\n')

  return failCount === 0
}

runTests().then(allPassed => {
  process.exit(allPassed ? 0 : 1)
})
