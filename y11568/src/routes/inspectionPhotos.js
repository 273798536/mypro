const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { validateData, recordBadData } = require('../utils/dataValidator');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', filterResponse('inspection_photos'), (req, res) => {
  const { work_order_id, is_abnormal } = req.query;
  
  let sql = 'SELECT * FROM inspection_photos WHERE 1=1';
  const params = [];
  
  if (work_order_id) {
    sql += ' AND work_order_id = ?';
    params.push(work_order_id);
  }
  if (is_abnormal !== undefined) {
    sql += ' AND is_abnormal = ?';
    params.push(is_abnormal);
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
  const { work_order_id, photo_url, photo_type, remark, is_abnormal } = req.body;
  
  const validation = await validateData('inspection_photos', req.body);
  if (!validation.valid) {
    await recordBadData('inspection_photos', req.body, 'validation_failed', validation.errors.join('; '), req.user.id);
    return res.status(400).json({ error: '数据验证失败', details: validation.errors });
  }
  
  db.run(
    `INSERT INTO inspection_photos (work_order_id, photo_url, photo_type, upload_user_id, remark, is_abnormal) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [work_order_id, photo_url, photo_type, req.user.id, remark, is_abnormal || 0],
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      db.get('SELECT * FROM inspection_photos WHERE id = ?', [newId], async (err, newPhoto) => {
        await logOperation('create', 'inspection_photos', newId, req.user.id, req.user.role, null, newPhoto, req.ip);
        res.status(201).json(newPhoto);
      });
    }
  );
});

module.exports = router;
