import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

const testDbDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true })
}
const testDbPath = path.join(testDbDir, 'test_allocation.db')

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath)
}

const db = new Database(testDbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    card_no TEXT UNIQUE NOT NULL,
    holder_name TEXT NOT NULL,
    purchase_amount REAL NOT NULL,
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    card_no TEXT NOT NULL,
    scenic_spot_id TEXT NOT NULL,
    scenic_spot_name TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    swipe_serial_no TEXT NOT NULL,
    is_deduplicated INTEGER DEFAULT 0,
    deduplicated_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (card_no) REFERENCES accounts(card_no)
  );
  CREATE TABLE IF NOT EXISTS subsidies (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    scenic_spot_id TEXT NOT NULL,
    scenic_spot_name TEXT NOT NULL,
    subsidy_amount REAL NOT NULL,
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS allocation_results (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    card_no TEXT NOT NULL,
    scenic_spot_id TEXT NOT NULL,
    scenic_spot_name TEXT NOT NULL,
    entry_count INTEGER NOT NULL,
    base_allocation REAL NOT NULL,
    subsidy_amount REAL NOT NULL,
    refund_adjustment REAL NOT NULL,
    total_allocation REAL NOT NULL,
    calculated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (card_no) REFERENCES accounts(card_no)
  );
  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    card_no TEXT NOT NULL,
    scenic_spot_id TEXT NOT NULL,
    scenic_spot_name TEXT NOT NULL,
    refund_amount REAL NOT NULL,
    refund_time TEXT NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (card_no) REFERENCES accounts(card_no)
  );
  CREATE TABLE IF NOT EXISTS correction_history (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('update', 'delete', 'add')),
    old_data TEXT,
    new_data TEXT,
    old_version TEXT NOT NULL,
    new_version TEXT NOT NULL,
    corrected_by TEXT NOT NULL DEFAULT 'system',
    corrected_at TEXT DEFAULT (datetime('now'))
  );
`)

function insertAccount(cardNo: string, name: string, amount: number, from: string, to: string) {
  db.prepare('INSERT INTO accounts (id, card_no, holder_name, purchase_amount, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), cardNo, name, amount, from, to)
}

function insertEntry(cardNo: string, spotId: string, spotName: string, time: string, serial: string) {
  db.prepare('INSERT INTO entries (id, card_no, scenic_spot_id, scenic_spot_name, entry_time, swipe_serial_no, is_deduplicated) VALUES (?, ?, ?, ?, ?, ?, 0)')
    .run(uuidv4(), cardNo, spotId, spotName, time, serial)
}

function insertSubsidy(actId: string, actName: string, spotId: string, spotName: string, amount: number, from: string, to: string, ver: number) {
  db.prepare('INSERT INTO subsidies (id, activity_id, activity_name, scenic_spot_id, scenic_spot_name, subsidy_amount, valid_from, valid_to, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), actId, actName, spotId, spotName, amount, from, to, ver)
}

function insertRefund(cardNo: string, spotId: string, spotName: string, amount: number, time: string, reason: string) {
  db.prepare('INSERT INTO refunds (id, card_no, scenic_spot_id, scenic_spot_name, refund_amount, refund_time, reason) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), cardNo, spotId, spotName, amount, time, reason)
}

function getNextVersion(): string {
  const row = db.prepare("SELECT version FROM allocation_results ORDER BY rowid DESC LIMIT 1").get() as { version: string } | undefined
  if (!row) return 'v1'
  const match = row.version.match(/^v(\d+)$/)
  if (!match) return 'v1'
  return `v${parseInt(match[1], 10) + 1}`
}

function deduplicateEntries(): number {
  const entries = db.prepare("SELECT id, card_no, scenic_spot_id, entry_time FROM entries WHERE is_deduplicated = 0 ORDER BY entry_time ASC").all() as Array<{ id: string; card_no: string; scenic_spot_id: string; entry_time: string }>
  const grouped = new Map<string, Array<{ id: string }>>()
  for (const e of entries) {
    const date = e.entry_time.substring(0, 10)
    const key = `${e.card_no}|${e.scenic_spot_id}|${date}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push({ id: e.id })
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const markDedup = db.prepare("UPDATE entries SET is_deduplicated = 1, deduplicated_at = ? WHERE id = ?")
  let count = 0
  const t = db.transaction(() => {
    for (const [, group] of grouped) {
      if (group.length > 1) {
        for (let i = 1; i < group.length; i++) {
          markDedup.run(now, group[i].id)
          count++
        }
      }
    }
  })
  t()
  return count
}

function calculateAllocation(): { version: string; results: Array<Record<string, unknown>> } {
  const version = getNextVersion()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  deduplicateEntries()

  const accounts = db.prepare("SELECT * FROM accounts").all() as Array<Record<string, unknown>>
  const entries = db.prepare("SELECT * FROM entries WHERE is_deduplicated = 0").all() as Array<Record<string, unknown>>
  const subsidies = db.prepare("SELECT * FROM subsidies").all() as Array<Record<string, unknown>>
  const refunds = db.prepare("SELECT * FROM refunds").all() as Array<Record<string, unknown>>

  const entriesByCard = new Map<string, Array<Record<string, unknown>>>()
  for (const e of entries) {
    const cardNo = e.card_no as string
    if (!entriesByCard.has(cardNo)) entriesByCard.set(cardNo, [])
    entriesByCard.get(cardNo)!.push(e)
  }

  const refundsByCard = new Map<string, Array<Record<string, unknown>>>()
  for (const r of refunds) {
    const cardNo = r.card_no as string
    if (!refundsByCard.has(cardNo)) refundsByCard.set(cardNo, [])
    refundsByCard.get(cardNo)!.push(r)
  }

  const results: Array<Record<string, unknown>> = []
  const insertResult = db.prepare(
    `INSERT INTO allocation_results (id, version, card_no, scenic_spot_id, scenic_spot_name, entry_count, base_allocation, subsidy_amount, refund_adjustment, total_allocation, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const t = db.transaction(() => {
    for (const account of accounts) {
      const cardNo = account.card_no as string
      const purchaseAmount = account.purchase_amount as number
      const cardEntries = entriesByCard.get(cardNo) || []
      if (cardEntries.length === 0) continue

      const perEntryRate = purchaseAmount / cardEntries.length

      const spotMap = new Map<string, { spotName: string; count: number; entryTimes: string[] }>()
      for (const e of cardEntries) {
        const spotId = e.scenic_spot_id as string
        if (!spotMap.has(spotId)) spotMap.set(spotId, { spotName: e.scenic_spot_name as string, count: 0, entryTimes: [] })
        const s = spotMap.get(spotId)!
        s.count++
        s.entryTimes.push(e.entry_time as string)
      }

      const spotBaseAllocations = new Map<string, number>()
      let totalBase = 0
      for (const [spotId, data] of spotMap) {
        const base = Math.round(perEntryRate * data.count * 100) / 100
        spotBaseAllocations.set(spotId, base)
        totalBase += base
      }

      const cardRefunds = refundsByCard.get(cardNo) || []
      const totalRefund = cardRefunds.reduce((s, r) => s + (r.refund_amount as number), 0)

      const refundAdjustments = new Map<string, number>()
      if (totalRefund > 0 && totalBase > 0) {
        for (const [spotId, base] of spotBaseAllocations) {
          const adj = Math.round(-totalRefund * (base / totalBase) * 100) / 100
          refundAdjustments.set(spotId, adj)
        }
        let sumAdj = 0
        for (const [, adj] of refundAdjustments) sumAdj += adj
        const roundingDiff = Math.round((-totalRefund - sumAdj) * 100) / 100
        if (roundingDiff !== 0) {
          const firstKey = spotBaseAllocations.keys().next().value!
          refundAdjustments.set(firstKey, Math.round((refundAdjustments.get(firstKey)! + roundingDiff) * 100) / 100)
        }
      }

      for (const [spotId, data] of spotMap) {
        const baseAlloc = spotBaseAllocations.get(spotId) ?? 0
        let subsidyTotal = 0
        for (const entryTime of data.entryTimes) {
          const entryDate = entryTime.substring(0, 10)
          for (const sub of subsidies) {
            if ((sub.scenic_spot_id as string) === spotId) {
              const subFrom = (sub.valid_from as string).substring(0, 10)
              const subTo = (sub.valid_to as string).substring(0, 10)
              if (entryDate >= subFrom && entryDate <= subTo) {
                subsidyTotal += sub.subsidy_amount as number
              }
            }
          }
        }
        subsidyTotal = Math.round(subsidyTotal * 100) / 100
        const refundAdj = refundAdjustments.get(spotId) ?? 0
        const total = Math.round((baseAlloc + subsidyTotal + refundAdj) * 100) / 100

        const id = uuidv4()
        results.push({ id, version, card_no: cardNo, scenic_spot_id: spotId, scenic_spot_name: data.spotName, entry_count: data.count, base_allocation: baseAlloc, subsidy_amount: subsidyTotal, refund_adjustment: refundAdj, total_allocation: total })
        insertResult.run(id, version, cardNo, spotId, data.spotName, data.count, baseAlloc, subsidyTotal, refundAdj, total, now)
      }
    }
  })
  t()
  return { version, results }
}

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`)
    passed++
  } else {
    console.log(`  ❌ ${testName}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function assertEqual(actual: unknown, expected: unknown, testName: string) {
  if (actual === expected) {
    console.log(`  ✅ ${testName}`)
    passed++
  } else {
    console.log(`  ❌ ${testName} — 期望 ${expected}, 实际 ${actual}`)
    failed++
  }
}

function assertApprox(actual: number, expected: number, testName: string, tolerance = 0.02) {
  if (Math.abs(actual - expected) <= tolerance) {
    console.log(`  ✅ ${testName}`)
    passed++
  } else {
    console.log(`  ❌ ${testName} — 期望约 ${expected}, 实际 ${actual}`)
    failed++
  }
}

function cleanup() {
  db.prepare("DELETE FROM correction_history").run()
  db.prepare("DELETE FROM allocation_results").run()
  db.prepare("DELETE FROM refunds").run()
  db.prepare("DELETE FROM entries").run()
  db.prepare("DELETE FROM subsidies").run()
  db.prepare("DELETE FROM accounts").run()
}

console.log('\n🧪 文旅年卡分摊收入 — 边界样例测试\n')

console.log('📌 测试1: 重复刷卡去重')
{
  cleanup()
  insertAccount('NK001', '张三', 1200, '2026-01-01', '2026-12-31')
  insertEntry('NK001', 'HS001', '黄山', '2026-03-15 09:00:00', 'S001')
  insertEntry('NK001', 'HS001', '黄山', '2026-03-15 09:05:00', 'S002')
  insertEntry('NK001', 'HS001', '黄山', '2026-03-15 09:10:00', 'S003')
  insertEntry('NK001', 'JZG001', '九寨沟', '2026-03-20 10:00:00', 'S004')

  const dupCount = deduplicateEntries()
  assertEqual(dupCount, 2, '同一天同一景点3次刷卡标记2条为重复')

  const validEntries = db.prepare("SELECT COUNT(*) as c FROM entries WHERE is_deduplicated = 0").get() as { c: number }
  assertEqual(validEntries.c, 2, '去重后仅2条有效入园（黄山1次+九寨沟1次）')

  const result = calculateAllocation()
  assertEqual(result.results.length, 2, '分摊结果为2条（2个景点）')

  const hsResult = result.results.find(r => (r.scenic_spot_id as string) === 'HS001')
  assert(!!hsResult, '黄山分摊结果存在')
  assertEqual(hsResult!.entry_count as number, 1, '黄山入园次数为1')
  assertApprox(hsResult!.total_allocation as number, 600, '黄山分摊600元（1200/2*1）')

  const jzgResult = result.results.find(r => (r.scenic_spot_id as string) === 'JZG001')
  assert(!!jzgResult, '九寨沟分摊结果存在')
  assertApprox(jzgResult!.total_allocation as number, 600, '九寨沟分摊600元')
}

console.log('\n📌 测试2: 补贴追溯')
{
  cleanup()
  insertAccount('NK002', '李四', 1000, '2026-01-01', '2026-12-31')
  insertEntry('NK002', 'HS001', '黄山', '2026-04-10 09:00:00', 'S010')
  insertEntry('NK002', 'JZG001', '九寨沟', '2026-07-15 10:00:00', 'S011')

  const r1 = calculateAllocation()
  const hsNoSub = r1.results.find(r => (r.scenic_spot_id as string) === 'HS001')
  assertEqual(hsNoSub!.subsidy_amount as number, 0, '无补贴时黄山补贴金额为0')

  insertSubsidy('ACT001', '春季补贴', 'HS001', '黄山', 50, '2026-03-01', '2026-05-31', 1)
  insertSubsidy('ACT002', '暑期补贴', 'JZG001', '九寨沟', 80, '2026-06-01', '2026-08-31', 1)

  const r2 = calculateAllocation()
  const hsWithSub = r2.results.find(r => (r.scenic_spot_id as string) === 'HS001')
  assertEqual(hsWithSub!.subsidy_amount as number, 50, '春季补贴生效：黄山补贴50元')

  const jzgWithSub = r2.results.find(r => (r.scenic_spot_id as string) === 'JZG001')
  assertEqual(jzgWithSub!.subsidy_amount as number, 80, '暑期补贴生效：九寨沟补贴80元')

  insertSubsidy('ACT003', '淡季补贴', 'HS001', '黄山', 30, '2026-01-01', '2026-12-31', 1)
  const r3 = calculateAllocation()
  const hsMultiSub = r3.results.find(r => (r.scenic_spot_id as string) === 'HS001')
  assertEqual(hsMultiSub!.subsidy_amount as number, 80, '多补贴叠加：黄山50+30=80元')
}

console.log('\n📌 测试3: 退款跨景点分摊')
{
  cleanup()
  insertAccount('NK003', '王五', 900, '2026-01-01', '2026-12-31')
  insertEntry('NK003', 'HS001', '黄山', '2026-03-10 09:00:00', 'S020')
  insertEntry('NK003', 'JZG001', '九寨沟', '2026-04-10 10:00:00', 'S021')
  insertEntry('NK003', 'XH001', '西湖', '2026-05-10 11:00:00', 'S022')

  insertRefund('NK003', 'HS001', '黄山', 90, '2026-06-01 10:00:00', '跨景点退款')

  const r = calculateAllocation()
  assertEqual(r.results.length, 3, '3个景点均有分摊结果')

  const totalRefundAdj = r.results.reduce((s, r2) => s + (r2.refund_adjustment as number), 0)
  assertApprox(totalRefundAdj, -90, '退款调整总额=-90元（跨景点按比例分摊）')

  const hsResult = r.results.find(x => (x.scenic_spot_id as string) === 'HS001')
  const jzgResult = r.results.find(x => (x.scenic_spot_id as string) === 'JZG001')
  const xhResult = r.results.find(x => (x.scenic_spot_id as string) === 'XH001')

  assert((hsResult!.refund_adjustment as number) < 0, '黄山退款调整为负')
  assert((jzgResult!.refund_adjustment as number) < 0, '九寨沟退款调整为负（跨景点分摊）')
  assert((xhResult!.refund_adjustment as number) < 0, '西湖退款调整为负（跨景点分摊）')

  const hsBase = hsResult!.base_allocation as number
  const jzgBase = jzgResult!.base_allocation as number
  const xhBase = xhResult!.base_allocation as number
  assertApprox(hsResult!.refund_adjustment as number, -90 * (hsBase / (hsBase + jzgBase + xhBase)), '黄山退款按比例计算')
}

console.log('\n📌 测试4: 幂等性 — 相同数据重复计算')
{
  cleanup()
  insertAccount('NK004', '赵六', 1200, '2026-01-01', '2026-12-31')
  insertEntry('NK004', 'HS001', '黄山', '2026-03-10 09:00:00', 'S030')
  insertEntry('NK004', 'JZG001', '九寨沟', '2026-04-10 10:00:00', 'S031')

  const r1 = calculateAllocation()
  const r2 = calculateAllocation()

  assert(r1.version !== r2.version, '两次计算版本号不同')

  const hs1 = r1.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  const hs2 = r2.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(hs1.base_allocation, hs2.base_allocation, '黄山基础分摊金额一致')
  assertEqual(hs1.subsidy_amount, hs2.subsidy_amount, '黄山补贴金额一致')
  assertEqual(hs1.total_allocation, hs2.total_allocation, '黄山总金额一致')

  const jzg1 = r1.results.find(x => (x.scenic_spot_id as string) === 'JZG001')!
  const jzg2 = r2.results.find(x => (x.scenic_spot_id as string) === 'JZG001')!
  assertEqual(jzg1.total_allocation, jzg2.total_allocation, '九寨沟总金额一致')
}

console.log('\n📌 测试5: 补贴版本变化后分摊跟着变')
{
  cleanup()
  insertAccount('NK005', '钱七', 800, '2026-01-01', '2026-12-31')
  insertEntry('NK005', 'HS001', '黄山', '2026-04-10 09:00:00', 'S040')

  insertSubsidy('ACT100', '测试补贴', 'HS001', '黄山', 50, '2026-03-01', '2026-05-31', 1)
  const r1 = calculateAllocation()
  const hs1 = r1.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(hs1.subsidy_amount as number, 50, '补贴V1: 黄山补贴50元')

  db.prepare('UPDATE subsidies SET subsidy_amount = ?, version = ? WHERE activity_id = ? AND scenic_spot_id = ?')
    .run(100, 2, 'ACT100', 'HS001')

  const r2 = calculateAllocation()
  const hs2 = r2.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(hs2.subsidy_amount as number, 100, '补贴V2: 黄山补贴变为100元')
  assert((hs2.total_allocation as number) > (hs1.total_allocation as number), '补贴增加后总分摊增加')
}

console.log('\n📌 测试6: 刷卡去重变化后退款调整跟着变')
{
  cleanup()
  insertAccount('NK006', '孙八', 600, '2026-01-01', '2026-12-31')
  insertEntry('NK006', 'HS001', '黄山', '2026-03-15 09:00:00', 'S050')
  insertEntry('NK006', 'HS001', '黄山', '2026-03-15 09:05:00', 'S051')
  insertEntry('NK006', 'JZG001', '九寨沟', '2026-04-10 10:00:00', 'S052')

  insertRefund('NK006', 'HS001', '黄山', 60, '2026-06-01 10:00:00', '测试退款')

  const r1 = calculateAllocation()
  const hs1 = r1.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(hs1.entry_count as number, 1, '去重后黄山入园1次')

  db.prepare('UPDATE entries SET entry_time = ?, is_deduplicated = 0 WHERE swipe_serial_no = ?').run('2026-03-16 09:00:00', 'S051')

  const r2 = calculateAllocation()
  const hs2 = r2.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(hs2.entry_count as number, 2, '改为不同天后黄山入园2次')

  assert(
    Math.abs(hs2.refund_adjustment as number) !== Math.abs(hs1.refund_adjustment as number),
    '入园次数变化后退款调整金额跟着变'
  )
}

console.log('\n📌 测试7: 手动修正后新旧结果对比')
{
  cleanup()
  insertAccount('NK007', '周九', 500, '2026-01-01', '2026-12-31')
  insertEntry('NK007', 'HS001', '黄山', '2026-03-10 09:00:00', 'S060')
  insertEntry('NK007', 'JZG001', '九寨沟', '2026-04-10 10:00:00', 'S061')

  const r1 = calculateAllocation()

  const entryToDelete = db.prepare("SELECT id FROM entries WHERE card_no = 'NK007' AND scenic_spot_id = 'JZG001'").get() as { id: string } | undefined
  if (entryToDelete) {
    db.prepare('DELETE FROM entries WHERE id = ?').run(entryToDelete.id)
  }

  const r2 = calculateAllocation()
  assert(r1.version !== r2.version, '修正后版本号变化')

  const r1Jzg = r1.results.find(x => (x.scenic_spot_id as string) === 'JZG001')
  const r2Jzg = r2.results.find(x => (x.scenic_spot_id as string) === 'JZG001')
  assert(r1Jzg !== undefined, '修正前九寨沟有分摊结果')
  assert(r2Jzg === undefined, '删除入园后九寨沟无分摊结果')

  const r1Hs = r1.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  const r2Hs = r2.results.find(x => (x.scenic_spot_id as string) === 'HS001')!
  assertEqual(r2Hs.entry_count as number, 1, '修正后黄山入园次数仍为1')
  assert((r2Hs.total_allocation as number) > (r1Hs.total_allocation as number), '删除另一景点后黄山分摊增加')
}

console.log('\n' + '='.repeat(50))
console.log(`测试完成: ✅ ${passed} 通过, ❌ ${failed} 失败`)
console.log('='.repeat(50))

db.close()

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath)
}

process.exit(failed > 0 ? 1 : 0)
