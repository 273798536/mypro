import { Router, type Request, type Response } from 'express'
import { getSlicesByFilter, getSliceById, getSampleTrio } from '../store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const filter = (req.query.filter as string) ?? 'all'
  const slices = getSlicesByFilter(filter)
  res.json({ success: true, data: slices })
})

router.get('/samples', (_req: Request, res: Response): void => {
  const trio = getSampleTrio()
  res.json({ success: true, data: trio })
})

router.get('/:id', (req: Request, res: Response): void => {
  const slice = getSliceById(req.params.id)
  if (!slice) {
    res.status(404).json({ success: false, error: '切片不存在' })
    return
  }
  res.json({ success: true, data: slice })
})

export default router
