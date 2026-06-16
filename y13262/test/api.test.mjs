import assert from 'node:assert/strict'

const base = 'http://localhost:3001'

async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e) {
    console.error(`❌ ${name}:`, e.message)
    process.exitCode = 1
  }
}

async function get(path) {
  const res = await fetch(base + path)
  assert.equal(res.status, 200, `GET ${path} -> ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal(res.status, 200, `POST ${path} -> ${res.status}`)
  return res.json()
}

async function patch(path, body) {
  const res = await fetch(base + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.equal(res.status, 200, `PATCH ${path} -> ${res.status}`)
  return res.json()
}

await test('GET /api/complaints returns 15 items', async () => {
  const data = await get('/api/complaints')
  assert.equal(data.total, 15)
  assert.equal(data.complaints.length, 15)
})

await test('GET /api/complaints/:id with photos and history', async () => {
  const list = await get('/api/complaints')
  const id = list.complaints[0].id
  const detail = await get(`/api/complaints/${id}`)
  assert.ok(detail.complaint)
  assert.ok(Array.isArray(detail.photos))
  assert.ok(Array.isArray(detail.history))
  assert.ok(detail.merge_record !== undefined)
})

await test('PATCH /api/complaints/:id updates note and writes history', async () => {
  const list = await get('/api/complaints')
  const id = list.complaints.find(c => c.location_raw === '和平路33号').id
  const before = await get(`/api/complaints/${id}`)
  const noteBefore = before.complaint.note

  const update = await patch(`/api/complaints/${id}`, {
    note: '测试备注：API更新',
    changed_by: 'test-runner',
  })
  assert.equal(update.success, true)

  const after = await get(`/api/complaints/${id}`)
  assert.equal(after.complaint.note, '测试备注：API更新')
  assert.ok(after.history.some(h => h.new_value === '测试备注：API更新'))
  assert.ok(after.history.some(h => h.old_value === noteBefore))
})

await test('POST /api/export/csv filters by keyword and includes note', async () => {
  const data = await post('/api/export', {
    format: 'json',
    keyword: '老曹',
  })
  assert.ok(Array.isArray(data))
  assert.ok(data.length >= 2, `expected >=2 rows with 老曹, got ${data.length}`)
  assert.ok(data.every(row => row.note.includes('老曹') || row.location_raw.includes('老曹') || row.original_text.includes('老曹')), 'keyword filter failed')
})

await test('GET /api/histories returns edit_note records', async () => {
  const data = await get('/api/histories')
  assert.ok(data.total >= 10)
  assert.ok(data.logs.some(l => l.action === 'edit_note'))
  assert.ok(data.logs.some(l => l.action === 'merge'))
  assert.ok(data.logs.some(l => l.action === 'confirm'))
})

await test('GET /api/histories?action=edit_note filters correctly', async () => {
  const data = await get('/api/histories?action=edit_note')
  assert.ok(data.logs.every(l => l.action === 'edit_note'), 'action filter failed')
})

await test('同一地点不同写法不会相邻点位错误合并', async () => {
  const data = await get('/api/complaints?status=merged')
  const zhongshan = data.complaints.filter(c => c.location_normalized === '中山路55号')
  const renmin = data.complaints.filter(c => c.location_normalized === '人民路10号')
  assert.equal(zhongshan.length, 2, `中山路55号应有2条, 实际${zhongshan.length}`)
  assert.equal(renmin.length, 3, `人民路10号应有3条, 实际${renmin.length}`)
  assert.ok(zhongshan.every(c => c.merge_group_id === zhongshan[0].merge_group_id), '中山路归并组不一致')
  assert.ok(renmin.every(c => c.merge_group_id === renmin[0].merge_group_id), '人民路归并组不一致')
  assert.notEqual(zhongshan[0].merge_group_id, renmin[0].merge_group_id, '相邻点位错误合并了！')
})

await test('归并保留原始来源痕迹（original_text, location_raw）', async () => {
  const list = await get('/api/complaints')
  const c = list.complaints.find(x => x.location_raw === '人民路十号附近')
  assert.ok(c)
  assert.equal(c.location_normalized, '人民路10号', '归一化后位置正确')
  assert.equal(c.location_raw, '人民路十号附近', '原始位置未被修改')
  assert.ok(c.original_text.includes('堵了'), '原始文本保留口语化表述')
})

console.log('\n🏁 All API tests completed')
