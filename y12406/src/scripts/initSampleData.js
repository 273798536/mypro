const db = require('../models');
const dayjs = require('dayjs');

async function initSampleData() {
  console.log('开始初始化样例数据...');

  await db.sequelize.sync({ alter: true });

  console.log('1. 创建样例合同...');
  const contract = await db.Contract.create({
    contract_no: 'CT-2026-001',
    customer_name: '示例科技有限公司',
    product_code: 'SAAS-ENTERPRISE',
    original_seat_count: 100,
    current_seat_count: 100,
    effective_date: dayjs('2026-01-01').toDate(),
    expiry_date: dayjs('2026-12-31').toDate(),
    unit_price: 299.00,
    status: 'active',
    remarks: '企业版SaaS服务年合同',
  });
  console.log(`   合同创建成功: ${contract.contract_no}`);

  console.log('2. 创建计费规则...');
  const billingRule = await db.BillingRule.create({
    rule_code: 'RULE-SAAS-001',
    rule_name: 'SaaS企业版座席超额计费规则v1.0',
    product_code: 'SAAS-ENTERPRISE',
    version: 'v1.0',
    effective_date: dayjs('2026-01-01').toDate(),
    expiry_date: null,
    over_billing_strategy: 'monthly',
    excess_tier_pricing: [
      { min_seats: 1, max_seats: 10, price_multiplier: 1.0 },
      { min_seats: 11, max_seats: 30, price_multiplier: 1.2 },
      { min_seats: 31, max_seats: null, price_multiplier: 1.5 },
    ],
    minimum_billing_days: 0,
    grace_period_days: 3,
    downgrade_cross_month_rule: 'by_effective_date',
    status: 'active',
    created_by: 'system_init',
    remarks: '基础计费规则，超额1-10个原价，11-30个1.2倍，31个以上1.5倍',
  });
  console.log(`   计费规则创建成功: ${billingRule.rule_code} ${billingRule.version}`);

  console.log('3. 创建样例座席用量...');
  const usages = [];
  const employees = [
    { id: 'EMP001', name: '张三', dept: '研发部', seats: 2 },
    { id: 'EMP002', name: '李四', dept: '产品部', seats: 1 },
    { id: 'EMP003', name: '王五', dept: '销售部', seats: 3 },
    { id: 'EMP004', name: '赵六', dept: '运营部', seats: 1 },
    { id: 'EMP005', name: '钱七', dept: '研发部', seats: 2 },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const usageDate = dayjs('2026-05-15').add(i, 'day');
    const usage = await db.SeatUsage.create({
      usage_batch_no: `USG-202605${String(15 + i).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      contract_id: contract.id,
      billing_cycle: '2026-05',
      usage_date: usageDate.toDate(),
      employee_id: emp.id,
      employee_name: emp.name,
      department: emp.dept,
      original_active_seats: emp.seats,
      current_active_seats: emp.seats,
      original_contracted_seats: 100,
      current_contracted_seats: 100,
      original_excess_seats: Math.max(0, emp.seats - 100),
      current_excess_seats: Math.max(0, emp.seats - 100),
      original_unit_price: 299.00,
      current_unit_price: 299.00,
      original_billing_amount: 0,
      current_billing_amount: 0,
      billing_rule_id: billingRule.id,
      billing_rule_version: billingRule.version,
      status: i < 3 ? 'reviewed' : 'draft',
      created_by: 'system_init',
    });
    usages.push(usage);
    console.log(`   用量创建: ${emp.id} ${emp.name} ${emp.seats}座席`);
  }

  console.log('4. 创建一条带超额的用量记录...');
  const excessUsage = await db.SeatUsage.create({
    usage_batch_no: `USG-20260520-EXCESS`,
    contract_id: contract.id,
    billing_cycle: '2026-05',
    usage_date: dayjs('2026-05-20').toDate(),
    employee_id: 'EMP006',
    employee_name: '孙八',
    department: '大客户部',
    original_active_seats: 115,
    current_active_seats: 115,
    original_contracted_seats: 100,
    current_contracted_seats: 100,
    original_excess_seats: 15,
    current_excess_seats: 15,
    original_unit_price: 299.00,
    current_unit_price: 299.00,
    original_billing_amount: 15 * 299 * 1.2,
    current_billing_amount: 15 * 299 * 1.2,
    billing_rule_id: billingRule.id,
    billing_rule_version: billingRule.version,
    status: 'reviewed',
    created_by: 'system_init',
    remarks: '大客户部超额15座席，按1.2倍计费',
  });
  usages.push(excessUsage);
  console.log(`   超额用量创建: EMP006 孙八 115座席，超额15座`);

  console.log('5. 创建降配申请样例...');
  const downgrade = await db.DowngradeRequest.create({
    request_no: 'DGR-202605001',
    contract_id: contract.id,
    original_seat_count: 100,
    new_seat_count: 80,
    original_caliber: {
      seat_count: 100,
      billing_rule_id: billingRule.id,
      downgrade_rule: null,
    },
    new_caliber: {
      seat_count: 80,
      billing_rule_id: billingRule.id,
      downgrade_rule: 'by_effective_date',
      exclude_interns: true,
    },
    caliber_change_description: '口径变更：实习生不再计入座席数，按降配生效日折算当月',
    effective_date: dayjs('2026-05-16').toDate(),
    is_cross_month: false,
    cross_month_handling_rule: 'by_effective_date',
    status: 'pending',
    created_by: 'system_init',
    remarks: '2026年Q2组织结构调整，降配20座席',
  });
  console.log(`   降配申请创建: ${downgrade.request_no} 100→80座`);

  console.log('6. 创建人工修正样例...');
  const correction = await db.ManualCorrection.create({
    correction_no: 'COR-202605001',
    correction_type: 'usage',
    target_type: 'seat_usage',
    target_id: excessUsage.id,
    before_value: { current_excess_seats: 15, current_billing_amount: 5382 },
    after_value: { current_excess_seats: 10, current_billing_amount: 3588 },
    change_summary: {
      current_excess_seats: { before: 15, after: 10, diff: '-5' },
      current_billing_amount: { before: 5382, after: 3588, diff: '-1794' },
    },
    reason: '核实发现其中5座为测试账号，不计入计费',
    exception_type: 'data_error',
    affected_amount: -1794,
    status: 'pending',
    created_by: 'system_init',
    remarks: '2026-05-25客服申诉处理',
  });
  console.log(`   人工修正创建: ${correction.correction_no} 修正超额15→10座`);

  console.log('\n====================================================');
  console.log('样例数据初始化完成！');
  console.log('====================================================');
  console.log(`合同ID: ${contract.id} | ${contract.contract_no}`);
  console.log(`计费规则ID: ${billingRule.id} | ${billingRule.rule_code}`);
  console.log(`降配申请ID: ${downgrade.id} | ${downgrade.request_no}`);
  console.log(`人工修正ID: ${correction.id} | ${correction.correction_no}`);
  console.log(`座席用量: ${usages.length}条记录`);
  console.log('====================================================');
  console.log('\n测试座席重复触发办法：');
  console.log('  POST /api/seat-usages/trigger-duplicate-test');
  console.log('  Body: { "contract_id": 1, "billing_cycle": "2026-05", "employee_id": "EMP-TEST-DUP" }');
  console.log('\n启动服务：npm start');
  console.log('健康检查：curl http://localhost:3000/api/health');

  process.exit(0);
}

initSampleData().catch(err => {
  console.error('初始化失败:', err);
  process.exit(1);
});
