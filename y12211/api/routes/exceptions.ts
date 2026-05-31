import { Router } from 'express'
import type { ExceptionItem, ResolveExceptionData } from '../../shared/types'
import { mockExceptions } from '../data/mockData'

const router = Router()

router.get('/', (req, res) => {
  const severity = req.query.severity as string
  const status = req.query.status as string
  const type = req.query.type as string

  let filtered = [...mockExceptions]

  if (severity) {
    filtered = filtered.filter(e => e.severity === severity)
  }
  if (status) {
    filtered = filtered.filter(e => e.status === status)
  }
  if (type) {
    filtered = filtered.filter(e => e.type === type)
  }

  res.json(filtered)
})

router.get('/stats', (req, res) => {
  const pendingCount = mockExceptions.filter(e => e.severity === 'PENDING' && e.status === 'OPEN').length
  const errorCount = mockExceptions.filter(e => e.severity === 'ERROR').length
  const processingCount = mockExceptions.filter(e => e.status === 'PROCESSING').length
  const resolvedCount = mockExceptions.filter(e => e.status === 'RESOLVED').length

  res.json({
    pending: pendingCount,
    error: errorCount,
    processing: processingCount,
    resolved: resolvedCount,
    total: mockExceptions.length,
  })
})

router.get('/:id', (req, res) => {
  const exception = mockExceptions.find(e => e.id === req.params.id)
  if (!exception) {
    return res.status(404).json({ error: 'Exception not found' })
  }
  res.json(exception)
})

router.post('/:id/resolve', (req, res) => {
  const exception = mockExceptions.find(e => e.id === req.params.id)
  if (!exception) {
    return res.status(404).json({ error: 'Exception not found' })
  }

  const data: ResolveExceptionData = req.body
  
  exception.status = 'RESOLVED'
  exception.resolvedAt = new Date().toISOString()
  exception.resolutionNote = data.resolutionNote
  exception.updatedAt = new Date().toISOString()

  res.json(exception)
})

router.put('/:id/assign', (req, res) => {
  const exception = mockExceptions.find(e => e.id === req.params.id)
  if (!exception) {
    return res.status(404).json({ error: 'Exception not found' })
  }

  exception.assignee = req.body.assignee
  exception.status = 'PROCESSING'
  exception.updatedAt = new Date().toISOString()

  res.json(exception)
})

export default router
