const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('==========================================');
  console.log('客服知识库发布权限追责台账 API - Demo');
  console.log('==========================================\n');

  try {
    console.log('【1】检查服务健康状态');
    const health = await request('GET', '/api/health');
    console.log('✓ 服务状态:', health.data.data.status);
    console.log();

    console.log('【2】创建变更单草稿');
    const headers = {
      'X-User-Id': 'user001',
      'X-User-Name': 'Zhang San',
      'X-User-Role': 'CONTENT_EDITOR',
      'X-Idempotent-Key': 'demo-draft-' + Date.now()
    };
    
    const draft = await request('POST', '/api/change-orders', {
      title: '关于退货政策的更新说明',
      type: 'UPDATE',
      knowledgeId: 'KB001',
      knowledgeTitle: '7天无理由退货政策',
      content: '为了提升用户体验，现将退货政策调整为30天无理由退货。',
      changeReason: '用户反馈退货期太短，影响购买决策',
      sensitiveFields: ['赔偿金额', '客户隐私']
    }, headers);
    
    const orderId = draft.data.data.id;
    console.log('✓ 创建成功 - 变更单ID:', orderId.substring(0, 8) + '...');
    console.log('  状态: DRAFT (草稿)');
    console.log();

    console.log('【3】提交变更单');
    const submitted = await request('POST', `/api/change-orders/${orderId}/submit`, {
      changeReason: '经过团队讨论，确认需要更新此政策'
    }, headers);
    console.log('✓ 提交成功 - 新状态:', submitted.data.data.status);
    console.log();

    console.log('【4】审核驳回');
    const reviewerHeaders = {
      'X-User-Id': 'user002',
      'X-User-Name': 'Li Si',
      'X-User-Role': 'REVIEWER'
    };
    
    const rejected = await request('POST', `/api/change-orders/${orderId}/reject`, {
      rejectReason: '30天退货期可能增加运营成本，请重新评估',
      riskLevel: 'MEDIUM'
    }, reviewerHeaders);
    console.log('✓ 驳回成功 - 新状态:', rejected.data.data.status);
    console.log('  驳回原因:', rejected.data.data.rejectReason);
    console.log();

    console.log('【5】修改后重新提交');
    await request('PUT', `/api/change-orders/${orderId}`, {
      content: '为了提升用户体验，现将退货政策调整为15天无理由退货。'
    }, headers);
    
    const resubmitted = await request('POST', `/api/change-orders/${orderId}/submit`, {
      changeReason: '调整为15天，平衡用户体验和运营成本'
    }, headers);
    console.log('✓ 重新提交成功 - 新状态:', resubmitted.data.data.status);
    console.log();

    console.log('【6】二次确认通过');
    const confirmed = await request('POST', `/api/change-orders/${orderId}/confirm`, {
      opinion: '调整合理，予以通过'
    }, reviewerHeaders);
    console.log('✓ 确认通过 - 新状态:', confirmed.data.data.status);
    console.log();

    console.log('【7】审计归档');
    const auditorHeaders = {
      'X-User-Id': 'user003',
      'X-User-Name': 'Wang Wu',
      'X-User-Role': 'AUDITOR'
    };
    
    const audited = await request('POST', `/api/change-orders/${orderId}/audit`, {
      opinion: '流程合规，归档保存'
    }, auditorHeaders);
    console.log('✓ 审计归档 - 新状态:', audited.data.data.status);
    console.log();

    console.log('【8】查看变更历史');
    const history = await request('GET', `/api/change-orders/${orderId}/history`);
    console.log('✓ 变更记录数:', history.data.data.length, '条');
    history.data.data.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.action} - ${log.operatorName}(${log.operatorRole}) - ${new Date(log.createdAt).toLocaleString()}`);
    });
    console.log();

    console.log('【9】批量导入客服引用记录');
    const batchImport = await request('POST', '/api/reference-records/batch', {
      batchId: 'BATCH-DEMO-001',
      batchStrategy: 'IGNORE',
      items: [
        {
          knowledgeId: 'KB001',
          knowledgeTitle: '7天无理由退货政策',
          agentId: 'agent001',
          agentName: '赵六',
          agentRole: 'CUSTOMER_SERVICE',
          customerPhone: '13800138000',
          isOfflineContent: true,
          referenceType: 'COPY',
          isErrorClaim: true,
          errorClaimAmount: 500.00,
          errorClaimReason: '引用了已下线的旧版本内容，导致错赔',
          relatedOrderNo: 'ORDER-2024-001'
        },
        {
          knowledgeId: 'KB002',
          knowledgeTitle: '运费险说明',
          agentId: 'agent002',
          agentName: '孙七',
          agentRole: 'CUSTOMER_SERVICE',
          customerPhone: '13900139000',
          isOfflineContent: false,
          referenceType: 'VIEW',
          isErrorClaim: false
        }
      ]
    }, { 'X-User-Id': 'system', 'X-User-Name': 'System Admin' });
    
    const taskId = batchImport.data.data.taskId;
    console.log('✓ 任务已创建 - Task ID:', taskId);
    console.log();

    await sleep(1000);
    
    console.log('【10】查看任务执行结果');
    const taskStatus = await request('GET', `/api/tasks/${taskId}`);
    const task = taskStatus.data.data;
    console.log('  任务状态:', task.status);
    console.log('  成功:', task.successCount, ' 失败:', task.failedCount, ' 跳过:', task.skippedCount);
    console.log();

    console.log('【11】生成运营报告');
    const report = await request('GET', '/api/export/report?desensitize=true');
    const summary = report.data.data.summary;
    console.log('✓ 报告摘要:');
    console.log('  变更单总数:', summary.totalChangeOrders);
    console.log('  状态分布:', JSON.stringify(summary.statusDistribution));
    console.log('  角色分布:', JSON.stringify(summary.roleDistribution));
    console.log('  引用记录数:', summary.totalReferences);
    console.log('  下线内容引用:', summary.offlineContentReferences, '次');
    console.log('  错赔次数:', summary.errorClaimCount, '次');
    console.log('  错赔总金额:', summary.totalErrorClaimAmount, '元');
    console.log();

    console.log('【12】查看错赔统计');
    const errorClaimStats = await request('GET', '/api/audit/error-claim-stats');
    console.log('✓ 错赔统计:', JSON.stringify(errorClaimStats.data.data, null, 2).replace(/\n/g, '\n  '));
    console.log();

    console.log('==========================================');
    console.log('✓ Demo 流程执行完成！');
    console.log('==========================================');
    console.log();
    console.log('验证失败清单:');
    console.log('  curl "' + BASE_URL + '/api/tasks?status=FAILED_PERMANENT"');
    console.log();
    console.log('查看修正结果:');
    console.log('  curl "' + BASE_URL + '/api/change-orders?status=AUDITED"');
    console.log();
    console.log('导出最终报告:');
    console.log('  curl "' + BASE_URL + '/api/export/report"');

  } catch (error) {
    console.error('✗ Demo执行失败:', error.message);
    console.error('请确保服务已启动: npm start');
  }
}

runDemo();
