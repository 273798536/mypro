import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { authMiddleware, requirePermission, AuthRequest, filterFieldsByRole } from '../middleware/auth'
import { CONFIG, BatchStatus, RecordStatus } from '../config'
import { transitionBatch, recalculateBatchStats } from '../services/stateMachine'
import { validateRecord, serializeJson, deserializeJson } from '../services/dataValidator'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()
router.use(authMiddleware)

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({ storage })

function generateBatchNo(recordType: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${recordType.toUpperCase()}-${date}-${random}`
}

router.post('/', requirePermission('batch:create'), async (req: AuthRequest, res) => {
  try {
    const { idempotencyKey, title, recordType, storeId, records } = req.body
    const user = req.user!

    const existing = await prisma.batch.findUnique({ where: { idempotencyKey } })
    if (existing) {
      return res.json({
        id: existing.id,
        batchNo: existing.batchNo,
        status: existing.status,
        isNew: false,
        message: '幂等命中，返回已存在批次'
      })
    }

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          idempotencyKey,
          batchNo: generateBatchNo(recordType),
          title,
          recordType,
          storeId,
          createdBy: user.id
        }
      })

      if (records && records.length > 0) {
        for (const recordData of records) {
          const recordIdempotencyKey = recordData.idempotencyKey || `${idempotencyKey}-${recordData.memberId || recordData.phone || Math.random()}`
          
          const validation = validateRecord({ ...recordData, recordType })
          const status = validation.isValid ? CONFIG.RECORD_STATUS.VALID : CONFIG.RECORD_STATUS.DIRTY

          await tx.record.create({
            data: {
              idempotencyKey: recordIdempotencyKey,
              batchId: newBatch.id,
              recordType,
              storeId,
              memberId: recordData.memberId,
              memberName: recordData.memberName,
              phone: recordData.phone,
              amount: recordData.amount,
              quantity: recordData.quantity,
              transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : null,
              operator: recordData.operator,
              originalContent: serializeJson(recordData),
              rawData: serializeJson(recordData),
              source: recordData.source || 'api',
              status,
              dirtyType: validation.dirtyType,
              dirtyRemark: validation.dirtyRemark,
              createdBy: user.id
            }
          })
        }
      }

      return newBatch
    })

    await recalculateBatchStats(batch.id)
    const updated = await prisma.batch.findUnique({ where: { id: batch.id } })

    res.status(201).json({
      ...filterFieldsByRole(updated!, user.role, 'batch'),
      isNew: true
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/records', requirePermission('record:create'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const { records } = req.body
    const user = req.user!

    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return res.status(404).json({ error: '批次不存在' })
    if (batch.status !== CONFIG.BATCH_STATUS.DRAFT) {
      return res.status(400).json({ error: '只能在草稿状态添加记录' })
    }

    const results = await Promise.all(records.map(async (recordData: any) => {
      const recordIdempotencyKey = recordData.idempotencyKey || `${batchId}-${recordData.memberId || recordData.phone || uuidv4()}`
      
      const existing = await prisma.record.findUnique({ where: { idempotencyKey: recordIdempotencyKey } })
      if (existing) {
        return { id: existing.id, isNew: false, message: '幂等命中，记录已存在' }
      }

      const validation = validateRecord({ ...recordData, recordType: batch.recordType as any })
      const status = validation.isValid ? CONFIG.RECORD_STATUS.VALID : CONFIG.RECORD_STATUS.DIRTY

      const record = await prisma.record.create({
        data: {
          idempotencyKey: recordIdempotencyKey,
          batchId,
          recordType: batch.recordType,
          storeId: batch.storeId,
          memberId: recordData.memberId,
          memberName: recordData.memberName,
          phone: recordData.phone,
          amount: recordData.amount,
          quantity: recordData.quantity,
          transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : null,
          operator: recordData.operator,
          originalContent: serializeJson(recordData),
          rawData: serializeJson(recordData),
          source: recordData.source || 'api',
          status,
          dirtyType: validation.dirtyType,
          dirtyRemark: validation.dirtyRemark,
          createdBy: user.id
        }
      })

      return { ...filterFieldsByRole(record, user.role, 'record'), isNew: true }
    }))

    await recalculateBatchStats(batchId)
    res.json(results)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/attachments', requirePermission('attachment:upload'), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const user = req.user!

    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return res.status(404).json({ error: '批次不存在' })

    const attachment = await prisma.attachment.create({
      data: {
        batchId,
        fileName: req.file!.originalname,
        fileType: req.file!.mimetype,
        fileSize: req.file!.size,
        storagePath: req.file!.path,
        uploadedBy: user.id
      }
    })

    res.status(201).json(attachment)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/submit', requirePermission('batch:submit'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const user = req.user!

    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.SUBMITTED, user.id, user.role)
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/review', requirePermission('batch:review'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const { reason } = req.body
    const user = req.user!

    await transitionBatch(batchId, CONFIG.BATCH_STATUS.REVIEWING, user.id, user.role)
    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.REVIEWED, user.id, user.role, reason)
    
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/freeze', requirePermission('batch:freeze'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const { reason } = req.body
    const user = req.user!

    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.FROZEN, user.id, user.role, reason)
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/settle', requirePermission('batch:*'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const { reason } = req.body
    const user = req.user!

    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.SETTLED, user.id, user.role, reason)
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/revoke', requirePermission('batch:*'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const { reason } = req.body
    const user = req.user!

    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.REVOKED, user.id, user.role, reason)
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:batchId/archive', requirePermission('batch:*'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const user = req.user!

    const updated = await transitionBatch(batchId, CONFIG.BATCH_STATUS.ARCHIVED, user.id, user.role)
    res.json(filterFieldsByRole(updated, user.role, 'batch'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:batchId', requirePermission('batch:view'), async (req: AuthRequest, res) => {
  try {
    const { batchId } = req.params
    const user = req.user!

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        records: true,
        attachments: true,
        statusHistories: { orderBy: { operatedAt: 'desc' } }
      }
    })

    if (!batch) return res.status(404).json({ error: '批次不存在' })

    const filteredBatch = filterFieldsByRole(batch, user.role, 'batch')
    const filteredRecords = batch.records.map(r => filterFieldsByRole({
      ...r,
      originalContent: deserializeJson(r.originalContent),
      rawData: deserializeJson(r.rawData)
    }, user.role, 'record'))

    res.json({ ...filteredBatch, records: filteredRecords })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/', requirePermission('batch:view'), async (req: AuthRequest, res) => {
  try {
    const { recordType, status, storeId, page = 1, limit = 20 } = req.query
    const user = req.user!

    const where: any = {}
    if (recordType) where.recordType = recordType
    if (status) where.status = status
    if (storeId) where.storeId = storeId

    const batches = await prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    })

    const total = await prisma.batch.count({ where })

    res.json({
      data: batches.map(b => filterFieldsByRole(b, user.role, 'batch')),
      total,
      page: Number(page),
      limit: Number(limit)
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/records/:recordId/resolve', requirePermission('record:resolve'), async (req: AuthRequest, res) => {
  try {
    const { recordId } = req.params
    const { resolution, remark } = req.body
    const user = req.user!

    const record = await prisma.record.findUnique({ where: { id: recordId } })
    if (!record) return res.status(404).json({ error: '记录不存在' })

    const updated = await prisma.record.update({
      where: { id: recordId },
      data: {
        status: CONFIG.RECORD_STATUS.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: user.id,
        resolveRemark: remark,
        ...(resolution && {
          memberId: resolution.memberId,
          memberName: resolution.memberName,
          amount: resolution.amount,
          quantity: resolution.quantity
        })
      }
    })

    await prisma.statusHistory.create({
      data: {
        recordId,
        fromStatus: record.status,
        toStatus: CONFIG.RECORD_STATUS.RESOLVED,
        reason: remark,
        operatorRole: user.role,
        operatedBy: user.id
      }
    })

    await recalculateBatchStats(updated.batchId)
    res.json(filterFieldsByRole(updated, user.role, 'record'))
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export { router as batchesRouter }
