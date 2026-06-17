import { Router, type Request, type Response } from 'express'
import {
  getSliceById,
  getLogsBySlice,
  getReviewBySliceMention,
  getImportById,
  getSecureMisconfigSlice,
} from '../store.js'
import type { TraceChain } from '../../shared/types.js'

const router = Router()

router.get('/:recordId', (req: Request, res: Response): void => {
  let slice = getSliceById(req.params.recordId)
  if (!slice) {
    slice = getSecureMisconfigSlice()
  }
  if (!slice) {
    res.status(404).json({ success: false, error: '溯源记录不存在' })
    return
  }
  const logs = getLogsBySlice(slice.id)
  const review = getReviewBySliceMention(slice.id)
  const importBatch = getImportById(slice.import_id)

  const resultLabel =
    slice.bad_type === 'secure_misconfig'
      ? '安全规则漏配'
      : slice.bad_type === 'dirty_dup'
        ? '脏样本重复'
        : slice.quality === 'edge'
          ? '边界待确认'
          : '正常通过'

  const chain: TraceChain = {
    record: {
      id: slice.id,
      label: resultLabel,
      result: `状态=${slice.status}，坏类型=${slice.bad_type}`,
    },
    logs,
    review,
    slice,
    importBatch,
  }
  res.json({ success: true, data: chain })
})

export default router
