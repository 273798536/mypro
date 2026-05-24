const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { validateData, recordBadData } = require('../utils/dataValidator');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', filterResponse('repair_hotlines'), (req, res) => {
  const { work_order_id } = req.query;
  
  let sql = 'SELECT * FROM repair_hotlines WHERE 1=1';
  const params = [];
  
  if (work_order_id) {
    sql += ' AND work_order_id = ?';
    params.push(work_order_id);
  }
  
  sql += ' ORDER BY call_time DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', requireRole('entry', 'review', 'supervisor'), async (req, res) => {
  const { work_order_id, caller_name, caller_phone, call_time, fault_description, handler } = req.body;
  
  const validation = await validateData('repair_hotlines', req.body);
  if (!validation.valid) {
    await recordBadData('repair_hotlines', req.body, 'validation_failed', validation.errors.join('; '), req.user.id);
    return res.status(400).json({ error: '数据验证失败', details: validation.errors });
  }
  
  db.run(
    `INSERT INTO repair_hotlines (work_order_id, caller_name, caller_phone, call_time, fault_description, handler) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [work_order_id, caller_name, caller_phone, call_time, fault_description, handler],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      db.get('SELECT * FROM repair_hotlines WHERE id = ?', [newId], async (err, newRecord) => {
        await logOperation('create', 'repair_hotlines', newId, req.user.id, req.user.role, null, newRecord, req.ip);
        res.status(201).json(newRecord);
      });
    }
  );
});

module.exports = router;
