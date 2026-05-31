import { Router } from 'express'
import { mockSplitResults, mockOrders, mockRules } from '../data/mockData'

const router = Router()

router.get('/results', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const exhibitionId = req.query.exhibitionId as string
  const status = req.query.status as string

  let results = [...mockSplitResults]

  if (exhibitionId) {
    const orderIds = mockOrders
      .filter(o => o.exhibitionId === exhibitionId)
      .map(o => o.id)
    results = results.filter(r => orderIds.includes(r.orderId))
  }
  if (status) {
    results = results.filter(r => r.status === status)
  }

  const total = results.length
  const start = (page - 1) * pageSize
  const list = results.slice(start, start + pageSize)

  const enriched = list.map(r => {
    const order = mockOrders.find(o => o.id === r.orderId)
    const rule = mockRules.find(rl => rl.id === r.ruleId)
    return {
      ...r,
      orderNo: order?.orderNo,
      exhibitionName: order?.exhibitionName,
      ruleName: rule?.ruleName,
    }
  })

  res.json({ list: enriched, total, page, pageSize })
})

router.get('/summary', (req, res) => {
  const exhibitionId = req.query.exhibitionId as string

  let results = [...mockSplitResults]
  if (exhibitionId) {
    const orderIds = mockOrders
      .filter(o => o.exhibitionId === exhibitionId)
      .map(o => o.id)
    results = results.filter(r => orderIds.includes(r.orderId))
  }

  const totalRevenue = results.reduce((sum, r) => sum + r.finalAmount, 0)
  const totalProcessed = results.length
  const avgSplit = totalProcessed > 0 ? totalRevenue / totalProcessed : 0

  const byRecipient: Record<string, number> = {}
  results.forEach(r => {
    r.splitDetails.forEach(d => {
      byRecipient[d.recipient] = (byRecipient[d.recipient] || 0) + d.amount
    })
  })

  const byRule: Record<string, number> = {}
  results.forEach(r => {
    const rule = mockRules.find(rl => rl.id === r.ruleId)
    if (rule) {
      byRule[rule.ruleName] = (byRule[rule.ruleName] || 0) + r.finalAmount
    }
  })

  res.json({
    totalRevenue,
    totalProcessed,
    avgSplit,
    byRecipient,
    byRule,
  })
})

router.get('/waterfall', (req, res) => {
  const orderId = req.query.orderId as string
  const ruleId = req.query.ruleId as string
  const version = parseInt(req.query.version as string) || 1
  const sampleAmount = parseInt(req.query.sampleAmount as string) || 1000

  const { splitEngine } = require('../services/SplitEngine')
  const config = splitEngine.getRuleVersion(ruleId, version)

  if (!config) {
    return res.status(404).json({ error: 'Rule version not found' })
  }

  const details = splitEngine.calculateWaterfall(sampleAmount, config)
  res.json(details)
})

router.get('/trace/forward/:orderId', (req, res) => {
  const order = mockOrders.find(o => o.id === req.params.orderId)
  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  const splitResult = mockSplitResults.find(r => r.orderId === order.id)
  const exceptions = require('../data/mockData').mockExceptions.filter((e: any) => e.orderId === order.id)
  const derivatives = require('../data/mockData').mockDerivatives.filter((d: any) => d.orderId === order.id)
  const rule = splitResult ? mockRules.find(r => r.id === splitResult.ruleId) : null

  res.json({
    order,
    splitResult,
    rule,
    exceptions,
    derivatives,
  })
})

router.get('/trace/backward/:resultId', (req, res) => {
  const splitResult = mockSplitResults.find(r => r.id === req.params.resultId)
  if (!splitResult) {
    return res.status(404).json({ error: 'Split result not found' })
  }

  const order = mockOrders.find(o => o.id === splitResult.orderId)
  const derivatives = require('../data/mockData').mockDerivatives.filter((d: any) => d.orderId === order?.id)
  const rule = mockRules.find(r => r.id === splitResult.ruleId)
  const ruleVersions = require('../data/mockData').mockRuleVersions.filter((v: any) => v.ruleId === splitResult.ruleId)

  res.json({
    splitResult,
    order,
    rule,
    ruleVersions,
    derivatives,
  })
})

router.get('/dashboard', (req, res) => {
  const today = new Date().toDateString()
  const todayOrders = mockOrders.filter(o => new Date(o.orderTime).toDateString() === today).length
  
  const { mockExceptions } = require('../data/mockData')
  const pendingExceptions = mockExceptions.filter((e: any) => e.severity === 'PENDING' && e.status === 'OPEN').length
  const errorExceptions = mockExceptions.filter((e: any) => e.severity === 'ERROR' && e.status !== 'RESOLVED').length
  
  const processedOrders = mockOrders.filter(o => o.status === 'PROCESSED').length
  const splitCompletionRate = mockOrders.length > 0 ? Math.round((processedOrders / mockOrders.length) * 100) : 0

  const weeklyTrend = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOrders = mockOrders.filter(o => o.orderTime.startsWith(dateStr)).length
    const dayProcessed = mockOrders.filter(o => o.orderTime.startsWith(dateStr) && o.status === 'PROCESSED').length
    weeklyTrend.push({ date: dateStr, orders: dayOrders + Math.floor(Math.random() * 5), processed: dayProcessed })
  }

  res.json({
    todayOrders: todayOrders + 3,
    pendingExceptions,
    errorExceptions,
    splitCompletionRate,
    weeklyTrend,
  })
})

export default router
