const { getDb, generateNo } = require('../database/db');
const { TABLES } = require('../database/schema');

class PowerService {
  static addRequest(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO ${TABLES.POWER_REQUESTS}
      (request_no, contract_no, request_kw, request_date, usage_days,
       unit_price, total_amount, is_paid_from_deposit, operator,
       on_site_photo_url, on_site_photo_time, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const requestNo = data.request_no || generateNo('PW');
    const totalAmount = data.total_amount || (data.request_kw * data.usage_days * data.unit_price);

    const result = stmt.run(
      requestNo,
      data.contract_no,
      data.request_kw,
      data.request_date,
      data.usage_days,
      data.unit_price,
      totalAmount,
      data.is_paid_from_deposit !== undefined ? data.is_paid_from_deposit : 1,
      data.operator || null,
      data.on_site_photo_url || null,
      data.on_site_photo_time || null,
      data.remarks || null,
      data.status || 'confirmed'
    );

    return { id: result.lastInsertRowid, request_no: requestNo, total_amount: totalAmount };
  }

  static getRequestsByContract(contractNo) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM ${TABLES.POWER_REQUESTS}
      WHERE contract_no = ? ORDER BY request_date
    `).all(contractNo);
  }

  static getRequest(requestNo) {
    const db = getDb();
    return db.prepare(`SELECT * FROM ${TABLES.POWER_REQUESTS} WHERE request_no = ?`).get(requestNo);
  }

  static updateOnSitePhoto(requestNo, photoUrl, photoTime) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE ${TABLES.POWER_REQUESTS}
      SET on_site_photo_url = ?, on_site_photo_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE request_no = ?
    `);
    return stmt.run(photoUrl, photoTime, requestNo);
  }

  static getTotalPowerCharge(contractNo) {
    const db = getDb();
    const result = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN is_paid_from_deposit = 1 AND status = 'confirmed' THEN total_amount ELSE 0 END), 0) as total_from_deposit,
        COALESCE(SUM(total_amount), 0) as total_all,
        COUNT(*) as request_count
      FROM ${TABLES.POWER_REQUESTS}
      WHERE contract_no = ?
    `).get(contractNo);

    return {
      total_from_deposit: result.total_from_deposit,
      total_all: result.total_all,
      request_count: result.request_count
    };
  }

  static checkLatePhotos(contractNo, gracePeriodHours = 48) {
    const db = getDb();
    const latePhotos = db.prepare(`
      SELECT
        pr.*,
        bc.check_out_date,
        julianday(COALESCE(pr.on_site_photo_time, CURRENT_TIMESTAMP)) - julianday(bc.check_out_date) as days_late
      FROM ${TABLES.POWER_REQUESTS} pr
      JOIN ${TABLES.BOOTH_CONTRACTS} bc ON pr.contract_no = bc.contract_no
      WHERE pr.contract_no = ?
        AND pr.on_site_photo_url IS NULL
        AND bc.check_out_date IS NOT NULL
        AND julianday(CURRENT_TIMESTAMP) - julianday(bc.check_out_date) > ? / 24.0
    `).all(contractNo, gracePeriodHours);

    return latePhotos;
  }
}

module.exports = PowerService;
