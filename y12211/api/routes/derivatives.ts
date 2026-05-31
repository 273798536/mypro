import { Router } from 'express'
import type { DerivativeSale, CreateDerivativeData } from '../../shared/types'
import { mockDerivatives } from '../data/mockData'

const router = Router()

router.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const orderId = req.query.orderId as string
  const isSupplementary = req.query.isSupplementary as string
  const search = req.query.search as string

  let filtered = [...mockDerivatives]

  if (orderId) {
    filtered = filtered.filter(d => d.orderId === orderId)
  }
  if (isSupplementary !== undefined) {
    filtered = filtered.filter(d => d.isSupplementary === (isSupplementary === 'true'))
  }
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(
      d => d.productName.toLowerCase().includes(searchLower) ||
        d.saleNo.toLowerCase().includes(searchLower)
    )
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  res.json({ list, total, page, pageSize })
})

router.get('/:id', (req, res) => {
  const derivative = mockDerivatives.find(d => d.id === req.params.id)
  if (!derivative) {
    return res.status(404).json({ error: 'Derivative sale not found' })
  }
  res.json(derivative)
})

router.post('/', (req, res) => {
  const data: CreateDerivativeData = req.body
  const newDerivative: DerivativeSale = {
    id: Math.random().toString(36).substring(2, 10),
    saleNo: `DV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    orderId: data.orderId,
    productId: data.productId,
    productName: data.productName,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    totalAmount: data.quantity * data.unitPrice,
    saleTime: data.saleTime,
    isSupplementary: data.isSupplementary ?? false,
    supplementaryNote: data.supplementaryNote,
    createdAt: new Date().toISOString(),
  }
  mockDerivatives.unshift(newDerivative)
  res.status(201).json(newDerivative)
})

router.put('/:id/link-order', (req, res) => {
  const derivative = mockDerivatives.find(d => d.id === req.params.id)
  if (!derivative) {
    return res.status(404).json({ error: 'Derivative sale not found' })
  }
  derivative.orderId = req.body.orderId
  res.json(derivative)
})

export default router
