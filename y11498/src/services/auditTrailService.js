const { db } = require('../models/db');

class AuditTrailService {
  async logOperation(options) {
    const {
      operationType,
      operationModule,
      operationDesc,
      sourceTable,
      sourceId,
      sourceNo,
      requestMethod,
      requestUrl,
      requestBody,
      responseStatus,
      responseBody,
      operator,
      operatorIp,
      beforeData,
      afterData
    } = options;

    await db.insert('audit_trails', {
      operation_type: operationType,
      operation_module: operationModule,
      operation_desc: operationDesc,
      source_table: sourceTable,
      source_id: sourceId,
      source_no: sourceNo,
      request_method: requestMethod,
      request_url: requestUrl,
      request_body: requestBody ? JSON.stringify(requestBody) : null,
      response_status: responseStatus,
      response_body: responseBody ? JSON.stringify(responseBody) : null,
      operator: operator || 'system',
      operator_ip: operatorIp,
      before_data: beforeData ? JSON.stringify(beforeData) : null,
      after_data: afterData ? JSON.stringify(afterData) : null
    });
  }

  async logCreate(module, sourceTable, sourceId, sourceNo, data, operator = 'system') {
    await this.logOperation({
      operationType: 'CREATE',
      operationModule: module,
      operationDesc: `创建${module}记录`,
      sourceTable,
      sourceId,
      sourceNo,
      afterData: data,
      operator
    });
  }

  async logUpdate(module, sourceTable, sourceId, sourceNo, beforeData, afterData, operator = 'system') {
    await this.logOperation({
      operationType: 'UPDATE',
      operationModule: module,
      operationDesc: `更新${module}记录`,
      sourceTable,
      sourceId,
      sourceNo,
      beforeData,
      afterData,
      operator
    });
  }

  async logDelete(module, sourceTable, sourceId, sourceNo, beforeData, operator = 'system') {
    await this.logOperation({
      operationType: 'DELETE',
      operationModule: module,
      operationDesc: `删除${module}记录`,
      sourceTable,
      sourceId,
      sourceNo,
      beforeData,
      operator
    });
  }

  async logApiRequest(method, url, body, status, response, operatorIp) {
    await this.logOperation({
      operationType: 'API_REQUEST',
      operationModule: 'HTTP',
      operationDesc: `HTTP ${method} ${url}`,
      requestMethod: method,
      requestUrl: url,
      requestBody: body,
      responseStatus: status,
      responseBody: response,
      operatorIp
    });
  }

  async logAuditRun(auditNo, summary, operator = 'system') {
    await this.logOperation({
      operationType: 'AUDIT_RUN',
      operationModule: 'AUDIT',
      operationDesc: `执行稽核任务: ${auditNo}`,
      sourceNo: auditNo,
      afterData: summary,
      operator
    });
  }

  async logReplay(sessionId, anomalyCount, operator = 'system') {
    await this.logOperation({
      operationType: 'REPLAY',
      operationModule: 'REPLAY',
      operationDesc: `执行回放: ${sessionId}, 发现${anomalyCount}个异常`,
      sourceNo: sessionId,
      operator
    });
  }

  async getTrails(filters = {}) {
    let sql = 'SELECT * FROM audit_trails WHERE 1=1';
    const params = [];

    if (filters.operationType) {
      sql += ' AND operation_type = ?';
      params.push(filters.operationType);
    }
    if (filters.operationModule) {
      sql += ' AND operation_module = ?';
      params.push(filters.operationModule);
    }
    if (filters.sourceNo) {
      sql += ' AND source_no = ?';
      params.push(filters.sourceNo);
    }
    if (filters.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY created_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return db.all(sql, params);
  }

  async getTrailById(id) {
    return db.findById('audit_trails', id);
  }
}

module.exports = new AuditTrailService();
