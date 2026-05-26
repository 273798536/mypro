const http = require('http');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const url = new URL(path, BASE_URL);
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push({ message, details });
    console.log(`  ✗ ${message} ${details ? '- ' + details : ''}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('==========================================');
  console.log('客服知识库发布权限追责台账 API - 测试套件');
  console.log(`目标服务: ${BASE_URL}`);
  console.log('==========================================\n');

  const testHeaders = {
    'X-User-Id': 'test-user-001',
    'X-User-Name': 'TestUser',
    'X-User-Role': 'TESTER'
  };

  // Test 1: Health check
  console.log('【1】健康检查');
  try {
    const health = await request('GET', '/api/health');
    assert(health.status === 200, '服务响应状态为 200');
    assert(health.data?.success === true, '返回 success=true');
    assert(health.data?.data?.status === 'ok', '服务状态为 ok');
  } catch (e) {
    assert(false, '健康检查失败', e.message);
    console.log('\n无法连接到服务，请先启动服务: npm start');
    process.exit(1);
  }
  console.log();

  // Test 2: Create change order without orderNo
  console.log('【2】创建变更单草稿（不传 orderNo）');
  let orderId = null;
  try {
    const idempotentKey = 'test-create-no-orderno-' + Date.now();
    const draft = await request('POST', '/api/change-orders', {
      title: '测试不传orderNo创建',
      type: 'CREATE',
      knowledgeId: 'KB-TEST-001',
      knowledgeTitle: '测试知识库',
      content: '这是测试内容',
      changeReason: '测试自动生成orderNo'
    }, { ...testHeaders, 'X-Idempotent-Key': idempotentKey });

    assert(draft.status === 201, '创建返回 201 状态码');
    assert(draft.data?.success === true, '返回 success=true');
    assert(draft.data?.data?.orderNo != null, '自动生成了 orderNo');
    assert(draft.data?.data?.orderNo.startsWith('CO-'), 'orderNo 以 CO- 开头');
    assert(draft.data?.data?.status === 'DRAFT', '初始状态为 DRAFT');
    orderId = draft.data?.data?.id;
  } catch (e) {
    assert(false, '创建变更单失败', e.message);
  }
  console.log();

  // Test 3: Submit workflow
  console.log('【3】工作流 DRAFT→SUBMITTED→REJECTED→SUBMITTED→CONFIRMED→AUDITED');
  try {
    const submitResp = await request('POST', `/api/change-orders/${orderId}/submit`, {
      changeReason: '测试提交'
    }, testHeaders);
    assert(submitResp.status === 200, '提交成功');
    assert(submitResp.data?.data?.status === 'SUBMITTED', '状态变为 SUBMITTED');

    const rejectResp = await request('POST', `/api/change-orders/${orderId}/reject`, {
      rejectReason: '测试驳回',
      riskLevel: 'LOW'
    }, { ...testHeaders, 'X-User-Id': 'reviewer-001', 'X-User-Name': 'Reviewer', 'X-User-Role': 'REVIEWER' });
    assert(rejectResp.status === 200, '驳回成功');
    assert(rejectResp.data?.data?.status === 'REJECTED', '状态变为 REJECTED');

    const updateResp = await request('PUT', `/api/change-orders/${orderId}`, {
      content: '修改后的内容'
    }, testHeaders);
    assert(updateResp.status === 200, '修改草稿成功');

    const resubmitResp = await request('POST', `/api/change-orders/${orderId}/submit`, {
      changeReason: '修改后重新提交'
    }, testHeaders);
    assert(resubmitResp.status === 200, '重新提交成功');
    assert(resubmitResp.data?.data?.status === 'SUBMITTED', '状态重新变为 SUBMITTED');

    const confirmResp = await request('POST', `/api/change-orders/${orderId}/confirm`, {
      opinion: '测试二次确认'
    }, { ...testHeaders, 'X-User-Id': 'reviewer-002', 'X-User-Name': 'Reviewer2', 'X-User-Role': 'REVIEWER' });
    assert(confirmResp.status === 200, '二次确认成功');
    assert(confirmResp.data?.data?.status === 'CONFIRMED', '状态变为 CONFIRMED');

    const auditResp = await request('POST', `/api/change-orders/${orderId}/audit`, {
      opinion: '测试审计'
    }, { ...testHeaders, 'X-User-Id': 'auditor-001', 'X-User-Name': 'Auditor', 'X-User-Role': 'AUDITOR' });
    assert(auditResp.status === 200, '审计归档成功');
    assert(auditResp.data?.data?.status === 'AUDITED', '最终状态为 AUDITED');
  } catch (e) {
    assert(false, '工作流测试失败', e.message);
  }
  console.log();

  // Test 4: Batch import change orders WITHOUT orderNo (core fix)
  console.log('【4】批量导入变更单（不传 orderNo）');
  let batchTaskId = null;
  try {
    const batchId = 'BATCH-TEST-CO-' + Date.now();
    const batchResp = await request('POST', '/api/tasks/import/change-orders', {
      batchId,
      batchStrategy: 'IGNORE',
      items: [
        {
          title: '批量导入测试1（无orderNo）',
          type: 'UPDATE',
          knowledgeId: 'KB-BATCH-001',
          content: '批量导入测试内容1',
          changeReason: '测试批量导入不传orderNo'
        },
        {
          title: '批量导入测试2（无orderNo）',
          type: 'CREATE',
          knowledgeId: 'KB-BATCH-002',
          content: '批量导入测试内容2',
          changeReason: '测试批量导入不传orderNo'
        }
      ]
    }, testHeaders);

    assert(batchResp.status === 200, '批量导入任务创建成功');
    assert(batchResp.data?.success === true, '返回 success=true');
    assert(batchResp.data?.data?.taskId != null, '返回了 taskId');
    batchTaskId = batchResp.data?.data?.taskId;

    await sleep(1000);

    const taskResp = await request('GET', `/api/tasks/${batchTaskId}`);
    const task = taskResp.data?.data;
    assert(task != null, '任务状态可查询');
    assert(task?.successCount > 0, `成功数 > 0（实际: ${task?.successCount}）`);
    assert(task?.failedCount === 0, `失败数为 0（实际: ${task?.failedCount}）`);
    assert(task?.status === 'COMPLETED', `任务状态为 COMPLETED（实际: ${task?.status}）`);

    const taskResult = JSON.parse(task?.result || '{}');
    assert(taskResult?.success?.length === 2, `成功创建 2 条（实际: ${taskResult?.success?.length}）`);
    assert(taskResult.failed?.length === 0, `失败 0 条（实际: ${taskResult.failed?.length}）`);

    for (const item of taskResult.success) {
      assert(item.orderNo != null && item.orderNo.startsWith('CO-'), `生成的 orderNo 有效: ${item.orderNo}`);
    }
  } catch (e) {
    assert(false, '批量导入变更单测试失败', e.message);
  }
  console.log();

  // Test 5: Batch import reference records WITHOUT recordNo (core fix)
  console.log('【5】批量导入客服引用记录（不传 recordNo）');
  try {
    const batchId = 'BATCH-TEST-REF-' + Date.now();
    const refBatchResp = await request('POST', '/api/reference-records/batch', {
      batchId,
      batchStrategy: 'IGNORE',
      items: [
        {
          knowledgeId: 'KB-REF-001',
          knowledgeTitle: '测试知识库1',
          agentId: 'agent-test-001',
          agentName: 'TestAgent1',
          agentRole: 'CUSTOMER_SERVICE',
          isOfflineContent: true,
          referenceType: 'COPY',
          isErrorClaim: true,
          errorClaimAmount: 100.00,
          errorClaimReason: '测试错赔记录1',
          relatedOrderNo: 'ORDER-TEST-001'
        },
        {
          knowledgeId: 'KB-REF-002',
          knowledgeTitle: '测试知识库2',
          agentId: 'agent-test-002',
          agentName: 'TestAgent2',
          agentRole: 'CUSTOMER_SERVICE',
          isOfflineContent: false,
          referenceType: 'VIEW',
          isErrorClaim: false
        }
      ]
    }, testHeaders);

    assert(refBatchResp.status === 200, '批量导入引用记录任务创建成功');
    const refTaskId = refBatchResp.data?.data?.taskId;
    assert(refTaskId != null, '返回了 taskId');

    await sleep(1000);

    const refTaskResp = await request('GET', `/api/tasks/${refTaskId}`);
    const refTask = refTaskResp.data?.data;
    assert(refTask?.successCount > 0, `成功数 > 0（实际: ${refTask?.successCount}）`);
    assert(refTask?.failedCount === 0, `失败数为 0（实际: ${refTask?.failedCount}）`);
    assert(refTask?.status === 'COMPLETED', `任务状态为 COMPLETED（实际: ${refTask?.status}）`);

    const refResult = JSON.parse(refTask?.result || '{}');
    assert(refResult?.success?.length === 2, `成功创建 2 条（实际: ${refResult?.success?.length}）`);
    assert(refResult.failed?.length === 0, `失败 0 条（实际: ${refResult.failed?.length}）`);

    for (const item of refResult.success) {
      assert(item.recordNo != null && item.recordNo.startsWith('REF-'), `生成的 recordNo 有效: ${item.recordNo}`);
    }
  } catch (e) {
    assert(false, '批量导入引用记录测试失败', e.message);
  }
  console.log();

  // Test 6: Idempotency
  console.log('【6】幂等性测试');
  try {
    const idemKey = 'test-idempotent-' + Date.now();
    
    const firstResp = await request('POST', '/api/change-orders', {
      title: '幂等性测试',
      type: 'CREATE',
      knowledgeId: 'KB-IDEM-001',
      content: '测试幂等性'
    }, { ...testHeaders, 'X-Idempotent-Key': idemKey });

    assert(firstResp.status === 201, '第一次请求成功');
    const firstOrderNo = firstResp.data?.data?.orderNo;

    const secondResp = await request('POST', '/api/change-orders', {
      title: '幂等性测试',
      type: 'CREATE',
      knowledgeId: 'KB-IDEM-001',
      content: '测试幂等性'
    }, { ...testHeaders, 'X-Idempotent-Key': idemKey });

    assert(secondResp.status === 200, '第二次请求返回缓存结果（200）');
    assert(secondResp.data?._meta?.idempotent === true, '标记为幂等请求');
    assert(secondResp.data?._meta?.cached === true, '标记为缓存结果');
  } catch (e) {
    assert(false, '幂等性测试失败', e.message);
  }
  console.log();

  // Test 7: Audit logs
  console.log('【7】审计日志查询');
  try {
    const logsResp = await request('GET', '/api/audit/logs?entityType=CHANGE_ORDER&pageSize=5');
    assert(logsResp.status === 200, '查询审计日志成功');
    assert(logsResp.data?.data?.total > 0, '有审计日志记录');
    assert(logsResp.data?.data?.list?.length > 0, '日志列表不为空');

    const log = logsResp.data?.data?.list[0];
    assert(log.entityType === 'CHANGE_ORDER', '实体类型正确');
    assert(log.action != null, '有操作类型');
    assert(log.operatorId != null, '有操作人');
    assert(log.createdAt != null, '有创建时间');
  } catch (e) {
    assert(false, '审计日志查询测试失败', e.message);
  }
  console.log();

  // Test 8: Change order history
  console.log('【8】变更历史查询');
  try {
    const historyResp = await request('GET', `/api/change-orders/${orderId}/history`);
    assert(historyResp.status === 200, '查询变更历史成功');
    const history = historyResp.data?.data;
    assert(Array.isArray(history), '历史记录为数组');
    assert(history.length >= 6, `历史记录 >= 6 条（实际: ${history.length}）`);

    const actions = history.map(h => h.action);
    assert(actions.includes('CREATE'), '包含 CREATE 操作');
    assert(actions.includes('SUBMIT'), '包含 SUBMIT 操作');
    assert(actions.includes('REJECT'), '包含 REJECT 操作');
    assert(actions.includes('CONFIRM'), '包含 CONFIRM 操作');
    assert(actions.includes('AUDIT'), '包含 AUDIT 操作');
  } catch (e) {
    assert(false, '变更历史查询测试失败', e.message);
  }
  console.log();

  // Test 9: Error claim statistics
  console.log('【9】错赔统计');
  try {
    const statsResp = await request('GET', '/api/audit/error-claim-stats');
    assert(statsResp.status === 200, '查询错赔统计成功');
    const stats = statsResp.data?.data;
    assert(stats != null, '返回统计数据');
    assert(typeof stats.totalReferences === 'number', '有引用总数');
    assert(typeof stats.errorClaimCount === 'number', '有错赔次数');
  } catch (e) {
    assert(false, '错赔统计测试失败', e.message);
  }
  console.log();

  // Test 10: Generate report
  console.log('【10】生成运营报告');
  try {
    const reportResp = await request('GET', '/api/export/report?desensitize=true');
    assert(reportResp.status === 200, '生成报告成功');
    const report = reportResp.data?.data;
    assert(report?.summary != null, '有摘要信息');
    assert(report.summary.totalChangeOrders > 0, '变更单总数 > 0');
    assert(report.summary.totalReferences > 0, '引用记录数 > 0');
  } catch (e) {
    assert(false, '生成报告测试失败', e.message);
  }
  console.log();

  // Test 11: Query failed tasks
  console.log('【11】查询失败任务清单');
  try {
    const permanentFailed = await request('GET', '/api/tasks?status=FAILED_PERMANENT');
    assert(permanentFailed.status === 200, '查询永久失败任务成功');
    assert(permanentFailed.data?.data?.total >= 0, '永久失败任务数 >= 0');

    const waitingManual = await request('GET', '/api/tasks?status=WAITING_MANUAL');
    assert(waitingManual.status === 200, '查询等待人工任务成功');

    const waitingRetry = await request('GET', '/api/tasks?status=WAITING_RETRY');
    assert(waitingRetry.status === 200, '查询等待重试任务成功');
  } catch (e) {
    assert(false, '查询失败任务清单测试失败', e.message);
  }
  console.log();

  // Test 12: Role view statistics
  console.log('【12】角色视图统计');
  try {
    const roleResp = await request('GET', '/api/audit/role-view');
    assert(roleResp.status === 200, '查询角色视图成功');
    const roleData = roleResp.data?.data;
    assert(roleData?.roleStats != null, '有角色统计数据');
    assert(Array.isArray(roleData.roleStats), '角色统计为数组');
  } catch (e) {
    assert(false, '角色视图统计测试失败', e.message);
  }
  console.log();

  // Test 13: Batch with OVERWRITE strategy
  console.log('【13】批量覆盖策略测试');
  try {
    const batchId = 'BATCH-TEST-OVERWRITE-' + Date.now();
    
    const firstBatch = await request('POST', '/api/tasks/import/change-orders', {
      batchId,
      batchStrategy: 'OVERWRITE',
      items: [
        {
          orderNo: 'CO-OVERWRITE-TEST-001',
          title: '覆盖测试-原始',
          type: 'CREATE',
          knowledgeId: 'KB-OVERWRITE-001',
          content: '原始内容',
          changeReason: '覆盖策略测试'
        }
      ]
    }, testHeaders);
    assert(firstBatch.status === 200, '第一次批量导入成功');
    const firstTaskId = firstBatch.data?.data?.taskId;
    await sleep(1000);

    const secondBatch = await request('POST', '/api/tasks/import/change-orders', {
      batchId: batchId + '-v2',
      batchStrategy: 'OVERWRITE',
      items: [
        {
          orderNo: 'CO-OVERWRITE-TEST-001',
          title: '覆盖测试-更新',
          type: 'UPDATE',
          knowledgeId: 'KB-OVERWRITE-001',
          content: '更新后的内容',
          changeReason: '覆盖策略测试-更新'
        }
      ]
    }, testHeaders);
    assert(secondBatch.status === 200, '第二次批量导入成功');
    const secondTaskId = secondBatch.data?.data?.taskId;
    await sleep(1000);

    const secondTaskResp = await request('GET', `/api/tasks/${secondTaskId}`);
    const secondTask = secondTaskResp.data?.data;
    const secondResult = JSON.parse(secondTask?.result || '{}');
    assert(secondResult?.success?.length === 1, '成功处理 1 条');
    assert(secondResult.success[0].action === 'overwritten', '操作类型为 overwritten');
  } catch (e) {
    assert(false, '批量覆盖策略测试失败', e.message);
  }
  console.log();

  // Test 14: Sensitive fields statistics (fixed Op.ne bug)
  console.log('【14】敏感字段统计');
  try {
    const sensitiveResp = await request('GET', '/api/audit/sensitive-stats');
    assert(sensitiveResp.status === 200, '查询敏感字段统计成功');
    const sensitiveData = sensitiveResp.data?.data;
    assert(sensitiveData != null, '返回敏感字段统计数据');
    assert(typeof sensitiveData.totalChangeOrders === 'number', '有变更单总数');
    assert(typeof sensitiveData.sensitiveChangeOrders === 'number', '有敏感变更单数');
    assert(typeof sensitiveData.sensitiveRatio === 'string', '有敏感比例');
    assert(Array.isArray(sensitiveData.topSensitiveFields), '敏感字段列表为数组');
  } catch (e) {
    assert(false, '敏感字段统计测试失败', e.message);
  }
  console.log();

  // Summary
  console.log('==========================================');
  console.log('测试结果汇总');
  console.log('==========================================');
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);
  console.log(`  总计: ${passed + failed}`);
  console.log();

  if (failures.length > 0) {
    console.log('失败详情:');
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.message}`);
      if (f.details) console.log(`     ${f.details}`);
    });
    console.log();
  }

  console.log('==========================================');
  console.log('验证命令：');
  console.log('  查看失败清单:');
  console.log(`    curl "${BASE_URL}/api/tasks?status=FAILED_PERMANENT"`);
  console.log();
  console.log('  查看修正结果:');
  console.log(`    curl "${BASE_URL}/api/change-orders?status=AUDITED"`);
  console.log();
  console.log('  导出最终报告:');
  console.log(`    curl "${BASE_URL}/api/export/report"`);
  console.log('==========================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('测试执行出错:', e);
  process.exit(1);
});
