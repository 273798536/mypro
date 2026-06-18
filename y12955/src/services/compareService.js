const { getDb } = require('../models/database');
const { AppError, WORK_ORDER_STATUS } = require('../utils/helpers');
const workOrderService = require('./workOrderService');

const compareService = {
  executeComparison(workOrderId, baselineVersion, targetVersion) {
    const db = getDb();
    const order = workOrderService.getWorkOrderById(workOrderId);
    
    if (!baselineVersion || !targetVersion) {
      const versions = workOrderService.listDictionaryVersions(workOrderId);
      if (versions.length < 2) {
        throw new AppError(
          '需要至少两个版本的数据字典才能进行对比',
          400,
          {
            error_type: 'insufficient_versions',
            available_versions: versions.map(v => v.version),
            suggestion: '请先导入至少两个不同版本的数据字典'
          }
        );
      }
      baselineVersion = baselineVersion || versions[versions.length - 1].version;
      targetVersion = targetVersion || versions[0].version;
    }
    
    const baselineData = workOrderService.getDictionaryByVersion(workOrderId, baselineVersion);
    const targetData = workOrderService.getDictionaryByVersion(workOrderId, targetVersion);
    
    if (baselineData.length === 0) {
      throw new AppError(
        `基线版本 "${baselineVersion}" 没有数据`,
        400,
        {
          error_type: 'baseline_empty',
          baseline_version: baselineVersion,
          suggestion: '请检查基线版本是否正确，或先导入该版本数据'
        }
      );
    }
    
    if (targetData.length === 0) {
      throw new AppError(
        `目标版本 "${targetVersion}" 没有数据`,
        400,
        {
          error_type: 'target_empty',
          target_version: targetVersion,
          suggestion: '请检查目标版本是否正确，或先导入该版本数据'
        }
      );
    }
    
    const existingComp = db.prepare(`
      SELECT * FROM drift_comparisons 
      WHERE work_order_id = ? AND baseline_version = ? AND target_version = ? AND status = 'completed'
      ORDER BY created_at DESC LIMIT 1
    `).get(workOrderId, baselineVersion, targetVersion);
    
    if (existingComp) {
      return {
        comparison_id: existingComp.id,
        total_changes: existingComp.total_changes,
        is_new: false,
        message: '该版本对比已存在，返回已有结果'
      };
    }
    
    const compResult = db.prepare(`
      INSERT INTO drift_comparisons (work_order_id, baseline_version, target_version, status)
      VALUES (?, ?, ?, 'processing')
    `).run(workOrderId, baselineVersion, targetVersion);
    const comparisonId = compResult.lastInsertRowid;
    
    const { details, rollbacks, indexSuggestions } = compareService._analyzeDrift(
      baselineData,
      targetData,
      comparisonId
    );
    
    const insertDetail = db.prepare(`
      INSERT INTO drift_details 
      (comparison_id, table_name, column_name, change_type, old_value, new_value, can_use_directly, need_review_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertRollback = db.prepare(`
      INSERT INTO rollback_records 
      (comparison_id, drift_detail_id, rollback_sql, table_name, change_type, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `);
    
    const insertIndex = db.prepare(`
      INSERT INTO index_suggestions 
      (comparison_id, table_name, index_name, index_type, columns, suggestion_reason, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertAll = db.transaction(() => {
      for (const detail of details) {
        const detailResult = insertDetail.run(
          comparisonId,
          detail.table_name,
          detail.column_name || null,
          detail.change_type,
          detail.old_value || null,
          detail.new_value || null,
          detail.can_use_directly ? 1 : 0,
          detail.need_review_reason || null
        );
        
        const detailId = detailResult.lastInsertRowid;
        
        const rollback = rollbacks.find(
          r => r.table_name === detail.table_name && r.column_name === detail.column_name
        );
        if (rollback) {
          insertRollback.run(
            comparisonId,
            detailId,
            rollback.sql,
            detail.table_name,
            detail.change_type
          );
        }
      }
      
      for (const idx of indexSuggestions) {
        insertIndex.run(
          comparisonId,
          idx.table_name,
          idx.index_name,
          idx.index_type || 'NORMAL',
          idx.columns,
          idx.suggestion_reason,
          idx.priority || 'medium'
        );
      }
      
      const summary = compareService._generateSummary(details);
      
      db.prepare(`
        UPDATE drift_comparisons 
        SET status = 'completed', 
            result_summary = ?, 
            total_changes = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(summary, details.length, comparisonId);
    });
    
    insertAll();
    
    if (order.status === WORK_ORDER_STATUS.IMPORTING || order.status === WORK_ORDER_STATUS.REVIEWING) {
      workOrderService.transitionStatus(
        workOrderId,
        WORK_ORDER_STATUS.COMPARING,
        'system',
        `执行表结构对比: ${baselineVersion} → ${targetVersion}`
      );
    }
    
    return {
      comparison_id: comparisonId,
      total_changes: details.length,
      is_new: true,
      message: '对比完成'
    };
  },

  _analyzeDrift(baseline, target, comparisonId) {
    const details = [];
    const rollbacks = [];
    const indexSuggestions = [];
    
    const baselineMap = new Map();
    const targetMap = new Map();
    const baselineTables = new Set();
    const targetTables = new Set();
    
    for (const item of baseline) {
      const key = `${item.table_name}.${item.column_name}`;
      baselineMap.set(key, item);
      baselineTables.add(item.table_name);
    }
    
    for (const item of target) {
      const key = `${item.table_name}.${item.column_name}`;
      targetMap.set(key, item);
      targetTables.add(item.table_name);
    }
    
    for (const table of targetTables) {
      if (!baselineTables.has(table)) {
        details.push({
          table_name: table,
          column_name: null,
          change_type: 'TABLE_ADD',
          old_value: null,
          new_value: '新建表',
          can_use_directly: false,
          need_review_reason: '新增表需要确认表用途、数据来源和维护责任'
        });
        rollbacks.push({
          table_name: table,
          column_name: null,
          sql: `DROP TABLE IF EXISTS \`${table}\`;`
        });
        continue;
      }
    }
    
    for (const table of baselineTables) {
      if (!targetTables.has(table)) {
        details.push({
          table_name: table,
          column_name: null,
          change_type: 'TABLE_DROP',
          old_value: '表存在',
          new_value: null,
          can_use_directly: false,
          need_review_reason: '删除表需要确认数据迁移方案和历史数据归档'
        });
        rollbacks.push({
          table_name: table,
          column_name: null,
          sql: `-- 表 ${table} 已被删除，请从备份恢复或重建`
        });
      }
    }
    
    for (const [key, targetItem] of targetMap) {
      const baselineItem = baselineMap.get(key);
      
      if (!baselineItem) {
        const isNullable = targetItem.is_nullable === 'YES' || targetItem.is_nullable === 'yes' || targetItem.default_value !== null;
        details.push({
          table_name: targetItem.table_name,
          column_name: targetItem.column_name,
          change_type: 'COLUMN_ADD',
          old_value: null,
          new_value: JSON.stringify({
            data_type: targetItem.data_type,
            is_nullable: targetItem.is_nullable,
            default_value: targetItem.default_value,
            comment: targetItem.comment
          }),
          can_use_directly: isNullable,
          need_review_reason: isNullable ? null : '新增非空且无默认值的字段，需要确认数据回填方案'
        });
        
        rollbacks.push({
          table_name: targetItem.table_name,
          column_name: targetItem.column_name,
          sql: `ALTER TABLE \`${targetItem.table_name}\` DROP COLUMN \`${targetItem.column_name}\`;`
        });
        
        if (targetItem.comment && (targetItem.comment.includes('索引') || targetItem.comment.includes('index') || targetItem.column_name.endsWith('_id'))) {
          indexSuggestions.push({
            table_name: targetItem.table_name,
            index_name: `idx_${targetItem.table_name}_${targetItem.column_name}`,
            columns: targetItem.column_name,
            suggestion_reason: `新增字段 ${targetItem.column_name}，建议评估是否需要索引`,
            priority: 'low'
          });
        }
      } else {
        const changedFields = [];
        
        if (baselineItem.data_type !== targetItem.data_type) {
          changedFields.push({
            field: 'data_type',
            old: baselineItem.data_type,
            new: targetItem.data_type
          });
        }
        if (baselineItem.is_nullable !== targetItem.is_nullable) {
          changedFields.push({
            field: 'is_nullable',
            old: baselineItem.is_nullable,
            new: targetItem.is_nullable
          });
        }
        if (baselineItem.default_value !== targetItem.default_value) {
          changedFields.push({
            field: 'default_value',
            old: baselineItem.default_value,
            new: targetItem.default_value
          });
        }
        if (baselineItem.comment !== targetItem.comment) {
          changedFields.push({
            field: 'comment',
            old: baselineItem.comment,
            new: targetItem.comment
          });
        }
        
        if (changedFields.length > 0) {
          const becomesNotNull = baselineItem.is_nullable === 'YES' && targetItem.is_nullable === 'NO';
          const typeChanged = changedFields.some(f => f.field === 'data_type');
          const canUseDirectly = !becomesNotNull && !typeChanged;
          
          details.push({
            table_name: targetItem.table_name,
            column_name: targetItem.column_name,
            change_type: 'COLUMN_MODIFY',
            old_value: JSON.stringify(changedFields.map(f => ({ field: f.field, value: f.old }))),
            new_value: JSON.stringify(changedFields.map(f => ({ field: f.field, value: f.new }))),
            can_use_directly: canUseDirectly,
            need_review_reason: canUseDirectly ? null : '字段类型变更或改为非空，需要确认数据兼容性和迁移方案'
          });
          
          rollbacks.push({
            table_name: targetItem.table_name,
            column_name: targetItem.column_name,
            sql: `ALTER TABLE \`${targetItem.table_name}\` MODIFY COLUMN \`${targetItem.column_name}\` ${baselineItem.data_type}${baselineItem.is_nullable === 'NO' ? ' NOT NULL' : ''}${baselineItem.default_value ? ` DEFAULT ${baselineItem.default_value}` : ''};`
          });
          
          if (typeChanged) {
            indexSuggestions.push({
              table_name: targetItem.table_name,
              index_name: `idx_${targetItem.table_name}_${targetItem.column_name}`,
              columns: targetItem.column_name,
              suggestion_reason: `字段 ${targetItem.column_name} 类型从 ${baselineItem.data_type} 改为 ${targetItem.data_type}，建议重新评估索引效率`,
              priority: 'medium'
            });
          }
        }
      }
    }
    
    for (const [key, baselineItem] of baselineMap) {
      if (!targetMap.has(key)) {
        details.push({
          table_name: baselineItem.table_name,
          column_name: baselineItem.column_name,
          change_type: 'COLUMN_DROP',
          old_value: JSON.stringify({
            data_type: baselineItem.data_type,
            is_nullable: baselineItem.is_nullable,
            default_value: baselineItem.default_value,
            comment: baselineItem.comment
          }),
          new_value: null,
          can_use_directly: false,
          need_review_reason: '删除字段需要确认业务影响和数据备份方案'
        });
        
        rollbacks.push({
          table_name: baselineItem.table_name,
          column_name: baselineItem.column_name,
          sql: `ALTER TABLE \`${baselineItem.table_name}\` ADD COLUMN \`${baselineItem.column_name}\` ${baselineItem.data_type}${baselineItem.is_nullable === 'NO' ? ' NOT NULL' : ''}${baselineItem.default_value ? ` DEFAULT ${baselineItem.default_value}` : ''};`
        });
      }
    }
    
    for (const table of targetTables) {
      const targetColumns = [...targetMap.values()].filter(c => c.table_name === table);
      const baselineColumns = [...baselineMap.values()].filter(c => c.table_name === table);
      
      if (targetColumns.length > 5 && baselineColumns.length > 0) {
        const idColumns = targetColumns.filter(c => 
          c.column_name.endsWith('_id') || c.column_name === 'id'
        );
        const timeColumns = targetColumns.filter(c =>
          c.column_name.includes('time') || c.column_name.includes('date') || c.column_name.includes('created') || c.column_name.includes('updated')
        );
        
        if (idColumns.length > 1) {
          const idxColumns = idColumns.slice(0, 2).map(c => c.column_name).join(', ');
          indexSuggestions.push({
            table_name: table,
            index_name: `idx_${table}_composite`,
            index_type: 'COMPOSITE',
            columns: idxColumns,
            suggestion_reason: `表 ${table} 有多个ID关联字段，建议评估复合索引`,
            priority: 'medium'
          });
        }
        
        if (timeColumns.length > 0) {
          indexSuggestions.push({
            table_name: table,
            index_name: `idx_${table}_time`,
            columns: timeColumns[0].column_name,
            suggestion_reason: `表 ${table} 包含时间字段，通常用于范围查询，建议索引`,
            priority: 'low'
          });
        }
      }
    }
    
    return { details, rollbacks, indexSuggestions };
  },

  _generateSummary(details) {
    const summary = {
      total: details.length,
      by_type: {},
      can_use_directly: 0,
      need_review: 0
    };
    
    for (const detail of details) {
      summary.by_type[detail.change_type] = (summary.by_type[detail.change_type] || 0) + 1;
      if (detail.can_use_directly) {
        summary.can_use_directly++;
      } else {
        summary.need_review++;
      }
    }
    
    return JSON.stringify(summary);
  },

  getComparisonById(id) {
    const db = getDb();
    const comparison = db.prepare('SELECT * FROM drift_comparisons WHERE id = ?').get(id);
    
    if (!comparison) {
      throw new AppError(`对比记录不存在: ${id}`, 404, {
        error_type: 'comparison_not_found',
        suggestion: '请检查对比ID是否正确'
      });
    }
    
    return comparison;
  },

  getComparisonDetails(comparisonId, params = {}) {
    const db = getDb();
    compareService.getComparisonById(comparisonId);
    
    const { change_type, reviewed, can_use_directly, page = 1, pageSize = 100 } = params;
    
    let whereClauses = ['comparison_id = ?'];
    let queryParams = [comparisonId];
    
    if (change_type) {
      whereClauses.push('change_type = ?');
      queryParams.push(change_type);
    }
    if (reviewed !== undefined) {
      whereClauses.push('is_reviewed = ?');
      queryParams.push(reviewed ? 1 : 0);
    }
    if (can_use_directly !== undefined) {
      whereClauses.push('can_use_directly = ?');
      queryParams.push(can_use_directly ? 1 : 0);
    }
    
    const whereSql = 'WHERE ' + whereClauses.join(' AND ');
    
    const total = db.prepare(`SELECT COUNT(*) as total FROM drift_details ${whereSql}`).get(...queryParams).total;
    
    const offset = (page - 1) * pageSize;
    const list = db.prepare(`
      SELECT * FROM drift_details ${whereSql}
      ORDER BY table_name, change_type, column_name
      LIMIT ? OFFSET ?
    `).all(...queryParams, pageSize, offset);
    
    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  },

  listComparisonsByWorkOrder(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    return db.prepare(`
      SELECT * FROM drift_comparisons 
      WHERE work_order_id = ? 
      ORDER BY created_at DESC
    `).all(workOrderId);
  },

  reviewDriftDetail(detailId, isReviewed, reviewNote = null) {
    const db = getDb();
    const detail = db.prepare('SELECT * FROM drift_details WHERE id = ?').get(detailId);
    if (!detail) {
      throw new AppError(`漂移详情不存在: ${detailId}`, 404, {
        error_type: 'drift_detail_not_found',
        suggestion: '请检查详情ID是否正确'
      });
    }
    
    db.prepare(
      `UPDATE drift_details SET is_reviewed = ?, review_note = ? WHERE id = ?`
    ).run(isReviewed ? 1 : 0, reviewNote, detailId);
    
    return db.prepare('SELECT * FROM drift_details WHERE id = ?').get(detailId);
  },

  getRollbackRecords(comparisonId) {
    const db = getDb();
    compareService.getComparisonById(comparisonId);
    
    return db.prepare(`
      SELECT r.*, d.column_name, d.can_use_directly, d.need_review_reason
      FROM rollback_records r
      LEFT JOIN drift_details d ON r.drift_detail_id = d.id
      WHERE r.comparison_id = ?
      ORDER BY r.table_name, r.id
    `).all(comparisonId);
  },

  executeRollback(rollbackId, executor = 'system', note = '') {
    const db = getDb();
    const rollback = db.prepare('SELECT * FROM rollback_records WHERE id = ?').get(rollbackId);
    if (!rollback) {
      throw new AppError(`回滚记录不存在: ${rollbackId}`, 404, {
        error_type: 'rollback_not_found',
        suggestion: '请检查回滚记录ID是否正确'
      });
    }
    
    if (rollback.status === 'executed') {
      throw new AppError('该回滚已执行过，不可重复执行', 409, {
        error_type: 'rollback_already_executed',
        executed_at: rollback.executed_at,
        suggestion: '请确认是否需要生成新的回滚方案'
      });
    }
    
    db.prepare(`
      UPDATE rollback_records 
      SET status = 'executed', executed_at = CURRENT_TIMESTAMP, executor = ?, rollback_note = ?
      WHERE id = ?
    `).run(executor, note, rollbackId);
    
    return db.prepare('SELECT * FROM rollback_records WHERE id = ?').get(rollbackId);
  },

  getIndexSuggestions(comparisonId) {
    const db = getDb();
    compareService.getComparisonById(comparisonId);
    
    return db.prepare(`
      SELECT * FROM index_suggestions 
      WHERE comparison_id = ? 
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        table_name,
        id
    `).all(comparisonId);
  },

  adoptIndexSuggestion(suggestionId, isAdopted, note = null) {
    const db = getDb();
    const suggestion = db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(suggestionId);
    if (!suggestion) {
      throw new AppError(`索引建议不存在: ${suggestionId}`, 404, {
        error_type: 'index_suggestion_not_found',
        suggestion: '请检查建议ID是否正确'
      });
    }
    
    db.prepare(
      `UPDATE index_suggestions SET is_adopted = ?, adopted_note = ? WHERE id = ?`
    ).run(isAdopted ? 1 : 0, note, suggestionId);
    
    return db.prepare('SELECT * FROM index_suggestions WHERE id = ?').get(suggestionId);
  }
};

module.exports = compareService;
