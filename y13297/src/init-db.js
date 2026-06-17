const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'complaints.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS gis_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    point_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    alias TEXT,
    longitude REAL NOT NULL,
    latitude REAL NOT NULL,
    address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_no TEXT UNIQUE NOT NULL,
    gis_point_id INTEGER NOT NULL,
    original_gis_point_id INTEGER,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    reporter TEXT,
    reporter_phone TEXT,
    source TEXT NOT NULL,
    handler TEXT,
    result TEXT,
    is_merged INTEGER DEFAULT 0,
    merged_to_id INTEGER,
    merge_evidence_id INTEGER,
    has_late_attachment INTEGER DEFAULT 0,
    is_exception INTEGER DEFAULT 0,
    exception_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (gis_point_id) REFERENCES gis_points(id),
    FOREIGN KEY (original_gis_point_id) REFERENCES gis_points(id),
    FOREIGN KEY (merged_to_id) REFERENCES complaints(id),
    FOREIGN KEY (merge_evidence_id) REFERENCES merge_evidence(id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    is_late INTEGER DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  );

  CREATE TABLE IF NOT EXISTS timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    status_after TEXT,
    operator TEXT,
    remark TEXT,
    evidence_snapshot TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  );

  CREATE TABLE IF NOT EXISTS merge_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_complaint_id INTEGER NOT NULL,
    source_complaint_id INTEGER NOT NULL,
    point_a_name TEXT NOT NULL,
    point_b_name TEXT NOT NULL,
    point_a_coord TEXT NOT NULL,
    point_b_coord TEXT NOT NULL,
    distance_meters REAL NOT NULL,
    merge_rule TEXT NOT NULL,
    manual_confirm INTEGER DEFAULT 0,
    confirmed_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (target_complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (source_complaint_id) REFERENCES complaints(id)
  );

  CREATE TABLE IF NOT EXISTS playbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    complaint_ids TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

console.log('数据库表结构初始化完成');

const now = () => new Date().toISOString();

const points = [
  {
    point_code: 'GIS-PARK-001',
    name: '新华路口袋公园·东门座椅',
    alias: '新华路小游园东门休息椅',
    longitude: 121.4739,
    latitude: 31.2306,
    address: '新华路与定西路交叉口东北角'
  },
  {
    point_code: 'GIS-PARK-002',
    name: '新华路口袋公园·东门休息椅',
    alias: '新华路小游园东门座椅',
    longitude: 121.4739,
    latitude: 31.2306,
    address: '新华路定西路东北角口袋公园东门'
  },
  {
    point_code: 'GIS-PARK-003',
    name: '新华路口袋公园·南侧座椅',
    alias: null,
    longitude: 121.4736,
    latitude: 31.2303,
    address: '新华路口袋公园南侧靠近花坛'
  },
  {
    point_code: 'GIS-ROAD-004',
    name: '定西路·安化路口公交站座椅',
    alias: null,
    longitude: 121.4732,
    latitude: 31.2309,
    address: '定西路安化路口公交站旁'
  }
];

const insertPoint = db.prepare(`
  INSERT INTO gis_points (point_code, name, alias, longitude, latitude, address, created_at)
  VALUES (@point_code, @name, @alias, @longitude, @latitude, @address, @created_at)
`);

const pointIds = {};
for (const p of points) {
  const info = insertPoint.run({ ...p, created_at: now() });
  pointIds[p.point_code] = info.lastInsertRowid;
}
console.log('GIS点位植入完成，共', points.length, '条');

const insertComplaint = db.prepare(`
  INSERT INTO complaints (
    complaint_no, gis_point_id, original_gis_point_id, status, title, content,
    reporter, reporter_phone, source, handler, result,
    is_merged, merged_to_id, merge_evidence_id,
    has_late_attachment, is_exception, exception_note,
    created_at, updated_at
  ) VALUES (
    @complaint_no, @gis_point_id, @original_gis_point_id, @status, @title, @content,
    @reporter, @reporter_phone, @source, @handler, @result,
    @is_merged, @merged_to_id, @merge_evidence_id,
    @has_late_attachment, @is_exception, @exception_note,
    @created_at, @updated_at
  )
`);

const insertAttachment = db.prepare(`
  INSERT INTO attachments (complaint_id, file_name, file_type, file_size, is_late, uploaded_at, description)
  VALUES (@complaint_id, @file_name, @file_type, @file_size, @is_late, @uploaded_at, @description)
`);

const insertTimeline = db.prepare(`
  INSERT INTO timeline (complaint_id, action, status_after, operator, remark, evidence_snapshot, created_at)
  VALUES (@complaint_id, @action, @status_after, @operator, @remark, @evidence_snapshot, @created_at)
`);

const insertMerge = db.prepare(`
  INSERT INTO merge_evidence (
    target_complaint_id, source_complaint_id,
    point_a_name, point_b_name, point_a_coord, point_b_coord,
    distance_meters, merge_rule, manual_confirm, confirmed_by, created_at
  ) VALUES (
    @target_complaint_id, @source_complaint_id,
    @point_a_name, @point_b_name, @point_a_coord, @point_b_coord,
    @distance_meters, @merge_rule, @manual_confirm, @confirmed_by, @created_at
  )
`);

function createSmoothRecord() {
  const ts1 = '2026-06-10T09:15:00.000Z';
  const ts2 = '2026-06-10T09:30:00.000Z';
  const ts3 = '2026-06-10T14:20:00.000Z';
  const ts4 = '2026-06-10T15:00:00.000Z';
  const ts5 = '2026-06-10T16:30:00.000Z';

  const info = insertComplaint.run({
    complaint_no: 'TS-2026-0610-001',
    gis_point_id: pointIds['GIS-PARK-001'],
    original_gis_point_id: null,
    status: '已结案',
    title: '东门座椅木板松动',
    content: '东门靠近花坛的那张座椅第三块木板松动，坐上去晃',
    reporter: '张阿姨',
    reporter_phone: '138****2345',
    source: '12345市民热线',
    handler: '王工（设施科）',
    result: '已更换新木板并加固',
    is_merged: 0,
    merged_to_id: null,
    merge_evidence_id: null,
    has_late_attachment: 0,
    is_exception: 0,
    exception_note: null,
    created_at: ts1,
    updated_at: ts5
  });
  const cid = info.lastInsertRowid;

  insertAttachment.run({
    complaint_id: cid,
    file_name: '座椅松动现场照.jpg',
    file_type: 'image/jpeg',
    file_size: 2145320,
    is_late: 0,
    uploaded_at: ts1,
    description: '投诉人现场拍摄，第三块木板翘起'
  });
  insertAttachment.run({
    complaint_id: cid,
    file_name: '维修后对比照.jpg',
    file_type: 'image/jpeg',
    file_size: 1987650,
    is_late: 0,
    uploaded_at: ts4,
    description: '维修完成后拍摄，木板已更换'
  });

  const snap1 = JSON.stringify({ source: '12345工单系统转派', status_before: '待分派', status_after: '待派单' });
  const snap2 = JSON.stringify({ assignee: '王工', dept: '设施科', deadline: '2026-06-12' });
  const snap3 = JSON.stringify({ repair_cost: 320, material: '防腐木3块+不锈钢螺丝' });
  const snap4 = JSON.stringify({ recheck: { wobble: false, clean: true }, photo_count: 2 });

  insertTimeline.run({ complaint_id: cid, action: '投诉受理', status_after: '待派单', operator: '热线接线员小李', remark: '12345工单转派，编号202606100087', evidence_snapshot: snap1, created_at: ts1 });
  insertTimeline.run({ complaint_id: cid, action: '派单', status_after: '处理中', operator: '调度班长老赵', remark: '派设施科王工现场处置', evidence_snapshot: snap2, created_at: ts2 });
  insertTimeline.run({ complaint_id: cid, action: '现场处置', status_after: '处理中', operator: '王工', remark: '确认第三块木板松动，需更换', evidence_snapshot: snap3, created_at: ts3 });
  insertTimeline.run({ complaint_id: cid, action: '处置完成', status_after: '待核查', operator: '王工', remark: '木板已更换加固，附前后对比照', evidence_snapshot: snap4, created_at: ts4 });
  insertTimeline.run({ complaint_id: cid, action: '核查结案', status_after: '已结案', operator: '质检员小周', remark: '复核通过，座椅稳固', evidence_snapshot: null, created_at: ts5 });

  return cid;
}

function createLateAttachmentRecord() {
  const ts1 = '2026-06-11T08:40:00.000Z';
  const ts2 = '2026-06-11T09:05:00.000Z';
  const ts3 = '2026-06-11T11:30:00.000Z';
  const ts4 = '2026-06-11T17:15:00.000Z';
  const ts5 = '2026-06-12T09:50:00.000Z';

  const info = insertComplaint.run({
    complaint_no: 'TS-2026-0611-003',
    gis_point_id: pointIds['GIS-PARK-003'],
    original_gis_point_id: null,
    status: '已结案',
    title: '南侧座椅金属支架生锈',
    content: '南边靠近厕所的座椅支架有锈迹，漆皮掉了一大片',
    reporter: '匿名',
    reporter_phone: null,
    source: '微信公众号随手拍',
    handler: '李工（设施科）',
    result: '已除锈刷防锈漆+面漆',
    is_merged: 0,
    merged_to_id: null,
    merge_evidence_id: null,
    has_late_attachment: 1,
    is_exception: 0,
    exception_note: null,
    created_at: ts1,
    updated_at: ts5
  });
  const cid = info.lastInsertRowid;

  insertAttachment.run({
    complaint_id: cid,
    file_name: '锈迹概览.jpg',
    file_type: 'image/jpeg',
    file_size: 1567000,
    is_late: 0,
    uploaded_at: ts1,
    description: '随手拍上传，座椅整体'
  });
  insertAttachment.run({
    complaint_id: cid,
    file_name: '锈迹特写_漏上传.zip',
    file_type: 'application/zip',
    file_size: 5432000,
    is_late: 1,
    uploaded_at: ts5,
    description: '【补录】锈点特写5张，投诉人隔日通过客服补发'
  });

  const snap1 = JSON.stringify({ source: '公众号随手拍模块', auto_gis_match: 'GIS-PARK-003', confidence: 0.89 });
  const snap2 = JSON.stringify({ rust_area: '约30%', severity: '中等', recommendation: '除锈刷漆' });
  const snap3 = JSON.stringify({ material: '防锈漆1罐+灰色面漆1罐', labor_hours: 2 });
  const snap4 = JSON.stringify({ note: '投诉人于次日通过客服补发锈迹特写压缩包，归档补录', file_count_before: 1, file_count_after: 2 });

  insertTimeline.run({ complaint_id: cid, action: '投诉受理', status_after: '待派单', operator: '系统自动', remark: '随手拍自动匹配点位', evidence_snapshot: snap1, created_at: ts1 });
  insertTimeline.run({ complaint_id: cid, action: '派单', status_after: '处理中', operator: '调度班长老赵', remark: '派设施科李工处置', evidence_snapshot: null, created_at: ts2 });
  insertTimeline.run({ complaint_id: cid, action: '现场处置', status_after: '处理中', operator: '李工', remark: '支架中度生锈，除锈刷漆', evidence_snapshot: snap2, created_at: ts3 });
  insertTimeline.run({ complaint_id: cid, action: '处置完成', status_after: '待核查', operator: '李工', remark: '刷漆完成，干燥中', evidence_snapshot: snap3, created_at: ts4 });
  insertTimeline.run({ complaint_id: cid, action: '补录附件', status_after: '待核查', operator: '客服小陈', remark: '投诉人补发锈迹特写，归档补录', evidence_snapshot: snap4, created_at: ts5 });
  insertTimeline.run({ complaint_id: cid, action: '核查结案', status_after: '已结案', operator: '质检员小周', remark: '漆面均匀，补录附件已审核', evidence_snapshot: null, created_at: ts5 });

  return cid;
}

function createExceptionRecord() {
  const ts1 = '2026-06-12T10:20:00.000Z';
  const ts2 = '2026-06-12T10:35:00.000Z';
  const ts3 = '2026-06-12T11:10:00.000Z';
  const ts4 = '2026-06-12T11:45:00.000Z';
  const ts5 = '2026-06-12T15:00:00.000Z';
  const ts6 = '2026-06-12T16:00:00.000Z';

  const info = insertComplaint.run({
    complaint_no: 'TS-2026-0612-007',
    gis_point_id: pointIds['GIS-PARK-001'],
    original_gis_point_id: pointIds['GIS-ROAD-004'],
    status: '已结案',
    title: '座椅螺丝外露',
    content: '坐了一下裤子被勾破了，螺丝冒出来了',
    reporter: '陈先生',
    reporter_phone: '139****7788',
    source: '现场巡查发现',
    handler: '王工（设施科）',
    result: '已打磨外露螺丝头并加保护帽',
    is_merged: 0,
    merged_to_id: null,
    merge_evidence_id: null,
    has_late_attachment: 0,
    is_exception: 1,
    exception_note: '初始GIS录入错误：相邻路口定西路安化路公交站座椅 → 纠正为新华路口袋公园东门座椅',
    created_at: ts1,
    updated_at: ts6
  });
  const cid = info.lastInsertRowid;

  insertAttachment.run({
    complaint_id: cid,
    file_name: '勾破的裤子.jpg',
    file_type: 'image/jpeg',
    file_size: 1876000,
    is_late: 0,
    uploaded_at: ts1,
    description: '现场拍摄'
  });
  insertAttachment.run({
    complaint_id: cid,
    file_name: '螺丝外露特写.jpg',
    file_type: 'image/jpeg',
    file_size: 1123000,
    is_late: 0,
    uploaded_at: ts1,
    description: '巡查员现场拍摄'
  });
  insertAttachment.run({
    complaint_id: cid,
    file_name: '点位纠错说明.pdf',
    file_type: 'application/pdf',
    file_size: 234000,
    is_late: 0,
    uploaded_at: ts4,
    description: '纠正前后GIS点位对比说明'
  });

  const snap1 = JSON.stringify({ patrol_route: '定西路-安化路-新华路', patrol_id: 'XH20260612' });
  const snap2 = JSON.stringify({ point_assigned: 'GIS-ROAD-004', distance_from_actual: 68, warning: '距巡查员实际位置偏差>50米' });
  const snap3 = JSON.stringify({ handler_note: '到达公交站未发现问题，致电投诉人确认实际在口袋公园东门', correct_point: 'GIS-PARK-001' });
  const snap4 = JSON.stringify({
    correction: {
      from: { code: 'GIS-ROAD-004', name: '定西路·安化路口公交站座椅' },
      to: { code: 'GIS-PARK-001', name: '新华路口袋公园·东门座椅' },
      reason: '相邻路口录入错误，经投诉人电话核实+现场二次勘查确认'
    }
  });

  insertTimeline.run({ complaint_id: cid, action: '投诉受理', status_after: '待派单', operator: '巡查员小孙', remark: '现场巡查录入', evidence_snapshot: snap1, created_at: ts1 });
  insertTimeline.run({ complaint_id: cid, action: '派单', status_after: '处理中', operator: '调度班长老赵', remark: '派设施科王工处置', evidence_snapshot: snap2, created_at: ts2 });
  insertTimeline.run({ complaint_id: cid, action: '现场核实（异常）', status_after: '处理中', operator: '王工', remark: '到公交站未发现异常，联系投诉人确认点位有误', evidence_snapshot: snap3, created_at: ts3 });
  insertTimeline.run({ complaint_id: cid, action: 'GIS点位纠正', status_after: '处理中', operator: '王工', remark: '由定西路公交站纠正为新华路口袋公园东门', evidence_snapshot: snap4, created_at: ts4 });
  insertTimeline.run({ complaint_id: cid, action: '现场处置', status_after: '待核查', operator: '王工', remark: '确认螺丝外露，打磨并加保护帽', evidence_snapshot: null, created_at: ts5 });
  insertTimeline.run({ complaint_id: cid, action: '核查结案', status_after: '已结案', operator: '质检员小周', remark: '纠正记录完整，处置到位，标记异常工单', evidence_snapshot: null, created_at: ts6 });

  return cid;
}

function createMergeRecord() {
  const ts1 = '2026-06-13T07:50:00.000Z';
  const ts2 = '2026-06-13T08:05:00.000Z';
  const ts3 = '2026-06-13T08:10:00.000Z';
  const ts4 = '2026-06-13T08:25:00.000Z';
  const ts5 = '2026-06-13T14:00:00.000Z';
  const ts6 = '2026-06-13T16:20:00.000Z';

  const infoA = insertComplaint.run({
    complaint_no: 'TS-2026-0613-002',
    gis_point_id: pointIds['GIS-PARK-001'],
    original_gis_point_id: null,
    status: '已结案',
    title: '东门座椅扶手断裂',
    content: '东门那张座椅右边扶手断了，小孩容易磕到',
    reporter: '刘先生',
    reporter_phone: '137****5566',
    source: '12345市民热线',
    handler: '赵工（设施科）',
    result: '已焊接修复扶手并打磨光滑',
    is_merged: 0,
    merged_to_id: null,
    merge_evidence_id: null,
    has_late_attachment: 0,
    is_exception: 0,
    exception_note: null,
    created_at: ts1,
    updated_at: ts6
  });
  const cidA = infoA.lastInsertRowid;

  insertAttachment.run({
    complaint_id: cidA,
    file_name: '扶手断裂现场1.jpg',
    file_type: 'image/jpeg',
    file_size: 2034000,
    is_late: 0,
    uploaded_at: ts1,
    description: '投诉人拍摄'
  });

  insertTimeline.run({ complaint_id: cidA, action: '投诉受理', status_after: '待派单', operator: '热线接线员小李', remark: '12345工单转派，编号202606130041', evidence_snapshot: null, created_at: ts1 });

  const infoB = insertComplaint.run({
    complaint_no: 'TS-2026-0613-005',
    gis_point_id: pointIds['GIS-PARK-002'],
    original_gis_point_id: null,
    status: '已归并',
    title: '小游园东门休息椅扶手坏了',
    content: '休息椅右侧扶手断开，金属都露出来了',
    reporter: '赵阿姨',
    reporter_phone: null,
    source: '社区网格员上报',
    handler: '赵工（设施科）',
    result: null,
    is_merged: 1,
    merged_to_id: cidA,
    merge_evidence_id: null,
    has_late_attachment: 0,
    is_exception: 0,
    exception_note: null,
    created_at: ts2,
    updated_at: ts4
  });
  const cidB = infoB.lastInsertRowid;

  insertAttachment.run({
    complaint_id: cidB,
    file_name: '网格巡检照片_扶手.jpg',
    file_type: 'image/jpeg',
    file_size: 1567000,
    is_late: 0,
    uploaded_at: ts2,
    description: '社区网格员拍摄'
  });

  insertTimeline.run({ complaint_id: cidB, action: '投诉受理', status_after: '待派单', operator: '社区网格员小吴', remark: '日常网格巡检上报', evidence_snapshot: null, created_at: ts2 });

  const mergeInfo = insertMerge.run({
    target_complaint_id: cidA,
    source_complaint_id: cidB,
    point_a_name: '新华路口袋公园·东门座椅',
    point_b_name: '新华路口袋公园·东门休息椅',
    point_a_coord: '121.4739°E, 31.2306°N',
    point_b_coord: '121.4739°E, 31.2306°N',
    distance_meters: 0,
    merge_rule: '坐标完全一致 + 名称语义相似（座椅/休息椅）+ 问题描述（扶手断裂）+ 时间窗(15分钟内)',
    manual_confirm: 1,
    confirmed_by: '调度班长老赵',
    created_at: ts3
  });
  const mergeId = mergeInfo.lastInsertRowid;

  const updateMerge = db.prepare('UPDATE complaints SET merge_evidence_id = ? WHERE id IN (?, ?)');
  updateMerge.run(mergeId, cidA, cidB);

  const snapMerge = JSON.stringify({
    merge_id: mergeId,
    target: { no: 'TS-2026-0613-002', point: 'GIS-PARK-001' },
    source: { no: 'TS-2026-0613-005', point: 'GIS-PARK-002' },
    rule_hit: ['coord_identical', 'name_semantic_similarity_0.94', 'description_similarity_0.88', 'time_window_15min']
  });

  insertTimeline.run({ complaint_id: cidA, action: '派单', status_after: '处理中', operator: '调度班长老赵', remark: '派设施科赵工处置', evidence_snapshot: null, created_at: ts3 });
  insertTimeline.run({ complaint_id: cidA, action: '归并关联', status_after: '处理中', operator: '系统自动+人工确认', remark: '检测到疑似重复工单，已人工确认归并至本单', evidence_snapshot: snapMerge, created_at: ts4 });
  insertTimeline.run({ complaint_id: cidB, action: '归并至主单', status_after: '已归并', operator: '调度班长老赵', remark: `归并至主单 TS-2026-0613-002，合并处置`, evidence_snapshot: snapMerge, created_at: ts4 });

  insertTimeline.run({ complaint_id: cidA, action: '现场处置', status_after: '待核查', operator: '赵工', remark: '扶手焊接修复并打磨，无毛刺', evidence_snapshot: null, created_at: ts5 });
  insertTimeline.run({ complaint_id: cidA, action: '核查结案', status_after: '已结案', operator: '质检员小周', remark: '修复合格，归并证据完整', evidence_snapshot: null, created_at: ts6 });

  return { cidA, cidB };
}

const cid1 = createSmoothRecord();
const cid2 = createLateAttachmentRecord();
const cid3 = createExceptionRecord();
const { cidA, cidB } = createMergeRecord();

const insertPlayback = db.prepare(`
  INSERT INTO playbacks (name, description, complaint_ids, created_at)
  VALUES (?, ?, ?, ?)
`);

insertPlayback.run(
  '口袋公园座椅投诉回放-试跑版',
  '4条数据覆盖：顺利记录、补录记录（晚到附件）、异常记录（相邻路口合错）、归并记录（同一地点两种写法）',
  JSON.stringify([cid1, cid2, cid3, cidA, cidB]),
  now()
);

console.log('演示数据植入完成：');
console.log('  ① 顺利记录：TS-2026-0610-001 (id=' + cid1 + ')');
console.log('  ② 补录记录（晚到附件）：TS-2026-0611-003 (id=' + cid2 + ')');
console.log('  ③ 异常记录（相邻路口合错）：TS-2026-0612-007 (id=' + cid3 + ')');
console.log('  ④ 归并记录（两种写法）：主单 TS-2026-0613-002 (id=' + cidA + ')，被归并 TS-2026-0613-005 (id=' + cidB + ')');

db.close();
console.log('数据库初始化完毕，路径:', DB_PATH);
