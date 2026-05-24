const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { validateData, recordBadData } = require('../utils/dataValidator');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', filterResponse('external_receipts'), (req, res) => {
  const { work_order_id, has_exception } = req.query;
  
  let sql = 'SELECT * FROM external_receipts WHERE 1=1';
  const params = [];
  
  if (work_order_id) {
    sql += ' AND work_order_id = ?';
    params.push(work_order_id);
  }
  if (has_exception !== undefined) {
    sql += ' AND has_exception = ?';
    params.push(has_exception);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', requireRole('entry', 'review', 'supervisor'), async (req, res) => {
  const { work_order_id, receipt_no, receipt_type, content, submit_org, submit_time, has_exception, exception_reason } = req.body;
  
  const validation = await validateData('external_receipts', req.body);
  if (!validation.valid) {
    await recordBadData('external_receipts', req.body, 'validation_failed', validation.errors.join('; '), req.user.id);
    return res.status(400).json({ error: '数据验证失败', details: validation.errors });
  }
  
  db.run(
    `INSERT INTO external_receipts (work_order_id, receipt_no, receipt_type, content, submit_org, submit_time, has_exception, exception_reason) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [work_order_id, receipt_no, receipt_type, content, submit_org, submit_time, has_exception || 0, exception_reason],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          await recordBadData('external_receipts', req.body, 'duplicate_key', '回执号已存在', req.user.id);
          return res.status(400).json({ error: '回执号已存在' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      db.get('SELECT * FROM external_receipts WHERE id = ?', [newId], async (err, newReceipt) => {
        await logOperation('create', 'external_receipts', newId, req.user.id, req.user.role, null, newReceipt, req.ip);
        res.status(201).json(newReceipt);
      });
    }
  );
});

module.exports = router;
