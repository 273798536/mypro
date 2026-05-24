const { runAsync, getAsync, allAsync, beginTransaction, commit, rollback } = require('../config/database');
const { generateId, generateTaskNo, isValidStatusTransition } = require('../utils/helpers');
const { 
  WAVE_STATUS, 
  REPLENISHMENT_STATUS, 
  REPLENISHMENT_STATUS_TRANSITIONS,
  OPERATION_TYPE,
  LOCATION_OCCUPATION_STATUS
} = require('../utils/constants');
const historyService = require('./historyService');
const waveService = require('./waveService');
const { NotFoundError, StateTransitionError, ValidationError, BusinessError } = require('../middleware/errorHandler');

class ReplenishmentService {
  async markShortage(waveId, shortageData, operator, idempotentKey = null) {
    const { waveItemId, shortageQty, shortageReason, reviewerCode, scanQty } = shortageData;

    if (shortageQty <= 0) {
      throw new ValidationError('缺货数量必须大于0');
    }

    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const waveItem = await getAsync(`SELECT * FROM wave_items WHERE id = ?`, [waveItemId]);
    if (!waveItem) {
      throw new NotFoundError('波次商品不存在');
    }

    const availableShortage = waveItem.plan_qty - waveItem.picked_qty - waveItem.shortage_qty;
    if (shortageQty > availableShortage) {
      throw new ValidationError(`缺货数量不能超过未拣数量: ${availableShortage}`);
    }

    await beginTransaction();

    try {
      const scanId = generateId();
      await runAsync(
        `INSERT INTO review_scans (
          id, wave_id, wave_item_id, reviewer_code, sku_code, 
          scan_qty, shortage_qty, is_shortage, shortage_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [scanId, waveId, waveItemId, reviewerCode, waveItem.sku_code, 
         scanQty || waveItem.picked_qty, shortageQty, shortageReason]
      );

      await runAsync(
        `UPDATE wave_items 
         SET shortage_qty = shortage_qty + ?, shortage_reason = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [shortageQty, shortageReason, waveItemId]
      );

      await runAsync(
        `UPDATE waves 
         SET shortage_qty = shortage_qty + ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [shortageQty, WAVE_STATUS.SHORTAGE, waveId]
      );

      await historyService.recordOperation(waveId, OPERATION_TYPE.MARK_SHORTAGE, operator, {
        beforeStatus: wave.status,
        afterStatus: WAVE_STATUS.SHORTAGE,
        idempotentKey,
        changeContent: { waveItemId, shortageQty, shortageReason, scanId }
      });

      await commit();

      return { scanId, waveId, waveItemId, shortageQty, shortageReason };
    } catch (err) {
      await rollback();
      throw err;
    }
  }

  async createReplenishmentTask(waveId, taskData, operator, idempotentKey = null) {
    const { waveItemId, fromLocation, toLocation, shortageQty, skuCode } = taskData;

    if (shortageQty <= 0) {
      throw new ValidationError('回补数量必须大于0');
    }

    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const waveItem = await getAsync(`SELECT * FROM wave_items WHERE id = ?`, [waveItemId]);
    if (!waveItem) {
      throw new NotFoundError('波次商品不存在');
    }

    const existingTasks = await allAsync(
      `SELECT * FROM replenishment_tasks 
       WHERE wave_item_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED', 'FAILED')`,
      [waveItemId]
    );

    if (existingTasks.length > 0) {
      throw new BusinessError('该商品存在未完成的回补任务，请勿重复创建');
    }

    await beginTransaction();

    try {
      const taskId = generateId();
      const taskNo = generateTaskNo();

      await runAsync(
        `INSERT INTO replenishment_tasks (
          id, wave_id, wave_item_id, task_no, sku_code, 
          from_location, to_location, shortage_qty, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskId, waveId, waveItemId, taskNo, skuCode || waveItem.sku_code,
         fromLocation, toLocation, shortageQty, REPLENISHMENT_STATUS.PENDING]
      );

      const occupationId = generateId();
      await runAsync(
        `INSERT INTO location_occupations (
          id, wave_id, wave_item_id, replenishment_task_id, 
          location_code, sku_code, occupied_qty, status, occupied_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [occupationId, waveId, waveItemId, taskId, 
         fromLocation, skuCode || waveItem.sku_code, shortageQty, 
         LOCATION_OCCUPATION_STATUS.OCCUPIED, operator]
      );

      if (wave.status !== WAVE_STATUS.REPLENISHING) {
        await runAsync(
          `UPDATE waves SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [WAVE_STATUS.REPLENISHING, waveId]
        );
      }

      await historyService.recordOperation(waveId, OPERATION_TYPE.CREATE_REPLENISHMENT, operator, {
        beforeStatus: wave.status,
        afterStatus: WAVE_STATUS.REPLENISHING,
        idempotentKey,
        changeContent: { taskId, taskNo, waveItemId, shortageQty, occupationId }
      });

      await commit();

      return { taskId, taskNo, waveId, waveItemId, shortageQty, status: REPLENISHMENT_STATUS.PENDING };
    } catch (err) {
      await rollback();
      throw err;
    }
  }

  async confirmReplenishment(taskId, confirmData, operator, idempotentKey = null) {
    const { replenishQty, pickerCode, isPartial = false } = confirmData;

    const task = await getAsync(`SELECT * FROM replenishment_tasks WHERE id = ?`, [taskId]);
    if (!task) {
      throw new NotFoundError('回补任务不存在');
    }

    if (replenishQty < 0) {
      throw new ValidationError('回补数量不能为负数');
    }

    if (replenishQty > task.shortage_qty) {
      throw new ValidationError(`回补数量不能超过缺货数量: ${task.shortage_qty}`);
    }

    let newStatus;
    if (replenishQty === 0) {
      newStatus = REPLENISHMENT_STATUS.FAILED;
    } else if (isPartial || replenishQty < task.shortage_qty) {
      newStatus = REPLENISHMENT_STATUS.PARTIAL;
    } else {
      newStatus = REPLENISHMENT_STATUS.COMPLETED;
    }

    if (!isValidStatusTransition(REPLENISHMENT_STATUS_TRANSITIONS, task.status, newStatus)) {
      throw new StateTransitionError(`无法从 ${task.status} 转换到 ${newStatus}`);
    }

    await beginTransaction();

    try {
      const newReplenishQty = task.replenish_qty + replenishQty;
      await runAsync(
        `UPDATE replenishment_tasks 
         SET replenish_qty = ?, status = ?, picker_code = ?, 
             confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newReplenishQty, newStatus, pickerCode, operator, taskId]
      );

      const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [task.wave_id]);
      const waveItem = await getAsync(`SELECT * FROM wave_items WHERE id = ?`, [task.wave_item_id]);

      const newWaveReplenished = wave.replenished_qty + replenishQty;
      const newItemReplenished = waveItem.replenished_qty + replenishQty;
      const isItemComplete = newItemReplenished >= waveItem.shortage_qty;

      await runAsync(
        `UPDATE wave_items 
         SET replenished_qty = ?, is_replenished = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newItemReplenished, isItemComplete ? 1 : 0, task.wave_item_id]
      );

      await runAsync(
        `UPDATE waves SET replenished_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newWaveReplenished, task.wave_id]
      );

      if (newStatus === REPLENISHMENT_STATUS.COMPLETED || newStatus === REPLENISHMENT_STATUS.FAILED) {
        await runAsync(
          `UPDATE location_occupations 
           SET status = ?, released_at = CURRENT_TIMESTAMP, released_by = ?
           WHERE replenishment_task_id = ?`,
          [LOCATION_OCCUPATION_STATUS.RELEASED, operator, taskId]
        );
      }

      const pendingTasks = await allAsync(
        `SELECT COUNT(*) as count FROM replenishment_tasks 
         WHERE wave_id = ? AND status IN ('PENDING', 'PICKING', 'PARTIAL')`,
        [task.wave_id]
      );

      if (pendingTasks[0].count === 0) {
        await runAsync(
          `UPDATE waves SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [WAVE_STATUS.COMPLETED, task.wave_id]
        );
      }

      await historyService.recordOperation(task.wave_id, OPERATION_TYPE.CONFIRM_REPLENISHMENT, operator, {
        beforeStatus: task.status,
        afterStatus: newStatus,
        idempotentKey,
        changeContent: { taskId, replenishQty, newReplenishQty, newStatus }
      });

      await commit();

      return { taskId, status: newStatus, replenishQty, totalReplenished: newReplenishQty };
    } catch (err) {
      await rollback();
      throw err;
    }
  }

  async releaseOccupation(occupationId, operator) {
    const occupation = await getAsync(`SELECT * FROM location_occupations WHERE id = ?`, [occupationId]);
    if (!occupation) {
      throw new NotFoundError('库位占用记录不存在');
    }

    if (occupation.status === LOCATION_OCCUPATION_STATUS.RELEASED) {
      throw new BusinessError('该库位占用已释放');
    }

    await runAsync(
      `UPDATE location_occupations 
       SET status = ?, released_at = CURRENT_TIMESTAMP, released_by = ?
       WHERE id = ?`,
      [LOCATION_OCCUPATION_STATUS.RELEASED, operator, occupationId]
    );

    await historyService.recordOperation(occupation.wave_id, OPERATION_TYPE.RELEASE_LOCATION, operator, {
      changeContent: { occupationId, locationCode: occupation.location_code }
    });

    return { occupationId, status: LOCATION_OCCUPATION_STATUS.RELEASED };
  }

  async getReplenishmentTasks(waveId) {
    return await allAsync(
      `SELECT * FROM replenishment_tasks WHERE wave_id = ? ORDER BY created_at DESC`,
      [waveId]
    );
  }

  async getLocationOccupations(waveId, status = null) {
    let sql = `SELECT * FROM location_occupations WHERE wave_id = ?`;
    const params = [waveId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    return await allAsync(sql, params);
  }
}

module.exports = new ReplenishmentService();
