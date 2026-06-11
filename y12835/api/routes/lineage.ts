import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import type { CryoRecord, LineageNode, LineageResponse } from '../types.js'

const router = Router()

function findRoot(db: ReturnType<typeof getDb>, recordId: string): CryoRecord | null {
  let current = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(recordId) as CryoRecord | undefined
  if (!current) return null

  const visited = new Set<string>()
  while (current.parent_record_id) {
    if (visited.has(current.id)) break
    visited.add(current.id)
    const parent = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(current.parent_record_id) as CryoRecord | undefined
    if (!parent) break
    current = parent
  }
  return current
}

function buildTree(db: ReturnType<typeof getDb>, recordId: string): LineageNode {
  const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(recordId) as CryoRecord
  const children = db.prepare('SELECT id FROM cryo_records WHERE parent_record_id = ?').all(recordId) as { id: string }[]

  return {
    record,
    children: children.map(child => buildTree(db, child.id)),
  }
}

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const root = findRoot(db, req.params.id)
  if (!root) {
    res.status(404).json({ success: false, error: '未找到该记录，无法追溯谱系' })
    return
  }

  const tree = buildTree(db, root.id)
  const response: LineageResponse = {
    root: tree.record,
    children: tree.children,
  }

  res.json({ success: true, data: response })
})

export default router
