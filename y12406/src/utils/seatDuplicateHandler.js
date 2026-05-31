const db = require('../models');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

const SeatDuplicateHandler = {
  async detectDuplicates(usageData) {
    const { contract_id, billing_cycle, employee_id, usage_date } = usageData;

    const existing = await db.SeatUsage.findOne({
      where: {
        contract_id,
        billing_cycle,
        employee_id,
        usage_date: dayjs(usage_date).toDate(),
        status: { [Op.ne]: 'cancelled' },
      },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingRecord: existing,
        reason: `同一合同[${contract_id}]同一计费周期[${billing_cycle}]同一员工[${employee_id}]在[${dayjs(usage_date).format('YYYY-MM-DD')}]已有用量记录`,
      };
    }

    const similarRecords = await this.findSimilarRecords(usageData);

    return {
      isDuplicate: false,
      similarRecords,
    };
  },

  async findSimilarRecords(usageData) {
    const { contract_id, billing_cycle, employee_id, usage_date } = usageData;
    const date = dayjs(usage_date);

    return await db.SeatUsage.findAll({
      where: {
        contract_id,
        billing_cycle,
        employee_id,
        usage_date: {
          [Op.between]: [
            date.subtract(3, 'day').toDate(),
            date.add(3, 'day').toDate(),
          ],
        },
        status: { [Op.ne]: 'cancelled' },
      },
      order: [['usage_date', 'ASC']],
    });
  },

  async findDuplicatesInBatch(contractId, billingCycle) {
    const usages = await db.SeatUsage.findAll({
      where: {
        contract_id: contractId,
        billing_cycle: billingCycle,
        status: { [Op.ne]: 'cancelled' },
        is_duplicate: false,
      },
      order: [['employee_id', 'ASC'], ['usage_date', 'ASC']],
    });

    const duplicates = [];
    const seen = new Map();

    for (const usage of usages) {
      const key = `${usage.employee_id}_${dayjs(usage.usage_date).format('YYYY-MM-DD')}`;

      if (seen.has(key)) {
        const firstRecord = seen.get(key);
        duplicates.push({
          duplicateId: usage.id,
          duplicateBatchNo: usage.usage_batch_no,
          employeeId: usage.employee_id,
          usageDate: usage.usage_date,
          existingId: firstRecord.id,
          existingBatchNo: firstRecord.usage_batch_no,
          reason: '批量检测发现座席重复：同一员工同一日期多条记录',
        });
      } else {
        seen.set(key, usage);
      }
    }

    return duplicates;
  },

  async markDuplicate(duplicateUsageId, masterUsageId, reason, operator) {
    const duplicateRecord = await db.SeatUsage.findByPk(duplicateUsageId);
    if (!duplicateRecord) {
      throw new Error(`用量记录[${duplicateUsageId}]不存在`);
    }

    const masterRecord = await db.SeatUsage.findByPk(masterUsageId);
    if (!masterRecord) {
      throw new Error(`主记录[${masterUsageId}]不存在`);
    }

    const oldStatus = duplicateRecord.status;

    await duplicateRecord.update({
      is_duplicate: true,
      duplicate_of_id: masterUsageId,
      duplicate_reason: reason,
      status: 'cancelled',
      current_active_seats: 0,
      current_excess_seats: 0,
      current_billing_amount: 0,
    });

    return {
      duplicateRecord: duplicateRecord.toJSON(),
      masterRecord: masterRecord.toJSON(),
      oldStatus,
      newStatus: 'cancelled',
    };
  },

  async mergeDuplicates(masterId, duplicateIds, mergeStrategy = 'sum', operator) {
    const masterRecord = await db.SeatUsage.findByPk(masterId);
    if (!masterRecord) {
      throw new Error(`主记录[${masterId}]不存在`);
    }

    const duplicateRecords = await db.SeatUsage.findAll({
      where: { id: duplicateIds },
    });

    const beforeMerge = {
      masterActiveSeats: masterRecord.current_active_seats,
      masterBillingAmount: masterRecord.current_billing_amount,
      duplicateCount: duplicateRecords.length,
    };

    let totalAdditionalSeats = 0;
    let totalAdditionalAmount = 0;

    for (const dup of duplicateRecords) {
      totalAdditionalSeats += dup.current_active_seats || 0;
      totalAdditionalAmount += Number(dup.current_billing_amount || 0);

      await dup.update({
        is_duplicate: true,
        duplicate_of_id: masterId,
        duplicate_reason: `已合并到主记录[${masterRecord.usage_batch_no}]`,
        status: 'cancelled',
        current_active_seats: 0,
        current_excess_seats: 0,
        current_billing_amount: 0,
      });
    }

    let newActiveSeats = masterRecord.current_active_seats;
    if (mergeStrategy === 'sum') {
      newActiveSeats += totalAdditionalSeats;
    } else if (mergeStrategy === 'max') {
      newActiveSeats = Math.max(masterRecord.current_active_seats, totalAdditionalSeats);
    }

    const newExcessSeats = Math.max(0, newActiveSeats - masterRecord.current_contracted_seats);

    await masterRecord.update({
      current_active_seats: newActiveSeats,
      current_excess_seats: newExcessSeats,
      remarks: masterRecord.remarks ? `${masterRecord.remarks}; 已合并${duplicateRecords.length}条重复记录` : `已合并${duplicateRecords.length}条重复记录`,
    });

    return {
      masterRecord: masterRecord.toJSON(),
      mergedCount: duplicateRecords.length,
      beforeMerge,
      afterMerge: {
        masterActiveSeats: newActiveSeats,
        masterExcessSeats: newExcessSeats,
        totalAdditionalSeats,
        totalAdditionalAmount,
      },
    };
  },

  async unmarkDuplicate(usageId, operator) {
    const record = await db.SeatUsage.findByPk(usageId);
    if (!record) {
      throw new Error(`用量记录[${usageId}]不存在`);
    }

    const oldData = record.toJSON();

    await record.update({
      is_duplicate: false,
      duplicate_of_id: null,
      duplicate_reason: null,
      status: 'draft',
    });

    return {
      before: oldData,
      after: record.toJSON(),
    };
  },

  async triggerDuplicateForTesting(contractId, billingCycle, employeeId) {
    const usageDate = dayjs().format('YYYY-MM-DD');
    const usageDate2 = dayjs().add(1, 'day').format('YYYY-MM-DD');

    const testData1 = {
      contract_id: contractId,
      billing_cycle: billingCycle,
      employee_id: employeeId,
      usage_date: usageDate,
      employee_name: '测试员工',
      department: '测试部门',
      original_active_seats: 2,
      current_active_seats: 2,
      original_contracted_seats: 1,
      current_contracted_seats: 1,
      original_excess_seats: 1,
      current_excess_seats: 1,
      original_unit_price: 100,
      current_unit_price: 100,
      original_billing_amount: 100,
      current_billing_amount: 100,
      usage_batch_no: `TEST-DUP-${Date.now()}-1`,
      created_by: 'test_trigger',
      status: 'draft',
    };

    const testData2 = {
      ...testData1,
      usage_date: usageDate2,
      usage_batch_no: `TEST-DUP-${Date.now()}-2`,
      original_active_seats: 3,
      current_active_seats: 3,
      original_excess_seats: 2,
      current_excess_seats: 2,
      original_billing_amount: 200,
      current_billing_amount: 200,
    };

    const transaction = await db.sequelize.transaction();
    try {
      const record1 = await db.SeatUsage.create(testData1, { transaction });
      
      testData2.is_duplicate = true;
      testData2.duplicate_of_id = record1.id;
      testData2.duplicate_reason = `测试重复：同一合同[${contractId}]同一计费周期[${billingCycle}]同一员工[${employeeId}]在[${usageDate}]已有用量记录`;
      
      const record2 = await db.SeatUsage.create(testData2, { transaction });

      const detection = await this.detectDuplicates({
        contract_id: contractId,
        billing_cycle: billingCycle,
        employee_id: employeeId,
        usage_date: usageDate,
      }, { transaction });

      await transaction.commit();

      return {
        testRecords: [record1.toJSON(), record2.toJSON()],
        detectionResult: detection,
        note: '第二条记录已标记为重复，duplicate_of_id指向第一条记录。可使用GET /api/seat-usages/detect-duplicates进行批量检测。',
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};

module.exports = SeatDuplicateHandler;
