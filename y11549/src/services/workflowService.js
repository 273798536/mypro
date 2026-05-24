const db = require('../config/database');
const { WORKFLOW_STATES } = require('../config/constants');
const auditService = require('./auditService');

const WORKFLOW_TRANSITIONS = {
  [WORKFLOW_STATES.DRAFT]: [WORKFLOW_STATES.SUBMITTED],
  [WORKFLOW_STATES.SUBMITTED]: [WORKFLOW_STATES.REJECTED, WORKFLOW_STATES.CONFIRMED],
  [WORKFLOW_STATES.REJECTED]: [WORKFLOW_STATES.SUBMITTED, WORKFLOW_STATES.DRAFT],
  [WORKFLOW_STATES.CONFIRMED]: [WORKFLOW_STATES.FROZEN, WORKFLOW_STATES.REJECTED]
};

const RECORD_TABLE_MAP = {
  material_list: 'material_lists',
  logistics_receipt: 'logistics_receipts',
  borrow_record: 'borrow_records',
  shift_record: 'shift_records',
  price_adjustment: 'price_adjustments'
};

const canTransition = (currentState, targetState) => {
  const allowedStates = WORKFLOW_TRANSITIONS[currentState] || [];
  return allowedStates.includes(targetState);
};

const getCurrentState = (tableName, recordId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT workflow_state FROM ${tableName} WHERE id = ?`;
    db.get(sql, [recordId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const updateState = (tableName, recordId, targetState) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE ${tableName}
      SET workflow_state = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(sql, [targetState, recordId], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
};

const transitionState = async (recordType, recordId, targetState, operator, operatorRole, changeReason) => {
  const tableName = RECORD_TABLE_MAP[recordType];
  if (!tableName) {
    throw new Error(`无效的记录类型: ${recordType}`);
  }

  const record = await getCurrentState(tableName, recordId);
  
  if (!record) {
    throw new Error(`记录不存在: ${recordType} #${recordId}`);
  }

  const currentState = record.workflow_state;

  if (currentState === WORKFLOW_STATES.FROZEN) {
    throw new Error('记录已冻结，无法变更状态');
  }

  if (!canTransition(currentState, targetState)) {
    throw new Error(`不允许的状态转换: ${currentState} -> ${targetState}`);
  }

  await updateState(tableName, recordId, targetState);

  await auditService.logAction(recordType, recordId, 'workflow_transition', {
    operator,
    operatorRole,
    changeReason,
    oldWorkflowState: currentState,
    newWorkflowState: targetState
  });

  return { success: true, oldState: currentState, newState: targetState };
};

const submit = (recordType, recordId, operator, operatorRole) => {
  return transitionState(recordType, recordId, WORKFLOW_STATES.SUBMITTED, operator, operatorRole, '提交审核');
};

const reject = (recordType, recordId, operator, operatorRole, reason) => {
  return transitionState(recordType, recordId, WORKFLOW_STATES.REJECTED, operator, operatorRole, reason || '驳回申请');
};

const confirm = (recordType, recordId, operator, operatorRole, reason) => {
  return transitionState(recordType, recordId, WORKFLOW_STATES.CONFIRMED, operator, operatorRole, reason || '二次确认通过');
};

const freeze = async (recordType, recordId, operator, operatorRole, reason) => {
  const tableName = RECORD_TABLE_MAP[recordType];
  if (!tableName) {
    throw new Error(`无效的记录类型: ${recordType}`);
  }

  const record = await getCurrentState(tableName, recordId);

  if (!record) {
    throw new Error(`记录不存在`);
  }

  await updateState(tableName, recordId, WORKFLOW_STATES.FROZEN);

  await auditService.logAction(recordType, recordId, 'freeze', {
    operator,
    operatorRole,
    changeReason: reason || '导出前冻结',
    oldWorkflowState: record.workflow_state,
    newWorkflowState: WORKFLOW_STATES.FROZEN
  });

  return { success: true };
};

const withdraw = async (recordType, recordId, operator, operatorRole, reason) => {
  const tableName = RECORD_TABLE_MAP[recordType];
  if (!tableName) {
    throw new Error(`无效的记录类型: ${recordType}`);
  }

  const record = await getCurrentState(tableName, recordId);

  if (!record) {
    throw new Error(`记录不存在`);
  }

  if (record.workflow_state !== WORKFLOW_STATES.SUBMITTED && record.workflow_state !== WORKFLOW_STATES.REJECTED) {
    throw new Error('当前状态不允许撤回');
  }

  await updateState(tableName, recordId, WORKFLOW_STATES.DRAFT);

  await auditService.logAction(recordType, recordId, 'withdraw', {
    operator,
    operatorRole,
    changeReason: reason || '撤回提交',
    oldWorkflowState: record.workflow_state,
    newWorkflowState: WORKFLOW_STATES.DRAFT
  });

  return { success: true };
};

module.exports = {
  WORKFLOW_STATES,
  canTransition,
  transitionState,
  submit,
  reject,
  confirm,
  freeze,
  withdraw
};
