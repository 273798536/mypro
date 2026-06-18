const { getDb } = require('../models/database');
const { AppError, WORK_ORDER_STATUS } = require('../utils/helpers');
const workOrderService = require('./workOrderService');
const compareService = require('./compareService');
const permissionAuditService = require('./permissionAuditService');
const slowQueryService = require('./slowQueryService');

const reportService = {
  generateReport(workOrderId, comparisonId = null, reportType = 'full') {
    const db = getDb();
    const order = workOrderService.getWorkOrderById(workOrderId);
    
    if (!comparisonId) {
      const comparisons = compareService.listComparisonsByWorkOrder(workOrderId);
      if (comparisons.length === 0) {
        throw new AppError(
          '没有可用的对比记录，请先执行表结构对比',
          400,
          {
            error_type: 'no_comparison_for_report',
            suggestion: '请先导入两个版本的数据字典并执行对比，然后再生成报告'
          }
        );
      }
      comparisonId = comparisons[0].id;
    }
    
    const comparison = compareService.getComparisonById(comparisonId);
    const details = compareService.getComparisonDetails(comparisonId, { pageSize: 10000 });
    const rollbacks = compareService.getRollbackRecords(comparisonId);
    const indexSuggestions = compareService.getIndexSuggestions(comparisonId);
    
    const audits = permissionAuditService.listAudits(workOrderId);
    const latestAudit = audits.length > 0 ? audits[0] : null;
    
    const slowQueries = slowQueryService.analyzeSlowQueriesForComparison(workOrderId, comparisonId);
    
    const summary = {
      work_order: {
        id: order.id,
        order_no: order.order_no,
        title: order.title,
        status: order.status,
        source: order.source
      },
      comparison: {
        id: comparison.id,
        baseline_version: comparison.baseline_version,
        target_version: comparison.target_version,
        status: comparison.status,
        total_changes: comparison.total_changes,
        created_at: comparison.created_at
      },
      drift_summary: {
        total: details.total,
        can_use_directly: 0,
        need_review: 0,
        by_type: {}
      },
      index_suggestions: {
        total: indexSuggestions.length,
        high_priority: indexSuggestions.filter(s => s.priority === 'high').length,
        medium_priority: indexSuggestions.filter(s => s.priority === 'medium').length,
        low_priority: indexSuggestions.filter(s => s.priority === 'low').length,
        adopted: indexSuggestions.filter(s => s.is_adopted).length
      },
      permission_audit: latestAudit ? {
        status: latestAudit.status,
        issues_count: latestAudit.issues ? latestAudit.issues.length : 0,
        conclusion: latestAudit.conclusion
      } : null,
      slow_query_impact: {
        affected_tables: slowQueries.affected_tables,
        total_slow_queries: slowQueries.total_slow_queries
      }
    };
    
    for (const detail of details.list) {
      summary.drift_summary.by_type[detail.change_type] = 
        (summary.drift_summary.by_type[detail.change_type] || 0) + 1;
      if (detail.can_use_directly) {
        summary.drift_summary.can_use_directly++;
      } else {
        summary.drift_summary.need_review++;
      }
    }
    
    const reportContent = {
      summary,
      can_use_directly: details.list.filter(d => d.can_use_directly),
      need_review: details.list.filter(d => !d.can_use_directly),
      rollback_records: rollbacks,
      index_suggestions: indexSuggestions,
      permission_audit: latestAudit,
      slow_query_analysis: slowQueries,
      status_transitions: workOrderService.listStatusTransitions(workOrderId)
    };
    
    const stmt = db.prepare(`
      INSERT INTO reports (work_order_id, comparison_id, report_type, content, status)
      VALUES (?, ?, ?, ?, 'generated')
    `);
    
    const result = stmt.run(
      workOrderId,
      comparisonId,
      reportType,
      JSON.stringify(reportContent)
    );
    
    const reportId = result.lastInsertRowid;
    
    if (order.status === WORK_ORDER_STATUS.AUDITING || order.status === WORK_ORDER_STATUS.COMPARING) {
      workOrderService.transitionStatus(
        workOrderId,
        WORK_ORDER_STATUS.COMPLETED,
        'system',
        `生成对比报告 #${reportId}`
      );
    }
    
    return {
      report_id: reportId,
      summary,
      message: '报告生成成功'
    };
  },

  getReport(id) {
    const db = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    
    if (!report) {
      throw new AppError(`报告不存在: ${id}`, 404, {
        error_type: 'report_not_found',
        suggestion: '请检查报告ID是否正确'
      });
    }
    
    return {
      ...report,
      content: report.content ? JSON.parse(report.content) : null
    };
  },

  listReports(workOrderId) {
    const db = getDb();
    workOrderService.getWorkOrderById(workOrderId);
    
    const stmt = db.prepare(`
      SELECT id, work_order_id, comparison_id, report_type, status, export_time, reviewer, created_at
      FROM reports 
      WHERE work_order_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(workOrderId);
  },

  exportReport(reportId, format = 'json') {
    const report = reportService.getReport(reportId);
    const db = getDb();
    
    if (format === 'json') {
      db.prepare(`
        UPDATE reports SET status = 'exported', export_time = CURRENT_TIMESTAMP WHERE id = ?
      `).run(reportId);
      
      return {
        format: 'json',
        data: report.content,
        export_time: new Date().toISOString()
      };
    }
    
    if (format === 'summary') {
      const content = report.content;
      const summaryText = reportService._generateSummaryText(content);
      
      db.prepare(`
        UPDATE reports SET status = 'exported', export_time = CURRENT_TIMESTAMP WHERE id = ?
      `).run(reportId);
      
      return {
        format: 'summary',
        data: summaryText,
        export_time: new Date().toISOString()
      };
    }
    
    throw new AppError(
      `不支持的导出格式: ${format}`,
      400,
      {
        error_type: 'unsupported_format',
        supported_formats: ['json', 'summary'],
        suggestion: '请选择支持的导出格式: json 或 summary'
      }
    );
  },

  _generateSummaryText(content) {
    const s = content.summary;
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('表结构漂移对比报告');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push(`工单号: ${s.work_order.order_no}`);
    lines.push(`工单标题: ${s.work_order.title}`);
    lines.push(`工单状态: ${s.work_order.status}`);
    lines.push('');
    
    lines.push(`对比版本: ${s.comparison.baseline_version} → ${s.comparison.target_version}`);
    lines.push(`总变更数: ${s.drift_summary.total}`);
    lines.push(`可直接使用: ${s.drift_summary.can_use_directly}`);
    lines.push(`需复核: ${s.drift_summary.need_review}`);
    lines.push('');
    
    lines.push('--- 按变更类型统计 ---');
    for (const [type, count] of Object.entries(s.drift_summary.by_type)) {
      lines.push(`  ${type}: ${count}`);
    }
    lines.push('');
    
    lines.push('--- 索引建议 ---');
    lines.push(`总数: ${s.index_suggestions.total}`);
    lines.push(`高优先级: ${s.index_suggestions.high_priority}`);
    lines.push(`中优先级: ${s.index_suggestions.medium_priority}`);
    lines.push(`低优先级: ${s.index_suggestions.low_priority}`);
    lines.push('');
    
    if (s.permission_audit) {
      lines.push('--- 权限审计 ---');
      lines.push(`状态: ${s.permission_audit.status}`);
      lines.push(`问题数: ${s.permission_audit.issues_count}`);
      lines.push(`结论: ${s.permission_audit.conclusion}`);
      lines.push('');
    }
    
    lines.push('--- 慢查询影响 ---');
    lines.push(`受影响表数: ${s.slow_query_impact.affected_tables}`);
    lines.push(`慢查询总数: ${s.slow_query_impact.total_slow_queries}`);
    lines.push('');
    
    if (content.need_review && content.need_review.length > 0) {
      lines.push('--- 需重点复核的变更 ---');
      for (const item of content.need_review.slice(0, 10)) {
        lines.push(`  [${item.change_type}] ${item.table_name}${item.column_name ? '.' + item.column_name : ''}`);
        if (item.need_review_reason) {
          lines.push(`    原因: ${item.need_review_reason}`);
        }
      }
      if (content.need_review.length > 10) {
        lines.push(`  ... 还有 ${content.need_review.length - 10} 条需复核`);
      }
    }
    
    lines.push('');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  },

  reviewReport(reportId, reviewer, status = 'reviewed') {
    const db = getDb();
    reportService.getReport(reportId);
    
    const stmt = db.prepare(`
      UPDATE reports SET reviewer = ?, status = ? WHERE id = ?
    `);
    stmt.run(reviewer, status, reportId);
    
    return reportService.getReport(reportId);
  }
};

module.exports = reportService;
