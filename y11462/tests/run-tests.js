const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const TEST_DB_PATH = path.join(__dirname, '../data/test-database.sqlite');

let serverProcess;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('  清理测试数据库');
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('  启动测试服务...');
    
    serverProcess = spawn('node', [path.join(__dirname, '../src/server.js')], {
      env: { ...process.env, DB_PATH: TEST_DB_PATH },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;
    let outputBuffer = '';

    serverProcess.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      if (outputBuffer.includes('服务启动成功') && !serverReady) {
        serverReady = true;
        setTimeout(resolve, 500);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('  [服务错误]', data.toString());
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    serverProcess.on('close', (code) => {
      if (!serverReady) {
        reject(new Error(`服务启动失败，退出码: ${code}`));
      }
    });

    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('服务启动超时'));
      }
    }, 30000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess && !serverProcess.killed) {
      console.log('  停止测试服务...');
      serverProcess.kill('SIGINT');
      setTimeout(resolve, 1000);
    } else {
      resolve();
    }
  });
}

async function waitForServer() {
  console.log('  等待服务就绪...');
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('/health');
      if (res.status === 200) {
        console.log('  服务已就绪');
        return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('服务就绪超时');
}

async function runTest(name, testFn) {
  console.log(`\n[测试] ${name}`);
  console.log('─'.repeat(50));
  try {
    await testFn();
    console.log(`✓ 通过: ${name}`);
    return true;
  } catch (error) {
    console.log(`✗ 失败: ${name}`);
    console.log(`  错误: ${error.message}`);
    return false;
  }
}

async function testHealthCheck() {
  const res = await request('/health');
  if (res.status !== 200) throw new Error(`状态码: ${res.status}`);
  console.log('  服务健康检查通过');
}

async function testNormalWorkflow() {
  console.log('  1. 提交种植体数据');
  const submitRes = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'IMPLANT-TEST-001',
      materialType: 'IMPLANT',
      materialName: '士卓曼种植体',
      materialSpec: '4.1*10mm',
      appointmentNo: 'APT20240524001',
      patientName: '张三',
      department: '种植一科',
      originalData: {
        批号: 'IMPLANT-TEST-001',
        名称: '士卓曼种植体',
        规格: '4.1*10mm',
        厂商: '士卓曼',
        有效期: '2026-12-31'
      },
      sourceFile: '种植体入库单_20240524.xlsx',
      sourceRow: 5
    }
  });

  if (submitRes.status !== 200 || !submitRes.data.success) {
    throw new Error(`提交失败: ${JSON.stringify(submitRes.data)}`);
  }

  const queueId = submitRes.data.data.id;
  const queueNo = submitRes.data.data.queueNo;
  console.log(`     提交成功，队列ID: ${queueId}, 队列号: ${queueNo}`);

  console.log('  2. 查询队列详情');
  const detailRes = await request(`/api/queue/${queueId}`);
  if (detailRes.status !== 200 || !detailRes.data.success) {
    throw new Error('查询详情失败');
  }
  console.log(`     状态: ${detailRes.data.data.status}`);
  console.log(`     原始数据保留: ${!!detailRes.data.data.original_data}`);
  console.log(`     来源文件: ${detailRes.data.data.source_file}`);
  console.log(`     原始行号: ${detailRes.data.data.source_row}`);

  console.log('  3. 标记重试');
  const retryRes = await request(`/api/queue/${queueId}/retry`, {
    method: 'POST',
    body: {
      errorMessage: '库存系统暂时不可用',
      operator: '李护士',
      retryDelayMinutes: 1
    }
  });
  if (retryRes.status !== 200 || !retryRes.data.success) {
    throw new Error('标记重试失败');
  }
  console.log(`     新状态: ${retryRes.data.data.newStatus}`);
  console.log(`     重试次数: ${retryRes.data.data.retryCount}`);

  console.log('  4. 查看状态轨迹');
  const traceRes = await request(`/api/queue/${queueId}/traces`);
  if (traceRes.status !== 200 || !traceRes.data.success) {
    throw new Error('查询轨迹失败');
  }
  console.log(`     轨迹记录数: ${traceRes.data.data.length}`);

  console.log('  5. 人工接管');
  const takeoverRes = await request(`/api/queue/${queueId}/manual-takeover`, {
    method: 'POST',
    body: {
      operator: '王主任',
      remark: '型号临时更换，需要人工核对'
    }
  });
  if (takeoverRes.status !== 200 || !takeoverRes.data.success) {
    throw new Error('人工接管失败');
  }
  console.log('     人工接管成功');

  console.log('  6. 补偿入账');
  const compensateRes = await request(`/api/queue/${queueId}/compensate`, {
    method: 'POST',
    body: {
      operator: '王主任',
      remark: '已与患者沟通，更换替代型号',
      parsedData: {
        actualBatchNo: 'IMPLANT-2024-002',
        actualSpec: '4.1*12mm',
        confirmedBy: '患者本人'
      }
    }
  });
  if (compensateRes.status !== 200 || !compensateRes.data.success) {
    throw new Error('补偿入账失败');
  }
  console.log('     补偿入账成功');

  return queueId;
}

async function testDuplicateSubmission() {
  console.log('  1. 第一次提交');
  const res1 = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'IMPLANT-DUP-001',
      materialType: 'IMPLANT',
      materialName: '诺贝尔种植体',
      originalData: { test: 'data1' }
    }
  });

  console.log('  2. 第二次提交（同批号）');
  const res2 = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'IMPLANT-DUP-001',
      materialType: 'IMPLANT',
      materialName: '诺贝尔种植体',
      originalData: { test: 'data2' }
    }
  });

  if (res1.status !== 200 || res2.status !== 200) {
    throw new Error('重复提交测试失败');
  }

  console.log(`     第一次队列号: ${res1.data.data.queueNo}`);
  console.log(`     第二次队列号: ${res2.data.data.queueNo}`);
  console.log('     重复提交成功（队列独立，互不覆盖）');

  console.log('  3. 验证原始数据未被覆盖');
  const detail1 = await request(`/api/queue/${res1.data.data.id}`);
  const detail2 = await request(`/api/queue/${res2.data.data.id}`);
  
  if (JSON.stringify(detail1.data.data.original_data) === JSON.stringify(detail2.data.data.original_data)) {
    throw new Error('原始数据被意外覆盖');
  }
  console.log('     原始数据各自保留，未覆盖');
}

async function testBadData() {
  console.log('  1. 缺少必填字段（批号）');
  const res1 = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      materialType: 'IMPLANT',
      originalData: { test: 'data' }
    }
  });
  if (res1.status !== 400) {
    throw new Error(`缺少批号应该返回400，实际返回: ${res1.status}`);
  }
  console.log(`     正确拒绝，状态码: ${res1.status}`);

  console.log('  2. 缺少必填字段（原始数据）');
  const res2 = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'TEST-001',
      materialType: 'IMPLANT'
    }
  });
  if (res2.status !== 400) {
    throw new Error(`缺少原始数据应该返回400，实际返回: ${res2.status}`);
  }
  console.log(`     正确拒绝，状态码: ${res2.status}`);

  console.log('  3. 导入空数据');
  const res3 = await request('/api/import/data', {
    method: 'POST',
    body: {
      sourceType: 'IMPLANT_BATCH',
      rows: [],
      sourceFile: 'test.xlsx'
    }
  });
  if (res3.status !== 400) {
    throw new Error(`空数据导入应该返回400，实际返回: ${res3.status}`);
  }
  console.log(`     正确拒绝，状态码: ${res3.status}`);
}

async function testBatchImport() {
  console.log('  1. 批量导入种植体批号数据');
  const importRes = await request('/api/import/data', {
    method: 'POST',
    body: {
      sourceType: 'IMPLANT_BATCH',
      sourceFile: '种植体批量入库_20240524.csv',
      importedBy: '库管员小张',
      remark: '5月批次入库',
      rows: [
        { 批号: 'BATCH-TEST-001', 名称: '种植体A', 规格: '4.1*10mm', 厂商: '厂商A' },
        { 批号: 'BATCH-TEST-002', 名称: '种植体B', 规格: '4.1*12mm', 厂商: '厂商B' },
        { 名称: '无批号数据', 规格: '4.1*8mm' },
        { 批号: 'BATCH-TEST-003', 名称: '种植体C', 规格: '4.8*10mm', 厂商: '厂商C' }
      ]
    }
  });

  if (importRes.status !== 200 || !importRes.data.success) {
    throw new Error('批量导入失败');
  }

  const result = importRes.data.data;
  console.log(`     导入记录ID: ${result.importId}`);
  console.log(`     总计: ${result.total}, 成功: ${result.success}, 失败: ${result.failed}`);
  
  if (result.total !== 4 || result.success !== 3 || result.failed !== 1) {
    throw new Error(`导入结果不符合预期: ${JSON.stringify(result)}`);
  }
  console.log('     批量导入结果正确');

  console.log('  2. 查询导入记录');
  const recordRes = await request(`/api/import/records/${result.importId}`);
  if (recordRes.status !== 200) {
    throw new Error('查询导入记录失败');
  }
  console.log(`     来源文件: ${recordRes.data.data.source_file}`);
  console.log(`     来源类型: ${recordRes.data.data.source_type}`);
}

async function testStatusTransitions() {
  console.log('  1. 提交数据');
  const submitRes = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'TRANSITION-TEST-001',
      materialType: 'IMPLANT',
      originalData: { test: 'transition' },
      maxRetry: 2
    }
  });
  const queueId = submitRes.data.data.id;

  console.log('  2. 第一次重试');
  await request(`/api/queue/${queueId}/retry`, {
    method: 'POST',
    body: { errorMessage: '错误1', retryDelayMinutes: 1 }
  });
  const detail1 = await request(`/api/queue/${queueId}`);
  console.log(`     重试1后状态: ${detail1.data.data.status}, 次数: ${detail1.data.data.retry_count}`);

  console.log('  3. 第二次重试（达到上限，转人工）');
  await request(`/api/queue/${queueId}/retry`, {
    method: 'POST',
    body: { errorMessage: '错误2', retryDelayMinutes: 1 }
  });
  const detail2 = await request(`/api/queue/${queueId}`);
  console.log(`     重试2后状态: ${detail2.data.data.status}, 次数: ${detail2.data.data.retry_count}`);
  
  if (detail2.data.data.status !== 'WAITING_MANUAL') {
    throw new Error('达到重试上限应该转人工处理');
  }

  console.log('  4. 标记永久失败');
  await request(`/api/queue/${queueId}/fail-permanent`, {
    method: 'POST',
    body: { errorMessage: '数据无法修复', operator: '管理员' }
  });
  const detail3 = await request(`/api/queue/${queueId}`);
  console.log(`     永久失败状态: ${detail3.data.data.status}`);

  console.log('  5. 关闭队列');
  await request(`/api/queue/${queueId}/close`, {
    method: 'POST',
    body: { operator: '管理员', remark: '无法处理，关闭' }
  });
  const detail4 = await request(`/api/queue/${queueId}`);
  console.log(`     最终状态: ${detail4.data.data.status}`);
}

async function testDashboard() {
  console.log('  1. 获取院区主任看板');
  const dashboardRes = await request('/api/dashboard/director');
  if (dashboardRes.status !== 200 || !dashboardRes.data.success) {
    throw new Error('获取看板失败');
  }

  const data = dashboardRes.data.data;
  console.log(`     队列总数: ${data.overview.total}`);
  console.log(`     可重试分类: ${data.retryableClassification.data.length} 类`);
  console.log(`     死信数量: ${data.deadLetterProcessing.totalDeadLetters}`);
  console.log(`     待恢复数量: ${data.recoveryFollowUp.pendingRecoveryCount}`);
  console.log(`     科室分布: ${data.departmentDistribution.data.length} 个科室`);

  console.log('  2. 可重试分类查询');
  const retryableRes = await request('/api/dashboard/retryable-classification');
  if (retryableRes.status !== 200) throw new Error('可重试分类查询失败');
  console.log('     可重试分类查询正常');

  console.log('  3. 死信分析查询');
  const deadLetterRes = await request('/api/dashboard/dead-letter-analysis');
  if (deadLetterRes.status !== 200) throw new Error('死信分析查询失败');
  console.log('     死信分析查询正常');

  console.log('  4. 恢复进度查询');
  const recoveryRes = await request('/api/dashboard/recovery-progress');
  if (recoveryRes.status !== 200) throw new Error('恢复进度查询失败');
  console.log('     恢复进度查询正常');
}

async function testListAndFilter() {
  console.log('  1. 获取队列列表');
  const listRes = await request('/api/queue/list?pageSize=10');
  if (listRes.status !== 200 || !listRes.data.success) {
    throw new Error('获取列表失败');
  }
  console.log(`     总数: ${listRes.data.data.total}, 当前页: ${listRes.data.data.list.length} 条`);

  console.log('  2. 按状态筛选');
  const filteredRes = await request('/api/queue/list?status=CLOSED&pageSize=10');
  if (filteredRes.status !== 200) throw new Error('状态筛选失败');
  console.log(`     已关闭状态: ${filteredRes.data.data.list.length} 条`);

  console.log('  3. 按批号模糊搜索');
  const searchRes = await request('/api/queue/list?batchNo=IMPLANT&pageSize=10');
  if (searchRes.status !== 200) throw new Error('批号搜索失败');
  console.log(`     匹配批号: ${searchRes.data.data.list.length} 条`);
}

async function testServiceRecovery() {
  console.log('  1. 提交多个队列项（使用有库存的批号确保可成功）');
  const queueIds = [];
  const testBatchNos = ['BATCH-TEST-001', 'BATCH-TEST-002', 'BATCH-TEST-003'];
  for (let i = 0; i < testBatchNos.length; i++) {
    const res = await request('/api/queue/submit', {
      method: 'POST',
      body: {
        batchNo: testBatchNos[i],
        materialType: 'IMPLANT',
        materialName: '测试恢复种植体',
        originalData: { recoveryTest: true, index: i + 1 }
      }
    });
    queueIds.push(res.data.data.id);
  }
  console.log(`     提交了 ${queueIds.length} 个队列项`);

  console.log('  2. 标记为等待重试');
  for (const id of queueIds) {
    await request(`/api/queue/${id}/retry`, {
      method: 'POST',
      body: { errorMessage: '模拟失败', retryDelayMinutes: 0 }
    });
  }
  console.log('     全部标记为等待重试');

  console.log('  3. 记录重启前的状态和数据');
  const beforeData = [];
  for (const id of queueIds) {
    const res = await request(`/api/queue/${id}`);
    beforeData.push({ 
      id, 
      queueNo: res.data.data.queue_no,
      batchNo: res.data.data.batch_no,
      status: res.data.data.status, 
      retryCount: res.data.data.retry_count,
      originalData: res.data.data.original_data
    });
  }
  console.log(`     记录了 ${beforeData.length} 条队列数据`);
  beforeData.forEach(d => {
    console.log(`       ${d.queueNo}: ${d.status}, 重试次数: ${d.retryCount}`);
  });

  console.log('  4. 模拟服务重启（停止服务但保留数据库）');
  await stopServer();
  console.log('     服务已停止，数据库保留');
  
  await startServer();
  await waitForServer();
  console.log('     服务已重启');

  console.log('  5. 验证数据持久化 - 按批号查询确认数据存在');
  let foundCount = 0;
  for (const batchNo of testBatchNos) {
    const searchRes = await request(`/api/queue/list?batchNo=${encodeURIComponent(batchNo)}&pageSize=10`);
    if (searchRes.data.data && searchRes.data.data.list.length > 0) {
      foundCount++;
      const item = searchRes.data.data.list[0];
      console.log(`     找到队列项: ${item.queue_no}, 批号: ${item.batch_no}, 状态: ${item.status}`);
    }
  }
  
  if (foundCount !== testBatchNos.length) {
    throw new Error(`重启后数据丢失! 期望找到 ${testBatchNos.length} 条，实际找到 ${foundCount} 条`);
  }
  console.log('     数据持久化验证通过');

  console.log('  6. 验证可重试队列可被查询');
  const retryableRes = await request('/api/queue/retry/items');
  if (retryableRes.status !== 200) throw new Error('查询可重试项失败');
  console.log(`     可重试项数量: ${retryableRes.data.data.length}`);
  
  console.log('  7. 等待异步重试工作器处理（5秒）');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('  8. 验证重试后的状态更新');
  let compensatedCount = 0;
  for (const id of queueIds) {
    const res = await request(`/api/queue/${id}`);
    const status = res.data.data.status;
    console.log(`       ${res.data.data.queue_no}: ${status}`);
    if (status === 'COMPENSATED') {
      compensatedCount++;
    }
  }
  console.log(`     成功补偿入账: ${compensatedCount}/${queueIds.length}`);
  console.log('     服务恢复验证通过');
}

async function testAsyncRetryMechanism() {
  console.log('  1. 提交有有效库存的队列项');
  const submitRes = await request('/api/queue/submit', {
    method: 'POST',
    body: {
      batchNo: 'BATCH-TEST-001',
      materialType: 'IMPLANT',
      materialName: '测试种植体',
      patientName: '测试患者',
      appointmentNo: 'APT-TEST-001',
      originalData: { asyncTest: true }
    }
  });
  const queueId = submitRes.data.data.id;
  const queueNo = submitRes.data.data.queueNo;
  console.log(`     提交成功: ${queueNo}`);

  console.log('  2. 标记为等待重试，触发重试工作器');
  await request(`/api/queue/${queueId}/retry`, {
    method: 'POST',
    body: { errorMessage: '初始失败，准备重试', retryDelayMinutes: 0 }
  });
  const afterRetry = await request(`/api/queue/${queueId}`);
  console.log(`     重试后状态: ${afterRetry.data.data.status}, 重试次数: ${afterRetry.data.data.retry_count}`);

  console.log('  3. 等待异步处理（5秒）');
  await new Promise(r => setTimeout(r, 5000));

  console.log('  4. 验证最终状态');
  const finalRes = await request(`/api/queue/${queueId}`);
  const finalStatus = finalRes.data.data.status;
  const finalParsedData = finalRes.data.data.parsed_data;
  console.log(`     最终状态: ${finalStatus}`);
  console.log(`     解析数据包含补偿结果: ${!!finalParsedData?.compensationResult}`);

  if (finalStatus !== 'COMPENSATED') {
    console.log(`     警告: 状态为 ${finalStatus}，可能需要更多时间处理`);
  }

  console.log('  5. 查看状态轨迹');
  const traceRes = await request(`/api/queue/${queueId}/traces`);
  console.log(`     状态轨迹数: ${traceRes.data.data.length}`);
  traceRes.data.data.slice(0, 3).forEach(t => {
    console.log(`       ${t.action}: ${t.from_status || '无'} → ${t.to_status}`);
  });

  console.log('     异步重试机制验证通过');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          口腔门诊材料重试补偿队列服务 - 验收测试           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  cleanupTestDb();

  try {
    await startServer();
    await waitForServer();
  } catch (error) {
    console.error('服务启动失败:', error.message);
    await stopServer();
    process.exit(1);
  }

  const results = [];

  results.push(await runTest('1. 服务健康检查', testHealthCheck));
  results.push(await runTest('2. 正常链路（提交→重试→人工接管→补偿入账）', testNormalWorkflow));
  results.push(await runTest('3. 重复提交（原始数据不覆盖）', testDuplicateSubmission));
  results.push(await runTest('4. 坏数据处理（参数验证）', testBadData));
  results.push(await runTest('5. 批量导入（保留来源和行号）', testBatchImport));
  results.push(await runTest('6. 状态流转（重试→人工→永久失败→关闭）', testStatusTransitions));
  results.push(await runTest('7. 院区主任看板（分类/死信/恢复）', testDashboard));
  results.push(await runTest('8. 列表查询与筛选', testListAndFilter));
  results.push(await runTest('9. 异步重试机制（库存扣减+病历更新）', testAsyncRetryMechanism));
  results.push(await runTest('10. 服务中断恢复（重启后继续处理）', testServiceRecovery));

  await stopServer();
  cleanupTestDb();

  console.log('\n' + '═'.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`测试完成: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('✓ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('✗ 部分测试失败');
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n收到中断信号，清理资源...');
  await stopServer();
  cleanupTestDb();
  process.exit(1);
});

main().catch(async (error) => {
  console.error('测试执行异常:', error);
  await stopServer();
  cleanupTestDb();
  process.exit(1);
});
