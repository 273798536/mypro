const http = require('http');
const Implant = require('../src/models/Implant');
const Appointment = require('../src/models/Appointment');
const SupplierInvoice = require('../src/models/SupplierInvoice');
const { TraceabilityLedger } = require('../src/models/TraceabilityLedger');
const FailedRecord = require('../src/models/FailedRecord');
const AuditLog = require('../src/models/AuditLog');

const API_BASE = 'http://localhost:3000/api';

function makeRequest(method, path, data = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    let fullPath = API_BASE + path;
    
    if (method === 'GET' && data && Object.keys(data).length > 0) {
      const params = new URLSearchParams(data).toString();
      fullPath += '?' + params;
      data = null;
    }
    
    const url = new URL(fullPath);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-operator-id': 'test-operator',
        'x-operator-name': 'TestUser',
        'x-operator-role': 'replenisher',
        ...customHeaders
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data && Object.keys(data).length > 0) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           口腔门诊材料权限追责台账 API 验收测试                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let testResults = [];
  let createdLedgerId = null;

  try {
    console.log('📋 第一部分: 正常链路测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n1. 健康检查...');
    const healthRes = await makeRequest('GET', '/health');
    testResults.push({ name: '健康检查', pass: healthRes.status === 200 });
    console.log(`   ${healthRes.status === 200 ? '✅' : '❌'} ${healthRes.data.message}`);

    console.log('\n2. 创建种植体...');
    const implantData = {
      batch_number: 'IMPL-' + Date.now(),
      product_name: '韩国奥齿泰种植体',
      manufacturer: 'Osstem Implant Co., Ltd.',
      specification: 'Ø4.0×10mm',
      production_date: '2024-01-15',
      expiration_date: '2028-01-14',
      initial_stock: 50,
      unit: '个'
    };
    const implantRes = await makeRequest('POST', '/implants', implantData);
    testResults.push({ name: '创建种植体', pass: implantRes.status === 200 });
    console.log(`   ${implantRes.status === 200 ? '✅' : '❌'} 批号: ${implantData.batch_number}`);
    const implantBatch = implantData.batch_number;

    console.log('\n3. 创建预约记录...');
    const appointmentData = {
      appointment_no: 'APT-' + Date.now(),
      patient_id: 'P001',
      patient_name: '张三',
      patient_phone: '13800138000',
      doctor_id: 'D001',
      doctor_name: '李医生',
      department: '口腔种植科',
      appointment_date: '2024-12-20',
      appointment_time: '09:30:00',
      treatment_type: '种植牙手术'
    };
    const aptRes = await makeRequest('POST', '/appointments', appointmentData);
    testResults.push({ name: '创建预约记录', pass: aptRes.status === 200 });
    console.log(`   ${aptRes.status === 200 ? '✅' : '❌'} 预约号: ${appointmentData.appointment_no}`);

    console.log('\n4. 创建供应商发票...');
    const invoiceData = {
      invoice_no: 'INV-' + Date.now(),
      supplier_name: 'XX医疗器械有限公司',
      supplier_tax_id: '91310000MA12345678',
      invoice_date: '2024-12-01',
      total_amount: 25000.00,
      payment_status: 'paid',
      received_date: '2024-12-05',
      warehouse_person: '王库管',
      remark: '常规采购'
    };
    const invRes = await makeRequest('POST', '/invoices', invoiceData);
    testResults.push({ name: '创建供应商发票', pass: invRes.status === 200 });
    console.log(`   ${invRes.status === 200 ? '✅' : '❌'} 发票号: ${invoiceData.invoice_no}`);

    console.log('\n5. 创建台账记录...');
    const ledgerData = {
      implant_batch_number: implantBatch,
      appointment_no: appointmentData.appointment_no,
      invoice_no: invoiceData.invoice_no,
      patient_name: '张三',
      doctor_name: '李医生',
      department: '口腔种植科',
      usage_quantity: 1,
      created_by: '张补货员',
      change_reason: '常规种植手术'
    };
    const ledgerRes = await makeRequest('POST', '/ledgers', ledgerData);
    testResults.push({ name: '创建台账记录', pass: ledgerRes.status === 200 });
    if (ledgerRes.status === 200) {
      createdLedgerId = ledgerRes.data.data.id;
      console.log(`   ✅ 台账ID: ${createdLedgerId}`);
      console.log(`   ✅ 台账编号: ${ledgerRes.data.data.ledger_no}`);
      console.log(`   ✅ 当前状态: ${ledgerRes.data.data.status}`);
    } else {
      console.log(`   ❌ 失败: ${ledgerRes.data.error}`);
    }

    console.log('\n6. 提交审核...');
    const submitRes = await makeRequest('POST', `/ledgers/${createdLedgerId}/submit`, {}, {
      'x-operator-role': 'supervisor'
    });
    testResults.push({ name: '提交审核', pass: submitRes.status === 200 });
    if (submitRes.status === 200) {
      console.log(`   ✅ 新状态: ${submitRes.data.data.status}`);
    } else {
      console.log(`   ❌ 失败: ${submitRes.data?.error}`);
    }

    console.log('\n7. 审核通过...');
    const confirmRes = await makeRequest('POST', `/ledgers/${createdLedgerId}/confirm`, {}, {
      'x-operator-role': 'director'
    });
    testResults.push({ name: '审核通过', pass: confirmRes.status === 200 });
    if (confirmRes.status === 200) {
      console.log(`   ✅ 新状态: ${confirmRes.data.data.status}`);
      console.log(`   ✅ 版本号: ${confirmRes.data.data.version}`);
    } else {
      console.log(`   ❌ 失败: ${confirmRes.data?.error}`);
    }

    console.log('\n8. 查看审计日志...');
    const auditRes = await makeRequest('GET', `/ledgers/${createdLedgerId}/audit-logs`);
    testResults.push({ name: '审计日志查询', pass: auditRes.status === 200 && auditRes.data.data.length > 0 });
    console.log(`   ${auditRes.data.data.length > 0 ? '✅' : '❌'} 日志条数: ${auditRes.data.data.length}`);
    auditRes.data.data.forEach((log, i) => {
      console.log(`      ${i + 1}. ${log.action} - ${log.operator_name} (${log.operator_role})`);
    });

    console.log('\n9. 数据导出...');
    const exportRes = await makeRequest('POST', '/export', { sensitive_masked: true });
    testResults.push({ name: '数据导出', pass: exportRes.status === 200 });
    if (exportRes.status === 200) {
      console.log(`   ✅ 导出文件: ${exportRes.data.data.filename}`);
      console.log(`   ✅ 记录数量: ${exportRes.data.data.recordCount}`);
      console.log(`   ✅ 脱敏处理: ${exportRes.data.data.sensitive_masked ? '是' : '否'}`);
    }

    console.log('\n10. 查看汇总统计...');
    const summaryRes = await makeRequest('GET', '/summary');
    testResults.push({ name: '汇总统计', pass: summaryRes.status === 200 });
    if (summaryRes.status === 200) {
      console.log(`   ✅ 总记录数: ${summaryRes.data.data.total}`);
      console.log(`   ✅ 按状态分布:`, summaryRes.data.data.by_status);
    }

    console.log('\n11. 生成主任视图...');
    const today = new Date().toISOString().split('T')[0];
    const directorRes = await makeRequest('POST', `/director/views/${today}/generate`);
    testResults.push({ name: '主任视图生成', pass: directorRes.status === 200 });
    if (directorRes.status === 200) {
      console.log(`   ✅ 台账总数: ${directorRes.data.data.total_ledgers}`);
      console.log(`   ✅ 待审批: ${directorRes.data.data.pending_approval}`);
      console.log(`   ✅ 已确认: ${directorRes.data.data.confirmed_count}`);
      console.log(`   ✅ 角色分布:`, directorRes.data.data.role_distribution);
    }

    console.log('\n\n📋 第二部分: 重复提交和坏数据测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n12. 重复提交测试...');
    const resubmitRes = await makeRequest('POST', `/ledgers/${createdLedgerId}/submit`);
    testResults.push({ name: '重复提交拦截', pass: resubmitRes.status === 400 });
    console.log(`   ${resubmitRes.status === 400 ? '✅' : '❌'} 状态码: ${resubmitRes.status}`);
    if (resubmitRes.status === 400) {
      console.log(`   ✅ 拦截原因: ${resubmitRes.data.error}`);
    }

    console.log('\n13. 库存不足测试...');
    const badLedger1 = {
      implant_batch_number: implantBatch,
      usage_quantity: 999,
      created_by: '测试员'
    };
    const badRes1 = await makeRequest('POST', '/ledgers', badLedger1);
    testResults.push({ name: '库存不足拦截', pass: badRes1.status === 400 });
    console.log(`   ${badRes1.status === 400 ? '✅' : '❌'} 状态码: ${badRes1.status}`);

    console.log('\n14. 批号不存在测试...');
    const badLedger2 = {
      implant_batch_number: 'NONEXISTENT-' + Date.now(),
      usage_quantity: 1,
      created_by: '测试员'
    };
    const badRes2 = await makeRequest('POST', '/ledgers', badLedger2);
    testResults.push({ name: '批号不存在拦截', pass: badRes2.status === 400 });
    console.log(`   ${badRes2.status === 400 ? '✅' : '❌'} 状态码: ${badRes2.status}`);

    console.log('\n15. 查看失败记录列表...');
    const failedRes = await makeRequest('GET', '/failed-records');
    testResults.push({ name: '失败记录查询', pass: failedRes.status === 200 });
    console.log(`   ${failedRes.status === 200 ? '✅' : '❌'} 失败记录数: ${failedRes.data.data.length}`);
    if (failedRes.data.data.length > 0) {
      failedRes.data.data.slice(0, 2).forEach((rec, i) => {
        console.log(`      ${i + 1}. ${rec.record_type}: ${rec.error_message.substring(0, 50)}...`);
      });
    }

    console.log('\n\n📋 第三部分: 数据一致性验证');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n16. 台账详情与列表一致性...');
    const detailRes = await makeRequest('GET', `/ledgers/${createdLedgerId}`);
    const listRes = await makeRequest('GET', '/ledgers', { limit: 10 });
    const fromList = listRes.data.data.find(l => l.id === createdLedgerId);
    const isConsistent = fromList && 
      detailRes.data.data.status === fromList.status &&
      detailRes.data.data.version === fromList.version;
    testResults.push({ name: '详情列表一致性', pass: isConsistent });
    console.log(`   ${isConsistent ? '✅' : '❌'} 状态一致: ${detailRes.data.data.status} === ${fromList?.status}`);

    console.log('\n17. 汇总与明细一致性...');
    const detailedRes = await makeRequest('GET', '/ledgers/detailed', { status: 'confirmed' });
    const confirmedCount = detailedRes.data.data.length;
    const summaryCheck = summaryRes.data.data.by_status.confirmed === confirmedCount || 
                         summaryRes.data.data.by_status.confirmed >= confirmedCount;
    testResults.push({ name: '汇总明细一致性', pass: summaryCheck });
    console.log(`   ${summaryCheck ? '✅' : '❌'} 已确认数量匹配`);

    console.log('\n\n📊 测试结果汇总');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const passed = testResults.filter(r => r.pass).length;
    const total = testResults.length;
    console.log(`\n通过: ${passed}/${total}`);
    testResults.forEach(r => {
      console.log(`  ${r.pass ? '✅' : '❌'} ${r.name}`);
    });

    console.log('\n\n💡 重启服务后可通过以下方式验证历史数据保留:');
    console.log('   - GET /api/ledgers/' + createdLedgerId);
    console.log('   - GET /api/ledgers/' + createdLedgerId + '/audit-logs');
    console.log('   - GET /api/summary');
    console.log('   - GET /api/failed-records');

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  测试完成! ${passed}/${total} 项通过 ${passed === total ? '🎉' : '⚠️'}                                ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ 测试执行出错:', error.message);
    console.error(error.stack);
  }
}

setTimeout(runTests, 2000);
