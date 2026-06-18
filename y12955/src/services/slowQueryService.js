const { getDb } = require('../models/database');
const { AppError, validateRequired, parseJsonSafe } = require('../utils/helpers');
const workOrderService = require('./workOrderService');

const slowQueryService = {
  importSlowQueryLog(workOrderId, records, sourceFile = null) {
    validateRequired(['records'], { records });
    
    if (!Array.isArray(records) || records.length === 0) {
      throw new AppError('慢查询日志不能为空', 400, {
        error_type: 'empty_slow_query',
        suggestion: '请提供至少一条慢查询记录'
      });
    }
    
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const insertStmt = db.prepare(`
      INSERT INTO slow_query_logs 
      (work_order_id, query_text, execution_time, rows_examined, rows_sent, related_table, timestamp, source_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((records) => {
      for (const record of records) {
        validateRequired(['query_text'], record);
        insertStmt.run(
          workOrderId,
          record.query_text,
          record.execution_time || null,
          record.rows_examined || null,
          record.rows_sent || null,
          record.related_table || null,
          record.timestamp || null,
          sourceFile
        );
      }
    });
    
    insertMany(records);
    
    return {
      success: true,
      record_count: records.length,
      message: `成功导入 ${records.length} 条慢查询日志`
    };
  },

  listSlowQueries(workOrderId, params = {}) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const { related_table, min_time, page = 1, pageSize = 50 } = params;
    
    let whereClauses = ['work_order_id = ?'];
    let queryParams = [workOrderId];
    
    if (related_table) {
      whereClauses.push('related_table = ?');
      queryParams.push(related_table);
    }
    if (min_time !== undefined) {
      whereClauses.push('execution_time >= ?');
      queryParams.push(parseFloat(min_time));
    }
    
    const whereSql = 'WHERE ' + whereClauses.join(' AND ');
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM slow_query_logs ${whereSql}`);
    const { total } = countStmt.get(...queryParams);
    
    const offset = (page - 1) * pageSize;
    const listStmt = db.prepare(`
      SELECT * FROM slow_query_logs ${whereSql}
      ORDER BY execution_time DESC, timestamp DESC
      LIMIT ? OFFSET ?
    `);
    const list = listStmt.all(...queryParams, pageSize, offset);
    
    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  },

  getSlowQuery(id) {
    const db = getDb();
    const log = db.prepare('SELECT * FROM slow_query_logs WHERE id = ?').get(id);
    
    if (!log) {
      throw new AppError(`慢查询日志不存在: ${id}`, 404, {
        error_type: 'slow_query_not_found',
        suggestion: '请检查慢查询ID是否正确'
      });
    }
    
    return log;
  },

  linkToConclusion(slowQueryId, conclusionRef, relatedNote = null) {
    const db = getDb();
    
    const log = slowQueryService.getSlowQuery(slowQueryId);
    
    const stmt = db.prepare(`
      UPDATE slow_query_logs SET conclusion_ref = ? WHERE id = ?
    `);
    stmt.run(conclusionRef, slowQueryId);
    
    return {
      success: true,
      message: `慢查询日志已关联到结论 #${conclusionRef}`,
      slow_query_id: slowQueryId,
      conclusion_ref: conclusionRef
    };
  },

  getSlowQueriesByTable(workOrderId, tableName) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const stmt = db.prepare(`
      SELECT * FROM slow_query_logs 
      WHERE work_order_id = ? AND related_table = ?
      ORDER BY execution_time DESC
    `);
    return stmt.all(workOrderId, tableName);
  },

  analyzeSlowQueriesForComparison(workOrderId, comparisonId) {
    const db = getDb();
    
    workOrderService.getWorkOrderById(workOrderId);
    
    const { getComparisonById, getComparisonDetails } = require('./compareService');
    getComparisonById(comparisonId);
    
    const details = getComparisonDetails(comparisonId, { pageSize: 1000 });
    const changedTables = [...new Set(details.list.map(d => d.table_name))];
    
    const result = [];
    
    for (const table of changedTables) {
      const queries = slowQueryService.getSlowQueriesByTable(workOrderId, table);
      
      if (queries.length > 0) {
        const avgTime = queries.reduce((sum, q) => sum + (q.execution_time || 0), 0) / queries.length;
        const maxTime = Math.max(...queries.map(q => q.execution_time || 0));
        
        result.push({
          table_name: table,
          slow_query_count: queries.length,
          avg_execution_time: Math.round(avgTime * 100) / 100,
          max_execution_time: maxTime,
          top_queries: queries.slice(0, 5),
          note: '该表存在慢查询，建议结合索引建议评估优化效果'
        });
      }
    }
    
    return {
      affected_tables: result.length,
      total_slow_queries: result.reduce((sum, r) => sum + r.slow_query_count, 0),
      details: result
    };
  },

  getConclusionsWithSlowQueries(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const queries = db.prepare(`
      SELECT * FROM slow_query_logs 
      WHERE work_order_id = ? AND conclusion_ref IS NOT NULL
      ORDER BY execution_time DESC
    `).all(workOrderId);
    
    const byConclusion = {};
    for (const q of queries) {
      const ref = q.conclusion_ref;
      if (!byConclusion[ref]) {
        byConclusion[ref] = [];
      }
      byConclusion[ref].push(q);
    }
    
    return byConclusion;
  }
};

module.exports = slowQueryService;
