const { run, get, all, runTransaction, saveVersionHistory } = require('../utils/db-helper');
const moment = require('moment');

function updateInvestorShares(contractId, sharesData, options = {}) {
  const { changed_by = 'system', change_reason = '' } = options;

  return runTransaction(() => {
    const currentShares = all(
      `SELECT * FROM investor_shares WHERE contract_id = ?`,
      [contractId]
    );

    const currentMap = {};
    currentShares.forEach(s => {
      if (!currentMap[s.investor_id] || s.version > currentMap[s.investor_id].version) {
        currentMap[s.investor_id] = s;
      }
    });

    const results = [];

    sharesData.forEach(share => {
      const current = currentMap[share.investor_id];
      const newVersion = current ? current.version + 1 : 1;

      const result = run(
        `INSERT INTO investor_shares (
          contract_id, investor_id, investor_name, investment_amount,
          share_ratio, version, parent_id, changed_by, change_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contractId,
          share.investor_id,
          share.investor_name,
          share.investment_amount,
          share.share_ratio || 0,
          newVersion,
          current?.id || null,
          changed_by,
          change_reason
        ]
      );

      if (current) {
        ['investment_amount', 'share_ratio'].forEach(field => {
          const oldVal = current[field];
          const newVal = share[field] || 0;
          if (oldVal !== newVal) {
            saveVersionHistory(
              'investor_shares',
              result.lastInsertRowid,
              field,
              oldVal,
              newVal,
              changed_by,
              change_reason
            );
          }
        });
      }

      results.push({
        id: result.lastInsertRowid,
        investor_id: share.investor_id,
        version: newVersion,
        parent_id: current?.id || null
      });
    });

    return {
      message: `已更新 ${sharesData.length} 条投资人份额记录`,
      records: results
    };
  });
}

function updateRevenueInstallment(installmentId, updateData, options = {}) {
  const { changed_by = 'system', change_reason = '' } = options;

  return runTransaction(() => {
    const current = get(
      `SELECT * FROM revenue_installments WHERE id = ?`,
      [installmentId]
    );

    if (!current) {
      throw new Error('回款分期记录不存在');
    }

    const result = run(
      `INSERT INTO revenue_installments (
        revenue_plan_id, installment_no, amount, expected_date,
        actual_date, actual_amount, status, parent_id, changed_by, change_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        current.revenue_plan_id,
        updateData.installment_no || current.installment_no,
        updateData.amount !== undefined ? updateData.amount : current.amount,
        updateData.expected_date || current.expected_date,
        updateData.actual_date || current.actual_date,
        updateData.actual_amount !== undefined ? updateData.actual_amount : current.actual_amount,
        updateData.status || current.status,
        current.id,
        changed_by,
        change_reason
      ]
    );

    const newId = result.lastInsertRowid;

    ['amount', 'expected_date', 'actual_amount', 'actual_date', 'installment_no', 'status'].forEach(field => {
      const oldVal = current[field];
      const newVal = updateData[field] !== undefined ? updateData[field] : oldVal;
      if (oldVal !== newVal) {
        saveVersionHistory(
          'revenue_installments',
          newId,
          field,
          oldVal,
          newVal,
          changed_by,
          change_reason
        );
      }
    });

    return {
      id: newId,
      parent_id: current.id,
      message: '回款分期记录已更新，旧版本已保留'
    };
  });
}

function updateCostItem(costId, updateData, options = {}) {
  const { changed_by = 'system', change_reason = '' } = options;

  return runTransaction(() => {
    const current = get(
      `SELECT * FROM cost_items WHERE id = ?`,
      [costId]
    );

    if (!current) {
      throw new Error('成本记录不存在');
    }

    const result = run(
      `INSERT INTO cost_items (
        project_id, cost_type, amount, cost_date, description,
        is_deductible, parent_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        current.project_id,
        updateData.cost_type || current.cost_type,
        updateData.amount !== undefined ? updateData.amount : current.amount,
        updateData.cost_date || current.cost_date,
        updateData.description || current.description,
        updateData.is_deductible !== undefined ? updateData.is_deductible : current.is_deductible,
        current.id,
        changed_by
      ]
    );

    const newId = result.lastInsertRowid;

    ['cost_type', 'amount', 'cost_date', 'description', 'is_deductible'].forEach(field => {
      const oldVal = current[field];
      const newVal = updateData[field] !== undefined ? updateData[field] : oldVal;
      if (oldVal !== newVal) {
        saveVersionHistory(
          'cost_items',
          newId,
          field,
          oldVal,
          newVal,
          changed_by,
          change_reason
        );
      }
    });

    return {
      id: newId,
      parent_id: current.id,
      message: '成本记录已更新，旧版本已保留'
    };
  });
}

function getVersionHistory(tableName, recordId = null) {
  let sql = `SELECT * FROM version_history WHERE table_name = ?`;
  const params = [tableName];

  if (recordId !== null) {
    sql += ` AND record_id = ?`;
    params.push(recordId);
  }

  sql += ` ORDER BY created_at DESC`;

  return all(sql, params);
}

function getRecordVersionChain(tableName, recordId) {
  const chain = [];
  let currentId = recordId;

  while (currentId) {
    const record = get(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [currentId]
    );

    if (!record) break;

    chain.push(record);
    currentId = record.parent_id;
  }

  return chain;
}

function getShareVersionHistory(contractId) {
  const versions = all(
    `SELECT s.*, i.name as investor_name,
            vh.field_name, vh.old_value, vh.new_value,
            vh.changed_by, vh.change_reason, vh.created_at as change_time
     FROM investor_shares s
     JOIN investors i ON s.investor_id = i.id
     LEFT JOIN version_history vh ON vh.table_name = 'investor_shares' AND vh.record_id = s.id
     WHERE s.contract_id = ?
     ORDER BY s.investor_id, s.version DESC, vh.created_at DESC`,
    [contractId]
  );

  const grouped = {};
  versions.forEach(v => {
    const key = `${v.investor_id}_v${v.version}`;
    if (!grouped[key]) {
      grouped[key] = {
        id: v.id,
        investor_id: v.investor_id,
        investor_name: v.investor_name,
        investment_amount: v.investment_amount,
        share_ratio: v.share_ratio,
        version: v.version,
        parent_id: v.parent_id,
        changed_by: v.changed_by,
        change_reason: v.change_reason,
        created_at: v.created_at,
        changes: []
      };
    }
    if (v.field_name) {
      grouped[key].changes.push({
        field_name: v.field_name,
        old_value: v.old_value,
        new_value: v.new_value,
        changed_by: v.changed_by,
        change_reason: v.change_reason,
        change_time: v.change_time
      });
    }
  });

  return Object.values(grouped);
}

module.exports = {
  updateInvestorShares,
  updateRevenueInstallment,
  updateCostItem,
  getVersionHistory,
  getRecordVersionChain,
  getShareVersionHistory
};
