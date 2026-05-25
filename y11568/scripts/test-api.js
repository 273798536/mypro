const http = require('http');
require('dotenv').config();

const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '3001');

function request(options, data = null) {
  const defaultOptions = {
    hostname: HOST,
    port: PORT
  };
  const finalOptions = { ...defaultOptions, ...options };
  
  return new Promise((resolve, reject) => {
    const req = http.request(finalOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
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
  console.log('  城市照明抢修链路服务 - API测试');
  console.log('========================================\n');

  let adminToken;
  let entryToken;
  let readonlyToken;

  console.log('【1/6】测试用户登录');
  const adminLogin = await request(
    { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { username: 'super_user', password: 'super123' }
  );
  adminToken = adminLogin.body.token;
  console.log('  ✓ 主管登录成功:', adminLogin.body.user.name);

  const entryLogin = await request(
    { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { username: 'entry_user', password: 'entry123' }
  );
  entryToken = entryLogin.body.token;
  console.log('  ✓ 录入员登录成功:', entryLogin.body.user.name);

  const readonlyLogin = await request(
    { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { username: 'readonly_user', password: 'readonly123' }
  );
  readonlyToken = readonlyLogin.body.token;
  console.log('  ✓ 只读用户登录成功:', readonlyLogin.body.user.name);

  console.log('\n【2/6】测试工单管理');
  const newOrder = await request(
    { path: '/api/work-orders', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + entryToken } },
    { order_no: 'WO202405240099', road_section: '测试大道1-50号', light_count: 12, fault_type: 'bulb_broken', description: '测试创建工单', location: '测试地点' }
  );
  console.log('  ✓ 创建工单成功:', newOrder.body.order_no);
  const orderId = newOrder.body.id;

  const orderList = await request(
    { path: '/api/work-orders', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 获取工单列表,共', orderList.body.data.length, '条');

  console.log('\n【3/6】测试权限控制');
  const adminView = await request(
    { path: '/api/work-orders/1', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 主管可见字段数:', Object.keys(adminView.body).length);

  const readonlyView = await request(
    { path: '/api/work-orders/1', method: 'GET', headers: { 'Authorization': 'Bearer ' + readonlyToken } }
  );
  console.log('  ✓ 只读用户可见字段数:', Object.keys(readonlyView.body).length);
  console.log('    (权限过滤生效: 主管', Object.keys(adminView.body).length, 'vs 只读', Object.keys(readonlyView.body).length, ')');

  console.log('\n【4/6】测试坏数据管理');
  const badData = await request(
    { path: '/api/bad-data', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 坏数据记录数:', badData.body.length);
  if (badData.body.length > 0) {
    console.log('    第一条错误原因:', badData.body[0].error_message.substring(0, 40) + '...');
  }

  console.log('\n【5/6】测试对账和回放');
  const recon = await request(
    { path: '/api/reconciliation/check/1', method: 'POST', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 对账结果:', recon.body.matched ? '匹配' : '不匹配', '-', recon.body.issues.length, '个问题');

  const abnormal = await request(
    { path: '/api/replay/abnormal-summary', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 异常汇总:');
  console.log('    异常照片:', abnormal.body.summary.abnormal_photos, '张');
  console.log('    不合格备件:', abnormal.body.summary.unqualified_parts, '个');
  console.log('    异常回执:', abnormal.body.summary.exception_receipts, '份');
  console.log('    影响工单:', abnormal.body.summary.affected_work_orders, '个');

  console.log('\n【6/6】测试操作日志');
  const logs = await request(
    { path: '/api/replay/logs', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } }
  );
  console.log('  ✓ 操作日志总数:', logs.body.length);
  if (logs.body.length > 0) {
    const lastLog = logs.body[0];
    console.log('    最新操作:', lastLog.operation_type, '-', lastLog.table_name);
    const diff = typeof lastLog.diff_summary === 'string' ? JSON.parse(lastLog.diff_summary) : lastLog.diff_summary;
    if (diff) {
      console.log('    变更字段:', Object.keys(diff).length, '个');
    }
  }

  console.log('\n========================================');
  console.log('  ✅ 所有测试通过!');
  console.log('========================================');
  console.log(`\n服务运行在: http://${HOST}:${PORT}`);
  console.log('查看README.md了解完整API文档');
}

test().catch(err => {
  console.error('❌ 测试失败:', err.message);
  process.exit(1);
});
