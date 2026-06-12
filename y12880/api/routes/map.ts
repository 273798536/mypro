import { Router, type Request, type Response } from 'express'
import { getPlatforms, getPlatformDetail, getSeaLayer } from '../services/mapService.js'

const router = Router()

router.get('/platforms', (_req: Request, res: Response) => {
  try {
    const result = getPlatforms()
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/platforms/:id', (req: Request, res: Response) => {
  try {
    const result = getPlatformDetail(req.params.id)
    res.json(result)
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message })
  }
})

router.get('/sealayer', (req: Request, res: Response) => {
  try {
    const type = (req.query.type as 'tide' | 'wave' | 'wind') || 'tide'
    const time = req.query.time as string | undefined
    const result = getSeaLayer(type, time)
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
