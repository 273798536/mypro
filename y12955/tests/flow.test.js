const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '../data/test.db');

let workOrderService;
let compareService;
let permissionAuditService;
let slowQueryService;
let reportService;
let { setDbPath, initDatabase, resetDb, getDb } = require('../src/models/database');

before(() => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal');
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm');
  }
  
  setDbPath(TEST_DB_PATH);
  initDatabase();
  
  workOrderService = require('../src/services/workOrderService');
  compareService = require('../src/services/compareService');
  permissionAuditService = require('../src/services/permissionAuditService');
  slowQueryService = require('../src/services/slowQueryService');
  reportService = require('../src/services/reportService');
});

after(() => {
  resetDb();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal');
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm');
  }
});

test('1. 工单创建和基本操作', () => {
  const order = workOrderService.createWorkOrder({
    title: '测试工单-财务系统表结构变更',
    description: '2024年Q1财务系统表结构调整',
    source: '业务工单#2024-001',
    operator: 'test_user'
  });
  
  assert.ok(order.id);
  assert.equal(order.title, '测试工单-财务系统表结构变更');
  assert.equal(order.status, 'draft');
  assert.ok(order.order_no.startsWith('WO-'));
  
  const fetched = workOrderService.getWorkOrderById(order.id);
  assert.equal(fetched.id, order.id);
  assert.equal(fetched.title, order.title);
  
  const list = workOrderService.listWorkOrders();
  assert.ok(list.list.length >= 1);
  assert.ok(list.total >= 1);
});

test('2. 状态流转验证', () => {
  const order = workOrderService.createWorkOrder({
    title: '状态流转测试工单'
  });
  
  assert.equal(order.status, 'draft');
  
  const updated = workOrderService.transitionStatus(order.id, 'reviewing', 'test_user', '提交复核');
  assert.equal(updated.status, 'reviewing');
  
  const transitions = workOrderService.listStatusTransitions(order.id);
  assert.ok(transitions.length >= 2);
  assert.equal(transitions[transitions.length - 1].to_status, 'reviewing');
  
  assert.throws(() => {
    workOrderService.transitionStatus(order.id, 'completed', 'test_user');
  }, /无法从状态/);
});

test('3. 数据字典导入 - 正常导入', () => {
  const order = workOrderService.createWorkOrder({
    title: '字典导入测试工单'
  });
  
  const records = [
    { table_name: 'users', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '用户ID' },
    { table_name: 'users', column_name: 'name', data_type: 'VARCHAR(100)', is_nullable: 'YES', comment: '用户名' },
    { table_name: 'orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '订单ID' },
    { table_name: 'orders', column_name: 'amount', data_type: 'DECIMAL(10,2)', is_nullable: 'NO', comment: '订单金额' }
  ];
  
  const result = workOrderService.importDictionary(order.id, 'v1.0.0', records, 'schema_v1.json');
  assert.equal(result.record_count, 4);
  assert.equal(result.version, 'v1.0.0');
  assert.ok(result.batch_id);
  
  const versions = workOrderService.listDictionaryVersions(order.id);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].version, 'v1.0.0');
  assert.equal(versions[0].record_count, 4);
});

test('4. 重复导入检测 - 核心测试场景', () => {
  const order = workOrderService.createWorkOrder({
    title: '重复导入测试工单'
  });
  
  const records = [
    { table_name: 'accounts', column_name: 'id', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 'accounts', column_name: 'balance', data_type: 'DECIMAL(15,2)', is_nullable: 'NO' }
  ];
  
  const result1 = workOrderService.importDictionary(order.id, 'v1.0.0', records);
  assert.ok(result1.success);
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1.0.0', records);
  }, /检测到重复导入/);
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v2.0.0', records);
  }, /检测到重复导入/);
  
  const records2 = [
    { table_name: 'accounts', column_name: 'id', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 'accounts', column_name: 'balance', data_type: 'DECIMAL(15,2)', is_nullable: 'NO' },
    { table_name: 'accounts', column_name: 'status', data_type: 'INT', is_nullable: 'YES' }
  ];
  
  const result2 = workOrderService.importDictionary(order.id, 'v2.0.0', records2);
  assert.ok(result2.success);
  assert.equal(result2.record_count, 3);
  
  const batches = workOrderService.listImportBatches(order.id, 'dictionary');
  assert.ok(batches.length >= 2);
});

test('5. 同版本号重复导入检测', () => {
  const order = workOrderService.createWorkOrder({
    title: '同版本重复导入测试'
  });
  
  const records1 = [
    { table_name: 't1', column_name: 'c1', data_type: 'INT' }
  ];
  const records2 = [
    { table_name: 't1', column_name: 'c2', data_type: 'VARCHAR(50)' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1.0', records1);
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1.0', records2);
  }, /版本.*已存在/);
});

test('6. 表结构漂移对比 - 完整流程', () => {
  const order = workOrderService.createWorkOrder({
    title: '对比测试工单'
  });
  
  const v1Records = [
    { table_name: 'users', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '主键' },
    { table_name: 'users', column_name: 'name', data_type: 'VARCHAR(50)', is_nullable: 'YES', comment: '姓名' },
    { table_name: 'users', column_name: 'email', data_type: 'VARCHAR(100)', is_nullable: 'YES', comment: '邮箱' },
    { table_name: 'orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '订单ID' },
    { table_name: 'orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES', comment: '用户ID' }
  ];
  
  const v2Records = [
    { table_name: 'users', column_name: 'id', data_type: 'BIGINT', is_nullable: 'NO', comment: '主键' },
    { table_name: 'users', column_name: 'name', data_type: 'VARCHAR(100)', is_nullable: 'NO', comment: '姓名', default_value: '' },
    { table_name: 'users', column_name: 'email', data_type: 'VARCHAR(100)', is_nullable: 'YES', comment: '邮箱' },
    { table_name: 'users', column_name: 'phone', data_type: 'VARCHAR(20)', is_nullable: 'YES', comment: '手机号' },
    { table_name: 'orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '订单ID' },
    { table_name: 'orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES', comment: '用户ID' },
    { table_name: 'payments', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '支付ID' },
    { table_name: 'payments', column_name: 'amount', data_type: 'DECIMAL(10,2)', is_nullable: 'NO', comment: '支付金额' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1.0', v1Records);
  workOrderService.importDictionary(order.id, 'v2.0', v2Records);
  
  const result = compareService.executeComparison(order.id, 'v1.0', 'v2.0');
  assert.ok(result.comparison_id);
  assert.ok(result.total_changes > 0);
  assert.equal(result.is_new, true);
  
  const comparison = compareService.getComparisonById(result.comparison_id);
  assert.equal(comparison.baseline_version, 'v1.0');
  assert.equal(comparison.target_version, 'v2.0');
  assert.equal(comparison.status, 'completed');
  
  const details = compareService.getComparisonDetails(result.comparison_id);
  assert.equal(details.total, result.total_changes);
  
  const changeTypes = {};
  for (const d of details.list) {
    changeTypes[d.change_type] = (changeTypes[d.change_type] || 0) + 1;
  }
  
  assert.ok(changeTypes['TABLE_ADD'] >= 1, '应该有新增表');
  assert.ok(changeTypes['COLUMN_ADD'] >= 1, '应该有新增字段');
  assert.ok(changeTypes['COLUMN_MODIFY'] >= 1, '应该有修改字段');
});

test('7. 回滚记录生成', () => {
  const order = workOrderService.createWorkOrder({
    title: '回滚测试工单'
  });
  
  const v1 = [{ table_name: 't1', column_name: 'c1', data_type: 'INT', is_nullable: 'NO' }];
  const v2 = [
    { table_name: 't1', column_name: 'c1', data_type: 'BIGINT', is_nullable: 'NO' },
    { table_name: 't1', column_name: 'c2', data_type: 'VARCHAR(50)', is_nullable: 'YES' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1', v1);
  workOrderService.importDictionary(order.id, 'v2', v2);
  
  const compResult = compareService.executeComparison(order.id, 'v1', 'v2');
  const rollbacks = compareService.getRollbackRecords(compResult.comparison_id);
  
  assert.ok(rollbacks.length >= 2);
  
  for (const r of rollbacks) {
    assert.ok(r.rollback_sql);
    assert.ok(r.rollback_sql.length > 0);
    assert.equal(r.status, 'pending');
  }
  
  const executed = compareService.executeRollback(rollbacks[0].id, 'test_user', '测试回滚');
  assert.equal(executed.status, 'executed');
  assert.equal(executed.executor, 'test_user');
});

test('8. 索引建议生成', () => {
  const order = workOrderService.createWorkOrder({
    title: '索引建议测试工单'
  });
  
  const v1 = [
    { table_name: 'orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 'orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES' },
    { table_name: 'orders', column_name: 'created_at', data_type: 'DATETIME', is_nullable: 'YES' }
  ];
  const v2 = [
    { table_name: 'orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 'orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES' },
    { table_name: 'orders', column_name: 'product_id', data_type: 'INT', is_nullable: 'YES', comment: '产品ID索引' },
    { table_name: 'orders', column_name: 'created_at', data_type: 'DATETIME', is_nullable: 'YES' },
    { table_name: 'orders', column_name: 'updated_at', data_type: 'DATETIME', is_nullable: 'YES' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1', v1);
  workOrderService.importDictionary(order.id, 'v2', v2);
  
  const compResult = compareService.executeComparison(order.id, 'v1', 'v2');
  const suggestions = compareService.getIndexSuggestions(compResult.comparison_id);
  
  assert.ok(suggestions.length >= 1);
  
  const adopted = compareService.adoptIndexSuggestion(suggestions[0].id, true, '同意采纳');
  assert.equal(adopted.is_adopted, 1);
});

test('9. 可直接使用 vs 需复核 标记', () => {
  const order = workOrderService.createWorkOrder({
    title: '复核标记测试工单'
  });
  
  const v1 = [{ table_name: 't', column_name: 'c1', data_type: 'INT', is_nullable: 'NO' }];
  const v2 = [
    { table_name: 't', column_name: 'c1', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 't', column_name: 'c2', data_type: 'VARCHAR(50)', is_nullable: 'YES' },
    { table_name: 't', column_name: 'c3', data_type: 'VARCHAR(50)', is_nullable: 'NO' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1', v1);
  workOrderService.importDictionary(order.id, 'v2', v2);
  
  const compResult = compareService.executeComparison(order.id, 'v1', 'v2');
  const details = compareService.getComparisonDetails(compResult.comparison_id);
  
  let canUseCount = 0;
  let needReviewCount = 0;
  
  for (const d of details.list) {
    if (d.can_use_directly) {
      canUseCount++;
    } else {
      needReviewCount++;
      assert.ok(d.need_review_reason, '需复核的项必须有原因');
    }
  }
  
  assert.ok(canUseCount >= 1, '应该有可直接使用的变更');
  assert.ok(needReviewCount >= 1, '应该有需复核的变更');
});

test('10. 错误处理 - 可操作错误信息', () => {
  const order = workOrderService.createWorkOrder({ title: '错误处理测试' });
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1', []);
  }, (err) => {
    assert.ok(err.message.includes('不能为空'));
    assert.ok(err.actionableInfo);
    assert.ok(err.actionableInfo.suggestion);
    return true;
  });
  
  assert.throws(() => {
    workOrderService.transitionStatus(order.id, 'invalid_status');
  }, (err) => {
    assert.ok(err.message.includes('无法从状态'));
    assert.ok(err.actionableInfo);
    assert.ok(Array.isArray(err.actionableInfo.allowed_transitions));
    assert.ok(err.actionableInfo.suggestion);
    return true;
  });
  
  assert.throws(() => {
    compareService.executeComparison(order.id, 'v1', 'v2');
  }, (err) => {
    assert.ok(err.actionableInfo);
    assert.ok(err.actionableInfo.suggestion);
    return true;
  });
});

test('11. 权限审计 - 完整流程', () => {
  const order = workOrderService.createWorkOrder({ title: '权限审计测试' });
  
  assert.throws(() => {
    permissionAuditService.executeAudit(order.id);
  }, /未找到权限清单/);
  
  const permResult = permissionAuditService.importPermissionList(order.id, {
    source_type: '财务系统维护组',
    source_ref: '权限文档#2024-001',
    content: 'users表：财务角色可读，管理员角色可读写\norders表：财务角色可读写'
  });
  assert.ok(permResult.id);
  
  const v1 = [{ table_name: 'users', column_name: 'id', data_type: 'INT' }];
  const v2 = [
    { table_name: 'users', column_name: 'id', data_type: 'INT' },
    { table_name: 'orders', column_name: 'id', data_type: 'INT' },
    { table_name: 'payments', column_name: 'id', data_type: 'INT' }
  ];
  workOrderService.importDictionary(order.id, 'v1', v1);
  workOrderService.importDictionary(order.id, 'v2', v2);
  compareService.executeComparison(order.id, 'v1', 'v2');
  
  const auditResult = permissionAuditService.executeAudit(order.id, {
    operator: 'auditor',
    source_material_ref: '业务工单#001'
  });
  
  assert.ok(auditResult.audit_id);
  assert.ok(auditResult.issues.length >= 1);
  assert.ok(auditResult.conclusion);
  
  const newTableIssue = auditResult.issues.find(i => i.type === 'new_table_needs_permission');
  assert.ok(newTableIssue, '新增表应该有对应的权限问题');
  assert.ok(newTableIssue.suggestion, '每个问题应该有建议');
  assert.ok(newTableIssue.severity);
});

test('12. 慢查询日志导入和关联', () => {
  const order = workOrderService.createWorkOrder({ title: '慢查询测试' });
  
  const logs = [
    { query_text: 'SELECT * FROM users WHERE id = 1', execution_time: 2.5, related_table: 'users', rows_examined: 1000 },
    { query_text: 'SELECT * FROM orders WHERE user_id = 100', execution_time: 5.2, related_table: 'orders', rows_examined: 5000 },
    { query_text: 'SELECT count(*) FROM payments', execution_time: 10.8, related_table: 'payments', rows_examined: 100000 }
  ];
  
  const result = slowQueryService.importSlowQueryLog(order.id, logs, 'slow-2024-01.log');
  assert.equal(result.record_count, 3);
  
  const list = slowQueryService.listSlowQueries(order.id);
  assert.equal(list.total, 3);
  
  const ordersQueries = slowQueryService.getSlowQueriesByTable(order.id, 'orders');
  assert.ok(ordersQueries.length >= 1);
  
  const linked = slowQueryService.linkToConclusion(list.list[0].id, 1);
  assert.equal(linked.conclusion_ref, 1);
  
  const byConclusion = slowQueryService.getConclusionsWithSlowQueries(order.id);
  assert.ok(byConclusion['1']);
  assert.ok(byConclusion['1'].length >= 1);
});

test('13. 报告生成和导出', () => {
  const order = workOrderService.createWorkOrder({ title: '报告测试工单' });
  
  const v1 = [
    { table_name: 'users', column_name: 'id', data_type: 'INT', is_nullable: 'NO' },
    { table_name: 'users', column_name: 'name', data_type: 'VARCHAR(50)', is_nullable: 'YES' }
  ];
  const v2 = [
    { table_name: 'users', column_name: 'id', data_type: 'BIGINT', is_nullable: 'NO' },
    { table_name: 'users', column_name: 'name', data_type: 'VARCHAR(100)', is_nullable: 'NO', default_value: '' },
    { table_name: 'users', column_name: 'email', data_type: 'VARCHAR(100)', is_nullable: 'YES' }
  ];
  
  workOrderService.importDictionary(order.id, 'v1', v1);
  workOrderService.importDictionary(order.id, 'v2', v2);
  compareService.executeComparison(order.id, 'v1', 'v2');
  
  const reportResult = reportService.generateReport(order.id, null, 'full');
  assert.ok(reportResult.report_id);
  assert.ok(reportResult.summary);
  
  const report = reportService.getReport(reportResult.report_id);
  assert.ok(report.content);
  assert.ok(report.content.summary);
  assert.ok(report.content.can_use_directly);
  assert.ok(report.content.need_review);
  
  const exportResult = reportService.exportReport(reportResult.report_id, 'json');
  assert.equal(exportResult.format, 'json');
  assert.ok(exportResult.data);
  
  const summaryResult = reportService.exportReport(reportResult.report_id, 'summary');
  assert.equal(summaryResult.format, 'summary');
  assert.ok(summaryResult.data.includes('表结构漂移对比报告'));
  assert.ok(summaryResult.data.includes('可直接使用'));
  assert.ok(summaryResult.data.includes('需复核'));
  
  const reports = reportService.listReports(order.id);
  assert.ok(reports.length >= 1);
});

test('14. 重启后数据不丢失 - 持久化验证', () => {
  const order = workOrderService.createWorkOrder({
    title: '持久化测试工单',
    description: '验证重启后数据仍然存在'
  });
  
  const records = [
    { table_name: 'persist_test', column_name: 'id', data_type: 'INT', is_nullable: 'NO' }
  ];
  workOrderService.importDictionary(order.id, 'v1', records);
  
  const orderId = order.id;
  const orderNo = order.order_no;
  
  resetDb();
  setDbPath(TEST_DB_PATH);
  
  const fetched = workOrderService.getWorkOrderById(orderId);
  assert.equal(fetched.order_no, orderNo);
  assert.equal(fetched.title, '持久化测试工单');
  
  const versions = workOrderService.listDictionaryVersions(orderId);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].version, 'v1');
});

test('15. 完整业务流程 - 从导入到报告', () => {
  const order = workOrderService.createWorkOrder({
    title: '2024-Q1财务系统表结构调整',
    description: '业务工单#FIN-2024-001，涉及用户表、订单表、支付表的结构调整',
    source: 'FIN-2024-001'
  });
  
  assert.equal(order.status, 'draft');
  
  const baselineDict = [
    { table_name: 'fin_users', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '用户ID' },
    { table_name: 'fin_users', column_name: 'username', data_type: 'VARCHAR(50)', is_nullable: 'NO', comment: '用户名' },
    { table_name: 'fin_users', column_name: 'dept_id', data_type: 'INT', is_nullable: 'YES', comment: '部门ID' },
    { table_name: 'fin_orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '订单ID' },
    { table_name: 'fin_orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES', comment: '用户ID' },
    { table_name: 'fin_orders', column_name: 'amount', data_type: 'DECIMAL(10,2)', is_nullable: 'NO', comment: '金额' }
  ];
  
  const targetDict = [
    { table_name: 'fin_users', column_name: 'id', data_type: 'BIGINT', is_nullable: 'NO', comment: '用户ID' },
    { table_name: 'fin_users', column_name: 'username', data_type: 'VARCHAR(100)', is_nullable: 'NO', comment: '用户名' },
    { table_name: 'fin_users', column_name: 'dept_id', data_type: 'INT', is_nullable: 'YES', comment: '部门ID' },
    { table_name: 'fin_users', column_name: 'real_name', data_type: 'VARCHAR(50)', is_nullable: 'YES', comment: '真实姓名' },
    { table_name: 'fin_users', column_name: 'id_card', data_type: 'VARCHAR(18)', is_nullable: 'YES', comment: '身份证号' },
    { table_name: 'fin_orders', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '订单ID' },
    { table_name: 'fin_orders', column_name: 'user_id', data_type: 'INT', is_nullable: 'YES', comment: '用户ID' },
    { table_name: 'fin_orders', column_name: 'amount', data_type: 'DECIMAL(15,2)', is_nullable: 'NO', comment: '金额' },
    { table_name: 'fin_orders', column_name: 'status', data_type: 'TINYINT', is_nullable: 'NO', default_value: '0', comment: '状态' },
    { table_name: 'fin_payments', column_name: 'id', data_type: 'INT', is_nullable: 'NO', comment: '支付ID' },
    { table_name: 'fin_payments', column_name: 'order_id', data_type: 'INT', is_nullable: 'YES', comment: '订单ID' },
    { table_name: 'fin_payments', column_name: 'amount', data_type: 'DECIMAL(10,2)', is_nullable: 'NO', comment: '支付金额' }
  ];
  
  workOrderService.importDictionary(order.id, 'v2023Q4', baselineDict);
  workOrderService.importDictionary(order.id, 'v2024Q1', targetDict);
  
  const updatedOrder = workOrderService.getWorkOrderById(order.id);
  assert.equal(updatedOrder.status, 'importing');
  
  workOrderService.transitionStatus(order.id, 'reviewing', 'maintainer', '数据字典导入完成，提交复核');
  
  const compResult = compareService.executeComparison(order.id, 'v2023Q4', 'v2024Q1');
  assert.ok(compResult.comparison_id);
  assert.ok(compResult.total_changes > 0);
  
  const details = compareService.getComparisonDetails(compResult.comparison_id);
  const canUseList = details.list.filter(d => d.can_use_directly);
  const needReviewList = details.list.filter(d => !d.can_use_directly);
  
  assert.ok(canUseList.length >= 1, '存在可直接使用的变更');
  assert.ok(needReviewList.length >= 1, '存在需要复核的变更');
  
  for (const d of needReviewList) {
    assert.ok(d.need_review_reason, '每个需复核项都有原因');
  }
  
  const rollbacks = compareService.getRollbackRecords(compResult.comparison_id);
  assert.ok(rollbacks.length >= details.list.length * 0.5, '大部分变更有回滚方案');
  
  for (const r of rollbacks) {
    assert.ok(r.rollback_sql && r.rollback_sql.length > 10, '回滚SQL有效');
  }
  
  const indexSuggestions = compareService.getIndexSuggestions(compResult.comparison_id);
  assert.ok(indexSuggestions.length >= 1, '有索引建议');
  
  permissionAuditService.importPermissionList(order.id, {
    source_type: '财务系统维护组',
    source_ref: '权限文档#PERM-2023-Q4',
    content: 'fin_users表：财务岗可读，管理员可读写\nfin_orders表：财务岗可读写，审计岗可读'
  });
  
  const auditResult = permissionAuditService.executeAudit(order.id, {
    operator: 'auditor',
    source_material_ref: 'FIN-2024-001'
  });
  
  assert.ok(auditResult.issues.length >= 1, '权限审计发现问题');
  for (const issue of auditResult.issues) {
    assert.ok(issue.suggestion, '每个问题有可操作建议');
  }
  
  slowQueryService.importSlowQueryLog(order.id, [
    { query_text: 'SELECT * FROM fin_users WHERE dept_id = ?', execution_time: 3.5, related_table: 'fin_users', rows_examined: 2000 },
    { query_text: 'SELECT * FROM fin_orders WHERE user_id = ? AND status = 1', execution_time: 8.2, related_table: 'fin_orders', rows_examined: 15000 }
  ]);
  
  const reportResult = reportService.generateReport(order.id);
  assert.ok(reportResult.report_id);
  
  const report = reportService.getReport(reportResult.report_id);
  assert.ok(report.content.summary);
  assert.ok(report.content.can_use_directly.length >= 1);
  assert.ok(report.content.need_review.length >= 1);
  
  const finalOrder = workOrderService.getWorkOrderById(order.id);
  assert.equal(finalOrder.status, 'completed');
  
  const transitions = workOrderService.listStatusTransitions(order.id);
  assert.ok(transitions.length >= 4);
});

test('16. 导入空数据验证', () => {
  const order = workOrderService.createWorkOrder({ title: '空数据测试' });
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1', null);
  }, /缺少必填字段/);
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1', []);
  }, /不能为空/);
});

test('17. 导入数据字段校验', () => {
  const order = workOrderService.createWorkOrder({ title: '字段校验测试' });
  
  const invalidRecords = [
    { table_name: 't1' }
  ];
  
  assert.throws(() => {
    workOrderService.importDictionary(order.id, 'v1', invalidRecords);
  }, /缺少必填字段/);
  
  const validRecords = [
    { table_name: 't1', column_name: 'c1' }
  ];
  
  const result = workOrderService.importDictionary(order.id, 'v1', validRecords);
  assert.ok(result.success);
});
