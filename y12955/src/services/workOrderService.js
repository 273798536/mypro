const { getDb } = require('../models/database');
const { 
  AppError, 
  generateOrderNo, 
  validateRequired, 
  hashContent,
  WORK_ORDER_STATUS,
  canTransitionStatus 
} = require('../utils/helpers');

const workOrderService = {
  createWorkOrder(data) {
    validateRequired(['title'], data);
    
    const orderNo = data.order_no || generateOrderNo();
    
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO work_orders (order_no, title, description, source, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      orderNo,
      data.title,
      data.description || null,
      data.source || null,
      data.status || WORK_ORDER_STATUS.DRAFT
    );
    
    const workOrder = workOrderService.getWorkOrderById(result.lastInsertRowid);
    
    workOrderService.addStatusTransition(
      result.lastInsertRowid,
      null,
      workOrder.status,
      data.operator || 'system',
      '创建工单'
    );
    
    return workOrder;
  },

  getWorkOrderById(id) {
    const db = getDb();
    const order = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
    if (!order) {
      throw new AppError(`工单不存在: ${id}`, 404, {
        error_type: 'work_order_not_found',
        suggestion: '请检查工单ID是否正确'
      });
    }
    return order;
  },

  getWorkOrderByNo(orderNo) {
    const db = getDb();
    const order = db.prepare('SELECT * FROM work_orders WHERE order_no = ?').get(orderNo);
    if (!order) {
      throw new AppError(`工单不存在: ${orderNo}`, 404, {
        error_type: 'work_order_not_found',
        suggestion: '请检查工单编号是否正确'
      });
    }
    return order;
  },

  listWorkOrders(params = {}) {
    const db = getDb();
    const { status, page = 1, pageSize = 20 } = params;
    
    let whereClauses = [];
    let queryParams = [];
    
    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }
    
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    const total = db.prepare(`SELECT COUNT(*) as total FROM work_orders ${whereSql}`).get(...queryParams).total;
    
    const offset = (page - 1) * pageSize;
    const list = db.prepare(`
      SELECT * FROM work_orders ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams, pageSize, offset);
    
    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  },

  updateWorkOrder(id, data) {
    const db = getDb();
    const existing = workOrderService.getWorkOrderById(id);
    
    const updates = [];
    const params = [];
    
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.source !== undefined) {
      updates.push('source = ?');
      params.push(data.source);
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      
      db.prepare(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    return workOrderService.getWorkOrderById(id);
  },

  transitionStatus(id, toStatus, operator = 'system', remark = '') {
    const db = getDb();
    const order = workOrderService.getWorkOrderById(id);
    
    if (!canTransitionStatus(order.status, toStatus)) {
      const { STATUS_FLOW } = require('../utils/helpers');
      throw new AppError(
        `无法从状态 "${order.status}" 流转到 "${toStatus}"`,
        400,
        {
          error_type: 'invalid_status_transition',
          current_status: order.status,
          target_status: toStatus,
          allowed_transitions: STATUS_FLOW[order.status] || [],
          suggestion: `当前状态 "${order.status}" 允许流转到: ${(STATUS_FLOW[order.status] || []).join(', ')}`
        }
      );
    }
    
    db.prepare(
      `UPDATE work_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(toStatus, id);
    
    workOrderService.addStatusTransition(id, order.status, toStatus, operator, remark);
    
    return workOrderService.getWorkOrderById(id);
  },

  addStatusTransition(workOrderId, fromStatus, toStatus, operator, remark = '') {
    const db = getDb();
    db.prepare(`
      INSERT INTO status_transitions (work_order_id, from_status, to_status, operator, remark)
      VALUES (?, ?, ?, ?, ?)
    `).run(workOrderId, fromStatus, toStatus, operator, remark);
  },

  listStatusTransitions(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    return db.prepare(`
      SELECT * FROM status_transitions 
      WHERE work_order_id = ? 
      ORDER BY created_at ASC
    `).all(workOrderId);
  },

  checkDuplicateImport(workOrderId, batchType, fileHash) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM import_batches 
      WHERE work_order_id = ? AND batch_type = ? AND file_hash = ? AND status = 'completed'
      ORDER BY import_time DESC
      LIMIT 1
    `).get(workOrderId, batchType, fileHash);
  },

  createImportBatch(workOrderId, batchType, fileHash, fileName, recordCount = 0) {
    const db = getDb();
    return db.prepare(`
      INSERT INTO import_batches (work_order_id, batch_type, file_hash, file_name, record_count, status)
      VALUES (?, ?, ?, ?, ?, 'completed')
    `).run(workOrderId, batchType, fileHash, fileName, recordCount);
  },

  listImportBatches(workOrderId, batchType = null) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    let sql = 'SELECT * FROM import_batches WHERE work_order_id = ?';
    const params = [workOrderId];
    
    if (batchType) {
      sql += ' AND batch_type = ?';
      params.push(batchType);
    }
    
    sql += ' ORDER BY import_time DESC';
    
    return db.prepare(sql).all(...params);
  },

  importDictionary(workOrderId, version, records, fileName = null) {
    validateRequired(['version', 'records'], { version, records });
    
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError('导入数据不能为空', 400, {
        error_type: 'empty_import_data',
        suggestion: '请提供至少一条数据字典记录'
      });
    }
    
    const db = getDb();
    const order = workOrderService.getWorkOrderById(workOrderId);
    
    const contentHash = hashContent(JSON.stringify(records));
    
    const duplicate = workOrderService.checkDuplicateImport(workOrderId, 'dictionary', contentHash);
    if (duplicate) {
      throw new AppError(
        `检测到重复导入: 相同内容的数据字典已在 ${duplicate.import_time} 导入过`,
        409,
        {
          error_type: 'duplicate_import',
          duplicate_batch_id: duplicate.id,
          duplicate_import_time: duplicate.import_time,
          suggestion: '如果需要重新导入，请修改版本号或数据内容。如果是同一批数据，无需重复导入。'
        }
      );
    }
    
    const existingVersion = db.prepare(`
      SELECT COUNT(*) as count FROM data_dictionaries 
      WHERE work_order_id = ? AND version = ?
    `).get(workOrderId, version);
    
    if (existingVersion.count > 0) {
      throw new AppError(
        `版本 "${version}" 的数据字典已存在`,
        409,
        {
          error_type: 'version_already_exists',
          existing_version: version,
          suggestion: '请使用新的版本号导入，或先删除旧版本数据'
        }
      );
    }
    
    for (const record of records) {
      validateRequired(['table_name', 'column_name'], record);
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO data_dictionaries 
      (work_order_id, table_name, column_name, data_type, is_nullable, default_value, comment, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((records) => {
      for (const record of records) {
        insertStmt.run(
          workOrderId,
          record.table_name,
          record.column_name,
          record.data_type || null,
          record.is_nullable || null,
          record.default_value || null,
          record.comment || null,
          version
        );
      }
    });
    
    try {
      insertMany(records);
    } catch (err) {
      throw new AppError(
        `导入失败: ${err.message}`,
        400,
        {
          error_type: 'import_validation_error',
          suggestion: '请检查每条记录是否包含 table_name 和 column_name 字段'
        }
      );
    }
    
    const batch = workOrderService.createImportBatch(
      workOrderId,
      'dictionary',
      contentHash,
      fileName,
      records.length
    );
    
    if (order.status === WORK_ORDER_STATUS.DRAFT || order.status === WORK_ORDER_STATUS.FAILED) {
      workOrderService.transitionStatus(
        workOrderId,
        WORK_ORDER_STATUS.IMPORTING,
        'system',
        `导入数据字典版本 ${version}`
      );
    }
    
    db.prepare(
      `UPDATE work_orders SET current_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(version, workOrderId);
    
    return {
      success: true,
      batch_id: batch.lastInsertRowid,
      record_count: records.length,
      version: version,
      message: `成功导入 ${records.length} 条数据字典记录`
    };
  },

  listDictionaryVersions(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    return db.prepare(`
      SELECT version, COUNT(*) as record_count, MIN(import_time) as import_time
      FROM data_dictionaries 
      WHERE work_order_id = ? 
      GROUP BY version 
      ORDER BY import_time DESC
    `).all(workOrderId);
  },

  getDictionaryByVersion(workOrderId, version) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    return db.prepare(`
      SELECT * FROM data_dictionaries 
      WHERE work_order_id = ? AND version = ?
      ORDER BY table_name, column_name
    `).all(workOrderId, version);
  },

  deleteWorkOrder(id) {
    const db = getDb();
    workOrderService.getWorkOrderById(id);
    
    const tables = [
      'data_dictionaries',
      'drift_details',
      'rollback_records',
      'index_suggestions',
      'permission_audits',
      'permission_lists',
      'slow_query_logs',
      'status_transitions',
      'reports',
      'import_batches',
      'drift_comparisons'
    ];
    
    const deleteAll = db.transaction(() => {
      for (const table of tables) {
        db.prepare(`DELETE FROM ${table} WHERE work_order_id = ?`).run(id);
      }
      db.prepare('DELETE FROM work_orders WHERE id = ?').run(id);
    });
    
    deleteAll();
    
    return { success: true, message: '工单已删除' };
  }
};

module.exports = workOrderService;
