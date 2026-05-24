const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class Implant {
  static async create(data) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO implants (
        id, batch_number, product_name, manufacturer, specification,
        production_date, expiration_date, initial_stock, current_stock,
        unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      data.batch_number,
      data.product_name,
      data.manufacturer,
      data.specification || null,
      data.production_date || null,
      data.expiration_date || null,
      data.initial_stock || 0,
      data.current_stock || data.initial_stock || 0,
      data.unit || '个',
      now,
      now
    );
    
    return this.findById(id);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM implants WHERE id = ?', id);
  }

  static async findByBatchNumber(batchNumber) {
    return await db.get('SELECT * FROM implants WHERE batch_number = ?', batchNumber);
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM implants WHERE is_active = 1';
    const params = [];
    
    if (options.batch_number) {
      sql += ' AND batch_number LIKE ?';
      params.push(`%${options.batch_number}%`);
    }
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    return await db.all(sql, ...params);
  }

  static async updateStock(id, quantity) {
    const now = moment().toISOString();
    await db.run(`
      UPDATE implants 
      SET current_stock = current_stock + ?, updated_at = ?
      WHERE id = ?
    `, quantity, now, id);
    
    return this.findById(id);
  }

  static async getStock(batchNumber) {
    const result = await db.get(`
      SELECT current_stock FROM implants WHERE batch_number = ?
    `, batchNumber);
    return result ? result.current_stock : 0;
  }
}

module.exports = Implant;
