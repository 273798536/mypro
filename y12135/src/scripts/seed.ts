import { getDatabase } from '../db/database';
import { MonitoringRepository } from '../repositories/monitoringRepository';
import { MonitoringService } from '../services/monitoringService';
import { generatePhase1SampleData, generatePhase2SampleData } from '../services/sampleDataGenerator';

async function runSeed() {
  console.log('开始生成样例数据...\n');

  const db = await getDatabase();
  const repository = new MonitoringRepository(db);
  const service = new MonitoringService(repository);

  const phase1Data = generatePhase1SampleData();
  console.log(`第一阶段：准备导入 ${phase1Data.sensors.length} 个传感器，${phase1Data.temperatureRecords.length} 条温度记录`);

  const phase1Result = await service.importPhase1(phase1Data, 'seed_script');
  console.log(`✓ 第一阶段完成：${phase1Result.summary.anomalies} 条异常记录\n`);
  console.log(`  ${phase1Result.summary.phase1Comparison.after.message}\n`);

  const phase2Data = generatePhase2SampleData();
  console.log(`第二阶段：准备导入 ${phase2Data.cableArchives.length} 份桥索档案`);

  const phase2Result = await service.importPhase2(phase2Data, 'seed_script');
  console.log(`✓ 第二阶段完成：${phase2Result.affectedDetails.length} 条明细受影响并重新分析\n`);

  console.log('前后变化对比：');
  console.log(`  导入前：${phase2Result.summary.phase2Comparison.before.message}`);
  console.log(`  导入后：${phase2Result.summary.phase2Comparison.after.message}`);
  console.log(`  变化：`);
  phase2Result.summary.phase2Comparison.changes.forEach(change => {
    console.log(`    - ${change}`);
  });

  console.log('\n边界样例说明：');
  console.log('  1. 温度漂移：SNS-CABLE-001 在 2026-05-01T20:00 ~ T22:00 温度异常升高到 45-50°C');
  console.log('  2. 传感器断点：SNS-CABLE-002 在 2026-05-01T10:00 频率和温度同时缺失');
  console.log('  3. 传感器异常：SNS-CABLE-002 在 2026-05-01T11:00 频率突变下降70%');
  console.log('  4. 风速缺测：SNS-CABLE-003 在 2026-05-02T06:00 ~ T11:00 风速数据缺失');
  console.log('  5. 疑似损伤：SNS-CABLE-001 在 2026-05-02T12:00 ~ T23:00 频率持续下降30%');

  const stats = await service.getStatistics();
  console.log('\n统计概览：');
  console.log(`  传感器总数：${stats.totalSensors}`);
  console.log(`  记录总数：${stats.totalRecords}`);
  console.log(`  异常总数：${stats.totalAnomalies}`);
  console.log(`  受桥索档案影响：${stats.affectedByArchive} 条`);

  console.log('\n样例数据生成完成！');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('生成样例数据失败:', err);
  process.exit(1);
});
