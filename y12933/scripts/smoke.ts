// 奖励模型偏差复核 后端冒烟测试
// 运行：npx tsx scripts/smoke.ts
// 前置：后端已启动在 http://localhost:3001
const BASE = process.env.API_BASE || 'http://localhost:3001'

let pass = 0
let fail = 0

async function ok(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name} ${detail}`)
  }
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`)
  return res
}

async function getJson(path: string) {
  const res = await fetch(`${BASE}${path}`)
  return res.json()
}

async function main() {
  const fs = await import('fs')
  const csv = fs.readFileSync('samples/annotations.csv', 'utf8')

  console.log('1. 初始摘要（应为 12 待复核）')
  const s0 = await getJson('/api/summary')
  await ok('total=12', s0.data.total === 12, `got ${s0.data.total}`)
  await ok('pending=12', s0.data.pending === 12, `got ${s0.data.pending}`)

  console.log('2. 重导入同一份 CSV（幂等，应 updated=12 imported=0）')
  const impRes = await fetch(`${BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv, label: '重导入测试' }),
  })
  const imp = await impRes.json()
  await ok('重导入 imported=0', imp.data.imported === 0, `got ${imp.data.imported}`)
  await ok('重导入 updated=12', imp.data.updated === 12, `got ${imp.data.updated}`)
  await ok('重导入后 total 仍=12', imp.data.total === 12, `got ${imp.data.total}`)

  console.log('3. 重导入后摘要仍为 12 待复核（无重复行）')
  const s1 = await getJson('/api/summary')
  await ok('重导入后 total=12', s1.data.total === 12, `got ${s1.data.total}`)
  await ok('重导入后 pending=12', s1.data.pending === 12, `got ${s1.data.pending}`)

  console.log('4. 记录数量仍为 12（无重复）')
  const recs = await getJson('/api/records')
  await ok('records count=12', recs.data.length === 12, `got ${recs.data.length}`)

  console.log('5. 给 rec-001 存结论=通过')
  await fetch(`${BASE}/api/records/rec-001/conclusion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conclusion: '通过',
      bias_type: '长度偏好',
      severity: 'medium',
      reviewer: 'alice',
      feedback: 'RM 偏好长回答',
    }),
  })
  const s2 = await getJson('/api/summary')
  await ok('pass=1', s2.data.pass === 1, `got ${s2.data.pass}`)
  await ok('reviewed=1', s2.data.reviewed === 1, `got ${s2.data.reviewed}`)

  console.log('6. 再给 rec-001 存结论=待确认（upsert，应更新而非新增）')
  await fetch(`${BASE}/api/records/rec-001/conclusion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conclusion: '待确认', bias_type: '长度偏好', reviewer: 'alice' }),
  })
  const s3 = await getJson('/api/summary')
  await ok('upsert 后 pass=0', s3.data.pass === 0, `got ${s3.data.pass}`)
  await ok('upsert 后 pending_confirm=1', s3.data.pending_confirm === 1, `got ${s3.data.pending_confirm}`)
  await ok('upsert 后 reviewed 仍=1（唯一结论）', s3.data.reviewed === 1, `got ${s3.data.reviewed}`)

  console.log('7. 导出与摘要同源：rec-001 在导出中应为 待确认')
  const expRes = await get('/api/export')
  const expText = await expRes.text()
  const expLines = expText.split('\n').filter((l) => l.startsWith('rec-001'))
  await ok('导出含 rec-001 一行', expLines.length === 1, `got ${expLines.length}`)
  await ok('导出 rec-001=待确认', expLines[0].includes('待确认'), `line: ${expLines[0]}`)

  console.log('8. 版本列表（应含 sample 与 重导入测试）')
  const vers = await getJson('/api/versions')
  const labels = vers.data.map((v: any) => v.label)
  await ok('含 sample 版本', labels.includes('示例数据'), `labels: ${labels}`)
  await ok('含 重导入测试 版本', labels.includes('重导入测试'), `labels: ${labels}`)

  console.log('9. 跨版本对比 sample vs 重导入（12 条均在两版本）')
  const cmpRes = await fetch(`${BASE}/api/versions/compare?a=sample&b=${encodeURIComponent(vers.data.find((v: any) => v.label === '重导入测试').version)}`)
  const cmp = await cmpRes.json()
  const bothCount = cmp.data.filter((r: any) => r.in_both).length
  await ok('对比 in_both=12', bothCount === 12, `got ${bothCount}`)

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
