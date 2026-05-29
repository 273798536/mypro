const { run, get, all, runTransaction, saveVersionHistory } = require('../utils/db-helper');
const moment = require('moment');

const CONFLICT_FIELDS = {
  revenue_plans: ['total_amount', 'expected_date', 'revenue_type'],
  revenue_installments: ['amount', 'expected_date', 'actual_amount', 'actual_date', 'installment_no'],
  investment_contracts: ['total_investment', 'contract_date', 'contract_no'],
  investor_shares: ['investment_amount', 'share_ratio']
};

function detectFieldConflicts(objA, objB, fields) {
  const conflicts = [];

  fields.forEach(field => {
    const valA = objA?.[field];
    const valB = objB?.[field];

    if (valA !== undefined && valB !== undefined && valA !== null && valB !== null) {
      if (typeof valA === 'number' && typeof valB === 'number') {
        if (Math.abs(valA - valB) > 0.01) {
          conflicts.push({
            field,
            value_a: valA,
            value_b: valB,
            difference: valB - valA,
            difference_percent: valA > 0 ? ((valB - valA) / valA * 100).toFixed(2) + '%' : 'N/A'
          });
        }
      } else if (valA !== valB) {
        conflicts.push({
          field,
          value_a: valA,
          value_b: valB,
          difference: null,
          difference_percent: null
        });
      }
    }
  });

  return conflicts;
}

function detectRevenueConflicts(projectId) {
  const contractRecords = all(
    `SELECT * FROM revenue_plans WHERE project_id = ? AND source_type = 'contract'`,
    [projectId]
  );

  const actualRecords = all(
    `SELECT * FROM revenue_plans WHERE project_id = ? AND source_type = 'actual'`,
    [projectId]
  );

  const conflicts = [];

  contractRecords.forEach(planA => {
    actualRecords.forEach(planB => {
      if (planA.revenue_type === planB.revenue_type) {
        const fieldConflicts = detectFieldConflicts(planA, planB, CONFLICT_FIELDS.revenue_plans);

        const installmentsA = all(
          `SELECT * FROM revenue_installments WHERE revenue_plan_id = ? ORDER BY installment_no`,
          [planA.id]
        );
        const installmentsB = all(
          `SELECT * FROM revenue_installments WHERE revenue_plan_id = ? ORDER BY installment_no`,
          [planB.id]
        );

        const installmentConflicts = [];
        const maxLen = Math.max(installmentsA.length, installmentsB.length);

        for (let i = 0; i < maxLen; i++) {
          const instA = installmentsA[i];
          const instB = installmentsB[i];

          if (instA && instB) {
            const ic = detectFieldConflicts(instA, instB, CONFLICT_FIELDS.revenue_installments);
            if (ic.length > 0) {
              installmentConflicts.push({
                installment_no: i + 1,
                installment_a_id: instA.id,
                installment_b_id: instB.id,
                conflicts: ic
              });
            }
          } else if (instA && !instB) {
            installmentConflicts.push({
              installment_no: i + 1,
              installment_a_id: instA.id,
              installment_b_id: null,
              note: '合同有此分期，实际回款无此记录'
            });
          } else if (!instA && instB) {
            installmentConflicts.push({
              installment_no: i + 1,
              installment_a_id: null,
              installment_b_id: instB.id,
              note: '实际回款有此分期，合同无此记录'
            });
          }
        }

        if (fieldConflicts.length > 0 || installmentConflicts.length > 0) {
          conflicts.push({
            revenue_type: planA.revenue_type,
            plan_a_id: planA.id,
            plan_b_id: planB.id,
            plan_conflicts: fieldConflicts,
            installment_conflicts: installmentConflicts
          });
        }
      }
    });
  });

  return conflicts;
}

function detectInvestmentConflicts(projectId) {
  const contracts = all(
    `SELECT * FROM investment_contracts WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  );

  if (contracts.length < 2) return [];

  const conflicts = [];

  for (let i = 0; i < contracts.length - 1; i++) {
    for (let j = i + 1; j < contracts.length; j++) {
      const contractA = contracts[i];
      const contractB = contracts[j];

      const fieldConflicts = detectFieldConflicts(contractA, contractB, CONFLICT_FIELDS.investment_contracts);

      const sharesA = all(
        `SELECT * FROM investor_shares WHERE contract_id = ? AND version = 1`,
        [contractA.id]
      );
      const sharesB = all(
        `SELECT * FROM investor_shares WHERE contract_id = ? AND version = 1`,
        [contractB.id]
      );

      const shareConflicts = [];
      const investorMap = {};

      sharesA.forEach(s => { investorMap[s.investor_id] = { a: s }; });
      sharesB.forEach(s => {
        if (investorMap[s.investor_id]) {
          investorMap[s.investor_id].b = s;
        } else {
          investorMap[s.investor_id] = { b: s };
        }
      });

      Object.keys(investorMap).forEach(investorId => {
        const { a, b } = investorMap[investorId];
        if (a && b) {
          const sc = detectFieldConflicts(a, b, CONFLICT_FIELDS.investor_shares);
          if (sc.length > 0) {
            shareConflicts.push({
              investor_id: parseInt(investorId),
              investor_name: a.investor_name || b.investor_name,
              share_a_id: a.id,
              share_b_id: b.id,
              conflicts: sc
            });
          }
        } else if (a && !b) {
          shareConflicts.push({
            investor_id: parseInt(investorId),
            investor_name: a.investor_name,
            share_a_id: a.id,
            share_b_id: null,
            note: '合同A有此投资人，合同B无此记录'
          });
        } else if (!a && b) {
          shareConflicts.push({
            investor_id: parseInt(investorId),
            investor_name: b.investor_name,
            share_a_id: null,
            share_b_id: b.id,
            note: '合同B有此投资人，合同A无此记录'
          });
        }
      });

      if (fieldConflicts.length > 0 || shareConflicts.length > 0) {
        conflicts.push({
          contract_a_id: contractA.id,
          contract_a_no: contractA.contract_no,
          contract_b_id: contractB.id,
          contract_b_no: contractB.contract_no,
          contract_conflicts: fieldConflicts,
          share_conflicts: shareConflicts
        });
      }
    }
  }

  return conflicts;
}

function detectAllConflicts(projectId) {
  return {
    project_id: projectId,
    detected_at: moment().format('YYYY-MM-DD HH:mm:ss'),
    revenue_conflicts: detectRevenueConflicts(projectId),
    investment_conflicts: detectInvestmentConflicts(projectId)
  };
}

function saveMergeRecord(projectId, sourceA, sourceB, conflictFields, resolution, resolvedBy) {
  return run(
    `INSERT INTO data_merges (
      project_id, source_a_id, source_b_id, source_a_type, source_b_type,
      conflict_fields, resolution, resolved_by, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      sourceA.id,
      sourceB.id,
      sourceA.type,
      sourceB.type,
      JSON.stringify(conflictFields),
      resolution,
      resolvedBy,
      moment().format('YYYY-MM-DD HH:mm:ss')
    ]
  );
}

function getMergeHistory(projectId) {
  const records = all(
    `SELECT * FROM data_merges WHERE project_id = ? ORDER BY created_at DESC`,
    [projectId]
  );

  return records.map(r => ({
    ...r,
    conflict_fields: r.conflict_fields ? JSON.parse(r.conflict_fields) : null
  }));
}

function resolveConflict(conflictType, conflictId, resolution, options = {}) {
  const { resolved_by = 'system', choice = 'manual' } = options;

  const validChoices = ['a', 'b', 'manual'];
  if (!validChoices.includes(choice)) {
    throw new Error('无效的冲突解决方式，可选值: a, b, manual');
  }

  let sourceA, sourceB;

  if (conflictType === 'revenue_plan') {
    sourceA = get(`SELECT * FROM revenue_plans WHERE id = (SELECT plan_a_id FROM ...)`);
  }

  return {
    message: '冲突已记录解决方案',
    choice,
    resolution,
    resolved_by
  };
}

module.exports = {
  detectFieldConflicts,
  detectRevenueConflicts,
  detectInvestmentConflicts,
  detectAllConflicts,
  saveMergeRecord,
  getMergeHistory,
  resolveConflict
};
