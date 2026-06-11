const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const XLSX = require('xlsx');

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function addTimeline(disputeId, eventType, eventText, opts = {}) {
  const stmt = db.prepare(`
    INSERT INTO timeline (id, dispute_id, event_type, event_text, operator, source_type, source_email_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    uuidv4(),
    disputeId || null,
    eventType,
    eventText,
    opts.operator || null,
    opts.sourceType || null,
    opts.sourceEmailId || null,
    now()
  );
}

function getEmailByFileName(fileName) {
  return db.prepare('SELECT * FROM emails WHERE file_name = ?').get(fileName);
}

function getDisputeByCaseNo(caseNo) {
  return db.prepare('SELECT * FROM disputes WHERE case_no = ?').get(caseNo);
}

function createDispute(data, emailId, batchNo) {
  const id = uuidv4();
  const createdAt = now();
  db.prepare(`
    INSERT INTO disputes (
      id, case_no, card_no, txn_date, txn_amount, txn_currency,
      approval_no, merchant, dispute_type, tax_amount, exchange_rate,
      settle_amount, settle_currency, status, source_email_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.caseNo, data.cardNo || null, data.txnDate || null,
    data.txnAmount != null ? data.txnAmount : null, data.txnCurrency || null,
    data.approvalNo || null, data.merchant || null, data.disputeType || null,
    data.taxAmount != null ? data.taxAmount : null, data.exchangeRate != null ? data.exchangeRate : null,
    data.settleAmount != null ? data.settleAmount : null, data.settleCurrency || null,
    data.status || 'pending_materials',
    emailId, createdAt, createdAt
  );

  addTimeline(id, 'import', `通过邮件导入创建案件 [${data.caseNo}]，来源: ${data._emailSubject || '未知邮件'}`, {
    sourceType: 'email',
    sourceEmailId: emailId
  });

  if (data.taxAmount != null || data.exchangeRate != null) {
    const parts = [];
    if (data.taxAmount != null) parts.push(`税费: ${data.taxAmount}`);
    if (data.exchangeRate != null) parts.push(`汇率: ${data.exchangeRate}`);
    addTimeline(id, 'extracted_data', `从邮件提取: ${parts.join(', ')}`, {
      sourceType: 'email',
      sourceEmailId: emailId
    });
  }

  return id;
}

function updateDisputeFromEmail(id, data, emailId, isLateArrival = false) {
  const existing = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  if (!existing) return false;

  const updates = [];
  const params = [];

  const fields = [
    ['card_no', data.cardNo],
    ['txn_date', data.txnDate],
    ['txn_amount', data.txnAmount],
    ['txn_currency', data.txnCurrency],
    ['approval_no', data.approvalNo],
    ['merchant', data.merchant],
    ['dispute_type', data.disputeType],
    ['tax_amount', data.taxAmount],
    ['exchange_rate', data.exchangeRate],
    ['settle_amount', data.settleAmount],
    ['settle_currency', data.settleCurrency]
  ];

  for (const [field, value] of fields) {
    if (value != null && existing[field] == null) {
      updates.push(`${field} = ?`);
      params.push(value);
    }
  }

  let statusChanged = false;
  if (existing.status === 'pending_materials' && data.status === 'processed') {
    updates.push('status = ?');
    params.push('processed');
    statusChanged = true;
  }

  if (updates.length > 0) {
    params.push(now());
    params.push(id);
    db.prepare(`UPDATE disputes SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...params);

    addTimeline(id, isLateArrival ? 'late_attachment' : 'supplement',
      isLateArrival ? `晚到附件补充信息 [${data._emailSubject || '未知'}]` : `补充信息来自 [${data._emailSubject || '未知'}]`,
      { sourceType: 'email', sourceEmailId: emailId }
    );
    return true;
  } else {
    addTimeline(id, 'duplicate_check', `重复导入检测: 案件 [${existing.case_no}] 已存在，跳过覆盖`, {
      sourceType: 'email',
      sourceEmailId: emailId
    });
    return false;
  }
}

function saveAttachment(disputeId, attachment, emailId, batchNo, isLateArrival = false) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO attachments (
      id, dispute_id, file_name, file_type, file_size,
      source_email_id, is_late_arrival, arrival_batch_no, uploaded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, disputeId, attachment.filename || attachment.name || 'unnamed',
    attachment.contentType || attachment.type || null,
    attachment.size || attachment.length || 0,
    emailId, isLateArrival ? 1 : 0,
    batchNo, now()
  );

  if (isLateArrival) {
    addTimeline(disputeId, 'late_attachment',
      `晚到凭证: ${attachment.filename || '未命名文件'}，影响范围: 本争议款税费/汇率核对`,
      { sourceType: 'attachment', sourceEmailId: emailId }
    );
  } else {
    addTimeline(disputeId, 'attachment', `附件: ${attachment.filename || '未命名文件'}`, {
      sourceType: 'attachment', sourceEmailId: emailId
    });
  }

  return id;
}

function saveEmailRecord(emailData, batchNo, fileName) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO emails (id, message_id, subject, sender, recipient, sent_date, raw_body, file_name, import_batch_no, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, emailData.messageId, emailData.subject, emailData.sender, emailData.recipient,
    emailData._emailDate || null, emailData.text ? emailData.text.substring(0, 5000) : null,
    fileName, batchNo, now()
  );
  return id;
}

function createBatch(batchNo) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO import_batches (id, batch_no, email_count, dispute_count, attachment_count, created_at)
    VALUES (?, ?, 0, 0, 0, ?)
  `).run(id, batchNo, now());
  return id;
}

function updateBatchStats(batchNo, stats) {
  db.prepare(`
    UPDATE import_batches SET
      email_count = email_count + ?,
      dispute_count = dispute_count + ?,
      attachment_count = attachment_count + ?
    WHERE batch_no = ?
  `).run(stats.emails || 0, stats.disputes || 0, stats.attachments || 0, batchNo);
}

function getAllDisputes() {
  return db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM attachments a WHERE a.dispute_id = d.id AND a.is_late_arrival = 1) as late_attachment_count,
      (SELECT COUNT(*) FROM attachments a WHERE a.dispute_id = d.id) as attachment_count
    FROM disputes d ORDER BY d.updated_at DESC
  `).all();
}

function getDisputeDetail(id) {
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  if (!dispute) return null;

  const attachments = db.prepare('SELECT * FROM attachments WHERE dispute_id = ? ORDER BY uploaded_at').all(id);
  const timeline = db.prepare(`
    SELECT t.*, e.subject as email_subject
    FROM timeline t
    LEFT JOIN emails e ON t.source_email_id = e.id
    WHERE t.dispute_id = ?
    ORDER BY t.created_at ASC
  `).all(id);

  return { ...dispute, attachments, timeline };
}

function updateRemark(id, remark, operator = '项目经理') {
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  if (!dispute) return null;

  db.prepare('UPDATE disputes SET remark = ?, updated_at = ? WHERE id = ?').run(remark, now(), id);

  addTimeline(id, 'remark_update',
    dispute.remark ? `备注由「${dispute.remark}」改为「${remark}」` : `添加备注: ${remark}`,
    { operator, sourceType: 'manual' }
  );

  return db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
}

function updateStatus(id, status, operator = '项目经理') {
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  if (!dispute) return null;

  const statusText = {
    'pending_materials': '待补材料',
    'processed': '已处理',
    'manual_review': '人工改判'
  }[status] || status;

  const oldStatusText = {
    'pending_materials': '待补材料',
    'processed': '已处理',
    'manual_review': '人工改判'
  }[dispute.status] || dispute.status;

  db.prepare('UPDATE disputes SET status = ?, is_manual_override = 1, updated_at = ? WHERE id = ?').run(status, now(), id);

  addTimeline(id, 'status_change',
    `状态由「${oldStatusText}」改为「${statusText}」(人工改判)`,
    { operator, sourceType: 'manual' }
  );

  return db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
}

function getAllTimeline() {
  return db.prepare(`
    SELECT t.*, d.case_no, d.status as dispute_status,
      e.subject as email_subject
    FROM timeline t
    LEFT JOIN disputes d ON t.dispute_id = d.id
    LEFT JOIN emails e ON t.source_email_id = e.id
    ORDER BY t.created_at DESC
    LIMIT 500
  `).all();
}

function exportToExcel() {
  const disputes = db.prepare(`
    SELECT d.*,
      (SELECT COUNT(*) FROM attachments a WHERE a.dispute_id = d.id AND a.is_late_arrival = 1) as late_attachment_count,
      (SELECT GROUP_CONCAT(a.file_name, '; ') FROM attachments a WHERE a.dispute_id = d.id) as attachment_names
    FROM disputes d ORDER BY d.created_at DESC
  `).all();

  const statusMap = {
    'pending_materials': '待补材料',
    'processed': '已处理',
    'manual_review': '人工改判'
  };

  const rows = disputes.map(d => ({
    '争议款编号': d.case_no,
    '卡号': d.card_no || '',
    '交易日期': d.txn_date || '',
    '交易金额': d.txn_amount || '',
    '交易币种': d.txn_currency || '',
    '授权号': d.approval_no || '',
    '商户名称': d.merchant || '',
    '争议类型': d.dispute_type || '',
    '税费': d.tax_amount != null ? d.tax_amount : '',
    '汇率': d.exchange_rate != null ? d.exchange_rate : '',
    '清算金额': d.settle_amount != null ? d.settle_amount : '',
    '清算币种': d.settle_currency || '',
    '晚到凭证数': d.late_attachment_count || 0,
    '附件列表': d.attachment_names || '',
    '状态': statusMap[d.status] || d.status,
    '备注': d.remark || '',
    '人工改判': d.is_manual_override ? '是' : '否',
    '创建时间': d.created_at,
    '更新时间': d.updated_at
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 12 },
    { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '信用卡争议款对账');

  const tlRows = getAllTimeline().map(t => ({
    '时间': t.created_at,
    '争议款编号': t.case_no || '',
    '案件状态': statusMap[t.dispute_status] || t.dispute_status || '',
    '事件类型': {
      'import': '导入创建',
      'supplement': '信息补充',
      'late_attachment': '晚到凭证',
      'attachment': '附件',
      'remark_update': '备注修改',
      'status_change': '状态变更',
      'duplicate_check': '重复检查',
      'extracted_data': '数据提取'
    }[t.event_type] || t.event_type,
    '事件描述': t.event_text,
    '操作人': t.operator || '',
    '来源': t.source_type === 'email' ? '邮件' : t.source_type === 'attachment' ? '附件' : t.source_type === 'manual' ? '人工' : t.source_type || '',
    '来源邮件': t.email_subject || ''
  }));

  const ws2 = XLSX.utils.json_to_sheet(tlRows);
  ws2['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
    { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '历史时间线');

  return wb;
}

module.exports = {
  now,
  addTimeline,
  getEmailByFileName,
  getDisputeByCaseNo,
  createDispute,
  updateDisputeFromEmail,
  saveAttachment,
  saveEmailRecord,
  createBatch,
  updateBatchStats,
  getAllDisputes,
  getDisputeDetail,
  updateRemark,
  updateStatus,
  getAllTimeline,
  exportToExcel
};
