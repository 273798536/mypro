const db = require('../database/db');
const queueService = require('./queueService');

class CompensationService {
  async validateAndProcess(queueItem) {
    const { payload, work_order_id: workOrderId } = queueItem;
    const errors = [];
    const warnings = [];

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

    const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [workOrderId || payload.workOrderId]);
    if (!workOrder) {
      errors.push('派工单不存在');
    } else {
      if (!workOrder.shift_record) {
        warnings.push('派工单缺少班次记录');
      }
      if (!workOrder.old_caliber && !workOrder.new_caliber) {
        warnings.push('派工单缺少口径信息');
      }
    }

    if (workOrder) {
      const photos = await db.allSync('SELECT * FROM site_photos WHERE work_order_id = ?', [workOrder.id]);
      if (photos.length === 0) {
        warnings.push('缺少现场照片证据');
      }
      payload.photoCount = photos.length;
    }

    if (workOrder && payload.materials) {
      const valveMaterials = payload.materials.filter(m => 
        m.material_name.includes('阀') || m.caliber
      );
      
      for (const mat of valveMaterials) {
        const caliber = mat.caliber || this.extractCaliber(mat.material_name);
        const valveType = this.extractValveType(mat.material_name);
        
        if (caliber && valveType) {
          const inventory = await db.getSync(
            'SELECT * FROM inventory_summary WHERE valve_type = ? AND caliber = ?',
            [valveType, caliber]
          );
          
          if (inventory) {
            if (inventory.current_stock < mat.quantity) {
              warnings.push(`库存不足: ${valveType} ${caliber} 当前库存${inventory.current_stock}, 需要${mat.quantity}`);
            }
            mat.inventoryCheck = {
              before: inventory.current_stock,
              after: inventory.current_stock - mat.quantity,
              isNegative: (inventory.current_stock - mat.quantity) < 0
            };
          } else {
            warnings.push(`未找到库存记录: ${valveType} ${caliber}`);
          }
        }
      }
    }

    payload.validationWarnings = warnings;
    
    if (errors.length > 0) {
      throw new Error(`数据验证失败: ${errors.join('; ')}`);
    }

    return { valid: true, warnings };
  }

  extractCaliber(materialName) {
    const match = materialName.match(/DN(\d+)/i);
    return match ? `DN${match[1]}` : null;
  }

  extractValveType(materialName) {
    if (materialName.includes('闸阀')) return '闸阀';
    if (materialName.includes('蝶阀')) return '蝶阀';
    if (materialName.includes('球阀')) return '球阀';
    if (materialName.includes('截止阀')) return '截止阀';
    return null;
  }

  async createCompensationRecords(queueItemId, workOrderId, materials, userId = null) {
    const records = [];

    for (const mat of materials) {
      const unitPrice = mat.unit_price || 0;
      const totalAmount = unitPrice * mat.quantity;
      
      const result = await db.runSync(`
        INSERT INTO compensation_records 
        (queue_item_id, work_order_id, material_name, quantity, unit_price, total_amount, compensation_type, inventory_before, inventory_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        queueItemId, 
        workOrderId, 
        mat.material_name, 
        mat.quantity, 
        unitPrice, 
        totalAmount, 
        mat.compensation_type || 'normal',
        mat.inventoryCheck?.before || null,
        mat.inventoryCheck?.after || null
      ]);
      
      if (mat.inventoryCheck) {
        const caliber = mat.caliber || this.extractCaliber(mat.material_name);
        const valveType = this.extractValveType(mat.material_name);
        if (caliber && valveType) {
          await db.runSync(`
            UPDATE inventory_summary 
            SET used_quantity = used_quantity + ?,
                current_stock = current_stock - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE valve_type = ? AND caliber = ?
          `, [mat.quantity, mat.quantity, valveType, caliber]);
        }
      }
      
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
        wo.shift_record,
        u.username as verified_by_name,
        qi.status as queue_status,
        qi.last_error as queue_error
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
      byType: {},
      negativeStockCount: records.filter(r => r.inventory_after !== null && r.inventory_after < 0).length
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
      summary,
      evidenceChain: {
        hasWorkOrder: records.every(r => r.order_no),
        hasShiftRecord: records.filter(r => r.shift_record).length,
        totalPhotos: await this.getTotalPhotoCount(records)
      }
    };
  }

  async getTotalPhotoCount(records) {
    const workOrderIds = [...new Set(records.map(r => r.work_order_id).filter(Boolean))];
    if (workOrderIds.length === 0) return 0;
    
    const placeholders = workOrderIds.map(() => '?').join(',');
    const result = await db.getSync(
      `SELECT COUNT(*) as count FROM site_photos WHERE work_order_id IN (${placeholders})`,
      workOrderIds
    );
    return result?.count || 0;
  }

  exportToCSV(records) {
    const headers = ['ID', '派工单', '材料名称', '数量', '单价', '总价', '类型', '是否复核', '复核人', '库存前', '库存后', '创建时间'];
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
      r.inventory_before || '',
      r.inventory_after || '',
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

  async getInventorySummary() {
    return await db.allSync('SELECT * FROM inventory_summary ORDER BY valve_type, caliber');
  }

  async updateInventory(valveType, caliber, quantityChange) {
    const result = await db.runSync(`
      UPDATE inventory_summary 
      SET current_stock = current_stock + ?,
          total_quantity = CASE WHEN ? > 0 THEN total_quantity + ? ELSE total_quantity END,
          updated_at = CURRENT_TIMESTAMP
      WHERE valve_type = ? AND caliber = ?
    `, [quantityChange, quantityChange, quantityChange, valveType, caliber]);

    return result.changes > 0;
  }
}

module.exports = new CompensationService();
