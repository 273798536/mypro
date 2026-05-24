const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/city_lighting.db');
const db = new sqlite3.Database(dbPath);

const badDataSamples = [
  {
    source_table: 'work_orders',
    source_data: {
      order_no: 'INVALID',
      road_section: '',
      light_count: -5,
      fault_type: 'unknown_type',
      description: '测试坏数据'
    },
    error_type: 'validation_failed',
    error_message: '工单号格式不正确;路段不能为空;灯具数量不能为负数;故障类型不在允许范围内'
  },
  {
    source_table: 'work_orders',
    source_data: {
      order_no: 'WO123',
      road_section: 'A',
      fault_type: 'bulb_broken',
      description: '格式不完整的工单'
    },
    error_type: 'validation_failed',
    error_message: '工单号格式不正确（需要WO开头加8位以上数字）;路段长度不能少于2个字符'
  },
  {
    source_table: 'inspection_photos',
    source_data: {
      work_order_id: 9999,
      photo_url: 'x',
      remark: '引用不存在工单的照片'
    },
    error_type: 'foreign_key_violation',
    error_message: '引用的工单不存在;照片URL长度不足5个字符'
  },
  {
    source_table: 'spare_parts',
    source_data: {
      work_order_id: 1,
      part_batch_no: 'BAD',
      part_name: '',
      quantity: 0
    },
    error_type: 'validation_failed',
    error_message: '批次号格式不正确;备件名称不能为空;数量不能小于1'
  },
  {
    source_table: 'external_receipts',
    source_data: {
      work_order_id: 9999,
      receipt_no: 'BAD123',
      content: '测试回执'
    },
    error_type: 'validation_failed',
    error_message: '引用的工单不存在;回执号格式不正确（需要RCPT开头加6位以上数字）'
  }
];

const insertBadData = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let completed = 0;
      let hasError = false;
      
      badDataSamples.forEach((badData, index) => {
        db.run(
          `INSERT INTO bad_data_records (source_table, source_data, error_type, error_message, reporter_user_id, is_resolved, created_at) 
           VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
          [
            badData.source_table,
            JSON.stringify(badData.source_data),
            badData.error_type,
            badData.error_message,
            2
          ],
          function(err) {
            if (err) {
              hasError = true;
              db.run('ROLLBACK');
              return reject(err);
            }
            completed++;
            if (completed === badDataSamples.length && !hasError) {
              db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          }
        );
      });
    });
  });
};

const run = async () => {
  try {
    console.log('开始插入坏数据...');
    await insertBadData();
    console.log(`成功插入 ${badDataSamples.length} 条坏数据记录!`);
    console.log('\n坏数据摘要:');
    badDataSamples.forEach((data, i) => {
      console.log(`  ${i + 1}. [${data.source_table}] ${data.error_type}`);
      console.log(`     ${data.error_message.substring(0, 50)}...`);
    });
    console.log('\n这些数据已被隔离到 bad_data_records 表中，');
    console.log('不会影响正常数据的汇总统计。');
    console.log('可以通过 /api/bad-data 接口查看详情。');
  } catch (err) {
    console.error('插入失败:', err.message);
  } finally {
    db.close();
  }
};

run();
