const { db, generateNo } = require('../src/models/db');
const dirtyRecordService = require('../src/services/dirtyRecordService');

const SHARED_TRIP_GROUP = 'GROUP_SHANGHAI_202405';

const applicants = [
  { id: 'EMP001', name: '张三', department: '技术部' },
  { id: 'EMP002', name: '李四', department: '技术部' },
  { id: 'EMP003', name: '王五', department: '产品部' }
];

async function seedData() {
  console.log('开始生成测试数据...\n');

  console.log('1. 生成差旅申请 (3人共用同一行程)...');
  for (const applicant of applicants) {
    const taNo = generateNo('TA');
    await db.insert('travel_applications', {
      application_no: taNo,
      applicant_id: applicant.id,
      applicant_name: applicant.name,
      department: applicant.department,
      travel_start_date: '2024-05-15',
      travel_end_date: '2024-05-17',
      travel_destination: '上海',
      travel_purpose: '项目交付',
      estimated_accommodation_amount: 1200,
      estimated_transportation_amount: 1500,
      estimated_total_amount: 2700,
      status: 'approved',
      shared_trip_group_id: SHARED_TRIP_GROUP,
      raw_data: JSON.stringify({ seed: true })
    });
    console.log(`   ✅ 差旅申请: ${taNo} - ${applicant.name}`);
  }

  console.log('\n2. 生成住宿发票 (3人同一酒店同一时段 - 重复报销场景)...');
  const hotelInvoices = [];
  for (let i = 0; i < applicants.length; i++) {
    const applicant = applicants[i];
    const invNo = generateNo('INV');
    hotelInvoices.push(invNo);
    await db.insert('invoices', {
      invoice_no: invNo,
      invoice_code: '031002400111',
      invoice_date: '2024-05-17',
      seller_name: '上海希尔顿酒店有限公司',
      expense_category: 'accommodation',
      expense_item: '住宿费',
      total_amount: 1200,
      tax_amount: 72,
      total_with_tax: 1272,
      applicant_id: applicant.id,
      applicant_name: applicant.name,
      check_in_date: '2024-05-15',
      check_out_date: '2024-05-17',
      hotel_name: '上海希尔顿酒店',
      room_count: 1,
      raw_data: JSON.stringify({ seed: true, duplicate_scenario: 'hotel' })
    });
    console.log(`   ✅ 住宿发票: ${invNo} - ${applicant.name} - ¥1200 (重复风险)`);
  }

  console.log('\n3. 生成交通发票 (3人同一车次 - 重复报销场景)...');
  const trainInvoices = [];
  for (let i = 0; i < applicants.length; i++) {
    const applicant = applicants[i];
    const invNo = generateNo('INV');
    trainInvoices.push(invNo);
    await db.insert('invoices', {
      invoice_no: invNo,
      invoice_code: '031002400222',
      invoice_date: '2024-05-15',
      seller_name: '中国铁路北京局集团有限公司',
      expense_category: 'transportation',
      expense_item: '高铁票',
      total_amount: 553,
      applicant_id: applicant.id,
      applicant_name: applicant.name,
      flight_no: 'G101',
      departure: '北京南',
      arrival: '上海虹桥',
      departure_time: '2024-05-15 08:00:00',
      arrival_time: '2024-05-15 13:30:00',
      passenger_name: applicant.name,
      raw_data: JSON.stringify({ seed: true, duplicate_scenario: 'train' })
    });
    console.log(`   ✅ 交通发票: ${invNo} - ${applicant.name} - ¥553 (重复风险)`);
  }

  console.log('\n4. 生成正常发票 (餐饮 - 无重复)...');
  const normalInv = generateNo('INV');
  await db.insert('invoices', {
    invoice_no: normalInv,
    invoice_code: '031002400333',
    invoice_date: '2024-05-16',
    seller_name: '上海餐饮服务有限公司',
    expense_category: 'meal',
    expense_item: '餐饮费',
    total_amount: 350,
    applicant_id: 'EMP001',
    applicant_name: '张三',
    raw_data: JSON.stringify({ seed: true, normal: true })
  });
  console.log(`   ✅ 正常发票: ${normalInv} - 餐饮费 - ¥350`);

  console.log('\n5. 生成脏记录测试数据...');
  
  console.log('   5a. 缺失字段 (缺 applicant_name)...');
  const missingFieldInv = generateNo('INV');
  await db.insert('invoices', {
    invoice_no: missingFieldInv,
    invoice_date: '2024-05-18',
    expense_category: 'transportation',
    total_amount: 200,
    applicant_id: '',
    applicant_name: '',
    raw_data: JSON.stringify({ seed: true, dirty: 'missing_field' })
  });
  console.log(`   ✅ 缺字段发票: ${missingFieldInv}`);

  console.log('   5b. 跨日逻辑错误 (入住日期晚于退房日期)...');
  const crossDateInv = generateNo('INV');
  await db.insert('invoices', {
    invoice_no: crossDateInv,
    invoice_date: '2024-05-25',
    seller_name: '北京王府半岛酒店',
    expense_category: 'accommodation',
    total_amount: 1500,
    applicant_id: 'EMP001',
    applicant_name: '张三',
    check_in_date: '2024-05-26',
    check_out_date: '2024-05-24',
    hotel_name: '北京王府半岛酒店',
    raw_data: JSON.stringify({ seed: true, dirty: 'cross_date' })
  });
  console.log(`   ✅ 跨日发票: ${crossDateInv}`);

  console.log('   5c. 数量冲突 (room_count 与实际不符)...');
  const quantityInv = generateNo('INV');
  await db.insert('invoices', {
    invoice_no: quantityInv,
    invoice_date: '2024-05-20',
    seller_name: '上海国际会议中心酒店',
    expense_category: 'accommodation',
    total_amount: 2400,
    applicant_id: 'EMP002',
    applicant_name: '李四',
    check_in_date: '2024-05-18',
    check_out_date: '2024-05-20',
    hotel_name: '上海国际会议中心酒店',
    room_count: 2,
    raw_data: JSON.stringify({ seed: true, dirty: 'quantity_conflict', expected_rooms: 1 })
  });
  console.log(`   ✅ 数量冲突发票: ${quantityInv} (room_count=2, 期望1)`);

  console.log('\n6. 生成付款流水...');
  const paymentData = [
    { amount: 1200, invoiceIndex: 0, applicantIndex: 0 },
    { amount: 1200, invoiceIndex: 1, applicantIndex: 1 },
    { amount: 553, invoiceIndex: 3, applicantIndex: 0 },
    { amount: 350, invoiceIndex: 6, applicantIndex: 0 }
  ];
  for (const p of paymentData) {
    const payNo = generateNo('PAY');
    await db.insert('payment_flows', {
      payment_no: payNo,
      payment_date: '2024-05-20',
      payer_account: '622202****1234',
      payer_name: '公司对公账户',
      payee_name: applicants[p.applicantIndex].name,
      amount: p.amount,
      purpose: '差旅费报销',
      applicant_id: applicants[p.applicantIndex].id,
      applicant_name: applicants[p.applicantIndex].name,
      raw_data: JSON.stringify({ seed: true })
    });
    console.log(`   ✅ 付款流水: ${payNo} - ¥${p.amount}`);
  }

  console.log('\n7. 生成退款流水...');
  const refundNo = generateNo('REF');
  await db.insert('refund_flows', {
    refund_no: refundNo,
    refund_date: '2024-05-21',
    refund_from_name: '上海希尔顿酒店',
    refund_to_name: '公司对公账户',
    amount: 800,
    refund_reason: '房价调整退款',
    applicant_id: 'EMP001',
    applicant_name: '张三',
    raw_data: JSON.stringify({ seed: true })
  });
  console.log(`   ✅ 退款流水: ${refundNo} - ¥800`);

  console.log('\n8. 生成盘点差异...');
  const diffNo = generateNo('DIFF');
  await db.insert('inventory_diffs', {
    diff_no: diffNo,
    diff_date: '2024-05-22',
    diff_type: 'amount_mismatch',
    diff_amount: 153,
    description: '发票金额与付款金额差异',
    reporter: '财务系统',
    status: 'pending',
    raw_data: JSON.stringify({ seed: true })
  });
  console.log(`   ✅ 盘点差异: ${diffNo} - ¥153`);

  console.log('\n9. 主动触发脏记录检查 (对已有数据)...');
  const dirtyResults = await dirtyRecordService.checkAllExistingData();
  console.log(`   ✅ 脏记录检查完成，发现 ${dirtyResults.length} 条脏记录`);

  console.log('\n10. 对数量冲突发票单独标记...');
  const quantityInvoice = await db.findByNo('invoices', 'invoice_no', quantityInv);
  if (quantityInvoice) {
    await dirtyRecordService.checkQuantityConflict(
      'invoices', quantityInvoice, 'room_count', 1, quantityInvoice.id, quantityInvoice.invoice_no
    );
    console.log(`   ✅ 数量冲突已标记`);
  }

  console.log('\n11. 对缺失字段差旅申请单独检查...');
  const missingFieldInvoice = await db.findByNo('invoices', 'invoice_no', missingFieldInv);
  if (missingFieldInvoice) {
    await dirtyRecordService.checkMissingFields(
      'invoices', missingFieldInvoice, ['applicant_name', 'applicant_id'], 
      missingFieldInvoice.id, missingFieldInvoice.invoice_no
    );
    console.log(`   ✅ 缺失字段已标记`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' 测试数据生成完成！');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(` 共用行程组ID: ${SHARED_TRIP_GROUP}`);
  console.log('\n 包含脏记录场景:');
  console.log('   ✅ duplicate_record - 3人共用同一行程 (住宿+交通重复报销)');
  console.log('   ✅ missing_field - 缺少必填字段 (applicant_name)');
  console.log('   ✅ cross_date - 跨日逻辑错误 (入住日期 > 退房日期)');
  console.log('   ✅ quantity_conflict - 数量冲突 (room_count=2, 期望1)');
  console.log('   ✅ amount_conflict - 对账时自动检测 (发票-付款金额不匹配)');
  console.log('\n 运行以下命令进行完整验证:');
  console.log('   npm start        # 启动服务');
  console.log('   然后执行 curl 命令测试各接口');
  console.log('═══════════════════════════════════════════════════════════\n');

  db.close();
}

seedData().catch(console.error);
