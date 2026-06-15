const readline = require('readline');
const db = require('./db/database');
const batchService = require('./services/batchService');
const reviewService = require('./services/reviewService');
const riskService = require('./services/riskService');
const reportService = require('./services/reportService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function c(text, color) {
  return colors[color] + text + colors.reset;
}

function printHeader() {
  console.log('\n' + c('========================================', 'cyan'));
  console.log(c('  港区危险品泊位检查系统 - CLI终端', 'bold'));
  console.log(c('========================================', 'cyan') + '\n');
}

function printStatusTrail(status) {
  const steps = [
    { key: 'imported', label: '📥 已导入' },
    { key: 'reviewing', label: '🔍 复核中' },
    { key: 'risk_assessed', label: '⚠️ 已评估' },
    { key: 'reported', label: '📄 已报告' }
  ];
  const idx = steps.findIndex(s => s.key === status);
  const trail = steps.map((s, i) => {
    if (i < idx) return c(s.label, 'green');
    if (i === idx) return c(s.label + ' ◀', 'yellow');
    return c(s.label, 'gray');
  }).join(' → ');
  console.log('状态流转: ' + trail + '\n');
}

function getBatchChoice() {
  return new Promise((resolve) => {
    const batches = batchService.getAllBatches();
    if (batches.length === 0) {
      console.log(c('暂无批次数据', 'yellow'));
      resolve(null);
      return;
    }
    console.log(c('检查批次列表:', 'bold'));
    batches.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.batch_no} - ${b.name}  [${c(b.status, 'yellow')}]`);
    });
    console.log('');
    rl.question('请选择批次编号 (回车默认第一个): ', (answer) => {
      const idx = answer ? parseInt(answer) - 1 : 0;
      resolve(batches[idx] || batches[0]);
    });
  });
}

function showMenu(batch) {
  return new Promise((resolve) => {
    console.log(c(`\n当前批次: ${batch.batch_no} - ${batch.name}`, 'bold'));
    console.log(`当前状态: ${c(batch.status, 'yellow')} | 当前版本: v${batch.current_version}`);
    printStatusTrail(batch.status);

    console.log(c(' 操作菜单:', 'bold'));
    console.log('   1. 查看材料清单');
    console.log('   2. 查看复核进度');
    console.log(c('   3. 浮标数据复核 (单独复核入口)', 'cyan'));
    console.log('   4. 提交整批复核');
    console.log('   5. 查看风险评估');
    console.log('   6. 执行风险评估');
    console.log('   7. 历史版本对比');
    console.log('   8. 生成/查看报告');
    console.log('   9. 导出报告文本');
    console.log('   0. 退出');
    console.log('');
    rl.question('请选择操作: ', resolve);
  });
}

function showMaterials(batch) {
  const materials = batchService.getBatchMaterials(batch.id);
  console.log('\n' + c('材料清单 (版本 ' + materials.version + '):', 'bold'));
  console.log(c('─'.repeat(50), 'gray'));

  console.log(c('\n🌊 浮标数据 (' + materials.buoyData.length + '条):', 'cyan'));
  materials.buoyData.forEach(b => {
    const status = b.review_status === 'approved' ? c('✓已复核', 'green')
      : b.review_status === 'rejected' ? c('✗不通过', 'red')
      : c('待复核', 'yellow');
    const valid = b.is_valid ? '' : c(' [无效]', 'red');
    const abn = b.water_depth !== null && b.water_depth < 0 ? c(' [异常]', 'yellow') : '';
    console.log(`  ${b.buoy_id} - ${b.location || '未知位置'} ${status}${valid}${abn}`);
    if (b.import_note) {
      console.log(c(`     备注: ${b.import_note}`, 'gray'));
    }
  });

  console.log(c('\n🌊 潮汐表 (' + materials.tideTables.length + '条):', 'cyan'));
  materials.tideTables.forEach(t => {
    const status = t.review_status === 'approved' ? c('✓', 'green')
      : t.review_status === 'rejected' ? c('✗', 'red') : '○';
    const oldRemark = t.old_remark ? c(' [带旧备注]', 'yellow') : '';
    console.log(`  ${status} ${t.tide_date} - 高潮${t.high_tide_level}m / 低潮${t.low_tide_level}m${oldRemark}`);
  });

  console.log(c('\n🌤️ 气象预报 (' + materials.weatherForecasts.length + '天):', 'cyan'));
  materials.weatherForecasts.forEach(w => {
    const status = w.review_status === 'approved' ? c('✓', 'green')
      : w.review_status === 'rejected' ? c('✗', 'red') : '○';
    console.log(`  ${status} ${w.forecast_date} - ${w.weather_condition} ${w.wind_force}`);
  });

  console.log(c('\n🚫 禁航区越界 (' + materials.restrictedZoneViolations.length + '起):', 'cyan'));
  materials.restrictedZoneViolations.forEach(v => {
    const status = v.review_status === 'approved' ? c('✓', 'green')
      : v.review_status === 'rejected' ? c('✗', 'red') : '○';
    console.log(`  ${status} ${v.vessel_name || '未知船舶'} - ${v.zone_name} (${v.zone_type})`);
  });

  console.log(c('\n📷 巡检照片 (' + materials.inspectionPhotos.length + '张):', 'cyan'));
  const missing = materials.inspectionPhotos.filter(p => p.is_missing);
  materials.inspectionPhotos.forEach(p => {
    const miss = p.is_missing ? c(' [缺失]', 'red') : c(' [可用]', 'green');
    console.log(`  ${p.photo_no} - ${p.photo_type} (${p.location})${miss}`);
    if (p.missing_reason) {
      console.log(c(`     原因: ${p.missing_reason}`, 'gray'));
    }
  });

  console.log(c('\n🐟 养殖日志 (' + materials.aquacultureLogs.length + '条):', 'cyan'));
  materials.aquacultureLogs.forEach(a => {
    const sup = a.is_supplementary ? c(' [补录]', 'yellow') : '';
    console.log(`  ${a.log_date}${sup} - ${a.log_content.substring(0, 30)}...`);
  });

  if (materials.duplicateTracking.length > 0) {
    console.log(c('\n📋 重复上报追踪:', 'red'));
    materials.duplicateTracking.forEach(d => {
      const st = d.status === 'resolved' ? c('已处理', 'green') : c('待确认', 'yellow');
      console.log(`  [${d.material_type}] ${d.material_key} - 出现${d.duplicate_count}次 [${st}]`);
    });
  }

  console.log('');
}

function showReviewProgress(batch) {
  const summary = reviewService.getReviewSummary(batch.id);
  console.log('\n' + c('复核进度总览:', 'bold'));
  console.log(c('─'.repeat(40), 'gray'));
  console.log(`  总项数: ${summary.totalItems}`);
  console.log(`  已复核: ${summary.reviewedItems}`);
  console.log(`  待复核: ${summary.pendingItems}`);
  console.log(`  进度: ${summary.progress}%`);
  console.log(`  缺失照片: ${summary.missingPhotos}张`);
  console.log(`  待处理重复: ${summary.pendingDuplicates}条`);

  console.log(c('\n  按类型统计:', 'cyan'));
  const names = { buoy: '浮标数据', tide: '潮汐表', weather: '气象预报', violation: '禁航区越界', photo: '巡检照片', aquaculture: '养殖日志' };
  for (const [key, val] of Object.entries(summary.byType)) {
    const done = val.total - val.pending;
    const pct = val.total > 0 ? Math.round(done / val.total * 100) : 0;
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
    console.log(`  ${names[key]}: ${bar} ${pct}% (${done}/${val.total})`);
  }
  console.log('');
}

function reviewBuoyCLI(batch) {
  return new Promise((resolve) => {
    const materials = batchService.getBatchMaterials(batch.id);
    const buoyList = materials.buoyData;

    console.log('\n' + c('浮标数据列表:', 'bold'));
    buoyList.forEach((b, i) => {
      const status = b.review_status === 'approved' ? c('✓', 'green')
        : b.review_status === 'rejected' ? c('✗', 'red') : '○';
      const valid = b.is_valid ? '' : c(' [无效]', 'red');
      console.log(`  ${i + 1}. ${status} ${b.buoy_id} - ${b.location || '未知'}${valid}`);
    });

    console.log(c('\n  提示: 浮标数据可单独修正，无需重新导入', 'yellow'));
    rl.question('\n请选择要复核的浮标编号 (回车返回): ', (answer) => {
      if (!answer) { resolve(); return; }
      const idx = parseInt(answer) - 1;
      const buoy = buoyList[idx];
      if (!buoy) { console.log(c('  编号无效', 'red')); resolve(); return; }

      console.log(c('\n当前数据:', 'cyan'));
      console.log(`  浮标ID: ${buoy.buoy_id}`);
      console.log(`  位置: ${buoy.location || '-'}`);
      console.log(`  水深: ${buoy.water_depth !== null ? buoy.water_depth + 'm' : '缺失'}`);
      console.log(`  流速: ${buoy.flow_velocity !== null ? buoy.flow_velocity + 'm/s' : '-'}`);
      console.log(`  浪高: ${buoy.wave_height !== null ? buoy.wave_height + 'm' : '-'}`);
      console.log(`  是否有效: ${buoy.is_valid ? '是' : '否'}`);
      console.log(`  复核状态: ${buoy.review_status}`);
      if (buoy.import_note) console.log(`  导入备注: ${buoy.import_note}`);

      rl.question('\n请输入新的水深值 (回车不修改): ', (depth) => {
        rl.question('请输入新的流速值 (回车不修改): ', (flow) => {
          rl.question('是否有效? (1=有效 0=无效 回车不修改): ', (valid) => {
            rl.question('复核结果? (approved/rejected/pending 回车不修改): ', (status) => {
              rl.question('复核备注: ', (comment) => {
                const updates = {};
                if (depth !== '') updates.water_depth = parseFloat(depth) || null;
                if (flow !== '') updates.flow_velocity = parseFloat(flow) || null;
                if (valid !== '') updates.is_valid = parseInt(valid);
                if (status !== '') updates.review_status = status;

                if (Object.keys(updates).length === 0) {
                  console.log(c('  未做任何修改', 'yellow'));
                  resolve();
                  return;
                }

                try {
                  const result = reviewService.reviewBuoyItem(
                    batch.id, buoy.id, updates, '科研助理-CLI', comment
                  );
                  console.log(c('  ✓ 浮标数据复核保存成功', 'green'));
                } catch (e) {
                  console.log(c('  ✗ 失败: ' + e.message, 'red'));
                }
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

function showRisk(batch) {
  const risk = riskService.getLatestAssessment(batch.id);
  if (!risk) {
    console.log(c('\n  暂无风险评估结果', 'yellow'));
    return;
  }
  const levelText = { high: '高风险', medium: '中风险', low: '低风险' };
  const levelColor = { high: 'red', medium: 'yellow', low: 'green' };

  console.log('\n' + c('风险评估结果 (版本 ' + risk.version + '):', 'bold'));
  console.log(c('─'.repeat(40), 'gray'));
  console.log(`  风险等级: ${c(levelText[risk.risk_level], levelColor[risk.risk_level])}`);
  console.log(`  风险分值: ${risk.risk_score} 分`);
  console.log(`  评估人: ${risk.assessor}`);
  console.log(`  评估时间: ${risk.assessed_at}`);
  console.log(c('\n  风险因素:', 'cyan'));
  risk.risk_factors.forEach(f => console.log(`    • ${f}`));
  console.log(c('\n  评估说明:', 'cyan'));
  console.log(`    ${risk.assessment_note}`);
  console.log(c('\n  评估依据:', 'cyan'));
  console.log(`    ${risk.assessment_basis}`);
  console.log('');
}

function doRiskAssess(batch) {
  try {
    const result = riskService.assessRisk(batch.id, '系统-CLI');
    const levelText = { high: '高风险', medium: '中风险', low: '低风险' };
    console.log(c('\n  ✓ 风险评估完成', 'green'));
    console.log(`  风险等级: ${c(levelText[result.riskLevel], result.riskLevel === 'high' ? 'red' : result.riskLevel === 'medium' ? 'yellow' : 'green')}`);
    console.log(`  风险分值: ${result.riskScore} 分`);
    if (result.partialAssessment) {
      console.log(c('  注: 因照片缺失，为部分评估结果', 'yellow'));
    }
  } catch (e) {
    console.log(c('  ✗ 评估失败: ' + e.message, 'red'));
  }
  console.log('');
}

function compareVersions(batch) {
  const all = riskService.getAllAssessments(batch.id);
  if (all.length < 2) {
    console.log(c('\n  版本不足2个，无法对比', 'yellow'));
    return;
  }

  console.log('\n' + c('可用版本:', 'bold'));
  all.forEach((a, i) => {
    console.log(`  ${i + 1}. 版本 ${a.version} - ${a.risk_level} (${a.risk_score}分)`);
  });

  rl.question('\n选择版本A编号: ', (aStr) => {
    rl.question('选择版本B编号: ', (bStr) => {
      const aIdx = parseInt(aStr) - 1;
      const bIdx = parseInt(bStr) - 1;
      try {
        const result = riskService.compareRiskVersions(
          batch.id, all[aIdx].version, all[bIdx].version
        );
        const levelText = { high: '高风险', medium: '中风险', low: '低风险' };
        console.log('\n' + c('对比结果:', 'bold'));
        console.log(c('─'.repeat(40), 'gray'));
        console.log(`  版本${result.versionA}: ${levelText[result.levelA]} (${result.scoreA}分)`);
        console.log(`  版本${result.versionB}: ${levelText[result.levelB]} (${result.scoreB}分)`);
        console.log(`  分值变化: ${result.scoreDiff > 0 ? '+' : ''}${result.scoreDiff}分`);
        console.log(`  等级变化: ${result.levelChanged ? c('是', 'yellow') : '否'}`);

        if (result.addedFactors.length > 0) {
          console.log(c('\n  新增风险因素:', 'red'));
          result.addedFactors.forEach(f => console.log(`    + ${f}`));
        }
        if (result.removedFactors.length > 0) {
          console.log(c('\n  消除风险因素:', 'green'));
          result.removedFactors.forEach(f => console.log(`    - ${f}`));
        }
        console.log('');
      } catch (e) {
        console.log(c('  ✗ 对比失败: ' + e.message, 'red'));
      }
    });
  });
}

function showReport(batch) {
  const report = reportService.getLatestReport(batch.id);
  if (!report) {
    console.log(c('\n  暂无报告', 'yellow'));
    return;
  }
  console.log('\n' + c('报告内容:', 'bold'));
  console.log(c('─'.repeat(50), 'gray'));
  console.log(report.report_content.plainText);
  console.log('');
}

function doGenerateReport(batch) {
  try {
    const result = reportService.generateReport(batch.id, '系统-CLI');
    console.log(c('\n  ✓ 报告生成成功', 'green'));
    console.log(`  报告编号: ${result.reportNo}`);
    console.log(`  版本: v${result.version}`);
    console.log(`  重复上报记录: ${result.duplicateCount}条`);
  } catch (e) {
    console.log(c('  ✗ 生成失败: ' + e.message, 'red'));
  }
  console.log('');
}

function doExportReport(batch) {
  try {
    const result = reportService.exportReportText(batch.id);
    const fs = require('fs');
    const path = require('path');
    const outPath = path.join(__dirname, '../data', result.reportNo + '.txt');
    fs.writeFileSync(outPath, result.content, 'utf-8');
    console.log(c('\n  ✓ 报告已导出', 'green'));
    console.log(`  文件: ${outPath}`);
  } catch (e) {
    console.log(c('  ✗ 导出失败: ' + e.message, 'red'));
  }
  console.log('');
}

async function main() {
  printHeader();

  const batch = await getBatchChoice();
  if (!batch) { rl.close(); return; }

  async function loop() {
    const current = batchService.getBatchById(batch.id);
    const choice = await showMenu(current);

    switch (choice) {
      case '1':
        showMaterials(current);
        break;
      case '2':
        showReviewProgress(current);
        break;
      case '3':
        await reviewBuoyCLI(current);
        break;
      case '4':
        try {
          const result = reviewService.submitBatchReview(current.id, '科研助理-CLI', 'CLI提交');
          console.log(c('\n  ✓ 整批复核提交成功', 'green'));
          console.log(`  新版本: v${result.newVersion}`);
        } catch (e) {
          console.log(c('\n  ✗ 提交失败: ' + e.message, 'red'));
        }
        break;
      case '5':
        showRisk(current);
        break;
      case '6':
        doRiskAssess(current);
        break;
      case '7':
        compareVersions(current);
        return;
      case '8':
        const hasReport = reportService.getLatestReport(current.id);
        if (hasReport) {
          showReport(current);
        } else {
          doGenerateReport(current);
        }
        break;
      case '9':
        doExportReport(current);
        break;
      case '0':
        console.log(c('\n  再见！👋', 'cyan'));
        rl.close();
        return;
      default:
        console.log(c('\n  无效选项', 'red'));
    }

    rl.question('\n按回车继续...', () => loop());
  }

  loop();
}

main();
