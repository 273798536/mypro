const { getDb, generateNo } = require('../database/db');
const { TABLES } = require('../database/schema');
const ContractService = require('./contract-service');
const TransactionService = require('./transaction-service');
const PowerService = require('./power-service');
const { ConflictService } = require('./conflict-service');

class RefundService {
  static calculateRefund(contractNo, operator = 'system') {
    const db = getDb();
    const contract = ContractService.getContract(contractNo);
    if (!contract) {
      throw new Error(`合同不存在: ${contractNo}`);
    }

    const depositInfo = TransactionService.getTotalDepositByContract(contractNo);
    const powerInfo = PowerService.getTotalPowerCharge(contractNo);
    const conflicts = ConflictService.detectConflicts(contractNo);
    const unresolvedConflicts = conflicts.filter(c => !c.resolved_at);

    const trials = db.prepare(`
      SELECT * FROM ${TABLES.DEDUCTION_TRIALS}
      WHERE refund_no IN (SELECT refund_no FROM ${TABLES.REFUND_RECORDS} WHERE contract_no = ?)
        AND trial_status IN ('approved', 'pending')
    `).all(contractNo);

    const totalDeductions = trials
      .filter(t => t.trial_status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDepositReceived = depositInfo.net_deposit;
    const totalPowerCharge = powerInfo.total_from_deposit;
    const refundAmount = totalDepositReceived - totalPowerCharge - totalDeductions;

    const evidenceSummary = this.buildEvidenceSummary(contract, depositInfo, powerInfo, trials, conflicts);

    return {
      contract_no: contractNo,
      merchant_name: contract.merchant_name,
      booth_id: contract.booth_id,
      total_deposit_received: totalDepositReceived,
      total_power_charge: totalPowerCharge,
      total_deductions,
      refund_amount: refundAmount,
      has_conflicts: unresolvedConflicts.length > 0,
      conflict_count: unresolvedConflicts.length,
      evidence_summary: evidenceSummary,
      details: {
        contract,
        deposit_info: depositInfo,
        power_info: powerInfo,
        deductions: trials,
        conflicts
      }
    };
  }

  static buildEvidenceSummary(contract, depositInfo, powerInfo, trials, conflicts) {
    const parts = [];
    parts.push(`合同约定押金: ¥${contract.deposit_amount}`);
    parts.push(`实际收取押金: ¥${depositInfo.total_deposit} (${depositInfo.transaction_count}笔)`);
    if (depositInfo.total_refund > 0) {
      parts.push(`已退押金: ¥${depositInfo.total_refund}`);
    }
    if (powerInfo.request_count > 0) {
      parts.push(`加电费用: ¥${powerInfo.total_from_deposit} (${powerInfo.request_count}次)`);
    }
    if (trials.length > 0) {
      const approved = trials.filter(t => t.trial_status === 'approved');
      if (approved.length > 0) {
        parts.push(`扣罚金额: ¥${approved.reduce((s, t) => s + t.amount, 0)} (${approved.length}项)`);
      }
    }
    if (conflicts.length > 0) {
      parts.push(`存在${conflicts.length}个待处理冲突`);
    }
    return parts.join(' | ');
  }

  static createRefundRecord(contractNo, operator) {
    const db = getDb();
    const calculation = this.calculateRefund(contractNo, operator);

    const refundNo = generateNo('RF');
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.REFUND_RECORDS}
      (refund_no, contract_no, total_deposit_received, total_power_charge,
       total_deductions, refund_amount, refund_status, operator,
       has_conflicts, evidence_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      refundNo,
      contractNo,
      calculation.total_deposit_received,
      calculation.total_power_charge,
      calculation.total_deductions,
      calculation.refund_amount,
      calculation.has_conflicts ? 'pending_conflict' : 'pending',
      operator,
      calculation.has_conflicts ? 1 : 0,
      calculation.evidence_summary
    );

    this.createEvidenceLinks(refundNo, contractNo);

    this.recordHistory(contractNo, 'refund_calculation', calculation);

    return {
      refund_no: refundNo,
      id: result.lastInsertRowid,
      ...calculation
    };
  }

  static createEvidenceLinks(refundNo, contractNo) {
    const db = getDb();
    const fullData = ContractService.getContractFullData(contractNo);
    const links = [];

    const insertStmt = db.prepare(`
      INSERT INTO ${TABLES.EVIDENCE_LINKS}
      (link_no, refund_no, evidence_type, source_table, source_id, source_field, evidence_value, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let order = 0;

    links.push({
      link_no: generateNo('EV'),
      refund_no: refundNo,
      evidence_type: 'contract',
      source_table: TABLES.BOOTH_CONTRACTS,
      source_id: fullData.contract.id,
      source_field: 'deposit_amount',
      evidence_value: String(fullData.contract.deposit_amount),
      display_order: order++
    });

    fullData.transactions.forEach(tx => {
      links.push({
        link_no: generateNo('EV'),
        refund_no: refundNo,
        evidence_type: 'deposit_transaction',
        source_table: TABLES.DEPOSIT_TRANSACTIONS,
        source_id: tx.id,
        source_field: 'amount',
        evidence_value: String(tx.amount),
        display_order: order++
      });
    });

    fullData.powerRequests.forEach(pr => {
      links.push({
        link_no: generateNo('EV'),
        refund_no: refundNo,
        evidence_type: 'power_request',
        source_table: TABLES.POWER_REQUESTS,
        source_id: pr.id,
        source_field: 'total_amount',
        evidence_value: String(pr.total_amount),
        display_order: order++
      });
    });

    links.forEach(link => {
      insertStmt.run(
        link.link_no,
        link.refund_no,
        link.evidence_type,
        link.source_table,
        link.source_id,
        link.source_field,
        link.evidence_value,
        link.display_order
      );
    });

    return links;
  }

  static getRefundWithEvidence(refundNo) {
    const db = getDb();
    const refund = db.prepare(`
      SELECT rr.*, bc.merchant_name, bc.booth_id
      FROM ${TABLES.REFUND_RECORDS} rr
      JOIN ${TABLES.BOOTH_CONTRACTS} bc ON rr.contract_no = bc.contract_no
      WHERE rr.refund_no = ?
    `).get(refundNo);

    if (!refund) return null;

    const evidence = db.prepare(`
      SELECT el.*,
        CASE el.source_table
          WHEN '${TABLES.BOOTH_CONTRACTS}' THEN bc.merchant_name
          WHEN '${TABLES.DEPOSIT_TRANSACTIONS}' THEN dt.transaction_type || ' - ' || dt.payment_method
          WHEN '${TABLES.POWER_REQUESTS}' THEN pr.request_kw || 'KW x ' || pr.usage_days || '天'
        END as source_description,
        CASE el.source_table
          WHEN '${TABLES.DEPOSIT_TRANSACTIONS}' THEN dt.photo_url
          WHEN '${TABLES.POWER_REQUESTS}' THEN pr.on_site_photo_url
        END as photo_url
      FROM ${TABLES.EVIDENCE_LINKS} el
      LEFT JOIN ${TABLES.BOOTH_CONTRACTS} bc ON el.source_table = '${TABLES.BOOTH_CONTRACTS}' AND el.source_id = bc.id
      LEFT JOIN ${TABLES.DEPOSIT_TRANSACTIONS} dt ON el.source_table = '${TABLES.DEPOSIT_TRANSACTIONS}' AND el.source_id = dt.id
      LEFT JOIN ${TABLES.POWER_REQUESTS} pr ON el.source_table = '${TABLES.POWER_REQUESTS}' AND el.source_id = pr.id
      WHERE el.refund_no = ?
      ORDER BY el.display_order
    `).all(refundNo);

    const deductions = db.prepare(`
      SELECT * FROM ${TABLES.DEDUCTION_TRIALS}
      WHERE refund_no = ?
      ORDER BY created_at
    `).all(refundNo);

    const corrections = db.prepare(`
      SELECT * FROM ${TABLES.MANUAL_CORRECTIONS}
      WHERE refund_no = ?
      ORDER BY created_at
    `).all(refundNo);

    const conflicts = db.prepare(`
      SELECT * FROM ${TABLES.CONFLICT_LOGS}
      WHERE contract_no = ?
      ORDER BY detected_at
    `).all(refund.contract_no);

    const history = db.prepare(`
      SELECT * FROM ${TABLES.HISTORY_RECORDS}
      WHERE contract_no = ?
      ORDER BY operation_time DESC
      LIMIT 20
    `).all(refund.contract_no);

    return {
      refund,
      evidence_chain: evidence,
      deductions,
      corrections,
      conflicts,
      history,
      trace_path: [
        { type: 'refund', data: refund },
        { type: 'evidence', data: evidence },
        { type: 'deductions', data: deductions },
        { type: 'corrections', data: corrections },
        { type: 'conflicts', data: conflicts },
        { type: 'history', data: history }
      ]
    };
  }

  static recordHistory(contractNo, recordType, data, operator = 'system', remarks = '') {
    const db = getDb();
    const historyNo = generateNo('HS');
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.HISTORY_RECORDS}
      (history_no, contract_no, record_type, original_data, processed_result, operator, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const originalData = JSON.stringify(data.details || data);
    const processedResult = JSON.stringify({
      refund_amount: data.refund_amount,
      total_deductions: data.total_deductions
    });

    return stmt.run(historyNo, contractNo, recordType, originalData, processedResult, operator, remarks);
  }

  static addManualCorrection(refundNo, correctionType, originalValue, correctedValue, reason, operator, approvedBy) {
    const db = getDb();
    const correctionNo = generateNo('MC');
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.MANUAL_CORRECTIONS}
      (correction_no, refund_no, correction_type, original_value, corrected_value, reason, operator, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(correctionNo, refundNo, correctionType, originalValue, correctedValue, reason, operator, approvedBy);

    const refund = db.prepare(`SELECT * FROM ${TABLES.REFUND_RECORDS} WHERE refund_no = ?`).get(refundNo);
    if (refund) {
      const adjustment = correctedValue - originalValue;
      const newRefundAmount = refund.refund_amount - adjustment;
      db.prepare(`
        UPDATE ${TABLES.REFUND_RECORDS}
        SET refund_amount = ?, updated_at = CURRENT_TIMESTAMP, final_decision = ?
        WHERE refund_no = ?
      `).run(newRefundAmount, `人工修正: ${reason}`, refundNo);
    }

    return { id: result.lastInsertRowid, correction_no: correctionNo };
  }

  static confirmRefund(refundNo, operator) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.REFUND_RECORDS}
      SET refund_status = 'completed', refund_date = CURRENT_DATE, operator = ?, updated_at = CURRENT_TIMESTAMP
      WHERE refund_no = ?
    `);
    return stmt.run(operator, refundNo);
  }

  static getAllRefunds(status = null) {
    const db = getDb();
    let sql = `
      SELECT rr.*, bc.merchant_name, bc.booth_id
      FROM ${TABLES.REFUND_RECORDS} rr
      JOIN ${TABLES.BOOTH_CONTRACTS} bc ON rr.contract_no = bc.contract_no
    `;
    const params = [];

    if (status) {
      sql += ` WHERE rr.refund_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY rr.created_at DESC`;
    return db.prepare(sql).all(...params);
  }
}

module.exports = RefundService;
