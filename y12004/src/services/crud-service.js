const { run, get, all, runTransaction } = require('../utils/db-helper');
const moment = require('moment');

const crudService = {
  projects: {
    create(data) {
      const result = run(
        `INSERT INTO projects (name, film_name, total_budget, status, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [data.name, data.film_name, data.total_budget || 0, data.status || 'active', data.created_by || 'system']
      );
      return { id: result.lastInsertRowid, ...data };
    },

    getAll() {
      return all(`SELECT * FROM projects ORDER BY created_at DESC`);
    },

    getById(id) {
      return get(`SELECT * FROM projects WHERE id = ?`, [id]);
    },

    update(id, data) {
      run(
        `UPDATE projects SET name = ?, film_name = ?, total_budget = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [data.name, data.film_name, data.total_budget || 0, data.status || 'active',
         moment().format('YYYY-MM-DD HH:mm:ss'), id]
      );
      return { id, ...data };
    },

    delete(id) {
      run(`DELETE FROM projects WHERE id = ?`, [id]);
      return { id, deleted: true };
    },

    getSummary(id) {
      const project = get(`SELECT * FROM projects WHERE id = ?`, [id]);
      if (!project) return null;

      const contracts = all(`SELECT * FROM investment_contracts WHERE project_id = ?`, [id]);
      const revenuePlans = all(`SELECT * FROM revenue_plans WHERE project_id = ?`, [id]);
      const costs = get(
        `SELECT SUM(amount) as total_costs, SUM(CASE WHEN is_deductible = 1 THEN amount ELSE 0 END) as deductible_costs
         FROM cost_items WHERE project_id = ?`,
        [id]
      );
      const sharing = get(
        `SELECT COUNT(*) as sharing_count,
                SUM(total_revenue) as total_revenue,
                SUM(investor_distributable) as total_investor_distributable
         FROM sharing_records WHERE project_id = ?`,
        [id]
      );

      return {
        ...project,
        contract_count: contracts.length,
        revenue_plan_count: revenuePlans.length,
        total_costs: costs?.total_costs || 0,
        deductible_costs: costs?.deductible_costs || 0,
        sharing_count: sharing?.sharing_count || 0,
        total_revenue: sharing?.total_revenue || 0,
        total_investor_distributable: sharing?.total_investor_distributable || 0
      };
    }
  },

  investors: {
    create(data) {
      const result = run(
        `INSERT INTO investors (name, contact) VALUES (?, ?)`,
        [data.name, data.contact || null]
      );
      return { id: result.lastInsertRowid, ...data };
    },

    getAll() {
      return all(`SELECT * FROM investors ORDER BY name`);
    },

    getById(id) {
      return get(`SELECT * FROM investors WHERE id = ?`, [id]);
    },

    update(id, data) {
      run(
        `UPDATE investors SET name = ?, contact = ?, updated_at = ? WHERE id = ?`,
        [data.name, data.contact || null, moment().format('YYYY-MM-DD HH:mm:ss'), id]
      );
      return { id, ...data };
    },

    delete(id) {
      run(`DELETE FROM investors WHERE id = ?`, [id]);
      return { id, deleted: true };
    }
  },

  investmentContracts: {
    create(data) {
      return runTransaction(() => {
        const result = run(
          `INSERT INTO investment_contracts (
            project_id, contract_no, total_investment, contract_date,
            created_by, source_type, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.project_id,
            data.contract_no,
            data.total_investment || 0,
            data.contract_date || moment().format('YYYY-MM-DD'),
            data.created_by || 'system',
            data.source_type || 'contract',
            data.status || 'active'
          ]
        );

        const contractId = result.lastInsertRowid;

        if (data.investor_shares && data.investor_shares.length > 0) {
          data.investor_shares.forEach(share => {
            run(
              `INSERT INTO investor_shares (
                contract_id, investor_id, investor_name, investment_amount, share_ratio, version
              ) VALUES (?, ?, ?, ?, ?, 1)`,
              [
                contractId,
                share.investor_id,
                share.investor_name,
                share.investment_amount || 0,
                share.share_ratio || 0
              ]
            );
          });
        }

        return {
          id: contractId,
          ...data
        };
      });
    },

    getAll(projectId = null) {
      let sql = `SELECT * FROM investment_contracts`;
      const params = [];
      if (projectId) {
        sql += ` WHERE project_id = ?`;
        params.push(projectId);
      }
      sql += ` ORDER BY created_at DESC`;
      return all(sql, params);
    },

    getById(id) {
      const contract = get(`SELECT * FROM investment_contracts WHERE id = ?`, [id]);
      if (!contract) return null;

      const shares = all(
        `SELECT s.*, i.name as investor_name, i.contact
         FROM investor_shares s
         JOIN investors i ON s.investor_id = i.id
         WHERE s.contract_id = ?
         AND s.version = (SELECT MAX(version) FROM investor_shares WHERE contract_id = s.contract_id AND investor_id = s.investor_id)
         ORDER BY s.investment_amount DESC`,
        [id]
      );

      return { ...contract, investor_shares: shares };
    },

    update(id, data) {
      run(
        `UPDATE investment_contracts SET
           contract_no = ?, total_investment = ?, contract_date = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.contract_no,
          data.total_investment || 0,
          data.contract_date,
          data.status || 'active',
          moment().format('YYYY-MM-DD HH:mm:ss'),
          id
        ]
      );
      return { id, ...data };
    },

    delete(id) {
      runTransaction(() => {
        run(`DELETE FROM investor_shares WHERE contract_id = ?`, [id]);
        run(`DELETE FROM investment_contracts WHERE id = ?`, [id]);
      });
      return { id, deleted: true };
    }
  },

  revenuePlans: {
    create(data) {
      return runTransaction(() => {
        const result = run(
          `INSERT INTO revenue_plans (
            project_id, revenue_type, total_amount, expected_date,
            created_by, source_type, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.project_id,
            data.revenue_type,
            data.total_amount || 0,
            data.expected_date,
            data.created_by || 'system',
            data.source_type || 'plan',
            data.status || 'pending'
          ]
        );

        const planId = result.lastInsertRowid;

        if (data.installments && data.installments.length > 0) {
          data.installments.forEach((inst, idx) => {
            run(
              `INSERT INTO revenue_installments (
                revenue_plan_id, installment_no, amount, expected_date, status
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                planId,
                inst.installment_no || idx + 1,
                inst.amount || 0,
                inst.expected_date,
                inst.status || 'pending'
              ]
            );
          });
        }

        return { id: planId, ...data };
      });
    },

    getAll(projectId = null) {
      let sql = `SELECT * FROM revenue_plans`;
      const params = [];
      if (projectId) {
        sql += ` WHERE project_id = ?`;
        params.push(projectId);
      }
      sql += ` ORDER BY created_at DESC`;
      return all(sql, params);
    },

    getById(id) {
      const plan = get(`SELECT * FROM revenue_plans WHERE id = ?`, [id]);
      if (!plan) return null;

      const installments = all(
        `SELECT * FROM revenue_installments
         WHERE revenue_plan_id = ? AND parent_id IS NULL
         ORDER BY installment_no, created_at DESC`,
        [id]
      );

      return { ...plan, installments };
    },

    update(id, data) {
      run(
        `UPDATE revenue_plans SET
           revenue_type = ?, total_amount = ?, expected_date = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.revenue_type,
          data.total_amount || 0,
          data.expected_date,
          data.status || 'pending',
          moment().format('YYYY-MM-DD HH:mm:ss'),
          id
        ]
      );
      return { id, ...data };
    },

    delete(id) {
      runTransaction(() => {
        run(`DELETE FROM revenue_installments WHERE revenue_plan_id = ?`, [id]);
        run(`DELETE FROM revenue_plans WHERE id = ?`, [id]);
      });
      return { id, deleted: true };
    }
  },

  revenueInstallments: {
    create(data) {
      const result = run(
        `INSERT INTO revenue_installments (
          revenue_plan_id, installment_no, amount, expected_date,
          actual_date, actual_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.revenue_plan_id,
          data.installment_no,
          data.amount || 0,
          data.expected_date,
          data.actual_date || null,
          data.actual_amount || 0,
          data.status || 'pending'
        ]
      );
      return { id: result.lastInsertRowid, ...data };
    },

    getByPlanId(planId) {
      return all(
        `SELECT * FROM revenue_installments WHERE revenue_plan_id = ?
         AND parent_id IS NULL ORDER BY installment_no`,
        [planId]
      );
    },

    getById(id) {
      return get(`SELECT * FROM revenue_installments WHERE id = ?`, [id]);
    },

    recordActual(id, actualData) {
      run(
        `UPDATE revenue_installments SET
           actual_date = ?, actual_amount = ?, status = ?
         WHERE id = ?`,
        [
          actualData.actual_date || moment().format('YYYY-MM-DD'),
          actualData.actual_amount || 0,
          actualData.status || 'received',
          id
        ]
      );
      return { id, ...actualData };
    }
  },

  costItems: {
    create(data) {
      const result = run(
        `INSERT INTO cost_items (
          project_id, cost_type, amount, cost_date, description,
          is_deductible, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.project_id,
          data.cost_type,
          data.amount || 0,
          data.cost_date || moment().format('YYYY-MM-DD'),
          data.description || '',
          data.is_deductible !== undefined ? data.is_deductible : 1,
          data.created_by || 'system'
        ]
      );
      return { id: result.lastInsertRowid, ...data };
    },

    getByProjectId(projectId) {
      return all(
        `SELECT * FROM cost_items WHERE project_id = ? AND parent_id IS NULL ORDER BY cost_date DESC`,
        [projectId]
      );
    },

    getById(id) {
      return get(`SELECT * FROM cost_items WHERE id = ?`, [id]);
    },

    delete(id) {
      run(`DELETE FROM cost_items WHERE id = ?`, [id]);
      return { id, deleted: true };
    }
  }
};

module.exports = crudService;
