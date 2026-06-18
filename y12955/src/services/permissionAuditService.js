const { getDb } = require('../models/database');
const { AppError, WORK_ORDER_STATUS, validateRequired } = require('../utils/helpers');
const workOrderService = require('./workOrderService');

const permissionAuditService = {
  importPermissionList(workOrderId, data) {
    validateRequired(['content'], data);
    
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const stmt = db.prepare(`
      INSERT INTO permission_lists (work_order_id, source_type, source_ref, content)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      workOrderId,
      data.source_type || null,
      data.source_ref || null,
      data.content
    );
    
    return {
      id: result.lastInsertRowid,
      message: '权限清单导入成功'
    };
  },

  listPermissionLists(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const stmt = db.prepare(`
      SELECT * FROM permission_lists 
      WHERE work_order_id = ? 
      ORDER BY import_time DESC
    `);
    return stmt.all(workOrderId);
  },

  getPermissionList(id) {
    const db = getDb();
    const list = db.prepare('SELECT * FROM permission_lists WHERE id = ?').get(id);
    if (!list) {
      throw new AppError(`权限清单不存在: ${id}`, 404, {
        error_type: 'permission_list_not_found',
        suggestion: '请检查权限清单ID是否正确'
      });
    }
    return list;
  },

  executeAudit(workOrderId, data = {}) {
    const db = getDb();
    const order = workOrderService.getWorkOrderById(workOrderId);
    
    const permissionLists = permissionAuditService.listPermissionLists(workOrderId);
    
    if (permissionLists.length === 0) {
      throw new AppError(
        '未找到权限清单，无法执行审计',
        400,
        {
          error_type: 'no_permission_list',
          suggestion: '请先导入权限清单后再执行审计。权限清单应包含该工单涉及的所有表的访问权限说明。'
        }
      );
    }
    
    const comparisons = db.prepare(`
      SELECT * FROM drift_comparisons 
      WHERE work_order_id = ? AND status = 'completed'
      ORDER BY created_at DESC
    `).all(workOrderId);
    
    if (comparisons.length === 0) {
      throw new AppError(
        '未找到表结构对比记录，无法执行权限审计',
        400,
        {
          error_type: 'no_comparison_found',
          suggestion: '请先执行表结构对比后再进行权限审计'
        }
      );
    }
    
    const latestComparison = comparisons[0];
    const latestPermList = permissionLists[0];
    
    const details = db.prepare(`
      SELECT * FROM drift_details WHERE comparison_id = ? AND can_use_directly = 0
    `).all(latestComparison.id);
    
    const issues = [];
    const changedTables = new Set();
    
    for (const detail of details) {
      changedTables.add(detail.table_name);
    }
    
    const permContent = latestPermList.content;
    
    for (const table of changedTables) {
      const hasPermInfo = permContent.includes(table);
      if (!hasPermInfo) {
        issues.push({
          type: 'missing_permission_info',
          table_name: table,
          severity: 'high',
          description: `表 ${table} 有结构变更，但权限清单中未找到该表的权限说明`,
          suggestion: `请补充表 ${table} 的访问权限说明，包括哪些角色有读写权限`
        });
      }
    }
    
    if (details.some(d => d.change_type === 'TABLE_ADD')) {
      const newTables = details.filter(d => d.change_type === 'TABLE_ADD').map(d => d.table_name);
      for (const table of newTables) {
        issues.push({
          type: 'new_table_needs_permission',
          table_name: table,
          severity: 'high',
          description: `新增表 ${table}，需要确认权限分配方案`,
          suggestion: '请联系财务系统维护组确认新表的访问权限分配，包括：读写角色、审计要求、数据脱敏规则'
        });
      }
    }
    
    if (details.some(d => d.change_type === 'COLUMN_ADD')) {
      const newCols = details.filter(d => d.change_type === 'COLUMN_ADD');
      const sensitiveCols = newCols.filter(d => {
        const col = d.column_name.toLowerCase();
        return col.includes('password') || col.includes('secret') || 
               col.includes('token') || col.includes('key') ||
               col.includes('id_card') || col.includes('phone') ||
               col.includes('email') || col.includes('amount') ||
               col.includes('balance') || col.includes('salary');
      });
      
      for (const col of sensitiveCols) {
        issues.push({
          type: 'sensitive_column_added',
          table_name: col.table_name,
          column_name: col.column_name,
          severity: 'medium',
          description: `新增字段 ${col.table_name}.${col.column_name} 可能涉及敏感数据，需要确认权限控制`,
          suggestion: '请评估该字段是否包含敏感信息，确认是否需要设置列级权限或数据脱敏'
        });
      }
    }
    
    const conclusion = issues.length === 0 
      ? '权限审计通过，所有变更表均有对应权限说明'
      : `发现 ${issues.length} 个权限相关问题，请逐项处理后复核`;
    
    const stmt = db.prepare(`
      INSERT INTO permission_audits 
      (work_order_id, permission_list_id, status, issues, conclusion, source_material_ref)
      VALUES (?, ?, 'completed', ?, ?, ?)
    `);
    
    const result = stmt.run(
      workOrderId,
      latestPermList.id,
      JSON.stringify(issues),
      conclusion,
      data.source_material_ref || null
    );
    
    if (order.status === WORK_ORDER_STATUS.COMPARING || order.status === WORK_ORDER_STATUS.REVIEWING) {
      workOrderService.transitionStatus(
        workOrderId,
        WORK_ORDER_STATUS.AUDITING,
        data.operator || 'system',
        '执行权限审计'
      );
    }
    
    return {
      audit_id: result.lastInsertRowid,
      issues_count: issues.length,
      conclusion,
      issues
    };
  },

  listAudits(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const stmt = db.prepare(`
      SELECT a.*, l.source_type, l.source_ref 
      FROM permission_audits a
      LEFT JOIN permission_lists l ON a.permission_list_id = l.id
      WHERE a.work_order_id = ? 
      ORDER BY a.created_at DESC
    `);
    
    const audits = stmt.all(workOrderId);
    return audits.map(a => ({
      ...a,
      issues: a.issues ? JSON.parse(a.issues) : null
    }));
  },

  getAudit(id) {
    const db = getDb();
    const audit = db.prepare('SELECT * FROM permission_audits WHERE id = ?').get(id);
    
    if (!audit) {
      throw new AppError(`审计记录不存在: ${id}`, 404, {
        error_type: 'audit_not_found',
        suggestion: '请检查审计记录ID是否正确'
      });
    }
    
    return {
      ...audit,
      issues: audit.issues ? JSON.parse(audit.issues) : null
    };
  },

  reviewAudit(auditId, data) {
    const db = getDb();
    const audit = permissionAuditService.getAudit(auditId);
    
    const stmt = db.prepare(`
      UPDATE permission_audits 
      SET reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, status = ?
      WHERE id = ?
    `);
    
    stmt.run(
      data.reviewed_by || 'system',
      data.status || 'reviewed',
      auditId
    );
    
    return permissionAuditService.getAudit(auditId);
  }
};

module.exports = permissionAuditService;
