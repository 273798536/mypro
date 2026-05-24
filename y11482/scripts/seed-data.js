const { v4: uuidv4 } = require('uuid');
const db = require('../src/config/database');

const BATCH_NO = 'BATCH20240115001';
const POT_NOS = ['POT001', 'POT002', 'POT003'];
const STORES = [
  { code: 'ST001', name: '北京朝阳门店' },
  { code: 'ST002', name: '上海浦东门店' },
  { code: 'ST003', name: '广州天河门店' },
  { code: 'ST004', name: '深圳南山门店' },
  { code: 'ST005', name: '杭州西湖门店' }
];
const PRODUCTS = [
  { name: '红烧肉', code: 'PRD001' },
  { name: '糖醋排骨', code: 'PRD002' },
  { name: '宫保鸡丁', code: 'PRD003' }
];

async function seedSampleLabels() {
  const items = [];
  for (const pot of POT_NOS) {
    for (const store of STORES) {
      for (const product of PRODUCTS) {
        items.push({
          id: uuidv4(),
          batch_no: BATCH_NO,
          product_name: product.name,
          product_code: product.code,
          pot_no: pot,
          produce_time: `2024-01-15 ${6 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
          produce_line: 'LINE-A',
          sampler: '张三',
          sample_time: `2024-01-15 10:00:00`,
          sample_location: '中央厨房留样间',
          store_code: store.code,
          store_name: store.name,
          quantity: 50 + Math.floor(Math.random() * 50),
          unit: '份',
          storage_location: `冷藏柜-${Math.ceil(Math.random() * 5)}`,
          retention_period: '48小时',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }
  await db('sample_labels').insert(items);
  console.log(`插入 ${items.length} 条留样标签数据`);
}

async function seedTemperatureRecords() {
  const items = [];
  const recordTypes = ['出锅温度', '中心温度', '运输温度', '门店接收温度'];
  
  for (const pot of POT_NOS) {
    for (const type of recordTypes) {
      items.push({
        id: uuidv4(),
        batch_no: BATCH_NO,
        pot_no: pot,
        record_type: type,
        temperature: type === '出锅温度' ? 95 + Math.random() * 5 :
                     type === '中心温度' ? 70 + Math.random() * 10 :
                     type === '运输温度' ? 4 + Math.random() * 2 :
                     5 + Math.random() * 3,
        temperature_unit: 'C',
        measure_time: `2024-01-15 ${8 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
        measure_point: type === '出锅温度' ? '炒锅出口' :
                      type === '中心温度' ? '产品中心' :
                      type === '运输温度' ? '冷藏车内部' : '门店收货区',
        measurer: '李四',
        equipment_code: `TEMP-${Math.floor(Math.random() * 10)}`,
        status: 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  const abnormalPot = POT_NOS[1];
  items.push({
    id: uuidv4(),
    batch_no: BATCH_NO,
    pot_no: abnormalPot,
    record_type: '门店接收温度',
    temperature: 15.5,
    temperature_unit: 'C',
    measure_time: '2024-01-15 14:30:00',
    measure_point: '门店收货区',
    measurer: '王五',
    equipment_code: 'TEMP-03',
    status: 'abnormal',
    remark: '温度异常，超过冷链要求',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await db('temperature_records').insert(items);
  console.log(`插入 ${items.length} 条温度记录数据`);
}

async function seedStoreComplaints() {
  const complaints = [
    {
      complaint_no: 'CP20240115001',
      store_code: 'ST002',
      store_name: '上海浦东门店',
      pot_no: 'POT002',
      product_name: '红烧肉',
      product_code: 'PRD001',
      complaint_time: '2024-01-15 18:30:00',
      complaint_type: '口味异常',
      complaint_level: 'high',
      complaint_content: '顾客反映红烧肉有异味，怀疑产品变质',
      complainant: '李女士',
      complainant_contact: '13800138001',
      handler: '客服小张',
      handle_time: '2024-01-15 19:00:00',
      handle_result: '已全额退款并补偿优惠券'
    },
    {
      complaint_no: 'CP20240115002',
      store_code: 'ST004',
      store_name: '深圳南山门店',
      pot_no: 'POT002',
      product_name: '糖醋排骨',
      product_code: 'PRD002',
      complaint_time: '2024-01-15 19:15:00',
      complaint_type: '份量不足',
      complaint_level: 'normal',
      complaint_content: '顾客反映份量比平时少',
      complainant: '王先生',
      complainant_contact: '13900139002',
      handler: '客服小李'
    },
    {
      complaint_no: 'CP20240115003',
      store_code: 'ST001',
      store_name: '北京朝阳门店',
      pot_no: 'POT001',
      product_name: '宫保鸡丁',
      product_code: 'PRD003',
      complaint_time: '2024-01-15 20:00:00',
      complaint_type: '其他',
      complaint_level: 'low',
      complaint_content: '包装有破损但不影响食用',
      complainant: '赵先生'
    }
  ];

  const items = complaints.map(c => ({
    id: uuidv4(),
    batch_no: BATCH_NO,
    ...c,
    status: c.handle_result ? 'resolved' : 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await db('store_complaints').insert(items);
  console.log(`插入 ${items.length} 条门店投诉数据`);
}

async function seedRefundRecords() {
  const refunds = [
    {
      refund_no: 'RF20240115001',
      store_code: 'ST002',
      store_name: '上海浦东门店',
      pot_no: 'POT002',
      product_name: '红烧肉',
      product_code: 'PRD001',
      refund_amount: 68.00,
      refund_quantity: 2,
      refund_reason: '产品质量问题',
      refund_time: '2024-01-15 19:30:00',
      refund_channel: '微信支付',
      related_complaint_no: 'CP20240115001'
    },
    {
      refund_no: 'RF20240115002',
      store_code: 'ST004',
      store_name: '深圳南山门店',
      pot_no: 'POT002',
      product_name: '糖醋排骨',
      product_code: 'PRD002',
      refund_amount: 25.00,
      refund_quantity: 1,
      refund_reason: '顾客投诉',
      refund_time: '2024-01-15 20:00:00',
      refund_channel: '支付宝',
      related_complaint_no: 'CP20240115002'
    }
  ];

  const items = refunds.map(r => ({
    id: uuidv4(),
    batch_no: BATCH_NO,
    ...r,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await db('refund_records').insert(items);
  console.log(`插入 ${items.length} 条退款记录数据`);
}

async function seedInventoryDifferences() {
  const diffs = [
    {
      diff_no: 'DIFF20240115001',
      store_code: 'ST003',
      store_name: '广州天河门店',
      pot_no: 'POT002',
      product_name: '红烧肉',
      product_code: 'PRD001',
      expected_quantity: 50,
      actual_quantity: 45,
      diff_quantity: -5,
      diff_amount: -170.00,
      diff_type: '盘亏',
      check_time: '2024-01-16 08:00:00',
      checker: '陈盘点'
    }
  ];

  const items = diffs.map(d => ({
    id: uuidv4(),
    batch_no: BATCH_NO,
    ...d,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await db('inventory_differences').insert(items);
  console.log(`插入 ${items.length} 条盘点差异数据`);
}

async function main() {
  console.log('开始插入样例数据...');
  console.log(`测试批次号: ${BATCH_NO}`);
  
  try {
    await seedSampleLabels();
    await seedTemperatureRecords();
    await seedStoreComplaints();
    await seedRefundRecords();
    await seedInventoryDifferences();
    
    console.log('样例数据插入完成!');
    console.log(`\n数据概览:`);
    console.log(`- 留样标签: 按批次 ${BATCH_NO}, 锅次: ${POT_NOS.join(', ')}`);
    console.log(`- 涉及门店: ${STORES.map(s => s.name).join(', ')}`);
    console.log(`- 异常锅次: POT002 (有温度异常、投诉、退款、盘点差异)`);
  } catch (error) {
    console.error('插入样例数据失败:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
