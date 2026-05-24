const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireRole, filterFieldsByRole, createAuditLog } = require('../middleware/auth');
const config = require('../config/config');

const router = express.Router();

router.post('/', authenticateToken, requireRole(config.roles.DATA_ENTRY, config.roles.SUPERVISOR), async (req, res) => {
  const { order_no, repair_type, site_address, old_caliber, new_caliber, shift_record } = req.body;

  if (!order_no || !repair_type) {
    return res.status(400).json({ error: '派工单编号和抢修类型不能为空' });
  }

  const workOrderId = uuidv4();
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO work_orders (id, order_no, repair_type, site_address, old_caliber, new_caliber, shift_record, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(workOrderId, order_no, repair_type, site_address, old_caliber, new_caliber, shift_record, req.user.id, now, now);

    await createAuditLog(req.user.id, 'create', 'work_orders', workOrderId, req.body, req.ip);

    res.status(201).json({ id: workOrderId, order_no, repair_type, status: 'pending' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '派工单编号已存在' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM work_orders';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const workOrders = await db.allSync(query, params);
  const filtered = filterFieldsByRole(req.user.role, 'work_orders', workOrders);

  res.json(filtered);
});

router.get('/:id', authenticateToken, async (req, res) => {
  const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
  
  if (!workOrder) {
    return res.status(404).json({ error: '派工单不存在' });
  }

  const filtered = filterFieldsByRole(req.user.role, 'work_orders', workOrder);
  res.json(filtered);
});

router.put('/:id', authenticateToken, requireRole(config.roles.DATA_ENTRY, config.roles.REVIEWER, config.roles.SUPERVISOR), async (req, res) => {
  const { repair_type, site_address, old_caliber, new_caliber, shift_record, status } = req.body;
  const now = new Date().toISOString();

  const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
  if (!workOrder) {
    return res.status(404).json({ error: '派工单不存在' });
  }

  await db.runSync(`
    UPDATE work_orders 
    SET repair_type = COALESCE(?, repair_type),
        site_address = COALESCE(?, site_address),
        old_caliber = COALESCE(?, old_caliber),
        new_caliber = COALESCE(?, new_caliber),
        shift_record = COALESCE(?, shift_record),
        status = COALESCE(?, status),
        updated_at = ?
    WHERE id = ?
  `, [repair_type, site_address, old_caliber, new_caliber, shift_record, status, now, req.params.id]);

  await createAuditLog(req.user.id, 'update', 'work_orders', req.params.id, req.body, req.ip);

  res.json({ message: '更新成功' });
});

router.post('/:id/inventory', authenticateToken, requireRole(config.roles.DATA_ENTRY, config.roles.SUPERVISOR), async (req, res) => {
  const { valve_type, caliber, quantity, is_supplementary, record_type } = req.body;

  if (!valve_type || !caliber || !quantity) {
    return res.status(400).json({ error: '阀门类型、口径、数量不能为空' });
  }

  const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
  if (!workOrder) {
    return res.status(404).json({ error: '派工单不存在' });
  }

  const result = await db.runSync(`
    INSERT INTO valve_inventory (work_order_id, valve_type, caliber, quantity, is_supplementary, record_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [req.params.id, valve_type, caliber, quantity, is_supplementary ? 1 : 0, record_type || 'new']);

  await createAuditLog(req.user.id, 'create', 'valve_inventory', result.lastID.toString(), req.body, req.ip);

  res.status(201).json({ id: result.lastID, message: '库存记录创建成功' });
});

router.get('/:id/inventory', authenticateToken, async (req, res) => {
  const inventory = await db.allSync('SELECT * FROM valve_inventory WHERE work_order_id = ?', [req.params.id]);
  res.json(inventory);
});

module.exports = router;
