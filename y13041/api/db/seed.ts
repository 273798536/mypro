import type Database from 'better-sqlite3'

function shouldSeed(db: Database.Database): boolean {
  const row = db.prepare('SELECT COUNT(*) AS count FROM playback').get() as { count: number }
  return row.count === 0
}

export function seedDatabase(db: Database.Database): void {
  if (!shouldSeed(db)) {
    return
  }

  const insertPlayback = db.prepare(`
    INSERT INTO playback (id, enterprise_name, batch_no, run_count, status, conclusion, conclusion_reason, last_operator, last_updated_at, created_at)
    VALUES (@id, @enterprise_name, @batch_no, @run_count, @status, @conclusion, @conclusion_reason, @last_operator, @last_updated_at, @created_at)
  `)

  const insertEmail = db.prepare(`
    INSERT INTO approval_email (id, playback_id, sent_at, approver_name, approver_name_original, subject, content, is_anomaly, anomaly_note)
    VALUES (@id, @playback_id, @sent_at, @approver_name, @approver_name_original, @subject, @content, @is_anomaly, @anomaly_note)
  `)

  const insertNormalRecord = db.prepare(`
    INSERT INTO normal_payment_record (id, playback_id, enterprise_name, payment_month, amount, paid_at)
    VALUES (@id, @playback_id, @enterprise_name, @payment_month, @amount, @paid_at)
  `)

  const insertNote = db.prepare(`
    INSERT INTO note (id, playback_id, content, operator_name, created_at)
    VALUES (@id, @playback_id, @content, @operator_name, @created_at)
  `)

  const insertHistory = db.prepare(`
    INSERT INTO history_record (id, playback_id, action_type, operator_name, created_at, field_changes_json)
    VALUES (@id, @playback_id, @action_type, @operator_name, @created_at, @field_changes_json)
  `)

  const seedTx = db.transaction(() => {
    const playbackAId = 'playback-a-001'
    insertPlayback.run({
      id: playbackAId,
      enterprise_name: '华东机械厂',
      batch_no: 'BJ20260601',
      run_count: 1,
      status: 'pending',
      conclusion: 'pending_review',
      conclusion_reason: null,
      last_operator: '系统',
      last_updated_at: '2026-06-01T10:30:00Z',
      created_at: '2026-06-01T10:30:00Z',
    })

    insertEmail.run({
      id: 'email-a-1',
      playback_id: playbackAId,
      sent_at: '2026-06-01T09:00:00Z',
      approver_name: '李晓明',
      approver_name_original: null,
      subject: '【审批】华东机械厂2026年5月企业年金缴费计划',
      content: '尊敬的领导：\n\n现提交华东机械厂2026年5月企业年金缴费计划，请审批。\n\n缴费明细：\n- 企业缴费：¥250,000.00\n- 个人缴费：¥150,000.00\n- 合计：¥400,000.00\n\n此致\n敬礼',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertEmail.run({
      id: 'email-a-2',
      playback_id: playbackAId,
      sent_at: '2026-06-01T09:15:00Z',
      approver_name: '王建国（高级经理）',
      approver_name_original: '王建国',
      subject: '【审批通过】华东机械厂2026年5月企业年金缴费计划',
      content: '同意，按计划执行。\n\n王建国（高级经理）\n人力资源部',
      is_anomaly: 1,
      anomaly_note: '审批人签名与备案姓名不一致：备案为"王建国"，邮件显示为"王建国（高级经理）"，需核实是否为同一人。',
    })

    insertEmail.run({
      id: 'email-a-3',
      playback_id: playbackAId,
      sent_at: '2026-06-01T09:30:00Z',
      approver_name: '张伟',
      approver_name_original: null,
      subject: '【确认】华东机械厂2026年5月企业年金缴费计划',
      content: '已收到审批材料，财务部门将按计划安排付款。',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertHistory.run({
      id: 'history-a-1',
      playback_id: playbackAId,
      action_type: 'create',
      operator_name: '系统',
      created_at: '2026-06-01T10:30:00Z',
      field_changes_json: JSON.stringify([
        { field: 'enterprise_name', oldValue: null, newValue: '华东机械厂' },
        { field: 'batch_no', oldValue: null, newValue: 'BJ20260601' },
        { field: 'status', oldValue: null, newValue: 'pending' },
        { field: 'conclusion', oldValue: null, newValue: 'pending_review' },
      ]),
    })

    insertHistory.run({
      id: 'history-a-2',
      playback_id: playbackAId,
      action_type: 'run_batch',
      operator_name: '系统',
      created_at: '2026-06-01T10:31:00Z',
      field_changes_json: JSON.stringify([
        { field: 'run_count', oldValue: '0', newValue: '1' },
      ]),
    })

    insertNormalRecord.run({
      id: 'normal-a-1',
      playback_id: playbackAId,
      enterprise_name: '华东机械厂',
      payment_month: '2026-04',
      amount: 400000.0,
      paid_at: '2026-04-28T10:00:00Z',
    })

    insertNormalRecord.run({
      id: 'normal-a-2',
      playback_id: playbackAId,
      enterprise_name: '华东机械厂',
      payment_month: '2026-03',
      amount: 400000.0,
      paid_at: '2026-03-31T09:30:00Z',
    })

    const playbackBId = 'playback-b-002'
    insertPlayback.run({
      id: playbackBId,
      enterprise_name: '南海物流集团',
      batch_no: 'GZ20260602',
      run_count: 2,
      status: 'rejudged',
      conclusion: 'normal',
      conclusion_reason: '经核实，重复跑批是系统重试导致，缴费材料完整有效，改判为正常。',
      last_operator: '赵明',
      last_updated_at: '2026-06-03T14:20:00Z',
      created_at: '2026-06-02T08:00:00Z',
    })

    insertEmail.run({
      id: 'email-b-1',
      playback_id: playbackBId,
      sent_at: '2026-06-02T07:30:00Z',
      approver_name: '陈淑芬',
      approver_name_original: null,
      subject: '【审批】南海物流集团2026年5月企业年金缴费计划',
      content: '现提交南海物流集团2026年5月企业年金缴费计划，请审批。\n\n本月缴费人员：1,250人\n企业缴费：¥875,000.00\n个人缴费：¥525,000.00\n合计：¥1,400,000.00',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertEmail.run({
      id: 'email-b-2',
      playback_id: playbackBId,
      sent_at: '2026-06-02T07:45:00Z',
      approver_name: '黄志强',
      approver_name_original: null,
      subject: '【审批通过】南海物流集团2026年5月企业年金缴费计划',
      content: '同意。请财务部门按时执行缴费。',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertEmail.run({
      id: 'email-b-3',
      playback_id: playbackBId,
      sent_at: '2026-06-02T07:50:00Z',
      approver_name: '林美玲',
      approver_name_original: null,
      subject: '【复核】南海物流集团2026年5月企业年金缴费计划',
      content: '复核通过，人员名单与上月变动一致。',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertEmail.run({
      id: 'email-b-4',
      playback_id: playbackBId,
      sent_at: '2026-06-02T07:55:00Z',
      approver_name: '刘大海',
      approver_name_original: null,
      subject: '【确认】南海物流集团2026年5月企业年金缴费计划',
      content: '财务部确认收到全部审批材料，准备执行付款。',
      is_anomaly: 0,
      anomaly_note: null,
    })

    insertNormalRecord.run({
      id: 'normal-b-1',
      playback_id: playbackBId,
      enterprise_name: '南海物流集团',
      payment_month: '2026-04',
      amount: 1400000.0,
      paid_at: '2026-04-30T15:00:00Z',
    })

    insertNote.run({
      id: 'note-b-1',
      playback_id: playbackBId,
      content: '该批次首次跑批时系统超时自动重试，导致同一批次被解析两次。已对比两次跑批结果，审批邮件、缴费明细完全一致，无实质差异。建议后续优化幂等机制，避免重复入库。',
      operator_name: '赵明',
      created_at: '2026-06-03T14:00:00Z',
    })

    insertHistory.run({
      id: 'history-b-1',
      playback_id: playbackBId,
      action_type: 'create',
      operator_name: '系统',
      created_at: '2026-06-02T08:00:00Z',
      field_changes_json: JSON.stringify([
        { field: 'enterprise_name', oldValue: null, newValue: '南海物流集团' },
        { field: 'batch_no', oldValue: null, newValue: 'GZ20260602' },
        { field: 'status', oldValue: null, newValue: 'pending' },
        { field: 'conclusion', oldValue: null, newValue: 'pending_review' },
      ]),
    })

    insertHistory.run({
      id: 'history-b-2',
      playback_id: playbackBId,
      action_type: 'run_batch',
      operator_name: '系统',
      created_at: '2026-06-02T08:01:00Z',
      field_changes_json: JSON.stringify([
        { field: 'run_count', oldValue: '0', newValue: '1' },
      ]),
    })

    insertHistory.run({
      id: 'history-b-3',
      playback_id: playbackBId,
      action_type: 'run_batch',
      operator_name: '系统',
      created_at: '2026-06-02T08:05:00Z',
      field_changes_json: JSON.stringify([
        { field: 'run_count', oldValue: '1', newValue: '2' },
      ]),
    })

    insertHistory.run({
      id: 'history-b-4',
      playback_id: playbackBId,
      action_type: 'add_note',
      operator_name: '赵明',
      created_at: '2026-06-03T14:00:00Z',
      field_changes_json: JSON.stringify([
        { field: 'note', oldValue: null, newValue: '该批次首次跑批时系统超时自动重试...' },
      ]),
    })

    insertHistory.run({
      id: 'history-b-5',
      playback_id: playbackBId,
      action_type: 'rejudge',
      operator_name: '赵明',
      created_at: '2026-06-03T14:20:00Z',
      field_changes_json: JSON.stringify([
        { field: 'status', oldValue: 'pending', newValue: 'rejudged' },
        { field: 'conclusion', oldValue: 'pending_review', newValue: 'normal' },
        { field: 'conclusion_reason', oldValue: null, newValue: '经核实，重复跑批是系统重试导致，缴费材料完整有效，改判为正常。' },
      ]),
    })
  })

  seedTx()
}
