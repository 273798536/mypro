const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function runTests() {
  console.log('🚀 开始测试水务抢修材料重试补偿队列服务\n');

  console.log('1️⃣  登录 - 主管账号');
  const loginRes = await request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  console.log(`   状态: ${loginRes.status}`);
  console.log(`   Token获取: ${loginRes.status === 200 ? '✅ 成功' : '❌ 失败'}`);
  
  if (loginRes.status !== 200) {
    console.error('登录失败，终止测试');
    process.exit(1);
  }
  
  const token = loginRes.data.token;
  console.log('');

  console.log('2️⃣  创建派工单');
  const workOrderRes = await request('POST', '/api/workorders', {
    order_no: `WO-TEST-${Date.now()}`,
    repair_type: '水管爆裂抢修',
    site_address: '东区大道123号',
    old_caliber: 'DN100',
    new_caliber: 'DN150',
    shift_record: '夜班 20:00-08:00'
  }, token);
  console.log(`   状态: ${workOrderRes.status}`);
  console.log(`   派工单ID: ${workOrderRes.data?.id || 'N/A'}`);
  
  if (workOrderRes.status !== 201) {
    console.error('创建派工单失败');
    process.exit(1);
  }
  
  const workOrderId = workOrderRes.data.id;
  console.log('');

  console.log('3️⃣  提交补偿任务到队列');
  const queueRes = await request('POST', '/api/queue/submit', {
    work_order_id: workOrderId,
    item_type: 'material_compensation',
    payload: {
      workOrderId: workOrderId,
      materials: [
        { material_name: 'DN150闸阀', quantity: 2, unit_price: 850.00, compensation_type: 'night_emergency' },
        { material_name: '密封垫片', quantity: 5, unit_price: 25.00, compensation_type: 'normal' }
      ]
    }
  }, token);
  console.log(`   状态: ${queueRes.status}`);
  console.log(`   队列项ID: ${queueRes.data?.id || 'N/A'}`);
  const queueItemId = queueRes.data?.id;
  console.log('');

  console.log('4️⃣  等待3秒让队列自动处理...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('');

  console.log('5️⃣  查看队列状态');
  const statusRes = await request('GET', '/api/queue/status', null, token);
  console.log(`   状态: ${statusRes.status}`);
  console.log('   队列统计:', statusRes.data);
  console.log('');

  console.log('6️⃣  查看重试分类统计 (站点负责人重点关注)');
  const classRes = await request('GET', '/api/queue/classification', null, token);
  console.log(`   状态: ${classRes.status}`);
  console.log('   分类统计:', classRes.data);
  console.log('');

  console.log('7️⃣  查看补偿报表');
  const reportRes = await request('GET', '/api/compensation/report?include_unverified=true', null, token);
  console.log(`   状态: ${reportRes.status}`);
  console.log(`   总记录数: ${reportRes.data?.summary?.totalRecords || 0}`);
  console.log(`   已复核: ${reportRes.data?.summary?.verifiedCount || 0}`);
  console.log(`   总金额: ${reportRes.data?.summary?.totalAmount || 0}`);
  console.log('');

  if (queueItemId) {
    console.log('8️⃣  查看队列项历史追踪');
    const historyRes = await request('GET', `/api/queue/item/${queueItemId}/history`, null, token);
    console.log(`   状态: ${historyRes.status}`);
    console.log(`   历史记录数: ${historyRes.data?.length || 0}`);
    console.log('');
  }

  console.log('9️⃣  测试只读账号权限');
  const viewerLoginRes = await request('POST', '/api/auth/login', {
    username: 'viewer1',
    password: 'view123'
  });
  const viewerToken = viewerLoginRes.data?.token;
  
  if (viewerToken) {
    const protectedRes = await request('POST', '/api/workorders', {
      order_no: 'WO-TEST-VIEWER',
      repair_type: '测试'
    }, viewerToken);
    console.log(`   只读账号尝试创建派工单: ${protectedRes.status === 403 ? '✅ 正确拒绝' : '❌ 权限漏洞'}`);
  }
  console.log('');

  console.log('🎉 测试完成!');
  console.log('');
  console.log('📋 接下来你可以:');
  console.log('   1. 重启服务后再次查询，验证数据持久化');
  console.log('   2. 查看失败清单: curl -s "http://localhost:3000/api/queue/failed" -H "Authorization: Bearer <token>"');
  console.log('   3. 导出CSV报表: curl -s "http://localhost:3000/api/compensation/export" -H "Authorization: Bearer <token>" -o report.csv');
  console.log('');
}

runTests().catch(console.error);
