import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { query, versions, types } = req.body

    if (!query && !versions && !types) {
      res.status(400).json({ success: false, error: 'At least one search criterion is required' })
      return
    }

    const conditions: string[] = []
    const params: unknown[] = []

    if (query) {
      conditions.push('(title LIKE ? OR content LIKE ?)')
      params.push(`%${query}%`, `%${query}%`)
    }

    if (versions && Array.isArray(versions) && versions.length > 0) {
      const placeholders = versions.map(() => '?').join(',')
      conditions.push(`version IN (${placeholders})`)
      params.push(...versions)
    }

    if (types && Array.isArray(types) && types.length > 0) {
      const placeholders = types.map(() => '?').join(',')
      conditions.push(`type IN (${placeholders})`)
      params.push(...types)
    }

    const sql = `SELECT * FROM source_materials WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`
    const results = db.prepare(sql).all(...params)

    const enriched = results.map((row: Record<string, unknown>) => {
      const id = String(row.id)
      const aliases = db.prepare(`
        SELECT fa.* FROM fingering_aliases fa
        WHERE fa.version = ?
      `).all(String(row.version)) as Record<string, unknown>[]

      const relatedAliases = aliases.filter(
        (a) => String(row.content ?? '').includes(String(a.alias_name)) || String(row.content ?? '').includes(String(a.standard_name)),
      )

      return {
        ...row,
        related_aliases: relatedAliases,
      }
    })

    res.json({ success: true, data: enriched })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search materials' })
  }
})

export default router
