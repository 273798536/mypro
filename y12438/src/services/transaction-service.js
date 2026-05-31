const { getDb, generateNo } = require('../database/db');
const { TABLES } = require('../database/schema');

class TransactionService {
  static addTransaction(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.DEPOSIT_TRANSACTIONS}
      (transaction_no, contract_no, transaction_type, amount, transaction_date,
       payment_method, operator, photo_url, photo_upload_time, remarks, is_reconciled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transactionNo = data.transaction_no || generateNo('TX');
    const result = stmt.run(
      transactionNo,
      data.contract_no,
      data.transaction_type,
      data.amount,
      data.transaction_date,
      data.payment_method || null,
      data.operator || null,
      data.photo_url || null,
      data.photo_upload_time || null,
      data.remarks || null,
      data.is_reconciled || 0
    );

    return { id: result.lastInsertRowid, transaction_no: transactionNo };
  }

  static getTransactionsByContract(contractNo) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM ${TABLES.DEPOSIT_TRANSACTIONS}
      WHERE contract_no = ? ORDER BY transaction_date
    `).all(contractNo);
  }

  static getTransaction(transactionNo) {
    const db = getDb();
    return db.prepare(`SELECT * FROM ${TABLES.DEPOSIT_TRANSACTIONS} WHERE transaction_no = ?`).get(transactionNo);
  }

  static updateTransactionPhoto(transactionNo, photoUrl, uploadTime) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.DEPOSIT_TRANSACTIONS}
      SET photo_url = ?, photo_upload_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE transaction_no = ?
    `);
    return stmt.run(photoUrl, uploadTime, transactionNo);
  }

  static getTotalDepositByContract(contractNo) {
    const db = getDb();
    const result = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposit,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END), 0) as total_refund,
        COUNT(*) as transaction_count
      FROM ${TABLES.DEPOSIT_TRANSACTIONS}
      WHERE contract_no = ?
    `).get(contractNo);

    return {
      total_deposit: result.total_deposit,
      total_refund: result.total_refund,
      net_deposit: result.total_deposit - result.total_refund,
      transaction_count: result.transaction_count
    };
  }

  static detectDuplicateTransactions(contractNo) {
    const db = getDb();
    const duplicates = db.prepare(`
      SELECT
        transaction_type,
        amount,
        transaction_date,
        COUNT(*) as count,
        GROUP_CONCAT(transaction_no) as transaction_nos
      FROM ${TABLES.DEPOSIT_TRANSACTIONS}
      WHERE contract_no = ?
      GROUP BY transaction_type, amount, transaction_date
      HAVING count > 1
    `).all(contractNo);

    return duplicates.map(d => ({
      ...d,
      transaction_nos: d.transaction_nos.split(',')
    }));
  }
}

module.exports = TransactionService;
