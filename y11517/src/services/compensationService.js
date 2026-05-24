const db = require('../database/db');
const queueService = require('./queueService');

class CompensationService {
  validateAndProcess(queueItem) {
    const { payload } = queueItem;
    const errors = [];

    if (!payload.workOrderId) {
      errors.push('缺少派工单ID');
    }
    if (!payload.materials || !Array.isArray(payload.materials)) {
      errors.push('缺少材料列表或格式错误');
    } else {
      payload.materials.forEach((mat, idx) => {
        if (!mat.material_name) errors.push(`材料${idx + 1}: 缺少材料名称`);
        if (!mat.quantity || mat.quantity <= 0) errors.push(`材料${idx + 1}: 数量必须大于0`);
        if (mat.unit_price !== undefined && mat.unit_price < 0) errors.push(`材料${idx + 1}: 单价不能为负`);
      });
    }

    if (errors.length > 0) {
      throw new Error(`数据验证失败: ${errors.join('; ')}`);
    }

    return true;
  }

  async createCompensationRecords(queueItemId, workOrderId, materials, userId = null) {
    const records = [];

    for (const mat of materials) {
      const unitPrice = mat.unit_price || 0;
      const totalAmount = unitPrice * mat.quantity;
      const result = await db.runSync(`
        INSERT INTO compensation_records 
        (queue_item_id, work_order_id, material_name, quantity, unit_price, total_amount, compensation_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [queueItemId, workOrderId, mat.material_name, mat.quantity, unitPrice, totalAmount, mat.compensation_type || 'normal']);
      
      records.push({ id: result.lastID, ...mat, total_amount: totalAmount });
    }

    return records;
  }

  async verifyCompensation(recordId, userId) {
    const now = new Date().toISOString();
    const result = await db.runSync(`
      UPDATE compensation_records 
      SET is_verified = 1, verified_by = ?, verified_at = ?
      WHERE id = ?
    `, [userId, now, recordId]);

    return result.changes > 0;
  }

  async getCompensationReport(startDate, endDate, includeUnverified = false) {
    let query = `
      SELECT 
        cr.*,
        wo.order_no,
        wo.site_address,
        u.username as verified_by_name,
        qi.status as queue_status
      FROM compensation_records cr
      LEFT JOIN work_orders wo ON cr.work_order_id = wo.id
      LEFT JOIN users u ON cr.verified_by = u.id
      LEFT JOIN queue_items qi ON cr.queue_item_id = qi.id
      WHERE cr.created_at BETWEEN ? AND ?
    `;

    const params = [startDate, endDate];

    if (!includeUnverified) {
      query += ' AND cr.is_verified = 1';
    }

    query += ' ORDER BY cr.created_at DESC';

    const records = await db.allSync(query, params);

    const summary = {
      totalRecords: records.length,
      verifiedCount: records.filter(r => r.is_verified).length,
      totalAmount: records.filter(r => r.is_verified).reduce((sum, r) => sum + r.total_amount, 0),
      byType: {}
    };

    records.forEach(r => {
      if (!summary.byType[r.compensation_type]) {
        summary.byType[r.compensation_type] = { count: 0, amount: 0 };
      }
      if (r.is_verified) {
        summary.byType[r.compensation_type].count++;
        summary.byType[r.compensation_type].amount += r.total_amount;
      }
    });

    return {
      records,
      summary
    };
  }

  exportToCSV(records) {
    const headers = ['ID', '派工单', '材料名称', '数量', '单价', '总价', '类型', '是否复核', '复核人', '创建时间'];
    const rows = records.map(r => [
      r.id,
      r.order_no,
      r.material_name,
      r.quantity,
      r.unit_price,
      r.total_amount,
      r.compensation_type,
      r.is_verified ? '是' : '否',
      r.verified_by_name || '',
      r.created_at
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async getCompensationByWorkOrder(workOrderId) {
    return await db.allSync(`
      SELECT 
        cr.*,
        u.username as verified_by_name
      FROM compensation_records cr
      LEFT JOIN users u ON cr.verified_by = u.id
      WHERE cr.work_order_id = ?
      ORDER BY cr.created_at DESC
    `, [workOrderId]);
  }
}

module.exports = new CompensationService();
