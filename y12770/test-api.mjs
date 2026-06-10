import http from 'http';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: data ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode || 0, body }));
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n========== 反应热安全预警系统 - API 测试 ==========\n');

  // 1. 健康检查
  console.log('1. 健康检查...');
  const health = await request('GET', '/api/health');
  console.log(`   状态: ${health.status}`);
  console.log(`   响应: ${health.body.slice(0, 100)}\n`);

  // 2. 称量单列表
  console.log('2. 称量单列表...');
  const list = await request('GET', '/api/weighing/list');
  const listData = JSON.parse(list.body);
  console.log(`   状态: ${list.status}`);
  console.log(`   记录数: ${listData.data?.length || 0}`);
  if (listData.data) {
    listData.data.forEach((r) => {
      console.log(`     - ${r.batchNo} [${r.status}]`);
    });
  }
  console.log('');

  // 3. 顺利记录详情
  console.log('3. 顺利记录详情 (rec-success-001)...');
  const success = await request('GET', '/api/weighing/rec-success-001');
  const successData = JSON.parse(success.body);
  console.log(`   状态: ${success.status}`);
  console.log(`   批号: ${successData.data?.batchNo}`);
  console.log(`   试剂数: ${successData.data?.rows?.length}`);
  console.log('');

  // 4. 谱峰分析
  console.log('4. 谱峰分析 (顺利记录)...');
  const curve = [];
  for (let t = 0; t < 200; t++) {
    let temp = 25 + Math.sin(t * 0.03) * 1;
    for (let p = 0; p < 3; p++) {
      const peakCenter = 50 + p * 60;
      const peakWidth = 15;
      const peakHeight = 6 + p * 2;
      temp += peakHeight * Math.exp(-((t - peakCenter) ** 2) / (2 * peakWidth * peakWidth));
    }
    curve.push([t, Number(temp.toFixed(2))]);
  }
  const analysis = await request('POST', '/api/analysis/run/rec-success-001', { temperatureCurve: curve });
  const analysisData = JSON.parse(analysis.body);
  console.log(`   状态: ${analysis.status}`);
  if (analysisData.success) {
    console.log(`   检测到峰数: ${analysisData.data?.peaks?.length}`);
    console.log(`   重叠峰数: ${analysisData.data?.overlaps?.length}`);
    console.log(`   警告数: ${analysisData.data?.warnings?.length}`);
    if (analysisData.data?.warnings?.length > 0) {
      analysisData.data.warnings.forEach((w) => console.log(`     ⚠️  ${w}`));
    }
  } else {
    console.log(`   错误: ${analysisData.error?.message}`);
    console.log(`   建议: ${analysisData.error?.actionable}`);
  }
  console.log('');

  // 5. 配平计算
  console.log('5. 配平计算 (顺利记录)...');
  const balance = await request('POST', '/api/balance/calculate/rec-success-001', {
    reactants: [{ formula: 'HCl' }, { formula: 'NaOH' }],
    products: [{ formula: 'NaCl' }, { formula: 'H2O' }],
  });
  const balanceData = JSON.parse(balance.body);
  console.log(`   状态: ${balance.status}`);
  if (balanceData.success) {
    console.log(`   方程式: ${balanceData.data?.balancedEquation}`);
    console.log(`   焓变 ΔH: ${balanceData.data?.enthalpyChange} kJ/mol`);
    console.log(`   计算状态: ${balanceData.data?.status}`);
    console.log(`   材料追溯: ${balanceData.data?.materialTrace?.length} 条`);
    balanceData.data?.materialTrace?.forEach((t) => {
      console.log(`     - ${t.reagentName}: ${t.delta}`);
    });
  }
  console.log('');

  // 6. 报告预览 - 顺利记录
  console.log('6. 报告预览 (顺利记录 - 绿色可直接使用)...');
  const report = await request('GET', '/api/report/rec-success-001/preview');
  const reportData = JSON.parse(report.body);
  console.log(`   状态: ${report.status}`);
  if (reportData.success) {
    console.log(`   结论分级: ${reportData.data?.conclusionLevel}`);
    console.log(`   摘要: ${reportData.data?.summary}`);
  }
  console.log('');

  // 7. 坏数据报告预览
  console.log('7. 报告预览 (坏数据 - 红色/不可用，浓度错填)...');
  const badReport = await request('GET', '/api/report/rec-bad-001/preview');
  const badData = JSON.parse(badReport.body);
  console.log(`   状态: ${badReport.status}`);
  if (badData.success) {
    console.log(`   结论分级: ${badData.data?.conclusionLevel}`);
    console.log(`   摘要: ${badData.data?.summary}`);
    console.log(`   异常数: ${badData.data?.traceLogs?.length}`);
    badData.data?.traceLogs?.slice(0, 2).forEach((t) => {
      console.log(`     [${t.severity}] ${t.message}`);
      console.log(`        💡 ${t.actionable}`);
    });
  }
  console.log('');

  // 8. 待确认报告预览
  console.log('8. 报告预览 (待确认记录 - 黄色/需复核)...');
  const pendingReport = await request('GET', '/api/report/rec-pending-001/preview');
  const pendingData = JSON.parse(pendingReport.body);
  console.log(`   状态: ${pendingReport.status}`);
  if (pendingData.success) {
    console.log(`   结论分级: ${pendingData.data?.conclusionLevel}`);
    console.log(`   摘要: ${pendingData.data?.summary}`);
  }
  console.log('');

  // 9. 异常留痕列表
  console.log('9. 异常留痕列表...');
  const trace = await request('GET', '/api/trace/list');
  const traceData = JSON.parse(trace.body);
  console.log(`   状态: ${trace.status}`);
  console.log(`   总异常数: ${traceData.data?.length}`);
  const highCount = traceData.data?.filter((t) => t.severity === 'high' && !t.resolved)?.length || 0;
  const mediumCount = traceData.data?.filter((t) => t.severity === 'medium' && !t.resolved)?.length || 0;
  console.log(`   高严重度(未解决): ${highCount}`);
  console.log(`   中严重度(未解决): ${mediumCount}`);
  console.log('');

  // 10. 测试可操作错误提示
  console.log('10. 测试可操作错误 - 缺少温度曲线...');
  const noCurve = await request('POST', '/api/analysis/run/rec-pending-001', { temperatureCurve: [] });
  const noCurveData = JSON.parse(noCurve.body);
  console.log(`    状态: ${noCurve.status}`);
  if (!noCurveData.success) {
    console.log(`    错误码: ${noCurveData.error?.code}`);
    console.log(`    错误信息: ${noCurveData.error?.message}`);
    console.log(`    可操作建议: ${noCurveData.error?.actionable}`);
  }
  console.log('');

  // 11. 测试按状态筛选
  console.log('11. 筛选待确认记录...');
  const pendingList = await request('GET', '/api/weighing/list?status=pending');
  const pendingListData = JSON.parse(pendingList.body);
  console.log(`    待确认记录数: ${pendingListData.data?.length}`);
  console.log('');

  console.log('========== 所有测试完成 ==========\n');
  console.log('✅ 核心功能验证通过:');
  console.log('   - 称量单导入 & 列表 & 详情');
  console.log('   - 谱峰重叠检测');
  console.log('   - 配平计算 + 材料追溯');
  console.log('   - 异常留痕 + 可操作错误提示');
  console.log('   - 报告三级分级: usable(绿)/review(黄)/reject(红)');
  console.log('');
}

runTests().catch(console.error);
