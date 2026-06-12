const { execSync } = require('child_process');
const path = require('path');
const http = require('http');

const baseUrl = 'http://localhost:3000';

function log(msg) {
  console.log(`\x1b[36m[演示]\x1b[0m ${msg}`);
}

function step(num, title) {
  console.log(`\n\x1b[33m=== 步骤 ${num}: ${title} ===\x1b[0m`);
}

function httpRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function waitForServer() {
  log('等待服务启动...');
  for (let i = 0; i < 20; i++) {
    try {
      const res = await httpRequest('GET', '/api/health');
      if (res.status === 'ok') {
        log('服务已就绪！');
        return true;
      }
    } catch (e) {
      // wait
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('服务启动超时');
}

async function runDemo() {
  console.log('\x1b[35m');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    海底地形剖面课堂 - 完整演示流程       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\x1b[0m');

  step(1, '初始化数据库');
  log('执行: npm run init');
  execSync('npm run init', { stdio: 'inherit' });
  log('数据库初始化完成 ✓');

  step(2, '填充示例数据');
  log('执行: npm run seed');
  execSync('npm run seed', { stdio: 'inherit' });
  log('示例数据填充完成 ✓');

  step(3, '启动服务');
  log('启动后台服务...');
  const serverProc = require('child_process').spawn('node', ['server.js'], {
    detached: true,
    stdio: 'ignore'
  });
  serverProc.unref();

  await waitForServer();

  step(4, '生成 v2 版本潮汐数据（修正算法）');
  log('调用 POST /api/tide-versions/v2');
  const v2Res = await httpRequest('POST', '/api/tide-versions/v2');
  log(`v2潮汐数据生成: ${v2Res.message} (${v2Res.count}条) ✓`);

  step(5, '运行第一次分析（v1潮汐版本）');
  log('调用 POST /api/analysis/runs - 6月15日日常巡检 v1');
  const run1 = await httpRequest('POST', '/api/analysis/runs', {
    runName: '6月15日日常巡检 v1',
    tideVersion: 'v1',
    checkAquaculture: true,
    notes: '课堂演示 - 原始潮汐算法'
  });
  log(`分析完成，运行ID: ${run1.runId} ✓`);

  const result1 = await httpRequest('GET', `/api/analysis/runs/${run1.runId}`);
  log(`  - 总轨迹点: ${result1.stats.total_points}`);
  log(`  - 越界数量: ${result1.stats.violation_count}`);
  log(`  - 数据缺口: ${result1.gaps.length}个`);

  step(6, '运行第二次分析（v2潮汐版本 - 修正后）');
  log('调用 POST /api/analysis/runs - 6月15日日常巡检 v2');
  const run2 = await httpRequest('POST', '/api/analysis/runs', {
    runName: '6月15日日常巡检 v2',
    tideVersion: 'v2',
    checkAquaculture: true,
    notes: '课堂演示 - 修正潮汐算法'
  });
  log(`分析完成，运行ID: ${run2.runId} ✓`);

  const result2 = await httpRequest('GET', `/api/analysis/runs/${run2.runId}`);
  log(`  - 总轨迹点: ${result2.stats.total_points}`);
  log(`  - 越界数量: ${result2.stats.violation_count}`);

  step(7, '对比两个版本的差异');
  log('调用 GET /api/analysis/compare');
  const compare = await httpRequest(
    'GET',
    `/api/analysis/compare?run1=${run1.runId}&run2=${run2.runId}`
  );
  log(`对比结果:`);
  log(`  - v1越界: ${compare.stats_run1.violation_count}条`);
  log(`  - v2越界: ${compare.stats_run2.violation_count}条`);
  log(`  - 共有越界: ${compare.in_both}条`);
  if (compare.only_in_run2?.length > 0) {
    log(`  - v2新增越界: ${compare.only_in_run2.length}条`);
  }
  if (compare.only_in_run1?.length > 0) {
    log(`  - v2消除越界: ${compare.only_in_run1.length}条`);
  }
  if (compare.confidence_changed?.length > 0) {
    log(`  - 置信度变化: ${compare.confidence_changed.length}条`);
  }

  step(8, '生成海事处报告');
  log('调用 POST /api/reports');
  const report = await httpRequest('POST', '/api/reports', {
    runId: run1.runId,
    reportType: 'maritime'
  });
  log(`报告生成成功，报告ID: ${report.reportId} ✓`);
  log(`  证据摘要: ${report.evidenceSummary}`);

  step(9, '查看数据缺口（养殖日志缺失、风浪预报晚到）');
  log('调用 GET /api/data-gaps');
  const gaps = await httpRequest('GET', `/api/data-gaps?runId=${run1.runId}`);
  log(`共发现 ${gaps.length} 个数据缺口:`);
  gaps.forEach((g, i) => {
    const level = g.impact_level === 'high' ? '🔴高' :
                  g.impact_level === 'medium' ? '🟡中' : '🟢低';
    log(`  ${i + 1}. [${level}] ${g.description}`);
  });
  log('（注：分析已先算完能算的，缺口列给海洋监测员补）✓');

  step(10, '查看海底地形剖面');
  log('调用 GET /api/profiles');
  const profiles = await httpRequest('GET', '/api/profiles');
  log(`共 ${profiles.length} 条剖面: ${profiles.map(p => p.profile_name).join('、')}`);

  console.log('\n');
  log('========================================');
  log('🎉 演示完成！');
  log('========================================');
  log('');
  log('📊 前端界面:  http://localhost:3000');
  log('');
  log('📋 接下来可以：');
  log('   1. 在浏览器打开前端界面，查看地形剖面');
  log('   2. 切换到"越界分析"标签，新建分析任务');
  log('   3. 切换到"版本对比"，比较v1和v2潮汐算法的差异');
  log('   4. 切换到"报告与证据"，查看海事处报告和证据链');
  log('   5. 切换到"数据缺口"，查看需要补充的材料');
  log('');

  process.exit(0);
}

runDemo().catch(e => {
  console.error('\x1b[31m演示出错:\x1b[0m', e.message);
  process.exit(1);
});
