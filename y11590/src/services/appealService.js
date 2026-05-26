const { runAsync, getAsync, allAsync, beginTransaction, commit, rollback } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { APPEAL_STATUS, OPERATION_TYPE, WAVE_STATUS } = require('../utils/constants');
const historyService = require('./historyService');
const performanceService = require('./performanceService');
const { NotFoundError, ValidationError, BusinessError } = require('../middleware/errorHandler');

class AppealService {
  async createAppeal(waveId, appealData, operator) {
    const { waveItemId, performanceRecordId, appealReason, appellant } = appealData;

    if (!appealReason || appealReason.trim().length === 0) {
      throw new ValidationError('申诉理由不能为空');
    }

    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const appealId = generateId();

    await runAsync(
      `INSERT INTO appeals (
        id, wave_id, wave_item_id, performance_record_id,
        appellant, appeal_reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [appealId, waveId, waveItemId, performanceRecordId,
       appellant || operator, appealReason.trim(), APPEAL_STATUS.PENDING]
    );

    await historyService.recordOperation(waveId, OPERATION_TYPE.CREATE_APPEAL, operator, {
      changeContent: { appealId, waveItemId, performanceRecordId, appealReason }
    });

    return { appealId, status: APPEAL_STATUS.PENDING };
  }

  async reviewAppeal(appealId, reviewData, operator) {
    const { reviewResult, reviewComment, correctShortage = false } = reviewData;

    if (![APPEAL_STATUS.APPROVED, APPEAL_STATUS.REJECTED].includes(reviewResult)) {
      throw new ValidationError('审核结果必须是 APPROVED 或 REJECTED');
    }

    const appeal = await getAsync(`SELECT * FROM appeals WHERE id = ?`, [appealId]);
    if (!appeal) {
      throw new NotFoundError('申诉不存在');
    }

    if (appeal.status !== APPEAL_STATUS.PENDING) {
      throw new BusinessError('该申诉已处理，不能重复审核');
    }

    await beginTransaction();

    try {
      await runAsync(
        `UPDATE appeals 
         SET status = ?, reviewer = ?, review_result = ?, 
             review_comment = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reviewResult, operator, reviewResult, reviewComment, appealId]
      );

      if (reviewResult === APPEAL_STATUS.APPROVED && correctShortage) {
        await runAsync(
          `UPDATE wave_items 
           SET shortage_reason = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [reviewComment || '申诉改判', appeal.wave_item_id]
        );

        await performanceService.recalculatePerformance(appeal.wave_id, operator, null, true);
      }

      await historyService.recordOperation(appeal.wave_id, OPERATION_TYPE.REVIEW_APPEAL, operator, {
        changeContent: { 
          appealId, 
          reviewResult, 
          reviewComment,
          correctShortage
        }
      });

      await commit();

      return { appealId, status: reviewResult, reviewedBy: operator };
    } catch (err) {
      await rollback();
      throw err;
    }
  }

  async correctShortageReason(waveId, waveItemId, newReason, operator, idempotentKey = null) {
    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) {
      throw new NotFoundError('波次不存在');
    }

    const waveItem = await getAsync(`SELECT * FROM wave_items WHERE id = ?`, [waveItemId]);
    if (!waveItem) {
      throw new NotFoundError('波次商品不存在');
    }

    const oldReason = waveItem.shortage_reason;

    await runAsync(
      `UPDATE wave_items 
       SET shortage_reason = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newReason, waveItemId]
    );

    await runAsync(
      `UPDATE review_scans 
       SET shortage_reason = ?
       WHERE wave_item_id = ? AND is_shortage = 1
       ORDER BY scanned_at DESC LIMIT 1`,
      [newReason, waveItemId]
    );

    await historyService.recordOperation(waveId, OPERATION_TYPE.CORRECT_SHORTAGE, operator, {
      idempotentKey,
      changeContent: { 
        waveItemId, 
        oldReason, 
        newReason 
      }
    });

    return { waveItemId, oldReason, newReason };
  }

  async getWaveAppeals(waveId) {
    return await allAsync(
      `SELECT * FROM appeals WHERE wave_id = ? ORDER BY appeal_time DESC`,
      [waveId]
    );
  }

  async listAppeals(filters = {}) {
    let sql = `SELECT a.*, w.wave_no, w.team_code, w.zone_code 
               FROM appeals a
               JOIN waves w ON a.wave_id = w.id
               WHERE 1=1`;
    const params = [];

    if (filters.status) {
      sql += ` AND a.status = ?`;
      params.push(filters.status);
    }
    if (filters.teamCode) {
      sql += ` AND w.team_code = ?`;
      params.push(filters.teamCode);
    }
    if (filters.appellant) {
      sql += ` AND a.appellant = ?`;
      params.push(filters.appellant);
    }

    sql += ` ORDER BY a.appeal_time DESC`;

    return await allAsync(sql, params);
  }
}

module.exports = new AppealService();
