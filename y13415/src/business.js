const {
  RecordDAO,
  StatusHistoryDAO,
  ParameterVersionDAO,
  ExceptionDAO,
  ReviewActionDAO
} = require('./dao');

function findCutPoints(graph) {
  const adj = {};
  for (const [u, v] of graph.edges) {
    if (!adj[u]) adj[u] = [];
    if (!adj[v]) adj[v] = [];
    adj[u].push(v);
    adj[v].push(u);
  }

  const nodes = graph.nodes || Object.keys(adj).map(Number);
  const visited = new Set();
  const disc = {};
  const low = {};
  const parent = {};
  const cutPoints = new Set();
  let time = 0;

  function tarjan(u) {
    visited.add(u);
    disc[u] = low[u] = ++time;
    let children = 0;

    for (const v of adj[u] || []) {
      if (!visited.has(v)) {
        parent[v] = u;
        children++;
        tarjan(v);
        low[u] = Math.min(low[u], low[v]);

        if (parent[u] === undefined && children > 1) {
          cutPoints.add(u);
        }
        if (parent[u] !== undefined && low[v] >= disc[u]) {
          cutPoints.add(u);
        }
      } else if (v !== parent[u]) {
        low[u] = Math.min(low[u], disc[v]);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      tarjan(node);
    }
  }

  return Array.from(cutPoints).sort((a, b) => a - b);
}

function validateAndProcess(recordData, operator = 'system') {
  const exceptions = [];
  let isDirty = false;
  let dirtyReason = '';
  let processingSuggestion = '';

  if (!recordData.unit || recordData.unit.trim() === '') {
    isDirty = true;
    dirtyReason += '单位缺失;';
    processingSuggestion += '建议补充单位，可选单位: 个、节点数、百分比;';
    exceptions.push({
      exception_type: 'unit_missing',
      detail: '验算结果未标注单位，可能导致数值解读歧义',
      original_value: null,
      suggested_value: '个',
      suggestion: '请根据实际业务场景确认单位：节点数量用"个"，占比用"%"',
      severity: 'error'
    });
  }

  if (recordData.threshold === undefined || recordData.threshold === null) {
    isDirty = true;
    dirtyReason += '阈值未设置;';
    processingSuggestion += '建议设置阈值，默认推荐: 2;';
    exceptions.push({
      exception_type: 'threshold_missing',
      detail: '未设置判定阈值，无法进行自动判定',
      original_value: null,
      suggested_value: '2',
      suggestion: '割点数量>=阈值时判定为异常图，请根据课堂要求设置',
      severity: 'warning'
    });
  }

  if (!recordData.graph_data || !recordData.graph_data.edges || !Array.isArray(recordData.graph_data.edges)) {
    isDirty = true;
    dirtyReason += '图数据格式错误;';
    processingSuggestion += '图数据需包含edges数组，格式: [[u1,v1],[u2,v2],...];';
    exceptions.push({
      exception_type: 'graph_format_error',
      detail: '图数据格式不正确，缺少edges字段或格式错误',
      original_value: JSON.stringify(recordData.graph_data),
      suggested_value: '{"edges":[[1,2],[2,3]],"nodes":[1,2,3]}',
      suggestion: '请按照标准格式提供无向图的边列表',
      severity: 'error'
    });
  }

  if (!recordData.parameter_version) {
    recordData.parameter_version = 'v1.0';
    exceptions.push({
      exception_type: 'version_missing',
      detail: '未指定参数版本，自动使用默认v1.0',
      original_value: null,
      suggested_value: 'v1.0',
      suggestion: '建议显式指定参数版本以便追溯',
      severity: 'info'
    });
  }

  let actualCutPoints = [];
  if (!isDirty || (recordData.graph_data && recordData.graph_data.edges)) {
    try {
      actualCutPoints = findCutPoints(recordData.graph_data);
    } catch (e) {
      isDirty = true;
      dirtyReason += '割点计算异常:' + e.message + ';';
      exceptions.push({
        exception_type: 'calculation_error',
        detail: '割点计算过程中发生异常: ' + e.message,
        original_value: JSON.stringify(recordData.graph_data),
        suggested_value: null,
        suggestion: '请检查图数据是否包含自环或孤立节点等边界情况',
        severity: 'error'
      });
    }
  }

  const recordId = RecordDAO.create({
    ...recordData,
    actual_cut_points: actualCutPoints,
    is_dirty: isDirty,
    dirty_reason: isDirty ? dirtyReason : null,
    processing_suggestion: isDirty ? processingSuggestion : null,
    status: isDirty ? 'dirty' : 'pending'
  });

  for (const exc of exceptions) {
    ExceptionDAO.create({
      record_id: recordId,
      ...exc
    });
  }

  ParameterVersionDAO.create({
    record_id: recordId,
    version: recordData.parameter_version || 'v1.0',
    param_name: 'initial_submit',
    old_value: null,
    new_value: JSON.stringify({
      threshold: recordData.threshold,
      unit: recordData.unit,
      algorithm: 'tarjan'
    }),
    old_unit: null,
    new_unit: recordData.unit,
    conversion_factor: null,
    threshold_old: null,
    threshold_new: recordData.threshold,
    operator,
    change_reason: '初始提交'
  });

  return {
    record_id: recordId,
    actual_cut_points: actualCutPoints,
    is_dirty: isDirty,
    exceptions: exceptions.length,
    status: isDirty ? 'dirty' : 'pending'
  };
}

function requestWithdrawal(recordId, operator, reason) {
  const record = RecordDAO.getById(recordId);
  if (!record) {
    return { success: false, error: '记录不存在' };
  }

  const actionId = ReviewActionDAO.create({
    record_id: recordId,
    action_type: 'withdraw_request',
    needs_human_judgment: 1,
    human_judgment_result: null,
    judgment_note: reason,
    operator
  });

  RecordDAO.updateStatus(recordId, 'withdraw_pending', operator, reason);

  return {
    success: true,
    action_id: actionId,
    message: '撤回申请已提交，等待人工判断',
    needs_human_judgment: true
  };
}

function judgeWithdrawal(actionId, recordId, approved, judgmentNote, operator) {
  const record = RecordDAO.getById(recordId);
  if (!record) {
    return { success: false, error: '记录不存在' };
  }

  ReviewActionDAO.updateJudgment(actionId, approved ? 'approved' : 'rejected', judgmentNote, operator);

  if (approved) {
    RecordDAO.updateStatus(recordId, 'withdrawn', operator, '撤回申请已通过: ' + judgmentNote);
  } else {
    RecordDAO.updateStatus(recordId, 'reviewed', operator, '撤回申请被拒绝: ' + judgmentNote);
  }

  return {
    success: true,
    new_status: approved ? 'withdrawn' : 'reviewed',
    message: approved ? '记录已撤回' : '撤回申请已拒绝'
  };
}

function reviewRecord(recordId, reviewer, comment, status = 'reviewed') {
  const result = RecordDAO.updateReview(recordId, reviewer, comment, status);
  if (!result) {
    return { success: false, error: '记录不存在' };
  }

  ReviewActionDAO.create({
    record_id: recordId,
    action_type: 'review',
    needs_human_judgment: 0,
    human_judgment_result: status,
    judgment_note: comment,
    operator: reviewer
  });

  return { success: true, status };
}

function updateParameter(recordId, paramName, oldValue, newValue, oldUnit, newUnit, conversionFactor, oldThreshold, newThreshold, operator, reason) {
  const record = RecordDAO.getById(recordId);
  if (!record) {
    return { success: false, error: '记录不存在' };
  }

  const version = 'v' + (parseInt(record.parameter_version.replace('v', '')) + 0.1).toFixed(1);

  ParameterVersionDAO.create({
    record_id: recordId,
    version,
    param_name: paramName,
    old_value: String(oldValue),
    new_value: String(newValue),
    old_unit: oldUnit,
    new_unit: newUnit,
    conversion_factor: conversionFactor,
    threshold_old: oldThreshold,
    threshold_new: newThreshold,
    operator,
    change_reason: reason
  });

  ExceptionDAO.create({
    record_id: recordId,
    exception_type: 'parameter_change',
    detail: `参数${paramName}变更: ${oldValue}${oldUnit || ''} -> ${newValue}${newUnit || ''}`,
    original_value: String(oldValue),
    suggested_value: String(newValue),
    suggestion: reason,
    severity: 'info'
  });

  return { success: true, version };
}

function getRecordDetail(recordId) {
  const record = RecordDAO.getById(recordId);
  if (!record) return null;

  return {
    record,
    status_history: StatusHistoryDAO.getByRecordId(recordId),
    parameter_versions: ParameterVersionDAO.getByRecordId(recordId),
    exceptions: ExceptionDAO.getByRecordId(recordId),
    review_actions: ReviewActionDAO.getByRecordId(recordId)
  };
}

function getExceptionSummary() {
  const exceptions = ExceptionDAO.getAll();
  const summary = {
    total: exceptions.length,
    by_type: {},
    by_severity: { error: 0, warning: 0, info: 0 },
    records_with_errors: new Set()
  };

  for (const exc of exceptions) {
    summary.by_type[exc.exception_type] = (summary.by_type[exc.exception_type] || 0) + 1;
    summary.by_severity[exc.severity]++;
    if (exc.severity === 'error') {
      summary.records_with_errors.add(exc.record_id);
    }
  }

  summary.records_with_errors = summary.records_with_errors.size;
  return summary;
}

module.exports = {
  findCutPoints,
  validateAndProcess,
  requestWithdrawal,
  judgeWithdrawal,
  reviewRecord,
  updateParameter,
  getRecordDetail,
  getExceptionSummary
};
