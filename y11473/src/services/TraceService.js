const { OperationTrace } = require('../models');
const logger = require('../config/logger');

class TraceService {
  static async record(traceType, operation, options = {}) {
    const trace = await OperationTrace.create({
      trace_type: traceType,
      trace_name: options.traceName || operation,
      operation,
      operator: options.operator || 'system',
      source: options.source || 'system',
      request_url: options.requestUrl,
      request_method: options.requestMethod,
      request_params: options.requestParams ? JSON.stringify(options.requestParams) : null,
      request_body: options.requestBody ? JSON.stringify(options.requestBody) : null,
      response_status: options.responseStatus,
      response_body: options.responseBody ? JSON.stringify(options.responseBody) : null,
      affected_record_type: options.affectedRecordType,
      affected_record_id: options.affectedRecordId,
      affected_count: options.affectedCount || 0,
      status: options.status || 'success',
      error_message: options.errorMessage,
      duration: options.duration,
      extra_data: options.extraData ? JSON.stringify(options.extraData) : null,
      async_task_id: options.asyncTaskId
    });
    logger.debug(`记录操作轨迹: ${trace.id} [${traceType}] ${operation}`);
    return trace;
  }

  static recordGenerateData(affectedCount, extraData = {}) {
    return this.record('generate_data', '生成测试数据', {
      affectedCount,
      extraData,
      source: 'script'
    });
  }

  static recordServiceStart(port) {
    return this.record('service_start', '启动服务', {
      extraData: { port },
      source: 'system'
    });
  }

  static recordServiceStop() {
    return this.record('service_stop', '停止服务', {
      source: 'system'
    });
  }

  static recordHttpRequest(method, url, params, body, status, responseBody, duration) {
    return this.record('http_request', 'HTTP请求', {
      traceName: `${method} ${url}`,
      requestMethod: method,
      requestUrl: url,
      requestParams: params,
      requestBody: body,
      responseStatus: status,
      responseBody,
      duration,
      source: 'api'
    });
  }

  static recordReconciliation(affectedCount, results = {}) {
    return this.record('reconciliation', '数据对账', {
      affectedCount,
      extraData: results,
      source: 'task'
    });
  }

  static recordExport(exportType, affectedCount, filePath) {
    return this.record('export', '数据导出', {
      traceName: `导出${exportType}`,
      affectedCount,
      extraData: { filePath, exportType },
      source: 'script'
    });
  }

  static recordReplayException(exceptionId, success) {
    return this.record('replay_exception', '异常回放', {
      affectedRecordId: exceptionId,
      affectedRecordType: 'ExceptionRecord',
      status: success ? 'success' : 'failed',
      source: 'task'
    });
  }

  static recordManualCorrection(recordType, recordId, fieldName, correctedBy) {
    return this.record('manual_correction', '人工修正', {
      affectedRecordType: recordType,
      affectedRecordId: recordId,
      extraData: { fieldName },
      operator: correctedBy,
      source: 'manual'
    });
  }

  static async getTraces(filters = {}) {
    const where = {};
    if (filters.traceType) where.trace_type = filters.traceType;
    if (filters.operation) where.operation = filters.operation;
    if (filters.status) where.status = filters.status;
    if (filters.operator) where.operator = filters.operator;
    if (filters.affectedRecordId) where.affected_record_id = filters.affectedRecordId;
    return await OperationTrace.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 100
    });
  }
}

module.exports = TraceService;
