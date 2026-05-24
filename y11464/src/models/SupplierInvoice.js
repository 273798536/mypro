const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class SupplierInvoice {
  static async create(data) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO supplier_invoices (
        id, invoice_no, supplier_name, supplier_tax_id, invoice_date,
        total_amount, currency, payment_status, received_date,
        warehouse_person, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      data.invoice_no,
      data.supplier_name,
      data.supplier_tax_id || null,
      data.invoice_date,
      data.total_amount,
      data.currency || 'CNY',
      data.payment_status || 'unpaid',
      data.received_date || null,
      data.warehouse_person || null,
      data.remark || null,
      now,
      now
    );
    
    return this.findById(id);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM supplier_invoices WHERE id = ?', id);
  }

  static async findByInvoiceNo(invoiceNo) {
    return await db.get('SELECT * FROM supplier_invoices WHERE invoice_no = ?', invoiceNo);
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM supplier_invoices WHERE 1=1';
    const params = [];
    
    if (options.invoice_no) {
      sql += ' AND invoice_no LIKE ?';
      params.push(`%${options.invoice_no}%`);
    }
    
    if (options.supplier_name) {
      sql += ' AND supplier_name LIKE ?';
      params.push(`%${options.supplier_name}%`);
    }
    
    if (options.status) {
      sql += ' AND payment_status = ?';
      params.push(options.status);
    }
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    return await db.all(sql, ...params);
  }

  static async addInvoiceItem(invoiceId, item) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO invoice_items (
        id, invoice_id, implant_id, quantity, unit_price,
        subtotal, batch_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      invoiceId,
      item.implant_id,
      item.quantity,
      item.unit_price,
      item.subtotal,
      item.batch_number,
      now
    );
    
    return id;
  }

  static async getInvoiceItems(invoiceId) {
    return await db.all(`
      SELECT ii.*, i.product_name, i.manufacturer
      FROM invoice_items ii
      LEFT JOIN implants i ON ii.implant_id = i.id
      WHERE ii.invoice_id = ?
    `, invoiceId);
  }
}

module.exports = SupplierInvoice;
