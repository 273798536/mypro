const db = require('../config/database');
const auditService = require('./auditService');
const { BORROW_STATUS } = require('../config/constants');

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const buildInvestigationChain = async (borrowRecordId) => {
  const borrowStmt = `
    SELECT br.*,
           ml.material_name, ml.category, ml.specifications, ml.estimated_value,
           lr.receiver_name as logistics_receiver, lr.receive_date as logistics_date
    FROM borrow_records br
    LEFT JOIN material_lists ml ON br.material_code = ml.material_code
    LEFT JOIN logistics_receipts lr ON br.material_code = lr.material_code
    WHERE br.id = ?
  `;
  
  const borrowRecord = await getQuery(borrowStmt, [borrowRecordId]);
  if (!borrowRecord) {
    throw new Error('借用记录不存在');
  }

  const chain = [];
  let sequence = 1;

  chain.push({
    sequence_no: sequence++,
    stage: '物料入库',
    handler: borrowRecord.logistics_receiver || '未知',
    action: '物流签收',
    evidence: borrowRecord.logistics_date ? `签收日期: ${borrowRecord.logistics_date}` : '无物流记录',
    timestamp: borrowRecord.logistics_date || null
  });

  const borrowDate = borrowRecord.borrow_date ? borrowRecord.borrow_date.split(' ')[0] : null;
  const shiftInfo = borrowRecord.shift_info || null;
  
  let shiftRecord = null;
  if (borrowDate) {
    const shiftStmt = `
      SELECT * FROM shift_records 
      WHERE shift_date = ? 
      ORDER BY shift_date DESC
      LIMIT 1
    `;
    shiftRecord = await getQuery(shiftStmt, [borrowDate]);
    
    if (shiftRecord) {
      chain.push({
        sequence_no: sequence++,
        stage: '班次交接',
        handler: shiftRecord.team_leader || '未知',
        action: `班次: ${shiftRecord.shift_type || shiftInfo || '未知'}`,
        team_members: shiftRecord.team_member || null,
        handover_notes: shiftRecord.handover_notes || null,
        evidence: `班次日期: ${shiftRecord.shift_date}, 班长: ${shiftRecord.team_leader || '未记录'}`,
        timestamp: shiftRecord.shift_date || null
      });
    }
  }

  chain.push({
    sequence_no: sequence++,
    stage: '设备借出',
    handler: borrowRecord.borrower_name,
    handler_contact: borrowRecord.borrower_phone,
    department: borrowRecord.borrower_department,
    action: '现场借用',
    location: borrowRecord.location,
    shift: borrowRecord.shift_info,
    quantity: borrowRecord.borrow_quantity,
    evidence: `借用单号: ${borrowRecord.borrow_no}, 借用时间: ${borrowRecord.borrow_date}`,
    timestamp: borrowRecord.borrow_date
  });

  if (borrowRecord.actual_return_date) {
    chain.push({
      sequence_no: sequence++,
      stage: '设备归还',
      handler: borrowRecord.borrower_name,
      action: '归还设备',
      quantity: borrowRecord.return_quantity,
      evidence: `归还时间: ${borrowRecord.actual_return_date}`,
      timestamp: borrowRecord.actual_return_date
    });
  }

  const manualStmt = `
    SELECT * FROM investigation_chains
    WHERE borrow_record_id = ?
    ORDER BY sequence_no ASC, created_at ASC
  `;
  const manualRecords = await allQuery(manualStmt, [borrowRecordId]);
  
  manualRecords.forEach(record => {
    chain.push({
      sequence_no: sequence++,
      stage: '人工介入',
      handler: record.handler,
      handler_role: record.handler_role,
      action: record.action,
      decision: record.decision,
      evidence: record.evidence,
      change_reason: record.change_reason,
      is_manual: true,
      timestamp: record.created_at
    });
  });

  return {
    borrow_record: borrowRecord,
    shift_record: shiftRecord,
    chain,
    status: borrowRecord.status,
    responsible_person: borrowRecord.responsible_person || determineResponsiblePerson(chain)
  };
};

const determineResponsiblePerson = (chain) => {
  const lastAction = chain[chain.length - 1];
  return lastAction ? lastAction.handler : '未知';
};

const addManualInvestigationStep = async (borrowRecordId, handler, handlerRole, action, decision, evidence, changeReason) => {
  const getMaxSeqStmt = `
    SELECT COALESCE(MAX(sequence_no), 0) as max_seq FROM investigation_chains
    WHERE borrow_record_id = ?
  `;
  const result = await getQuery(getMaxSeqStmt, [borrowRecordId]);
  const nextSeq = result.max_seq + 1;

  const insertStmt = `
    INSERT INTO investigation_chains (
      borrow_record_id, sequence_no, handler, handler_role,
      action, decision, evidence, change_reason, is_manual_adjustment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `;
  
  await runQuery(insertStmt, [borrowRecordId, nextSeq, handler, handlerRole, action, decision, evidence, changeReason]);

  await auditService.logAction('borrow_record', borrowRecordId, 'manual_investigation', {
    operator: handler,
    operatorRole: handlerRole,
    changeReason
  });

  return { success: true, sequence_no: nextSeq };
};

const updateBorrowStatus = async (borrowRecordId, status, responsiblePerson, operator, operatorRole, changeReason) => {
  const getCurrentStmt = `
    SELECT status, responsible_person FROM borrow_records WHERE id = ?
  `;
  const current = await getQuery(getCurrentStmt, [borrowRecordId]);

  const updateStmt = `
    UPDATE borrow_records
    SET status = ?, responsible_person = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  await runQuery(updateStmt, [status, responsiblePerson, borrowRecordId]);

  if (current.status !== status) {
    await auditService.logAction('borrow_record', borrowRecordId, 'status_change', {
      fieldName: 'status',
      oldValue: current.status,
      newValue: status,
      operator,
      operatorRole,
      changeReason
    });
  }

  if (current.responsible_person !== responsiblePerson) {
    await auditService.logAction('borrow_record', borrowRecordId, 'responsibility_change', {
      fieldName: 'responsible_person',
      oldValue: current.responsible_person,
      newValue: responsiblePerson,
      operator,
      operatorRole,
      changeReason
    });
  }

  return { success: true };
};

const getLostItemsInvestigation = async (options = {}) => {
  const { status, department, startDate, endDate } = options;
  
  let query = `
    SELECT br.*, ml.category, ml.estimated_value,
           s.source_file_name, s.uploaded_at as import_time
    FROM borrow_records br
    LEFT JOIN material_lists ml ON br.material_code = ml.material_code
    LEFT JOIN import_sources s ON br.source_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND br.status = ?';
    params.push(status);
  } else {
    query += " AND br.status IN ('lost', 'investigating')";
  }

  if (department) {
    query += ' AND br.borrower_department = ?';
    params.push(department);
  }

  if (startDate) {
    query += ' AND br.borrow_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND br.borrow_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY br.borrow_date DESC';

  const records = await allQuery(query, params);

  const result = [];
  for (const record of records) {
    const chainData = await buildInvestigationChain(record.id);
    result.push({
      ...record,
      investigation_chain: chainData.chain
    });
  }

  return result;
};

const getResponsibilitySummary = async () => {
  const stmt = `
    SELECT 
      responsible_person,
      borrower_department,
      status,
      COUNT(*) as count,
      SUM(ml.estimated_value) as total_value
    FROM borrow_records br
    LEFT JOIN material_lists ml ON br.material_code = ml.material_code
    WHERE br.status IN ('lost', 'investigating', 'resolved')
    GROUP BY responsible_person, borrower_department, status
    ORDER BY total_value DESC
  `;
  
  return await allQuery(stmt);
};

module.exports = {
  buildInvestigationChain,
  addManualInvestigationStep,
  updateBorrowStatus,
  getLostItemsInvestigation,
  getResponsibilitySummary
};
