const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/city_lighting.db');
const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getUserIdByUsername = async (username) => {
  const row = await getQuery('SELECT id FROM users WHERE username = ?', [username]);
  return row ? row.id : null;
};

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

const insertBadData = async () => {
  const reporterUserId = await getUserIdByUsername('review_user');
  if (!reporterUserId) {
    throw new Error('用户 review_user 不存在，请先运行 init-db.js 初始化数据库');
  }
  console.log(`\n上报用户: review_user -> id=${reporterUserId}`);

  console.log('\n检查并插入坏数据...');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const badData of badDataSamples) {
    const sourceDataJson = JSON.stringify(badData.source_data);
    
    const existing = await getQuery(
      'SELECT id FROM bad_data_records WHERE source_table = ? AND source_data = ? AND error_message = ? AND is_resolved = 0',
      [badData.source_table, sourceDataJson, badData.error_message]
    );

    if (existing) {
      skippedCount++;
      console.log(`  跳过已存在: [${badData.source_table}] ${badData.error_type}`);
      continue;
    }

    await runQuery(
      `INSERT INTO bad_data_records (source_table, source_data, error_type, error_message, reporter_user_id, is_resolved, created_at) 
       VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [
        badData.source_table,
        sourceDataJson,
        badData.error_type,
        badData.error_message,
        reporterUserId
      ]
    );
    insertedCount++;
    console.log(`  插入: [${badData.source_table}] ${badData.error_type}`);
  }

  return { insertedCount, skippedCount, reporterUserId };
};

const run = async () => {
  try {
    console.log('开始插入坏数据...');
    
    await runQuery('BEGIN TRANSACTION');
    
    const stats = await insertBadData();
    
    await runQuery('COMMIT');
    
    console.log('\n========================================');
    console.log('坏数据插入完成!');
    console.log('========================================');
    console.log(`  新增: ${stats.insertedCount} 条`);
    console.log(`  跳过: ${stats.skippedCount} 条`);
    console.log(`  上报人ID: ${stats.reporterUserId} (review_user)`);
    console.log('========================================');
    console.log('\n坏数据摘要:');
    badDataSamples.forEach((data, i) => {
      console.log(`  ${i + 1}. [${data.source_table}] ${data.error_type}`);
      console.log(`     ${data.error_message.substring(0, 50)}...`);
    });
    console.log('\n这些数据已被隔离到 bad_data_records 表中，');
    console.log('不会影响正常数据的汇总统计。');
    console.log('可以通过 /api/bad-data 接口查看详情。');
  } catch (err) {
    await runQuery('ROLLBACK').catch(() => {});
    console.error('插入失败:', err.message);
  } finally {
    db.close();
  }
};

run();
