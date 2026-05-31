import { Router } from 'express'
import type { SplitRule, RuleVersion, CreateRuleData } from '../../shared/types'
import { mockRules, mockRuleVersions } from '../data/mockData'
import { splitEngine } from '../services/SplitEngine'

const router = Router()

router.get('/', (req, res) => {
  const isActive = req.query.isActive as string
  const exhibitionId = req.query.exhibitionId as string

  let filtered = [...mockRules]

  if (isActive !== undefined) {
    filtered = filtered.filter(r => r.isActive === (isActive === 'true'))
  }
  if (exhibitionId) {
    filtered = filtered.filter(r => r.exhibitionId === exhibitionId)
  }

  res.json(filtered)
})

router.get('/:id', (req, res) => {
  const rule = mockRules.find(r => r.id === req.params.id)
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' })
  }
  res.json(rule)
})

router.get('/:id/versions', (req, res) => {
  const versions = mockRuleVersions.filter(v => v.ruleId === req.params.id)
  res.json(versions)
})

router.post('/', (req, res) => {
  const data: CreateRuleData = req.body
  const ruleId = `RULE${String(mockRules.length + 1).padStart(3, '0')}`
  
  const newRule: SplitRule = {
    id: ruleId,
    ruleName: data.ruleName,
    exhibitionId: data.exhibitionId,
    currentVersion: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const newVersion: RuleVersion = {
    id: Math.random().toString(36).substring(2, 10),
    ruleId,
    version: 1,
    waterfallConfig: data.waterfallConfig,
    changeNote: data.changeNote,
    effectiveTime: data.effectiveTime,
    createdAt: new Date().toISOString(),
  }

  mockRules.push(newRule)
  mockRuleVersions.push(newVersion)
  
  res.status(201).json({ rule: newRule, version: newVersion })
})

router.post('/:id/versions', (req, res) => {
  const rule = mockRules.find(r => r.id === req.params.id)
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' })
  }

  const data = req.body
  const newVersion: RuleVersion = {
    id: Math.random().toString(36).substring(2, 10),
    ruleId: rule.id,
    version: rule.currentVersion + 1,
    waterfallConfig: data.waterfallConfig,
    changeNote: data.changeNote,
    effectiveTime: data.effectiveTime,
    createdAt: new Date().toISOString(),
  }

  rule.currentVersion = newVersion.version
  rule.updatedAt = new Date().toISOString()
  mockRuleVersions.push(newVersion)

  res.status(201).json(newVersion)
})

router.get('/:id/compare', (req, res) => {
  const ruleId = req.params.id
  const v1 = parseInt(req.query.v1 as string)
  const v2 = parseInt(req.query.v2 as string)
  const sampleAmount = parseInt(req.query.sampleAmount as string) || 1000

  const comparison = splitEngine.compareRuleVersions(ruleId, v1, v2, sampleAmount)
  
  if (!comparison) {
    return res.status(404).json({ error: 'One or both versions not found' })
  }

  res.json(comparison)
})

router.put('/:id/toggle', (req, res) => {
  const rule = mockRules.find(r => r.id === req.params.id)
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' })
  }
  rule.isActive = !rule.isActive
  rule.updatedAt = new Date().toISOString()
  res.json(rule)
})

export default router
