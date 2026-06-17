import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tickets');
  const result = countStmt.get() as { count: number };
  if (result.count > 0) {
    return;
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const ticket1Id = uuidv4();
  const ticket2Id = uuidv4();
  const ticket3Id = uuidv4();
  const ticket4Id = uuidv4();

  insertTicket(ticket1Id, 'KF-2026-0618-001', '用户反馈充值后余额未到账，已等待24小时', '张先生', 'need_evidence', 1, 2, null, false, false, twoHoursAgo, hourAgo);
  insertTicket(ticket2Id, 'KF-2026-0618-002', '订单取消后退款未收到，已超过7个工作日', '李女士', 'locked', 2, 3, 2, true, true, threeHoursAgo, hourAgo);
  insertTicket(ticket3Id, 'KF-2026-0618-003', '商品质量问题，申请退换货被拒', '王先生', 'pending', 1, 1, null, false, false, twoHoursAgo, twoHoursAgo);
  insertTicket(ticket4Id, 'KF-2026-0618-004', '账户异常登录，怀疑被盗号', '赵女士', 'completed', 2, 2, null, false, true, threeHoursAgo, hourAgo);

  const v1_t1 = insertVersion(ticket1Id, 1, 'model-v2.1.0', '用户充值未到账，需核实支付凭证和系统充值记录', 'need_evidence', false, null, null, '现场老师', '首次导入材料', twoHoursAgo);
  insertEvidence(v1_t1, ticket1Id, '用户支付凭证截图，显示支付成功', 'import', false, 'batch-20260618-01', twoHoursAgo);
  insertEvidence(v1_t1, ticket1Id, '用户充值订单号：CZ20260617001', 'import', false, 'batch-20260618-01', twoHoursAgo);
  insertEvidence(v1_t1, ticket1Id, '【注意：样本泄漏】训练集中包含相同订单号的测试样本', 'import', true, 'batch-20260618-01', twoHoursAgo);
  insertAuditLog(ticket1Id, 1, 'import_materials', '系统', '导入第一批材料，共3条证据', twoHoursAgo);

  const v1_t2 = insertVersion(ticket2Id, 1, 'model-v2.0.0', '用户退款未到账，建议联系支付渠道核实', 'processing', false, null, null, '系统', '首次导入材料', threeHoursAgo);
  insertEvidence(v1_t2, ticket2Id, '订单取消成功截图', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v1_t2, ticket2Id, '银行流水未显示退款入账', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertAuditLog(ticket2Id, 1, 'import_materials', '系统', '导入第一批材料，共2条证据', threeHoursAgo);

  const v2_t2 = insertVersion(ticket2Id, 2, 'model-v2.0.0', '经人工复核，确认退款被支付渠道拦截，需用户联系银行处理', 'locked', true, '周姐', twoHoursAgo.toISOString(), '周姐', '补充银行客服回复记录', twoHoursAgo);
  insertEvidence(v2_t2, ticket2Id, '订单取消成功截图', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v2_t2, ticket2Id, '银行流水未显示退款入账', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v2_t2, ticket2Id, '银行客服回复：该笔退款因账户异常被拦截，需户主持身份证到柜台办理', 'supplement', false, 'batch-20260618-02', twoHoursAgo);
  insertAuditLog(ticket2Id, 2, 'supplement_evidence', '周姐', '补充银行客服回复证据', twoHoursAgo);
  insertAuditLog(ticket2Id, 2, 'manual_review', '周姐', '人工复核完成，锁定判定结果', twoHoursAgo);

  const v3_t2 = insertVersion(ticket2Id, 3, 'model-v2.1.0', '【模型自动生成，仅供参考】建议重新发起退款申请', 'processing', false, null, null, '系统', '模型版本更新，重新生成结果', hourAgo);
  insertEvidence(v3_t2, ticket2Id, '订单取消成功截图', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v3_t2, ticket2Id, '银行流水未显示退款入账', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v3_t2, ticket2Id, '银行客服回复：该笔退款因账户异常被拦截，需户主持身份证到柜台办理', 'supplement', false, 'batch-20260618-02', twoHoursAgo);
  insertAuditLog(ticket2Id, 3, 'model_update', '系统', '模型版本从v2.0.0更新到v2.1.0，生成新结果（不覆盖已锁定的v2版本）', hourAgo);

  const v1_t3 = insertVersion(ticket3Id, 1, 'model-v2.1.0', '用户申请退换货被拒，需核实商品是否影响二次销售', 'pending', false, null, null, '现场老师', '首次导入材料', twoHoursAgo);
  insertEvidence(v1_t3, ticket3Id, '商品破损照片', 'import', false, 'batch-20260618-01', twoHoursAgo);
  insertEvidence(v1_t3, ticket3Id, '商家拒绝退换货的聊天记录', 'import', false, 'batch-20260618-01', twoHoursAgo);
  insertAuditLog(ticket3Id, 1, 'import_materials', '现场老师', '导入第一批材料，共2条证据', twoHoursAgo);

  const v1_t4 = insertVersion(ticket4Id, 1, 'model-v2.0.0', '账户异常登录，建议用户修改密码并开启二次验证', 'processing', false, null, null, '系统', '首次导入材料', threeHoursAgo);
  insertEvidence(v1_t4, ticket4Id, '异常登录提醒邮件截图', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v1_t4, ticket4Id, '登录记录显示异地IP', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertAuditLog(ticket4Id, 1, 'import_materials', '系统', '导入第一批材料，共2条证据', threeHoursAgo);

  const v2_t4 = insertVersion(ticket4Id, 2, 'model-v2.0.0', '已协助用户冻结账户并修改密码，开启二次验证，问题已解决', 'completed', false, null, null, '现场老师', '补充用户沟通记录', hourAgo);
  insertEvidence(v2_t4, ticket4Id, '异常登录提醒邮件截图', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v2_t4, ticket4Id, '登录记录显示异地IP', 'import', false, 'batch-20260618-01', threeHoursAgo);
  insertEvidence(v2_t4, ticket4Id, '用户确认已修改密码并开启二次验证', 'supplement', false, 'batch-20260618-02', hourAgo);
  insertEvidence(v2_t4, ticket4Id, '账户操作日志显示异常操作已被拦截', 'supplement', false, 'batch-20260618-02', hourAgo);
  insertAuditLog(ticket4Id, 2, 'supplement_evidence', '现场老师', '补充用户沟通记录，共2条新证据', hourAgo);
  insertAuditLog(ticket4Id, 2, 'status_update', '现场老师', '工单状态更新为已完成', hourAgo);
}

function insertTicket(
  id: string,
  ticketNo: string,
  customerIssue: string,
  customerName: string,
  status: string,
  currentVersion: number,
  latestVersion: number,
  lockedVersion: number | null,
  hasSampleLeak: boolean,
  hasManualMark: boolean,
  createdAt: Date,
  updatedAt: Date
) {
  const stmt = db.prepare(`
    INSERT INTO tickets (id, ticket_no, customer_issue, customer_name, status, current_version, latest_version, locked_version, has_sample_leak, has_manual_mark, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, ticketNo, customerIssue, customerName, status, currentVersion, latestVersion, lockedVersion, hasSampleLeak ? 1 : 0, hasManualMark ? 1 : 0, createdAt.toISOString(), updatedAt.toISOString());
}

function insertVersion(
  ticketId: string,
  version: number,
  modelVersion: string,
  summary: string,
  status: string,
  isLocked: boolean,
  lockedBy: string | null,
  lockedAt: string | null,
  createdBy: string,
  changeNote: string,
  createdAt: Date
): string {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO ticket_versions (id, ticket_id, version, model_version, summary, status, is_locked, locked_by, locked_at, created_by, change_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, ticketId, version, modelVersion, summary, status, isLocked ? 1 : 0, lockedBy, lockedAt, createdBy, changeNote, createdAt.toISOString());
  return id;
}

function insertEvidence(
  versionId: string,
  ticketId: string,
  content: string,
  source: string,
  isSampleLeak: boolean,
  importBatch: string,
  createdAt: Date
): string {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO evidences (id, version_id, ticket_id, content, source, is_sample_leak, import_batch, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, versionId, ticketId, content, source, isSampleLeak ? 1 : 0, importBatch, createdAt.toISOString());
  return id;
}

function insertAuditLog(
  ticketId: string,
  version: number,
  action: string,
  operator: string,
  detail: string,
  createdAt: Date
): string {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, ticket_id, version, action, operator, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, ticketId, version, action, operator, detail, createdAt.toISOString());
  return id;
}
