const { GSI } = require('../dist/index');

async function runPipeline() {
  console.log('=== 服装打版样衣多源导入巡检 - 完整流程演示 ===\n');
  
  const inspector = new GSI('./demo.db', 'demo_user');

  try {
    console.log('1. 导入样衣流转单...');
    const sampleResult = await inspector.import({
      sourceType: 'sample_flow',
      filePath: './examples/sample_flow.csv',
      conflictStrategy: 'overwrite',
      importedBy: 'demo_user',
      dryRun: false
    });
    console.log(`   样衣导入: ${sampleResult.success} 成功, ${sampleResult.skipped} 跳过, ${sampleResult.failed} 失败\n`);

    console.log('2. 导入尺码修改意见...');
    const sizeResult = await inspector.import({
      sourceType: 'size_modification',
      filePath: './examples/size_modification.csv',
      conflictStrategy: 'overwrite',
      importedBy: 'demo_user'
    });
    console.log(`   尺码修改: ${sizeResult.success} 成功, ${sizeResult.failed} 失败\n`);

    console.log('3. 导入面料出入库...');
    const fabricResult = await inspector.import({
      sourceType: 'fabric_inout',
      filePath: './examples/fabric_inout.csv',
      conflictStrategy: 'overwrite',
      importedBy: 'demo_user'
    });
    console.log(`   面料交易: ${fabricResult.success} 成功, ${fabricResult.failed} 失败\n`);

    console.log('4. 运行数据校验...');
    const checkResults = await inspector.check();
    console.log(`   发现 ${checkResults.length} 个问题\n`);

    console.log('5. 自动修复可修复的问题...');
    const fixResults = await inspector.fixAll();
    const fixedCount = fixResults.filter(r => r.fixed).length;
    console.log(`   修复了 ${fixedCount} 个问题\n`);

    console.log('6. 生成品牌企划报告...');
    const report = await inspector.generateReport({ format: 'text' });
    console.log(report);

    console.log('7. 导出所有数据...');
    const files = await inspector.export({
      type: 'all',
      format: 'xlsx',
      outputDir: './export',
      includeSource: true
    });
    console.log(`   导出文件: ${files.join(', ')}\n`);

    console.log('8. 查看历史变更...');
    const history = inspector.getHistory({ limit: 10 });
    console.log(`   最近 ${history.length} 条操作记录\n`);

    console.log('=== 流程完成 ===');
  } catch (error) {
    console.error('流程出错:', error.message);
    process.exit(1);
  }
}

runPipeline();
