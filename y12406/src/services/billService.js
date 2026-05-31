const db = require('../models');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const BillingRuleEngine = require('../utils/billingRuleEngine');
const ChangeTracker = require('../utils/changeTracker');
const OperationLogger = require('../utils/operationLogger');

const BillService = {
  generateBillNo() {
    return `BILL-${dayjs().format('YYYYMMDDHHmmss')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  },

  async generateBill(contractId, billingCycle, operator) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const contract = await db.Contract.findByPk(contractId, { transaction });
      if (!contract) {
        throw new Error(`合同[${contractId}]不存在`);
      }

      const existingBill = await db.Bill.findOne({
        where: {
          contract_id: contractId,
          billing_cycle: billingCycle,
          is_red_flush: false,
        },
        transaction,
      });

      if (existingBill) {
        return {
          success: false,
          message: `该合同${billingCycle}周期已存在账单`,
          existingBill: existingBill.toJSON(),
          traceId,
        };
      }

      const usages = await db.SeatUsage.findAll({
        where: {
          contract_id: contractId,
          billing_cycle: billingCycle,
          status: { [Op.in]: ['reviewed', 'billing', 'billed', 'corrected'] },
          is_duplicate: false,
        },
        transaction,
        order: [['usage_date', 'ASC']],
      });

      if (usages.length === 0) {
        return {
          success: false,
          message: `该合同${billingCycle}周期没有符合条件的用量记录`,
          traceId,
        };
      }

      let billingRule = null;
      let ruleHints = null;
      try {
        billingRule = await BillingRuleEngine.getApplicableRule(
          contract.product_code,
          dayjs(billingCycle + '-01').toDate(),
          contractId
        );
      } catch (err) {
        if (err.name === 'BillingRuleMissingError') {
          ruleHints = err.actionableHints;
        } else {
          throw err;
        }
      }

      let originalPeakActive = 0;
      let currentPeakActive = 0;
      let originalTotalExcessAmount = 0;
      let currentTotalExcessAmount = 0;
      let hasRedFlush = false;
      let redFlushAmount = 0;

      const usageLinks = [];

      for (const usage of usages) {
        originalPeakActive = Math.max(originalPeakActive, usage.original_active_seats);
        currentPeakActive = Math.max(currentPeakActive, usage.current_active_seats);
        originalTotalExcessAmount = Math.round((originalTotalExcessAmount + Number(usage.original_billing_amount || 0)) * 100) / 100;
        currentTotalExcessAmount = Math.round((currentTotalExcessAmount + Number(usage.current_billing_amount || 0)) * 100) / 100;

        if (usage.is_invoice_red_flush) {
          hasRedFlush = true;
          redFlushAmount = Math.round((redFlushAmount + Number(usage.current_billing_amount || 0)) * 100) / 100;
        }

        usageLinks.push({
          seat_usage_id: usage.id,
          billing_amount: usage.current_billing_amount,
          excess_seats_count: usage.current_excess_seats,
          remarks: usage.remarks,
        });
      }

      const originalContractedSeats = contract.original_seat_count;
      const currentContractedSeats = contract.current_seat_count;
      const originalExcessSeats = Math.max(0, originalPeakActive - originalContractedSeats);
      const currentExcessSeats = Math.max(0, currentPeakActive - currentContractedSeats);

      const unitPrice = Number(contract.unit_price);
      const originalBaseAmount = Math.round(originalContractedSeats * unitPrice * 100) / 100;
      const currentBaseAmount = Math.round(currentContractedSeats * unitPrice * 100) / 100;

      const originalTotalAmount = Math.round((originalBaseAmount + originalTotalExcessAmount) * 100) / 100;
      const currentTotalAmount = Math.round((currentBaseAmount + currentTotalExcessAmount) * 100) / 100;

      const billNo = this.generateBillNo();

      const bill = await db.Bill.create({
        bill_no: billNo,
        contract_id: contractId,
        billing_cycle: billingCycle,
        customer_name: contract.customer_name,
        original_contracted_seats: originalContractedSeats,
        current_contracted_seats: currentContractedSeats,
        original_peak_active_seats: originalPeakActive,
        current_peak_active_seats: currentPeakActive,
        original_excess_seats: originalExcessSeats,
        current_excess_seats: currentExcessSeats,
        original_base_amount: originalBaseAmount,
        current_base_amount: currentBaseAmount,
        original_excess_amount: originalTotalExcessAmount,
        current_excess_amount: currentTotalExcessAmount,
        original_total_amount: originalTotalAmount,
        current_total_amount: currentTotalAmount,
        has_red_flush: hasRedFlush,
        red_flush_amount: redFlushAmount,
        billing_rule_id: billingRule ? billingRule.id : null,
        billing_rule_version: billingRule ? billingRule.version : null,
        status: 'draft',
        created_by: operator,
      }, { transaction });

      for (const link of usageLinks) {
        await db.BillUsageLink.create({
          ...link,
          bill_id: bill.id,
        }, { transaction });
      }

      await transaction.commit();

      await OperationLogger.logCreate(
        'bill',
        bill.id,
        billNo,
        {
          ...bill.toJSON(),
          usageCount: usages.length,
          usageLinks,
        },
        operator,
        traceId
      );

      const result = {
        success: true,
        data: bill.toJSON(),
        traceId,
        usageCount: usages.length,
      };

      if (ruleHints) {
        result.warnings = [{
          type: 'billing_rule_missing',
          message: '未找到匹配的计费规则，请检查规则配置',
          actionableHints: ruleHints,
        }];
      }

      return result;
    } catch (err) {
      await transaction.rollback();
      await OperationLogger.log({
        operationType: 'create',
        module: 'bill',
        operator,
        success: false,
        errorMessage: err.message,
        traceId,
      });
      throw err;
    }
  },

  async getBillDetail(billId) {
    const bill = await db.Bill.findByPk(billId, {
      include: [
        { model: db.Contract },
        { model: db.BillingRule, attributes: ['rule_code', 'rule_name', 'version'] },
      ],
    });

    if (!bill) {
      throw new Error(`账单[${billId}]不存在`);
    }

    const data = bill.toJSON();

    const usageLinks = await db.BillUsageLink.findAll({
      where: { bill_id: billId },
      include: [
        {
          model: db.SeatUsage,
          include: [db.DowngradeRequest],
        },
      ],
    });

    data.usage_details = usageLinks.map(link => {
      const linkData = link.toJSON();
      const usage = linkData.SeatUsage;
      const diffInfo = ChangeTracker.buildExportDiffRecord(usage);

      return {
        ...linkData,
        ...diffInfo,
        has_manual_correction: usage.has_manual_correction,
        is_downgrade_cross_month: usage.is_downgrade_cross_month,
        downgrade_request: usage.DowngradeRequest,
      };
    });

    const logs = await db.OperationLog.findAll({
      where: {
        module: 'bill',
        target_id: billId,
      },
      order: [['operation_time', 'ASC']],
    });

    data.operation_logs = logs;

    const corrections = await ManualCorrectionService.getCorrectionHistory('bill', billId);
    data.correction_history = corrections;

    return data;
  },

  async getBillList(query) {
    const where = {};
    if (query.contract_id) where.contract_id = query.contract_id;
    if (query.billing_cycle) where.billing_cycle = query.billing_cycle;
    if (query.status) where.status = query.status;
    if (query.has_manual_correction !== undefined) where.has_manual_correction = query.has_manual_correction;
    if (query.has_red_flush !== undefined) where.has_red_flush = query.has_red_flush;

    const { page = 1, pageSize = 20 } = query;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await db.Bill.findAndCountAll({
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

  async confirmBill(billId, operator) {
    const traceId = OperationLogger.generateTraceId();
    const bill = await db.Bill.findByPk(billId);

    if (!bill) {
      throw new Error(`账单[${billId}]不存在`);
    }

    if (bill.status !== 'draft') {
      throw new Error(`当前状态[${bill.status}]不支持确认操作`);
    }

    const oldStatus = bill.status;
    const beforeData = bill.toJSON();

    await bill.update({ status: 'confirmed' });

    await db.SeatUsage.update(
      { status: 'billed' },
      {
        where: {
          id: {
            [Op.in]: db.sequelize.literal(`(SELECT seat_usage_id FROM bill_usage_links WHERE bill_id = ${billId})`),
          },
        },
      }
    );

    await OperationLogger.logStatusChange(
      'bill',
      billId,
      bill.bill_no,
      oldStatus,
      'confirmed',
      beforeData,
      bill.toJSON(),
      operator,
      traceId
    );

    return {
      success: true,
      data: bill.toJSON(),
      traceId,
    };
  },

  async exportBill(billId, operator, format = 'csv', includeDiff = true) {
    const traceId = OperationLogger.generateTraceId();
    const bill = await this.getBillDetail(billId);

    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = dayjs().format('YYYYMMDDHHmmss');
    const fileName = `${bill.bill_no}_${timestamp}.csv`;
    const filePath = path.join(exportDir, fileName);

    const header = [
      { id: 'contract_no', title: '合同编号' },
      { id: 'customer_name', title: '客户名称' },
      { id: 'billing_cycle', title: '计费周期' },
      { id: 'bill_no', title: '账单编号' },
      { id: 'bill_status', title: '账单状态' },
      { id: 'employee_id', title: '员工工号' },
      { id: 'employee_name', title: '员工姓名' },
      { id: 'department', title: '部门' },
      { id: 'usage_date', title: '用量日期' },
    ];

    if (includeDiff) {
      header.push(
        { id: 'original_contracted_seats', title: '原始合同座席' },
        { id: 'current_contracted_seats', title: '当前合同座席' },
        { id: 'contracted_seats_diff', title: '合同座席差异' },
        { id: 'original_active_seats', title: '原始在用座席' },
        { id: 'current_active_seats', title: '当前在用座席' },
        { id: 'active_seats_diff', title: '在用座席差异' },
        { id: 'original_excess_seats', title: '原始超额座席' },
        { id: 'current_excess_seats', title: '当前超额座席' },
        { id: 'excess_seats_diff', title: '超额座席差异' },
        { id: 'original_unit_price', title: '原始单价' },
        { id: 'current_unit_price', title: '当前单价' },
        { id: 'unit_price_diff', title: '单价差异' },
        { id: 'original_billing_amount', title: '原始计费金额' },
        { id: 'current_billing_amount', title: '当前计费金额' },
        { id: 'billing_amount_diff', title: '计费金额差异' },
      );
    } else {
      header.push(
        { id: 'contracted_seats', title: '合同座席' },
        { id: 'active_seats', title: '在用座席' },
        { id: 'excess_seats', title: '超额座席' },
        { id: 'unit_price', title: '单价' },
        { id: 'billing_amount', title: '计费金额' },
      );
    }

    header.push(
      { id: 'billing_rule_code', title: '计费规则编码' },
      { id: 'billing_rule_version', title: '计费规则版本' },
      { id: 'is_duplicate', title: '是否重复' },
      { id: 'is_downgrade_cross_month', title: '是否降配跨月' },
      { id: 'is_invoice_red_flush', title: '是否发票红冲' },
      { id: 'has_manual_correction', title: '是否人工修正' },
      { id: 'downgrade_request_no', title: '关联降配申请' },
      { id: 'remarks', title: '备注' },
    );

    const records = [];

    for (const detail of bill.usage_details) {
      const usage = detail.SeatUsage;
      const record = {
        contract_no: bill.Contract.contract_no,
        customer_name: bill.customer_name,
        billing_cycle: bill.billing_cycle,
        bill_no: bill.bill_no,
        bill_status: bill.status,
        employee_id: usage.employee_id,
        employee_name: usage.employee_name,
        department: usage.department,
        usage_date: dayjs(usage.usage_date).format('YYYY-MM-DD'),
      };

      if (includeDiff) {
        const origCon = Number(usage.original_contracted_seats || 0);
        const currCon = Number(usage.current_contracted_seats || 0);
        const origAct = Number(usage.original_active_seats || 0);
        const currAct = Number(usage.current_active_seats || 0);
        const origExc = Number(usage.original_excess_seats || 0);
        const currExc = Number(usage.current_excess_seats || 0);
        const origPrice = Number(usage.original_unit_price || 0);
        const currPrice = Number(usage.current_unit_price || 0);
        const origAmt = Number(usage.original_billing_amount || 0);
        const currAmt = Number(usage.current_billing_amount || 0);

        record.original_contracted_seats = origCon;
        record.current_contracted_seats = currCon;
        record.contracted_seats_diff = currCon - origCon;
        record.original_active_seats = origAct;
        record.current_active_seats = currAct;
        record.active_seats_diff = currAct - origAct;
        record.original_excess_seats = origExc;
        record.current_excess_seats = currExc;
        record.excess_seats_diff = currExc - origExc;
        record.original_unit_price = origPrice;
        record.current_unit_price = currPrice;
        record.unit_price_diff = currPrice - origPrice;
        record.original_billing_amount = origAmt;
        record.current_billing_amount = currAmt;
        record.billing_amount_diff = currAmt - origAmt;
      } else {
        record.contracted_seats = usage.current_contracted_seats;
        record.active_seats = usage.current_active_seats;
        record.excess_seats = usage.current_excess_seats;
        record.unit_price = usage.current_unit_price;
        record.billing_amount = usage.current_billing_amount;
      }

      record.billing_rule_code = usage.billing_rule_id ? bill.BillingRule?.rule_code : '-';
      record.billing_rule_version = usage.billing_rule_version || '-';
      record.is_duplicate = usage.is_duplicate ? '是' : '否';
      record.is_downgrade_cross_month = usage.is_downgrade_cross_month ? '是' : '否';
      record.is_invoice_red_flush = usage.is_invoice_red_flush ? '是' : '否';
      record.has_manual_correction = usage.has_manual_correction ? '是' : '否';
      record.downgrade_request_no = usage.DowngradeRequest?.request_no || '-';
      record.remarks = usage.remarks || '';

      records.push(record);
    }

    if (includeDiff) {
      records.push({
        contract_no: '',
        customer_name: '',
        billing_cycle: '合计',
        bill_no: '',
        bill_status: '',
        employee_id: '',
        employee_name: '',
        department: '',
        usage_date: '',
        original_contracted_seats: '',
        current_contracted_seats: '',
        contracted_seats_diff: '',
        original_active_seats: bill.original_peak_active_seats,
        current_active_seats: bill.current_peak_active_seats,
        active_seats_diff: bill.current_peak_active_seats - bill.original_peak_active_seats,
        original_excess_seats: bill.original_excess_seats,
        current_excess_seats: bill.current_excess_seats,
        excess_seats_diff: bill.current_excess_seats - bill.original_excess_seats,
        original_unit_price: '',
        current_unit_price: '',
        unit_price_diff: '',
        original_billing_amount: bill.original_total_amount,
        current_billing_amount: bill.current_total_amount,
        billing_amount_diff: Number(bill.current_total_amount || 0) - Number(bill.original_total_amount || 0),
        billing_rule_code: '',
        billing_rule_version: '',
        is_duplicate: '',
        is_downgrade_cross_month: '',
        is_invoice_red_flush: '',
        has_manual_correction: '',
        downgrade_request_no: '',
        remarks: bill.has_manual_correction ? '包含人工修正' : bill.has_red_flush ? '包含发票红冲' : '',
      });
    }

    const csvWriter = createCsvWriter({
      path: filePath,
      header: header,
    });

    await csvWriter.writeRecords(records);

    await db.Bill.update(
      {
        export_count: (bill.export_count || 0) + 1,
        last_exported_at: new Date(),
        last_exported_by: operator,
      },
      { where: { id: billId } }
    );

    await OperationLogger.logExport(
      'bill',
      billId,
      bill.bill_no,
      {
        format,
        includeDiff,
        recordCount: records.length,
        fileName,
      },
      operator,
      traceId
    );

    return {
      success: true,
      filePath,
      fileName,
      recordCount: records.length,
      includeDiff,
      traceId,
    };
  },

  async createRedFlushBill(billId, operator, reason) {
    const traceId = OperationLogger.generateTraceId();
    const transaction = await db.sequelize.transaction();

    try {
      const originalBill = await db.Bill.findByPk(billId, { transaction });
      if (!originalBill) {
        throw new Error(`原账单[${billId}]不存在`);
      }

      if (originalBill.is_red_flush) {
        throw new Error(`该账单已经是红冲账单，不能再次红冲`);
      }

      const redFlushBillNo = this.generateBillNo() + '-RED';

      const redFlushBill = await db.Bill.create({
        bill_no: redFlushBillNo,
        contract_id: originalBill.contract_id,
        billing_cycle: originalBill.billing_cycle,
        customer_name: originalBill.customer_name,
        original_contracted_seats: originalBill.original_contracted_seats,
        current_contracted_seats: originalBill.current_contracted_seats,
        original_peak_active_seats: originalBill.original_peak_active_seats,
        current_peak_active_seats: originalBill.current_peak_active_seats,
        original_excess_seats: originalBill.original_excess_seats,
        current_excess_seats: originalBill.current_excess_seats,
        original_base_amount: -originalBill.original_base_amount,
        current_base_amount: -originalBill.current_base_amount,
        original_excess_amount: -originalBill.original_excess_amount,
        current_excess_amount: -originalBill.current_excess_amount,
        original_total_amount: -originalBill.original_total_amount,
        current_total_amount: -originalBill.current_total_amount,
        has_red_flush: false,
        red_flush_amount: -originalBill.current_total_amount,
        related_bill_id: billId,
        is_red_flush: true,
        billing_rule_id: originalBill.billing_rule_id,
        billing_rule_version: originalBill.billing_rule_version,
        status: 'draft',
        created_by: operator,
        remarks: `红冲账单，原账单: ${originalBill.bill_no}，原因: ${reason}`,
      }, { transaction });

      const originalLinks = await db.BillUsageLink.findAll({
        where: { bill_id: billId },
        transaction,
      });

      for (const link of originalLinks) {
        await db.BillUsageLink.create({
          bill_id: redFlushBill.id,
          seat_usage_id: link.seat_usage_id,
          billing_amount: -link.billing_amount,
          excess_seats_count: -link.excess_seats_count,
          remarks: `红冲关联，原账单: ${originalBill.bill_no}`,
        }, { transaction });

        await db.SeatUsage.update(
          {
            is_invoice_red_flush: true,
            related_invoice_id: originalBill.bill_no,
            current_billing_amount: db.sequelize.literal(`current_billing_amount - ${link.billing_amount}`),
          },
          { where: { id: link.seat_usage_id }, transaction }
        );
      }

      await originalBill.update({
        has_red_flush: true,
        related_bill_id: redFlushBill.id,
        red_flush_amount: originalBill.current_total_amount,
      }, { transaction });

      const redFlushNo = `RF-${dayjs().format('YYYYMMDDHHmmss')}`;
      await db.InvoiceRedFlush.create({
        red_flush_no: redFlushNo,
        original_invoice_no: originalBill.bill_no,
        original_invoice_amount: originalBill.current_total_amount,
        red_flush_amount: -originalBill.current_total_amount,
        contract_id: originalBill.contract_id,
        related_bill_id: redFlushBill.id,
        related_bill_no: redFlushBillNo,
        original_billing_cycle: originalBill.billing_cycle,
        red_flush_reason: reason,
        impact_on_usage: {
          affected_usage_ids: originalLinks.map(l => l.seat_usage_id),
          amount_adjustment: -originalBill.current_total_amount,
        },
        status: 'processed',
        processed_at: new Date(),
        processed_by: operator,
        created_by: operator,
      }, { transaction });

      await transaction.commit();

      await OperationLogger.logCreate(
        'bill',
        redFlushBill.id,
        redFlushBillNo,
        {
          ...redFlushBill.toJSON(),
          originalBillNo: originalBill.bill_no,
          reason,
        },
        operator,
        traceId
      );

      return {
        success: true,
        data: redFlushBill.toJSON(),
        originalBillNo: originalBill.bill_no,
        redFlushAmount: -originalBill.current_total_amount,
        traceId,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async updateBillStatus(billId, targetStatus, operator, remarks = null) {
    const traceId = OperationLogger.generateTraceId();
    const bill = await db.Bill.findByPk(billId);

    if (!bill) {
      throw new Error(`账单[${billId}]不存在`);
    }

    const validTransitions = {
      'draft': ['confirmed', 'cancelled'],
      'confirmed': ['invoiced', 'cancelled'],
      'invoiced': ['paid', 'cancelled'],
      'paid': ['cancelled'],
    };

    if (!validTransitions[bill.status] || !validTransitions[bill.status].includes(targetStatus)) {
      throw new Error(`不支持从[${bill.status}]状态推进到[${targetStatus}]状态`);
    }

    const oldStatus = bill.status;
    const beforeData = bill.toJSON();

    await bill.update({
      status: targetStatus,
      remarks: remarks ? (bill.remarks ? `${bill.remarks}; ${remarks}` : remarks) : bill.remarks,
    });

    await OperationLogger.logStatusChange(
      'bill',
      billId,
      bill.bill_no,
      oldStatus,
      targetStatus,
      beforeData,
      bill.toJSON(),
      operator,
      traceId,
      remarks
    );

    return {
      success: true,
      data: bill.toJSON(),
      traceId,
      oldStatus,
      newStatus: targetStatus,
    };
  },
};

const ManualCorrectionService = require('./manualCorrectionService');

module.exports = BillService;
