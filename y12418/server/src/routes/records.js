import express from 'express'
import db from '../db.js'

const router = express.Router()

router.post('/entry', (req, res) => {
  const { contractId, entryDate, entryType = 'normal', venue, coach } = req.body

  db.prepare(`
    INSERT INTO entry_records
    (contract_id, entry_date, entry_type, venue, coach)
    VALUES (?, ?, ?, ?, ?)
  `).run(contractId, entryDate, entryType, venue, coach)

  res.json({ success: true })
})

router.delete('/entry/:id', (req, res) => {
  db.prepare('DELETE FROM entry_records WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.post('/freeze', (req, res) => {
  const { contractId, freezeStartDate, freezeEndDate, freezeDays, freezeReason, isCrossMonth = 0 } = req.body

  db.prepare(`
    INSERT INTO freeze_applications
    (contract_id, freeze_start_date, freeze_end_date, freeze_days, freeze_reason, is_cross_month)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(contractId, freezeStartDate, freezeEndDate, freezeDays, freezeReason, isCrossMonth)

  res.json({ success: true })
})

router.post('/makeup', (req, res) => {
  const { contractId, originalEntryId, lessonDate, makeupDate, status = 'pending', remark } = req.body

  db.prepare(`
    INSERT INTO makeup_lessons
    (contract_id, original_entry_id, lesson_date, makeup_date, status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(contractId, originalEntryId, lessonDate, makeupDate, status, remark)

  res.json({ success: true })
})

router.post('/makeup/:id/withdraw', (req, res) => {
  const { withdrawnAt = new Date().toISOString() } = req.body

  db.prepare(`
    UPDATE makeup_lessons
    SET is_withdrawn = 1, withdrawn_at = ?, status = 'withdrawn'
    WHERE id = ?
  `).run(withdrawnAt, req.params.id)

  res.json({ success: true })
})

router.post('/transfer', (req, res) => {
  const { contractId, fromMember, toMember, transferDate, transferFee = 0, isRetroactive = 0, retroactiveMonth, remark } = req.body

  db.prepare(`
    INSERT INTO transfer_records
    (contract_id, from_member, to_member, transfer_date, transfer_fee, is_retroactive, retroactive_month, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(contractId, fromMember, toMember, transferDate, transferFee, isRetroactive, retroactiveMonth, remark)

  res.json({ success: true })
})

export default router
