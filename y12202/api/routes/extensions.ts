import { Router, type Request, type Response } from 'express'
import {
  listExtensions,
  getExtensionDetail,
  createDraft,
  autoSave,
  submitExtension,
  approveExtension,
  rejectExtension,
  addMaterial,
  removeMaterial,
  removeExtension,
} from '../services/extension.js'
import { getRisksForExtension, detectRisksForExtension } from '../services/risk-detection.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const filters: { contract_id?: string; status?: string } = {}
    if (req.query.contract_id) filters.contract_id = req.query.contract_id as string
    if (req.query.status) filters.status = req.query.status as string
    const extensions = listExtensions(filters)
    res.json({ success: true, data: extensions })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const detail = getExtensionDetail(req.params.id)
    if (!detail) {
      res.status(404).json({ success: false, error: '展期申请不存在' })
      return
    }
    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { contract_id, original_end_date, new_end_date, extension_reason, created_by } = req.body
    if (!contract_id || !original_end_date || !new_end_date || !extension_reason || !created_by) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const extension = createDraft({ contract_id, original_end_date, new_end_date, extension_reason, created_by })
    res.status(201).json({ success: true, data: extension })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const { new_end_date, extension_reason } = req.body
    const result = autoSave(req.params.id, { new_end_date, extension_reason })
    if (!result) {
      res.status(400).json({ success: false, error: '自动保存失败，展期申请不存在或非草稿状态' })
      return
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const result = removeExtension(req.params.id)
    if (!result) {
      res.status(400).json({ success: false, error: '删除失败，展期申请不存在或非草稿状态' })
      return
    }
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/submit', (req: Request, res: Response): void => {
  try {
    const result = submitExtension(req.params.id)
    if (!result) {
      res.status(400).json({ success: false, error: '提交失败，展期申请不存在或非草稿状态' })
      return
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/approve', (req: Request, res: Response): void => {
  try {
    const { approver_name, approver_role, opinion } = req.body
    if (!approver_name || !approver_role) {
      res.status(400).json({ success: false, error: '缺少审批人信息' })
      return
    }
    const result = approveExtension(req.params.id, approver_name, approver_role, opinion ?? null)
    if (!result) {
      res.status(400).json({ success: false, error: '审批失败，展期申请不存在或非待审批状态' })
      return
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/reject', (req: Request, res: Response): void => {
  try {
    const { approver_name, approver_role, opinion } = req.body
    if (!approver_name || !approver_role) {
      res.status(400).json({ success: false, error: '缺少审批人信息' })
      return
    }
    const result = rejectExtension(req.params.id, approver_name, approver_role, opinion ?? null)
    if (!result) {
      res.status(400).json({ success: false, error: '驳回失败，展期申请不存在或非待审批状态' })
      return
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/materials', (req: Request, res: Response): void => {
  try {
    const detail = getExtensionDetail(req.params.id)
    if (!detail) {
      res.status(404).json({ success: false, error: '展期申请不存在' })
      return
    }
    res.json({ success: true, data: detail.materials })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/materials', (req: Request, res: Response): void => {
  try {
    const { name, type, category, source_person } = req.body
    if (!name || !type || !category || !source_person) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const material = addMaterial(req.params.id, { name, type, category, source_person })
    if (!material) {
      res.status(404).json({ success: false, error: '展期申请不存在' })
      return
    }
    res.status(201).json({ success: true, data: material })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:extensionId/materials/:materialId', (req: Request, res: Response): void => {
  try {
    const result = removeMaterial(req.params.materialId)
    if (!result) {
      res.status(404).json({ success: false, error: '材料不存在' })
      return
    }
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/detect-risks', (req: Request, res: Response): void => {
  try {
    const risks = detectRisksForExtension(req.params.id)
    res.json({ success: true, data: risks })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id/risks', (req: Request, res: Response): void => {
  try {
    const risks = getRisksForExtension(req.params.id)
    res.json({ success: true, data: risks })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
