import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const record = db.prepare('SELECT id FROM records WHERE id = ?').get(id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const annotations = db.prepare('SELECT * FROM annotations WHERE recordId = ? ORDER BY createdAt ASC').all(id)
    res.json({ success: true, data: annotations })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch annotations' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const record = db.prepare('SELECT id FROM records WHERE id = ?').get(id)
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const { photoId, type, position, content, createdBy } = req.body
    if (!type || !createdBy) {
      res.status(400).json({ success: false, error: 'type and createdBy are required' })
      return
    }

    const annotationId = uuidv4()
    db.prepare(
      `INSERT INTO annotations (id, recordId, photoId, type, position, content, createdBy, createdAt)
       VALUES (@id, @recordId, @photoId, @type, @position, @content, @createdBy, datetime('now'))`
    ).run({
      id: annotationId,
      recordId: id,
      photoId: photoId || null,
      type,
      position: JSON.stringify(position || {}),
      content: content || '',
      createdBy,
    })

    const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(annotationId)
    res.status(201).json({ success: true, data: annotation })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create annotation' })
  }
})

router.put('/:annotationId', (req: Request, res: Response): void => {
  try {
    const { annotationId } = req.params
    const existing = db.prepare('SELECT * FROM annotations WHERE id = ?').get(annotationId) as Record<string, unknown> | undefined
    if (!existing) {
      res.status(404).json({ success: false, error: 'Annotation not found' })
      return
    }

    const { type, position, content } = req.body
    db.prepare(
      `UPDATE annotations SET type = @type, position = @position, content = @content WHERE id = @id`
    ).run({
      type: type || (existing.type as string),
      position: JSON.stringify(position || JSON.parse(existing.position as string)),
      content: content !== undefined ? content : (existing.content as string),
      id: annotationId,
    })

    const updated = db.prepare('SELECT * FROM annotations WHERE id = ?').get(annotationId)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update annotation' })
  }
})

router.delete('/:annotationId', (req: Request, res: Response): void => {
  try {
    const { annotationId } = req.params
    const existing = db.prepare('SELECT id FROM annotations WHERE id = ?').get(annotationId)
    if (!existing) {
      res.status(404).json({ success: false, error: 'Annotation not found' })
      return
    }

    db.prepare('DELETE FROM annotations WHERE id = ?').run(annotationId)
    res.json({ success: true, message: 'Annotation deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete annotation' })
  }
})

export default router
