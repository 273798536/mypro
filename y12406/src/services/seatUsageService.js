const db = require('../models');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const BillingRuleEngine = require('../utils/billingRuleEngine');
const SeatDuplicateHandler = require('../utils/seatDuplicateHandler');
const ChangeTracker = require('../utils/changeTracker');
const OperationLogger = require('../utils/operationLogger');

const SeatUsageService = {
  generateBatchNo() {
    return `USG-${dayjs().format('YYYYMMDDHHmmss')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  },

  async createUsage(usageData, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const duplicateCheck = await SeatDuplicateHandler.detectDuplicates(usageData);

      const contract = await db.Contract.findByPk(usageData.contract_id, { transaction });
      if (!contract) {
        throw new Error(`合同[${usageData.contract_id}]不存在`);
      }

      let billingRule = null;
      let ruleHints = null;
      try {
        billingRule = await BillingRuleEngine.getApplicableRule(
          contract.product_code,
          usageData.usage_date,
          contract.id
        );
      } catch (err) {
        if (err.name === 'BillingRuleMissingError') {
          ruleHints = err.actionableHints;
        } else {
          throw err;
        }
      }

      const activeSeats = usageData.active_seats || usageData.original_active_seats || 0;
      const contractedSeats = contract.current_seat_count;
      const excessSeats = BillingRuleEngine.calculateExcessSeats(activeSeats, contractedSeats);
      const unitPrice = Number(contract.unit_price);

      let billingAmount = 0;
      if (billingRule) {
        billingAmount = BillingRuleEngine.calculateBillingAmount(
          billingRule,
          unitPrice,
          excessSeats,
          usageData.usage_days || 30,
          dayjs(usageData.billing_cycle + '-01').endOf('month').date()
        );
      }

      const batchNo = this.generateBatchNo();

      const usageRecord = await db.SeatUsage.create({
        usage_batch_no: batchNo,
        contract_id: usageData.contract_id,
        billing_cycle: usageData.billing_cycle,
        usage_date: dayjs(usageData.usage_date).toDate(),
        employee_id: usageData.employee_id,
        employee_name: usageData.employee_name,
        department: usageData.department,
        original_active_seats: activeSeats,
        current_active_seats: activeSeats,
        original_contracted_seats: contractedSeats,
        current_contracted_seats: contractedSeats,
        original_excess_seats: excessSeats,
        current_excess_seats: excessSeats,
        original_unit_price: unitPrice,
        current_unit_price: unitPrice,
        original_billing_amount: billingAmount,
        current_billing_amount: billingAmount,
        billing_rule_id: billingRule ? billingRule.id : null,
        billing_rule_version: billingRule ? billingRule.version : null,
        is_duplicate: duplicateCheck.isDuplicate,
        duplicate_of_id: duplicateCheck.isDuplicate ? duplicateCheck.existingRecord.id : null,
        duplicate_reason: duplicateCheck.isDuplicate ? duplicateCheck.reason : null,
        status: 'draft',
        created_by: operator,
        remarks: usageData.remarks,
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logCreate(
        'seat_usage',
        usageRecord.id,
        batchNo,
        usageRecord.toJSON(),
        operator,
        traceId
      );

      const result = {
        success: true,
        data: usageRecord.toJSON(),
        traceId,
      };

      if (duplicateCheck.isDuplicate) {
        result.warnings = [{
          type: 'duplicate_detected',
          message: duplicateCheck.reason,
          existingRecord: {
            id: duplicateCheck.existingRecord.id,
            batchNo: duplicateCheck.existingRecord.usage_batch_no,
          },
        }];
      }

      if (ruleHints) {
        result.warnings = result.warnings || [];
        result.warnings.push({
          type: 'billing_rule_missing',
          message: '未找到匹配的计费规则，金额已按0计算',
          actionableHints: ruleHints,
        });
      }

      return result;
    } catch (err) {
      await transaction.rollback();
      await OperationLogger.log({
        operationType: 'create',
        module: 'seat_usage',
        operator,
        success: false,
        errorMessage: err.message,
        traceId,
      });
      throw err;
    }
  },

  async getUsageList(query) {
    const where = {};

    if (query.contract_id) where.contract_id = query.contract_id;
    if (query.billing_cycle) where.billing_cycle = query.billing_cycle;
    if (query.status) where.status = query.status;
    if (query.employee_id) where.employee_id = query.employee_id;
    if (query.is_duplicate !== undefined) where.is_duplicate = query.is_duplicate;
    if (query.has_manual_correction !== undefined) where.has_manual_correction = query.has_manual_correction;

    const { page = 1, pageSize = 20 } = query;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await db.SeatUsage.findAndCountAll({
      where,
      include: [
        { model: db.Contract, attributes: ['contract_no', 'customer_name'] },
        { model: db.DowngradeRequest, attributes: ['request_no', 'caliber_change_description'] },
      ],
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

  async getUsageDetail(id) {
    const usage = await db.SeatUsage.findByPk(id, {
      include: [
        { model: db.Contract },
        { model: db.BillingRule, attributes: ['rule_code', 'rule_name', 'version'] },
        { model: db.DowngradeRequest },
        {
          model: db.ManualCorrection,
          as: 'ManualCorrections',
          foreignKey: 'target_id',
          scope: { target_type: 'seat_usage' },
          required: false,
        },
      ],
    });

    if (!usage) {
      throw new Error(`用量记录[${id}]不存在`);
    }

    const data = usage.toJSON();

    const logs = await db.OperationLog.findAll({
      where: {
        module: 'seat_usage',
        target_id: id,
      },
      order: [['operation_time', 'ASC']],
    });

    data.operation_logs = logs;

    if (data.is_duplicate && data.duplicate_of_id) {
      data.master_record = await db.SeatUsage.findByPk(data.duplicate_of_id, {
        attributes: ['id', 'usage_batch_no', 'current_active_seats', 'status'],
      });
    }

    return data;
  },

  async submitForReview(usageIds, operator) {
    const traceId = OperationLogger.generateTraceId();
    const results = [];

    for (const id of usageIds) {
      try {
        const usage = await db.SeatUsage.findByPk(id);
        if (!usage) {
          results.push({ id, success: false, error: '记录不存在' });
          continue;
        }

        if (usage.status !== 'draft') {
          results.push({ id, success: false, error: `当前状态[${usage.status}]不支持提交复核` });
          continue;
        }

        const oldStatus = usage.status;
        const beforeData = usage.toJSON();

        await usage.update({
          status: 'pending_review',
          review_status: 'pending',
        });

        await OperationLogger.logStatusChange(
          'seat_usage',
          id,
          usage.usage_batch_no,
          oldStatus,
          'pending_review',
          beforeData,
          usage.toJSON(),
          operator,
          traceId
        );

        results.push({ id, success: true, oldStatus, newStatus: 'pending_review' });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    return { results, traceId };
  },

  async reviewUsage(id, reviewResult, reviewComments, operator) {
    const traceId = OperationLogger.generateTraceId();
    const usage = await db.SeatUsage.findByPk(id);

    if (!usage) {
      throw new Error(`用量记录[${id}]不存在`);
    }

    if (usage.status !== 'pending_review') {
      throw new Error(`当前状态[${usage.status}]不支持复核操作`);
    }

    const oldStatus = usage.status;
    const oldReviewStatus = usage.review_status;
    const beforeData = usage.toJSON();

    let newStatus = oldStatus;
    if (reviewResult === 'passed') {
      newStatus = 'reviewed';
    } else if (reviewResult === 'rejected') {
      newStatus = 'draft';
    }

    await usage.update({
      status: newStatus,
      review_status: reviewResult,
      reviewed_by: operator,
      reviewed_at: new Date(),
      review_comments: reviewComments,
    });

    await OperationLogger.logReview(
      'seat_usage',
      id,
      usage.usage_batch_no,
      reviewResult,
      beforeData,
      usage.toJSON(),
      operator,
      traceId,
      reviewComments
    );

    return {
      success: true,
      data: usage.toJSON(),
      traceId,
      oldStatus,
      oldReviewStatus,
      newStatus,
    };
  },

  async advanceStatus(id, targetStatus, operator, remarks = null) {
    const traceId = OperationLogger.generateTraceId();
    const usage = await db.SeatUsage.findByPk(id);

    if (!usage) {
      throw new Error(`用量记录[${id}]不存在`);
    }

    const validTransitions = {
      'reviewed': ['billing', 'corrected'],
      'billing': ['billed'],
      'billed': ['corrected'],
      'corrected': ['billed'],
    };

    if (!validTransitions[usage.status] || !validTransitions[usage.status].includes(targetStatus)) {
      throw new Error(`不支持从[${usage.status}]状态推进到[${targetStatus}]状态`);
    }

    const oldStatus = usage.status;
    const beforeData = usage.toJSON();

    await usage.update({
      status: targetStatus,
      remarks: remarks ? (usage.remarks ? `${usage.remarks}; ${remarks}` : remarks) : usage.remarks,
    });

    await OperationLogger.logStatusChange(
      'seat_usage',
      id,
      usage.usage_batch_no,
      oldStatus,
      targetStatus,
      beforeData,
      usage.toJSON(),
      operator,
      traceId,
      remarks
    );

    return {
      success: true,
      data: usage.toJSON(),
      traceId,
      oldStatus,
      newStatus: targetStatus,
    };
  },

  async recalculateUsage(id, operator) {
    const traceId = OperationLogger.generateTraceId();
    const usage = await db.SeatUsage.findByPk(id);

    if (!usage) {
      throw new Error(`用量记录[${id}]不存在`);
    }

    const contract = await db.Contract.findByPk(usage.contract_id);

    let billingRule = null;
    let ruleHints = null;

    try {
      billingRule = await BillingRuleEngine.getApplicableRule(
        contract.product_code,
        usage.usage_date,
        contract.id
      );
    } catch (err) {
      if (err.name === 'BillingRuleMissingError') {
        ruleHints = err.actionableHints;
      } else {
        throw err;
      }
    }

    if (!billingRule) {
      return {
        success: false,
        message: '重新计算失败：未找到匹配的计费规则',
        actionableHints: ruleHints,
        traceId,
      };
    }

    const beforeData = usage.toJSON();

    const excessSeats = BillingRuleEngine.calculateExcessSeats(
      usage.current_active_seats,
      usage.current_contracted_seats
    );

    const billingAmount = BillingRuleEngine.calculateBillingAmount(
      billingRule,
      usage.current_unit_price,
      excessSeats,
      30,
      dayjs(usage.billing_cycle + '-01').endOf('month').date()
    );

    const changes = ChangeTracker.calculateBillingChanges(beforeData, {
      ...beforeData,
      current_excess_seats: excessSeats,
      current_billing_amount: billingAmount,
      billing_rule_id: billingRule.id,
      billing_rule_version: billingRule.version,
    });

    await usage.update({
      current_excess_seats: excessSeats,
      current_billing_amount: billingAmount,
      billing_rule_id: billingRule.id,
      billing_rule_version: billingRule.version,
    });

    await OperationLogger.logUpdate(
      'seat_usage',
      id,
      usage.usage_batch_no,
      beforeData,
      usage.toJSON(),
      changes.summary,
      operator,
      traceId
    );

    return {
      success: true,
      data: usage.toJSON(),
      traceId,
      changes: changes.summary,
      ruleApplied: {
        ruleCode: billingRule.rule_code,
        version: billingRule.version,
      },
    };
  },

  async markDuplicate(duplicateId, masterId, reason, operator) {
    const traceId = OperationLogger.generateTraceId();
    const result = await SeatDuplicateHandler.markDuplicate(duplicateId, masterId, reason, operator);

    await OperationLogger.logUpdate(
      'seat_usage',
      duplicateId,
      result.duplicateRecord.usage_batch_no,
      { is_duplicate: false, status: result.oldStatus },
      result.duplicateRecord,
      {
        is_duplicate: { before: false, after: true, diff: '标记为重复记录' },
        status: { before: result.oldStatus, after: 'cancelled', diff: `${result.oldStatus} → cancelled` },
      },
      operator,
      traceId
    );

    return { ...result, traceId };
  },

  async mergeDuplicates(masterId, duplicateIds, mergeStrategy, operator) {
    const traceId = OperationLogger.generateTraceId();
    const result = await SeatDuplicateHandler.mergeDuplicates(masterId, duplicateIds, mergeStrategy, operator);

    await OperationLogger.logUpdate(
      'seat_usage',
      masterId,
      result.masterRecord.usage_batch_no,
      result.beforeMerge,
      result.afterMerge,
      {
        action: { diff: `合并了${result.mergedCount}条重复记录，策略: ${mergeStrategy}` },
      },
      operator,
      traceId
    );

    return { ...result, traceId };
  },

  async detectBatchDuplicates(contractId, billingCycle) {
    return await SeatDuplicateHandler.findDuplicatesInBatch(contractId, billingCycle);
  },

  async triggerDuplicateForTesting(contractId, billingCycle, employeeId) {
    return await SeatDuplicateHandler.triggerDuplicateForTesting(contractId, billingCycle, employeeId);
  },
};

module.exports = SeatUsageService;
