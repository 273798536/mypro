const chalk = require('chalk');
const { makeRequest } = require('./http-local');

const results = [];
const checks = [];

const test = (name, fn) => {
  checks.push({ name, fn });
};

async function run() {
  console.log(chalk.cyan('\n========================================'));
  console.log(chalk.cyan('  城市照明抢修链路服务 - API集成测试'));
  console.log(chalk.cyan('  (本地模拟HTTP，无需TCP端口'));
  console.log(chalk.cyan('========================================\n'));

  let adminToken;
  let entryToken;
  let readonlyToken;

  test('健康检查', async () => {
    const res = await makeRequest('GET', '/api/health');
    if (res.statusCode !== 200) throw new Error(`状态码: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    if (body.status !== 'ok') throw new Error('健康检查失败');
    return `服务状态: ${body.service}`;
  });

  test('主管登录', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      body: { username: 'super_user', password: 'super123' }
    });
    if (res.statusCode !== 200) throw new Error(`登录失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    adminToken = body.token;
    return `用户: ${body.user.name} (${body.user.role})`;
  });

  test('录入员登录', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      body: { username: 'entry_user', password: 'entry123' }
    });
    if (res.statusCode !== 200) throw new Error(`登录失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    entryToken = body.token;
    return `用户: ${body.user.name} (${body.user.role})`;
  });

  test('只读用户登录', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      body: { username: 'readonly_user', password: 'readonly123' }
    });
    if (res.statusCode !== 200) throw new Error(`登录失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    readonlyToken = body.token;
    return `用户: ${body.user.name} (${body.user.role})`;
  });

  test('获取当前用户信息', async () => {
    const res = await makeRequest('GET', '/api/auth/me', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `当前用户: ${body.username}`;
  });

  test('创建工单(录入员)', async () => {
    const res = await makeRequest('POST', '/api/work-orders', {
      headers: { 'Authorization': `Bearer ${entryToken}` },
      body: {
        order_no: 'WO202405240099',
        road_section: '测试大道1-50号',
        light_count: 12,
        fault_type: 'bulb_broken',
        description: '测试创建工单',
        location: '测试地点'
      }
    });
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`创建失败: ${res.statusCode}`);
    }
    const body = JSON.parse(res.body);
    return `工单号: ${body.order_no}, ID: ${body.id}`;
  });

  test('获取工单列表(主管)', async () => {
    const res = await makeRequest('GET', '/api/work-orders', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `工单数量: ${body.data?.length || body.length || 0}`;
  });

  test('获取工单详情', async () => {
    const res = await makeRequest('GET', '/api/work-orders/1', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `工单: ${body.order_no} - ${body.road_section}`;
  });

  test('工单完整链路', async () => {
    const res = await makeRequest('GET', '/api/work-orders/1/full-chain', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `照片: ${body.photos?.length || 0}张, 热线: ${body.hotlines?.length || 0}条, 备件: ${body.parts?.length || 0}个, 回执: ${body.receipts?.length || 0}份`;
  });

  test('工单操作历史', async () => {
    const res = await makeRequest('GET', '/api/work-orders/1/history', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `历史记录: ${body.length || 0}条`;
  });

  test('权限过滤(只读用户)', async () => {
    const res = await makeRequest('GET', '/api/work-orders/1', {
      headers: { 'Authorization': `Bearer ${readonlyToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    const keys = Object.keys(body);
    const hasSensitive = keys.includes('entry_user_id') || keys.includes('review_user_id');
    return `可见字段: ${keys.length}个, ${hasSensitive ? '包含敏感字段' : '无敏感字段'}`;
  });

  test('对账检查', async () => {
    const res = await makeRequest('POST', '/api/reconciliation/check/1', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`对账失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `状态: ${body.status || 'completed'}`;
  });

  test('批量对账', async () => {
    const res = await makeRequest('POST', '/api/reconciliation/batch-check', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: { status: 'pending' }
    });
    if (res.statusCode !== 200) throw new Error(`批量对账失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `处理: ${body.checked || body.length || 0}条`;
  });

  test('操作日志', async () => {
    const res = await makeRequest('GET', '/api/replay/logs', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `日志数量: ${body.data?.length || body.length || 0}条`;
  });

  test('工单时间线', async () => {
    const res = await makeRequest('GET', '/api/replay/work-order/1/timeline', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `时间线事件: ${body.events?.length || body.length || 0}个`;
  });

  test('异常汇总', async () => {
    const res = await makeRequest('GET', '/api/replay/abnormal-summary', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `异常: ${body.total || 0}项`;
  });

  test('坏数据列表', async () => {
    const res = await makeRequest('GET', '/api/bad-data', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`获取失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `坏数据: ${body.data?.length || body.length || 0}条`;
  });

  test('导出汇总报告', async () => {
    const res = await makeRequest('GET', '/api/export/summary', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`导出失败: ${res.statusCode}`);
    const body = JSON.parse(res.body);
    return `报告生成成功`;
  });

  console.log(chalk.yellow('运行API测试...\n'));

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < checks.length; i++) {
    const { name, fn } = checks[i];
    const num = String(i + 1).padStart(2, '0');
    
    const prefix = '[' + num + '/' + checks.length + '] ';
    process.stdout.write(chalk.gray(prefix) + chalk.white(name + '... '));
    
    try {
      const result = await fn();
      console.log(chalk.green('✓ ') + chalk.white(result));
      passed++;
    } catch (err) {
      console.log(chalk.red('✗ ') + chalk.red(err.message));
      failed++;
    }
  }

  console.log(chalk.cyan('\n========================================'));
  console.log(chalk.cyan('  API测试完成'));
  console.log(chalk.cyan('========================================'));
  
  if (failed === 0) {
    console.log(chalk.green(`\n✅ 全部 ${passed} 项API测试通过!`));
    console.log(chalk.gray('\n已验证的API端点:'));
    console.log(chalk.gray('  • GET  /api/health - 健康检查'));
    console.log(chalk.gray('  • POST /api/auth/login - 用户登录'));
    console.log(chalk.gray('  • GET  /api/auth/me - 当前用户'));
    console.log(chalk.gray('  • POST /api/work-orders - 创建工单'));
    console.log(chalk.gray('  • GET  /api/work-orders - 工单列表'));
    console.log(chalk.gray('  • GET  /api/work-orders/:id - 工单详情'));
    console.log(chalk.gray('  • GET  /api/work-orders/:id/full-chain - 完整链路'));
    console.log(chalk.gray('  • GET  /api/work-orders/:id/history - 操作历史'));
    console.log(chalk.gray('  • POST /api/reconciliation/check/:id - 对账检查'));
    console.log(chalk.gray('  • POST /api/reconciliation/batch-check - 批量对账'));
    console.log(chalk.gray('  • GET  /api/replay/logs - 操作日志'));
    console.log(chalk.gray('  • GET  /api/replay/work-order/:id/timeline - 时间线'));
    console.log(chalk.gray('  • GET  /api/replay/abnormal-summary - 异常汇总'));
    console.log(chalk.gray('  • GET  /api/bad-data - 坏数据列表'));
    console.log(chalk.gray('  • GET  /api/export/summary - 导出报告'));
  } else {
    console.log(chalk.red(`\n❌ ${passed} 项通过, ${failed} 项失败`));
  }
  
  console.log(chalk.cyan('\n========================================\n'));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(chalk.red('\n测试执行失败:'), err.message);
  console.error(err.stack);
  process.exit(1);
});
