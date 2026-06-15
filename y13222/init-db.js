const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'drum-beat.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS beat_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    piece_name TEXT NOT NULL,
    piece_alias TEXT,
    beat_pattern TEXT NOT NULL,
    difficulty TEXT DEFAULT '中级',
    status TEXT DEFAULT '待判定',
    contract_ref TEXT,
    contract_line_no INTEGER,
    source_version TEXT,
    is_duplicate_alias INTEGER DEFAULT 0,
    is_name_mismatch INTEGER DEFAULT 0,
    is_old_version INTEGER DEFAULT 0,
    new_version_id INTEGER,
    judge_result TEXT,
    judge_remark TEXT,
    judge_by TEXT,
    judge_at TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS judge_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beat_item_id INTEGER NOT NULL,
    before_result TEXT,
    after_result TEXT,
    before_remark TEXT,
    after_remark TEXT,
    changed_by TEXT,
    change_reason TEXT,
    changed_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (beat_item_id) REFERENCES beat_items(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beat_item_id INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (beat_item_id) REFERENCES beat_items(id)
  );

  CREATE TABLE IF NOT EXISTS version_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beat_item_id INTEGER NOT NULL,
    old_version_no TEXT,
    new_version_no TEXT,
    old_source TEXT,
    new_source TEXT,
    diff_fields TEXT,
    suggestion TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_by TEXT,
    resolved_at TEXT,
    FOREIGN KEY (beat_item_id) REFERENCES beat_items(id)
  );

  CREATE TABLE IF NOT EXISTS bad_data_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beat_item_id INTEGER NOT NULL,
    error_type TEXT NOT NULL,
    original_line TEXT,
    original_object TEXT,
    description TEXT,
    contract_page INTEGER,
    contract_line INTEGER,
    reported_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (beat_item_id) REFERENCES beat_items(id)
  );
`);

console.log('数据库表创建完成');

const insertBeat = db.prepare(`
  INSERT OR IGNORE INTO beat_items 
  (item_no, student_name, teacher_name, piece_name, piece_alias, beat_pattern, difficulty, 
   status, contract_ref, contract_line_no, source_version, 
   is_duplicate_alias, is_name_mismatch, is_old_version, new_version_id,
   judge_result, judge_remark, judge_by, judge_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertHistory = db.prepare(`
  INSERT INTO judge_history 
  (beat_item_id, before_result, after_result, before_remark, after_remark, changed_by, change_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertAttachment = db.prepare(`
  INSERT INTO attachments 
  (beat_item_id, file_type, file_name, file_path, description, uploaded_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertVersionConflict = db.prepare(`
  INSERT INTO version_conflicts
  (beat_item_id, old_version_no, new_version_no, old_source, new_source, diff_fields, suggestion)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertBadData = db.prepare(`
  INSERT INTO bad_data_records
  (beat_item_id, error_type, original_line, original_object, description, contract_page, contract_line)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const seedData = [
  {
    item_no: 'DRUM-2024-001',
    student_name: '林小明',
    teacher_name: '陈老师',
    piece_name: '小星星变奏曲',
    piece_alias: '小星星',
    beat_pattern: '动次打次-八分音符',
    difficulty: '初级',
    status: '已判定',
    contract_ref: 'HT-2024-S001',
    contract_line_no: 12,
    source_version: 'v2.1',
    is_duplicate_alias: 0,
    is_name_mismatch: 0,
    is_old_version: 0,
    new_version_id: null,
    judge_result: '通过',
    judge_remark: '节拍稳定，重音位置准确，学生进步明显，手腕放松度较上月提升30%。',
    judge_by: '陈老师',
    judge_at: '2024-06-10 14:30:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_林小明.pdf', path: '/uploads/contract_001.pdf', desc: '第3页第12行：鼓组课程第1期', by: '小温' },
      { type: 'screenshot', name: '节拍器截图_0610.png', path: '/uploads/screenshot_001.png', desc: '节拍器读数截图，平均误差<5ms', by: '小温' }
    ]
  },
  {
    item_no: 'DRUM-2024-002',
    student_name: '王小华',
    teacher_name: '赵老师',
    piece_name: '摇滚风暴',
    piece_alias: '摇滚风暴',
    beat_pattern: '四连音重音移位',
    difficulty: '高级',
    status: '待复核',
    contract_ref: 'HT-2024-S002',
    contract_line_no: 8,
    source_version: 'v1.5',
    is_duplicate_alias: 1,
    is_name_mismatch: 0,
    is_old_version: 0,
    new_version_id: null,
    judge_result: '存疑',
    judge_remark: '曲名与别名完全一致，疑似重复录入。合同扫描件第2页第8行显示曲名为"摇滚风暴"，系统中已有同曲名记录。',
    judge_by: '小温（初审）',
    judge_at: '2024-06-12 09:15:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_王小华.pdf', path: '/uploads/contract_002.pdf', desc: '第2页第8行：摇滚风暴-四连音', by: '小温' },
      { type: 'screenshot', name: '重复记录对比截图.png', path: '/uploads/screenshot_002.png', desc: '两条记录曲名别名均为"摇滚风暴"', by: '小温' }
    ],
    badData: [
      { type: 'duplicate_alias', originalLine: '摇滚风暴 | 摇滚风暴 | 四连音重音移位', originalObject: '{"piece_name":"摇滚风暴","piece_alias":"摇滚风暴"}', desc: '曲名与别名重复，疑似数据录入错误', page: 2, line: 8 }
    ]
  },
  {
    item_no: 'DRUM-2024-003',
    student_name: '张小雨',
    teacher_name: '李老师',
    piece_name: 'Funk Groove No.3',
    piece_alias: '放克律动三号',
    beat_pattern: '十六分音符切分',
    difficulty: '中级',
    status: '已改判',
    contract_ref: 'HT-2024-S003',
    contract_line_no: 15,
    source_version: 'v2.0',
    is_duplicate_alias: 0,
    is_name_mismatch: 1,
    is_old_version: 0,
    new_version_id: null,
    judge_result: '通过（名称不一致备注）',
    judge_remark: '合同扫描件显示学生名为"张小雨"，但报名系统中为"张晓雨"，经核实为同一人，身份证号一致。节拍表现合格，十六分音符清晰度达标。',
    judge_by: '李老师（改判）',
    judge_at: '2024-06-11 16:45:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_张小雨.pdf', path: '/uploads/contract_003.pdf', desc: '第4页第15行：姓名"张小雨"，与系统"张晓雨"不一致', by: '小温' },
      { type: 'screenshot', name: '身份证核对截图.png', path: '/uploads/screenshot_003.png', desc: '身份证号尾号3721一致，确认系同一人', by: '小温' },
      { type: 'supplement', name: '后补说明_姓名差异.docx', path: '/uploads/supplement_003.docx', desc: '家长后补说明：曾用名张晓雨，现名张小雨', by: '小温' }
    ],
    history: [
      { before: '驳回', after: '通过（名称不一致备注）', beforeRemark: '姓名不一致，需核实', afterRemark: '合同扫描件显示学生名为"张小雨"...', by: '李老师', reason: '经核实为同一人，身份证号一致' }
    ],
    badData: [
      { type: 'name_mismatch', originalLine: '张小雨 | 放克律动三号 | 十六分音符切分', originalObject: '{"student_name":"张小雨","system_name":"张晓雨"}', desc: '学生姓名与系统记录不一致', page: 4, line: 15 }
    ]
  },
  {
    item_no: 'DRUM-2024-004',
    student_name: '刘小峰',
    teacher_name: '王老师',
    piece_name: '基础练习曲第八首',
    piece_alias: '基础八',
    beat_pattern: '单跳复合跳',
    difficulty: '初级',
    status: '版本冲突待处理',
    contract_ref: 'HT-2024-S004',
    contract_line_no: 5,
    source_version: 'v1.2（旧版）',
    is_duplicate_alias: 0,
    is_name_mismatch: 0,
    is_old_version: 1,
    new_version_id: 5,
    judge_result: null,
    judge_remark: '扫描到旧版文件（v1.2），系统中已有新版记录（v2.3），请确认版本来源后再处理。',
    judge_by: '系统',
    judge_at: '2024-06-13 11:20:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_刘小峰_旧版.pdf', path: '/uploads/contract_004_old.pdf', desc: '第1页第5行：v1.2版本，日期2024-03-15', by: '小温' },
      { type: 'screenshot', name: '版本对比截图.png', path: '/uploads/screenshot_004.png', desc: '左侧旧版v1.2，右侧新版v2.3，速度标记不同', by: '系统' }
    ],
    versionConflict: {
      oldVer: 'v1.2', newVer: 'v2.3',
      oldSource: '合同扫描件（纸质归档）',
      newSource: '老师最新提交（电子档）',
      diffFields: '速度标记、难度等级、备注栏',
      suggestion: '建议以新版v2.3为准，旧版仅供历史参考。如确认旧版有效，请标记为历史版本并存档。'
    }
  },
  {
    item_no: 'DRUM-2024-005',
    student_name: '刘小峰',
    teacher_name: '王老师',
    piece_name: '基础练习曲第八首',
    piece_alias: '基础八',
    beat_pattern: '单跳复合跳+重音',
    difficulty: '中级',
    status: '已判定',
    contract_ref: 'HT-2024-S004',
    contract_line_no: 5,
    source_version: 'v2.3（新版）',
    is_duplicate_alias: 0,
    is_name_mismatch: 0,
    is_old_version: 0,
    new_version_id: null,
    judge_result: '通过',
    judge_remark: '新版v2.3，复合跳重音处理准确，速度从60BPM提升至90BPM，进步显著。',
    judge_by: '王老师',
    judge_at: '2024-06-08 15:00:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_刘小峰_新版.pdf', path: '/uploads/contract_004_new.pdf', desc: '第1页第5行：v2.3版本，日期2024-05-20', by: '小温' }
    ]
  },
  {
    item_no: 'DRUM-2024-006',
    student_name: '陈小美',
    teacher_name: '赵老师',
    piece_name: '华尔兹鼓点',
    piece_alias: '三拍子舞曲',
    beat_pattern: '三拍子基础律动',
    difficulty: '初级',
    status: '待判定',
    contract_ref: 'HT-2024-S005',
    contract_line_no: 20,
    source_version: 'v1.0',
    is_duplicate_alias: 0,
    is_name_mismatch: 0,
    is_old_version: 0,
    new_version_id: null,
    judge_result: null,
    judge_remark: null,
    judge_by: null,
    judge_at: null,
    attachments: [
      { type: 'contract', name: '合同扫描件_陈小美.pdf', path: '/uploads/contract_006.pdf', desc: '第5页第20行：华尔兹鼓点-三拍子', by: '小温' }
    ]
  },
  {
    item_no: 'DRUM-2024-007',
    student_name: '周小龙',
    teacher_name: '陈老师',
    piece_name: '双踩练习曲第二号',
    piece_alias: '双踩二号',
    beat_pattern: '双踩十六分音符',
    difficulty: '高级',
    status: '已改判',
    contract_ref: 'HT-2024-S006',
    contract_line_no: 3,
    source_version: 'v2.0',
    is_duplicate_alias: 0,
    is_name_mismatch: 0,
    is_old_version: 0,
    new_version_id: null,
    judge_result: '优秀',
    judge_remark: '双踩速度从120BPM提升到160BPM，稳定性极佳。首次判定时因紧张未发挥好，二次测试表现优异。',
    judge_by: '陈老师（二次改判）',
    judge_at: '2024-06-09 10:30:00',
    attachments: [
      { type: 'contract', name: '合同扫描件_周小龙.pdf', path: '/uploads/contract_007.pdf', desc: '第1页第3行：双踩练习曲第二号', by: '小温' },
      { type: 'screenshot', name: '节拍测速截图.png', path: '/uploads/screenshot_007.png', desc: '测速162BPM，误差±2BPM', by: '陈老师' },
      { type: 'screenshot', name: '改判前后对比.png', path: '/uploads/screenshot_007_2.png', desc: '首次85分，改判后95分', by: '小温' }
    ],
    history: [
      { before: '待改进', after: '良好', beforeRemark: '速度不稳，忽快忽慢', afterRemark: '经过一周练习，速度稳定性明显提升', by: '陈老师', reason: '学生一周后复测，进步明显' },
      { before: '良好', after: '优秀', beforeRemark: '速度稳定性明显提升', afterRemark: '双踩速度从120BPM提升到160BPM...', by: '陈老师（二次改判）', reason: '月度考核复测，再次突破' }
    ]
  }
];

const transaction = db.transaction(() => {
  seedData.forEach((item, index) => {
    const result = insertBeat.run(
      item.item_no, item.student_name, item.teacher_name, item.piece_name,
      item.piece_alias, item.beat_pattern, item.difficulty, item.status,
      item.contract_ref, item.contract_line_no, item.source_version,
      item.is_duplicate_alias, item.is_name_mismatch, item.is_old_version,
      item.new_version_id, item.judge_result, item.judge_remark,
      item.judge_by, item.judge_at
    );

    const beatId = result.lastInsertRowid || (index + 1);

    if (item.attachments) {
      item.attachments.forEach(att => {
        insertAttachment.run(beatId, att.type, att.name, att.path, att.desc, att.by);
      });
    }

    if (item.history) {
      item.history.forEach(h => {
        insertHistory.run(beatId, h.before, h.after, h.beforeRemark, h.afterRemark, h.by, h.reason);
      });
    }

    if (item.versionConflict) {
      insertVersionConflict.run(
        beatId, item.versionConflict.oldVer, item.versionConflict.newVer,
        item.versionConflict.oldSource, item.versionConflict.newSource,
        item.versionConflict.diffFields, item.versionConflict.suggestion
      );
    }

    if (item.badData) {
      item.badData.forEach(b => {
        insertBadData.run(beatId, b.type, b.originalLine, b.originalObject, b.desc, b.page, b.line);
      });
    }
  });
});

transaction();
console.log('测试数据已写入');
console.log('共插入 ' + db.prepare('SELECT COUNT(*) FROM beat_items').get()['COUNT(*)'] + ' 条节拍清单');
console.log('共 ' + db.prepare('SELECT COUNT(*) FROM attachments').get()['COUNT(*)'] + ' 个附件');
console.log('共 ' + db.prepare('SELECT COUNT(*) FROM judge_history').get()['COUNT(*)'] + ' 条改判历史');
console.log('共 ' + db.prepare('SELECT COUNT(*) FROM version_conflicts').get()['COUNT(*)'] + ' 条版本冲突记录');
console.log('共 ' + db.prepare('SELECT COUNT(*) FROM bad_data_records').get()['COUNT(*)'] + ' 条坏数据记录');

db.close();
