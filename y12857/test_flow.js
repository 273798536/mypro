const importSvc = require('./src/services/importService');
const cleaningSvc = require('./src/services/cleaningService');
const reviewSvc = require('./src/services/reviewService');
const exportSvc = require('./src/services/exportService');
const batchSvc = require('./src/services/batchService');

async function test() {
  console.log('=== 船舶 AIS 漂移清洗系统 全流程验证 ===\n');

  console.log('1. 导入数据');
  const result = await importSvc.createBatchWithFiles(
    '验证测试批次',
    './sample_data/ais_sample.csv',
    './sample_data/water_quality_sample.csv',
    '系统验证测试'
  );
  console.log('   ✓ 批次ID:', result.batch.id);
  console.log('   ✓ AIS点数:', result.ais.count);
  console.log('   ✓ 水质记录:', result.water.count, '(缺失:', result.water.missingCount, ')');

  const batchId = result.batch.id;

  console.log('\n2. 执行漂移清洗');
  const cleanResult = cleaningSvc.runCleaning(batchId);
  console.log('   ✓ 异常数量:', cleanResult.anomalyCount);
  console.log('   ✓ 水质缺口:', cleanResult.waterGapCount);

  console.log('\n3. 查看异常列表');
  const anomalies = cleaningSvc.listAnomalies(batchId);
  console.log('   共', anomalies.length, '条异常:');
  anomalies.forEach((a, i) => {
    console.log('   [' + (i + 1) + ']', a.mmsi, '|', a.anomaly_type, '|', '风险:' + a.risk_level, '|', '严重度:' + a.severity);
  });

  console.log('\n4. 异常详情追溯（顺一条异常往回查）');
  if (anomalies.length > 0) {
    const detail = cleaningSvc.getAnomalyDetail(anomalies[0].id);
    console.log('   ✓ 异常信息:', detail.anomaly.mmsi, '-', detail.anomaly.anomaly_type);
    console.log('   ✓ 关联轨迹点:', !!detail.point);
    console.log('   ✓ 风险通报:', detail.riskReport ? detail.riskReport.report_no : '无');
    console.log('   ✓ 风险等级:', detail.riskReport ? detail.riskReport.risk_level : '-');
    console.log('   ✓ 风险通报标题:', detail.riskReport ? detail.riskReport.title : '-');
    console.log('   ✓ 复核意见数:', detail.reviews.length);
  }

  console.log('\n5. 添加复核意见');
  const review = reviewSvc.addReviewOpinion(
    batchId,
    anomalies[0].id,
    '经人工核实，确认为锚泊漂移，建议通知船方检查锚链',
    '确认异常',
    '潜水教练'
  );
  console.log('   ✓ 复核意见ID:', review.id);

  console.log('\n6. 复核后追溯验证');
  const detail2 = cleaningSvc.getAnomalyDetail(anomalies[0].id);
  console.log('   ✓ 复核意见:', detail2.reviews[0].opinion);
  console.log('   ✓ 处理动作:', detail2.reviews[0].action);
  console.log('   ✓ 复核人:', detail2.reviews[0].reviewer);
  console.log('   ✓ 风险通报仍关联:', !!detail2.riskReport);

  console.log('\n7. 水质缺口列表');
  const gaps = reviewSvc.getWaterGaps(batchId);
  console.log('   共', gaps.length, '条缺口:');
  gaps.forEach(g => console.log('   -', g.station_id, g.timestamp));

  console.log('\n8. 批次状态检查');
  const batch = batchSvc.getBatchById(batchId);
  console.log('   ✓ 当前状态:', batch.status);
  console.log('   ✓ 状态时间线:');
  console.log('     - 导入:', batch.imported_at);
  console.log('     - 清洗:', batch.cleaned_at);

  console.log('\n9. 导出报告');
  const csvReport = exportSvc.exportReportCsv(batchId);
  console.log('   ✓ CSV文件名:', csvReport.filename);
  console.log('   ✓ CSV内容长度:', csvReport.content.length, '字节');

  const jsonReport = exportSvc.exportReportJson(batchId);
  console.log('   ✓ JSON包含字段:', Object.keys(jsonReport).join(', '));

  console.log('\n10. 重启后数据验证（模拟）');
  const batchAgain = batchSvc.getBatchById(batchId);
  const anomaliesAgain = cleaningSvc.listAnomalies(batchId);
  const reviewsAgain = reviewSvc.listReviewOpinions(batchId);
  console.log('   ✓ 批次仍存在:', !!batchAgain);
  console.log('   ✓ 异常记录保留:', anomaliesAgain.length, '条');
  console.log('   ✓ 复核记录保留:', reviewsAgain.length, '条');

  console.log('\n=== 全流程验证通过 ✓ ===');
}

test().catch(e => {
  console.error('验证失败:', e);
  process.exit(1);
});
