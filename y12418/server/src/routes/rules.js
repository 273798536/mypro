import express from 'express'
import db from '../db.js'

const router = express.Router()

router.get('/', (req, res) => {
  const rules = db.prepare(`
    SELECT * FROM rule_versions ORDER BY effective_date DESC
  `).all()

  res.json(rules)
})

router.post('/', (req, res) => {
  const { version, ruleName, ruleContent, effectiveDate, createdBy = 'admin' } = req.body

  const existing = db.prepare('SELECT * FROM rule_versions WHERE version = ?').get(version)
  if (existing) {
    return res.status(400).json({ error: '版本号已存在' })
  }

  db.prepare(`
    INSERT INTO rule_versions
    (version, rule_name, rule_content, effective_date, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(version, ruleName, ruleContent, effectiveDate, createdBy)

  res.json({ success: true })
})

router.post('/:id/activate', (req, res) => {
  db.prepare('UPDATE rule_versions SET is_active = 0').run()
  db.prepare('UPDATE rule_versions SET is_active = 1 WHERE id = ?').run(req.params.id)

  res.json({ success: true })
})

export default router
