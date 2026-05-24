const { get, run, all, runInTransaction } = require('../database');
const { ACTIONS } = require('../database/schema');
const { recordStatusHistory } = require('./stateService');
const { logAuditTrail } = require('./auditService');
const logger = require('../utils/logger');

function generateBatchNo() {
  const date = new Date();
  const prefix = `BID${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${random}`;
}

async function createBatch({ projectName, bidNo, operator, manualRemark }) {
  return runInTransaction(async () => {
    const batchNo = generateBatchNo();
    
    const sql = `
      INSERT INTO batches 
      (batch_no, project_name, bid_no, operator, manual_remark)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await run(sql, [batchNo, projectName, bidNo, operator, manualRemark]);
    const batchId = result.lastID;

    await recordStatusHistory({
      batchId,
      fromStatus: null,
      toStatus: 'DRAFT',
      action: ACTIONS.CREATE,
      operator,
      reason: 'Batch created',
      remark: manualRemark
    });

    await logAuditTrail({
      batchId,
      action: ACTIONS.CREATE,
      fieldName: 'batch',
      oldValue: null,
      newValue: JSON.stringify({ batchNo, projectName, bidNo }),
      operator
    });

    logger.info(`Batch created: ${batchNo} (ID: ${batchId}) by ${operator}`);

    return getBatchById(batchId);
  });
}

async function getBatchById(batchId) {
  return get('SELECT * FROM batches WHERE id = ?', [batchId]);
}

async function getBatchByNo(batchNo) {
  return get('SELECT * FROM batches WHERE batch_no = ?', [batchNo]);
}

async function listBatches({ status, page = 1, pageSize = 20, operator, projectName }) {
  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }
  if (operator) {
    whereClauses.push('operator = ?');
    params.push(operator);
  }
  if (projectName) {
    whereClauses.push('project_name LIKE ?');
    params.push(`%${projectName}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const countResult = await get(`SELECT COUNT(*) as total FROM batches ${whereSql}`, params);
  const total = countResult.total;

  const offset = (page - 1) * pageSize;
  const list = await all(`
    SELECT * FROM batches ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

async function updateBatch(batchId, updates, operator) {
  return runInTransaction(async () => {
    const batch = await getBatchById(batchId);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    const allowedFields = ['project_name', 'bid_no', 'manual_remark'];
    const setClauses = [];
    const values = [];

    for (const key of Object.keys(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        const oldValue = batch[dbField];
        const newValue = updates[key];
        
        if (oldValue !== newValue) {
          setClauses.push(`${dbField} = ?`);
          values.push(newValue);
          
          await logAuditTrail({
            batchId,
            action: 'UPDATE',
            fieldName: dbField,
            oldValue: String(oldValue),
            newValue: String(newValue),
            operator
          });
        }
      }
    }

    if (setClauses.length > 0) {
      values.push(batchId);
      await run(`
        UPDATE batches 
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, values);

      logger.info(`Batch ${batchId} updated by ${operator}`);
    }

    return getBatchById(batchId);
  });
}

async function updateManualRemark(batchId, manualRemark, operator) {
  return runInTransaction(async () => {
    const batch = await getBatchById(batchId);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    await run(`
      UPDATE batches 
      SET manual_remark = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [manualRemark, batchId]);

    await logAuditTrail({
      batchId,
      action: 'UPDATE_MANUAL_REMARK',
      fieldName: 'manual_remark',
      oldValue: batch.manual_remark,
      newValue: manualRemark,
      operator
    });

    logger.info(`Batch ${batchId} manual remark updated by ${operator}`);

    return getBatchById(batchId);
  });
}

module.exports = {
  createBatch,
  getBatchById,
  getBatchByNo,
  listBatches,
  updateBatch,
  updateManualRemark
};
