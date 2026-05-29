const { run, get, all, runTransaction, saveVersionHistory } = require('../utils/db-helper');
const moment = require('moment');

const SHARING_CONFIG = {
  specialFundRate: 0.05,
  businessTaxRate: 0.067,
  cinemaShareRate: 0.52,
  distributionFeeRate: 0.15
};

function calculateRevenueWaterfall(totalRevenue, config = {}) {
  const rates = { ...SHARING_CONFIG, ...config };

  const specialFund = totalRevenue * rates.specialFundRate;
  const afterSpecialFund = totalRevenue - specialFund;

  const businessTax = afterSpecialFund * rates.businessTaxRate;
  const afterTax = afterSpecialFund - businessTax;

  const cinemaShare = afterTax * rates.cinemaShareRate;
  const afterCinema = afterTax - cinemaShare;

  const distributionFee = afterCinema * rates.distributionFeeRate;
  const distributableAmount = afterCinema - distributionFee;

  return {
    totalRevenue,
    specialFund,
    businessTax,
    cinemaShare,
    distributionFee,
    distributableAmount,
    breakdown: {
      specialFundRate: rates.specialFundRate,
      businessTaxRate: rates.businessTaxRate,
      cinemaShareRate: rates.cinemaShareRate,
      distributionFeeRate: rates.distributionFeeRate
    }
  };
}

function getLatestInvestorShares(contractId) {
  const shares = all(
    `SELECT s.*, i.name as investor_name
     FROM investor_shares s
     JOIN investors i ON s.investor_id = i.id
     WHERE s.contract_id = ?
     AND s.version = (SELECT MAX(version) FROM investor_shares WHERE contract_id = s.contract_id AND investor_id = s.investor_id)
     ORDER BY s.investment_amount DESC`,
    [contractId]
  );

  const totalInvestment = shares.reduce((sum, s) => sum + (s.investment_amount || 0), 0);

  return shares.map(s => ({
    ...s,
    calculated_ratio: totalInvestment > 0 ? s.investment_amount / totalInvestment : 0
  }));
}

function getDeductibleCosts(projectId, upToDate = null) {
  let sql = `SELECT * FROM cost_items WHERE project_id = ? AND is_deductible = 1`;
  const params = [projectId];

  if (upToDate) {
    sql += ` AND cost_date <= ?`;
    params.push(upToDate);
  }

  sql += ` ORDER BY cost_date ASC`;

  const costs = all(sql, params);

  return {
    costs,
    totalDeductible: costs.reduce((sum, c) => sum + (c.amount || 0), 0)
  };
}

function getUndeductedCosts(projectId, sharingRecordId = null) {
  const { costs, totalDeductible } = getDeductibleCosts(projectId);

  let deductedSoFar = 0;
  if (sharingRecordId) {
    const deducted = get(
      `SELECT SUM(cost_deducted) as total FROM sharing_records WHERE project_id = ? AND id < ?`,
      [projectId, sharingRecordId]
    );
    deductedSoFar = deducted?.total || 0;
  } else {
    const deducted = get(
      `SELECT SUM(cost_deducted) as total FROM sharing_records WHERE project_id = ?`,
      [projectId]
    );
    deductedSoFar = deducted?.total || 0;
  }

  return {
    costs,
    totalDeductible,
    deductedSoFar,
    remainingToDeduct: Math.max(0, totalDeductible - deductedSoFar)
  };
}

function calculateSharing(projectId, installmentId, options = {}) {
  const { created_by = 'system', config = {} } = options;

  const installment = get(
    `SELECT i.*, p.revenue_type, p.project_id
     FROM revenue_installments i
     JOIN revenue_plans p ON i.revenue_plan_id = p.id
     WHERE i.id = ?`,
    [installmentId]
  );

  if (!installment) {
    throw new Error('回款分期记录不存在');
  }

  if (installment.project_id !== projectId) {
    throw new Error('回款分期与项目不匹配');
  }

  const actualAmount = installment.actual_amount > 0 ? installment.actual_amount : installment.amount;

  if (actualAmount <= 0) {
    throw new Error('回款金额必须大于0');
  }

  const waterfall = calculateRevenueWaterfall(actualAmount, config);

  const { remainingToDeduct, deductedSoFar, totalDeductible } = getUndeductedCosts(projectId);

  const costToDeduct = Math.min(waterfall.distributableAmount, remainingToDeduct);
  const investorDistributable = waterfall.distributableAmount - costToDeduct;

  const contract = get(
    `SELECT * FROM investment_contracts WHERE project_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [projectId]
  );

  if (!contract) {
    throw new Error('未找到有效的投资合同');
  }

  const investorShares = getLatestInvestorShares(contract.id);

  const distributions = investorShares.map(share => {
    const ratio = share.share_ratio > 0 ? share.share_ratio : share.calculated_ratio;
    return {
      investor_id: share.investor_id,
      investor_name: share.investor_name,
      share_ratio: ratio,
      distribution_amount: investorDistributable * ratio,
      investor_share_id: share.id
    };
  });

  return {
    waterfall,
    costInfo: {
      totalDeductible,
      deductedSoFar,
      remainingToDeduct,
      costToDeduct
    },
    investorDistributable,
    distributions,
    contract,
    installment,
    calculationDetails: {
      config: waterfall.breakdown,
      steps: [
        { step: '总票房收入', amount: actualAmount },
        { step: '扣减专项基金(5%)', amount: -waterfall.specialFund },
        { step: '扣减营业税及附加(6.7%)', amount: -waterfall.businessTax },
        { step: '院线及影院分账(52%)', amount: -waterfall.cinemaShare },
        { step: '发行代理费(15%)', amount: -waterfall.distributionFee },
        { step: '可分账收入', amount: waterfall.distributableAmount },
        { step: '成本抵扣', amount: -costToDeduct },
        { step: '投资方可分配金额', amount: investorDistributable }
      ]
    }
  };
}

function saveSharingRecord(projectId, installmentId, calculationResult, options = {}) {
  const { created_by = 'system' } = options;
  const { waterfall, costInfo, investorDistributable, distributions, calculationDetails } = calculationResult;

  return runTransaction(() => {
    const maxVersion = get(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM sharing_records WHERE project_id = ? AND revenue_installment_id = ?`,
      [projectId, installmentId]
    );

    let recordId;
    let version = (maxVersion?.max_version || 0) + 1;

    const result = run(
      `INSERT INTO sharing_records (
        project_id, revenue_installment_id, sharing_date, total_revenue,
        special_fund, business_tax, cinema_share, distribution_fee,
        distributable_amount, cost_deducted, investor_distributable,
        calculation_details, created_by, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        installmentId,
        moment().format('YYYY-MM-DD'),
        waterfall.totalRevenue,
        waterfall.specialFund,
        waterfall.businessTax,
        waterfall.cinemaShare,
        waterfall.distributionFee,
        waterfall.distributableAmount,
        costInfo.costToDeduct,
        investorDistributable,
        JSON.stringify(calculationDetails),
        created_by,
        version
      ]
    );

    recordId = result.lastInsertRowid;

    distributions.forEach(dist => {
      run(
        `INSERT INTO investor_distributions (
          sharing_record_id, investor_id, investor_name, share_ratio,
          distribution_amount, investor_share_id
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          dist.investor_id,
          dist.investor_name,
          dist.share_ratio,
          dist.distribution_amount,
          dist.investor_share_id
        ]
      );
    });

    return {
      id: recordId,
      version,
      message: version > 1 ? `分账记录已更新，版本号: ${version}` : '分账记录已创建'
    };
  });
}

function executeSharing(projectId, installmentId, options = {}) {
  const calculation = calculateSharing(projectId, installmentId, options);
  const saveResult = saveSharingRecord(projectId, installmentId, calculation, options);
  return {
    ...saveResult,
    calculation
  };
}

function getSharingRecords(projectId) {
  const records = all(
    `SELECT sr.*, 
            ri.installment_no, ri.amount as expected_amount, ri.actual_amount,
            rp.revenue_type
     FROM sharing_records sr
     LEFT JOIN revenue_installments ri ON sr.revenue_installment_id = ri.id
     LEFT JOIN revenue_plans rp ON ri.revenue_plan_id = rp.id
     WHERE sr.project_id = ?
     ORDER BY sr.created_at DESC, sr.version DESC`,
    [projectId]
  );

  return records.map(r => ({
    ...r,
    calculation_details: r.calculation_details ? JSON.parse(r.calculation_details) : null
  }));
}

function getInvestorDistributions(sharingRecordId) {
  return all(
    `SELECT d.*, i.contact
     FROM investor_distributions d
     LEFT JOIN investors i ON d.investor_id = i.id
     WHERE d.sharing_record_id = ?
     ORDER BY d.distribution_amount DESC`,
    [sharingRecordId]
  );
}

function getInvestorTotalDistributions(investorId, projectId = null) {
  let sql = `
    SELECT d.investor_id, d.investor_name,
           SUM(d.distribution_amount) as total_distributed,
           COUNT(DISTINCT d.sharing_record_id) as sharing_count,
           sr.project_id, p.name as project_name
    FROM investor_distributions d
    JOIN sharing_records sr ON d.sharing_record_id = sr.id
    JOIN projects p ON sr.project_id = p.id
    WHERE d.investor_id = ?
  `;
  const params = [investorId];

  if (projectId) {
    sql += ` AND sr.project_id = ?`;
    params.push(projectId);
  }

  sql += ` GROUP BY sr.project_id, d.investor_id`;

  return all(sql, params);
}

module.exports = {
  SHARING_CONFIG,
  calculateRevenueWaterfall,
  getLatestInvestorShares,
  getDeductibleCosts,
  getUndeductedCosts,
  calculateSharing,
  saveSharingRecord,
  executeSharing,
  getSharingRecords,
  getInvestorDistributions,
  getInvestorTotalDistributions
};
