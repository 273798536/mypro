const { ContractComplianceAPI } = require('../dist/api');
const path = require('path');

async function runFixAndReimportExample() {
  const workspace = path.join(__dirname, '..', 'fix-demo-workspace');
  const exportDir = path.join(__dirname, '..', 'fix-demo-exports');

  console.log('=== 法务合同履约 - 修正后重新导入闭环示例 ===\n');

  const api = new ContractComplianceAPI(workspace, 'fix_demo_user');

  console.log('1. 初始化工作空间...');
  await api.init();
  console.log('   ✓ 完成\n');

  console.log('2. 第一次导入（模拟有问题的数据）...');
  
  const paymentNodesWithIssue = [
    {
      contractNo: 'HTFIX001',
      nodeId: 'FIXP001',
      nodeName: '预付款',
      plannedDate: '2024-01-15',
      actualDate: '',
      plannedAmount: 150000,
      actualAmount: '',
      status: 'paid'
    },
    {
      contractNo: 'HTFIX001',
      nodeId: 'FIXP002',
      nodeName: '验收款',
      plannedDate: '2024-06-30',
      actualDate: '',
      plannedAmount: 350000,
      actualAmount: '',
      status: 'planned'
    }
  ];

  const fs = require('fs');
  const tempFile = path.join(__dirname, 'temp-payment-nodes.json');
  await fs.promises.writeFile(tempFile, JSON.stringify(paymentNodesWithIssue, null, 2));

  const contractData = [{
    contractNo: 'HTFIX001',
    contractName: '修正演示合同',
    partyA: '甲方公司',
    partyB: '乙方公司',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    totalAmount: 500000,
    currency: 'CNY',
    paymentTerms: [
      { termId: 'T1', description: '预付款', dueDate: '2024-01-15', amount: 150000 },
      { termId: 'T2', description: '验收款', dueDate: '2024-06-30', amount: 350000 }
    ],
    sourceFile: 'demo'
  }];
  const contractFile = path.join(__dirname, 'temp-contract.json');
  await fs.promises.writeFile(contractFile, JSON.stringify(contractData, null, 2));

  await api.import(contractFile, 'contract_pdf', 'overwrite', '修正演示-合同导入');
  const importResult = await api.import(tempFile, 'payment_node', 'append', '修正演示-第一次导入(含问题)');
  console.log(`   ✓ 导入完成: ${importResult.successCount}/${importResult.totalRecords} 条成功`);
  console.log('   注意: 预付款状态为paid但缺少实际金额\n');

  console.log('3. 执行校验，发现问题...');
  const checkReport1 = await api.check();
  console.log(`   ✓ 校验完成: 错误 ${checkReport1.errorCount}, 警告 ${checkReport1.warningCount}`);
  
  const warnings = checkReport1.results.filter(r => r.severity === 'warning' && !r.resolved);
  warnings.forEach(w => {
    console.log(`   ⚠️  [行${w.originalLineNo || '-'}] ${w.contractNo}: ${w.message}`);
    console.log(`       实体类型: ${w.entityType}, 实体ID: ${w.entityId}, 字段: ${w.sourceField}`);
  });
  console.log();

  console.log('4. 修正数据 - 补充预付款实际金额...');
  const paymentNodesFixed = [
    {
      contractNo: 'HTFIX001',
      nodeId: 'FIXP001',
      nodeName: '预付款',
      plannedDate: '2024-01-15',
      actualDate: '2024-01-12',
      plannedAmount: 150000,
      actualAmount: '150000',
      status: 'paid'
    }
  ];
  const fixedFile = path.join(__dirname, 'temp-payment-nodes-fixed.json');
  await fs.promises.writeFile(fixedFile, JSON.stringify(paymentNodesFixed, null, 2));

  console.log('   方式1: 使用 overwrite 模式重新导入修正后的数据');
  const reimportResult = await api.import(fixedFile, 'payment_node', 'overwrite', '修正演示-覆盖导入(修正后)');
  console.log(`   ✓ 重新导入完成: ${reimportResult.successCount}/${reimportResult.totalRecords} 条成功\n`);

  console.log('5. 方式2: 直接使用 API 修正数据（无需重新导入文件）');
  const fixResult = await api.updatePaymentNode('FIXP002', {
    actualAmount: 350000,
    actualDate: '2024-07-01',
    status: 'paid'
  }, '补录付款信息');
  console.log(`   ✓ 直接修正成功: ${fixResult ? '是' : '否'}`);
  console.log(`   更新后状态: ${fixResult?.status}, 实际金额: ${fixResult?.actualAmount}\n`);

  console.log('6. 重新校验，确认问题已解决...');
  const checkReport2 = await api.check();
  console.log(`   ✓ 重新校验完成: 错误 ${checkReport2.errorCount}, 警告 ${checkReport2.warningCount}`);
  
  const remainingIssues = checkReport2.results.filter(r => !r.resolved && r.severity !== 'info');
  if (remainingIssues.length > 0) {
    console.log('   剩余问题:');
    remainingIssues.forEach(r => console.log(`   - ${r.message}`));
  } else {
    console.log('   ✓ 所有错误和警告已解决!\n');
  }

  console.log('7. 查看变更历史，追踪所有修改...');
  const contracts = await api.getContracts();
  if (contracts.length > 0) {
    const history = await api.getHistory();
    const paymentNodeChanges = history.filter(h => h.entityType === 'PaymentNode');
    console.log(`   付款节点变更记录: ${paymentNodeChanges.length} 条`);
    paymentNodeChanges.slice(-5).forEach(h => {
      console.log(`   - ${h.changedAt.substring(0, 19)} ${h.changedBy} 修改 ${h.field}: ` +
                  `${JSON.stringify(h.oldValue)} → ${JSON.stringify(h.newValue)} (${h.reason})`);
    });
  }
  console.log();

  console.log('8. 导出修正后的完整报告...');
  const reportPath = await api.exportCheckReport({ format: 'json', outputDir: exportDir });
  const historyPath = await api.exportImportHistory({ format: 'json', outputDir: exportDir });
  const fullPath = await api.exportFullData({ format: 'json', outputDir: exportDir, includeRaw: true });
  
  console.log(`   ✓ 检查报告: ${reportPath}`);
  console.log(`   ✓ 导入历史: ${historyPath}`);
  console.log(`   ✓ 完整数据: ${fullPath}\n`);

  console.log('=== 修正后重新导入闭环演示完成 ===');
  console.log('关键特性:');
  console.log('  ✓ 中文表头\"实际金额\"正确读取入库');
  console.log('  ✓ overwrite 模式正确更新付款节点，而非只更新批次');
  console.log('  ✓ fix 支持修改付款节点等多实体字段');
  console.log('  ✓ 变更历史完整记录时间、操作者、原因');
  console.log('  ✓ 支持修正后重新导入或直接API修正两种方式');
  console.log('  ✓ 导出报告包含原始行号、实体类型、检查结果ID');

  await fs.promises.unlink(tempFile).catch(() => {});
  await fs.promises.unlink(contractFile).catch(() => {});
  await fs.promises.unlink(fixedFile).catch(() => {});
}

runFixAndReimportExample().catch(console.error);
