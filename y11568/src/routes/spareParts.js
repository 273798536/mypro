const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { validateData, recordBadData } = require('../utils/dataValidator');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', filterResponse('spare_parts'), (req, res) => {
  const { work_order_id, is_qualified } = req.query;
  
  let sql = 'SELECT * FROM spare_parts WHERE 1=1';
  const params = [];
  
  if (work_order_id) {
    sql += ' AND work_order_id = ?';
    params.push(work_order_id);
  }
  if (is_qualified !== undefined) {
    sql += ' AND is_qualified = ?';
    params.push(is_qualified);
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
  const { work_order_id, part_batch_no, part_name, part_model, quantity, is_qualified } = req.body;
  
  const validation = await validateData('spare_parts', req.body);
  if (!validation.valid) {
    await recordBadData('spare_parts', req.body, 'validation_failed', validation.errors.join('; '), req.user.id);
    return res.status(400).json({ error: '数据验证失败', details: validation.errors });
  }
  
  db.run(
    `INSERT INTO spare_parts (work_order_id, part_batch_no, part_name, part_model, quantity, is_qualified, use_user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [work_order_id, part_batch_no, part_name, part_model, quantity || 1, is_qualified !== undefined ? is_qualified : 1, req.user.id],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      db.get('SELECT * FROM spare_parts WHERE id = ?', [newId], async (err, newPart) => {
        await logOperation('create', 'spare_parts', newId, req.user.id, req.user.role, null, newPart, req.ip);
        res.status(201).json(newPart);
      });
    }
  );
});

module.exports = router;
