const db = require('./db');
const dayjs = require('dayjs');

function seed() {
  console.log('开始初始化测试数据...');

  const users = [
    { username: 'laohe', name: '老何', role: 'engineer' },
    { username: 'xiaowang', name: '小王', role: 'inspector' },
    { username: 'admin', name: '管理员', role: 'admin' }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, name, role) VALUES (?, ?, ?)
  `);

  users.forEach(u => insertUser.run(u.username, u.name, u.role));
  console.log('用户数据初始化完成');

  const locations = [
    {
      standard_name: '第一实验小学正门',
      latitude: 30.2741,
      longitude: 120.1551,
      district: '西湖区',
      school_name: '第一实验小学',
      aliases: ['实验一小门口', '一小正大门', '市实验一校正门']
    },
    {
      standard_name: '第二中学南门',
      latitude: 30.2856,
      longitude: 120.1678,
      district: '拱墅区',
      school_name: '第二中学',
      aliases: ['二中南门', '第二中学大门口', '市二中南校门']
    },
    {
      standard_name: '第三小学北门',
      latitude: 30.2678,
      longitude: 120.1423,
      district: '西湖区',
      school_name: '第三小学',
      aliases: ['三小北门', '第三小学后门', '文三街小学北门']
    }
  ];

  const insertLocation = db.prepare(`
    INSERT OR IGNORE INTO locations (standard_name, latitude, longitude, district, school_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO location_aliases (location_id, alias_name, source)
    VALUES (?, ?, ?)
  `);

  locations.forEach(loc => {
    const result = insertLocation.run(
      loc.standard_name, loc.latitude, loc.longitude, loc.district, loc.school_name
    );
    const locationId = result.lastInsertRowid || db.prepare(
      'SELECT id FROM locations WHERE standard_name = ?'
    ).get(loc.standard_name).id;
    
    loc.aliases.forEach(alias => {
      insertAlias.run(locationId, alias, '历史投诉数据');
    });
  });
  console.log('地点数据初始化完成');

  const insertRule = db.prepare(`
    INSERT OR IGNORE INTO calculation_rules (name, description, rules_json, version, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertRule.run(
    '学校接送拥堵判定标准 v2.1',
    '根据巡检照片和投诉内容判定是否属于接送时段交通拥堵',
    JSON.stringify({
      peakHours: ['07:00-08:30', '16:30-18:00'],
      congestionThreshold: 3,
      factors: ['illegalParking', 'vehicleQueue', 'pedestrianOverflow'],
      autoRejectKeywords: ['已处理', '非接送时段', '非学校区域']
    }),
    'v2.1',
    3
  );
  console.log('计算口径数据初始化完成');

  const complaints = [
    {
      complaint_no: 'CP-2026-001',
      original_location_text: '实验一小门口',
      location_id: 1,
      complaint_type: 'illegal_parking',
      description: '早高峰时段，大量接送车辆在学校门口乱停乱放，占用非机动车道',
      status: 'reviewing',
      is_duplicate: 0,
      calculation_rule_id: 1,
      reported_at: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
      reported_by: '市民张先生',
      hasDuplicate: false
    },
    {
      complaint_no: 'CP-2026-002',
      original_location_text: '二中南门',
      location_id: 2,
      complaint_type: 'traffic_congestion',
      description: '下午放学时间，学校门口车辆排队长达500米，建议增加临时停靠点',
      status: 'pending',
      is_duplicate: 0,
      calculation_rule_id: 1,
      reported_at: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      reported_by: '市民李女士',
      hasDuplicate: true
    },
    {
      complaint_no: 'CP-2026-003',
      original_location_text: '第二中学大门口',
      location_id: 2,
      complaint_type: 'traffic_congestion',
      description: '二中门口每天放学都堵车，没人管吗？',
      status: 'duplicate',
      is_duplicate: 1,
      duplicate_of: 2,
      calculation_rule_id: 1,
      reported_at: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      reported_by: '市民王先生',
      hasDuplicate: false
    },
    {
      complaint_no: 'CP-2026-004',
      original_location_text: '三小北门',
      location_id: 3,
      complaint_type: 'pedestrian_safety',
      description: '第三小学北门人行横道没有红绿灯，学生过马路很危险',
      status: 'resolved',
      is_duplicate: 0,
      calculation_rule_id: 1,
      reported_at: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
      reported_by: '学生家长',
      hasDuplicate: false
    },
    {
      complaint_no: 'CP-2026-005',
      original_location_text: '市实验一校正门',
      location_id: 1,
      complaint_type: 'illegal_parking',
      description: '实验一小门口的黄方格区域总是被占用',
      status: 'pending',
      is_duplicate: 0,
      calculation_rule_id: 1,
      reported_at: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      reported_by: '匿名市民',
      hasDuplicate: false
    }
  ];

  const insertComplaint = db.prepare(`
    INSERT OR IGNORE INTO complaints (
      complaint_no, original_location_text, location_id, complaint_type,
      description, status, is_duplicate, duplicate_of, calculation_rule_id,
      reported_at, reported_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  complaints.forEach(c => {
    insertComplaint.run(
      c.complaint_no, c.original_location_text, c.location_id, c.complaint_type,
      c.description, c.status, c.is_duplicate, c.duplicate_of, c.calculation_rule_id,
      c.reported_at, c.reported_by
    );
  });
  console.log('投诉数据初始化完成');

  const photos = [
    {
      complaint_id: 1,
      file_path: '/static/inspection-1.jpg',
      file_name: '实验一小门口_早高峰.jpg',
      file_type: 'image/jpeg',
      is_inspection: 1,
      is_supplement: 0,
      uploaded_by: 2,
      version: 1,
      parent_photo_id: null
    },
    {
      complaint_id: 1,
      file_path: '/static/inspection-1-v2.jpg',
      file_name: '实验一小门口_早高峰_标注版.jpg',
      file_type: 'image/jpeg',
      is_inspection: 1,
      is_supplement: 0,
      supplement_note: '标注了违停车辆位置',
      uploaded_by: 2,
      version: 2,
      parent_photo_id: 1
    },
    {
      complaint_id: 1,
      file_path: '/static/supplement-1.jpg',
      file_name: '实验一小门口_补充现场照.jpg',
      file_type: 'image/jpeg',
      is_inspection: 1,
      is_supplement: 1,
      supplement_note: '补拍了现场的禁停标志',
      uploaded_by: 2,
      version: 1,
      parent_photo_id: null
    },
    {
      complaint_id: 2,
      file_path: '/static/inspection-2.jpg',
      file_name: '二中南门_放学时段.jpg',
      file_type: 'image/jpeg',
      is_inspection: 1,
      is_supplement: 0,
      uploaded_by: 2,
      version: 1,
      parent_photo_id: null
    },
    {
      complaint_id: 2,
      file_path: '/static/inspection-2-older.jpg',
      file_name: '二中南门_上周同期对比.jpg',
      file_type: 'image/jpeg',
      is_inspection: 0,
      is_supplement: 0,
      supplement_note: '上周同一时段的历史截图',
      uploaded_by: 1,
      version: 1,
      parent_photo_id: null
    },
    {
      complaint_id: 4,
      file_path: '/static/inspection-4.jpg',
      file_name: '三小北门_人行横道.jpg',
      file_type: 'image/jpeg',
      is_inspection: 1,
      is_supplement: 0,
      uploaded_by: 2,
      version: 1,
      parent_photo_id: null
    }
  ];

  const insertPhoto = db.prepare(`
    INSERT OR IGNORE INTO photos (
      complaint_id, file_path, file_name, file_type, is_inspection,
      is_supplement, supplement_note, uploaded_by, version, parent_photo_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  photos.forEach(p => {
    insertPhoto.run(
      p.complaint_id, p.file_path, p.file_name, p.file_type, p.is_inspection,
      p.is_supplement, p.supplement_note, p.uploaded_by, p.version, p.parent_photo_id
    );
  });
  console.log('照片数据初始化完成');

  const notes = [
    {
      complaint_id: 1,
      photo_id: 1,
      content: '照片显示早7:30分，校门口有8辆违停车辆，占用非机动车道约20米',
      created_by: 2,
      version: 1,
      is_latest: 1
    },
    {
      complaint_id: 1,
      photo_id: 1,
      content: '照片显示早7:30分，校门口有8辆违停车辆，占用非机动车道约20米。经核实，其中3辆为接送学生车辆，已通知学校加强引导。',
      created_by: 1,
      version: 2,
      is_latest: 1
    },
    {
      complaint_id: 2,
      photo_id: 4,
      content: '下午16:45分，车辆排队约300米，持续时间约40分钟。建议协调学校实施错峰放学。',
      created_by: 2,
      version: 1,
      is_latest: 1
    }
  ];

  const insertNote = db.prepare(`
    INSERT OR IGNORE INTO notes (
      complaint_id, photo_id, content, created_by, version, is_latest
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  notes.forEach(n => {
    insertNote.run(
      n.complaint_id, n.photo_id, n.content, n.created_by, n.version, n.is_latest
    );
  });
  console.log('备注数据初始化完成');

  const versionHistory = [
    {
      complaint_id: 1,
      field_name: 'status',
      old_value: 'pending',
      new_value: 'reviewing',
      changed_by: 1,
      change_reason: '老何开始复核此投诉'
    },
    {
      complaint_id: 1,
      field_name: 'description',
      old_value: '早高峰时段，大量接送车辆在学校门口乱停乱放，占用非机动车道',
      new_value: '早高峰时段，大量接送车辆在学校门口乱停乱放，占用非机动车道。经核实，违停车辆8辆，涉及3名学生家长。',
      changed_by: 1,
      change_reason: '复核后补充详细情况'
    },
    {
      complaint_id: 3,
      field_name: 'status',
      old_value: 'pending',
      new_value: 'duplicate',
      changed_by: 1,
      change_reason: '判定为 CP-2026-002 的重复投诉'
    },
    {
      complaint_id: 3,
      field_name: 'is_duplicate',
      old_value: '0',
      new_value: '1',
      changed_by: 1,
      change_reason: '标记为重复投诉'
    },
    {
      complaint_id: 3,
      field_name: 'duplicate_of',
      old_value: null,
      new_value: '2',
      changed_by: 1,
      change_reason: '关联到主投诉 CP-2026-002'
    }
  ];

  const insertHistory = db.prepare(`
    INSERT OR IGNORE INTO version_history (
      complaint_id, field_name, old_value, new_value, changed_by, change_reason
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  versionHistory.forEach(h => {
    insertHistory.run(
      h.complaint_id, h.field_name, h.old_value, h.new_value, h.changed_by, h.change_reason
    );
  });
  console.log('版本历史数据初始化完成');

  const supplementRecords = [
    {
      complaint_id: 1,
      photo_id: 3,
      changes_json: JSON.stringify({
        field: 'photos',
        action: 'add_supplement',
        previousPhotoCount: 2,
        newPhotoCount: 3,
        supplementNote: '补拍了现场的禁停标志，确认该区域禁止临时停靠',
        mapPointUpdated: true,
        oldLatitude: 30.2741,
        newLatitude: 30.2742,
        oldLongitude: 120.1551,
        newLongitude: 120.1552
      }),
      supplemented_by: 2
    }
  ];

  const insertSupplement = db.prepare(`
    INSERT OR IGNORE INTO supplement_records (
      complaint_id, photo_id, changes_json, supplemented_by
    ) VALUES (?, ?, ?, ?)
  `);

  supplementRecords.forEach(s => {
    insertSupplement.run(
      s.complaint_id, s.photo_id, s.changes_json, s.supplemented_by
    );
  });
  console.log('补录记录数据初始化完成');

  const reviewRecords = [
    {
      complaint_id: 4,
      reviewed_by: 1,
      result: 'pass',
      comment: '已协调交警部门在人行横道增设临时红绿灯，学生上下学时段启用。现场核查整改到位。',
      calculation_snapshot: JSON.stringify({
        ruleVersion: 'v2.1',
        peakHourMatch: true,
        factorsMatched: ['pedestrianOverflow'],
        severityScore: 8,
        recommendation: 'install_traffic_light'
      })
    }
  ];

  const insertReview = db.prepare(`
    INSERT OR IGNORE INTO review_records (
      complaint_id, reviewed_by, result, comment, calculation_snapshot
    ) VALUES (?, ?, ?, ?, ?)
  `);

  reviewRecords.forEach(r => {
    insertReview.run(
      r.complaint_id, r.reviewed_by, r.result, r.comment, r.calculation_snapshot
    );
  });
  console.log('复核记录数据初始化完成');

  console.log('\n✅ 所有测试数据初始化完成！');
  console.log('\n测试账号：');
  console.log('  交通工程师：laohe / 老何');
  console.log('  巡检员：xiaowang / 小王');
  console.log('  管理员：admin / 管理员');
}

seed();
