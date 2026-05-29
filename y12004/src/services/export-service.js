const { get, all } = require('../utils/db-helper');
const moment = require('moment');

function formatCurrency(amount) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function formatPercent(value) {
  return (value * 100).toFixed(2) + '%';
}

function getSharingRecordWithDetails(sharingRecordId) {
  const record = get(
    `SELECT sr.*, 
            ri.installment_no, ri.amount as expected_amount, ri.actual_amount,
            ri.actual_date, ri.expected_date,
            rp.revenue_type,
            p.name as project_name, p.film_name,
            ic.contract_no, ic.total_investment
     FROM sharing_records sr
     LEFT JOIN revenue_installments ri ON sr.revenue_installment_id = ri.id
     LEFT JOIN revenue_plans rp ON ri.revenue_plan_id = rp.id
     LEFT JOIN projects p ON sr.project_id = p.id
     LEFT JOIN investment_contracts ic ON sr.project_id = ic.project_id AND ic.status = 'active'
     WHERE sr.id = ?
     ORDER BY ic.created_at DESC
     LIMIT 1`,
    [sharingRecordId]
  );

  if (!record) return null;

  const distributions = all(
    `SELECT d.*, i.contact
     FROM investor_distributions d
     LEFT JOIN investors i ON d.investor_id = i.id
     WHERE d.sharing_record_id = ?
     ORDER BY d.distribution_amount DESC`,
    [sharingRecordId]
  );

  const costs = all(
    `SELECT * FROM cost_items WHERE project_id = ? AND is_deductible = 1
     AND cost_date <= ? ORDER BY cost_date ASC`,
    [record.project_id, record.sharing_date]
  );

  const previousDeducted = get(
    `SELECT COALESCE(SUM(cost_deducted), 0) as total
     FROM sharing_records
     WHERE project_id = ? AND id < ?`,
    [record.project_id, sharingRecordId]
  );

  const calculationDetails = record.calculation_details ? JSON.parse(record.calculation_details) : null;

  return {
    ...record,
    calculation_details: calculationDetails,
    distributions,
    costs,
    previous_cost_deducted: previousDeducted?.total || 0
  };
}

function generateSharingStatement(sharingRecordId, options = {}) {
  const { format = 'text' } = options;

  const data = getSharingRecordWithDetails(sharingRecordId);
  if (!data) {
    throw new Error('分账记录不存在');
  }

  const revenueTypeMap = {
    'box_office': '院线票房',
    'online_copyright': '网络版权',
    'advertising': '广告收入',
    'other': '其他收入'
  };

  const revenueType = revenueTypeMap[data.revenue_type] || data.revenue_type;

  const statement = {
    header: {
      title: '影视项目投资分账单',
      document_no: `FRS-${data.project_id}-${data.id}-V${data.version}`,
      generated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      sharing_date: data.sharing_date
    },
    project_info: {
      project_name: data.project_name,
      film_name: data.film_name,
      contract_no: data.contract_no,
      total_investment: data.total_investment,
      total_investment_formatted: formatCurrency(data.total_investment)
    },
    revenue_info: {
      revenue_type: revenueType,
      installment_no: data.installment_no,
      expected_amount: data.expected_amount,
      expected_amount_formatted: formatCurrency(data.expected_amount),
      actual_amount: data.actual_amount > 0 ? data.actual_amount : data.amount,
      actual_amount_formatted: formatCurrency(data.actual_amount > 0 ? data.actual_amount : data.amount),
      actual_date: data.actual_date,
      expected_date: data.expected_date
    },
    waterfall: [
      { item: '总票房收入', amount: data.total_revenue, formatted: formatCurrency(data.total_revenue) },
      { item: '减：专项基金(5%)', amount: -data.special_fund, formatted: '-' + formatCurrency(data.special_fund) },
      { item: '减：营业税及附加(6.7%)', amount: -data.business_tax, formatted: '-' + formatCurrency(data.business_tax) },
      { item: '减：院线及影院分账(52%)', amount: -data.cinema_share, formatted: '-' + formatCurrency(data.cinema_share) },
      { item: '减：发行代理费(15%)', amount: -data.distribution_fee, formatted: '-' + formatCurrency(data.distribution_fee) },
      { item: '可分账收入', amount: data.distributable_amount, formatted: formatCurrency(data.distributable_amount), is_subtotal: true },
      { item: '减：成本抵扣', amount: -data.cost_deducted, formatted: '-' + formatCurrency(data.cost_deducted) },
      { item: '投资方可分配金额', amount: data.investor_distributable, formatted: formatCurrency(data.investor_distributable), is_total: true }
    ],
    cost_deduction_detail: {
      total_deductible_costs: data.costs.reduce((sum, c) => sum + c.amount, 0),
      total_deductible_costs_formatted: formatCurrency(data.costs.reduce((sum, c) => sum + c.amount, 0)),
      previously_deducted: data.previous_cost_deducted,
      previously_deducted_formatted: formatCurrency(data.previous_cost_deducted),
      remaining_before_this: data.costs.reduce((sum, c) => sum + c.amount, 0) - data.previous_cost_deducted,
      remaining_before_this_formatted: formatCurrency(data.costs.reduce((sum, c) => sum + c.amount, 0) - data.previous_cost_deducted),
      deducted_this_time: data.cost_deducted,
      deducted_this_time_formatted: formatCurrency(data.cost_deducted),
      remaining_after_this: data.costs.reduce((sum, c) => sum + c.amount, 0) - data.previous_cost_deducted - data.cost_deducted,
      remaining_after_this_formatted: formatCurrency(Math.max(0, data.costs.reduce((sum, c) => sum + c.amount, 0) - data.previous_cost_deducted - data.cost_deducted)),
      cost_items: data.costs.map(c => ({
        cost_date: c.cost_date,
        cost_type: c.cost_type,
        description: c.description,
        amount: c.amount,
        amount_formatted: formatCurrency(c.amount)
      }))
    },
    investor_distributions: data.distributions.map(d => ({
      investor_name: d.investor_name,
      share_ratio: d.share_ratio,
      share_ratio_formatted: formatPercent(d.share_ratio),
      distribution_amount: d.distribution_amount,
      distribution_amount_formatted: formatCurrency(d.distribution_amount),
      investor_share_id: d.investor_share_id,
      contact: d.contact
    })),
    footer: {
      version: data.version,
      created_by: data.created_by,
      created_at: data.created_at,
      record_id: data.id,
      source_records: {
        sharing_record_id: data.id,
        installment_id: data.revenue_installment_id,
        contract_id: data.id
      },
      notes: [
        '本单金额口径按国家电影专资办及行业标准执行',
        '成本抵扣按项目总成本计算，未抵扣部分结转至下期',
        '投资人份额以最新生效版本为准',
        '如有疑问请在7个工作日内反馈'
      ]
    }
  };

  if (format === 'text') {
    return generateTextStatement(statement);
  } else if (format === 'html') {
    return generateHtmlStatement(statement);
  } else if (format === 'json') {
    return JSON.stringify(statement, null, 2);
  }

  return statement;
}

function generateTextStatement(data) {
  const lines = [];

  lines.push('='.repeat(80));
  lines.push(`${data.header.title}`);
  lines.push('='.repeat(80));
  lines.push(`单据编号: ${data.header.document_no}`);
  lines.push(`生成时间: ${data.header.generated_at}`);
  lines.push(`分账日期: ${data.header.sharing_date}`);
  lines.push(`版本号: V${data.footer.version}`);
  lines.push('');

  lines.push('【项目基本信息】');
  lines.push('-'.repeat(80));
  lines.push(`项目名称: ${data.project_info.project_name}`);
  lines.push(`影片名称: ${data.project_info.film_name}`);
  lines.push(`合同编号: ${data.project_info.contract_no}`);
  lines.push(`总投资额: ${data.project_info.total_investment_formatted}`);
  lines.push('');

  lines.push('【回款信息】');
  lines.push('-'.repeat(80));
  lines.push(`回款类型: ${data.revenue_info.revenue_type}`);
  lines.push(`分期: 第 ${data.revenue_info.installment_no} 期`);
  lines.push(`预期金额: ${data.revenue_info.expected_amount_formatted}`);
  lines.push(`实际到账: ${data.revenue_info.actual_amount_formatted}`);
  if (data.revenue_info.actual_date) {
    lines.push(`到账日期: ${data.revenue_info.actual_date}`);
  }
  lines.push('');

  lines.push('【分账瀑布计算】');
  lines.push('-'.repeat(80));
  data.waterfall.forEach(item => {
    const prefix = item.is_total ? '★ ' : item.is_subtotal ? '→ ' : '  ';
    lines.push(`${prefix}${item.item.padEnd(25)} ${item.formatted.padStart(20)}`);
  });
  lines.push('');

  lines.push('【成本抵扣明细】');
  lines.push('-'.repeat(80));
  lines.push(`可抵扣总成本: ${data.cost_deduction_detail.total_deductible_costs_formatted}`);
  lines.push(`前期已抵扣: ${data.cost_deduction_detail.previously_deducted_formatted}`);
  lines.push(`本期前待抵扣: ${data.cost_deduction_detail.remaining_before_this_formatted}`);
  lines.push(`本期抵扣: ${data.cost_deduction_detail.deducted_this_time_formatted}`);
  lines.push(`结转下期: ${data.cost_deduction_detail.remaining_after_this_formatted}`);
  lines.push('');
  lines.push('成本清单:');
  data.cost_deduction_detail.cost_items.forEach((c, i) => {
    lines.push(`  ${i + 1}. [${c.cost_date}] ${c.cost_type} - ${c.description}: ${c.amount_formatted}`);
  });
  lines.push('');

  lines.push('【投资人分配明细】');
  lines.push('-'.repeat(80));
  lines.push(`${'投资人'.padEnd(15)} ${'投资比例'.padStart(12)} ${'分配金额'.padStart(20)}`);
  lines.push('-'.repeat(80));
  data.investor_distributions.forEach(d => {
    lines.push(`${d.investor_name.padEnd(15)} ${d.share_ratio_formatted.padStart(12)} ${d.distribution_amount_formatted.padStart(20)}`);
  });
  lines.push('');

  lines.push('【备注说明】');
  lines.push('-'.repeat(80));
  data.footer.notes.forEach((note, i) => {
    lines.push(`${i + 1}. ${note}`);
  });
  lines.push('');

  lines.push('【溯源记录】');
  lines.push('-'.repeat(80));
  lines.push(`分账记录ID: ${data.footer.source_records.sharing_record_id}`);
  lines.push(`回款分期ID: ${data.footer.source_records.installment_id}`);
  lines.push('');
  lines.push('='.repeat(80));
  lines.push('本单据由系统自动生成，统一口径计算，版本留痕可追溯。');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

function generateHtmlStatement(data) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${data.header.title}</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1a1a1a; }
    .doc-info { text-align: right; color: #666; font-size: 14px; margin-top: 10px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
    .info-item { display: flex; }
    .info-label { font-weight: bold; min-width: 100px; color: #555; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px 15px; text-align: right; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: bold; color: #2c3e50; text-align: center; }
    th:first-child, td:first-child { text-align: left; }
    .subtotal { background: #ecf0f1; font-weight: bold; }
    .total { background: #3498db; color: white; font-weight: bold; font-size: 16px; }
    .star { color: #e74c3c; }
    .notes { background: #fffbe6; padding: 15px; border-left: 4px solid #f39c12; margin-top: 15px; }
    .notes ul { margin: 0; padding-left: 20px; }
    .notes li { margin: 5px 0; }
    .trace { background: #e8f5e9; padding: 15px; border-left: 4px solid #27ae60; font-family: monospace; font-size: 13px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; color: #777; font-size: 14px; }
    .version-badge { display: inline-block; background: #9b59b6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.header.title}</h1>
    <div class="doc-info">
      <div>单据编号: <strong>${data.header.document_no}</strong></div>
      <div>生成时间: ${data.header.generated_at}</div>
      <div>分账日期: ${data.header.sharing_date} <span class="version-badge">V${data.footer.version}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>项目基本信息</h2>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">项目名称:</span><span class="info-value">${data.project_info.project_name}</span></div>
      <div class="info-item"><span class="info-label">影片名称:</span><span class="info-value">${data.project_info.film_name}</span></div>
      <div class="info-item"><span class="info-label">合同编号:</span><span class="info-value">${data.project_info.contract_no}</span></div>
      <div class="info-item"><span class="info-label">总投资额:</span><span class="info-value"><strong>${data.project_info.total_investment_formatted}</strong></span></div>
    </div>
  </div>

  <div class="section">
    <h2>回款信息</h2>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">回款类型:</span><span class="info-value">${data.revenue_info.revenue_type}</span></div>
      <div class="info-item"><span class="info-label">分期:</span><span class="info-value">第 ${data.revenue_info.installment_no} 期</span></div>
      <div class="info-item"><span class="info-label">预期金额:</span><span class="info-value">${data.revenue_info.expected_amount_formatted}</span></div>
      <div class="info-item"><span class="info-label">实际到账:</span><span class="info-value"><strong>${data.revenue_info.actual_amount_formatted}</strong></span></div>
      ${data.revenue_info.actual_date ? `<div class="info-item"><span class="info-label">到账日期:</span><span class="info-value">${data.revenue_info.actual_date}</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>分账瀑布计算</h2>
    <table>
      <thead>
        <tr><th>项目</th><th>金额</th></tr>
      </thead>
      <tbody>
        ${data.waterfall.map(item => `
          <tr class="${item.is_total ? 'total' : item.is_subtotal ? 'subtotal' : ''}">
            <td>${item.is_total ? '<span class="star">★</span> ' : item.is_subtotal ? '→ ' : ''}${item.item}</td>
            <td>${item.formatted}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>成本抵扣明细</h2>
    <div class="info-grid" style="margin-bottom: 15px;">
      <div class="info-item"><span class="info-label">可抵扣总成本:</span><span class="info-value">${data.cost_deduction_detail.total_deductible_costs_formatted}</span></div>
      <div class="info-item"><span class="info-label">前期已抵扣:</span><span class="info-value">${data.cost_deduction_detail.previously_deducted_formatted}</span></div>
      <div class="info-item"><span class="info-label">本期前待抵扣:</span><span class="info-value">${data.cost_deduction_detail.remaining_before_this_formatted}</span></div>
      <div class="info-item"><span class="info-label">本期抵扣:</span><span class="info-value"><strong>${data.cost_deduction_detail.deducted_this_time_formatted}</strong></span></div>
      <div class="info-item"><span class="info-label">结转下期:</span><span class="info-value">${data.cost_deduction_detail.remaining_after_this_formatted}</span></div>
    </div>
    <table>
      <thead>
        <tr><th>日期</th><th>类型</th><th>说明</th><th>金额</th></tr>
      </thead>
      <tbody>
        ${data.cost_deduction_detail.cost_items.map(c => `
          <tr>
            <td>${c.cost_date}</td>
            <td>${c.cost_type}</td>
            <td>${c.description}</td>
            <td>${c.amount_formatted}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>投资人分配明细</h2>
    <table>
      <thead>
        <tr><th>投资人</th><th>投资比例</th><th>分配金额</th><th>联系方式</th></tr>
      </thead>
      <tbody>
        ${data.investor_distributions.map(d => `
          <tr>
            <td>${d.investor_name}</td>
            <td>${d.share_ratio_formatted}</td>
            <td><strong>${d.distribution_amount_formatted}</strong></td>
            <td>${d.contact || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section notes">
    <h2 style="border-color: #f39c12;">备注说明</h2>
    <ul>
      ${data.footer.notes.map(n => `<li>${n}</li>`).join('')}
    </ul>
  </div>

  <div class="section trace">
    <h2 style="border-color: #27ae60;">溯源记录</h2>
    <div>分账记录ID: ${data.footer.source_records.sharing_record_id}</div>
    <div>回款分期ID: ${data.footer.source_records.installment_id}</div>
    <div>创建人: ${data.footer.created_by}</div>
  </div>

  <div class="footer">
    <p>本单据由系统自动生成，统一口径计算，版本留痕可追溯。</p>
    <p>© 影视投资回款分账系统</p>
  </div>
</body>
</html>
  `;
}

function generateMonthlyReport(projectId, yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = moment({ year, month: month - 1, day: 1 }).format('YYYY-MM-DD');
  const endDate = moment({ year, month: month - 1, day: 1 }).endOf('month').format('YYYY-MM-DD');

  const project = get(`SELECT * FROM projects WHERE id = ?`, [projectId]);
  if (!project) throw new Error('项目不存在');

  const sharingRecords = all(
    `SELECT sr.*, ri.installment_no, rp.revenue_type
     FROM sharing_records sr
     JOIN revenue_installments ri ON sr.revenue_installment_id = ri.id
     JOIN revenue_plans rp ON ri.revenue_plan_id = rp.id
     WHERE sr.project_id = ? AND sr.sharing_date BETWEEN ? AND ?
     ORDER BY sr.sharing_date ASC`,
    [projectId, startDate, endDate]
  );

  const report = {
    title: `${project.name} - ${year}年${month}月分账复盘`,
    period: yearMonth,
    generated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
    project: {
      id: project.id,
      name: project.name,
      film_name: project.film_name
    },
    summary: {
      sharing_count: sharingRecords.length,
      total_revenue: sharingRecords.reduce((sum, r) => sum + r.total_revenue, 0),
      total_distributable: sharingRecords.reduce((sum, r) => sum + r.investor_distributable, 0),
      total_cost_deducted: sharingRecords.reduce((sum, r) => sum + r.cost_deducted, 0)
    },
    records: sharingRecords.map(r => ({
      id: r.id,
      sharing_date: r.sharing_date,
      revenue_type: r.revenue_type,
      installment_no: r.installment_no,
      total_revenue: r.total_revenue,
      investor_distributable: r.investor_distributable,
      cost_deducted: r.cost_deducted,
      version: r.version
    }))
  };

  report.summary.total_revenue_formatted = formatCurrency(report.summary.total_revenue);
  report.summary.total_distributable_formatted = formatCurrency(report.summary.total_distributable);
  report.summary.total_cost_deducted_formatted = formatCurrency(report.summary.total_cost_deducted);

  return report;
}

module.exports = {
  generateSharingStatement,
  generateMonthlyReport,
  getSharingRecordWithDetails,
  formatCurrency,
  formatPercent
};
