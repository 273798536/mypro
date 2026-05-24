const { get, run, all, runInTransaction } = require('../database');
const stateMachine = require('../state-machine');
const { ACTIONS } = require('../database/schema');
const logger = require('../utils/logger');

async function recordStatusHistory({ batchId, fromStatus, toStatus, action, operator, reason, remark }) {
  const sql = `
    INSERT INTO status_history 
    (batch_id, from_status, to_status, action, operator, reason, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return run(sql, [batchId, fromStatus, toStatus, action, operator, reason, remark]);
}

async function updateBatchStatus(batchId, newStatus, previousStatus, operator) {
  const sql = `
    UPDATE batches 
    SET status = ?, previous_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  return run(sql, [newStatus, previousStatus, batchId]);
}

async function transitionState(batchId, action, operator, reason, remark) {
  return runInTransaction(async () => {
    const batch = await get('SELECT * FROM batches WHERE id = ?', [batchId]);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    const currentStatus = batch.status;
    
    if (batch.is_frozen && action !== ACTIONS.UNFREEZE) {
      throw new Error(`Batch is frozen, only UNFREEZE action is allowed`);
    }

    stateMachine.validateTransition(currentStatus, action);
    
    const nextState = stateMachine.getNextState(currentStatus, action);
    
    if (nextState) {
      await updateBatchStatus(batchId, nextState, currentStatus, operator);
      await recordStatusHistory({
        batchId,
        fromStatus: currentStatus,
        toStatus: nextState,
        action,
        operator,
        reason,
        remark
      });
      
      logger.info(`State transition: batch ${batchId} ${currentStatus} -> ${nextState} via ${action}`);
      
      return {
        batchId,
        fromStatus: currentStatus,
        toStatus: nextState,
        action,
        operator
      };
    }
    
    return {
      batchId,
      status: currentStatus,
      action,
      operator,
      noStateChange: true
    };
  });
}

async function freezeBatch(batchId, operator, reason) {
  return runInTransaction(async () => {
    const batch = await get('SELECT * FROM batches WHERE id = ?', [batchId]);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    
    if (batch.is_frozen) {
      throw new Error(`Batch is already frozen`);
    }

    const currentStatus = batch.status;
    stateMachine.validateTransition(currentStatus, ACTIONS.FREEZE);

    const previousStatus = currentStatus;
    
    await run(`
      UPDATE batches 
      SET is_frozen = 1, 
          frozen_at = CURRENT_TIMESTAMP, 
          frozen_by = ?,
          freeze_reason = ?,
          previous_status = ?,
          status = 'FROZEN',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [operator, reason, previousStatus, batchId]);

    await recordStatusHistory({
      batchId,
      fromStatus: previousStatus,
      toStatus: 'FROZEN',
      action: ACTIONS.FREEZE,
      operator,
      reason
    });

    logger.info(`Batch ${batchId} frozen by ${operator}: ${reason}`);
    
    return {
      batchId,
      frozen: true,
      previousStatus,
      frozenBy: operator,
      reason
    };
  });
}

async function unfreezeBatch(batchId, operator, reason) {
  return runInTransaction(async () => {
    const batch = await get('SELECT * FROM batches WHERE id = ?', [batchId]);
    
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    
    if (!batch.is_frozen) {
      throw new Error(`Batch is not frozen`);
    }

    const currentStatus = batch.status;
    stateMachine.validateTransition(currentStatus, ACTIONS.UNFREEZE);

    const restoreStatus = batch.previous_status || 'DRAFT';
    
    await run(`
      UPDATE batches 
      SET is_frozen = 0, 
          frozen_at = NULL, 
          frozen_by = NULL,
          freeze_reason = NULL,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [restoreStatus, batchId]);

    await recordStatusHistory({
      batchId,
      fromStatus: 'FROZEN',
      toStatus: restoreStatus,
      action: ACTIONS.UNFREEZE,
      operator,
      reason
    });

    logger.info(`Batch ${batchId} unfrozen by ${operator}, restored to ${restoreStatus}`);
    
    return {
      batchId,
      unfrozen: true,
      restoredStatus: restoreStatus,
      unfrozenBy: operator
    };
  });
}

async function getStatusHistory(batchId) {
  const sql = `
    SELECT * FROM status_history 
    WHERE batch_id = ? 
    ORDER BY created_at DESC
  `;
  return all(sql, [batchId]);
}

module.exports = {
  transitionState,
  freezeBatch,
  unfreezeBatch,
  getStatusHistory,
  recordStatusHistory
};
