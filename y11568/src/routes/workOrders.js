const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { validateData, recordBadData } = require('../utils/dataValidator');
const { logOperation, getRecordHistory } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', filterResponse('work_orders'), (req, res) => {
  const { status, road_section, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT * FROM work_orders WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (road_section) {
    sql += ' AND road_section LIKE ?';
    params.push(`%${road_section}%`);
  }
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  
  db.get(countSql, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        data: rows,
        total: countResult.total,
        page: Number(page),
        limit: Number(limit)
      });
    });
  });
});

router.get('/:id', filterResponse('work_orders'), (req, res) => {
  db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '工单不存在' });
    }
    res.json(row);
  });
});

router.get('/:id/history', requireRole('supervisor', 'review'), (req, res) => {
  getRecordHistory('work_orders', req.params.id)
    .then(logs => res.json(logs))
    .catch(err => res.status(500).json({ error: err.message }));
});

router.post('/', requireRole('entry', 'review', 'supervisor'), async (req, res) => {
  const { order_no, road_section, light_count, fault_type, description, location } = req.body;
  
  const validation = await validateData('work_orders', req.body);
  if (!validation.valid) {
    await recordBadData('work_orders', req.body, 'validation_failed', validation.errors.join('; '), req.user.id);
    return res.status(400).json({ error: '数据验证失败', details: validation.errors });
  }
  
  db.run(
    `INSERT INTO work_orders (order_no, road_section, light_count, fault_type, description, location, entry_user_id, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [order_no, road_section, light_count || 0, fault_type, description, location, req.user.id],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          await recordBadData('work_orders', req.body, 'duplicate_key', '工单号已存在', req.user.id);
          return res.status(400).json({ error: '工单号已存在' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      db.get('SELECT * FROM work_orders WHERE id = ?', [newId], async (err, newOrder) => {
        await logOperation('create', 'work_orders', newId, req.user.id, req.user.role, null, newOrder, req.ip);
        res.status(201).json(newOrder);
      });
    }
  );
});

router.put('/:id', requireRole('entry', 'review', 'supervisor'), async (req, res) => {
  const { road_section, light_count, fault_type, description, location, status } = req.body;
  
  db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id], async (err, oldOrder) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!oldOrder) {
      return res.status(404).json({ error: '工单不存在' });
    }
    
    if (req.user.role === 'entry' && oldOrder.entry_user_id !== req.user.id) {
      return res.status(403).json({ error: '只能编辑自己创建的工单' });
    }
    
    const updates = [];
    const params = [];
    
    if (road_section !== undefined) { updates.push('road_section = ?'); params.push(road_section); }
    if (light_count !== undefined) { updates.push('light_count = ?'); params.push(light_count); }
    if (fault_type !== undefined) { updates.push('fault_type = ?'); params.push(fault_type); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (status !== undefined && ['review', 'supervisor'].includes(req.user.role)) {
      updates.push('status = ?');
      params.push(status);
      updates.push('review_user_id = ?');
      params.push(req.user.id);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    
    db.run(
      `UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`,
      params,
      async function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id], async (err, newOrder) => {
          await logOperation('update', 'work_orders', req.params.id, req.user.id, req.user.role, oldOrder, newOrder, req.ip);
          res.json(newOrder);
        });
      }
    );
  });
});

router.post('/:id/review', requireRole('review', 'supervisor'), (req, res) => {
  const { action, remark } = req.body;
  
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: '操作类型必须是 approved 或 rejected' });
  }
  
  db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id], async (err, oldOrder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!oldOrder) return res.status(404).json({ error: '工单不存在' });
    
    db.run(
      'UPDATE work_orders SET status = ?, review_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [action, req.user.id, req.params.id],
      async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id], async (err, newOrder) => {
          await logOperation(`review_${action}`, 'work_orders', req.params.id, req.user.id, req.user.role, oldOrder, newOrder, req.ip);
          res.json(newOrder);
        });
      }
    );
  });
});

router.get('/:id/full-chain', (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM work_orders WHERE id = ?', [orderId], (err, workOrder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!workOrder) return res.status(404).json({ error: '工单不存在' });
    
    db.all('SELECT * FROM inspection_photos WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, photos) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT * FROM repair_hotlines WHERE work_order_id = ? ORDER BY call_time', [orderId], (err, hotlines) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all('SELECT * FROM spare_parts WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, parts) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.all('SELECT * FROM external_receipts WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, receipts) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
              work_order: workOrder,
              inspection_photos: photos,
              repair_hotlines: hotlines,
              spare_parts: parts,
              external_receipts: receipts
            });
          });
        });
      });
    });
  });
});

module.exports = router;
