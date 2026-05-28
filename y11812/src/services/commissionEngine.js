const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CommissionEngine {
  async calculateStoreRent(storeId, period, options = {}) {
    const { contractId, forceRecalculate = false } = options;
    
    const store = await this.getStore(storeId);
    if (!store) {
      return { error: '门店不存在', storeId };
    }

    const contract = await this.getActiveContract(storeId, period, contractId);
    const salesData = await this.getStoreSales(storeId, period);
    
    const validation = this.validateData(store, contract, salesData, period);
    
    const totalSales = salesData.reduce((sum, s) => sum + s.net_amount, 0);
    const totalRefund = salesData.reduce((sum, s) => sum + s.refund_amount, 0);
    const totalActivityDeduction = salesData.reduce((sum, s) => sum + s.activity_deduction, 0);

    let baseRent = 0;
    let commissionAmount = 0;
    let trialCalculation = [];
    let issueType = null;
    let issueDescription = null;
    let correctionHint = null;
    let followUpAction = null;
    let status = 'calculated';

    if (validation.issues.length > 0) {
      const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        status = 'pending_confirmation';
        issueType = criticalIssues[0].type;
        issueDescription = criticalIssues[0].description;
        correctionHint = criticalIssues[0].hint;
        followUpAction = criticalIssues[0].action;
      }
    }

    if (contract) {
      baseRent = contract.base_rent || 0;
      
      const rules = await this.getContractRules(contract.id, period);
      trialCalculation = this.calculateCommissionTiers(totalSales, rules, baseRent);
      
      if (trialCalculation.length > 0) {
        const finalCalc = trialCalculation[trialCalculation.length - 1];
        commissionAmount = finalCalc.commissionAmount;
      }

      if (this.detectGuaranteeSwitch(contract, period)) {
        status = 'pending_confirmation';
        issueType = 'guarantee_switch';
        issueDescription = '本期涉及保底租金调整，需要确认切换生效日期';
        correctionHint = '请核对合同版本中保底租金调整的具体生效日期，确保与实际履行一致';
        followUpAction = '联系门店营运确认合同变更执行情况后人工确认';
      }
    }

    if (totalRefund > 0 || totalActivityDeduction > 0) {
      followUpAction = followUpAction || '需要核对退款追溯和活动扣减的归属期间';
    }

    const totalRent = Math.max(baseRent, baseRent + commissionAmount);

    return {
      id: uuidv4(),
      storeId,
      storeName: store.store_name,
      contractId: contract?.id,
      contractNo: contract?.contract_no,
      contractVersion: contract?.version,
      period,
      baseRent,
      commissionAmount,
      totalRent,
      salesAmount: totalSales,
      refundAdjustment: totalRefund,
      activityAdjustment: totalActivityDeduction,
      status,
      issueType,
      issueDescription,
      correctionHint,
      followUpAction,
      trialCalculation: JSON.stringify(trialCalculation),
      validationIssues: validation.issues,
      missingFields: validation.missingFields
    };
  }

  getStore(storeId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM stores WHERE id = ?', [storeId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getActiveContract(storeId, period, contractId = null) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const periodStart = `${year}-${month}-01`;
      const periodEnd = `${year}-${month}-31`;
      
      let query = `
        SELECT * FROM contracts 
        WHERE store_id = ? 
        AND status = 'active'
        AND effective_date <= ?
        AND (end_date IS NULL OR end_date >= ?)
      `;
      let params = [storeId, periodEnd, periodStart];
      
      if (contractId) {
        query += ' AND id = ?';
        params.push(contractId);
      }
      
      query += ' ORDER BY version DESC LIMIT 1';
      
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getStoreSales(storeId, period) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      db.all(`
        SELECT * FROM sales_data 
        WHERE store_id = ? 
        AND sale_date BETWEEN ? AND ?
      `, [storeId, startDate, endDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getContractRules(contractId, period) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const periodStart = `${year}-${month}-01`;
      const periodEnd = `${year}-${month}-31`;
      
      db.all(`
        SELECT * FROM commission_rules 
        WHERE contract_id = ?
        AND (effective_date IS NULL OR effective_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
        ORDER BY tier_level ASC, threshold ASC
      `, [contractId, periodEnd, periodStart], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  calculateCommissionTiers(totalSales, rules, baseRent) {
    const calculations = [];
    
    if (!rules || rules.length === 0) {
      return [{
        tier: 'default',
        rate: 0,
        threshold: 0,
        salesBasis: totalSales,
        commissionAmount: 0,
        method: '无抽成规则'
      }];
    }

    const tieredRules = rules.filter(r => r.rule_type === 'tiered');
    if (tieredRules.length > 0) {
      let remainingSales = totalSales;
      let totalCommission = 0;
      
      tieredRules.sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
      
      for (let i = 0; i < tieredRules.length; i++) {
        const rule = tieredRules[i];
        const nextRule = tieredRules[i + 1];
        const threshold = rule.threshold || 0;
        const nextThreshold = nextRule ? nextRule.threshold : Infinity;
        
        const tierSales = Math.max(0, Math.min(remainingSales, nextThreshold - threshold));
        const commission = tierSales * (rule.rate || 0);
        totalCommission += commission;
        
        calculations.push({
          tier: `第${i + 1}档`,
          rate: rule.rate,
          threshold: threshold,
          salesBasis: tierSales,
          commissionAmount: commission,
          method: '超额累进'
        });
      }
      
      calculations.push({
        tier: '保底对比',
        baseRent: baseRent,
        commissionTotal: totalCommission,
        rentBeforeComparison: baseRent + totalCommission,
        finalRent: Math.max(baseRent, baseRent + totalCommission),
        method: '保底取高'
      });
    } else {
      const flatRule = rules.find(r => r.rule_type === 'flat');
      if (flatRule) {
        const commission = totalSales * (flatRule.rate || 0);
        calculations.push({
          tier: '固定比例',
          rate: flatRule.rate,
          threshold: flatRule.threshold,
          salesBasis: totalSales,
          commissionAmount: commission,
          method: '固定抽成'
        });
      }
    }

    return calculations;
  }

  validateData(store, contract, salesData, period) {
    const issues = [];
    const missingFields = [];

    if (!store.mall_name) {
      missingFields.push('stores.mall_name');
    }

    if (!contract) {
      issues.push({
        type: 'missing_contract',
        severity: 'critical',
        description: `未找到${period}期间有效的租赁合同`,
        hint: '请补充该门店的合同信息，包括合同编号、生效日期、保底金额和抽成规则',
        action: '在合同管理模块补录该门店的租赁合同'
      });
    } else {
      if (!contract.base_rent) {
        missingFields.push('contracts.base_rent');
        issues.push({
          type: 'missing_base_rent',
          severity: 'critical',
          description: '合同缺少保底租金金额',
          hint: '请在合同信息中填写保底租金金额',
          action: '更新合同的保底租金字段'
        });
      }
    }

    if (!salesData || salesData.length === 0) {
      issues.push({
        type: 'no_sales_data',
        severity: 'warning',
        description: `${period}期间没有销售数据`,
        hint: '请确认销售数据是否已导入，或检查日期范围是否正确',
        action: '导入该期间的销售数据或确认门店是否停业'
      });
    }

    return { issues, missingFields };
  }

  detectGuaranteeSwitch(contract, period) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const periodStart = new Date(year, month - 1, 1);
      
      db.all(`
        SELECT * FROM contracts 
        WHERE store_id = ? 
        AND status = 'active'
        ORDER BY version ASC
      `, [contract.store_id], (err, contracts) => {
        if (err) {
          reject(err);
          return;
        }
        
        for (let i = 0; i < contracts.length - 1; i++) {
          const curr = contracts[i];
          const next = contracts[i + 1];
          const effectiveDate = new Date(next.effective_date);
          
          const monthDiff = (effectiveDate.getFullYear() - periodStart.getFullYear()) * 12 +
                           (effectiveDate.getMonth() - periodStart.getMonth());
          
          if (Math.abs(monthDiff) <= 1 && curr.base_rent !== next.base_rent) {
            resolve(true);
            return;
          }
        }
        
        resolve(false);
      });
    });
  }
}

module.exports = new CommissionEngine();
