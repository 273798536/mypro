const { initDatabase } = require('../src/config/database');
const crudService = require('../src/services/crud-service');
const sharingService = require('../src/services/revenue-sharing-service');
const conflictService = require('../src/services/conflict-service');
const versionService = require('../src/services/version-service');
const exportService = require('../src/services/export-service');

const results = [];
const testData = {};

function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    const errMsg = err.message || String(err) || '未知错误';
    results.push({ name, passed: false, error: errMsg, stack: err.stack });
    console.log(`✗ ${name}`);
    console.log(`  错误: ${errMsg}`);
    if (err instanceof Error && err.stack) {
      console.log(`  堆栈: ${err.stack.split('\n')[1]}`);
    }
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} 期望 ${expected}, 实际 ${actual}`);
  }
}

function assertCloseTo(actual, expected, tolerance = 0.01, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} 期望接近 ${expected}, 实际 ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

async function runTests() {
  await initDatabase();

  console.log('\n========================================');
  console.log('  开始运行测试用例');
  console.log('========================================\n');

  test('1. 分账瀑布计算 - 1亿票房分账', () => {
    const result = sharingService.calculateRevenueWaterfall(100000000);

    assertCloseTo(result.specialFund, 5000000, 1, '专项基金');
    assertCloseTo(result.businessTax, 6365000, 1, '营业税');
    assertCloseTo(result.cinemaShare, 46090200, 1, '院线分账');
    assertCloseTo(result.distributionFee, 6381720, 1, '发行代理费');
    assertCloseTo(result.distributableAmount, 36163080, 1, '可分账收入');

    console.log(`  1亿票房 → 投资方实际可分: ${result.distributableAmount.toFixed(2)}元`);
  });

  test('2. 创建测试项目', () => {
    const project = crudService.projects.create({
      name: '测试项目_流浪地球3',
      film_name: '流浪地球3',
      total_budget: 500000000,
      created_by: 'test_user'
    });
    console.log('  创建项目返回:', JSON.stringify(project));
    assertTrue(project.id > 0, '项目ID应大于0');
    testData.projectId = project.id;
    console.log(`  项目ID: ${testData.projectId}`);
  });

  test('3. 创建测试投资人', () => {
    const investors = [
      { name: '北京文化投资', contact: '13800138001' },
      { name: '中影股份', contact: '13800138002' },
      { name: '光线传媒', contact: '13800138003' },
      { name: '万达影视', contact: '13800138004' }
    ];

    testData.investorIds = [];
    investors.forEach(inv => {
      const result = crudService.investors.create(inv);
      testData.investorIds.push(result.id);
    });

    assertEqual(testData.investorIds.length, 4, '应创建4个投资人');
    console.log(`  投资人IDs: ${testData.investorIds.join(', ')}`);
  });

  test('4. 创建投资合同及投资人份额', () => {
    const contract = crudService.investmentContracts.create({
      project_id: testData.projectId,
      contract_no: 'HT-2026-001',
      total_investment: 500000000,
      contract_date: '2026-01-15',
      created_by: 'contract_manager',
      investor_shares: [
        { investor_id: testData.investorIds[0], investor_name: '北京文化投资', investment_amount: 200000000, share_ratio: 0.40 },
        { investor_id: testData.investorIds[1], investor_name: '中影股份', investment_amount: 150000000, share_ratio: 0.30 },
        { investor_id: testData.investorIds[2], investor_name: '光线传媒', investment_amount: 100000000, share_ratio: 0.20 },
        { investor_id: testData.investorIds[3], investor_name: '万达影视', investment_amount: 50000000, share_ratio: 0.10 }
      ]
    });

    assertTrue(contract.id > 0, '合同ID应大于0');
    testData.contractId = contract.id;
    console.log(`  合同ID: ${testData.contractId}, 总投资额: 5亿`);
  });

  test('5. 创建院线票房回款计划及分期', () => {
    const plan = crudService.revenuePlans.create({
      project_id: testData.projectId,
      revenue_type: 'box_office',
      total_amount: 1000000000,
      expected_date: '2026-06-30',
      created_by: 'revenue_manager',
      source_type: 'actual',
      installments: [
        { installment_no: 1, amount: 500000000, expected_date: '2026-07-15', status: 'received' },
        { installment_no: 2, amount: 300000000, expected_date: '2026-08-15', status: 'pending' },
        { installment_no: 3, amount: 200000000, expected_date: '2026-09-15', status: 'pending' }
      ]
    });

    assertTrue(plan.id > 0, '回款计划ID应大于0');
    testData.revenuePlanId = plan.id;

    const installments = crudService.revenueInstallments.getByPlanId(plan.id);
    assertEqual(installments.length, 3, '应创建3期回款');
    testData.installmentId = installments[0].id;

    crudService.revenueInstallments.recordActual(testData.installmentId, {
      actual_date: '2026-07-10',
      actual_amount: 500000000,
      status: 'received'
    });

    console.log(`  回款计划ID: ${plan.id}, 第1期ID: ${testData.installmentId}, 到账5亿`);
  });

  test('6. 添加成本追补记录', () => {
    const costs = [
      { project_id: testData.projectId, cost_type: 'production', amount: 30000000, cost_date: '2026-02-15', description: '后期制作成本追加', is_deductible: true },
      { project_id: testData.projectId, cost_type: 'marketing', amount: 20000000, cost_date: '2026-05-20', description: '宣发成本超支', is_deductible: true },
      { project_id: testData.projectId, cost_type: 'other', amount: 5000000, cost_date: '2026-06-10', description: '其他不可抵扣成本', is_deductible: false }
    ];

    costs.forEach(c => crudService.costItems.create(c));

    const costStatus = sharingService.getUndeductedCosts(testData.projectId);
    assertCloseTo(costStatus.totalDeductible, 50000000, 1, '可抵扣成本应为5000万');
    console.log(`  可抵扣成本: ${costStatus.totalDeductible.toFixed(2)}元, 待抵扣: ${costStatus.remainingToDeduct.toFixed(2)}元`);
  });

  test('7. 执行第1期分账计算', () => {
    const result = sharingService.calculateSharing(testData.projectId, testData.installmentId, {
      created_by: 'finance_user'
    });

    assertTrue(result.waterfall.totalRevenue > 0, '分账结果应包含收入');
    assertCloseTo(result.costInfo.costToDeduct, 50000000, 1, '成本抵扣应为5000万');
    assertTrue(result.investorDistributable > 0, '投资方应有可分配金额');
    assertEqual(result.distributions.length, 4, '应分配给4个投资人');

    const beijingCulture = result.distributions.find(d => d.investor_name === '北京文化投资');
    assertCloseTo(beijingCulture.share_ratio, 0.40, 0.001, '北京文化比例应为40%');

    testData.calculation = result;
    console.log(`  票房收入: 5亿 → 投资方可分: ${result.investorDistributable.toFixed(2)}元`);
    console.log(`  北京文化(40%)应分: ${beijingCulture.distribution_amount.toFixed(2)}元`);
  });

  test('8. 保存分账记录到数据库', () => {
    const saveResult = sharingService.saveSharingRecord(
      testData.projectId,
      testData.installmentId,
      testData.calculation,
      { created_by: 'finance_user' }
    );

    assertTrue(saveResult.id > 0, '分账记录ID应大于0');
    assertEqual(saveResult.version, 1, '版本号应为1');
    testData.sharingRecordId = saveResult.id;
    console.log(`  分账记录ID: ${saveResult.id}, 版本: V${saveResult.version}`);
  });

  test('9. 再次执行分账测试版本递增', () => {
    const executeResult = sharingService.executeSharing(
      testData.projectId,
      testData.installmentId,
      { created_by: 'finance_manager' }
    );

    assertEqual(executeResult.version, 2, '版本号应递增到2');
    console.log(`  重新分账后版本: V${executeResult.version}`);
  });

  test('10. 测试投资人份额变更版本留痕', () => {
    const updateResult = versionService.updateInvestorShares(
      testData.contractId,
      [
        { investor_id: testData.investorIds[0], investor_name: '北京文化投资', investment_amount: 250000000, share_ratio: 0.50 },
        { investor_id: testData.investorIds[1], investor_name: '中影股份', investment_amount: 150000000, share_ratio: 0.30 },
        { investor_id: testData.investorIds[2], investor_name: '光线传媒', investment_amount: 100000000, share_ratio: 0.20 },
        { investor_id: testData.investorIds[3], investor_name: '万达影视', investment_amount: 0, share_ratio: 0 }
      ],
      {
        changed_by: 'legal_manager',
        change_reason: '万达影视退出，北京文化增持'
      }
    );

    assertTrue(updateResult.records.length > 0, '应返回更新记录');
    const versionHistory = versionService.getShareVersionHistory(testData.contractId);
    assertTrue(versionHistory.length > 0, '应有版本历史');

    const beijingVersion = versionHistory.find(v => v.investor_name === '北京文化投资' && v.version === 2);
    assertTrue(beijingVersion, '北京文化应有版本2记录');
    assertTrue(beijingVersion.parent_id > 0, '应有父记录ID');

    console.log(`  北京文化份额变更: 2亿→2.5亿, 版本链完整`);
  });

  test('11. 测试回款分期变更版本留痕', () => {
    const updateResult = versionService.updateRevenueInstallment(
      testData.installmentId,
      {
        amount: 550000000,
        actual_amount: 550000000
      },
      {
        changed_by: 'revenue_manager',
        change_reason: '实际回款比预期多5000万'
      }
    );

    assertTrue(updateResult.parent_id > 0, '新版本应指向旧版本');
    const chain = versionService.getRecordVersionChain('revenue_installments', updateResult.id);
    assertTrue(chain.length >= 2, '版本链长度应>=2');

    console.log(`  回款分期变更版本链: ${chain.length}个版本, 新ID:${updateResult.id}→旧ID:${updateResult.parent_id}`);
  });

  test('12. 测试冲突检测 - 录入另一版本回款计划', () => {
    const plan2 = crudService.revenuePlans.create({
      project_id: testData.projectId,
      revenue_type: 'box_office',
      total_amount: 1050000000,
      expected_date: '2026-06-30',
      created_by: 'revenue_manager_2',
      source_type: 'contract',
      installments: [
        { installment_no: 1, amount: 520000000, expected_date: '2026-07-20', status: 'pending' },
        { installment_no: 2, amount: 330000000, expected_date: '2026-08-20', status: 'pending' },
        { installment_no: 3, amount: 200000000, expected_date: '2026-09-20', status: 'pending' }
      ]
    });

    const conflicts = conflictService.detectAllConflicts(testData.projectId);
    assertTrue(conflicts.revenue_conflicts.length > 0, '应检测到回款数据冲突');

    const firstConflict = conflicts.revenue_conflicts[0];
    assertTrue(firstConflict.plan_conflicts.length > 0, '应检测到计划层面冲突');
    console.log(`  检测到回款冲突: ${firstConflict.plan_conflicts.length}个字段不一致`);
    console.log(`  冲突详情: ${JSON.stringify(firstConflict.plan_conflicts)}`);
  });

  test('13. 测试合同版本冲突检测', () => {
    const contract2 = crudService.investmentContracts.create({
      project_id: testData.projectId,
      contract_no: 'HT-2026-001-REVISED',
      total_investment: 520000000,
      contract_date: '2026-02-20',
      created_by: 'legal_manager',
      investor_shares: [
        { investor_id: testData.investorIds[0], investor_name: '北京文化投资', investment_amount: 260000000, share_ratio: 0.50 },
        { investor_id: testData.investorIds[1], investor_name: '中影股份', investment_amount: 156000000, share_ratio: 0.30 },
        { investor_id: testData.investorIds[2], investor_name: '光线传媒', investment_amount: 104000000, share_ratio: 0.20 }
      ]
    });

    const conflicts = conflictService.detectAllConflicts(testData.projectId);
    assertTrue(conflicts.investment_conflicts.length > 0, '应检测到合同冲突');

    const contractConflict = conflicts.investment_conflicts[0];
    assertTrue(contractConflict.contract_conflicts.length > 0 || contractConflict.share_conflicts.length > 0, '应检测到具体冲突字段');
    console.log(`  检测到合同冲突: ${contractConflict.contract_conflicts.length}个合同字段, ${contractConflict.share_conflicts.length}个份额字段不一致`);
  });

  test('14. 生成分账单文本格式', () => {
    const statement = exportService.generateSharingStatement(testData.sharingRecordId, { format: 'text' });
    assertTrue(statement.includes('影视项目投资分账单'), '应包含分账单标题');
    assertTrue(statement.includes('流浪地球3'), '应包含影片名称');
    assertTrue(statement.includes('北京文化投资'), '应包含投资人名称');
    assertTrue(statement.includes('成本抵扣'), '应包含成本抵扣章节');
    assertTrue(statement.includes('溯源记录'), '应包含溯源记录');
    console.log(`  分账单文本生成成功，长度: ${statement.length}字符`);
  });

  test('15. 生成分账单HTML格式', () => {
    const statement = exportService.generateSharingStatement(testData.sharingRecordId, { format: 'html' });
    assertTrue(statement.includes('<!DOCTYPE html>'), '应包含HTML文档头');
    assertTrue(statement.includes('流浪地球3'), '应包含影片名称');
    assertTrue(statement.includes('分账瀑布计算'), '应包含分账瀑布章节');
    assertTrue(statement.includes('成本抵扣明细'), '应包含成本抵扣章节');
    console.log(`  分账单HTML生成成功，长度: ${statement.length}字符`);
  });

  test('16. 投资人累计分配查询', () => {
    const distributions = sharingService.getInvestorTotalDistributions(testData.investorIds[0], testData.projectId);
    assertTrue(distributions.length > 0, '应返回分配记录');
    assertTrue(distributions[0].total_distributed > 0, '应有累计分配金额');
    console.log(`  北京文化累计分配: ${distributions[0].total_distributed.toFixed(2)}元, 次数: ${distributions[0].sharing_count}次`);
  });

  test('17. 项目汇总查询', () => {
    const summary = crudService.projects.getSummary(testData.projectId);
    assertEqual(summary.contract_count, 2, '应有2份合同');
    assertEqual(summary.revenue_plan_count, 2, '应有2个回款计划');
    assertTrue(summary.sharing_count > 0, '应有分账记录');
    assertTrue(summary.total_revenue > 0, '应有累计收入');
    console.log(`  项目汇总: 合同${summary.contract_count}份, 回款计划${summary.revenue_plan_count}个, 分账${summary.sharing_count}次, 累计收入${summary.total_revenue.toFixed(2)}元`);
  });

  test('18. 月底复盘月度报告', () => {
    const report = exportService.generateMonthlyReport(testData.projectId, '2026-05');
    assertTrue(report.summary.sharing_count >= 0, '应有分账次数统计');
    assertTrue(report.summary.total_revenue >= 0, '应有总收入统计');
    console.log(`  月度报告生成: ${report.title}, 分账${report.summary.sharing_count}次, 收入${report.summary.total_revenue_formatted}`);
  });

  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n总测试数: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);

  if (failed > 0) {
    console.log('\n失败详情:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✓ 所有测试通过！系统功能完整可用。\n');
}

runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
