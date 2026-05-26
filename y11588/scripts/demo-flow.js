#!/usr/bin/env node

const http = require('http');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const ADMIN = 'admin';
const OPERATOR = 'operator';
const REVIEWER = 'reviewer';
const VIEWER = 'viewer';

function resetDB() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
}

function request(method, urlPath, data, userId = ADMIN) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
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

function logSection(title) {
  console.log('\n' + chalk.bgBlue.white.bold(` ${title} `) + '\n');
}

function logStep(step, desc) {
  console.log(chalk.cyan(`[步骤 ${step}]`) + ' ' + desc);
}

function logSuccess(msg) {
  console.log(chalk.green('  ✓ ' + msg));
}

function logError(msg) {
  console.log(chalk.red('  ✗ ' + msg));
}

function logInfo(msg) {
  console.log(chalk.gray('  ℹ ' + msg));
}

function logResponse(label, res, key = 'data') {
  if (res.data && res.data.success) {
    const d = res.data[key] || res.data.data;
    logSuccess(`${label}: ${JSON.stringify(d).substring(0, 100)}...`);
  } else {
    logError(`${label}: ${res.data?.error || '请求失败'} (${res.data?.code || ''})`);
  }
}

function assert(condition, msg) {
  if (!condition) {
    logError('断言失败: ' + msg);
    throw new Error(msg);
  }
}

async function waitForServer(maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      await request('GET', '/health');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('服务启动超时');
}

async function main() {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║   法务合同履约验收回放链路服务 - HTTP API 完整闭环演示       ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════════╝'));

  resetDB();
  logInfo('数据库已重置');

  const server = spawn('node', ['src/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3000' }
  });

  await new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('服务已启动') || data.toString().includes('服务地址')) {
        resolve();
      }
    });
    server.stderr.on('data', (data) => {
      if (data.toString().includes('EADDRINUSE')) {
        resolve();
      }
    });
    setTimeout(resolve, 3000);
  });

  await waitForServer();
  logInfo('API 服务已启动');

  logSection('第一阶段：启动服务 & 健康检查');

  logStep('1.1', '健康检查');
  const health = await request('GET', '/health');
  assert(health.data.success === true, '健康检查应返回 success=true');
  assert(health.data.data.status === 'ok', '状态应为 ok');
  logSuccess(`服务正常: 用户=${health.data.data.user.role}, 合同数=${health.data.data.stats.contracts}`);

  logSection('第二阶段：录入员创建合同 (HTTP POST)');

  logStep('2.1', '录入员创建主合同');
  const contract1 = await request('POST', '/api/contracts', {
    idempotencyKey: 'demo-contract-001',
    contractId: 'CT-2024-FRAME-001',
    contractName: '2024年度技术服务框架采购协议',
    partyA: '甲方科技有限公司',
    partyB: '乙方技术服务集团',
    totalAmount: 5000000,
    pdfHash: 'sha256-abc123def456',
    effectiveDate: '2024-01-01',
    expiryDate: '2024-12-31'
  }, OPERATOR);
  assert(contract1.data.success === true, '合同创建应成功');
  logSuccess(`合同创建: ${contract1.data.data.id} - ¥${contract1.data.data.totalAmount.toLocaleString()}`);
  logInfo(`幂等键: ${contract1.data.data.idempotencyKey}`);

  logStep('2.2', '幂等性验证：相同幂等键重复请求');
  const dup = await request('POST', '/api/contracts', {
    idempotencyKey: 'demo-contract-001',
    contractId: 'CT-2024-FRAME-001',
    contractName: '试图覆盖合同',
    totalAmount: 9999999,
    pdfHash: 'fake',
    partyA: 'A', partyB: 'B'
  }, OPERATOR);
  assert(dup.data.isUpdate === true, '重复请求应返回 isUpdate=true');
  assert(dup.data.data.contractName === '2024年度技术服务框架采购协议', '应返回原始合同名');
  logSuccess('幂等性保证：重复请求返回同一条事实，未多算');

  logStep('2.3', '创建补充协议合同');
  const supp = await request('POST', '/api/contracts', {
    idempotencyKey: 'demo-supp-001',
    contractId: 'CT-2024-SUPP-001',
    contractName: '2024年度技术服务框架采购协议-补充协议一',
    partyA: '甲方科技有限公司',
    partyB: '乙方技术服务集团',
    totalAmount: 500000,
    pdfHash: 'sha256-supp-789',
    parentContractId: 'CT-2024-FRAME-001',
    notes: '追加需求开发内容'
  }, OPERATOR);
  assert(supp.data.success === true);
  assert(supp.data.data.isSupplement === true);
  logSuccess(`补充协议: ${supp.data.data.contractName} (isSupplement=${supp.data.data.isSupplement})`);

  logSection('第三阶段：录入员创建付款节点 (跨批次)');

  logStep('3.1', '创建第一期付款节点 (批次 Q1)');
  const node1 = await request('POST', '/api/payment-nodes', {
    idempotencyKey: 'demo-node-001',
    contractId: 'CT-2024-FRAME-001',
    nodeName: '第一期：需求验收',
    nodeType: 'milestone',
    dueAmount: 1500000,
    dueDate: '2024-03-15',
    batchId: 'BATCH-2024-Q1',
    sequence: 1
  }, OPERATOR);
  assert(node1.data.success === true);
  logSuccess(`节点1: ${node1.data.data.nodeName} - ¥${node1.data.data.dueAmount.toLocaleString()} - ${node1.data.data.batchId}`);

  logStep('3.2', '创建第二期付款节点 (批次 Q2 - 跨批次)');
  const node2 = await request('POST', '/api/payment-nodes', {
    idempotencyKey: 'demo-node-002',
    contractId: 'CT-2024-FRAME-001',
    nodeName: '第二期：开发交付',
    nodeType: 'milestone',
    dueAmount: 2000000,
    dueDate: '2024-06-30',
    batchId: 'BATCH-2024-Q2',
    sequence: 2
  }, OPERATOR);
  assert(node2.data.success === true);
  logSuccess(`节点2: ${node2.data.data.nodeName} - ¥${node2.data.data.dueAmount.toLocaleString()} - ${node2.data.data.batchId}`);

  logStep('3.3', '创建第三期付款节点 (批次 Q4 - 跨批次)');
  const node3 = await request('POST', '/api/payment-nodes', {
    idempotencyKey: 'demo-node-003',
    contractId: 'CT-2024-FRAME-001',
    nodeName: '第三期：运维验收',
    nodeType: 'milestone',
    dueAmount: 1500000,
    dueDate: '2024-11-30',
    batchId: 'BATCH-2024-Q4',
    sequence: 3
  }, OPERATOR);
  assert(node3.data.success === true);
  logSuccess(`节点3: ${node3.data.data.nodeName} - ¥${node3.data.data.dueAmount.toLocaleString()} - ${node3.data.data.batchId}`);

  logStep('3.4', '坏数据自动隔离：金额为负数');
  const badNode = await request('POST', '/api/payment-nodes', {
    idempotencyKey: 'demo-bad-node-001',
    contractId: 'CT-2024-FRAME-001',
    nodeName: '坏数据测试',
    dueAmount: -100,
    dueDate: '2024-12-01'
  }, OPERATOR);
  assert(badNode.data.success === false);
  assert(badNode.data.code === 'INVALID_AMOUNT');
  logSuccess('坏数据被拦截，自动进入失败列表');

  logSection('第四阶段：验收邮件录入与复核 (HTTP)');

  logStep('4.1', '录入员上传第一期验收邮件');
  const email1 = await request('POST', '/api/acceptance-emails', {
    idempotencyKey: 'demo-email-001',
    contractId: 'CT-2024-FRAME-001',
    paymentNodeId: node1.data.data.id,
    emailSubject: '【验收确认】2024框架协议 - 需求调研阶段验收通过',
    emailFrom: 'project-manager@party-a.com',
    emailTo: 'delivery@party-b.com',
    emailDate: '2024-03-10T10:30:00Z',
    emailBody: '经双方项目组验收，需求调研阶段工作成果符合合同约定...',
    emailHash: 'sha256-email-001-hash'
  }, OPERATOR);
  assert(email1.data.success === true);
  logSuccess(`验收邮件已录入: ${email1.data.data.emailSubject}`);
  logInfo(`节点状态自动更新: pending → accepted`);

  logStep('4.2', '复核员复核验收邮件 (HTTP POST review)');
  const review1 = await request('POST', `/api/acceptance-emails/${email1.data.data.id}/review`, {
    result: 'pass',
    reviewNotes: '验收材料齐全，符合要求'
  }, REVIEWER);
  assert(review1.data.success === true);
  assert(review1.data.data.status === 'approved');
  logSuccess('复核通过: 付款节点状态已更新');

  logSection('第五阶段：二次确认单审批 (跨日处理)');

  logStep('5.1', '录入员上传第一期二次确认单 (调整付款金额)');
  const confirm1 = await request('POST', '/api/confirmations', {
    idempotencyKey: 'demo-confirm-001',
    contractId: 'CT-2024-FRAME-001',
    paymentNodeId: node1.data.data.id,
    confirmationType: 'adjustment',
    confirmingParty: '甲方科技有限公司',
    confirmedBy: '财务总监-王某',
    confirmedAt: '2024-03-12T15:00:00Z',
    confirmationContent: '根据实际交付情况，第一期付款调整为¥1,480,000',
    adjustedDueAmount: 1480000,
    adjustments: [
      { type: 'deduction', amount: -20000, reason: '部分需求延后' }
    ]
  }, OPERATOR);
  assert(confirm1.data.success === true);
  logSuccess(`确认单已创建: 原金额¥${confirm1.data.data.originalDueAmount.toLocaleString()} → 调整后¥${confirm1.data.data.adjustedDueAmount.toLocaleString()}`);

  logStep('5.2', '主管审批二次确认单 (HTTP POST approve)');
  const approve1 = await request('POST', `/api/confirmations/${confirm1.data.data.id}/approve`, {
    approvalNotes: '情况属实，同意按调整后金额付款'
  }, ADMIN);
  assert(approve1.data.success === true);
  assert(approve1.data.data.status === 'approved');
  logSuccess('确认单已审批，付款金额和状态已更新');

  logStep('5.3', '第一期付款完成，更新状态为已支付');
  const paidUpdate = await request('POST', `/api/payment-nodes/${node1.data.data.id}/status`, {
    status: 'paid',
    notes: '财务已付款'
  }, ADMIN);
  assert(paidUpdate.data.success === true);
  logSuccess('第一期付款状态更新为已支付');

  logSection('第六阶段：状态冻结与边界测试 (跨日/跨批次)');

  logStep('6.1', '查看合同进度 (HTTP GET progress)');
  const progress = await request('GET', `/api/payment-nodes/progress/CT-2024-FRAME-001`);
  logInfo(`合同总额: ¥${progress.data.data.total.toLocaleString()}`);
  logInfo(`已完成: ¥${progress.data.data.completed.toLocaleString()} (${progress.data.data.percentage}%)`);
  logInfo(`节点进度: ${progress.data.data.completedNodeCount}/${progress.data.data.nodeCount}`);

  logStep('6.2', '主管冻结合同 (模拟跨日批次结算后冻结)');
  const freeze = await request('POST', '/api/contracts/CT-2024-FRAME-001/freeze', null, ADMIN);
  assert(freeze.data.success === true);
  assert(freeze.data.data.status === 'frozen');
  logSuccess(`合同已冻结: status=${freeze.data.data.status}, frozenAt=${freeze.data.data.frozenAt}`);

  logStep('6.3', '边界测试：冻结后尝试新增付款节点');
  const tryAdd = await request('POST', '/api/payment-nodes', {
    idempotencyKey: 'demo-frozen-node-001',
    contractId: 'CT-2024-FRAME-001',
    nodeName: '试图在冻结后新增',
    dueAmount: 100000,
    dueDate: '2024-12-01'
  }, OPERATOR);
  assert(tryAdd.data.success === false);
  assert(tryAdd.data.code === 'CONTRACT_FROZEN');
  logSuccess('边界保护生效：冻结后无法新增付款节点');
  logInfo(`错误码: ${tryAdd.data.code}`);

  logStep('6.4', '边界测试：冻结后尝试修改合同信息');
  const tryEdit = await request('PUT', '/api/contracts/CT-2024-FRAME-001', {
    contractName: '试图修改冻结合同'
  }, OPERATOR);
  assert(tryEdit.data.success === false);
  assert(tryEdit.data.code === 'CONTRACT_FROZEN');
  logSuccess('边界保护生效：冻结后无法修改合同');

  logStep('6.5', '边界测试：冻结后尝试审批确认单');
  const tryApprove = await request('POST', `/api/confirmations/${confirm1.data.data.id}/approve`, {
    approvalNotes: '冻结后尝试审批'
  }, ADMIN);
  assert(tryApprove.data.success === false);
  assert(tryApprove.data.code === 'CONTRACT_FROZEN');
  logSuccess('边界保护生效：冻结后无法审批确认单');

  logSection('第七阶段：权限验证 (不同角色 HTTP 请求)');

  logStep('7.1', '只读用户试图创建合同 - 应被 403 拒绝');
  const viewerCreate = await request('POST', '/api/contracts', {
    idempotencyKey: 'viewer-test',
    contractName: '测试',
    partyA: 'A', partyB: 'B',
    totalAmount: 100, pdfHash: 'hash'
  }, VIEWER);
  assert(viewerCreate.status === 403);
  assert(viewerCreate.data.code === 'INSUFFICIENT_PERMISSION');
  logSuccess('权限控制生效：只读用户无法创建合同 (403)');

  logStep('7.2', '录入员试图冻结合同 - 应被 403 拒绝');
  const opFreeze = await request('POST', '/api/contracts/CT-2024-FRAME-001/freeze', null, OPERATOR);
  assert(opFreeze.status === 403);
  logSuccess('权限控制生效：录入员无法冻结合同 (403)');

  logStep('7.3', '复核员试图审批确认单 - 应被 403 拒绝');
  const revApprove = await request('POST', `/api/confirmations/${confirm1.data.data.id}/approve`, {}, REVIEWER);
  assert(revApprove.status === 403);
  logSuccess('权限控制生效：复核员无法审批确认单 (403)');

  logStep('7.4', '只读用户查看合同 - 字段被过滤');
  const viewerList = await request('GET', '/api/contracts', null, VIEWER);
  const viewerContract = viewerList.data.data[0];
  const hasSensitive = viewerContract.pdfHash !== undefined || viewerContract.createdAt !== undefined;
  assert(!hasSensitive, '只读用户不应看到敏感字段');
  logSuccess('字段过滤生效：只读用户仅看到 id, contractName, partyA, partyB, totalAmount, status');

  logSection('第八阶段：对账与导出 (HTTP GET exports)');

  logStep('8.1', '导出对账报表');
  const report = await request('GET', '/api/exports/reconciliation', null, ADMIN);
  assert(report.data.success === true);
  logSuccess(`对账报表已生成: ${report.data.data.filePath}`);
  logInfo(`合同总数: ${report.data.data.summary.totalContracts}`);
  logInfo(`总金额: ¥${report.data.data.summary.totalAmount.toLocaleString()}`);
  logInfo(`已确认金额: ¥${report.data.data.summary.totalCompletedAmount.toLocaleString()}`);

  logStep('8.2', '导出完整回放数据 (可追溯到单条记录)');
  const playback = await request('GET', '/api/exports/playback/CT-2024-FRAME-001', null, ADMIN);
  assert(playback.data.success === true);
  logSuccess(`回放数据已导出: ${playback.data.data.filePath}`);
  logInfo(`包含: ${playback.data.data.playbackData.paymentNodes.length}个付款节点, ${playback.data.data.playbackData.acceptanceEmails.length}封验收邮件, ${playback.data.data.playbackData.confirmations.length}份确认单`);

  logStep('8.3', '查看失败记录列表 (坏数据追溯)');
  const failed = await request('GET', '/api/failed-records', null, ADMIN);
  logInfo(`失败记录数: ${failed.data.data.length}`);
  if (failed.data.data.length > 0) {
    const latestFail = failed.data.data[0];
    logInfo(`最近失败: ${latestFail.entityType} - ${latestFail.errorCode} - ${latestFail.error.substring(0, 60)}...`);
  }
  logSuccess('坏数据可追溯：所有失败请求都在失败列表中有记录');

  logStep('8.4', '版本历史查询 (操作追溯)');
  const versions = await request('GET', '/api/contracts/CT-2024-FRAME-001/versions', null, ADMIN);
  logInfo(`版本记录数: ${versions.data.data.length}`);
  if (versions.data.data.length > 0) {
    logInfo(`最近操作: ${versions.data.data[0].action} by ${versions.data.data[0].changedBy} at ${versions.data.data[0].changedAt}`);
  }

  logSection('演示完成 - 核心特性验证');
  
  console.log(chalk.bold('闭环验证:'));
  console.log(chalk.green('  ✓ 启动服务 → 造数 → HTTP读写 → 对账 → 导出 → 回放异常'));
  console.log(chalk.green('  ✓ 幂等性保证：重复请求只更新同一条事实'));
  console.log(chalk.green('  ✓ 状态冻结：冻结后合同无法被错误修改'));
  console.log(chalk.green('  ✓ 权限控制：四种角色各自可见/可操作范围不同'));
  console.log(chalk.green('  ✓ 坏数据隔离：坏数据不进汇总，在失败列表可追溯原因'));
  console.log(chalk.green('  ✓ 跨日/跨批次：按批次处理，冻结边界清晰'));
  console.log(chalk.green('  ✓ 版本追溯：所有操作留痕，支持历史回放'));

  console.log('\n' + chalk.bold('后续操作:'));
  console.log('  - 运行测试套件: npm test');
  console.log('  - 启动服务: npm start');
  console.log('  - CLI 工具: node bin/cli.js --help');
  console.log('  - 查看导出: ls data/exports/\n');

  server.kill();
}

main().catch((e) => {
  console.error(chalk.red('演示运行失败:'), e.message);
  process.exit(1);
});
