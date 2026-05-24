const { runAsync, getAsync, allAsync, beginTransaction, commit, rollback } = require('../config/database');
const { generateId, generateWaveNo, isValidStatusTransition } = require('../utils/helpers');
const { WAVE_STATUS, WAVE_STATUS_TRANSITIONS, OPERATION_TYPE } = require('../utils/constants');
const historyService = require('./historyService');
const { NotFoundError, StateTransitionError, ValidationError } = require('../middleware/errorHandler');

class WaveService {
  async createWave(data, operator, idempotentKey = null) {
    const { warehouseCode, zoneCode, teamCode, items, createdBy } = data;

    if (!items || items.length === 0) {
      throw new ValidationError('波次必须包含至少一个商品');
    }

    const waveId = generateId();
    const waveNo = data.waveNo || generateWaveNo();
    const totalSkuCount = items.length;
    const totalQty = items.reduce((sum, item) => sum + (item.planQty || 0), 0);

    await beginTransaction();

    try {
      await runAsync(
        `INSERT INTO waves (
          id, wave_no, warehouse_code, zone_code, team_code, status,
          total_sku_count, total_qty, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [waveId, waveNo, warehouseCode, zoneCode, teamCode, WAVE_STATUS.CREATED, 
         totalSkuCount, totalQty, createdBy || operator]
      );

      for (const item of items) {
        const itemId = generateId();
        await runAsync(
          `INSERT INTO wave_items (
            id, wave_id, sku_code, sku_name, location_code, plan_qty
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, waveId, item.skuCode, item.skuName, item.locationCode, item.planQty]
        );
      }

      await historyService.recordOperation(waveId, OPERATION_TYPE.CREATE_WAVE, operator, {
        afterStatus: WAVE_STATUS.CREATED,
        idempotentKey,
        changeContent: { waveNo, totalSkuCount, totalQty }
      });

      await commit();

      return await this.getWaveDetail(waveId);
    } catch (err) {
      await rollback();
      throw err;
    }
  }

  async getWaveDetail(waveId) {
    const wave = await getAsync(
      `SELECT * FROM waves WHERE id = ?`,
      [waveId]
    );

    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const items = await allAsync(
      `SELECT * FROM wave_items WHERE wave_id = ?`,
      [waveId]
    );

    return { ...wave, items };
  }

  async getWaveByNo(waveNo) {
    const wave = await getAsync(
      `SELECT * FROM waves WHERE wave_no = ?`,
      [waveNo]
    );

    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    return await this.getWaveDetail(wave.id);
  }

  async updateWaveStatus(waveId, newStatus, operator, reason = null) {
    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    if (!isValidStatusTransition(WAVE_STATUS_TRANSITIONS, wave.status, newStatus)) {
      throw new StateTransitionError(`无法从 ${wave.status} 转换到 ${newStatus}`);
    }

    await runAsync(
      `UPDATE waves SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, waveId]
    );

    await historyService.recordOperation(waveId, OPERATION_TYPE.UPDATE_WAVE, operator, {
      beforeStatus: wave.status,
      afterStatus: newStatus,
      changeContent: { reason }
    });

    return await this.getWaveDetail(waveId);
  }

  async recordPicking(waveId, pickingData, operator) {
    const { waveItemId, pickerCode, locationCode, skuCode, planQty, actualQty, diffType } = pickingData;

    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const diffQty = actualQty - planQty;

    const pickingId = generateId();
    await runAsync(
      `INSERT INTO picking_records (
        id, wave_id, wave_item_id, picker_code, location_code, 
        sku_code, plan_qty, actual_qty, diff_qty, diff_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pickingId, waveId, waveItemId, pickerCode, locationCode, 
       skuCode, planQty, actualQty, diffQty, diffType]
    );

    const waveItem = await getAsync(`SELECT * FROM wave_items WHERE id = ?`, [waveItemId]);
    const newPickedQty = (waveItem.picked_qty || 0) + actualQty;

    await runAsync(
      `UPDATE wave_items SET picked_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newPickedQty, waveItemId]
    );

    const wavePickedQty = wave.picked_qty + actualQty;
    const waveShortageQty = diffQty < 0 ? wave.shortage_qty + Math.abs(diffQty) : wave.shortage_qty;

    await runAsync(
      `UPDATE waves SET picked_qty = ?, shortage_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [wavePickedQty, waveShortageQty, waveId]
    );

    return { id: pickingId, diffQty };
  }

  async listWaves(filters = {}) {
    let sql = `SELECT * FROM waves WHERE 1=1`;
    const params = [];

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters.warehouseCode) {
      sql += ` AND warehouse_code = ?`;
      params.push(filters.warehouseCode);
    }
    if (filters.teamCode) {
      sql += ` AND team_code = ?`;
      params.push(filters.teamCode);
    }
    if (filters.zoneCode) {
      sql += ` AND zone_code = ?`;
      params.push(filters.zoneCode);
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    return await allAsync(sql, params);
  }
}

module.exports = new WaveService();
