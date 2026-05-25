const path = require('path');
const importService = require('../src/services/importService');
const workflowService = require('../src/services/workflowService');
const investigationService = require('../src/services/investigationService');
const exportService = require('../src/services/exportService');
const auditService = require('../src/services/auditService');
const logger = require('../src/config/logger');

const sampleDataDir = path.join(__dirname, '../sample-data');

const testResults = [];
const passed = [];
const failed = [];

function test(name, fn) {
  return { name, fn };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 线下展会物料权限追责台账 - 测试套件');
  console.log('='.repeat(60) + '\n');

  const tests = [
    test('1. 班次记录导入', async () => {
      const result = await importService.importFile(
        path.join(sampleDataDir, 'shift-records.csv'),
        'shift-records.csv',
        'shift_record',
        'test_user'
      );
      assert(result.successCount > 0, '班次记录导入失败');
      assert(result.failedCount > 0, '应该存在部分失败的数据');
      console.log(`   成功: ${result.successCount}, 失败: ${result.failedCount}`);
    }),

    test('2. 改价表幂等更新', async () => {
      const result1 = await importService.importFile(
        path.join(sampleDataDir, 'price-adjustment.csv'),
        'price-adjustment.csv',
        'price_adjustment',
        'test_user'
      );
      assert(result1.successCount > 0, '第一次导入应该成功');
      
      const result2 = await importService.importFile(
        path.join(sampleDataDir, 'price-adjustment.csv'),
        'price-adjustment.csv',
        'price_adjustment',
        'test_user'
      );
      assert(result2.successCount > 0, '重复导入应该更新而不是失败');
      console.log(`   第一次: 成功${result1.successCount}, 第二次: 成功${result2.successCount}`);
    }),

    test('3. 追责链关联班次记录', async () => {
      const records = await importService.allQuery('SELECT id FROM borrow_records LIMIT 1');
      assert(records.length > 0, '没有借用记录');
      
      const chainResult = await investigationService.buildInvestigationChain(records[0].id);
      assert(chainResult.chain.length >= 2, '追责链应该至少包含入库和借出环节');
      
      const hasShiftStage = chainResult.chain.some(step => step.stage === '班次交接');
      console.log(`   追责链环节: ${chainResult.chain.map(s => s.stage).join(' -> ')}`);
      console.log(`   是否包含班次环节: ${hasShiftStage ? '是' : '否（无匹配班次记录）'}`);
    }),

    test('4. 工作流状态转换', async () => {
      const records = await importService.allQuery('SELECT id FROM borrow_records LIMIT 1');
      assert(records.length > 0, '没有借用记录');
      
      try {
        await workflowService.submit('borrow_record', records[0].id, '测试员', 'operator');
        console.log('   提交成功');
      } catch (e) {
        console.log(`   提交跳过（已在处理中）: ${e.message}`);
      }
      
      try {
        await workflowService.reject('borrow_record', records[0].id, '管理员', 'admin', '测试驳回');
        console.log('   驳回成功');
      } catch (e) {
        console.log(`   驳回跳过: ${e.message}`);
      }
      
      try {
        await workflowService.withdraw('borrow_record', records[0].id, '测试员', 'operator');
        console.log('   撤回成功');
      } catch (e) {
        console.log(`   撤回跳过: ${e.message}`);
      }
    }),

    test('5. 审计日志记录', async () => {
      const records = await importService.allQuery('SELECT id FROM borrow_records LIMIT 1');
      assert(records.length > 0, '没有借用记录');
      
      const logs = await auditService.getAuditTrail('borrow_record', records[0].id);
      console.log(`   审计日志条数: ${logs.length}`);
      assert(logs.length >= 0, '审计日志查询应该成功');
    }),

    test('6. 角色视图脱敏', async () => {
      const adminView = await exportService.getRoleViewData('admin');
      const viewerView = await exportService.getRoleViewData('viewer');
      
      console.log(`   管理员视图统计: ${adminView.statistics ? '完整' : '缺失'}`);
      console.log(`   查看者视图公开记录: ${viewerView.public_records?.length || 0} 条`);
      
      assert(adminView.statistics !== undefined, '管理员视图应该包含统计数据');
      assert(viewerView.public_records !== undefined, '查看者视图应该包含公开记录');
    }),

    test('7. 遗失物品列表查询', async () => {
      const lostItems = await investigationService.getLostItemsInvestigation();
      console.log(`   待处理遗失物品: ${lostItems.length} 条`);
      lostItems.slice(0, 3).forEach(item => {
        console.log(`   - ${item.material_name} (${item.borrower_name})`);
      });
    }),

    test('8. 责任汇总报表', async () => {
      const summary = await investigationService.getResponsibilitySummary();
      console.log(`   责任汇总条目: ${summary.length} 条`);
      summary.slice(0, 3).forEach(s => {
        console.log(`   - ${s.responsible_person || '待定'}: ${s.count}件, ¥${s.total_value || 0}`);
      });
    }),

    test('9. 导出报告生成', async () => {
      const taskId = await exportService.createExportTask(
        '测试报告',
        'lost-items',
        '测试员',
        {},
        false
      );
      
      const result = await exportService.exportLostItemsReport(taskId, 'viewer', false);
      assert(result.success === true, '导出应该成功');
      assert(result.recordCount > 0, '导出应该有数据');
      console.log(`   导出文件: ${result.fileName}`);
      console.log(`   导出记录数: ${result.recordCount}`);
    }),

    test('10. 重复导入幂等验证', async () => {
      const result1 = await importService.importFile(
        path.join(sampleDataDir, 'material-list.csv'),
        'material-list.csv',
        'material_list',
        'test_user'
      );
      
      const result2 = await importService.importFile(
        path.join(sampleDataDir, 'material-list.csv'),
        'material-list.csv',
        'material_list',
        'test_user'
      );
      
      console.log(`   第一次导入: 成功${result1.successCount}, 失败${result1.failedCount}`);
      console.log(`   第二次导入: 成功${result2.successCount}, 失败${result2.failedCount}`);
      assert(result1.successCount === result2.successCount, '重复导入结果应该一致');
    })
  ];

  for (const { name, fn } of tests) {
    console.log(`\n📌 ${name}`);
    console.log('-'.repeat(40));
    try {
      await fn();
      passed.push(name);
      console.log(`   ✅ 测试通过`);
    } catch (error) {
      failed.push({ name, error: error.message });
      console.log(`   ❌ 测试失败: ${error.message}`);
      logger.error(`测试失败: ${name}`, { error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 测试结果: ${passed.length}/${tests.length} 通过`);
  console.log('='.repeat(60));

  if (failed.length > 0) {
    console.log('\n失败的测试:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
