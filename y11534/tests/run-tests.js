const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

let adminToken = '';
let entryToken = '';
let reviewerToken = '';
let viewerToken = '';

let testResults = [];

const runId = Date.now().toString(36).toUpperCase();

const getUniqueId = (prefix) => `${prefix}_${runId}`;

const logTest = (name, passed, message = '') => {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} ${name}`);
  if (message && !passed) {
    console.log(`  ${message}`);
  }
  testResults.push({ name, passed, message });
};

const request = (method, path, token = null, data = null) => {
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
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const login = async (username, password) => {
  const res = await request('POST', '/api/auth/login', null, { username, password });
  return res.body.token;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runTests = async () => {
  console.log('\n========================================');
  console.log('  银行网点排班权限追责台账 - 自动测试');
  console.log('========================================\n');
  
  console.log('等待服务启动...');
  await sleep(2000);
  
  try {
    const health = await request('GET', '/api/health');
    if (health.statusCode !== 200) {
      console.log('错误: 服务未启动，请先运行 npm start');
      process.exit(1);
    }
    console.log('服务连接正常\n');
  } catch (e) {
    console.log('错误: 无法连接到服务，请确保服务已启动');
    console.log(e.message);
    process.exit(1);
  }

  console.log('--- 1. 认证模块测试 ---\n');
  
  try {
    adminToken = await login('admin', 'admin123');
    logTest('主管登录', !!adminToken);
    
    entryToken = await login('entry1', 'entry123');
    logTest('录入员登录', !!entryToken);
    
    reviewerToken = await login('reviewer1', 'review123');
    logTest('复核员登录', !!reviewerToken);
    
    viewerToken = await login('viewer1', 'view123');
    logTest('支行行长登录', !!viewerToken);
    
    const badLogin = await request('POST', '/api/auth/login', null, { username: 'wrong', password: 'wrong' });
    logTest('错误密码登录失败', badLogin.statusCode === 401);
    
    const noToken = await request('GET', '/api/schedules');
    logTest('未授权访问被拒绝', noToken.statusCode === 401);
    
  } catch (e) {
    logTest('认证模块', false, e.message);
  }

  console.log('\n--- 2. 脏记录检测测试 ---\n');
  
  let leaveId1 = null;
  
  try {
    const res1 = await request('POST', '/api/leaves/batch', entryToken, {
      records: [{
        form_no: getUniqueId('TEST_LF001'),
        teller_id: getUniqueId('T_TEST01'),
        teller_name: '测试柜员',
        branch: '朝阳支行',
        leave_type: '年假',
        start_date: '2026-06-01',
        end_date: '2026-06-05',
        days_count: 5,
        reason: '跨日请假测试'
      }],
      duplicateStrategy: 'ignore'
    });
    
    logTest('批量导入跨日请假单', res1.statusCode === 200 && res1.body.stats.dirtyCount === 1);
    
    if (res1.body.results && res1.body.results[0] && res1.body.results[0].id) {
      leaveId1 = res1.body.results[0].id;
    }
    
    let dirtyCheckPassed = false;
    if (leaveId1) {
      const dirtyRes = await request('GET', `/api/leaves/${leaveId1}`, entryToken);
      const isDirty = dirtyRes.body.is_dirty === 1;
      const dirtyType = dirtyRes.body.dirty_type === 'cross_date';
      dirtyCheckPassed = isDirty && dirtyType;
    }
    logTest('跨日请假单标记为脏记录', dirtyCheckPassed);
    
    const res2 = await request('POST', '/api/leaves/batch', entryToken, {
      records: [{
        form_no: getUniqueId('TEST_LF002'),
        teller_id: getUniqueId('T_TEST02'),
        teller_name: '测试柜员2',
        branch: '朝阳支行',
        leave_type: '事假',
        start_date: '2026-06-10',
        end_date: '2026-06-10',
        days_count: 1,
        reason: '单日请假'
      }],
      duplicateStrategy: 'ignore'
    });
    
    logTest('单日请假单不标记为脏记录', res2.statusCode === 200 && res2.body.stats.dirtyCount === 0);
    
  } catch (e) {
    logTest('脏记录检测', false, e.message);
  }

  console.log('\n--- 3. 重复数据处理测试（柜员改名冲突） ---\n');
  
  try {
    const res1 = await request('POST', '/api/schedules/batch', entryToken, {
      records: [{
        teller_id: getUniqueId('T_DUP01'),
        teller_name: '原始姓名',
        branch: '朝阳支行',
        schedule_date: '2026-06-15',
        shift_type: '早班',
        window_no: 'W1'
      }],
      duplicateStrategy: 'ignore'
    });
    
    logTest('首次导入排班数据', res1.statusCode === 200 && res1.body.stats.duplicateCount === 0);
    
    const scheduleId = res1.body.results[0].id;
    
    const res2 = await request('POST', '/api/schedules/batch', entryToken, {
      records: [{
        teller_id: getUniqueId('T_DUP01'),
        teller_name: '修改后姓名',
        branch: '朝阳支行',
        schedule_date: '2026-06-15',
        shift_type: '早班',
        window_no: 'W1'
      }],
      duplicateStrategy: 'overwrite'
    });
    
    logTest('重复导入(柜员改名)触发脏记录检测', res2.statusCode === 200 && res2.body.stats.dirtyCount === 1);
    
    const dirtyRecord = res2.body.results[0];
    const hasNameConflict = dirtyRecord.dirtyType === 'name_changed';
    logTest('柜员姓名冲突正确识别', hasNameConflict);
    
    const historyRes = await request('GET', `/api/schedules/${scheduleId}/history`, entryToken);
    const hasOverwriteRecord = historyRes.body.some(h => h.action === 'duplicate_overwrite');
    const hasDirtyInfo = historyRes.body.some(h => 
      h.action === 'duplicate_overwrite' && 
      h.change_details && 
      h.change_details.includes('dirtyIssues')
    );
    logTest('重复覆盖写入工作流历史', hasOverwriteRecord && hasDirtyInfo);
    
  } catch (e) {
    logTest('重复数据处理(柜员改名)', false, e.message);
  }

  console.log('\n--- 4. 重复数据处理测试（供应商金额冲突） ---\n');
  
  try {
    const res1 = await request('POST', '/api/bills/batch', entryToken, {
      records: [{
        bill_no: getUniqueId('TEST_BILL001'),
        supplier_name: '测试供应商',
        branch: '朝阳支行',
        bill_date: '2026-06-01',
        amount: 1000.00,
        quantity: 10,
        items: '办公用品'
      }],
      duplicateStrategy: 'ignore'
    });
    
    logTest('首次导入对账单', res1.statusCode === 200 && res1.body.stats.duplicateCount === 0);
    
    const billId = res1.body.results[0].id;
    
    const res2 = await request('POST', '/api/bills/batch', entryToken, {
      records: [{
        bill_no: getUniqueId('TEST_BILL001'),
        supplier_name: '测试供应商',
        branch: '朝阳支行',
        bill_date: '2026-06-01',
        amount: 1500.00,
        quantity: 15,
        items: '办公用品'
      }],
      duplicateStrategy: 'overwrite'
    });
    
    logTest('重复导入(金额/数量变更)触发脏记录检测', res2.statusCode === 200 && res2.body.stats.dirtyCount >= 1);
    
    const dirtyRecord = res2.body.results[0];
    const hasConflict = dirtyRecord.dirtyIssues && dirtyRecord.dirtyIssues.some(
      i => i.type === 'amount_conflict' || i.type === 'quantity_conflict'
    );
    logTest('金额/数量冲突正确识别', hasConflict);
    
    const historyRes = await request('GET', `/api/bills/${billId}/history`, entryToken);
    const hasConflictHistory = historyRes.body.some(h => 
      h.action === 'duplicate_overwrite' && 
      h.reason && 
      h.reason.includes('重复数据覆盖处理')
    );
    logTest('金额冲突记录到工作流历史', hasConflictHistory);
    
  } catch (e) {
    logTest('重复数据处理(供应商金额)', false, e.message);
  }

  console.log('\n--- 5. 重复忽略策略测试 ---\n');
  
  try {
    const res1 = await request('POST', '/api/schedules/batch', entryToken, {
      records: [{
        teller_id: getUniqueId('T_IGNORE01'),
        teller_name: '忽略测试',
        branch: '朝阳支行',
        schedule_date: '2026-06-20',
        shift_type: '早班',
        window_no: 'W2'
      }],
      duplicateStrategy: 'ignore'
    });
    
    const scheduleId = res1.body.results[0].id;
    
    const res2 = await request('POST', '/api/schedules/batch', entryToken, {
      records: [{
        teller_id: getUniqueId('T_IGNORE01'),
        teller_name: '忽略测试更新',
        branch: '朝阳支行',
        schedule_date: '2026-06-20',
        shift_type: '早班',
        window_no: 'W2'
      }],
      duplicateStrategy: 'ignore'
    });
    
    logTest('重复数据忽略策略', res2.statusCode === 200 && res2.body.stats.duplicateCount === 1);
    
    const historyRes = await request('GET', `/api/schedules/${scheduleId}/history`, entryToken);
    const hasIgnoreRecord = historyRes.body.some(h => h.action === 'duplicate_ignore');
    logTest('重复忽略写入工作流历史', hasIgnoreRecord);
    
    const verifyRes = await request('GET', `/api/schedules/${scheduleId}`, entryToken);
    logTest('忽略策略不修改原始数据', verifyRes.body.teller_name === '忽略测试');
    
  } catch (e) {
    logTest('重复忽略策略', false, e.message);
  }

  console.log('\n--- 6. 字段权限过滤测试 ---\n');
  
  try {
    const entryList = await request('GET', '/api/schedules?page=1&pageSize=5', entryToken);
    const entryFields = entryList.body.data && entryList.body.data[0] ? 
      Object.keys(entryList.body.data[0]) : [];
    
    const adminList = await request('GET', '/api/schedules?page=1&pageSize=5', adminToken);
    const adminFields = adminList.body.data && adminList.body.data[0] ? 
      Object.keys(adminList.body.data[0]) : [];
    
    logTest('录入员能看到字段', entryFields.length > 0);
    logTest('主管能看到更多或相同字段', adminFields.length >= entryFields.length);
    
    const sensitiveFields = ['original_data', 'processing_opinion', 'dirty_details', 'created_by', 'updated_by'];
    const entryHasSensitive = sensitiveFields.some(f => entryFields.includes(f));
    logTest('录入员无法查看敏感字段(排班)', !entryHasSensitive);
    
    const billImportRes = await request('POST', '/api/bills/batch', entryToken, {
      records: [{
        bill_no: getUniqueId('TEST_PERM_BILL'),
        supplier_name: '权限测试供应商',
        branch: '朝阳支行',
        bill_date: '2026-06-01',
        amount: 1000.00,
        quantity: 10,
        items: '测试商品'
      }],
      duplicateStrategy: 'ignore'
    });
    
    if (billImportRes.body.results && billImportRes.body.results[0] && billImportRes.body.results[0].id) {
      const billId = billImportRes.body.results[0].id;
      const billDetail = await request('GET', `/api/bills/${billId}`, entryToken);
      const billFields = Object.keys(billDetail.body);
      
      const entryCannotSeeAmount = !billFields.includes('amount');
      logTest('录入员无法查看供应商金额', entryCannotSeeAmount);
      
      const entryCannotSeeSensitive = !billFields.includes('dirty_details') && 
                                       !billFields.includes('created_by') && 
                                       !billFields.includes('original_data');
      logTest('录入员无法查看供应商敏感字段', entryCannotSeeSensitive);
      
      const adminBillDetail = await request('GET', `/api/bills/${billId}`, adminToken);
      const adminBillFields = Object.keys(adminBillDetail.body);
      const adminCanSeeAmount = adminBillFields.includes('amount');
      logTest('主管可以查看供应商金额', adminCanSeeAmount);
    }
    
    const forecastImportRes = await request('POST', '/api/forecasts/batch', entryToken, {
      records: [{
        forecast_no: getUniqueId('TEST_PERM_FC'),
        branch: '朝阳支行',
        forecast_date: '2026-07-01',
        customer_count: 100,
        transaction_count: 200
      }],
      duplicateStrategy: 'ignore'
    });
    
    if (forecastImportRes.body.results && forecastImportRes.body.results[0] && forecastImportRes.body.results[0].id) {
      const fcId = forecastImportRes.body.results[0].id;
      const fcDetail = await request('GET', `/api/forecasts/${fcId}`, entryToken);
      const fcFields = Object.keys(fcDetail.body);
      
      const entryCannotSeeFcSensitive = !fcFields.includes('dirty_details') && 
                                         !fcFields.includes('created_by') && 
                                         !fcFields.includes('original_data');
      logTest('录入员无法查看业务量预测敏感字段', entryCannotSeeFcSensitive);
    }
    
    const supervisorEntry = await request('POST', '/api/schedules', adminToken, {
      teller_id: getUniqueId('T_PERM01'),
      teller_name: '权限测试',
      branch: '朝阳支行',
      schedule_date: '2026-06-25',
      shift_type: '早班',
      window_no: 'W3',
      status: 'draft'
    });
    logTest('主管可以创建记录', supervisorEntry.statusCode === 200);
    
    const entryEdit = await request('PUT', `/api/schedules/${supervisorEntry.body.id}`, entryToken, {
      shift_type: '晚班'
    });
    logTest('录入员可以修改草稿', entryEdit.statusCode === 200);
    
    const submitRes = await request('POST', `/api/schedules/${supervisorEntry.body.id}/action`, entryToken, {
      action: 'submit',
      reason: '提交审批'
    });
    logTest('录入员可以提交审批', submitRes.statusCode === 200);
    
    const entryEditSubmitted = await request('PUT', `/api/schedules/${supervisorEntry.body.id}`, entryToken, {
      shift_type: '中班'
    });
    logTest('录入员不能修改已提交记录', entryEditSubmitted.statusCode === 403);
    
  } catch (e) {
    logTest('字段权限过滤', false, e.message);
  }

  console.log('\n--- 7. 行长视图测试 ---\n');
  
  try {
    const overview = await request('GET', '/api/manager/overview', viewerToken);
    logTest('行长可以访问总览视图', overview.statusCode === 200);
    
    const hasSchedules = 'schedules' in overview.body;
    const hasLeaves = 'leaves' in overview.body;
    const hasBills = 'bills' in overview.body;
    const hasDirtyRecords = 'dirtyRecords' in overview.body;
    logTest('总览视图包含完整数据', hasSchedules && hasLeaves && hasBills && hasDirtyRecords);
    
    const changes = await request('GET', '/api/manager/changes/recent?limit=20', viewerToken);
    logTest('行长可以查看最近变更', changes.statusCode === 200 && Array.isArray(changes.body));
    
    const conflicts = await request('GET', '/api/manager/conflicts/list', viewerToken);
    logTest('行长可以查看冲突记录', conflicts.statusCode === 200 && Array.isArray(conflicts.body));
    
    const entryOverview = await request('GET', '/api/manager/overview', entryToken);
    logTest('录入员无法访问行长视图', entryOverview.statusCode === 403);
    
  } catch (e) {
    logTest('行长视图', false, e.message);
  }

  console.log('\n--- 8. 工作流和审计测试 ---\n');
  
  try {
    const res1 = await request('POST', '/api/leaves/batch', entryToken, {
      records: [{
        form_no: getUniqueId('TEST_WF001'),
        teller_id: getUniqueId('T_WF01'),
        teller_name: '工作流测试',
        branch: '朝阳支行',
        leave_type: '病假',
        start_date: '2026-07-01',
        end_date: '2026-07-01',
        days_count: 1,
        reason: '工作流测试'
      }],
      duplicateStrategy: 'ignore'
    });
    
    const leaveId = res1.body.results[0].id;
    
    const submitRes = await request('POST', `/api/leaves/${leaveId}/action`, entryToken, {
      action: 'submit',
      reason: '提交审批'
    });
    logTest('提交审批操作', submitRes.statusCode === 200);
    
    const approveRes = await request('POST', `/api/leaves/${leaveId}/action`, reviewerToken, {
      action: 'approve',
      reason: '审批通过'
    });
    logTest('复核员审批操作', approveRes.statusCode === 200);
    
    const historyRes = await request('GET', `/api/leaves/${leaveId}/history`, adminToken);
    const actions = historyRes.body.map(h => h.action);
    logTest('工作流历史完整', actions.includes('batch_import') && 
                                  actions.includes('submit') && 
                                  actions.includes('approve'));
    
    const auditLogs = await request('GET', '/api/audit/logs?page=1&pageSize=10', adminToken);
    logTest('审计日志可查询', auditLogs.statusCode === 200 && Array.isArray(auditLogs.body));
    
  } catch (e) {
    logTest('工作流和审计', false, e.message);
  }

  console.log('\n--- 9. 数据一致性验证（重复处理不增加总数） ---\n');
  
  try {
    const overview1 = await request('GET', '/api/manager/overview', adminToken);
    const initialCount = overview1.body.schedules.total;
    
    await request('POST', '/api/schedules/batch', entryToken, {
      records: [{
        teller_id: getUniqueId('T_CONSIST01'),
        teller_name: '一致性测试',
        branch: '朝阳支行',
        schedule_date: '2026-08-01',
        shift_type: '早班',
        window_no: 'W5'
      }],
      duplicateStrategy: 'ignore'
    });
    
    for (let i = 0; i < 3; i++) {
      await request('POST', '/api/schedules/batch', entryToken, {
        records: [{
          teller_id: getUniqueId('T_CONSIST01'),
          teller_name: '一致性测试重复',
          branch: '朝阳支行',
          schedule_date: '2026-08-01',
          shift_type: '早班',
          window_no: 'W5'
        }],
        duplicateStrategy: 'ignore'
      });
    }
    
    const overview2 = await request('GET', '/api/manager/overview', adminToken);
    const finalCount = overview2.body.schedules.total;
    
    logTest('重复忽略不增加总数', finalCount === initialCount + 1);
    
  } catch (e) {
    logTest('数据一致性验证', false, e.message);
  }

  console.log('\n========================================');
  console.log('                测试总结');
  console.log('========================================\n');
  
  const passed = testResults.filter(t => t.passed).length;
  const total = testResults.length;
  
  console.log(`通过: ${passed}/${total}`);
  console.log(`失败: ${total - passed}/${total}\n`);
  
  if (total - passed > 0) {
    console.log('失败的测试:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`  ✗ ${t.name}`);
      if (t.message) console.log(`    ${t.message}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('所有测试通过! ✓\n');
    process.exit(0);
  }
};

runTests().catch(e => {
  console.error('测试执行出错:', e);
  process.exit(1);
});
