const db = require('../models');
const dayjs = require('dayjs');
const ChangeTracker = require('../utils/changeTracker');
const OperationLogger = require('../utils/operationLogger');

const ManualCorrectionService = {
  generateCorrectionNo() {
    return `COR-${dayjs().format('YYYYMMDDHHmmss')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  },

  async createCorrection(correctionData, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const { target_type, target_id, correction_type, fields, reason, exception_type, remarks } = correctionData;

      let targetRecord = null;
      let targetNo = null;

      if (target_type === 'seat_usage') {
        targetRecord = await db.SeatUsage.findByPk(target_id, { transaction });
        if (!targetRecord) {
          throw new Error(`用量记录[${target_id}]不存在`);
        }
        targetNo = targetRecord.usage_batch_no;
      } else if (target_type === 'bill') {
        targetRecord = await db.Bill.findByPk(target_id, { transaction });
        if (!targetRecord) {
          throw new Error(`账单[${target_id}]不存在`);
        }
        targetNo = targetRecord.bill_no;
      } else {
        throw new Error(`不支持的修正对象类型: ${target_type}`);
      }

      const beforeValue = targetRecord.toJSON();

      const trackedFields = target_type === 'seat_usage'
        ? [
            'current_active_seats',
            'current_contracted_seats',
            'current_excess_seats',
            'current_unit_price',
            'current_billing_amount',
            'billing_rule_id',
            'billing_rule_version',
          ]
        : [
            'current_contracted_seats',
            'current_peak_active_seats',
            'current_excess_seats',
            'current_base_amount',
            'current_excess_amount',
            'current_total_amount',
            'billing_rule_id',
            'billing_rule_version',
          ];

      const afterValue = { ...beforeValue };
      for (const field of trackedFields) {
        if (fields[field] !== undefined) {
          afterValue[field] = fields[field];
        }
      }

      const changeResult = target_type === 'seat_usage'
        ? ChangeTracker.calculateBillingChanges(beforeValue, afterValue)
        : ChangeTracker.calculateBillChanges(beforeValue, afterValue);

      if (!changeResult.hasChanges) {
        return {
          success: false,
          message: '没有检测到任何字段变更，无需创建修正记录',
          traceId,
        };
      }

      const affectedAmount = changeResult.summary._amount_diff
        ? changeResult.summary._amount_diff.diff
        : 0;

      const correctionNo = this.generateCorrectionNo();

      const correction = await db.ManualCorrection.create({
        correction_no: correctionNo,
        correction_type,
        target_type,
        target_id,
        before_value: beforeValue,
        after_value: afterValue,
        change_summary: changeResult.summary,
        reason,
        exception_type,
        affected_amount: affectedAmount,
        status: 'pending',
        created_by: operator,
        remarks,
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logCreate(
        'manual_correction',
        correction.id,
        correctionNo,
        correction.toJSON(),
        operator,
        traceId
      );

      return {
        success: true,
        data: correction.toJSON(),
        traceId,
        targetNo,
        changes: changeResult.summary,
      };
    } catch (err) {
      await transaction.rollback();
      await OperationLogger.log({
        operationType: 'create',
        module: 'manual_correction',
        operator,
        success: false,
        errorMessage: err.message,
        traceId,
      });
      throw err;
    }
  },

  async approveCorrection(correctionId, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const correction = await db.ManualCorrection.findByPk(correctionId, { transaction });
      if (!correction) {
        throw new Error(`修正记录[${correctionId}]不存在`);
      }

      if (correction.status !== 'pending') {
        throw new Error(`当前状态[${correction.status}]不支持审批操作`);
      }

      const beforeData = correction.toJSON();

      await correction.update({
        status: 'approved',
        approved_by: operator,
        approved_at: new Date(),
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logStatusChange(
        'manual_correction',
        correctionId,
        correction.correction_no,
        'pending',
        'approved',
        beforeData,
        correction.toJSON(),
        operator,
        traceId
      );

      return {
        success: true,
        data: correction.toJSON(),
        traceId,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async executeCorrection(correctionId, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const correction = await db.ManualCorrection.findByPk(correctionId, { transaction });
      if (!correction) {
        throw new Error(`修正记录[${correctionId}]不存在`);
      }

      if (correction.status !== 'approved') {
        throw new Error(`当前状态[${correction.status}]不支持执行操作，请先审批`);
      }

      const beforeData = correction.toJSON();
      const { target_type, target_id, after_value, change_summary } = correction;

      let targetRecord = null;
      let targetNo = null;

      if (target_type === 'seat_usage') {
        targetRecord = await db.SeatUsage.findByPk(target_id, { transaction });
        targetNo = targetRecord.usage_batch_no;

        await targetRecord.update({
          current_active_seats: after_value.current_active_seats,
          current_contracted_seats: after_value.current_contracted_seats,
          current_excess_seats: after_value.current_excess_seats,
          current_unit_price: after_value.current_unit_price,
          current_billing_amount: after_value.current_billing_amount,
          billing_rule_id: after_value.billing_rule_id,
          billing_rule_version: after_value.billing_rule_version,
          has_manual_correction: true,
          last_correction_id: correctionId,
          status: targetRecord.status === 'billed' ? 'corrected' : targetRecord.status,
        }, { transaction });
      } else if (target_type === 'bill') {
        targetRecord = await db.Bill.findByPk(target_id, { transaction });
        targetNo = targetRecord.bill_no;

        await targetRecord.update({
          current_contracted_seats: after_value.current_contracted_seats,
          current_peak_active_seats: after_value.current_peak_active_seats,
          current_excess_seats: after_value.current_excess_seats,
          current_base_amount: after_value.current_base_amount,
          current_excess_amount: after_value.current_excess_amount,
          current_total_amount: after_value.current_total_amount,
          billing_rule_id: after_value.billing_rule_id,
          billing_rule_version: after_value.billing_rule_version,
          has_manual_correction: true,
        }, { transaction });
      }

      await correction.update({
        status: 'executed',
        executed_at: new Date(),
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logCorrect(
        target_type,
        target_id,
        targetNo,
        correction.before_value,
        correction.after_value,
        change_summary,
        operator,
        traceId
      );

      await OperationLogger.logStatusChange(
        'manual_correction',
        correctionId,
        correction.correction_no,
        'approved',
        'executed',
        beforeData,
        correction.toJSON(),
        operator,
        traceId
      );

      return {
        success: true,
        data: correction.toJSON(),
        traceId,
        targetUpdated: {
          type: target_type,
          id: target_id,
          no: targetNo,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getCorrectionDetail(correctionId) {
    const correction = await db.ManualCorrection.findByPk(correctionId);
    if (!correction) {
      throw new Error(`修正记录[${correctionId}]不存在`);
    }

    const data = correction.toJSON();

    const logs = await db.OperationLog.findAll({
      where: {
        module: 'manual_correction',
        target_id: correctionId,
      },
      order: [['operation_time', 'ASC']],
    });

    data.operation_logs = logs;

    return data;
  },

  async getCorrectionList(query) {
    const where = {};
    if (query.target_type) where.target_type = query.target_type;
    if (query.target_id) where.target_id = query.target_id;
    if (query.status) where.status = query.status;
    if (query.exception_type) where.exception_type = query.exception_type;
    if (query.created_by) where.created_by = query.created_by;

    const { page = 1, pageSize = 20 } = query;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await db.ManualCorrection.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit: pageSize,
    });

    return {
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
      list: rows.map(r => r.toJSON()),
    };
  },

  async getCorrectionHistory(targetType, targetId) {
    const corrections = await db.ManualCorrection.findAll({
      where: {
        target_type: targetType,
        target_id: targetId,
      },
      order: [['created_at', 'ASC']],
    });

    const history = corrections.map((corr, index) => ({
      sequence: index + 1,
      correction_no: corr.correction_no,
      exception_type: corr.exception_type,
      reason: corr.reason,
      affected_amount: corr.affected_amount,
      status: corr.status,
      created_by: corr.created_by,
      created_at: corr.created_at,
      change_summary: corr.change_summary,
      before_value: corr.before_value,
      after_value: corr.after_value,
    }));

    return {
      targetType,
      targetId,
      totalCorrections: history.length,
      history,
    };
  },
};

module.exports = ManualCorrectionService;
