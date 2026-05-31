const db = require('../models');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const BillingRuleEngine = require('../utils/billingRuleEngine');
const ChangeTracker = require('../utils/changeTracker');
const OperationLogger = require('../utils/operationLogger');

const DowngradeService = {
  generateRequestNo() {
    return `DGR-${dayjs().format('YYYYMMDDHHmmss')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  },

  async createRequest(requestData, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const contract = await db.Contract.findByPk(requestData.contract_id, { transaction });
      if (!contract) {
        throw new Error(`合同[${requestData.contract_id}]不存在`);
      }

      const effectiveDate = dayjs(requestData.effective_date);
      const billingCycle = effectiveDate.format('YYYY-MM');
      const cycleStart = dayjs(billingCycle + '-01');
      const cycleEnd = cycleStart.endOf('month');
      const isCrossMonth = effectiveDate.isAfter(cycleStart) && effectiveDate.isBefore(cycleEnd) && effectiveDate.date() > 1;

      const originalCaliber = {
        seat_count: contract.current_seat_count,
        billing_rule_id: null,
        downgrade_rule: null,
      };

      const requestNo = this.generateRequestNo();

      const request = await db.DowngradeRequest.create({
        request_no: requestNo,
        contract_id: requestData.contract_id,
        original_seat_count: contract.current_seat_count,
        new_seat_count: requestData.new_seat_count,
        original_caliber: originalCaliber,
        new_caliber: requestData.new_caliber,
        caliber_change_description: requestData.caliber_change_description,
        effective_date: effectiveDate.toDate(),
        is_cross_month: isCrossMonth,
        cross_month_handling_rule: requestData.cross_month_handling_rule,
        status: 'pending',
        created_by: operator,
        remarks: requestData.remarks,
      }, { transaction });

      const caliberChanges = ChangeTracker.calculateCaliberChanges(originalCaliber, requestData.new_caliber);

      await transaction.commit();

      await OperationLogger.logCreate(
        'downgrade_request',
        request.id,
        requestNo,
        request.toJSON(),
        operator,
        traceId
      );

      const result = {
        success: true,
        data: request.toJSON(),
        traceId,
        isCrossMonth,
        caliberChanges: caliberChanges.changes,
      };

      if (isCrossMonth && !requestData.cross_month_handling_rule) {
        result.warnings = [{
          type: 'cross_month_detected',
          message: `降配生效日[${effectiveDate.format('YYYY-MM-DD')}]跨月，建议指定跨月处理规则`,
          suggestion: '可选规则: current_month-当月生效, next_month-次月生效, by_effective_date-按生效日折算',
        }];
      }

      return result;
    } catch (err) {
      await transaction.rollback();
      await OperationLogger.log({
        operationType: 'create',
        module: 'downgrade_request',
        operator,
        success: false,
        errorMessage: err.message,
        traceId,
      });
      throw err;
    }
  },

  async getAffectedUsages(requestId) {
    const request = await db.DowngradeRequest.findByPk(requestId);
    if (!request) {
      throw new Error(`降配申请[${requestId}]不存在`);
    }

    const contract = await db.Contract.findByPk(request.contract_id);
    const effectiveDate = dayjs(request.effective_date);

    let billingRule = null;
    try {
      billingRule = await BillingRuleEngine.getApplicableRule(
        contract.product_code,
        effectiveDate.toDate(),
        contract.id
      );
    } catch (err) {
    }

    const affectedCycles = [];
    const effectiveMonth = effectiveDate.format('YYYY-MM');

    if (request.is_cross_month) {
      const prevMonth = effectiveDate.subtract(1, 'month').format('YYYY-MM');
      affectedCycles.push(prevMonth, effectiveMonth);
    } else {
      affectedCycles.push(effectiveMonth);
    }

    const usages = await db.SeatUsage.findAll({
      where: {
        contract_id: request.contract_id,
        billing_cycle: { [Op.in]: affectedCycles },
        status: { [Op.ne]: 'cancelled' },
      },
      include: [
        { model: db.Contract, attributes: ['contract_no', 'customer_name'] },
      ],
      order: [['billing_cycle', 'ASC'], ['usage_date', 'ASC']],
    });

    const usageImpact = [];
    let totalAffectedAmount = 0;
    let totalAffectedCount = 0;

    for (const usage of usages) {
      const usageDate = dayjs(usage.usage_date);
      const usageCycle = usage.billing_cycle;

      let crossMonthCalc = null;
      let newContractedSeats = request.new_seat_count;
      let prorataFactor = 1;

      if (billingRule && request.is_cross_month) {
        crossMonthCalc = BillingRuleEngine.calculateCrossMonthDowngrade(
          billingRule,
          request,
          usageCycle
        );

        if (crossMonthCalc.beforeDays > 0 && crossMonthCalc.afterDays > 0) {
          prorataFactor = (crossMonthCalc.beforeDays * request.original_seat_count +
                            crossMonthCalc.afterDays * request.new_seat_count) /
                           (crossMonthCalc.daysInMonth * request.original_seat_count);
          newContractedSeats = Math.round(
            (crossMonthCalc.beforeDays * request.original_seat_count +
             crossMonthCalc.afterDays * request.new_seat_count) / crossMonthCalc.daysInMonth
          );
        } else if (crossMonthCalc.beforeDays > 0) {
          newContractedSeats = request.original_seat_count;
        } else {
          newContractedSeats = request.new_seat_count;
        }
      }

      const oldExcess = usage.current_excess_seats;
      const newExcess = Math.max(0, usage.current_active_seats - newContractedSeats);
      const excessDiff = newExcess - oldExcess;

      const oldAmount = Number(usage.current_billing_amount || 0);
      let newAmount = 0;

      if (billingRule) {
        newAmount = BillingRuleEngine.calculateBillingAmount(
          billingRule,
          usage.current_unit_price,
          newExcess,
          30,
          dayjs(usageCycle + '-01').endOf('month').date()
        );
        newAmount = Math.round(newAmount * prorataFactor * 100) / 100;
      }

      const amountDiff = newAmount - oldAmount;

      if (excessDiff !== 0 || amountDiff !== 0) {
        totalAffectedCount++;
        totalAffectedAmount = Math.round((totalAffectedAmount + amountDiff) * 100) / 100;

        usageImpact.push({
          usageId: usage.id,
          usageBatchNo: usage.usage_batch_no,
          billingCycle: usage.billing_cycle,
          usageDate: usageDate.format('YYYY-MM-DD'),
          employeeId: usage.employee_id,
          employeeName: usage.employee_name,
          oldContractedSeats: usage.current_contracted_seats,
          newContractedSeats,
          oldExcessSeats: oldExcess,
          newExcessSeats: newExcess,
          excessDiff,
          oldBillingAmount: oldAmount,
          newBillingAmount: newAmount,
          amountDiff,
          crossMonthCalc,
          prorataFactor,
          isCrossMonthAffected: request.is_cross_month,
          currentStatus: usage.status,
        });
      }
    }

    const caliberChanges = ChangeTracker.calculateCaliberChanges(
      request.original_caliber,
      request.new_caliber
    );

    return {
      request: request.toJSON(),
      contract: contract.toJSON(),
      affectedCycles,
      caliberChanges: caliberChanges.changes,
      totalAffectedCount,
      totalAffectedAmount,
      affectedUsages: usageImpact,
      billingRuleApplied: billingRule ? {
        ruleCode: billingRule.rule_code,
        version: billingRule.version,
        crossMonthRule: billingRule.downgrade_cross_month_rule,
      } : null,
    };
  },

  async approveRequest(requestId, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const request = await db.DowngradeRequest.findByPk(requestId, { transaction });
      if (!request) {
        throw new Error(`降配申请[${requestId}]不存在`);
      }

      if (request.status !== 'pending') {
        throw new Error(`当前状态[${request.status}]不支持审批操作`);
      }

      const beforeData = request.toJSON();

      await request.update({
        status: 'approved',
        approved_by: operator,
        approved_at: new Date(),
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logStatusChange(
        'downgrade_request',
        requestId,
        request.request_no,
        'pending',
        'approved',
        beforeData,
        request.toJSON(),
        operator,
        traceId
      );

      return {
        success: true,
        data: request.toJSON(),
        traceId,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async executeRequest(requestId, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const request = await db.DowngradeRequest.findByPk(requestId, { transaction });
      if (!request) {
        throw new Error(`降配申请[${requestId}]不存在`);
      }

      if (request.status !== 'approved') {
        throw new Error(`当前状态[${request.status}]不支持执行操作，请先审批`);
      }

      const beforeData = request.toJSON();

      const impactResult = await this.getAffectedUsages(requestId);

      const contract = await db.Contract.findByPk(request.contract_id, { transaction });
      const oldContractSeats = contract.current_seat_count;

      await contract.update({
        current_seat_count: request.new_seat_count,
      }, { transaction });

      for (const impact of impactResult.affectedUsages) {
        const usage = await db.SeatUsage.findByPk(impact.usageId, { transaction });
        if (usage && usage.status !== 'billed') {
          const usageBefore = usage.toJSON();

          await usage.update({
            current_contracted_seats: impact.newContractedSeats,
            current_excess_seats: impact.newExcessSeats,
            current_billing_amount: impact.newBillingAmount,
            is_downgrade_cross_month: impact.isCrossMonthAffected,
            downgrade_request_id: requestId,
          }, { transaction });

          await OperationLogger.logUpdate(
            'seat_usage',
            usage.id,
            usage.usage_batch_no,
            usageBefore,
            usage.toJSON(),
            {
              reason: { diff: `降配申请[${request.request_no}]口径变更影响` },
              caliberChange: request.caliber_change_description,
            },
            operator,
            traceId
          );
        }
      }

      await request.update({
        status: 'executed',
        executed_at: new Date(),
        affected_usage_count: impactResult.totalAffectedCount,
        affected_billing_amount: impactResult.totalAffectedAmount,
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logStatusChange(
        'downgrade_request',
        requestId,
        request.request_no,
        'approved',
        'executed',
        beforeData,
        request.toJSON(),
        operator,
        traceId,
        `影响用量${impactResult.totalAffectedCount}条，金额${impactResult.totalAffectedAmount}元`
      );

      return {
        success: true,
        data: request.toJSON(),
        traceId,
        contractUpdate: {
          oldSeats: oldContractSeats,
          newSeats: request.new_seat_count,
        },
        impactSummary: {
          affectedCount: impactResult.totalAffectedCount,
          affectedAmount: impactResult.totalAffectedAmount,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getRequestList(query) {
    const where = {};
    if (query.contract_id) where.contract_id = query.contract_id;
    if (query.status) where.status = query.status;
    if (query.is_cross_month !== undefined) where.is_cross_month = query.is_cross_month;

    const { page = 1, pageSize = 20 } = query;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await db.DowngradeRequest.findAndCountAll({
      where,
      include: [
        { model: db.Contract, attributes: ['contract_no', 'customer_name'] },
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
};

module.exports = DowngradeService;
