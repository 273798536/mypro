const readline = require('readline');
const batchService = require('../services/batchService');
const importService = require('../services/importService');
const cleaningService = require('../services/cleaningService');
const reviewService = require('../services/reviewService');
const exportService = require('../services/exportService');
const dayjs = require('dayjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const statusLabels = {
  imported: '已导入',
  cleaning: '清洗中',
  cleaned: '已清洗',
  reviewing: '复核中',
  reviewed: '已复核',
  exported: '已导出',
};

const riskLabels = { high: '高风险', medium: '中风险', low: '低风险' };
const severityLabels = { high: '严重', medium: '中等', low: '轻微' };

const question = (q) => new Promise(resolve => rl.question(q, resolve));

const printSeparator = () => {
  console.log('─'.repeat(60));
};

const printHeader = () => {
  console.log('\n');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║      船舶 AIS 漂移清洗系统 (CLI)        ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
};

const listBatches = async () => {
  const batches = batchService.listBatches(20, 0);
  if (batches.length === 0) {
    console.log('  暂无批次数据');
    return;
  }
  console.log(`  共 ${batches.length} 个批次：`);
  printSeparator();
  batches.forEach((b, i) => {
    console.log(`  [${b.id}] ${b.name}`);
    console.log(`      状态: ${statusLabels[b.status] || b.status}  |  异常: ${b.anomaly_count || 0}  |  缺口: ${b.water_gap_count || 0}`);
    console.log(`      导入时间: ${dayjs(b.imported_at).format('YYYY-MM-DD HH:mm')}`);
  });
  printSeparator();
};

const showBatchDetail = async (batchId) => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) {
    console.log('  批次不存在');
    return;
  }

  console.log(`\n  批次: ${batch.name}`);
  printSeparator();
  console.log(`  状态:      ${statusLabels[batch.status] || batch.status}`);
  console.log(`  导入时间:  ${batch.imported_at}`);
  console.log(`  AIS点数:   ${batch.total_ais_points || 0}`);
  console.log(`  水质记录:  ${batch.total_water_records || 0}`);
  console.log(`  异常数量:  ${batch.anomaly_count || 0}`);
  console.log(`  水质缺口:  ${batch.water_gap_count || 0}`);
  if (batch.notes) console.log(`  备注:      ${batch.notes}`);
  printSeparator();
};

const listAnomaliesCli = async (batchId) => {
  const anomalies = cleaningService.listAnomalies(batchId, null, 50, 0);
  if (anomalies.length === 0) {
    console.log('  暂无异常数据');
    return;
  }
  console.log(`\n  共 ${anomalies.length} 条异常：`);
  printSeparator();
  anomalies.forEach((a, i) => {
    const riskColor = a.risk_level === 'high' ? '\x1b[31m' : a.risk_level === 'medium' ? '\x1b[33m' : '\x1b[32m';
    console.log(`  [${i + 1}] MMSI: ${a.mmsi}  ${riskColor}${riskLabels[a.risk_level] || ''}\x1b[0m`);
    console.log(`      类型: ${a.anomaly_type}  严重度: ${severityLabels[a.severity] || a.severity}`);
    console.log(`      描述: ${a.description || ''}`);
  });
  printSeparator();
};

const showAnomalyDetailCli = async (anomalyId) => {
  const detail = cleaningService.getAnomalyDetail(anomalyId);
  if (!detail) {
    console.log('  异常记录不存在');
    return;
  }

  const { anomaly, point, riskReport, reviews } = detail;

  console.log('\n  异常详情');
  printSeparator();
  console.log(`  MMSI:        ${anomaly.mmsi}`);
  console.log(`  异常类型:    ${anomaly.anomaly_type}`);
  console.log(`  严重程度:    ${severityLabels[anomaly.severity] || anomaly.severity}`);
  const riskColor = anomaly.risk_level === 'high' ? '\x1b[31m' : anomaly.risk_level === 'medium' ? '\x1b[33m' : '\x1b[32m';
  console.log(`  风险等级:    ${riskColor}${riskLabels[anomaly.risk_level] || anomaly.risk_level}\x1b[0m`);
  console.log(`  漂移距离:    ${anomaly.drift_distance ? anomaly.drift_distance.toFixed(0) + ' 米' : '-'}`);
  console.log(`  描述:        ${anomaly.description || ''}`);
  console.log(`  检测时间:    ${anomaly.detected_at}`);

  if (point) {
    console.log(`\n  轨迹点:`);
    console.log(`    时间: ${point.timestamp}`);
    console.log(`    位置: ${point.lon.toFixed(4)}, ${point.lat.toFixed(4)}`);
    console.log(`    船速: ${point.speed?.toFixed(2) || '-'} 节`);
  }

  if (riskReport) {
    console.log(`\n  风险通报:`);
    console.log(`    编号: ${riskReport.report_no}`);
    console.log(`    标题: ${riskReport.title}`);
    console.log(`    内容: ${riskReport.content?.substring(0, 100) || ''}...`);
  }

  if (reviews && reviews.length > 0) {
    console.log(`\n  复核意见 (${reviews.length}条):`);
    reviews.forEach((r, i) => {
      console.log(`    [${i + 1}] ${r.opinion}`);
      console.log(`        ${r.reviewer || '匿名'} · ${r.action || ''} · ${r.created_at}`);
    });
  } else {
    console.log(`\n  复核意见: 暂无`);
  }

  printSeparator();
};

const listWaterGapsCli = async (batchId) => {
  const gaps = reviewService.getWaterGaps(batchId);
  if (gaps.length === 0) {
    console.log('  暂无水质缺口');
    return;
  }
  console.log(`\n  共 ${gaps.length} 条水质数据缺口（需补录）：`);
  printSeparator();
  gaps.forEach((g, i) => {
    console.log(`  [${i + 1}] 站点: ${g.station_id}  时间: ${g.timestamp}`);
    console.log(`      位置: ${g.lon?.toFixed(4) || '-'}, ${g.lat?.toFixed(4) || '-'}`);
  });
  printSeparator();
};

const listReviewsCli = async (batchId) => {
  const reviews = reviewService.listReviewOpinions(batchId);
  if (reviews.length === 0) {
    console.log('  暂无复核记录');
    return;
  }
  console.log(`\n  共 ${reviews.length} 条复核记录：`);
  printSeparator();
  reviews.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.opinion}`);
    console.log(`      ${r.reviewer || '匿名'} ${r.action ? '【' + r.action + '】' : ''} ${r.created_at}`);
  });
  printSeparator();
};

const importBatchCli = async () => {
  console.log('\n  === 新建导入批次 ===');
  const name = await question('  批次名称: ');
  if (!name.trim()) {
    console.log('  名称不能为空');
    return;
  }
  const aisFile = await question('  AIS轨迹CSV路径 (回车跳过): ');
  const waterFile = await question('  水质记录CSV路径 (回车跳过): ');
  const notes = await question('  备注 (回车跳过): ');

  try {
    const result = await importService.createBatchWithFiles(
      name.trim(),
      aisFile.trim() || null,
      waterFile.trim() || null,
      notes.trim()
    );
    console.log(`\n  ✓ 导入成功！`);
    console.log(`    批次ID: ${result.batch.id}`);
    console.log(`    AIS点数: ${result.ais.count}`);
    console.log(`    水质记录: ${result.water.count} (缺失: ${result.water.missingCount})`);
  } catch (e) {
    console.log(`  ✗ 导入失败: ${e.message}`);
  }
};

const runCleaningCli = async (batchId) => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) {
    console.log('  批次不存在');
    return;
  }
  const confirm = await question(`  确定对批次 "${batch.name}" 执行漂移清洗？(y/N): `);
  if (confirm.toLowerCase() !== 'y') return;

  try {
    const result = cleaningService.runCleaning(batchId);
    console.log(`\n  ✓ 清洗完成！`);
    console.log(`    异常数量: ${result.anomalyCount}`);
    console.log(`    水质缺口: ${result.waterGapCount}`);
  } catch (e) {
    console.log(`  ✗ 清洗失败: ${e.message}`);
  }
};

const addReviewCli = async (batchId, anomalyId = null) => {
  console.log('\n  === 添加复核意见 ===');
  const reviewer = await question('  复核人 (回车匿名): ');
  console.log('  处理动作:');
  console.log('    1) 确认异常  2) 误报排除  3) 待补材料  4) 通报船方  0) 无');
  const actionChoice = await question('  选择: ');
  const actions = { '1': '确认异常', '2': '误报排除', '3': '待补材料', '4': '通报船方' };
  const action = actions[actionChoice] || '';
  const opinion = await question('  复核意见: ');
  if (!opinion.trim()) {
    console.log('  意见不能为空');
    return;
  }

  const result = reviewService.addReviewOpinion(
    batchId, anomalyId, opinion.trim(), action, reviewer.trim()
  );
  console.log(`  ✓ 复核意见已提交`);
};

const exportReportCli = async (batchId) => {
  console.log('\n  === 导出报告 ===');
  console.log('  导出格式:');
  console.log('    1) CSV  2) JSON');
  const choice = await question('  选择: ');

  try {
    if (choice === '1') {
      const report = exportService.exportReportCsv(batchId);
      const fs = require('fs');
      const path = require('path');
      const outPath = path.join(process.cwd(), report.filename);
      fs.writeFileSync(outPath, report.content);
      console.log(`  ✓ CSV报告已导出: ${outPath}`);
    } else if (choice === '2') {
      const report = exportService.exportReportJson(batchId);
      const fs = require('fs');
      const path = require('path');
      const filename = `ais_drift_report_${batchId}_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
      const outPath = path.join(process.cwd(), filename);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`  ✓ JSON报告已导出: ${outPath}`);
    }
  } catch (e) {
    console.log(`  ✗ 导出失败: ${e.message}`);
  }
};

const batchDetailMenu = async (batchId) => {
  while (true) {
    await showBatchDetail(batchId);
    console.log('  操作:');
    console.log('    1) 查看异常列表');
    console.log('    2) 查看水质缺口');
    console.log('    3) 查看复核记录');
    console.log('    4) 执行漂移清洗');
    console.log('    5) 添加复核意见 (批量)');
    console.log('    6) 导出报告');
    console.log('    7) 异常详情追溯 (输入异常编号)');
    console.log('    0) 返回上一级');

    const choice = await question('\n  请选择: ');

    if (choice === '0') break;
    if (choice === '1') {
      await listAnomaliesCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '2') {
      await listWaterGapsCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '3') {
      await listReviewsCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '4') {
      await runCleaningCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '5') {
      await addReviewCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '6') {
      await exportReportCli(batchId);
      await question('\n  按回车继续...');
    } else if (choice === '7') {
      const anomalies = cleaningService.listAnomalies(batchId, null, 50, 0);
      await listAnomaliesCli(batchId);
      const idx = await question('\n  输入异常序号查看详情 (0取消): ');
      const num = parseInt(idx);
      if (num > 0 && num <= anomalies.length) {
        const anomaly = anomalies[num - 1];
        await showAnomalyDetailCli(anomaly.id);
        const doReview = await question('  是否添加复核意见？(y/N): ');
        if (doReview.toLowerCase() === 'y') {
          await addReviewCli(batchId, anomaly.id);
        }
        await question('\n  按回车继续...');
      }
    }
  }
};

const mainMenu = async () => {
  while (true) {
    printHeader();
    await listBatches();
    console.log('  操作:');
    console.log('    1) 新建导入批次');
    console.log('    2) 选择批次查看详情 (输入批次ID)');
    console.log('    0) 退出');

    const choice = await question('\n  请选择: ');

    if (choice === '0') {
      console.log('\n  再见！');
      rl.close();
      process.exit(0);
    } else if (choice === '1') {
      await importBatchCli();
      await question('\n  按回车继续...');
    } else if (choice === '2') {
      const id = await question('  批次ID: ');
      if (id && parseInt(id) > 0) {
        await batchDetailMenu(parseInt(id));
      }
    } else {
      const batch = batchService.getBatchById(parseInt(choice));
      if (batch) {
        await batchDetailMenu(parseInt(choice));
      }
    }
  }
};

const runDirectCommand = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) return false;

  const cmd = args[0];

  if (cmd === 'list') {
    await listBatches();
    return true;
  }

  if (cmd === 'import' && args.length >= 2) {
    const name = args[1];
    const aisIdx = args.indexOf('--ais');
    const waterIdx = args.indexOf('--water');
    const aisFile = aisIdx >= 0 ? args[aisIdx + 1] : null;
    const waterFile = waterIdx >= 0 ? args[waterIdx + 1] : null;

    try {
      const result = await importService.createBatchWithFiles(name, aisFile, waterFile);
      console.log(`批次 ${result.batch.id} 创建成功: ${result.batch.name}`);
      console.log(`AIS: ${result.ais.count} 条, 水质: ${result.water.count} 条 (缺失 ${result.water.missingCount})`);
    } catch (e) {
      console.error(`导入失败: ${e.message}`);
    }
    return true;
  }

  if (cmd === 'clean' && args.length >= 2) {
    const batchId = parseInt(args[1]);
    try {
      const result = cleaningService.runCleaning(batchId);
      console.log(`清洗完成: ${result.anomalyCount} 个异常, ${result.waterGapCount} 个水质缺口`);
    } catch (e) {
      console.error(`清洗失败: ${e.message}`);
    }
    return true;
  }

  if (cmd === 'export' && args.length >= 3) {
    const batchId = parseInt(args[1]);
    const format = args[2];
    try {
      if (format === 'csv') {
        const report = exportService.exportReportCsv(batchId);
        const fs = require('fs');
        fs.writeFileSync(report.filename, report.content);
        console.log(`已导出: ${report.filename}`);
      } else if (format === 'json') {
        const report = exportService.exportReportJson(batchId);
        const fs = require('fs');
        const filename = `ais_drift_report_${batchId}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));
        console.log(`已导出: ${filename}`);
      }
    } catch (e) {
      console.error(`导出失败: ${e.message}`);
    }
    return true;
  }

  return false;
};

(async () => {
  const handled = await runDirectCommand();
  if (!handled) {
    mainMenu();
  } else {
    rl.close();
  }
})();
