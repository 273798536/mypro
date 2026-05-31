const { getDb, generateNo } = require('../database/db');
const { TABLES } = require('../database/schema');

class ContractService {
  static createContract(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.BOOTH_CONTRACTS}
      (contract_no, booth_id, merchant_name, deposit_amount, power_included_kw,
       contract_date, check_in_date, check_out_date, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contractNo = data.contract_no || generateNo('CT');
    const result = stmt.run(
      contractNo,
      data.booth_id,
      data.merchant_name,
      data.deposit_amount,
      data.power_included_kw || 0,
      data.contract_date,
      data.check_in_date || null,
      data.check_out_date || null,
      data.status || 'active',
      data.remarks || null
    );

    return { id: result.lastInsertRowid, contract_no: contractNo };
  }

  static getContract(contractNo) {
    const db = getDb();
    return db.prepare(`SELECT * FROM ${TABLES.BOOTH_CONTRACTS} WHERE contract_no = ?`).get(contractNo);
  }

  static getAllContracts() {
    const db = getDb();
    return db.prepare(`SELECT * FROM ${TABLES.BOOTH_CONTRACTS} ORDER BY contract_date DESC`).all();
  }

  static getContractFullData(contractNo) {
    const db = getDb();
    const contract = this.getContract(contractNo);
    if (!contract) return null;

    const transactions = db.prepare(`
      SELECT * FROM ${TABLES.DEPOSIT_TRANSACTIONS}
      WHERE contract_no = ? ORDER BY transaction_date
    `).all(contractNo);

    const powerRequests = db.prepare(`
      SELECT * FROM ${TABLES.POWER_REQUESTS}
      WHERE contract_no = ? ORDER BY request_date
    `).all(contractNo);

    const refunds = db.prepare(`
      SELECT * FROM ${TABLES.REFUND_RECORDS}
      WHERE contract_no = ? ORDER BY created_at DESC
    `).all(contractNo);

    const conflicts = db.prepare(`
      SELECT * FROM ${TABLES.CONFLICT_LOGS}
      WHERE contract_no = ? ORDER BY detected_at DESC
    `).all(contractNo);

    const history = db.prepare(`
      SELECT * FROM ${TABLES.HISTORY_RECORDS}
      WHERE contract_no = ? ORDER BY operation_time DESC
    `).all(contractNo);

    return {
      contract,
      transactions,
      powerRequests,
      refunds,
      conflicts,
      history
    };
  }
}

module.exports = ContractService;
