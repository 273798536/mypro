#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000/api/v1';
const OPERATOR_HEADERS = {
  'x-operator-id': 'test-user-001',
  'x-operator-name': 'TestUser',
  'x-operator-role': 'QualityManager'
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

async function uploadFile(url, filePath, sourceType) {
  const fetch = await import('node-fetch');
  const fs = await import('fs');
  const FormData = (await import('formdata-node')).FormData;
  const { File } = await import('formdata-node');
  const { fileFromPath } = await import('formdata-node/file-from-path');

  const form = new FormData();
  const file = await fileFromPath(filePath);
  form.append('file', file);
  form.append('sourceType', sourceType);
  form.append('skipHeader', 'true');

  const response = await fetch.default(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: OPERATOR_HEADERS,
    body: form
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('=== 多数据源导入与人工改判验证测试 ===\n');

  try {
    console.log('1. 导入返修记录 (sample_repair_records.csv)...');
    const repairRes = await uploadFile('/import', 'examples/sample_repair_records.csv', 'repair_record');
    console.log(`   状态: ${repairRes.status}`);
    console.log(`   成功: ${repairRes.data.data?.successCount}, 失败: ${repairRes.data.data?.failedCount}`);
    if (repairRes.data.data?.errors?.length > 0) {
      console.log(`   错误详情:`);
      repairRes.data.data.errors.forEach(e => console.log(`     - ${e.fieldName}: ${e.errorCode}: ${e.originalValue}`));
    }

    console.log('\n2. 导入扣款明细 (sample_deduction_details.csv)...');
    const deductionRes = await uploadFile('/import', 'examples/sample_deduction_details.csv', 'deduction_detail');
    console.log(`   状态: ${deductionRes.status}`);
    console.log(`   成功: ${deductionRes.data.data?.successCount}, 失败: ${deductionRes.data.data?.failedCount}`);
    if (deductionRes.data.data?.errors?.length > 0) {
      console.log(`   错误详情:`);
      deductionRes.data.data.errors.forEach(e => console.log(`     - ${e.fieldName}: ${e.errorCode}: ${e.originalValue}`));
    }

    console.log('\n3. 获取所有回执列表，验证数据...');
    const listRes = await request('/receipts', { method: 'GET' });
    console.log(`   状态: ${listRes.status}`);
    console.log(`   总记录数: ${listRes.data.data?.length || 0}`);
    if (listRes.data.data?.length > 0) {
      console.log('\n   回执列表:');
      listRes.data.data.forEach(r => {
        console.log(`   - ${r.batchNo}: 数量=${r.quantity}, 异常=${r.abnormalAmount}, 扣款=${r.deductionAmount}, 状态=${r.status}`);
      });
    }

    console.log('\n4. 测试人工改判 - 修改扣款金额...');
    if (listRes.data.data?.length > 0) {
      const receipt = listRes.data.data[0];
      console.log(`   原扣款金额: ${receipt.deductionAmount}`);
      
      const modifyRes = await request(`/receipts/${receipt.id}/modify`, {
        method: 'POST',
        body: JSON.stringify({
          confirmedAmount: 200,
          deductionAmount: 200,
          manualReason: '测试修改扣款金额'
        }),
        headers: { ...OPERATOR_HEADERS, 'Content-Type': 'application/json' }
      });
      console.log(`   修改后扣款金额: ${modifyRes.data.data?.deductionAmount}`);
      console.log(`   是否人工改判: ${modifyRes.data.data?.isManualModified}`);
      console.log(`   改判理由: ${modifyRes.data.data?.manualReason}`);
      
      if (modifyRes.data.data?.deductionAmount === 200) {
        console.log('   ✅ 人工改判成功！');
      } else {
        console.log('   ❌ 人工改判失败，扣款金额未更新');
      }
    }

    console.log('\n5. 获取统计数据...');
    const statsRes = await request('/dashboard/stats', { method: 'GET' });
    console.log(`   总异常金额: ${statsRes.data.data?.totalAmounts?.abnormal}`);
    console.log(`   总扣款金额: ${statsRes.data.data?.totalAmounts?.deduction}`);
    console.log(`   人工改判数量: ${statsRes.data.data?.manualModificationCount}`);

    console.log('\n=== 验证完成！');

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

main();
