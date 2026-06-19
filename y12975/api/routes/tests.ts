import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

const SCENARIOS = [
  { scenario: 'duplicate_import', description: '重复导入场景：验证来源材料去重与幂等性，避免工具越跑越乱' },
  { scenario: 'dirty_snapshot_parse', description: '脏快照解析：空值/重复/备注混写场景的识别与解析' },
  { scenario: 'conclusion_ref_chain', description: '结论引用链：验证结论与来源材料互点追溯' },
]

router.get('/', (_req: Request, res: Response) => {
  const runs = db.prepare('SELECT * FROM test_runs ORDER BY run_at DESC').all()
  const scenarioMap = new Map<string, typeof runs[number]>()
  for (const r of runs) {
    if (!scenarioMap.has((r as Record<string, string>).scenario)) {
      scenarioMap.set((r as Record<string, string>).scenario, r)
    }
  }
  const data = SCENARIOS.map((s) => ({
    ...s,
    lastRun: scenarioMap.get(s.scenario) || null,
  }))
  res.json({ ok: true, data })
})

router.post('/:scenario/run', (req: Request, res: Response) => {
  const { scenario } = req.params
  const now = new Date().toISOString()
  const runId = uuidv4()

  if (scenario === 'duplicate_import') {
    const beforeCount = (db.prepare('SELECT COUNT(*) as cnt FROM source_materials').get() as { cnt: number }).cnt
    const testItems = [
      { materialType: 'ticket', materialRef: 'TICKET-TEST-001', title: 'Test Ticket 1', summary: 'Duplicate test 1', dedupKey: 'test:dup:ticket-001', complete: 1 },
      { materialType: 'slow_query', materialRef: 'logs/test-slow.log', title: 'Test Slow Query', summary: 'Duplicate test slow query', dedupKey: 'test:dup:slow-001', complete: 1 },
      { materialType: 'ticket', materialRef: 'TICKET-TEST-001', title: 'Test Ticket 1 (duplicate)', summary: 'Should be skipped', dedupKey: 'test:dup:ticket-001', complete: 1 },
      { materialType: 'migration', materialRef: 'migrations/TEST-001.sql', title: 'Test Migration', summary: 'Duplicate test migration', dedupKey: 'test:dup:migration-001', complete: 1 },
      { materialType: 'slow_query', materialRef: 'logs/test-slow.log', title: 'Test Slow Query (dup)', summary: 'Should be skipped', dedupKey: 'test:dup:slow-001', complete: 1 },
    ]

    const insertStmt = db.prepare(
      'INSERT INTO source_materials (id, material_type, material_ref, title, summary, raw_payload, fetched_at, complete, dedup_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const checkStmt = db.prepare('SELECT id FROM source_materials WHERE dedup_key = ?')

    let ingested = 0
    let skipped = 0
    const merged: string[] = []

    const tx = db.transaction(() => {
      for (const item of testItems) {
        const existing = checkStmt.get(item.dedupKey) as Record<string, string> | undefined
        if (existing) {
          skipped++
          merged.push(item.dedupKey)
          continue
        }
        insertStmt.run(
          uuidv4(),
          item.materialType,
          item.materialRef,
          item.title,
          item.summary,
          null,
          now,
          1,
          item.dedupKey,
        )
        ingested++
      }
    })
    tx()

    const afterCount = (db.prepare('SELECT COUNT(*) as cnt FROM source_materials').get() as { cnt: number }).cnt
    const passed = ingested === 3 && skipped === 2 && afterCount === beforeCount + 3
    const detail = JSON.stringify({ beforeCount, afterCount, ingested, skipped, merged, expected: '3 ingested, 2 skipped (dedup)' })

    db.prepare(
      'INSERT INTO test_runs (id, scenario, run_at, passed, before_count, after_count, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(runId, scenario, now, passed ? 1 : 0, beforeCount, afterCount, detail)

    res.json({
      ok: true,
      data: { id: runId, scenario, runAt: now, passed, beforeCount, afterCount, detail },
    })
    return
  }

  if (scenario === 'dirty_snapshot_parse') {
    const beforeCount = (db.prepare('SELECT COUNT(*) as cnt FROM snapshots').get() as { cnt: number }).cnt
    const testSnapshots = [
      { tableName: 'test_tbl', fieldName: 'col_null', rawValue: '', notes: 'null test' },
      { tableName: 'test_tbl', fieldName: 'col_dup', rawValue: 'a,b,a,c,b', notes: 'duplicate test' },
      { tableName: 'test_tbl', fieldName: 'col_note', rawValue: 'x,y,# TODO: add z', notes: 'mixed note test' },
      { tableName: 'test_tbl', fieldName: 'col_clean', rawValue: 'foo,bar,baz', notes: 'clean test' },
    ]

    function parse(raw: string): { parsed: string[]; nullFlag: boolean; duplicateFlag: boolean; mixedNoteFlag: boolean } {
      if (!raw || raw.trim() === '') return { parsed: [], nullFlag: true, duplicateFlag: false, mixedNoteFlag: false }
      const mixedNoteFlag = /(\/\/|#|--|\/\*|\*\/|TODO|FIXME|NOTE)/i.test(raw)
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/#.*$/gm, '').replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
      if (!cleaned) return { parsed: [], nullFlag: true, duplicateFlag: false, mixedNoteFlag }
      const parts = cleaned.split(/[,，;；|/\s]+/).map((p) => p.trim()).filter(Boolean)
      const seen = new Set<string>()
      const unique: string[] = []
      let hasDup = false
      for (const p of parts) {
        if (seen.has(p)) hasDup = true
        else { seen.add(p); unique.push(p) }
      }
      return { parsed: unique, nullFlag: false, duplicateFlag: hasDup, mixedNoteFlag }
    }

    const insertStmt = db.prepare(
      'INSERT INTO snapshots (id, snapshot_at, table_name, field_name, raw_value, null_flag, duplicate_flag, mixed_note_flag, parsed_enum, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )

    const tx = db.transaction(() => {
      for (const s of testSnapshots) {
        const p = parse(s.rawValue || '')
        insertStmt.run(uuidv4(), now, s.tableName, s.fieldName, s.rawValue || null, p.nullFlag ? 1 : 0, p.duplicateFlag ? 1 : 0, p.mixedNoteFlag ? 1 : 0, p.parsed.join(','), s.notes)
      }
    })
    tx()

    const afterCount = (db.prepare('SELECT COUNT(*) as cnt FROM snapshots').get() as { cnt: number }).cnt
    const dirtyCount = (db.prepare("SELECT COUNT(*) as cnt FROM snapshots WHERE table_name = 'test_tbl' AND (null_flag = 1 OR duplicate_flag = 1 OR mixed_note_flag = 1)").get() as { cnt: number }).cnt
    const passed = afterCount === beforeCount + 4 && dirtyCount === 3
    const detail = JSON.stringify({ beforeCount, afterCount, dirtyCount, expected: '3 dirty (null, dup, note) + 1 clean' })

    db.prepare(
      'INSERT INTO test_runs (id, scenario, run_at, passed, before_count, after_count, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(runId, scenario, now, passed ? 1 : 0, beforeCount, afterCount, detail)

    res.json({
      ok: true,
      data: { id: runId, scenario, runAt: now, passed, beforeCount, afterCount, detail },
    })
    return
  }

  if (scenario === 'conclusion_ref_chain') {
    const beforeCount = (db.prepare('SELECT COUNT(*) as cnt FROM conclusion_refs').get() as { cnt: number }).cnt

    const driftRows = db.prepare('SELECT id FROM drift_records LIMIT 2').all() as { id: string }[]
    const materialRows = db.prepare('SELECT id FROM source_materials LIMIT 3').all() as { id: string }[]

    let created = 0
    const tx = db.transaction(() => {
      if (driftRows.length > 0 && materialRows.length > 0) {
        for (let i = 0; i < Math.min(driftRows.length, materialRows.length); i++) {
          db.prepare(
            'INSERT INTO conclusion_refs (id, drift_id, material_id, ref_role) VALUES (?, ?, ?, ?)'
          ).run(uuidv4(), driftRows[i].id, materialRows[i].id, i === 0 ? 'primary' : 'supporting')
          created++
        }
      }
    })
    tx()

    const afterCount = (db.prepare('SELECT COUNT(*) as cnt FROM conclusion_refs').get() as { cnt: number }).cnt
    const passed = afterCount === beforeCount + created && created >= 1
    const detail = JSON.stringify({ beforeCount, afterCount, created, driftLinked: driftRows.length, materialLinked: materialRows.length })

    db.prepare(
      'INSERT INTO test_runs (id, scenario, run_at, passed, before_count, after_count, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(runId, scenario, now, passed ? 1 : 0, beforeCount, afterCount, detail)

    res.json({
      ok: true,
      data: { id: runId, scenario, runAt: now, passed, beforeCount, afterCount, detail },
    })
    return
  }

  res.status(404).json({ ok: false, error: 'Scenario not found' })
})

export default router
