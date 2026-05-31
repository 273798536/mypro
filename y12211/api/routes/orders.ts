import { Router } from 'express'
import type { TicketOrder, CreateOrderData } from '../../shared/types'
import { mockOrders, mockSplitResults } from '../data/mockData'
import { splitEngine } from '../services/SplitEngine'

const router = Router()

router.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const status = req.query.status as string
  const exhibitionId = req.query.exhibitionId as string
  const search = req.query.search as string

  let filtered = [...mockOrders]

  if (status) {
    filtered = filtered.filter(o => o.status === status)
  }
  if (exhibitionId) {
    filtered = filtered.filter(o => o.exhibitionId === exhibitionId)
  }
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(
      o => o.orderNo.toLowerCase().includes(searchLower) ||
        o.buyerName?.toLowerCase().includes(searchLower)
    )
  }

  const total = filtered.length
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  res.json({ list, total, page, pageSize })
})

router.get('/:id', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.id)
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }
  res.json(order)
})

router.post('/', (req, res) => {
  const data: CreateOrderData = req.body
  const newOrder: TicketOrder = {
    id: Math.random().toString(36).substring(2, 10),
    orderNo: `TK${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    exhibitionId: data.exhibitionId,
    exhibitionName: data.exhibitionName,
    ticketType: data.ticketType,
    totalAmount: data.totalAmount,
    ticketCount: data.ticketCount,
    buyerName: data.buyerName,
    buyerPhone: data.buyerPhone,
    orderTime: data.orderTime,
    status: 'PENDING',
    isComboSplit: data.isComboSplit ?? false,
    hasRefund: data.hasRefund ?? false,
    refundCrossExhibition: data.refundCrossExhibition ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mockOrders.unshift(newOrder)
  res.status(201).json(newOrder)
})

router.post('/:id/split', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.id)
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const ruleId = req.body.ruleId || order.splitRuleId || 'RULE001'
  const { result, exceptions } = splitEngine.processSplit(order, ruleId)

  if (result) {
    const existingIndex = mockSplitResults.findIndex(r => r.orderId === order.id)
    if (existingIndex >= 0) {
      mockSplitResults[existingIndex] = result
    } else {
      mockSplitResults.push(result)
    }

    order.status = exceptions.some(e => e.severity === 'ERROR') ? 'EXCEPTION' : 'PROCESSED'
    order.splitRuleId = ruleId
    order.updatedAt = new Date().toISOString()
  }

  res.json({ result, exceptions })
})

router.get('/:id/derivatives', (req, res) => {
  const { mockDerivatives } = require('../data/mockData')
  const derivatives = mockDerivatives.filter((d: any) => d.orderId === req.params.id)
  res.json(derivatives)
})

router.get('/:id/split-result', (req, res) => {
  const result = mockSplitResults.find(r => r.orderId === req.params.id)
  if (!result) {
    return res.status(404).json({ error: 'Split result not found' })
  }
  res.json(result)
})

export default router
