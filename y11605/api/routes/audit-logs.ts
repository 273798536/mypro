import express from 'express'
import { getAuditLogs } from '../services/auditService'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { entityType, entityId, page = 1, pageSize = 50 } = req.query
    const result = await getAuditLogs(
      entityType as string,
      entityId as string,
      Number(page),
      Number(pageSize)
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
