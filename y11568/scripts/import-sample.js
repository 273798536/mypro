const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/city_lighting.db');
const db = new sqlite3.Database(dbPath);

const sampleData = {
  work_orders: [
    {
      order_no: 'WO202405240001',
      road_section: '中山路1-100号',
      light_count: 15,
      fault_type: 'bulb_broken',
      status: 'pending',
      description: '路段多盏路灯不亮，需要更换灯泡',
      location: '中山路与人民路交叉口',
      entry_user_id: 1
    },
    {
      order_no: 'WO202405240002',
      road_section: '中山路101-200号',
      light_count: 8,
      fault_type: 'circuit_fault',
      status: 'pending',
      description: '线路故障导致整排路灯熄灭',
      location: '中山路中段',
      entry_user_id: 1
    },
    {
      order_no: 'WO202405240003',
      road_section: '人民路1-50号',
      light_count: 5,
      fault_type: 'control_issue',
      status: 'approved',
      description: '路灯控制系统异常，时亮时灭',
      location: '市政府门口',
      entry_user_id: 1,
      review_user_id: 2
    },
    {
      order_no: 'WO202405240004',
      road_section: '建设路1-80号',
      light_count: 20,
      fault_type: 'pole_damage',
      status: 'reviewing',
      description: '多根灯杆被车辆碰撞损坏',
      location: '建设路东段',
      entry_user_id: 1
    }
  ],
  inspection_photos: [
    { work_order_id: 1, photo_url: '/photos/wo1_1.jpg', photo_type: 'before', upload_user_id: 1, remark: '损坏的灯泡特写', is_abnormal: 0 },
    { work_order_id: 1, photo_url: '/photos/wo1_2.jpg', photo_type: 'after', upload_user_id: 1, remark: '更换完成后', is_abnormal: 0 },
    { work_order_id: 2, photo_url: '/photos/wo2_1.jpg', photo_type: 'before', upload_user_id: 1, remark: '配电箱烧毁痕迹', is_abnormal: 1 },
    { work_order_id: 3, photo_url: '/photos/wo3_1.jpg', photo_type: 'during', upload_user_id: 1, remark: '控制器检查中', is_abnormal: 0 },
    { work_order_id: 4, photo_url: '/photos/wo4_1.jpg', photo_type: 'before', upload_user_id: 1, remark: '变形的灯杆', is_abnormal: 1 }
  ],
  repair_hotlines: [
    { work_order_id: 1, caller_name: '李市民', caller_phone: '13800138001', call_time: '2024-05-20 19:30:00', fault_description: '晚上散步发现路灯不亮，容易摔跤', handler: '接线员小张' },
    { work_order_id: 1, caller_name: '王大爷', caller_phone: '13900139001', call_time: '2024-05-21 08:15:00', fault_description: '晨练时发现路灯还没修好', handler: '接线员小李' },
    { work_order_id: 2, caller_name: '刘女士', caller_phone: '13700137001', call_time: '2024-05-22 20:00:00', fault_description: '整条路都黑了，很不安全', handler: '接线员小张' },
    { work_order_id: 3, caller_name: '陈先生', caller_phone: '13600136001', call_time: '2024-05-23 21:30:00', fault_description: '路灯一闪一闪的，影响开车', handler: '接线员小王' }
  ],
  spare_parts: [
    { work_order_id: 1, part_batch_no: 'BATCH2024A001', part_name: 'LED灯泡', part_model: '50W-WW', quantity: 15, is_qualified: 1, use_user_id: 1 },
    { work_order_id: 2, part_batch_no: 'BATCH2024A002', part_name: '电缆线', part_model: 'RVV2*4', quantity: 100, is_qualified: 1, use_user_id: 1 },
    { work_order_id: 2, part_batch_no: 'BATCH2024A003', part_name: '配电箱', part_model: 'PZ30-12', quantity: 2, is_qualified: 0, use_user_id: 1 },
    { work_order_id: 3, part_batch_no: 'BATCH2024A004', part_name: '控制器', part_model: 'LC-100', quantity: 1, is_qualified: 1, use_user_id: 1 },
    { work_order_id: 4, part_batch_no: 'BATCH2024A005', part_name: '灯杆', part_model: 'DG-8M', quantity: 3, is_qualified: 1, use_user_id: 1 }
  ],
  external_receipts: [
    { work_order_id: 1, receipt_no: 'RCPT20240001', receipt_type: '验收单', content: '现场验收合格，灯泡全部点亮', submit_org: '市政工程监理公司', submit_time: '2024-05-22 14:00:00', has_exception: 0, exception_reason: null },
    { work_order_id: 2, receipt_no: 'RCPT20240002', receipt_type: '检测报告', content: '线路检测发现多处绝缘破损', submit_org: '电力检测中心', submit_time: '2024-05-23 10:30:00', has_exception: 1, exception_reason: '电缆老化严重，建议全部更换' },
    { work_order_id: 3, receipt_no: 'RCPT20240003', receipt_type: '验收单', content: '控制系统调试完成，运行正常', submit_org: '市政工程监理公司', submit_time: '2024-05-24 09:00:00', has_exception: 0, exception_reason: null }
  ]
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const importData = async () => {
  for (const order of sampleData.work_orders) {
    await runQuery(
      `INSERT INTO work_orders (order_no, road_section, light_count, fault_type, status, description, location, entry_user_id, review_user_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [order.order_no, order.road_section, order.light_count, order.fault_type, order.status, order.description, order.location, order.entry_user_id, order.review_user_id]
    );
  }
  
  for (const photo of sampleData.inspection_photos) {
    await runQuery(
      `INSERT INTO inspection_photos (work_order_id, photo_url, photo_type, upload_user_id, remark, is_abnormal, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [photo.work_order_id, photo.photo_url, photo.photo_type, photo.upload_user_id, photo.remark, photo.is_abnormal]
    );
  }
  
  for (const hotline of sampleData.repair_hotlines) {
    await runQuery(
      `INSERT INTO repair_hotlines (work_order_id, caller_name, caller_phone, call_time, fault_description, handler, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [hotline.work_order_id, hotline.caller_name, hotline.caller_phone, hotline.call_time, hotline.fault_description, hotline.handler]
    );
  }
  
  for (const part of sampleData.spare_parts) {
    await runQuery(
      `INSERT INTO spare_parts (work_order_id, part_batch_no, part_name, part_model, quantity, is_qualified, use_user_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [part.work_order_id, part.part_batch_no, part.part_name, part.part_model, part.quantity, part.is_qualified, part.use_user_id]
    );
  }
  
  for (const receipt of sampleData.external_receipts) {
    await runQuery(
      `INSERT INTO external_receipts (work_order_id, receipt_no, receipt_type, content, submit_org, submit_time, has_exception, exception_reason, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [receipt.work_order_id, receipt.receipt_no, receipt.receipt_type, receipt.content, receipt.submit_org, receipt.submit_time, receipt.has_exception, receipt.exception_reason]
    );
  }
};

const run = async () => {
  try {
    console.log('开始导入样例数据...');
    
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await importData();
    
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('样例数据导入完成!');
    console.log(`  工单: ${sampleData.work_orders.length} 条`);
    console.log(`  巡检照片: ${sampleData.inspection_photos.length} 条`);
    console.log(`  报修热线: ${sampleData.repair_hotlines.length} 条`);
    console.log(`  备件: ${sampleData.spare_parts.length} 条`);
    console.log(`  外部回执: ${sampleData.external_receipts.length} 条`);
  } catch (err) {
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    console.error('导入失败:', err.message);
  } finally {
    db.close();
  }
};

run();
