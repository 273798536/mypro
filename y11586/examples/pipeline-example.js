const { ContractComplianceAPI } = require('../dist/api');
const path = require('path');

async function runExample() {
  const workspace = path.join(__dirname, '..', 'demo-workspace');
  const exportDir = path.join(__dirname, '..', 'demo-exports');

  console.log('=== 法务合同履约多源导入巡检 - 完整流程示例 ===\n');

  const api = new ContractComplianceAPI(workspace, 'demo_user');

  console.log('1. 初始化工作空间...');
  await api.init();
  console.log('   ✓ 工作空间初始化完成\n');

  console.log('2. 导入合同数据...');
  const contractResult = await api.import(
    path.join(__dirname, 'sample-contracts.json'),
    'contract_pdf',
    'overwrite',
    '合同批量导入'
  );
  console.log(`   ✓ 导入完成: ${contractResult.successCount}/${contractResult.totalRecords} 条成功\n`);

  console.log('3. 导入付款节点数据...');
  const paymentResult = await api.import(
    path.join(__dirname, 'sample-payment-nodes.csv'),
    'payment_node',
    'append',
    '付款节点导入'
  );
  console.log(`   ✓ 导入完成: ${paymentResult.successCount}/${paymentResult.totalRecords} 条成功\n`);

  console.log('4. 导入退款记录...');
  const refundResult = await api.import(
    path.join(__dirname, 'sample-refunds.json'),
    'refund_record',
    'append',
    '退款记录导入'
  );
  console.log(`   ✓ 导入完成: ${refundResult.successCount}/${refundResult.totalRecords} 条成功\n`);

  console.log('5. 执行数据校验...');
  const checkReport = await api.check();
  console.log(`   ✓ 校验完成: 错误 ${checkReport.errorCount}, 警告 ${checkReport.warningCount}, 信息 ${checkReport.infoCount}\n`);

  console.log('6. 导出检查报告...');
  const reportPath = await api.exportCheckReport({
    format: 'json',
    outputDir: exportDir,
  });
  console.log(`   ✓ 报告已导出: ${reportPath}\n`);

  console.log('7. 导出完整数据...');
  const fullPath = await api.exportFullData({
    format: 'json',
    outputDir: exportDir,
    includeRaw: true,
  });
  console.log(`   ✓ 完整数据已导出: ${fullPath}\n`);

  console.log('8. 查看失败清单...');
  const failedList = await api.getFailedList();
  console.log(`   待处理错误: ${failedList.length} 项`);
  if (failedList.length > 0) {
    failedList.slice(0, 3).forEach(item => {
      console.log(`   - [行${item.originalLineNo || '-'}] ${item.contractNo}: ${item.message}`);
    });
  }
  console.log();

  console.log('9. 查看合同变更历史...');
  const contracts = await api.getContracts();
  if (contracts.length > 0) {
    const history = await api.getHistory(contracts[0].id);
    console.log(`   合同 ${contracts[0].contractNo} 变更记录: ${history.length} 条\n`);
  }

  console.log('=== 流程执行完成 ===');
  console.log(`工作空间: ${workspace}`);
  console.log(`导出目录: ${exportDir}`);
}

runExample().catch(console.error);
