#!/usr/bin/env node

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

let passed = 0;
let failed = 0;
const results = [];

function resetDB() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
}

function request(method, path, data, userId = 'admin') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
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

function test(name, fn) {
  return async () => {
    try {
      await fn();
      passed++;
      results.push({ name, status: 'PASS' });
      console.log(`  ✓ ${name}`);
    } catch (e) {
      failed++;
      results.push({ name, status: 'FAIL', error: e.message });
      console.log(`  ✗ ${name}: ${e.message}`);
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function waitForServer(maxWait = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      await request('GET', '/health');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Server did not start in time');
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['src/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3000' }
    });

    server.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('服务已启动') || msg.includes('服务地址')) {
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('EADDRINUSE')) {
        resolve(null);
      }
    });

    setTimeout(() => resolve(server), 3000);
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       法务合同履约验收回放链路服务 - 自动化测试套件           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  resetDB();
  const server = await startServer();
  await waitForServer();
  console.log('  服务已就绪\n');

  const tests = [];

  console.log('【1. 健康检查】');
  tests.push(test('健康检查返回 OK', async () => {
    const res = await request('GET', '/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true);
    assert(res.data.data.status === 'ok');
  }));

  tests.push(test('健康检查包含统计信息', async () => {
    const res = await request('GET', '/health');
    assert(res.data.data.stats !== undefined);
    assert(res.data.data.user !== undefined);
  }));

  console.log('\n【2. 合同创建与幂等性】');
  tests.push(test('创建合同成功', async () => {
    const res = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-ct-001',
      contractId: 'CT-TEST-001',
      contractName: '测试合同A',
      partyA: '甲方公司',
      partyB: '乙方公司',
      totalAmount: 1000000,
      pdfHash: 'hash-test-001'
    });
    assert(res.status === 200);
    assert(res.data.success === true);
    assert(res.data.data.id === 'CT-TEST-001');
    assert(res.data.data.totalAmount === 1000000);
  }));

  tests.push(test('幂等性：重复请求返回同一条记录', async () => {
    const res1 = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-ct-002',
      contractId: 'CT-TEST-002',
      contractName: '测试合同B',
      partyA: '甲方',
      partyB: '乙方',
      totalAmount: 500000,
      pdfHash: 'hash-test-002'
    });
    const res2 = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-ct-002',
      contractId: 'CT-TEST-002',
      contractName: '测试合同B-重复',
      partyA: '甲方-重复',
      partyB: '乙方-重复',
      totalAmount: 999999,
      pdfHash: 'hash-test-002'
    });
    assert(res2.data.isUpdate === true, 'Should indicate isUpdate=true');
    assert(res2.data.data.contractName === '测试合同B', 'Should return original data');
    assert(res2.data.data.totalAmount === 500000, 'Should return original amount');
  }));

  tests.push(test('缺少幂等键返回错误', async () => {
    const res = await request('POST', '/api/contracts', {
      contractName: '无幂等键合同',
      partyA: 'A',
      partyB: 'B',
      totalAmount: 100,
      pdfHash: 'hash'
    });
    assert(res.data.success === false);
    assert(res.data.code === 'MISSING_IDEMPOTENCY_KEY');
  }));

  tests.push(test('缺少必填字段自动进入失败列表', async () => {
    const res = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-bad-001',
      partyA: 'A',
      totalAmount: 100,
      pdfHash: 'hash'
    });
    assert(res.data.success === false);
    const failedRes = await request('GET', '/api/failed-records');
    const badRecord = failedRes.data.data.find(r => r.errorCode === 'MISSING_REQUIRED_FIELD');
    assert(badRecord !== undefined, 'Bad data should be in failed records');
    assert(badRecord.entityType === 'contract');
  }));

  console.log('\n【3. 权限控制】');
  tests.push(test('只读用户无法创建合同', async () => {
    const res = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-viewer-001',
      contractName: '只读测试',
      partyA: 'A',
      partyB: 'B',
      totalAmount: 100,
      pdfHash: 'hash'
    }, 'viewer');
    assert(res.status === 403);
    assert(res.data.code === 'INSUFFICIENT_PERMISSION');
  }));

  tests.push(test('只读用户可以查看合同', async () => {
    const res = await request('GET', '/api/contracts', null, 'viewer');
    assert(res.status === 200);
    assert(res.data.data.length >= 2);
  }));

  tests.push(test('只读用户字段被过滤', async () => {
    const res = await request('GET', '/api/contracts', null, 'viewer');
    const contract = res.data.data[0];
    assert(contract.id !== undefined);
    assert(contract.contractName !== undefined);
    assert(contract.pdfHash === undefined, 'Viewer should not see pdfHash');
    assert(contract.createdAt === undefined, 'Viewer should not see createdAt');
  }));

  tests.push(test('录入员可以创建合同', async () => {
    const res = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-operator-001',
      contractId: 'CT-TEST-OP-001',
      contractName: '录入员测试合同',
      partyA: 'A',
      partyB: 'B',
      totalAmount: 200000,
      pdfHash: 'hash-test-op-001'
    }, 'operator');
    assert(res.status === 200);
    assert(res.data.success === true);
  }));

  tests.push(test('录入员无法冻结合同', async () => {
    const res = await request('POST', '/api/contracts/CT-TEST-001/freeze', null, 'operator');
    assert(res.status === 403);
    assert(res.data.code === 'INSUFFICIENT_PERMISSION');
  }));

  tests.push(test('复核员无法审批确认单', async () => {
    const res = await request('POST', '/api/confirmations/fake-id/approve', {
      approvalNotes: '测试'
    }, 'reviewer');
    assert(res.status === 403);
    assert(res.data.code === 'INSUFFICIENT_PERMISSION');
  }));

  console.log('\n【4. 付款节点管理】');
  tests.push(test('创建付款节点成功', async () => {
    const res = await request('POST', '/api/payment-nodes', {
      idempotencyKey: 'test-pn-001',
      contractId: 'CT-TEST-001',
      nodeName: '第一期付款',
      dueAmount: 300000,
      dueDate: '2024-06-01'
    });
    assert(res.status === 200);
    assert(res.data.success === true);
    assert(res.data.data.status === 'pending');
  }));

  tests.push(test('坏数据自动隔离到失败列表', async () => {
    await request('POST', '/api/payment-nodes', {
      idempotencyKey: 'test-bad-pn-001',
      contractId: 'NONEXISTENT-001',
      nodeName: '坏节点',
      dueAmount: 1000,
      dueDate: '2024-06-01'
    });
    const failedRes = await request('GET', '/api/failed-records');
    const badRecord = failedRes.data.data.find(r => r.errorCode === 'CONTRACT_NOT_FOUND' && r.entityType === 'paymentNode');
    assert(badRecord !== undefined, 'Bad paymentNode should be isolated');
    assert(badRecord.resolved === false);
  }));

  console.log('\n【5. 验收邮件流程】');
  tests.push(test('创建验收邮件成功', async () => {
    const nodesRes = await request('GET', '/api/payment-nodes?contractId=CT-TEST-001');
    const nodeId = nodesRes.data.data[0].id;
    
    const res = await request('POST', '/api/acceptance-emails', {
      idempotencyKey: 'test-ae-001',
      contractId: 'CT-TEST-001',
      paymentNodeId: nodeId,
      emailSubject: '验收确认邮件',
      emailFrom: 'pm@test.com',
      emailDate: '2024-05-20T10:00:00Z'
    });
    assert(res.status === 200);
    assert(res.data.success === true);
  }));

  tests.push(test('复核员可以复核验收邮件', async () => {
    const emailsRes = await request('GET', '/api/acceptance-emails?contractId=CT-TEST-001');
    const emailId = emailsRes.data.data[0].id;
    
    const res = await request('POST', `/api/acceptance-emails/${emailId}/review`, {
      result: 'pass',
      reviewNotes: '验收通过'
    }, 'reviewer');
    assert(res.status === 200);
    assert(res.data.success === true);
    assert(res.data.data.status === 'approved');
  }));

  console.log('\n【6. 二次确认单审批】');
  tests.push(test('创建二次确认单成功', async () => {
    const nodesRes = await request('GET', '/api/payment-nodes?contractId=CT-TEST-001');
    const nodeId = nodesRes.data.data[0].id;
    
    const res = await request('POST', '/api/confirmations', {
      idempotencyKey: 'test-cf-001',
      contractId: 'CT-TEST-001',
      paymentNodeId: nodeId,
      confirmationType: 'secondary',
      confirmingParty: '甲方确认'
    });
    assert(res.status === 200);
    assert(res.data.success === true);
    assert(res.data.data.status === 'pending');
  }));

  tests.push(test('主管可以审批确认单', async () => {
    const cfRes = await request('GET', '/api/confirmations?contractId=CT-TEST-001');
    const cfId = cfRes.data.data[0].id;
    
    const res = await request('POST', `/api/confirmations/${cfId}/approve`, {
      approvalNotes: '同意审批'
    }, 'admin');
    assert(res.status === 200);
    assert(res.data.success === true);
    assert(res.data.data.status === 'approved');
  }));

  tests.push(test('录入员无法审批确认单', async () => {
    const res = await request('POST', '/api/confirmations/fake-id/approve', {
      approvalNotes: '测试'
    }, 'operator');
    assert(res.status === 403);
  }));

  console.log('\n【7. 合同冻结与边界保护】');
  tests.push(test('主管可以冻结合同', async () => {
    const res = await request('POST', '/api/contracts/CT-TEST-001/freeze');
    assert(res.status === 200);
    assert(res.data.data.status === 'frozen');
    assert(res.data.data.frozenAt !== null);
    assert(res.data.data.frozenBy === 'admin');
  }));

  tests.push(test('冻结后无法新增付款节点', async () => {
    const res = await request('POST', '/api/payment-nodes', {
      idempotencyKey: 'test-frozen-pn-001',
      contractId: 'CT-TEST-001',
      nodeName: '冻结后新增',
      dueAmount: 100000,
      dueDate: '2024-12-01'
    });
    assert(res.data.success === false);
    assert(res.data.code === 'CONTRACT_FROZEN');
  }));

  tests.push(test('冻结后无法修改合同', async () => {
    const res = await request('PUT', '/api/contracts/CT-TEST-001', {
      contractName: '试图修改冻结合同'
    });
    assert(res.data.success === false);
    assert(res.data.code === 'CONTRACT_FROZEN');
  }));

  tests.push(test('冻结后无法新增验收邮件', async () => {
    const nodesRes = await request('GET', '/api/payment-nodes?contractId=CT-TEST-001');
    const nodeId = nodesRes.data.data[0].id;
    
    const res = await request('POST', '/api/acceptance-emails', {
      idempotencyKey: 'test-frozen-ae-001',
      contractId: 'CT-TEST-001',
      paymentNodeId: nodeId,
      emailSubject: '冻结后邮件',
      emailFrom: 'test@test.com',
      emailDate: '2024-12-01T00:00:00Z'
    });
    assert(res.data.success === false);
    assert(res.data.code === 'CONTRACT_FROZEN');
  }));

  console.log('\n【8. 对账与导出】');
  tests.push(test('导出对账报表成功', async () => {
    const res = await request('GET', '/api/exports/reconciliation');
    assert(res.status === 200);
    assert(res.data.data.filePath !== undefined);
    assert(res.data.data.recordCount > 0);
    assert(res.data.data.summary.totalContracts > 0);
  }));

  tests.push(test('导出完整回放数据', async () => {
    const res = await request('GET', '/api/exports/playback/CT-TEST-001');
    assert(res.status === 200);
    assert(res.data.data.playbackData !== undefined);
    assert(res.data.data.playbackData.paymentNodes.length > 0);
    assert(res.data.data.playbackData.contract.status === 'frozen');
  }));

  tests.push(test('导出失败记录列表', async () => {
    const res = await request('GET', '/api/exports/failed-records');
    assert(res.status === 200);
    assert(res.data.data.recordCount > 0);
  }));

  tests.push(test('只读用户无法导出', async () => {
    const res = await request('GET', '/api/exports/reconciliation', null, 'viewer');
    assert(res.status === 403);
    assert(res.data.code === 'EXPORT_PERMISSION_DENIED');
  }));

  console.log('\n【9. 补充协议支持】');
  tests.push(test('创建补充协议合同', async () => {
    const res = await request('POST', '/api/contracts', {
      idempotencyKey: 'test-supp-001',
      contractId: 'CT-TEST-SUPP-001',
      contractName: '测试合同A-补充协议一',
      partyA: '甲方公司',
      partyB: '乙方公司',
      totalAmount: 200000,
      pdfHash: 'hash-supp-001',
      parentContractId: 'CT-TEST-002'
    });
    assert(res.status === 200);
    assert(res.data.data.isSupplement === true);
    assert(res.data.data.parentContractId === 'CT-TEST-002');
  }));

  tests.push(test('查询补充协议列表', async () => {
    const res = await request('GET', '/api/contracts?isSupplement=true');
    assert(res.data.data.length >= 1);
    assert(res.data.data.every(c => c.isSupplement === true));
  }));

  console.log('\n【10. 版本历史追踪】');
  tests.push(test('合同版本历史可查询', async () => {
    const res = await request('GET', '/api/contracts/CT-TEST-001/versions');
    assert(res.status === 200);
    assert(res.data.data.length >= 1);
    assert(res.data.data[0].action !== undefined);
  }));

  for (const t of tests) {
    await t();
  }

  console.log('\n');

  if (server) {
    server.kill();
  }

  const summary = `\n测试结果: ${passed} 通过, ${failed} 失败, 共 ${passed + failed} 项`;
  console.log(summary);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n失败详情:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.error}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('测试运行失败:', e);
  process.exit(1);
});
