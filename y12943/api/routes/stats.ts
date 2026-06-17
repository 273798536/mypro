import { Router, type Response } from 'express'
import {
  countSlicesByStatus,
  countSlicesByBadType,
  getDupPairs,
} from '../store.js'
import type { OverviewStats } from '../../shared/types.js'

const router = Router()

router.get('/overview', (_req, res: Response): void => {
  const status = countSlicesByStatus()
  const badTypeCounts = countSlicesByBadType()
  const pairs = getDupPairs()
  const dedupCount = pairs.length
  const overview: OverviewStats = {
    total: status.total,
    pass: status.pass,
    pending: status.pending,
    bad: status.bad,
    badTypeCounts,
    dedup: {
      dedupCount,
      explainable: dedupCount > 0,
      detail:
        dedupCount > 0
          ? `共 ${dedupCount} 条脏样本重复被归并：${pairs
              .map((p) => `${p.from}→${p.to}`)
              .join('、')}，均依据内容哈希碰撞归并，来源可解释。`
          : '无重复样本，无需归并。',
      pairs,
    },
  }
  res.json({ success: true, data: overview })
})

export default router
