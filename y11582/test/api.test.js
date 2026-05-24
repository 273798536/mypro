
import assert from 'assert';

const API_BASE = 'http://localhost:3001/api';

async function test() {
  console.log('=== 门店会员储值重试补偿队列 API - 验收测试 ===\n');

  try {
    console.log('1. 测试健康检查...');
    const health = await fetch(`${API_BASE}/health`);
    assert.equal(health.status, 200);
    console.log('   ✓ 健康检查通过\n');
  } catch (e) {
    console.log('   ✗ 健康检查失败:', e.message);
    return;
  }

  let taskId;
  try {
    console.log('2. 测试正常链路 - 创建任务...');
    const createRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({
        sourceType: 'recharge',
        sourceFile: '充值流水_202401.csv',
        sourceLine: 1,
        rawData: { memberId: 'M001', amount: '100', storeId: 'S001' },
        standardData: { memberId: 'M001', amount: '100', storeId: 'S001' },
      }),
    });
    const task = await createRes.json();
    assert.equal(createRes.status, 201);
    taskId = task.id;
    console.log('   ✓ 任务创建成功, ID:', taskId.slice(0, 8));
  } catch (e) {
    console.log('   ✗ 创建任务失败:', e.message);
    return;
  }

  try {
    console.log('\n3. 测试异常场景 - 重复提交...');
    const dupRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({
        sourceType: 'recharge',
        sourceFile: '充值流水_202401.csv',
        sourceLine: 1,
        rawData: { memberId: 'M001', amount: '100' },
        standardData: { memberId: 'M001', amount: '100' },
      }),
    });
    assert.equal(dupRes.status, 409);
    console.log('   ✓ 重复提交检测成功，返回 409');
  } catch (e) {
    console.log('   ✗ 重复提交检测失败:', e.message);
  }

  try {
    console.log('\n4. 测试异常场景 - 坏数据（负金额）...');
    const badRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({
        sourceType: 'recharge',
        sourceFile: '充值流水_202401.csv',
        sourceLine: 2,
        rawData: { memberId: 'M002', amount: '-50' },
        standardData: { memberId: 'M002', amount: '-50' },
      }),
    });
    assert.equal(badRes.status, 201);
    const badTask = await badRes.json();
    console.log('   ✓ 坏数据任务创建成功（将在处理时失败）');
    console.log('   任务 ID:', badTask.id.slice(0, 8));
  } catch (e) {
    console.log('   ✗ 坏数据测试失败:', e.message);
  }

  try {
    console.log('\n5. 测试查询任务列表...');
    const listRes = await fetch(`${API_BASE}/tasks`);
    const tasks = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(tasks));
    console.log('   ✓ 任务列表查询成功，共', tasks.length, '条任务');
  } catch (e) {
    console.log('   ✗ 查询任务列表失败:', e.message);
  }

  try {
    console.log('\n6. 测试查询看板统计...');
    const statsRes = await fetch(`${API_BASE}/dashboard/stats`);
    const stats = await statsRes.json();
    assert.equal(statsRes.status, 200);
    assert.ok('total' in stats);
    console.log('   ✓ 看板统计查询成功');
    console.log('     总任务数:', stats.total);
    console.log('     排队中:', stats.pending);
    console.log('     成功:', stats.success);
  } catch (e) {
    console.log('   ✗ 查询看板统计失败:', e.message);
  }

  try {
    console.log('\n7. 测试恢复后续跑...');
    const resumeRes = await fetch(`${API_BASE}/admin/resume`, { method: 'POST' });
    const result = await resumeRes.json();
    assert.equal(resumeRes.status, 200);
    console.log('   ✓ 恢复后续跑成功，恢复处理', result.resumed, '个任务');
  } catch (e) {
    console.log('   ✗ 恢复后续跑失败:', e.message);
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n请手动验证:');
  console.log('- 等待几秒后查看任务状态变化');
  console.log('- 负金额任务应进入等人工或等重试状态');
  console.log('- 正常金额任务应处理成功');
  console.log('- 重启服务后任务应能接着处理');
}

test().catch(console.error);
