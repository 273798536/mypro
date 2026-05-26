const { getDb } = require('../db');

const VALID_TRANSITIONS = {
  created:     ['pending', 'rejected'],
  pending:     ['investigating', 'rejected', 'closed'],
  investigating: ['pending_confirmation', 'rejected', 'closed'],
  pending_confirmation: ['resolved', 'investigating', 'rejected'],
  resolved:    ['closed'],
  rejected:    [],
  closed:      [],
};

const TERMINAL_STATUSES = ['resolved', 'rejected', 'closed'];

function canTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

function getStatusChain() {
  return [
    { key: 'created', label: '已创建', terminal: false },
    { key: 'pending', label: '待处理', terminal: false },
    { key: 'investigating', label: '调查中', terminal: false },
    { key: 'pending_confirmation', label: '待确认', terminal: false },
    { key: 'resolved', label: '已解决', terminal: true },
    { key: 'rejected', label: '已驳回', terminal: true },
    { key: 'closed', label: '已关闭', terminal: true },
  ];
}

function advance(caseNo, targetStatus, operator, remark) {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(caseNo);
  if (!c) throw new Error('工单不存在: ' + caseNo);

  if (TERMINAL_STATUSES.includes(c.status)) {
    throw new Error(`工单已处于终态 "${c.status}"，不能再推进`);
  }

  if (!canTransition(c.status, targetStatus)) {
    throw new Error(`非法状态跳转: ${c.status} -> ${targetStatus}. 允许: ${(VALID_TRANSITIONS[c.status] || []).join(', ')}`);
  }

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO arbitration_status_log (case_no, from_status, to_status, operator, remark) VALUES (?, ?, ?, ?, ?)')
      .run(caseNo, c.status, targetStatus, operator || 'system', remark || null);
    db.prepare('UPDATE arbitration_cases SET status = ?, updated_at = datetime(\'now\') WHERE case_no = ?')
      .run(targetStatus, caseNo);
  });
  tx();

  return { case_no: caseNo, from: c.status, to: targetStatus, operator: operator || 'system' };
}

function assignHandler(caseNo, handler) {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(caseNo);
  if (!c) throw new Error('工单不存在: ' + caseNo);
  if (TERMINAL_STATUSES.includes(c.status)) {
    throw new Error(`工单已处于终态 "${c.status}"，不能分配处理人`);
  }
  db.prepare('UPDATE arbitration_cases SET current_handler = ?, updated_at = datetime(\'now\') WHERE case_no = ?')
    .run(handler, caseNo);
  return { case_no: caseNo, current_handler: handler };
}

function setOpinion(caseNo, opinion, operator) {
  const db = getDb();
  const c = db.prepare('SELECT * FROM arbitration_cases WHERE case_no = ?').get(caseNo);
  if (!c) throw new Error('工单不存在: ' + caseNo);
  db.prepare('UPDATE arbitration_cases SET arbitration_opinion = ?, updated_at = datetime(\'now\') WHERE case_no = ?')
    .run(opinion, caseNo);
  return { case_no: caseNo, arbitration_opinion: opinion };
}

module.exports = {
  canTransition, getStatusChain, advance, assignHandler, setOpinion,
  VALID_TRANSITIONS, TERMINAL_STATUSES,
};
