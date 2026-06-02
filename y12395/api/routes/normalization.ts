import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/groups', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const groups = db.prepare(`
      SELECT group_id, standard_name,
        GROUP_CONCAT(alias_name) as aliases,
        GROUP_CONCAT(version) as versions,
        MAX(normalized) as normalized
      FROM fingering_aliases
      GROUP BY group_id
      ORDER BY group_id
    `).all()

    const result = groups.map((g: Record<string, unknown>) => ({
      group_id: g.group_id,
      standard_name: g.standard_name,
      aliases: String(g.aliases ?? '').split(','),
      versions: String(g.versions ?? '').split(','),
      normalized: g.normalized === 1,
    }))

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch alias groups' })
  }
})

router.post('/normalize', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { group_id, standard_name, reason } = req.body

    if (!group_id || !standard_name) {
      res.status(400).json({ success: false, error: 'group_id and standard_name are required' })
      return
    }

    const aliases = db.prepare('SELECT * FROM fingering_aliases WHERE group_id = ?').all(group_id) as Record<string, unknown>[]
    if (aliases.length === 0) {
      res.status(404).json({ success: false, error: 'Alias group not found' })
      return
    }

    const transaction = db.transaction(() => {
      const insertSnapshot = db.prepare(`
        INSERT INTO change_snapshots (id, entity_type, entity_id, field, old_value, new_value, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      for (const alias of aliases) {
        const oldValue = String(alias.alias_name)
        if (oldValue !== standard_name) {
          insertSnapshot.run(
            uuidv4(),
            'fingering_alias',
            String(alias.id),
            'alias_name',
            oldValue,
            standard_name,
            reason ?? `规范化指法：统一为"${standard_name}"`,
          )
        }

        db.prepare(`
          UPDATE fingering_aliases
          SET standard_name = ?, alias_name = ?, normalized = 1, normalized_at = datetime('now')
          WHERE id = ?
        `).run(standard_name, standard_name, String(alias.id))
      }
    })

    transaction()

    const updated = db.prepare('SELECT * FROM fingering_aliases WHERE group_id = ?').all(group_id)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to normalize alias group' })
  }
})

router.get('/history', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const snapshots = db.prepare(`
      SELECT * FROM change_snapshots
      WHERE entity_type = 'fingering_alias'
      ORDER BY created_at DESC
    `).all()

    res.json({ success: true, data: snapshots })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch normalization history' })
  }
})

router.post('/rollback/:snapshotId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { snapshotId } = req.params

    const snapshot = db.prepare('SELECT * FROM change_snapshots WHERE id = ?').get(snapshotId) as Record<string, unknown> | undefined
    if (!snapshot) {
      res.status(404).json({ success: false, error: 'Snapshot not found' })
      return
    }

    const { entity_id, field, old_value } = snapshot

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO change_snapshots (id, entity_type, entity_id, field, old_value, new_value, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        'fingering_alias',
        String(entity_id),
        field,
        String(snapshot.new_value),
        String(old_value),
        `回滚操作：恢复快照 ${snapshotId}`,
      )

      if (field === 'alias_name') {
        db.prepare(`
          UPDATE fingering_aliases
          SET alias_name = ?, normalized = 0, normalized_at = NULL
          WHERE id = ?
        `).run(String(old_value), String(entity_id))
      }
    })

    transaction()

    const updated = db.prepare('SELECT * FROM fingering_aliases WHERE id = ?').get(String(entity_id))
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rollback normalization' })
  }
})

export default router
