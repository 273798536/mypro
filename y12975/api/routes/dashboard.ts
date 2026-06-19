import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/stats', (_req: Request, res: Response) => {
  const pendingCount = (db.prepare('SELECT COUNT(*) as cnt FROM drift_records WHERE status = ?').get('pending') as { cnt: number }).cnt
  const reviewedCount = (db.prepare('SELECT COUNT(*) as cnt FROM drift_records WHERE status = ?').get('reviewed') as { cnt: number }).cnt
  const directUseCount = (db.prepare('SELECT COUNT(*) as cnt FROM drift_records WHERE confidence = ?').get('direct_use') as { cnt: number }).cnt
  const needsReviewCount = (db.prepare('SELECT COUNT(*) as cnt FROM drift_records WHERE confidence = ?').get('needs_review') as { cnt: number }).cnt

  const materialStats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN complete = 1 THEN 1 ELSE 0 END) as complete FROM source_materials').get() as { total: number; complete: number }

  const duplicateExecCount = (db.prepare('SELECT COUNT(*) as cnt FROM migration_executions WHERE duplicate_flag = 1').get() as { cnt: number }).cnt
  const dirtySnapshotCount = (db.prepare('SELECT COUNT(*) as cnt FROM snapshots WHERE null_flag = 1 OR duplicate_flag = 1 OR mixed_note_flag = 1').get() as { cnt: number }).cnt

  const recentRollbacks = db.prepare('SELECT * FROM rollback_records ORDER BY rollback_at DESC LIMIT 5').all()
  const recentCorrections = db.prepare('SELECT * FROM drift_records WHERE status IN (?, ?, ?) ORDER BY updated_at DESC LIMIT 5').all('corrected', 'reviewed', 'rolled_back')

  res.json({
    ok: true,
    data: {
      pendingCount,
      reviewedCount,
      directUseCount,
      needsReviewCount,
      materialCompleteRate: {
        complete: materialStats.complete || 0,
        total: materialStats.total || 0,
      },
      duplicateExecCount,
      dirtySnapshotCount,
      recentRollbacks,
      recentCorrections,
    },
  })
})

export default router
