import 'reflect-metadata';
import chalk from 'chalk';
import { initDatabase, closeDatabase } from '../src/config/database';
import { DataGenerator } from '../src/services/DataGenerator';
import { BatchTraceService } from '../src/services/BatchTraceService';
import { ExportService } from '../src/services/ExportService';
import { ConflictStrategy, ExportFormat, ExportType } from '../src/entities';

async function runNormalFlow() {
  console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue('║                    正常链路验收测试                           ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════════════════════╝\n'));

  await initDatabase();

  const dataGenerator = new DataGenerator();
  const traceService = new BatchTraceService();
  const exportService = new ExportService();

  const BATCH_NO = 'BATCH-20260524-001';
  const POT_NO = 'POT-001';
  const OPERATOR = 'test_user_001';

  try {
    console.log(chalk.yellow('\n【测试 1/6】生成测试数据...'));
    const dataResult = await dataGenerator.generateBatchData({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '招牌红烧肉',
      storeCount: 5,
      hasAbnormalTemp: false,
      hasComplaint: false,
      operator: OPERATOR,
    });
    console.log(chalk.green('✓ 留样标签:'), dataResult.sampleLabel.id);
    console.log(chalk.green('✓ 温度记录:'), dataResult.temperatureRecords.length, '条');
    console.log(chalk.green('✓ 门店交接:'), dataResult.handovers.length, '条');
    console.log(chalk.green('✓ 门店投诉:'), dataResult.complaints.length, '条');
    console.log(chalk.green('✓ 测试数据生成完成'));

    console.log(chalk.yellow('\n【测试 2/6】创建批次链路...'));
    const trace = await traceService.createTrace({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '招牌红烧肉',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.ERROR,
      operator: OPERATOR,
    });
    console.log(chalk.green('✓ 链路编号:'), trace.traceNo);
    console.log(chalk.green('✓ 批次-锅次:'), `${trace.batchNo}-${trace.potNo}`);
    console.log(chalk.green('✓ 初始状态:'), trace.status);
    console.log(chalk.green('✓ 批次链路创建完成'));

    console.log(chalk.yellow('\n【测试 3/6】处理批次链路...'));
    const processed = await traceService.processTrace({
      traceNo: trace.traceNo,
      operator: OPERATOR,
    });
    console.log(chalk.green('✓ 处理后状态:'), processed.status);
    console.log(chalk.green('✓ 留样标签数:'), processed.sampleLabelCount);
    console.log(chalk.green('✓ 温度记录数:'), processed.temperatureRecordCount);
    console.log(chalk.green('✓ 门店交接数:'), processed.handoverCount);
    console.log(chalk.green('✓ 涉及门店数:'), processed.totalStores);
    console.log(chalk.green('✓ 已完成门店:'), processed.completedStores);
    console.log(chalk.green('✓ 批次链路处理完成'));

    console.log(chalk.yellow('\n【测试 4/6】查询涉及门店...'));
    const stores = await traceService.getTraceStores(trace.traceNo);
    console.log(chalk.green('✓ 门店数量:'), stores.length);
    stores.forEach((store: any, idx: number) => {
      console.log(`  ${idx + 1}. ${store.storeName} - ${store.status}`);
    });
    console.log(chalk.green('✓ 门店查询完成'));

    console.log(chalk.yellow('\n【测试 5/6】查询操作历史...'));
    const history = await traceService.getTraceHistory(trace.traceNo);
    console.log(chalk.green('✓ 历史记录数:'), history.length);
    history.forEach((log: any, idx: number) => {
      console.log(`  ${idx + 1}. [${log.operationTime.toLocaleString()}] ${log.operator} - ${log.operationType}`);
    });
    console.log(chalk.green('✓ 历史查询完成'));

    console.log(chalk.yellow('\n【测试 6/6】冻结并导出...'));
    const frozen = await traceService.freezeTrace({
      traceNo: trace.traceNo,
      operator: OPERATOR,
      reason: '验收测试-导出前冻结',
    });
    console.log(chalk.green('✓ 冻结后状态:'), frozen.status);

    const exportRecord = await exportService.createExport({
      exportType: ExportType.FULL_TRACE,
      format: ExportFormat.JSON,
      traceNo: trace.traceNo,
      operator: OPERATOR,
    });
    const exportResult = await exportService.executeExport(exportRecord.exportNo, OPERATOR);
    console.log(chalk.green('✓ 导出状态:'), exportResult.status);
    console.log(chalk.green('✓ 导出记录数:'), exportResult.recordCount);
    console.log(chalk.green('✓ 导出文件:'), exportResult.filePath);
    console.log(chalk.green('✓ 冻结导出完成'));

    console.log(chalk.green('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.green('║                    正常链路测试通过!                         ║'));
    console.log(chalk.green('╚══════════════════════════════════════════════════════════════╝\n'));

    return { success: true, traceNo: trace.traceNo };
  } catch (error: any) {
    console.error(chalk.red('\n✗ 正常链路测试失败:'), error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  runNormalFlow().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}

export { runNormalFlow };