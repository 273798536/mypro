const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const db = require('../config/database');
const { SENSITIVE_FIELDS, ROLES } = require('../config/constants');

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

const maskSensitiveData = (data, role) => {
  if (role === ROLES.ADMIN || role === ROLES.AUDITOR) {
    return data;
  }

  const maskValue = (value) => {
    if (!value) return value;
    const str = String(value);
    if (str.length <= 4) return '****';
    return str.substring(0, 2) + '****' + str.substring(str.length - 2);
  };

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, role));
  }

  const result = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (result[field]) {
      result[field] = maskValue(result[field]);
    }
  });

  return result;
};

const filterByRole = (data, recordType, role) => {
  if (role === ROLES.ADMIN || role === ROLES.AUDITOR) {
    return data;
  }

  const filtered = { ...data };
  
  if (role === ROLES.VIEWER) {
    delete filtered.raw_data;
    delete filtered.source_row_number;
  }

  return filtered;
};

const createExportTask = async (taskName, exportType, requestedBy, filters = {}, includeSensitive = false) => {
  const stmt = `
    INSERT INTO export_tasks (
      task_name, export_type, requested_by, filters, include_sensitive, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;
  
  const result = await runQuery(stmt, [
    taskName,
    exportType,
    requestedBy,
    JSON.stringify(filters),
    includeSensitive ? 1 : 0
  ]);

  return result.lastID;
};

const freezeBeforeExport = async (exportType, operator, operatorRole) => {
  const tables = {
    borrow_records: 'borrow_record',
    material_lists: 'material_list',
    logistics_receipts: 'logistics_receipt',
    shift_records: 'shift_record',
    price_adjustments: 'price_adjustment'
  };

  const results = [];
  
  for (const [table, recordType] of Object.entries(tables)) {
    const updateStmt = `
      UPDATE ${table}
      SET workflow_state = 'frozen', updated_at = CURRENT_TIMESTAMP
      WHERE workflow_state IN ('draft', 'submitted', 'rejected', 'confirmed')
    `;
    const result = await runQuery(updateStmt);
    results.push({ table, frozen: result.changes });
  }

  return results;
};

const exportLostItemsReport = async (exportTaskId, role, includeSensitive = false) => {
  const getTaskStmt = `SELECT * FROM export_tasks WHERE id = ?`;
  const task = await getQuery(getTaskStmt, [exportTaskId]);

  if (!task) {
    throw new Error('导出任务不存在');
  }

  await runQuery(`UPDATE export_tasks SET status = 'processing' WHERE id = ?`, [exportTaskId]);

  try {
    const filters = JSON.parse(task.filters || '{}');
    
    let query = `
      SELECT 
        br.id, br.borrow_no, br.material_code, br.material_name,
        br.borrower_name, br.borrower_phone, br.borrower_department,
        br.borrow_date, br.location, br.shift_info, br.status,
        br.responsible_person,
        ml.category, ml.estimated_value,
        s.source_file_name
      FROM borrow_records br
      LEFT JOIN material_lists ml ON br.material_code = ml.material_code
      LEFT JOIN import_sources s ON br.source_id = s.id
      WHERE br.status IN ('lost', 'investigating', 'resolved')
    `;
    
    const params = [];
    
    if (filters.department) {
      query += ' AND br.borrower_department = ?';
      params.push(filters.department);
    }

    query += ' ORDER BY br.borrow_date DESC';

    let records = await allQuery(query, params);

    const canAccessSensitive = [ROLES.ADMIN, ROLES.AUDITOR].includes(role);
    const shouldMask = !canAccessSensitive || !includeSensitive;
    
    if (shouldMask) {
      records = records.map(r => maskSensitiveData(r, role));
    }

    records = records.map(r => filterByRole(r, 'borrow_record', role));

    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `lost-items-report-${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    const fields = [
      'id', 'borrow_no', 'material_code', 'material_name',
      'borrower_name', 'borrower_phone', 'borrower_department',
      'borrow_date', 'location', 'shift_info', 'status',
      'responsible_person', 'category', 'estimated_value',
      'source_file_name'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(records);

    fs.writeFileSync(filePath, csv, 'utf8');

    const completeStmt = `
      UPDATE export_tasks 
      SET status = 'completed', file_path = ?, completed_at = CURRENT_TIMESTAMP, frozen_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await runQuery(completeStmt, [filePath, exportTaskId]);

    return {
      success: true,
      filePath,
      fileName,
      recordCount: records.length,
      sensitive_included: !shouldMask
    };
  } catch (error) {
    await runQuery(`UPDATE export_tasks SET status = 'failed' WHERE id = ?`, [exportTaskId]);
    throw error;
  }
};

const getRoleViewData = async (role, department = null) => {
  const views = {
    [ROLES.ADMIN]: () => getAdminView(),
    [ROLES.OPERATOR]: () => getOperatorView(department),
    [ROLES.AUDITOR]: () => getAuditorView(),
    [ROLES.VIEWER]: () => getViewerView()
  };

  const viewFn = views[role] || views[ROLES.VIEWER];
  const data = await viewFn();
  return maskSensitiveData(data, role);
};

const getAdminView = async () => {
  const statsStmt = `
    SELECT
      (SELECT COUNT(*) FROM borrow_records WHERE status = 'lost') as lost_count,
      (SELECT COUNT(*) FROM borrow_records WHERE status = 'investigating') as investigating_count,
      (SELECT COUNT(*) FROM borrow_records WHERE status = 'resolved') as resolved_count,
      (SELECT COUNT(*) FROM material_lists) as total_materials,
      (SELECT COUNT(*) FROM import_sources) as total_imports
  `;

  const deptStmt = `
    SELECT borrower_department, status, COUNT(*) as count
    FROM borrow_records
    WHERE status IN ('lost', 'investigating')
    GROUP BY borrower_department, status
  `;

  const auditStmt = `
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20
  `;

  const [stats, deptData, audits] = await Promise.all([
    getQuery(statsStmt),
    allQuery(deptStmt),
    allQuery(auditStmt)
  ]);

  return {
    statistics: stats,
    by_department: deptData,
    recent_audits: audits
  };
};

const getOperatorView = async (department) => {
  let deptCondition = '';
  let params = [];
  if (department) {
    deptCondition = `AND borrower_department = ?`;
    params = [department];
  }

  const myRecordsStmt = `
    SELECT * FROM borrow_records
    WHERE status IN ('lost', 'investigating') ${deptCondition}
    ORDER BY borrow_date DESC
    LIMIT 50
  `;

  const pendingStmt = `
    SELECT * FROM borrow_records
    WHERE workflow_state = 'submitted'
    ${deptCondition}
  `;

  const [myRecords, pending] = await Promise.all([
    allQuery(myRecordsStmt, params),
    allQuery(pendingStmt, params)
  ]);

  return {
    my_department_records: myRecords,
    pending_workflow: pending
  };
};

const getAuditorView = async () => {
  const pendingStmt = `
    SELECT br.*, ml.estimated_value
    FROM borrow_records br
    LEFT JOIN material_lists ml ON br.material_code = ml.material_code
    WHERE br.workflow_state = 'submitted'
    ORDER BY br.updated_at DESC
  `;

  const changesStmt = `
    SELECT al.*, br.material_name, br.borrower_name
    FROM audit_logs al
    LEFT JOIN borrow_records br ON al.record_id = br.id AND al.record_type = 'borrow_record'
    ORDER BY al.created_at DESC
    LIMIT 50
  `;

  const [pending, changes] = await Promise.all([
    allQuery(pendingStmt),
    allQuery(changesStmt)
  ]);

  return {
    pending_approval: pending,
    recent_changes: changes
  };
};

const getViewerView = async () => {
  const statsStmt = `
    SELECT
      status,
      COUNT(*) as count
    FROM borrow_records
    WHERE status IN ('lost', 'investigating', 'resolved')
    GROUP BY status
  `;

  const publicStmt = `
    SELECT id, borrow_no, material_name, borrower_department, status, responsible_person
    FROM borrow_records
    WHERE status IN ('lost', 'investigating', 'resolved')
    ORDER BY borrow_date DESC
    LIMIT 100
  `;

  const [statistics, public_records] = await Promise.all([
    allQuery(statsStmt),
    allQuery(publicStmt)
  ]);

  return {
    summary_statistics: statistics,
    public_records
  };
};

module.exports = {
  maskSensitiveData,
  filterByRole,
  createExportTask,
  freezeBeforeExport,
  exportLostItemsReport,
  getRoleViewData,
  getAdminView,
  getOperatorView,
  getAuditorView,
  getViewerView
};
