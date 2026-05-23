import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import multer from 'multer'
import { AuthRequest, authenticate, filterFieldsByRole } from '../middleware/auth'
import { receiptService } from '../services/receiptService'
import { attachmentService } from '../services/attachmentService'
import { exportService } from '../services/exportService'
import { ReceiptStatus, UserRole, AttachmentType } from '../types/enums'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(authenticate)

router.post(
  '/',
  [
    body('batchNo').notEmpty().withMessage('批次号不能为空'),
    body('clinicId').notEmpty().withMessage('院区ID不能为空')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: '未认证' })

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const receipt = await receiptService.createBatch(
        req.body,
        req.user.id,
        req.user.clinicId || ''
      )

      const filtered = filterFieldsByRole(receipt, req.user.role)
      res.status(201).json(filtered)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  }
)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const { status, page, pageSize } = req.query
    const result = await receiptService.list({
      clinicId: req.user.role === UserRole.SUPERVISOR ? undefined : req.user.clinicId || undefined,
      status: status as ReceiptStatus | undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    })

    const filteredItems = result.items.map(item => filterFieldsByRole(item, req.user!.role))
    res.json({ ...result, items: filteredItems })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/director-view', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可查看' })
    }

    const { status } = req.query
    const view = await exportService.getDirectorView({
      clinicId: req.user.clinicId || undefined,
      status: status as ReceiptStatus | undefined
    })

    res.json(view)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/frozen', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足' })
    }

    const frozen = await exportService.getFrozenReceipts(req.user.clinicId || undefined)
    res.json(frozen)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR && req.user.role !== UserRole.READ_ONLY) {
      return res.status(403).json({ error: '权限不足' })
    }

    const csvPath = await exportService.exportToCSV({
      clinicId: req.user.clinicId || undefined
    })

    res.download(csvPath)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const receipt = await receiptService.getById(req.params.id)
    if (!receipt) {
      return res.status(404).json({ error: '回执不存在' })
    }

    const filtered = filterFieldsByRole(receipt, req.user.role)
    res.json(filtered)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id/change-logs', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const logs = await receiptService.getChangeLogs(req.params.id)
    res.json(logs)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const receipt = await receiptService.submitForReview(
      req.params.id,
      req.user.id,
      req.user.role
    )

    const filtered = filterFieldsByRole(receipt, req.user.role)
    res.json(filtered)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/review', [
  body('approved').isBoolean().withMessage('approved 必须是布尔值')
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { approved, reason } = req.body
    const receipt = await receiptService.review(
      req.params.id,
      approved,
      req.user.id,
      req.user.role,
      reason
    )

    const filtered = filterFieldsByRole(receipt, req.user.role)
    res.json(filtered)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/overrule', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可改判' })
    }

    const { reason } = req.body
    const receipt = await receiptService.reviewOverrule(req.params.id, req.user.id, reason)

    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/freeze', [
  body('reason').notEmpty().withMessage('冻结原因不能为空')
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可冻结' })
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { reason } = req.body
    const receipt = await receiptService.freeze(req.params.id, req.user.id, reason)

    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/unfreeze', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可解冻' })
    }

    const { reason } = req.body
    const receipt = await receiptService.unfreeze(req.params.id, req.user.id, reason)

    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/settle', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可结算' })
    }

    const receipt = await receiptService.settle(req.params.id, req.user.id)
    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const receipt = await receiptService.cancel(req.params.id, req.user.id, req.user.role)
    const filtered = filterFieldsByRole(receipt, req.user.role)
    res.json(filtered)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/archive', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可归档' })
    }

    const receipt = await receiptService.archive(req.params.id, req.user.id)
    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可恢复' })
    }

    const receipt = await receiptService.restore(req.params.id, req.user.id)
    res.json(receipt)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/:id/attachments', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' })
    }

    const { type, description } = req.body
    const attachment = await attachmentService.uploadAttachment(
      req.params.id,
      req.file,
      type as AttachmentType,
      req.user.id,
      description
    )

    res.status(201).json(attachment)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/:id/attachments', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })

    const attachments = await attachmentService.getAttachments(req.params.id)
    res.json(attachments)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.patch('/dirty-records/:dirtyRecordId', [
  body('handleOpinion').notEmpty().withMessage('处理意见不能为空')
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: '未认证' })
    if (req.user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({ error: '权限不足，仅主管可处理脏记录' })
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { handleOpinion, correctedValue } = req.body
    const dirtyRecord = await receiptService.updateDirtyRecord(
      req.params.dirtyRecordId,
      req.user.id,
      { handleOpinion, correctedValue }
    )

    res.json(dirtyRecord)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

export default router
