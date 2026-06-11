import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db.js'
import { runAllDetectors } from '../services/anomalyDetector.js'
import type { RecordListQuery, CreateRecordRequest, CreateRecordResponse, CryoRecord, MicroPhoto, ReagentBatch } from '../types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
      cb(null, uploadsDir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { cell_line, type, status, page = '1', limit = '20', search } = req.query as RecordListQuery

  const conditions: string[] = []
  const params: unknown[] = []

  if (cell_line) { conditions.push('cell_line = ?'); params.push(cell_line) }
  if (type) { conditions.push('type = ?'); params.push(type) }
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (search) {
    conditions.push('(cell_line LIKE ? OR operator LIKE ? OR notes LIKE ?)')
    const like = `%${search}%`
    params.push(like, like, like)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))
  const offset = (pageNum - 1) * limitNum

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM cryo_records ${where}`).get(...params) as { cnt: number }).cnt
  const records = db.prepare(`SELECT * FROM cryo_records ${where} ORDER BY date DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset) as CryoRecord[]

  res.json({ success: true, data: records, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(req.params.id) as CryoRecord | undefined
  if (!record) { res.status(404).json({ success: false, error: '未找到该冻存/复苏记录，请检查ID是否正确' }); return }

  const photos = db.prepare('SELECT * FROM micro_photos WHERE record_id = ?').all(record.id) as MicroPhoto[]
  const reagent = db.prepare('SELECT * FROM reagent_batches WHERE id = ?').get(record.reagent_batch_id) as ReagentBatch | undefined

  res.json({ success: true, data: { ...record, photos, reagent } })
})

router.post('/', (req: Request, res: Response): void => {
  const body = req.body as CreateRecordRequest
  if (!body.type || !body.cell_line || !body.operator || !body.date || !body.reagent_batch_id) {
    res.status(400).json({ success: false, error: '缺少必填字段，请提供type、cell_line、operator、date、reagent_batch_id' })
    return
  }
  if (body.type !== 'freeze' && body.type !== 'thaw') {
    res.status(400).json({ success: false, error: 'type字段必须为freeze或thaw' })
    return
  }

  const db = getDb()
  const batch = db.prepare('SELECT id FROM reagent_batches WHERE id = ?').get(body.reagent_batch_id)
  if (!batch) { res.status(400).json({ success: false, error: '试剂批号不存在，请先创建对应的试剂批次' }); return }

  if (body.parent_record_id) {
    const parent = db.prepare('SELECT id FROM cryo_records WHERE id = ?').get(body.parent_record_id)
    if (!parent) { res.status(400).json({ success: false, error: '父级记录不存在，请检查parent_record_id' }); return }
  }

  const id = uuid()
  const now = new Date().toISOString()
  const status = 'usable'

  db.prepare(
    `INSERT INTO cryo_records (id, type, cell_line, passage_number, operator, date, freezing_medium, reagent_batch_id, storage_location, viability_rate, conclusion, status, parent_record_id, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, body.type, body.cell_line, body.passage_number, body.operator, body.date,
    body.freezing_medium || '', body.reagent_batch_id, body.storage_location || '',
    body.viability_rate ?? null, 'pending', status,
    body.parent_record_id || null, body.notes || '', now, now)

  const { warnings, anomaly_ids } = runAllDetectors(id)
  const record = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(id) as CryoRecord

  const response: CreateRecordResponse = { record, warnings, anomaly_ids }
  res.status(201).json({ success: true, data: response })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(req.params.id) as CryoRecord | undefined
  if (!existing) { res.status(404).json({ success: false, error: '未找到该记录，无法更新' }); return }

  const body = req.body
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE cryo_records SET type=COALESCE(?,type), cell_line=COALESCE(?,cell_line), passage_number=COALESCE(?,passage_number),
     operator=COALESCE(?,operator), date=COALESCE(?,date), freezing_medium=COALESCE(?,freezing_medium),
     reagent_batch_id=COALESCE(?,reagent_batch_id), storage_location=COALESCE(?,storage_location),
     viability_rate=COALESCE(?,viability_rate), conclusion=COALESCE(?,conclusion), status=COALESCE(?,status),
     parent_record_id=COALESCE(?,parent_record_id), notes=COALESCE(?,notes), updated_at=? WHERE id=?`
  ).run(
    body.type ?? null, body.cell_line ?? null, body.passage_number ?? null,
    body.operator ?? null, body.date ?? null, body.freezing_medium ?? null,
    body.reagent_batch_id ?? null, body.storage_location ?? null,
    body.viability_rate ?? null, body.conclusion ?? null, body.status ?? null,
    body.parent_record_id ?? null, body.notes ?? null, now, req.params.id
  )

  if (body.viability_rate !== undefined || body.type) {
    runAllDetectors(req.params.id)
  }

  const updated = db.prepare('SELECT * FROM cryo_records WHERE id = ?').get(req.params.id) as CryoRecord
  res.json({ success: true, data: updated })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM cryo_records WHERE id = ?').get(req.params.id)
  if (!existing) { res.status(404).json({ success: false, error: '未找到该记录，无法删除' }); return }

  db.prepare('DELETE FROM cryo_records WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: '记录已删除' })
})

router.post('/:id/photos', upload.single('photo'), (req: Request, res: Response): void => {
  const db = getDb()
  const record = db.prepare('SELECT id FROM cryo_records WHERE id = ?').get(req.params.id)
  if (!record) { res.status(404).json({ success: false, error: '未找到该记录，无法上传照片' }); return }

  if (!req.file) { res.status(400).json({ success: false, error: '请选择要上传的照片文件' }); return }

  const photoType = req.body.photo_type as MicroPhoto['photo_type']
  if (!photoType || !['pre_freeze', 'post_thaw', 'observation'].includes(photoType)) {
    res.status(400).json({ success: false, error: 'photo_type必须为pre_freeze、post_thaw或observation' })
    return
  }

  const id = uuid()
  const now = new Date().toISOString()
  const filePath = `uploads/${req.file.filename}`

  db.prepare(
    'INSERT INTO micro_photos (id, record_id, file_path, label, photo_type, uploaded_at) VALUES (?,?,?,?,?,?)'
  ).run(id, req.params.id, filePath, req.body.label || '', photoType, now)

  runAllDetectors(req.params.id)

  const photo = db.prepare('SELECT * FROM micro_photos WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: photo })
})

export default router
