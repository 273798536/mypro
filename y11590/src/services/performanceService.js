const { runAsync, getAsync, allAsync, beginTransaction, commit, rollback } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { PERFORMANCE_TYPE, OPERATION_TYPE } = require('../utils/constants');
const historyService = require('./historyService');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

class PerformanceService {
  async calculatePickingPerformance(waveId, waveItemId, userCode, teamCode, qty, skuCode) {
    const perfId = generateId();
    
    await runAsync(
      `INSERT INTO performance_records (
        id, wave_id, wave_item_id, team_code, user_code, 
        performance_type, sku_code, qty, is_valid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [perfId, waveId, waveItemId, teamCode, userCode, 
       PERFORMANCE_TYPE.PICKING, skuCode, qty]
    );

    return perfId;
  }

  async calculateReplenishmentPerformance(waveId, taskId, userCode, teamCode, qty, skuCode) {
    const perfId = generateId();
    
    await runAsync(
      `INSERT INTO performance_records (
        id, wave_id, replenishment_task_id, team_code, user_code, 
        performance_type, sku_code, qty, is_valid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [perfId, waveId, taskId, teamCode, userCode, 
       PERFORMANCE_TYPE.REPLENISHMENT, skuCode, qty]
    );

    return perfId;
  }

  async recalculatePerformance(waveId, operator, idempotentKey = null, skipTransaction = false) {
    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    if (!skipTransaction) {
      await beginTransaction();
    }

    try {
      await runAsync(
        `UPDATE performance_records 
         SET is_valid = 0, invalid_reason = '重新计算作废', recalculated_at = CURRENT_TIMESTAMP
         WHERE wave_id = ? AND is_valid = 1`,
        [waveId]
      );

      const pickingRecords = await allAsync(
        `SELECT pr.*, wi.location_code 
         FROM picking_records pr
         JOIN wave_items wi ON pr.wave_item_id = wi.id
         WHERE pr.wave_id = ?`,
        [waveId]
      );

      for (const pr of pickingRecords) {
        if (pr.actual_qty > 0) {
          await this.calculatePickingPerformance(
            waveId, pr.wave_item_id, pr.picker_code, 
            wave.team_code, pr.actual_qty, pr.sku_code
          );
        }
      }

      const replenishmentTasks = await allAsync(
        `SELECT * FROM replenishment_tasks 
         WHERE wave_id = ? AND replenish_qty > 0`,
        [waveId]
      );

      for (const task of replenishmentTasks) {
        if (task.picker_code) {
          await this.calculateReplenishmentPerformance(
            waveId, task.id, task.picker_code,
            wave.team_code, task.replenish_qty, task.sku_code
          );
        }
      }

      await historyService.recordOperation(waveId, OPERATION_TYPE.RECALCULATE_PERFORMANCE, operator, {
        idempotentKey,
        changeContent: { 
          pickingCount: pickingRecords.length, 
          replenishmentCount: replenishmentTasks.length 
        }
      });

      if (!skipTransaction) {
        await commit();
      }

      return await this.getWavePerformance(waveId);
    } catch (err) {
      if (!skipTransaction) {
        await rollback();
      }
      throw err;
    }
  }

  async getWavePerformance(waveId) {
    const records = await allAsync(
      `SELECT * FROM performance_records 
       WHERE wave_id = ? 
       ORDER BY calculated_at DESC`,
      [waveId]
    );

    const summary = {
      total: 0,
      picking: 0,
      replenishment: 0,
      byUser: {},
      byType: {}
    };

    for (const r of records) {
      if (!r.is_valid) continue;
      
      summary.total += r.qty;
      
      if (r.performance_type === PERFORMANCE_TYPE.PICKING) {
        summary.picking += r.qty;
      } else if (r.performance_type === PERFORMANCE_TYPE.REPLENISHMENT) {
        summary.replenishment += r.qty;
      }

      summary.byType[r.performance_type] = (summary.byType[r.performance_type] || 0) + r.qty;
      summary.byUser[r.user_code] = (summary.byUser[r.user_code] || 0) + r.qty;
    }

    return { records, summary };
  }

  async getPerformanceSummary(filters = {}) {
    let sql = `SELECT pr.*, w.team_code, w.zone_code, w.warehouse_code 
               FROM performance_records pr
               JOIN waves w ON pr.wave_id = w.id
               WHERE pr.is_valid = 1`;
    const params = [];

    if (filters.teamCode) {
      sql += ` AND w.team_code = ?`;
      params.push(filters.teamCode);
    }
    if (filters.zoneCode) {
      sql += ` AND w.zone_code = ?`;
      params.push(filters.zoneCode);
    }
    if (filters.warehouseCode) {
      sql += ` AND w.warehouse_code = ?`;
      params.push(filters.warehouseCode);
    }
    if (filters.startDate) {
      sql += ` AND DATE(pr.calculated_at) >= DATE(?)`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ` AND DATE(pr.calculated_at) <= DATE(?)`;
      params.push(filters.endDate);
    }

    const records = await allAsync(sql, params);

    const summary = {
      totalQty: 0,
      pickingQty: 0,
      replenishmentQty: 0,
      byTeam: {},
      byZone: {},
      bySku: {},
      byUser: {}
    };

    for (const r of records) {
      summary.totalQty += r.qty;
      
      if (r.performance_type === PERFORMANCE_TYPE.PICKING) {
        summary.pickingQty += r.qty;
      } else if (r.performance_type === PERFORMANCE_TYPE.REPLENISHMENT) {
        summary.replenishmentQty += r.qty;
      }

      summary.byTeam[r.team_code] = (summary.byTeam[r.team_code] || 0) + r.qty;
      summary.byZone[r.zone_code] = (summary.byZone[r.zone_code] || 0) + r.qty;
      summary.bySku[r.sku_code] = (summary.bySku[r.sku_code] || 0) + r.qty;
      summary.byUser[r.user_code] = (summary.byUser[r.user_code] || 0) + r.qty;
    }

    return summary;
  }
}

module.exports = new PerformanceService();
