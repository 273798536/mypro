const batchService = require('./src/services/batchService');
const importService = require('./src/services/importService');
const reviewService = require('./src/services/reviewService');
const riskService = require('./src/services/riskService');
const reportService = require('./src/services/reportService');
const exportService = require('./src/services/exportService');
const { resetDatabase } = require('./src/db/database');
const fs = require('fs');
const path = require('path');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
function c(t, color) { return colors[color] + t + colors.reset; }
function ok(t) { console.log('  ' + c('✓', 'green') + ' ' + t); }
function section(title) { console.log('\n' + c('===== ' + title + ' =====', 'bold')); }

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { ok(name + (detail ? ' (' + detail + ')' : '')); passed++; }
  else { console.log('  ' + c('✗ ' + name + (detail ? ' (' + detail + ')' : ''), 'red')); failed++; process.exitCode = 1; }
}

console.log(c('========================================', 'cyan'));
console.log(c(' 港区危险品泊位检查 - 新建批次全链路测试', 'bold'));
console.log(c('========================================', 'cyan'));

// 先重置数据库，保证测试起点干净
section('【0】重置数据库');
resetDatabase();
const noBatches = batchService.getAllBatches();
check('重置后无批次', noBatches.length === 0);

// ===== 1. 新建空批次 =====
section('【1】新建空批次');
const b = batchService.createBatch('TEST-FULL-' + Date.now().toString().slice(-6), '测试批次-进口危险品泊位核查', '通过导入API链路从头跑一遍');
check('批次创建成功', !!b && b.id > 0);
check('初始状态为 imported', b.status === 'imported');
check('初始版本为 v1', b.current_version === 1);
check('批次号正确', b.batch_no.indexOf('TEST-FULL-') === 0);
const batchId = b.id;
const m0 = batchService.getBatchMaterials(batchId);
check('空批次无材料',
  m0.buoyData.length + m0.tideTables.length + m0.weatherForecasts.length +
  m0.restrictedZoneViolations.length + m0.inspectionPhotos.length + m0.aquacultureLogs.length === 0);

// ===== 2. 一键导入样例材料（通过 importService） =====
section('【2】通过 importService 一键导入样例材料');
const imported = importService.importAllFromSample(batchId);
check('返回结构包含 details', !!imported.details);
const d = imported.details;
check('浮标数据导入', d.buoy.inserted > 0, `${d.buoy.inserted}/${d.buoy.total} 条`);
check('潮汐表导入', d.tide.inserted > 0, `${d.tide.inserted}/${d.tide.total} 条`);
check('气象预报导入', d.weather.inserted > 0, `${d.weather.inserted}/${d.weather.total} 条`);
check('禁航区越界导入', d.violation.inserted > 0, `${d.violation.inserted}/${d.violation.total} 条`);
check('巡检照片导入', d.photo.inserted > 0, `${d.photo.inserted}/${d.photo.total} 张`);
check('养殖日志导入', d.aquaculture.inserted > 0, `${d.aquaculture.inserted}/${d.aquaculture.total} 条`);
check('浮标重复检测数组字段存在', Array.isArray(d.buoy.duplicates));
check('照片缺失计数', d.photo.missingCount > 0, `缺失 ${d.photo.missingCount} 张`);
check('养殖补录计数', d.aquaculture.supplementaryCount > 0, `补录 ${d.aquaculture.supplementaryCount} 条`);

const m1 = batchService.getBatchMaterials(batchId);
check('6类材料均有数据',
  m1.buoyData.length > 0 && m1.tideTables.length > 0 && m1.weatherForecasts.length > 0 &&
  m1.restrictedZoneViolations.length > 0 && m1.inspectionPhotos.length > 0 && m1.aquacultureLogs.length > 0);
check('样例坏数据：浮标无效记录', m1.buoyData.some(x => x.is_valid === 0));
check('样例坏数据：潮汐表旧备注', m1.tideTables.some(x => x.old_remark));
check('样例坏数据：照片缺失', m1.inspectionPhotos.some(x => x.is_missing === 1));
check('样例坏数据：养殖日志补录', m1.aquacultureLogs.some(x => x.is_supplementary === 1));
check('重复上报追踪数据', m1.duplicateTracking.length > 0);

// 辅助函数：把某个版本所有 pending 项全部 approve（相当于前端「全部通过」）
function approveAllPending(batchId) {
  const ver = batchService.getBatchById(batchId).current_version;
  const m = batchService.getBatchMaterials(batchId);
  const tables = [
    { type: 'buoy', rows: m.buoyData },
    { type: 'tide', rows: m.tideTables },
    { type: 'weather', rows: m.weatherForecasts },
    { type: 'violation', rows: m.restrictedZoneViolations },
    { type: 'photo', rows: m.inspectionPhotos },
    { type: 'aquaculture', rows: m.aquacultureLogs }
  ];
  let count = 0;
  for (const t of tables) {
    for (const r of t.rows) {
      if (r.review_status === 'pending' && r.version === ver) {
        reviewService.reviewSingleItem(batchId, t.type, r.id, 'approved', '自动化测试', 'approveAll 批量通过');
        count++;
      }
    }
  }
  return count;
}

// ===== 3. 逐类单独复核 =====
section('【3】逐类材料复核 - 先单独复核几个再批量');
const summaryBefore = reviewService.getReviewSummary(batchId);
check('复核前 pending 数量 > 0', summaryBefore.pendingItems > 0);

// 3a. 浮标单独复核（专用接口，可修改数值）
const badBuoy = m1.buoyData.find(x => x.buoy_id === 'FB-011');
if (badBuoy) {
  const r = reviewService.reviewBuoyItem(
    batchId, badBuoy.id,
    { water_depth: 11.5, flow_velocity: 0.8, review_status: 'approved' },
    '科研助理小王', '原数值-1.5m异常，校准后修正为11.5m'
  );
  check('浮标 FB-011 单独复核保存', r.success);
  const afterFix = batchService.getBatchMaterials(batchId).buoyData.find(x => x.id === badBuoy.id);
  check('浮标数值已更新', afterFix.water_depth === 11.5);
  check('浮标状态已 approved', afterFix.review_status === 'approved');
  check('浮标复核人保存', afterFix.reviewer === '科研助理小王');
}

// 3b. 潮汐表 某条单独复核
const tideItem = m1.tideTables[0];
const rTide = reviewService.reviewSingleItem(
  batchId, 'tide', tideItem.id, 'approved', '张工', '数据与海事局潮汐表一致'
);
check('潮汐表单条复核', rTide.success);

// 3c. 越界记录 某条驳回
const violItem = m1.restrictedZoneViolations[0];
const rViol = reviewService.reviewSingleItem(
  batchId, 'violation', violItem.id, 'rejected', '李工', '坐标判定错误，船并未越界'
);
check('越界记录驳回保存', rViol.success);

// 3d. 其余项全部通过，再提交整批复核
const approveCnt = approveAllPending(batchId);
check('approveAll 批量通过剩余项', approveCnt > 0, `通过 ${approveCnt} 条`);
const sub1 = reviewService.submitBatchReview(batchId, '张工', '首轮复核完成，整体通过');
check('整批复核提交', sub1.success);
check('版本升级 v1→v2', sub1.newVersion === 2);

const m2 = batchService.getBatchMaterials(batchId);
const sum1 = reviewService.getReviewSummary(batchId, 1);
const sum2 = reviewService.getReviewSummary(batchId, 2);
check('v1 复核 0 pending', sum1.pendingItems === 0);
check('v2 浮标数量与 v1 一致', m2.buoyData.length === m1.buoyData.length);
check('v2 潮汐数量与 v1 一致', m2.tideTables.length === m1.tideTables.length);
check('v2 材料全部重置为 pending（版本隔离机制）', sum2.byType.buoy.pending === m2.buoyData.length);

// ===== 4. 风险评估 =====
section('【4】风险评估');
const risk1 = riskService.assessRisk(batchId, '评估员老陈');
check('风险评估生成', !!risk1 && risk1.version === 2);
check('评估版本 v2', risk1.version === 2);
check('风险等级有效', ['low', 'medium', 'high'].indexOf(risk1.riskLevel) >= 0);
check('风险分值 0~100', risk1.riskScore >= 0 && risk1.riskScore <= 100);
const latest = riskService.getLatestAssessment(batchId);
check('最新评估匹配', latest.risk_level === risk1.riskLevel);
console.log('  ' + c('→ 风险等级: ' + (risk1.riskLevel === 'high' ? '高' : risk1.riskLevel === 'medium' ? '中' : '低') +
  '，分值: ' + risk1.riskScore, 'cyan'));

// ===== 5. 二次复核 (版本对比) =====
section('【5】二次复核 - 修改浮标后重新评估，验证版本对比');
// v2 改一条浮标，升级到 v3
const buoyV2 = m2.buoyData[0];
reviewService.reviewBuoyItem(batchId, buoyV2.id,
  { water_depth: buoyV2.water_depth + 2, review_status: 'approved' },
  '复核人', '微调水深');
approveAllPending(batchId);
const sub2 = reviewService.submitBatchReview(batchId, '张工', '二次复核');
check('v2→v3 升级', sub2.newVersion === 3);
riskService.assessRisk(batchId, '评估员老陈');

const compare = riskService.compareRiskVersions(batchId, 2, 3);
check('版本对比可用', !!compare && compare.versionA === 2);
check('对比含两份评估等级', !!compare.levelA && !!compare.levelB);
check('对比含等级变化标记', compare.levelChanged !== undefined);
check('对比含因素增减', !!compare.addedFactors && !!compare.removedFactors);

// ===== 6. 报告生成 =====
section('【6】报告生成');
const rep1 = reportService.generateReport(batchId, '系统');
check('报告生成成功', !!rep1 && rep1.id > 0);
check('报告版本号正确 (v3)', rep1.version === 3);
check('报告编号非空', !!rep1.reportNo);
const reportText = rep1.reportContent.plainText;
check('报告内容包含章节（重复上报/缺料）',
  reportText.indexOf('重复上报') >= 0 && reportText.indexOf('缺失') >= 0);
const repLatest = reportService.getLatestReport(batchId);
check('最新报告匹配', repLatest.report_no === rep1.reportNo);

// ===== 7. 导出 JSON / CSV / TXT =====
section('【7】数据导出验证');
const jsonOut = exportService.exportJson(batchId);
check('JSON 导出版本正确 (v3)', jsonOut.batch.exported_version === 3);
check('JSON 含 6 类材料',
  jsonOut.materials.buoy_data.length > 0 &&
  jsonOut.materials.tide_tables.length > 0 &&
  jsonOut.materials.weather_forecasts.length > 0 &&
  jsonOut.materials.restricted_zone_violations.length > 0 &&
  jsonOut.materials.inspection_photos.length > 0 &&
  jsonOut.materials.aquaculture_logs.length > 0);
check('JSON 含风险评估', !!jsonOut.risk_assessment);
check('JSON 含报告信息', !!jsonOut.report);
check('JSON 含复核操作记录', jsonOut.review_records.length > 0);

const csvOut = exportService.exportCsv(batchId);
check('CSV 批次信息存在', !!csvOut.files['_批次信息.csv']);
check('CSV 浮标文件含 BOM', csvOut.files['1_浮标数据.csv'].charCodeAt(0) === 0xFEFF);
const allCsvKeys = Object.keys(csvOut.files).sort();
check('CSV 导出 10 个文件', allCsvKeys.length === 10, allCsvKeys.length + ' 个');
console.log('    CSV 文件清单：' + allCsvKeys.join('、'));

const txtOut = exportService.exportReportTxt(batchId);
check('TXT 报告导出版本匹配 v3', txtOut.reportNo.indexOf('R3') >= 0);
check('TXT 报告内容非空', txtOut.content && txtOut.content.length > 100);
check('TXT 内容含重复上报章节', txtOut.content.indexOf('重复上报') >= 0);
check('TXT 内容含缺料清单', txtOut.content.indexOf('缺失') >= 0);
check('TXT 导出内容与报告一致', txtOut.content === rep1.reportContent.plainText);

// 写几个样本到磁盘验证格式可打开
const outDir = path.join(__dirname, 'tmp_export_check');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, '1_浮标数据.csv'), csvOut.files['1_浮标数据.csv']);
fs.writeFileSync(path.join(outDir, 'report.txt'), '\uFEFF' + txtOut.content);
fs.writeFileSync(path.join(outDir, 'full_export.json'), JSON.stringify(jsonOut, null, 2));
check('样本文件写入磁盘（tmp_export_check/）可人工打开验证', true);

// ===== 8. 批次列表/详情查询 =====
section('【8】批次查询接口（前端列表/详情）');
const list = batchService.getAllBatches();
check('批次列表含测试批次', list.some(x => x.id === batchId));
const detail = batchService.getBatchById(batchId);
check('批次详情状态推进到 reported', detail.status === 'reported');
const hist = batchService.getVersionHistory(batchId);
check('版本历史含 v2/v3 风险评估', hist.versions && hist.versions.length >= 2);

// ===== 总结 =====
section('测试总结');
console.log(c('  通过: ' + passed + ' / ' + (passed + failed), passed === 0 ? 'red' : failed === 0 ? 'green' : 'yellow'));
console.log(c('  失败: ' + failed, failed === 0 ? 'green' : 'red'));
if (failed === 0) {
  console.log(c('  全链路闭环验证通过 ✅', 'green'));
  console.log(c('  流程：新建批次→样例导入→单独复核→批量复核→风险评估→版本对比→报告→导出', 'cyan'));
} else {
  console.log(c('  存在失败项，需要排查', 'red'));
}
