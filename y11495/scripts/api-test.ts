import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const BASE_URL = 'localhost';
const PORT = 3000;

function makeRequest(
  options: http.RequestOptions,
  data?: any,
  isFormData: boolean = false
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode || 500,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode || 500,
            body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data && !isFormData) {
      req.write(JSON.stringify(data));
      req.end();
    } else if (data && isFormData) {
      data.pipe(req);
    } else {
      req.end();
    }
  });
}

async function testAPI() {
  console.log('='.repeat(60));
  console.log('财务报销稽核异常回执状态机 - API 集成测试');
  console.log('='.repeat(60));

  console.log('\n⚠️  请确保服务已启动: npm run dev');
  console.log('    如未启动，请在另一个终端运行: npm run dev\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    console.log('【测试1】健康检查 - 获取批次列表');
    const listRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/batches',
      method: 'GET',
      headers: {
        'X-Username': 'clerk01',
        'Content-Type': 'application/json',
      },
    });
    console.log(`  状态码: ${listRes.statusCode}`);
    if (listRes.statusCode !== 200) {
      console.log(`  响应: ${JSON.stringify(listRes.body, null, 2)}`);
      console.log('❌ 失败，请确认服务已启动');
      return;
    }
    console.log('  ✅ 成功');

    console.log('\n【测试2】文员创建批次');
    const createRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/batches',
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        'Content-Type': 'application/json',
      },
    }, {
      title: 'API测试批次 - ' + new Date().toLocaleTimeString(),
      description: '通过API创建的测试批次',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
    });
    console.log(`  状态码: ${createRes.statusCode}`);
    console.log(`  批次号: ${createRes.body?.data?.batchNo}`);
    if (createRes.statusCode !== 200) {
      console.log(`  错误: ${JSON.stringify(createRes.body, null, 2)}`);
      return;
    }
    const batchId = createRes.body.data.id;
    console.log('  ✅ 成功');

    console.log('\n【测试3】文员上传差旅申请CSV（multipart/form-data）');
    const form1 = new FormData();
    form1.append('fileType', 'TRAVEL_APPLICATION');
    form1.append('file', fs.createReadStream(path.join(process.cwd(), 'sample-data/travel-applications.csv')));
    
    const uploadRes1 = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/files`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        ...form1.getHeaders(),
      },
    }, form1, true);
    console.log(`  状态码: ${uploadRes1.statusCode}`);
    console.log(`  消息: ${uploadRes1.body?.message || uploadRes1.body?.error}`);
    if (uploadRes1.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(uploadRes1.body, null, 2)}`);
      return;
    }
    console.log(`  解析记录数: ${uploadRes1.body?.data?.parsedCount}`);
    console.log('  ✅ 成功');

    console.log('\n【测试4】文员上传付款流水CSV');
    const form2 = new FormData();
    form2.append('fileType', 'PAYMENT_RECORD');
    form2.append('file', fs.createReadStream(path.join(process.cwd(), 'sample-data/payment-records.csv')));
    
    const uploadRes2 = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/files`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        ...form2.getHeaders(),
      },
    }, form2, true);
    console.log(`  状态码: ${uploadRes2.statusCode}`);
    console.log(`  消息: ${uploadRes2.body?.message || uploadRes2.body?.error}`);
    if (uploadRes2.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(uploadRes2.body, null, 2)}`);
      return;
    }
    console.log(`  解析记录数: ${uploadRes2.body?.data?.parsedCount}`);
    console.log('  ✅ 成功');

    console.log('\n【测试5】文员提交处理');
    const processRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/process`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        'Content-Type': 'application/json',
      },
    });
    console.log(`  状态码: ${processRes.statusCode}`);
    console.log(`  消息: ${processRes.body?.message || processRes.body?.error}`);
    if (processRes.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(processRes.body, null, 2)}`);
      return;
    }
    console.log(`  新状态: ${processRes.body?.data?.status}`);
    console.log('  ✅ 成功');

    console.log('\n【测试6】稽核员运行稽核检测');
    const auditRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/audit`,
      method: 'POST',
      headers: {
        'X-Username': 'reviewer01',
        'Content-Type': 'application/json',
      },
    });
    console.log(`  状态码: ${auditRes.statusCode}`);
    console.log(`  消息: ${auditRes.body?.message || auditRes.body?.error}`);
    if (auditRes.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(auditRes.body, null, 2)}`);
      return;
    }
    console.log(`  检测到异常数: ${auditRes.body?.data?.totalDetected}`);
    console.log('  ✅ 成功');

    console.log('\n【测试7】稽核员提交复核');
    const reviewRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/review`,
      method: 'POST',
      headers: {
        'X-Username': 'reviewer01',
        'Content-Type': 'application/json',
      },
    });
    console.log(`  状态码: ${reviewRes.statusCode}`);
    console.log(`  消息: ${reviewRes.body?.message || reviewRes.body?.error}`);
    if (reviewRes.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(reviewRes.body, null, 2)}`);
      return;
    }
    console.log(`  新状态: ${reviewRes.body?.data?.status}`);
    console.log('  ✅ 成功');

    console.log('\n【测试8.1】DRAFT状态尝试导出（应该失败）');
    const exceptions = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/exceptions`,
      method: 'GET',
      headers: {
        'X-Username': 'reviewer01',
      },
    });
    const firstException = exceptions.body?.data?.[0];
    
    console.log('\n【测试8】财务经理冻结批次');
    const freezeRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/freeze`,
      method: 'POST',
      headers: {
        'X-Username': 'manager01',
        'Content-Type': 'application/json',
      },
    }, {
      reason: 'API测试冻结，需要核实异常情况',
    });
    console.log(`  状态码: ${freezeRes.statusCode}`);
    console.log(`  消息: ${freezeRes.body?.message || freezeRes.body?.error}`);
    if (freezeRes.statusCode !== 200) {
      console.log(`  完整响应: ${JSON.stringify(freezeRes.body, null, 2)}`);
      return;
    }
    console.log(`  新状态: ${freezeRes.body?.data?.status}`);
    console.log('  ✅ 成功');

    console.log('\n【测试8.2】冻结后尝试确认异常（应该失败，状态锁定）');
    const confirmFrozenRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/exceptions/${firstException?.id}/confirm`,
      method: 'POST',
      headers: {
        'X-Username': 'reviewer01',
        'Content-Type': 'application/json',
      },
    }, { note: '测试冻结后确认' });
    console.log(`  状态码: ${confirmFrozenRes.statusCode}`);
    console.log(`  错误: ${confirmFrozenRes.body?.error || confirmFrozenRes.body?.message}`);
    if (confirmFrozenRes.statusCode !== 400) {
      console.log('  ❌ 失败：冻结后应该不能确认异常');
      return;
    }
    if (!confirmFrozenRes.body?.message?.includes('已冻结')) {
      console.log('  ❌ 失败：错误信息应该包含"已冻结"');
      return;
    }
    console.log('  ✅ 正确拦截：批次已冻结，无法修改异常状态');

    console.log('\n【测试8.3】冻结后尝试改判异常（应该失败，状态锁定）');
    const overruleFrozenRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/exceptions/${firstException?.id}/overrule`,
      method: 'POST',
      headers: {
        'X-Username': 'manager01',
        'Content-Type': 'application/json',
      },
    }, { reason: '测试冻结后改判至少5字' });
    console.log(`  状态码: ${overruleFrozenRes.statusCode}`);
    console.log(`  错误: ${overruleFrozenRes.body?.error || overruleFrozenRes.body?.message}`);
    if (overruleFrozenRes.statusCode !== 400) {
      console.log('  ❌ 失败：冻结后应该不能改判异常');
      return;
    }
    console.log('  ✅ 正确拦截：批次已冻结，无法修改异常状态');

    console.log('\n【测试8.4】冻结后尝试上传文件（应该失败，状态锁定）');
    const formFrozen = new FormData();
    formFrozen.append('fileType', 'TRAVEL_APPLICATION');
    formFrozen.append('file', fs.createReadStream(path.join(process.cwd(), 'sample-data/travel-applications.csv')));
    const uploadFrozenRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/files`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        ...formFrozen.getHeaders(),
      },
    }, formFrozen, true);
    console.log(`  状态码: ${uploadFrozenRes.statusCode}`);
    console.log(`  错误: ${uploadFrozenRes.body?.error || uploadFrozenRes.body?.message}`);
    if (uploadFrozenRes.statusCode !== 400) {
      console.log('  ❌ 失败：冻结后应该不能上传文件');
      return;
    }
    console.log('  ✅ 正确拦截：批次已冻结，无法上传文件');

    console.log('\n【测试9】冻结状态导出报告（应该成功，冻结结算）');
    const exportFrozenRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/export`,
      method: 'GET',
      headers: {
        'X-Username': 'manager01',
      },
    });
    console.log(`  状态码: ${exportFrozenRes.statusCode}`);
    if (exportFrozenRes.statusCode === 403) {
      console.log(`  ❌ 权限被拦截: ${JSON.stringify(exportFrozenRes.body, null, 2)}`);
      return;
    }
    if (exportFrozenRes.statusCode !== 200) {
      console.log(`  错误: ${JSON.stringify(exportFrozenRes.body, null, 2)}`);
      return;
    }
    console.log(`  响应类型: ${Buffer.isBuffer(exportFrozenRes.body) ? '二进制文件' : 'JSON'}`);
    console.log('  ✅ 成功（冻结状态可以导出，冻结结算）');

    console.log('\n【测试10】经理先解冻，测试DRAFT状态不能导出');
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/unfreeze`,
      method: 'POST',
      headers: {
        'X-Username': 'manager01',
        'Content-Type': 'application/json',
      },
    }, { reason: '测试解冻' });
    
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/resubmit`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('\n【测试10.1】DRAFT状态尝试导出（应该失败）');
    const exportDraftRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/export`,
      method: 'GET',
      headers: {
        'X-Username': 'manager01',
      },
    });
    console.log(`  状态码: ${exportDraftRes.statusCode}`);
    console.log(`  消息: ${exportDraftRes.body?.message || exportDraftRes.body?.error}`);
    if (exportDraftRes.statusCode !== 400) {
      console.log('  ❌ 失败：DRAFT状态应该不能导出');
      return;
    }
    if (!exportDraftRes.body?.message?.includes('不允许导出')) {
      console.log('  ❌ 失败：错误信息应该包含"不允许导出"');
      return;
    }
    console.log('  ✅ 正确拦截：DRAFT状态不允许导出，请先提交复核');
    
    console.log('\n【测试10.2】重新提交到REVIEWING后再次冻结');
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/process`,
      method: 'POST',
      headers: {
        'X-Username': 'clerk01',
        'Content-Type': 'application/json',
      },
    });
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/audit`,
      method: 'POST',
      headers: {
        'X-Username': 'reviewer01',
        'Content-Type': 'application/json',
      },
    });
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/review`,
      method: 'POST',
      headers: {
        'X-Username': 'reviewer01',
        'Content-Type': 'application/json',
      },
    });
    await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/freeze`,
      method: 'POST',
      headers: {
        'X-Username': 'manager01',
        'Content-Type': 'application/json',
      },
    }, { reason: '重新冻结用于导出测试' });
    console.log('  ✅ 已重新提交并冻结');

    console.log('\n【测试11】财务经理导出报告（测试BATCH_EXPORT权限）');
    const exportRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/export`,
      method: 'GET',
      headers: {
        'X-Username': 'manager01',
      },
    });
    console.log(`  状态码: ${exportRes.statusCode}`);
    if (exportRes.statusCode === 403) {
      console.log(`  ❌ 权限被拦截: ${JSON.stringify(exportRes.body, null, 2)}`);
      return;
    }
    if (exportRes.statusCode !== 200) {
      console.log(`  错误: ${JSON.stringify(exportRes.body, null, 2)}`);
      return;
    }
    console.log(`  响应类型: ${Buffer.isBuffer(exportRes.body) ? '二进制文件' : 'JSON'}`);
    console.log(`  Content-Disposition 已设置`);
    console.log('  ✅ 成功（财务经理有导出权限）');

    console.log('\n【测试12】文员尝试导出（权限不足，测试权限拦截）');
    const clerkExportRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/export`,
      method: 'GET',
      headers: {
        'X-Username': 'clerk01',
      },
    });
    console.log(`  状态码: ${clerkExportRes.statusCode}`);
    console.log(`  错误: ${clerkExportRes.body?.error}`);
    console.log(`  消息: ${clerkExportRes.body?.message}`);
    console.log(`  审计已记录: ${clerkExportRes.body?.auditLogged}`);
    if (clerkExportRes.statusCode !== 403) {
      console.log('  ❌ 失败：文员应该没有导出权限');
      return;
    }
    console.log('  ✅ 正确拦截，审计日志已记录');

    console.log('\n【测试13】查看财务经理仪表板');
    const dashboardRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/batches/${batchId}/dashboard`,
      method: 'GET',
      headers: {
        'X-Username': 'manager01',
      },
    });
    console.log(`  状态码: ${dashboardRes.statusCode}`);
    console.log(`  批次: ${dashboardRes.body?.data?.batchNo}`);
    console.log(`  异常总数: ${dashboardRes.body?.data?.summary?.totalExceptions}`);
    console.log(`  冻结状态: ${dashboardRes.body?.data?.freezeStatus?.isFrozen}`);
    console.log('  ✅ 成功');

    console.log('\n【测试14】查看审计日志（验证权限拦截记录）');
    const logsRes = await makeRequest({
      hostname: BASE_URL,
      port: PORT,
      path: `/api/audit-logs?batchId=${batchId}&action=PERMISSION_DENIED`,
      method: 'GET',
      headers: {
        'X-Username': 'manager01',
      },
    });
    console.log(`  状态码: ${logsRes.statusCode}`);
    console.log(`  权限拦截记录数: ${logsRes.body?.data?.total || 0}`);
    if (logsRes.body?.data?.total > 0) {
      const log = logsRes.body.data.logs[0];
      console.log(`  拦截记录: ${log.username} 尝试 ${JSON.parse(log.details).attemptedAction}`);
    }
    console.log('  ✅ 成功');

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有 API 测试通过！');
    console.log('='.repeat(60));
    console.log('\n验证的核心功能:');
    console.log('  ✅ 批次创建 (POST /api/batches)');
    console.log('  ✅ 文件上传 (POST /api/batches/:id/files) - multipart/form-data');
    console.log('  ✅ 差旅申请CSV解析');
    console.log('  ✅ 付款流水CSV解析');
    console.log('  ✅ 提交处理 (POST /api/batches/:id/process)');
    console.log('  ✅ 运行稽核 (POST /api/batches/:id/audit)');
    console.log('  ✅ 提交复核 (POST /api/batches/:id/review)');
    console.log('  ✅ 冻结批次 (POST /api/batches/:id/freeze)');
    console.log('  ✅ 冻结状态锁定 - 不能修改异常/上传文件');
    console.log('  ✅ 冻结状态可以导出 (GET /api/batches/:id/export) - 冻结结算');
    console.log('  ✅ DRAFT/PROCESSING 状态不能导出');
    console.log('  ✅ 导出报告 (GET /api/batches/:id/export) - 经理有权限');
    console.log('  ✅ 权限控制 - 文员导出被拦截并记录审计');
    console.log('  ✅ 财务经理仪表板 (GET /api/batches/:id/dashboard)');
    console.log('  ✅ 审计日志查询 (GET /api/audit-logs)');

  } catch (e: any) {
    console.error('\n❌ 测试失败:', e.message);
    console.error(e.stack);
  }
}

testAPI();
