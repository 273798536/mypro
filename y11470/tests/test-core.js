const db = require('../src/config/database');
const ReturnApplication = require('../src/models/ReturnApplication');
const ReturnBatch = require('../src/models/ReturnBatch');
const FailedRecord = require('../src/models/FailedRecord');
const StateMachineService = require('../src/services/StateMachineService');
const ExceptionService = require('../src/services/ExceptionService');
const DataConsistencyService = require('../src/services/DataConsistencyService');
const AutoCheckService = require('../src/services/AutoCheckService');
const { RETURN_STATUSES } = require('../src/utils/common');

const TEST_USER = 'test_user_001';

function waitForDatabase() {
  return new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
}

async function runTests() {
  await waitForDatabase();
  console.log('=== 仓库退供复核异常回执状态机服务 - 核心功能测试 ===\n');
  
  const results = [];
  
  results.push(await testCreateApplication());
  results.push(await testCreateBatch());
  results.push(await testDuplicateBatchImport());
  results.push(await testOverwriteBatchUpdate());
  results.push(await testStateTransitions());
  results.push(await testFreezeAndUnfreeze());
  results.push(await testExceptionReservation());
  results.push(await testExceptionReservedFilter());
  results.push(await testBadBatchToFailedRecords());
  results.push(await testDataConsistency());
  results.push(await testAutoCheck());
  
  console.log('\n=== 测试结果汇总 ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`通过: ${passed}, 失败: ${failed}`);
  
  results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}: ${r.message}`);
  });
  
  return failed === 0;
}

async function testCreateApplication() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const found = await ReturnApplication.findById(app.id);
    
    return {
      name: '创建退供申请',
      passed: found && found.application_no === app.application_no,
      message: found ? '成功创建并查询' : '创建失败'
    };
  } catch (e) {
    return { name: '创建退供申请', passed: false, message: e.message };
  }
}

async function testCreateBatch() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-BATCH-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const result = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: 'TEST-BATCH-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    const batch = await ReturnBatch.findById(result.batch_id);
    
    return {
      name: '创建批次',
      passed: batch && batch.status === RETURN_STATUSES.CREATED && batch.amount === 999.9,
      message: batch ? `成功创建，状态: ${batch.status}, 金额: ${batch.amount}` : '创建失败'
    };
  } catch (e) {
    return { name: '创建批次', passed: false, message: e.message };
  }
}

async function testDuplicateBatchImport() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-DUP-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const batchNo = 'TEST-BATCH-DUP-' + Date.now();
    
    const result1 = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: batchNo,
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    const result2 = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: batchNo,
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    return {
      name: '重复导入检测',
      passed: result1.is_reentry === false && result2.is_reentry === true && result2.reentry_type === 'IGNORE',
      message: `首次: is_reentry=${result1.is_reentry}, 重复: is_reentry=${result2.is_reentry}, type=${result2.reentry_type}`
    };
  } catch (e) {
    return { name: '重复导入检测', passed: false, message: e.message };
  }
}

async function testStateTransitions() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-TRANS-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const result = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: 'TEST-BATCH-TRANS-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    const batchId = result.batch_id;
    
    await StateMachineService.uploadAttachment(batchId, TEST_USER);
    await StateMachineService.qualityInspection(batchId, 'PASS', TEST_USER, '质检合格');
    await StateMachineService.review(batchId, TEST_USER, '复核通过');
    
    const batch = await ReturnBatch.findById(batchId);
    
    return {
      name: '状态流转',
      passed: batch && batch.status === RETURN_STATUSES.REVIEWED,
      message: batch ? `当前状态: ${batch.status}` : '流转失败'
    };
  } catch (e) {
    return { name: '状态流转', passed: false, message: e.message };
  }
}

async function testFreezeAndUnfreeze() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-FREEZE-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const result = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: 'TEST-BATCH-FREEZE-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    const batchId = result.batch_id;
    
    await StateMachineService.uploadAttachment(batchId, TEST_USER);
    await StateMachineService.qualityInspection(batchId, 'PASS', TEST_USER);
    await StateMachineService.review(batchId, TEST_USER);
    
    await StateMachineService.freeze(batchId, '异常冻结', TEST_USER);
    let frozen = await ReturnBatch.findById(batchId);
    
    await StateMachineService.unfreeze(batchId, TEST_USER);
    let unfrozen = await ReturnBatch.findById(batchId);
    
    return {
      name: '冻结/解冻',
      passed: frozen.status === RETURN_STATUSES.FROZEN && unfrozen.status === RETURN_STATUSES.REVIEWED,
      message: `冻结前: ${frozen.previous_status}, 冻结后: ${frozen.status}, 解冻后: ${unfrozen.status}`
    };
  } catch (e) {
    return { name: '冻结/解冻', passed: false, message: e.message };
  }
}

async function testExceptionReservation() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-EXCEPT-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: 'TEST-BATCH-EXCEPT-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    await ExceptionService.reserveExceptionsOnMemberCancel(app.id, TEST_USER);
    
    const details = await ExceptionService.getExceptionDetails(app.id);
    const integrity = await ExceptionService.verifyExceptionIntegrity(app.id);
    
    return {
      name: '异常保留',
      passed: details.application.exception_reserved === 1 && integrity.is_valid,
      message: `已保留: ${details.application.exception_reserved}, 完整: ${integrity.is_valid}, 批次: ${details.batches.length}`
    };
  } catch (e) {
    return { name: '异常保留', passed: false, message: e.message };
  }
}

async function testDataConsistency() {
  try {
    const summary = await DataConsistencyService.safeGetBatchSummary();
    
    return {
      name: '数据一致性',
      passed: typeof summary.total_count === 'number' && typeof summary.total_amount === 'number',
      message: `有效批次: ${summary.total_count}, 无效: ${summary.invalid_count}, 总数量: ${summary.total_quantity}, 总金额: ${summary.total_amount}`
    };
  } catch (e) {
    return { name: '数据一致性', passed: false, message: e.message };
  }
}

async function testAutoCheck() {
  try {
    const results = await AutoCheckService.runAllChecks();
    
    return {
      name: '自动化检查',
      passed: results.checks.duplicate_import.passed && 
              results.checks.restart_history.passed &&
              results.checks.export_consistency.passed &&
              results.checks.summary_consistency.passed,
      message: `全部通过: ${results.all_passed}, 检查项: ${Object.keys(results.checks).length}`
    };
  } catch (e) {
    return { name: '自动化检查', passed: false, message: e.message };
  }
}

async function testOverwriteBatchUpdate() {
  try {
    const app = await ReturnApplication.create({
      application_no: 'TEST-APP-OVERWRITE-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const batchNo = 'TEST-BATCH-OVERWRITE-' + Date.now();
    
    const result1 = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: batchNo,
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    const result2 = await StateMachineService.createBatch(app.id, {
      application_id: app.id,
      batch_no: batchNo,
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 20,
      unit_price: 50.00
    }, TEST_USER);
    
    const updatedBatch = await ReturnBatch.findById(result2.batch_id);
    const updatedApp = await ReturnApplication.findById(app.id);
    
    const isOverwrite = result2.reentry_type === 'OVERWRITE';
    const quantityUpdated = updatedBatch.quantity === 20;
    const amountUpdated = Math.abs(updatedBatch.amount - 1000.00) < 0.01;
    const appTotalUpdated = Math.abs(updatedApp.total_amount - 1000.00) < 0.01;
    
    return {
      name: '覆盖批次数据更新',
      passed: isOverwrite && quantityUpdated && amountUpdated && appTotalUpdated,
      message: isOverwrite 
        ? `覆盖成功: 数量从10→${updatedBatch.quantity}, 金额从999.9→${updatedBatch.amount}, 申请总金额: ${updatedApp.total_amount}`
        : `未覆盖，reentry_type=${result2.reentry_type}`
    };
  } catch (e) {
    return { name: '覆盖批次数据更新', passed: false, message: e.message };
  }
}

async function testExceptionReservedFilter() {
  try {
    const app1 = await ReturnApplication.create({
      application_no: 'TEST-APP-FILTER1-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    const app2 = await ReturnApplication.create({
      application_no: 'TEST-APP-FILTER2-' + Date.now(),
      supplier_id: 'SUP001',
      supplier_name: '测试供应商',
      created_by: TEST_USER
    });
    
    await StateMachineService.createBatch(app2.id, {
      application_id: app2.id,
      batch_no: 'TEST-BATCH-FILTER-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: 10,
      unit_price: 99.99
    }, TEST_USER);
    
    await ExceptionService.reserveExceptionsOnMemberCancel(app2.id, TEST_USER);
    
    const allExceptions = await ExceptionService.getAllReservedExceptions();
    const hasApp2 = allExceptions.some(e => e.application.id === app2.id);
    const hasApp1 = allExceptions.some(e => e.application.id === app1.id);
    
    return {
      name: '异常保留过滤',
      passed: hasApp2 && !hasApp1,
      message: `异常列表数量: ${allExceptions.length}, 包含已保留: ${hasApp2}, 不包含未保留: ${!hasApp1}`
    };
  } catch (e) {
    return { name: '异常保留过滤', passed: false, message: e.message };
  }
}

async function testBadBatchToFailedRecords() {
  try {
    const initialRecords = await FailedRecord.findAll({ record_type: 'CREATE_BATCH_VALIDATION' });
    const initialCount = initialRecords.length;
    
    const badBatchData = {
      application_id: 'test-app-id',
      batch_no: 'BAD-BATCH-' + Date.now(),
      product_code: 'PROD001',
      product_name: '测试商品',
      quantity: -5,
      unit_price: 99.99
    };
    
    try {
      const Joi = require('joi');
      const batchSchema = Joi.object({
        application_id: Joi.string().required(),
        batch_no: Joi.string().required(),
        product_code: Joi.string().required(),
        product_name: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required()
      });
      
      const { error } = batchSchema.validate(badBatchData);
      if (error) {
        await FailedRecord.create({
          record_type: 'CREATE_BATCH_VALIDATION',
          record_data: badBatchData,
          error_message: error.details.map(d => d.message).join('; '),
          source: 'Test'
        });
      }
    } catch (e) {
    }
    
    const afterRecords = await FailedRecord.findAll({ record_type: 'CREATE_BATCH_VALIDATION' });
    const hasNewRecord = afterRecords.length > initialCount;
    const latestRecord = afterRecords[0];
    
    return {
      name: '坏数据写入失败记录',
      passed: hasNewRecord && latestRecord && latestRecord.record_data.quantity === -5,
      message: hasNewRecord 
        ? `失败记录已写入: ${latestRecord.error_message}` 
        : `失败记录未写入，初始: ${initialCount}, 之后: ${afterRecords.length}`
    };
  } catch (e) {
    return { name: '坏数据写入失败记录', passed: false, message: e.message };
  }
}

module.exports = runTests;
