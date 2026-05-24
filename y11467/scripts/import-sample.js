const db = require('../src/db/database');
const retryQueueService = require('../src/services/retryQueueService');
const dirtyRecordService = require('../src/services/dirtyRecordService');
const moment = require('moment');

const SAMPLE_DATA = [
  {
    hotlineOrderId: 'HL20240501001',
    styleCode: 'ST001',
    styleName: '春季新款连衣裙',
    transferOrders: [
      {
        order_no: 'TR20240501001',
        style_code: 'ST001',
        style_name: '春季新款连衣裙',
        sample_type: '打版样',
        from_dept: '设计部',
        to_dept: '打版车间',
        transfer_date: moment().format('YYYY-MM-DD'),
        quantity: 2,
        receiver: '张三',
        sender: '李四',
        status: 'completed'
      }
    ],
    sizeOpinions: [
      {
        style_code: 'ST001',
        size: 'M',
        part: '胸围',
        before_value: '90',
        after_value: '92',
        modifier: '王工',
        modify_date: moment().format('YYYY-MM-DD'),
        reason: '客户要求放宽',
        round: 1,
        status: 'approved'
      },
      {
        style_code: 'ST001',
        size: 'M',
        part: '腰围',
        before_value: '74',
        after_value: '76',
        modifier: '王工',
        modify_date: moment().format('YYYY-MM-DD'),
        reason: '客户要求放宽',
        round: 1,
        status: 'approved'
      }
    ],
    fabricRecords: [
      {
        style_code: 'ST001',
        fabric_code: 'FAB001',
        fabric_name: '纯棉面料',
        color: '白色',
        in_out_type: 'in',
        quantity: 10,
        unit: '米',
        operation_date: moment().format('YYYY-MM-DD'),
        operator: '仓库管理员',
        warehouse: 'A仓',
        batch_no: 'B20240501',
        remarks: '首批入库'
      },
      {
        style_code: 'ST001',
        fabric_code: 'FAB001',
        fabric_name: '纯棉面料',
        color: '白色',
        in_out_type: 'out',
        quantity: 5,
        unit: '米',
        operation_date: moment().format('YYYY-MM-DD'),
        operator: '领料员',
        warehouse: 'A仓',
        batch_no: 'B20240501',
        linked_order_no: 'TR20240501001',
        remarks: '打版领用'
      }
    ],
    operator: 'demo-user'
  },
  {
    hotlineOrderId: 'HL20240501002',
    styleCode: 'ST002',
    styleName: '夏季休闲衬衫',
    transferOrders: [
      {
        order_no: 'TR20240501002',
        style_code: 'ST002',
        style_name: '夏季休闲衬衫',
        sample_type: '确认样',
        from_dept: '打版车间',
        to_dept: '质检部',
        transfer_date: moment().subtract(2, 'days').format('YYYY-MM-DD'),
        quantity: 3,
        receiver: '质检A',
        sender: '打版B'
      }
    ],
    sizeOpinions: [
      {
        style_code: 'ST002',
        size: 'L',
        part: '袖长',
        before_value: '60',
        after_value: '62',
        modifier: '李工',
        modify_date: moment().subtract(1, 'days').format('YYYY-MM-DD'),
        reason: '版型调整',
        round: 2
      }
    ],
    fabricRecords: [
      {
        style_code: 'ST002',
        fabric_code: 'FAB002',
        fabric_name: '涤纶混纺',
        color: '蓝色',
        in_out_type: 'in',
        quantity: 15,
        unit: '米',
        operation_date: moment().subtract(3, 'days').format('YYYY-MM-DD'),
        operator: '仓库管理员',
        warehouse: 'B仓'
      }
    ],
    operator: 'demo-user'
  },
  {
    hotlineOrderId: 'HL20240501003',
    styleCode: 'ST003',
    styleName: '秋季外套',
    transferOrders: [
      {
        order_no: 'TR20240501003',
        style_name: '秋季外套',
        sample_type: '试穿样',
        from_dept: '设计部',
        quantity: 1,
        sender: '赵六'
      }
    ],
    sizeOpinions: [
      {
        style_code: 'ST003',
        size: 'XL',
        after_value: '50',
        modifier: '陈工',
        round: 1
      }
    ],
    fabricRecords: [
      {
        style_code: 'ST003',
        fabric_code: 'FAB003',
        fabric_name: '羊毛混纺',
        color: '黑色',
        in_out_type: 'out',
        quantity: -5,
        unit: '米',
        operation_date: moment().format('YYYY-MM-DD')
      }
    ],
    operator: 'demo-user'
  }
];

async function importSampleData() {
  console.log('='.repeat(50));
  console.log('导入样例数据');
  console.log('='.repeat(50));

  try {
    await db.init();
    await db.createTables();
    console.log('✓ 数据库就绪');

    const queueIds = [];
    for (const data of SAMPLE_DATA) {
      console.log(`\n处理款号: ${data.styleCode}`);
      
      const queueId = await retryQueueService.submitReceipt(data);
      queueIds.push(queueId);
      console.log(`  ✓ 创建队列: ${queueId}`);

      if (data.transferOrders) {
        const dirty = await dirtyRecordService.detectAndCreateDirtyRecords(
          queueId, 'transfer', data.transferOrders
        );
        if (dirty.length > 0) {
          console.log(`  ! 检测到 ${dirty.length} 条流转单脏记录`);
        }
      }

      if (data.sizeOpinions) {
        const dirty = await dirtyRecordService.detectAndCreateDirtyRecords(
          queueId, 'size', data.sizeOpinions
        );
        if (dirty.length > 0) {
          console.log(`  ! 检测到 ${dirty.length} 条尺码意见脏记录`);
        }
      }

      if (data.fabricRecords) {
        const dirty = await dirtyRecordService.detectAndCreateDirtyRecords(
          queueId, 'fabric', data.fabricRecords
        );
        if (dirty.length > 0) {
          console.log(`  ! 检测到 ${dirty.length} 条面料记录脏记录`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('样例数据导入完成!');
    console.log(`共创建 ${queueIds.length} 个队列任务`);
    console.log('队列ID:', queueIds);
  } catch (error) {
    console.error('✗ 导入失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

importSampleData();
