#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000/api/v1';
const OPERATOR_HEADERS = {
  'x-operator-id': 'test-user-001',
  'x-operator-name': 'TestUser',
  'x-operator-role': 'QualityManager',
  'Content-Type': 'application/json'
};

async function request(url, options = {}) {
  const fetch = await import('node-fetch');
  const response = await fetch.default(`${BASE_URL}${url}`, {
    ...options,
    headers: OPERATOR_HEADERS
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('=== 外协加工对账异常回执状态机 API 测试脚本 ===\n');

  try {
    console.log('1. 健康检查...');
    const fetch = await import('node-fetch');
    const healthRes = await fetch.default('http://localhost:3000/health', {
      method: 'GET',
      headers: OPERATOR_HEADERS
    });
    const healthData = await healthRes.json();
    console.log(`   状态: ${healthRes.status}`, healthData.message);

    console.log('\n2. 创建对账回执...');
    const createRes = await request('/receipts', {
      method: 'POST',
      body: JSON.stringify({
        batchNo: 'BATCH-TEST-001',
        semiProductCode: 'SP-TEST-001',
        semiProductName: '测试半成品',
        supplierId: 'SUPP-TEST',
        supplierName: '测试供应商',
        quantity: 100,
        abnormalAmount: 500,
        deductionAmount: 300,
        customerServiceNotes: '测试客服备注'
      })
    });
    console.log(`   状态: ${createRes.status}`, createRes.data);
    const receiptId = createRes.data.data?.id;
    console.log(`   创建的回执ID: ${receiptId}`);

    if (!receiptId) {
      console.error('创建回执失败，退出测试');
      return;
    }

    console.log('\n3. 提交回执...');
    const submitRes = await request(`/receipts/${receiptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ reason: '测试提交' })
    });
    console.log(`   状态: ${submitRes.status}`, submitRes.data.data?.status);

    console.log('\n4. 提交复核...');
    const reviewRes = await request(`/receipts/${receiptId}/review`, {
      method: 'POST',
      body: JSON.stringify({ reason: '请复核' })
    });
    console.log(`   状态: ${reviewRes.status}`, reviewRes.data.data?.status);

    console.log('\n5. 冻结回执（导出前冻结）...');
    const freezeRes = await request(`/receipts/${receiptId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ reason: '导出前冻结，防止数据变更' })
    });
    console.log(`   状态: ${freezeRes.status}`);
    console.log(`   冻结前状态: ${freezeRes.data.data?.statusBeforeFrozen}`);
    console.log(`   当前状态: ${freezeRes.data.data?.status}`);

    console.log('\n6. 解冻回执...');
    const unfreezeRes = await request(`/receipts/${receiptId}/unfreeze`, {
      method: 'POST',
      body: JSON.stringify({ reason: '导出完成，解冻' })
    });
    console.log(`   状态: ${unfreezeRes.status}`, unfreezeRes.data.data?.status);

    console.log('\n7. 人工改判...');
    const modifyRes = await request(`/receipts/${receiptId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        confirmedAmount: 200,
        deductionAmount: 200,
        manualReason: '经核实，部分扣款不合理，调整金额'
      })
    });
    console.log(`   状态: ${modifyRes.status}`);
    console.log(`   是否人工改判: ${modifyRes.data.data?.isManualModified}`);
    console.log(`   改判理由: ${modifyRes.data.data?.manualReason}`);

    console.log('\n8. 人工改判后提交复核...');
    const afterModifyReviewRes = await request(`/receipts/${modifyRes.data.data.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ reason: '改判后提交复核' })
    });
    console.log(`   状态: ${afterModifyReviewRes.status}`, afterModifyReviewRes.data.data?.status);

    console.log('\n9. 审核通过...');
    const approveRes = await request(`/receipts/${modifyRes.data.data.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reason: '审核通过' })
    });
    console.log(`   状态: ${approveRes.status}`, approveRes.data.data?.status);

    console.log('\n10. 撤回回执（从已通过状态撤回归档流程，先测试改判）...');
    console.log('   注意: 已通过状态不能直接撤回，需要先人工改判');
    const modifyAgainRes = await request(`/receipts/${modifyRes.data.data.id}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        confirmedAmount: 150,
        deductionAmount: 150,
        manualReason: '重新审核，需要补充材料先撤回'
      })
    });
    console.log(`   状态: ${modifyAgainRes.status}`, modifyAgainRes.data.data?.status);

    console.log('\n11. 撤回回执...');
    const withdrawRes = await request(`/receipts/${modifyRes.data.data.id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason: '需要补充材料' })
    });
    console.log(`   状态: ${withdrawRes.status}`, withdrawRes.data.data?.status);

    console.log('\n12. 撤回后重新提交...');
    const resubmitRes = await request(`/receipts/${receiptId}/resubmit`, {
      method: 'POST',
      body: JSON.stringify({ reason: '补充材料完成，重新提交' })
    });
    console.log(`   状态: ${resubmitRes.status}`, resubmitRes.data.data?.status);

    console.log('\n13. 获取回执详情（含状态流转记录）...');
    const detailRes = await request(`/receipts/${receiptId}`, { method: 'GET' });
    console.log(`   状态: ${detailRes.status}`);
    console.log(`   状态流转次数: ${detailRes.data.data?.transitions?.length} 次`);

    console.log('\n14. 获取统计数据...');
    const statsRes = await request('/dashboard/stats', { method: 'GET' });
    console.log(`   状态: ${statsRes.status}`);
    console.log(`   总异常金额: ${statsRes.data.data?.totalAmounts?.abnormal}`);
    console.log(`   人工改判数量: ${statsRes.data.data?.manualModificationCount}`);

    console.log('\n=== 测试完成！');

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

main();
