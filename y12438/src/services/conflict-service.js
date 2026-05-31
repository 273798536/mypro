const { getDb, generateNo } = require('../database/db');
const { TABLES } = require('../database/schema');
const ContractService = require('./contract-service');
const TransactionService = require('./transaction-service');
const PowerService = require('./power-service');

const CONFLICT_TYPES = {
  DEPOSIT_AMOUNT_MISMATCH: 'deposit_amount_mismatch',
  DUPLICATE_DEPOSIT: 'duplicate_deposit',
  POWER_PHOTO_MISSING: 'power_photo_missing',
  POWER_AMOUNT_DISPUTE: 'power_amount_dispute',
  DATA_SOURCE_CONFLICT: 'data_source_conflict',
  LATE_PHOTO: 'late_photo'
};

class ConflictService {
  static detectConflicts(contractNo) {
    const db = getDb();
    const conflicts = [];

    const fullData = ContractService.getContractFullData(contractNo);
    if (!fullData) return conflicts;

    const { contract, transactions, powerRequests } = fullData;

    const depositTotal = TransactionService.getTotalDepositByContract(contractNo);
    if (Math.abs(depositTotal.net_deposit - contract.deposit_amount) > 0.01) {
      conflicts.push({
        conflict_type: CONFLICT_TYPES.DEPOSIT_AMOUNT_MISMATCH,
        description: '押金金额不匹配',
        contract_value: contract.deposit_amount,
        transaction_value: depositTotal.net_deposit,
        source_data: JSON.stringify({ contract, depositTotal })
      });
    }

    const duplicates = TransactionService.detectDuplicateTransactions(contractNo);
    duplicates.forEach(dup => {
      conflicts.push({
        conflict_type: CONFLICT_TYPES.DUPLICATE_DEPOSIT,
        description: '押金重复记录',
        transaction_value: JSON.stringify(dup),
        source_data: JSON.stringify(dup)
      });
    });

    powerRequests.forEach(pr => {
      if (!pr.on_site_photo_url && pr.status === 'confirmed') {
        conflicts.push({
          conflict_type: CONFLICT_TYPES.POWER_PHOTO_MISSING,
          description: `加电申请[${pr.request_no}]缺少现场照片`,
          power_value: JSON.stringify(pr),
          source_data: JSON.stringify(pr)
        });
      }
    });

    const latePhotos = PowerService.checkLatePhotos(contractNo);
    latePhotos.forEach(lp => {
      conflicts.push({
        conflict_type: CONFLICT_TYPES.LATE_PHOTO,
        description: `加电申请[${lp.request_no}]现场照片晚到${Math.round(lp.days_late * 24)}小时`,
        power_value: JSON.stringify(lp),
        source_data: JSON.stringify(lp)
      });
    });

    if (conflicts.length > 0) {
      this.logConflicts(contractNo, conflicts);
    }

    return conflicts;
  }

  static logConflicts(contractNo, conflicts) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.CONFLICT_LOGS}
      (conflict_no, contract_no, conflict_type, source_data, contract_value,
       transaction_value, power_value, status, evidence_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return conflicts.map(conflict => {
      const conflictNo = generateNo('CF');
      const result = stmt.run(
        conflictNo,
        contractNo,
        conflict.conflict_type,
        conflict.source_data,
        conflict.contract_value !== undefined ? String(conflict.contract_value) : null,
        conflict.transaction_value !== undefined ? String(conflict.transaction_value) : null,
        conflict.power_value !== undefined ? String(conflict.power_value) : null,
        'pending',
        conflict.evidence_ref || null
      );
      return { id: result.lastInsertRowid, conflict_no: conflictNo, ...conflict };
    });
  }

  static resolveConflict(conflictNo, resolution, resolvedBy) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.CONFLICT_LOGS}
      SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE conflict_no = ?
    `);
    return stmt.run(resolution, resolvedBy, conflictNo);
  }

  static getConflictsByContract(contractNo, status = null) {
    const db = getDb();
    let sql = `SELECT * FROM ${TABLES.CONFLICT_LOGS} WHERE contract_no = ?`;
    const params = [contractNo];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY detected_at DESC`;
    return db.prepare(sql).all(...params);
  }

  static getUnresolvedConflicts() {
    const db = getDb();
    return db.prepare(`
      SELECT cf.*, bc.merchant_name, bc.booth_id
      FROM ${TABLES.CONFLICT_LOGS} cf
      JOIN ${TABLES.BOOTH_CONTRACTS} bc ON cf.contract_no = bc.contract_no
      WHERE cf.status = 'pending'
      ORDER BY cf.detected_at DESC
    `).all();
  }

  static createDeductionTrial(refundNo, deductionType, amount, reason, evidenceSource, createdBy) {
    const db = getDb();
    const trialNo = generateNo('DT');
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.DEDUCTION_TRIALS}
      (trial_no, refund_no, deduction_type, amount, reason, evidence_source, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(trialNo, refundNo, deductionType, amount, reason, evidenceSource, createdBy);
    return { id: result.lastInsertRowid, trial_no: trialNo };
  }

  static contestDeduction(trialNo, contestRemark) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.DEDUCTION_TRIALS}
      SET is_contested = 1, contest_remark = ?, trial_status = 'contested'
      WHERE trial_no = ?
    `);
    return stmt.run(contestRemark, trialNo);
  }

  static resolveDeductionTrial(trialNo, status) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.DEDUCTION_TRIALS}
      SET trial_status = ?
      WHERE trial_no = ?
    `);
    return stmt.run(status, trialNo);
  }
}

module.exports = { ConflictService, CONFLICT_TYPES };
