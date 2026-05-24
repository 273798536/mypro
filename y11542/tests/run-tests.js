const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function request(method, path, data = null) {
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

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({ status: res.statusCode, body });
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
  console.log('='.repeat(60));
  console.log('开始运行测试套件');
  console.log('='.repeat(60));

  let testResults = { passed: 0, failed: 0 };
  let createdTaskIds = [];

  function test(name, fn) {
    console.log(`\n测试: ${name}`);
    console.log('-'.repeat(40));
    return fn();
  }

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      testResults.passed++;
      return true;
    } else {
      console.log(`  ❌ ${message}`);
      testResults.failed++;
      return false;
    }
  }

  try {
    await test('1. 健康检查', async () => {
      const res = await request('GET', '/api/health');
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.success === true, '响应应包含 success: true');
      assert(res.data.data.status === 'ok', '状态应为 ok');
    });

    await test('2. 获取常量定义', async () => {
      const res = await request('GET', '/api/constants');
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.TASK_STATUS, '应包含 TASK_STATUS');
      assert(res.data.data.FAILURE_TYPE, '应包含 FAILURE_TYPE');
    });

    await test('3. 提交正常任务', async () => {
      const res = await request('POST', '/api/tasks/submit', {
        material_id: 'MAT001',
        audit_result: 'approved',
        cost_report: {
          date: '2024-01-15',
          platform: '抖音',
          spend: 1500.00
        },
        supplier_statement: {
          supplier: '供应商A',
          amount: 1450.00
        }
      });
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.success === true, '提交应成功');
      assert(res.data.data.id, '应返回任务ID');
      assert(res.data.data.material_id === 'MAT001', '素材ID应匹配');
      assert(res.data.data.status === 'pending', '初始状态应为 pending');
      
      createdTaskIds.push(res.data.data.id);
    });

    await test('4. 提交缺少必填字段的任务（坏数据测试）', async () => {
      const res = await request('POST', '/api/tasks/submit', {
        audit_result: 'approved'
      });
      
      assert(res.status === 400, '状态码应为 400');
      assert(res.data.success === false, '提交应失败');
      assert(res.data.error.includes('material_id'), '错误应提示缺少 material_id');
    });

    await test('5. 重复提交同素材任务', async () => {
      const res1 = await request('POST', '/api/tasks/submit', {
        material_id: 'MAT002',
        audit_result: 'pending'
      });
      
      const res2 = await request('POST', '/api/tasks/submit', {
        material_id: 'MAT002',
        audit_result: 'approved'
      });
      
      assert(res1.status === 200, '第一次提交应成功');
      assert(res2.status === 200, '第二次提交也应成功（允许重复提交，各自独立）');
      assert(res1.data.data.id !== res2.data.data.id, '应生成不同的任务ID');
      
      createdTaskIds.push(res1.data.data.id, res2.data.data.id);
    });

    await test('6. 查询任务列表', async () => {
      const res = await request('GET', '/api/tasks');
      assert(res.status === 200, '状态码应为 200');
      assert(Array.isArray(res.data.data), '应返回数组');
      assert(res.data.data.length >= 3, '至少应有3个任务');
    });

    await test('7. 按状态筛选任务', async () => {
      const res = await request('GET', '/api/tasks?status=pending');
      assert(res.status === 200, '状态码应为 200');
      const allPending = res.data.data.every(t => t.status === 'pending');
      assert(allPending, '所有返回的任务都应是 pending 状态');
    });

    await test('8. 查询单个任务详情', async () => {
      const taskId = createdTaskIds[0];
      const res = await request('GET', `/api/tasks/${taskId}`);
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.task, '应包含 task 字段');
      assert(res.data.data.history, '应包含 history 字段');
      assert(Array.isArray(res.data.data.history), 'history 应为数组');
    });

    await test('9. 查询不存在的任务', async () => {
      const res = await request('GET', '/api/tasks/nonexistent-id');
      assert(res.status === 404, '状态码应为 404');
      assert(res.data.success === false, '应返回失败');
    });

    await test('10. 人工接管任务', async () => {
      const taskId = createdTaskIds[0];
      const res = await request('POST', `/api/tasks/${taskId}/manual-takeover`, {
        handler: '张三',
        note: '数据需要人工核对'
      });
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.status === 'manual_takeover', '状态应为 manual_takeover');
    });

    await test('11. 补偿入账', async () => {
      const taskId = createdTaskIds[1];
      const res = await request('POST', `/api/tasks/${taskId}/compensate`, {
        amount: 500.00,
        note: '归因补偿',
        operator: '财务'
      });
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.status === 'compensated', '状态应为 compensated');
      assert(res.data.data.compensation_amount === 500, '补偿金额应匹配');
    });

    await test('12. 关闭任务', async () => {
      const taskId = createdTaskIds[2];
      const res = await request('POST', `/api/tasks/${taskId}/close`, {
        reason: '已核实无误，无需处理',
        operator: '审核员'
      });
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.status === 'closed', '状态应为 closed');
    });

    await test('13. 查询任务历史', async () => {
      const taskId = createdTaskIds[0];
      const res = await request('GET', `/api/tasks/${taskId}/history`);
      
      assert(res.status === 200, '状态码应为 200');
      assert(Array.isArray(res.data.data), '应返回数组');
      assert(res.data.data.length >= 2, '至少应有2条历史记录（创建 + 人工接管）');
    });

    await test('14. 获取统计数据', async () => {
      const res = await request('GET', '/api/tasks/statistics/summary');
      
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.byStatus, '应包含 byStatus');
      assert(res.data.data.byFailureType, '应包含 byFailureType');
      assert(res.data.data.retryDistribution, '应包含 retryDistribution');
      assert(typeof res.data.data.manualPending === 'number', 'manualPending 应为数字');
      assert(typeof res.data.data.permanentFailed === 'number', 'permanentFailed 应为数字');
      assert(res.data.data.compensation, '应包含 compensation');
    });

    await test('15. 触发任务处理', async () => {
      const newTaskRes = await request('POST', '/api/tasks/submit', {
        material_id: 'MAT003',
        audit_result: 'approved'
      });
      
      const taskId = newTaskRes.data.data.id;
      createdTaskIds.push(taskId);
      
      const res = await request('POST', `/api/tasks/${taskId}/trigger`);
      assert(res.status === 200, '状态码应为 200');
      assert(res.data.data.message, '应返回消息');
    });

  } catch (error) {
    console.error('测试执行出错:', error);
    testResults.failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`总计: ${testResults.passed + testResults.failed}`);
  console.log(`创建的任务ID: ${createdTaskIds.join(', ')}`);
  console.log('='.repeat(60));

  process.exit(testResults.failed > 0 ? 1 : 0);
}

setTimeout(() => {
  runTests();
}, 2000);