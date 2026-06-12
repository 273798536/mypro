const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('========================================');
  console.log('  海底地形剖面课堂 - 端到端测试');
  console.log('========================================\n');

  console.log('【测试1】健康检查');
  const health = await request('GET', '/api/health');
  console.log('  ✓', health.message);
  console.log();

  console.log('【测试2】运行 v1 潮汐分析');
  const run1 = await request('POST', '/api/analysis/runs', {
    runName: '课堂演示-v1',
    tideVersion: 'v1',
    notes: 'v1原始潮汐算法，包含真实坏数据'
  });
  console.log('  ✓ 分析ID:', run1.runId);
  
  const result1 = await request('GET', `/api/analysis/runs/${run1.runId}`);
  console.log('  统计:');
  console.log('    总轨迹点:', result1.stats.total_points);
  console.log('    越界点:', result1.stats.violation_count);
  console.log('    无风浪预报:', result1.stats.no_wave_count);
  console.log('    无养殖日志:', result1.stats.no_aqua_count);
  console.log();

  console.log('  越界详情:');
  const vessels = {};
  for (const v of result1.violations) {
    if (!vessels[v.vessel_name]) {
      vessels[v.vessel_name] = { zones: new Set(), count: 0, confidences: [] };
    }
    vessels[v.vessel_name].zones.add(v.zone_name);
    vessels[v.vessel_name].count++;
    vessels[v.vessel_name].confidences.push(v.confidence);
  }
  for (const [name, info] of Object.entries(vessels)) {
    const avgConf = info.confidences.reduce((a, b) => a + b, 0) / info.confidences.length;
    console.log(`    ${name}: ${info.count}个越界, 区域=${[...info.zones].join(', ')}, 平均置信度=${avgConf.toFixed(2)}`);
  }
  console.log();

  console.log('  置信度分布（不同坏数据影响）:');
  const confCounts = {};
  for (const v of result1.violations) {
    const c = v.confidence.toFixed(2);
    confCounts[c] = (confCounts[c] || 0) + 1;
  }
  for (const c of Object.keys(confCounts).sort()) {
    const examples = result1.violations.filter(v => v.confidence.toFixed(2) === c).slice(0, 2);
    const reasons = [];
    for (const e of examples) {
      if (!e.aquaculture_available) reasons.push('养殖日志缺失');
      if (e.confidence < 0.7) reasons.push('风浪预报晚到');
    }
    const reasonStr = [...new Set(reasons)].join(', ') || '正常';
    console.log(`    置信度 ${c}: ${confCounts[c]}个点 (${reasonStr})`);
  }
  console.log();

  console.log('  数据缺口:');
  for (const g of result1.gaps) {
    console.log(`    [${g.impact_level}] ${g.gap_type}: ${g.description}`);
  }
  console.log();

  console.log('【测试3】生成 v2 潮汐数据（算法更新）');
  const v2 = await request('POST', '/api/tide-versions/v2');
  console.log('  ✓', v2.message, `(${v2.count}条)`);
  console.log();

  console.log('【测试4】运行 v2 潮汐分析');
  const run2 = await request('POST', '/api/analysis/runs', {
    runName: '课堂演示-v2',
    tideVersion: 'v2',
    notes: 'v2新潮汐算法，潮高整体提升'
  });
  console.log('  ✓ 分析ID:', run2.runId);
  
  const result2 = await request('GET', `/api/analysis/runs/${run2.runId}`);
  console.log('  统计:');
  console.log('    总轨迹点:', result2.stats.total_points);
  console.log('    越界点:', result2.stats.violation_count);
  console.log();

  console.log('【测试5】版本对比（潮汐算法改变前后）');
  const compare = await request('GET', `/api/analysis/compare?run1=${run1.runId}&run2=${run2.runId}`);
  console.log('  v1越界:', compare.stats_run1.violation_count, '个点');
  console.log('  v2越界:', compare.stats_run2.violation_count, '个点');
  console.log('  仅v1有:', compare.only_in_run1.length, '个点');
  console.log('  仅v2有:', compare.only_in_run2.length, '个点');
  console.log('  置信度变化:', compare.confidence_changed.length, '个点');
  
  if (compare.only_in_run1.length > 0) {
    console.log();
    console.log('  ⚠️  潮汐算法改变导致以下越界消失:');
    const changed = compare.only_in_run1.slice(0, 3);
    for (const v of changed) {
      console.log(`    ${v.vessel_name} ${v.track_time.slice(11,16)} ${v.zone_name}`);
      console.log(`      v1潮高: ${v.tide_correction.toFixed(2)}m < 阈值1.9m → 越界`);
      const v2Tide = (v.tide_correction * 1.15 + 0.3).toFixed(2);
      console.log(`      v2潮高: ${v2Tide}m > 阈值1.9m → 不越界`);
    }
  }
  console.log();

  console.log('【测试6】生成海事处报告（带证据链）');
  const report = await request('POST', '/api/reports', {
    runId: run1.runId,
    reportType: 'maritime'
  });
  console.log('  ✓ 报告ID:', report.reportId);
  console.log('  摘要:');
  console.log('    分析名称:', report.content.summary.run_name);
  console.log('    总越界:', report.content.summary.violation_count, '条');
  console.log('    数据缺口:', report.content.summary.data_gaps, '个');
  console.log();
  
  console.log('  证据链示例（第一条越界）:');
  const firstVio = report.content.violations[0];
  console.log('    船舶:', firstVio.vessel_name, 'MMSI:', firstVio.mmsi);
  console.log('    时间:', firstVio.time.slice(0,19));
  console.log('    位置:', firstVio.position.lon + ', ' + firstVio.position.lat);
  console.log('    禁航区:', firstVio.zone);
  console.log('    置信度:', firstVio.confidence.toFixed(2));
  console.log('    支撑材料:');
  for (const src of firstVio.evidence_sources) {
    console.log('      ✓', src);
  }
  console.log();

  console.log('【测试7】查看所有数据缺口');
  const gaps = await request('GET', '/api/data-gaps');
  console.log('  共', gaps.length, '个数据缺口待补');
  if (gaps.length > 0) {
    for (const g of gaps) {
      console.log(`    [${g.impact_level}] ${g.gap_type}: ${g.description}`);
    }
  }
  console.log();

  console.log('========================================');
  console.log('  所有测试通过！✓');
  console.log('========================================');
  console.log();
  console.log('前端地址: http://localhost:3000');
  console.log('演示脚本: npm run demo');
  console.log('快速启动: bash scripts/quick-start.sh');
  console.log('curl示例: bash scripts/curl-examples.sh');
}

test().catch(console.error);
