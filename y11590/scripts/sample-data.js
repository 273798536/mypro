const request = require('supertest');
const app = require('../src/app');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const scenario1 = async () => {
  console.log('\n=== 场景1: 部分补回 ===\n');
  
  const createRes = await request(app)
    .post('/api/waves')
    .set('x-operator', 'planner01')
    .set('x-idempotent-key', 'scenario1-create')
    .send({
      waveNo: 'W20260525001',
      warehouseCode: 'WH001',
      zoneCode: 'ZONE-A',
      teamCode: 'TEAM-01',
      createdBy: 'planner01',
      items: [
        { skuCode: 'SKU001', skuName: '商品A', locationCode: 'A-01-01', planQty: 100 },
        { skuCode: 'SKU002', skuName: '商品B', locationCode: 'A-01-02', planQty: 50 }
      ]
    });
  
  console.log('1. 创建波次:', createRes.body.success ? '成功' : '失败');
  const waveId = createRes.body.data.id;
  const item1Id = createRes.body.data.items[0].id;
  const item2Id = createRes.body.data.items[1].id;

  await request(app)
    .post(`/api/waves/${waveId}/picking`)
    .set('x-operator', 'picker01')
    .send({
      waveItemId: item1Id,
      pickerCode: 'picker01',
      locationCode: 'A-01-01',
      skuCode: 'SKU001',
      planQty: 100,
      actualQty: 70,
      diffType: 'SHORTAGE'
    });

  await request(app)
    .post(`/api/waves/${waveId}/picking`)
    .set('x-operator', 'picker01')
    .send({
      waveItemId: item2Id,
      pickerCode: 'picker01',
      locationCode: 'A-01-02',
      skuCode: 'SKU002',
      planQty: 50,
      actualQty: 50,
      diffType: null
    });
  console.log('2. 记录拣货（SKU001缺30）: 成功');

  await request(app)
    .post(`/api/waves/${waveId}/shortage`)
    .set('x-operator', 'reviewer01')
    .set('x-idempotent-key', 'scenario1-shortage')
    .send({
      waveItemId: item1Id,
      shortageQty: 30,
      shortageReason: 'INVENTORY_SHORTAGE',
      reviewerCode: 'reviewer01',
      scanQty: 70
    });
  console.log('3. 标记缺货: 成功');

  const taskRes = await request(app)
    .post(`/api/waves/${waveId}/replenishment`)
    .set('x-operator', 'planner01')
    .set('x-idempotent-key', 'scenario1-replenish')
    .send({
      waveItemId: item1Id,
      fromLocation: 'B-01-01',
      toLocation: 'A-01-01',
      shortageQty: 30,
      skuCode: 'SKU001'
    });
  console.log('4. 创建回补任务: 成功');
  const taskId = taskRes.body.data.taskId;

  await request(app)
    .post(`/api/waves/replenishment/${taskId}/confirm`)
    .set('x-operator', 'replenisher01')
    .set('x-idempotent-key', 'scenario1-confirm')
    .send({
      replenishQty: 20,
      pickerCode: 'replenisher01',
      isPartial: true
    });
  console.log('5. 确认部分回补(20/30): 成功');

  await request(app)
    .post(`/api/waves/replenishment/${taskId}/confirm`)
    .set('x-operator', 'replenisher01')
    .set('x-idempotent-key', 'scenario1-confirm2')
    .send({
      replenishQty: 10,
      pickerCode: 'replenisher01'
    });
  console.log('6. 确认剩余回补(10/30): 成功');

  await request(app)
    .post(`/api/waves/${waveId}/performance/recalculate`)
    .set('x-operator', 'supervisor01')
    .set('x-idempotent-key', 'scenario1-perf')
    .send({});
  console.log('7. 重算绩效: 成功');

  const detailRes = await request(app).get(`/api/waves/${waveId}/full`);
  console.log('8. 波次状态:', detailRes.body.data.wave.status);
  console.log('   SKU001计划:', detailRes.body.data.items[0].plan_qty, 
              '拣货:', detailRes.body.data.items[0].picked_qty,
              '回补:', detailRes.body.data.items[0].replenished_qty);
  
  return waveId;
};

const scenario2 = async () => {
  console.log('\n=== 场景2: 补拣失败 ===\n');
  
  const createRes = await request(app)
    .post('/api/waves')
    .set('x-operator', 'planner01')
    .set('x-idempotent-key', 'scenario2-create')
    .send({
      waveNo: 'W20260525002',
      warehouseCode: 'WH001',
      zoneCode: 'ZONE-B',
      teamCode: 'TEAM-02',
      createdBy: 'planner01',
      items: [
        { skuCode: 'SKU003', skuName: '商品C', locationCode: 'B-02-01', planQty: 200 }
      ]
    });
  
  console.log('1. 创建波次:', createRes.body.success ? '成功' : '失败');
  const waveId = createRes.body.data.id;
  const itemId = createRes.body.data.items[0].id;

  await request(app)
    .post(`/api/waves/${waveId}/picking`)
    .set('x-operator', 'picker02')
    .send({
      waveItemId: itemId,
      pickerCode: 'picker02',
      locationCode: 'B-02-01',
      skuCode: 'SKU003',
      planQty: 200,
      actualQty: 150,
      diffType: 'SHORTAGE'
    });
  console.log('2. 记录拣货（缺50）: 成功');

  await request(app)
    .post(`/api/waves/${waveId}/shortage`)
    .set('x-operator', 'reviewer02')
    .set('x-idempotent-key', 'scenario2-shortage')
    .send({
      waveItemId: itemId,
      shortageQty: 50,
      shortageReason: 'SKU_DAMAGE',
      reviewerCode: 'reviewer02',
      scanQty: 150
    });
  console.log('3. 标记缺货: 成功');

  const taskRes = await request(app)
    .post(`/api/waves/${waveId}/replenishment`)
    .set('x-operator', 'planner01')
    .set('x-idempotent-key', 'scenario2-replenish')
    .send({
      waveItemId: itemId,
      fromLocation: 'B-02-02',
      toLocation: 'B-02-01',
      shortageQty: 50,
      skuCode: 'SKU003'
    });
  console.log('4. 创建回补任务: 成功');
  const taskId = taskRes.body.data.taskId;

  await request(app)
    .post(`/api/waves/replenishment/${taskId}/confirm`)
    .set('x-operator', 'replenisher02')
    .set('x-idempotent-key', 'scenario2-confirm')
    .send({
      replenishQty: 0,
      pickerCode: 'replenisher02'
    });
  console.log('5. 回补失败（补货位也无货）: 成功');

  const occupations = await request(app).get(`/api/waves/${waveId}/occupations`);
  console.log('6. 库位占用已释放:', occupations.body.data.every(o => o.status === 'RELEASED') ? '是' : '否');

  const perfRes = await request(app)
    .post(`/api/waves/${waveId}/performance/recalculate`)
    .set('x-operator', 'supervisor01')
    .set('x-idempotent-key', 'scenario2-perf')
    .send({});
  console.log('7. 重算绩效: 成功');
  console.log('   拣货绩效:', perfRes.body.data.summary.picking);
  console.log('   回补绩效:', perfRes.body.data.summary.replenishment);
  
  return waveId;
};

const scenario3 = async () => {
  console.log('\n=== 场景3: 主管改判 ===\n');
  
  const createRes = await request(app)
    .post('/api/waves')
    .set('x-operator', 'planner01')
    .set('x-idempotent-key', 'scenario3-create')
    .send({
      waveNo: 'W20260525003',
      warehouseCode: 'WH001',
      zoneCode: 'ZONE-C',
      teamCode: 'TEAM-03',
      createdBy: 'planner01',
      items: [
        { skuCode: 'SKU004', skuName: '商品D', locationCode: 'C-03-01', planQty: 80 }
      ]
    });
  
  console.log('1. 创建波次:', createRes.body.success ? '成功' : '失败');
  const waveId = createRes.body.data.id;
  const itemId = createRes.body.data.items[0].id;

  await request(app)
    .post(`/api/waves/${waveId}/picking`)
    .set('x-operator', 'picker03')
    .send({
      waveItemId: itemId,
      pickerCode: 'picker03',
      locationCode: 'C-03-01',
      skuCode: 'SKU004',
      planQty: 80,
      actualQty: 60,
      diffType: 'SHORTAGE'
    });
  console.log('2. 记录拣货（缺20，记为拣货员错误）: 成功');

  await request(app)
    .post(`/api/waves/${waveId}/shortage`)
    .set('x-operator', 'reviewer03')
    .set('x-idempotent-key', 'scenario3-shortage')
    .send({
      waveItemId: itemId,
      shortageQty: 20,
      shortageReason: 'PICKER_ERROR',
      reviewerCode: 'reviewer03',
      scanQty: 60
    });
  console.log('3. 标记缺货（原因：拣货员错误）: 成功');

  await request(app)
    .post(`/api/waves/${waveId}/performance/recalculate`)
    .set('x-operator', 'supervisor01')
    .set('x-idempotent-key', 'scenario3-perf1')
    .send({});
  console.log('4. 第一次计算绩效: 成功');

  const appealRes = await request(app)
    .post(`/api/waves/${waveId}/appeals`)
    .set('x-operator', 'picker03')
    .send({
      waveItemId: itemId,
      appealReason: '实际是库位库存不准，非拣货员错误，有监控为证',
      appellant: 'picker03'
    });
  console.log('5. 班组申诉: 成功');
  const appealId = appealRes.body.data.appealId;

  const itemsBefore = await request(app).get(`/api/waves/${waveId}`);
  const reasonBefore = itemsBefore.body.data.items[0].shortage_reason;
  console.log('6. 改判前缺货原因:', reasonBefore);

  await request(app)
    .patch(`/api/waves/appeals/${appealId}/review`)
    .set('x-operator', 'manager01')
    .send({
      reviewResult: 'APPROVED',
      reviewComment: '申诉成立，改为系统库存误差',
      correctShortage: true
    });
  console.log('7. 主管审核通过，改判缺货原因: 成功');

  const itemsAfter = await request(app).get(`/api/waves/${waveId}`);
  const reasonAfter = itemsAfter.body.data.items[0].shortage_reason;
  console.log('8. 改判后缺货原因:', reasonAfter);

  const historyRes = await request(app).get(`/api/waves/${waveId}/history`);
  console.log('9. 操作历史记录数:', historyRes.body.data.length);
  console.log('   最近操作:', historyRes.body.data[0].operation_type);

  return waveId;
};

const main = async () => {
  console.log('开始初始化样例数据...\n');

  try {
    const wave1Id = await scenario1();
    const wave2Id = await scenario2();
    const wave3Id = await scenario3();

    console.log('\n=== 生成差异报表 ===\n');
    const reportRes = await request(app).get('/api/waves/report/variance');
    console.log('报表总记录数:', reportRes.body.data.summary.totalRecords);
    console.log('总缺货数量:', reportRes.body.data.summary.totalShortageQty);
    console.log('总回补数量:', reportRes.body.data.summary.totalReplenishedQty);
    console.log('\n按班组统计:');
    Object.entries(reportRes.body.data.summary.byTeam).forEach(([team, data]) => {
      console.log(`  ${team}: 计划${data.planQty} 缺货${data.shortageQty} 回补${data.replenishedQty}`);
    });

    console.log('\n=== 样例数据初始化完成 ===');
    console.log('波次ID列表:');
    console.log('  部分补回场景:', wave1Id);
    console.log('  补拣失败场景:', wave2Id);
    console.log('  主管改判场景:', wave3Id);
    console.log('\n可通过以下接口查询详情:');
    console.log('  GET /api/waves/:waveId/full - 完整详情');
    console.log('  GET /api/waves/:waveId/history - 操作历史');
    console.log('  GET /api/waves/report/variance/export - 导出CSV');
    
    process.exit(0);
  } catch (err) {
    console.error('样例数据初始化失败:', err);
    process.exit(1);
  }
};

main();
