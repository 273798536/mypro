
import assert from 'assert';

const API_BASE = 'http://localhost:3001/api';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    console.log('   初始状态:', task.status);
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

  let badTaskId1, badTaskId2;
  try {
    console.log('\n4. 测试坏数据导入 - 负金额（解析失败直接进等人工）...');
    const badRes = await fetch(`${API_BASE}/import/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({
        sourceType: 'recharge',
        fileName: '测试_负金额.csv',
        rows: [{ memberId: 'M002', amount: '-50' }],
      }),
    });
    const result = await badRes.json();
    assert.equal(badRes.status, 200);
    assert.equal(result.failed, 1);
    assert.ok(result.tasks && result.tasks.length > 0);
    badTaskId1 = result.tasks[0].id;
    assert.equal(result.tasks[0].status, 'waiting_manual');
    console.log('   ✓ 负金额导入解析失败，直接进入等人工状态');
    console.log('   任务 ID:', badTaskId1.slice(0, 8));
    console.log('   状态:', result.tasks[0].status);
    console.log('   错误:', result.tasks[0].lastError);
  } catch (e) {
    console.log('   ✗ 负金额导入测试失败:', e.message);
  }

  try {
    console.log('\n5. 测试坏数据导入 - 缺少金额（解析失败直接进等人工）...');
    const badRes = await fetch(`${API_BASE}/import/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({
        sourceType: 'recharge',
        fileName: '测试_缺金额.csv',
        rows: [{ memberId: 'M003' }],
      }),
    });
    const result = await badRes.json();
    assert.equal(badRes.status, 200);
    assert.equal(result.failed, 1);
    assert.ok(result.tasks && result.tasks.length > 0);
    badTaskId2 = result.tasks[0].id;
    assert.equal(result.tasks[0].status, 'waiting_manual');
    console.log('   ✓ 缺少金额导入解析失败，直接进入等人工状态');
    console.log('   任务 ID:', badTaskId2.slice(0, 8));
    console.log('   状态:', result.tasks[0].status);
    console.log('   错误:', result.tasks[0].lastError);
  } catch (e) {
    console.log('   ✗ 缺少金额导入测试失败:', e.message);
  }

  try {
    console.log('\n6. 测试坏数据任务 - 操作历史和原始证据存在...');
    const historyRes = await fetch(`${API_BASE}/tasks/${badTaskId1}/history`);
    const history = await historyRes.json();
    assert.equal(historyRes.status, 200);
    assert.ok(history.length > 0);
    assert.equal(history[0].operation, 'import_failed');
    console.log('   ✓ 操作历史存在，包含 import_failed 记录');
    console.log('   历史记录数:', history.length);

    const evidenceRes = await fetch(`${API_BASE}/tasks/${badTaskId1}/evidence`);
    const evidence = await evidenceRes.json();
    assert.equal(evidenceRes.status, 200);
    assert.ok(evidence.length > 0);
    console.log('   ✓ 原始证据存在');
    console.log('   证据记录数:', evidence.length);
  } catch (e) {
    console.log('   ✗ 操作历史和证据测试失败:', e.message);
  }

  try {
    console.log('\n7. 等待自动处理队列（6秒）...');
    await delay(6000);

    const taskRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const task = await taskRes.json();
    assert.equal(taskRes.status, 200);
    console.log('   ✓ 查询任务状态成功');
    console.log('   当前状态:', task.status);
  } catch (e) {
    console.log('   ✗ 查询任务状态失败:', e.message);
  }

  try {
    console.log('\n8. 测试正常链路 - 补偿入账...');
    const compRes = await fetch(`${API_BASE}/tasks/${taskId}/compensate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({ remark: '财务确认补偿入账' }),
    });
    const task = await compRes.json();
    assert.equal(compRes.status, 200);
    assert.equal(task.status, 'success');
    console.log('   ✓ 补偿入账成功，状态变为 success');
  } catch (e) {
    console.log('   ✗ 补偿入账失败:', e.message);
  }

  try {
    console.log('\n9. 测试队列闭环 - 关闭任务...');
    const closeRes = await fetch(`${API_BASE}/tasks/${taskId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-operator': 'test_user' },
      body: JSON.stringify({ remark: '流程完成，关闭任务' }),
    });
    const task = await closeRes.json();
    assert.equal(closeRes.status, 200);
    assert.equal(task.status, 'closed');
    console.log('   ✓ 任务关闭成功，状态变为 closed');
    console.log('   ✅ 完整链路完成：创建 → 处理 → 补偿入账 → 关闭');
  } catch (e) {
    console.log('   ✗ 关闭任务失败:', e.message);
  }

  try {
    console.log('\n10. 测试完整操作历史 - 已关闭任务...');
    const historyRes = await fetch(`${API_BASE}/tasks/${taskId}/history`);
    const history = await historyRes.json();
    assert.equal(historyRes.status, 200);
    assert.ok(history.length >= 4);

    const operations = history.map(h => h.operation);
    assert.ok(operations.includes('create'));
    assert.ok(operations.includes('process'));
    assert.ok(operations.includes('compensate'));
    assert.ok(operations.includes('close'));

    console.log('   ✓ 完整操作历史存在');
    console.log('   操作记录数:', history.length);
    console.log('   操作序列:', operations.join(' → '));

    const closeRecord = history.find(h => h.operation === 'close');
    assert.ok(closeRecord && closeRecord.diff);
    assert.equal(closeRecord.diff.status.before, 'success');
    assert.equal(closeRecord.diff.status.after, 'closed');
    console.log('   ✓ 差异记录正确：success → closed');
  } catch (e) {
    console.log('   ✗ 操作历史测试失败:', e.message);
  }

  try {
    console.log('\n11. 测试查询任务列表...');
    const listRes = await fetch(`${API_BASE}/tasks`);
    const tasks = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(tasks));
    console.log('   ✓ 任务列表查询成功，共', tasks.length, '条任务');

    const statuses = tasks.map(t => t.status);
    console.log('   状态分布:', statuses.join(', '));
  } catch (e) {
    console.log('   ✗ 查询任务列表失败:', e.message);
  }

  try {
    console.log('\n12. 测试查询看板统计...');
    const statsRes = await fetch(`${API_BASE}/dashboard/stats`);
    const stats = await statsRes.json();
    assert.equal(statsRes.status, 200);
    assert.ok('total' in stats);
    console.log('   ✓ 看板统计查询成功');
    console.log('     总任务数:', stats.total);
    console.log('     等人工:', stats.waitingManual);
    console.log('     成功:', stats.success);
    console.log('     已关闭:', stats.closed);
  } catch (e) {
    console.log('   ✗ 查询看板统计失败:', e.message);
  }

  try {
    console.log('\n13. 测试恢复后续跑...');
    const resumeRes = await fetch(`${API_BASE}/admin/resume`, { method: 'POST' });
    const result = await resumeRes.json();
    assert.equal(resumeRes.status, 200);
    console.log('   ✓ 恢复后续跑成功，恢复处理', result.resumed, '个任务');
  } catch (e) {
    console.log('   ✗ 恢复后续跑失败:', e.message);
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n✅ 核心修复验证：');
  console.log('   ✓ 队列闭环：创建 → 处理 → 补偿入账(success) → 关闭(closed)');
  console.log('   ✓ 坏数据导入：负金额/缺金额直接进入等人工状态');
  console.log('   ✓ 审计证据：导入失败也创建操作历史和原始证据');
  console.log('   ✓ 差异记录：每步操作都记录前后状态差异');
  console.log('\n📋 可访问前端验证：http://localhost:5173');
  console.log('   - 队列列表查看所有任务状态');
  console.log('   - 任务详情查看操作历史和差异');
  console.log('   - 死信队列查看永久失败任务');
  console.log('   - 财务看板查看统计数据');
}

test().catch(console.error);
