import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'bridge_review.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_task (
      id TEXT PRIMARY KEY,
      task_no TEXT NOT NULL UNIQUE,
      bridge_name TEXT NOT NULL,
      bridge_code TEXT NOT NULL,
      crack_count INTEGER NOT NULL,
      submitter TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL,
      has_bad_data INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crack_params (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      crack_id TEXT NOT NULL,
      collection_time TEXT NOT NULL,
      process_time TEXT NOT NULL,
      review_time TEXT NOT NULL,
      length_value REAL NOT NULL,
      length_unit TEXT NOT NULL,
      width_value REAL NOT NULL,
      width_unit TEXT NOT NULL,
      depth_value REAL NOT NULL,
      depth_unit TEXT NOT NULL,
      collision_detected INTEGER NOT NULL DEFAULT 0,
      overlap_material_id TEXT,
      conclusion TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES review_task(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT NOT NULL,
      new_value TEXT NOT NULL,
      operator TEXT NOT NULL,
      operated_at TEXT NOT NULL,
      reason TEXT NOT NULL,
      collision_changed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES review_task(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_source (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      source_file TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      calibration_status TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES review_task(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_crack_task ON crack_params(task_id);
    CREATE INDEX IF NOT EXISTS idx_history_task ON change_history(task_id);
    CREATE INDEX IF NOT EXISTS idx_material_task ON material_source(task_id);
  `);

  const row = db.prepare('SELECT COUNT(*) as c FROM review_task').get() as { c: number };
  if (row.c === 0) {
    seedMockData();
  }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedMockData() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

  const insertTask = db.prepare(`
    INSERT INTO review_task (id, task_no, bridge_name, bridge_code, crack_count, submitter, submitted_at, status, has_bad_data)
    VALUES (@id, @taskNo, @bridgeName, @bridgeCode, @crackCount, @submitter, @submittedAt, @status, @hasBadData)
  `);

  const insertCrack = db.prepare(`
    INSERT INTO crack_params (id, task_id, crack_id, collection_time, process_time, review_time,
      length_value, length_unit, width_value, width_unit, depth_value, depth_unit,
      collision_detected, overlap_material_id, conclusion)
    VALUES (@id, @taskId, @crackId, @collectionTime, @processTime, @reviewTime,
      @lengthValue, @lengthUnit, @widthValue, @widthUnit, @depthValue, @depthUnit,
      @collisionDetected, @overlapMaterialId, @conclusion)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO change_history (id, task_id, field_name, old_value, new_value, operator, operated_at, reason, collision_changed)
    VALUES (@id, @taskId, @fieldName, @oldValue, @newValue, @operator, @operatedAt, @reason, @collisionChanged)
  `);

  const insertMaterial = db.prepare(`
    INSERT INTO material_source (id, task_id, type, name, source_file, submitted_by, calibration_status)
    VALUES (@id, @taskId, @type, @name, @sourceFile, @submittedBy, @calibrationStatus)
  `);

  const tasks = [
    {
      id: 'task-001',
      taskNo: 'BR-2026-0142',
      bridgeName: '长江二桥南引桥',
      bridgeCode: 'CJ-2-QY-S',
      crackCount: 3,
      submitter: '李工程师',
      submittedAt: twoDaysAgo,
      status: 'passed',
      hasBadData: 0,
    },
    {
      id: 'task-002',
      taskNo: 'BR-2026-0143',
      bridgeName: '解放大道高架桥',
      bridgeCode: 'JF-GDJ-07',
      crackCount: 5,
      submitter: '王测量员',
      submittedAt: yesterday,
      status: 'reviewing',
      hasBadData: 0,
    },
    {
      id: 'task-003',
      taskNo: 'BR-2026-0144',
      bridgeName: '东湖大桥主拱圈',
      bridgeCode: 'DH-DQ-ZG',
      crackCount: 4,
      submitter: '张技术员',
      submittedAt: yesterday,
      status: 'conflict',
      hasBadData: 1,
    },
    {
      id: 'task-004',
      taskNo: 'BR-2026-0145',
      bridgeName: '江北快速路箱梁',
      bridgeCode: 'JB-KS-23',
      crackCount: 2,
      submitter: '陈检测员',
      submittedAt: now,
      status: 'pending',
      hasBadData: 0,
    },
    {
      id: 'task-005',
      taskNo: 'BR-2026-0146',
      bridgeName: '光谷大桥横梁',
      bridgeCode: 'GG-DQ-HL',
      crackCount: 6,
      submitter: '刘工',
      submittedAt: now,
      status: 'pending',
      hasBadData: 0,
    },
  ];

  const runBatch = db.transaction((items: any[], stmt: any) => {
    for (const it of items) stmt.run(it);
  });
  runBatch(tasks, insertTask);

  const cracks = [
    {
      id: uid('cp'), taskId: 'task-001', crackId: 'C-001',
      collectionTime: '2026-06-05T09:30:00+08:00',
      processTime: '2026-06-05T14:20:00+08:00',
      reviewTime: '2026-06-06T10:00:00+08:00',
      lengthValue: 320, lengthUnit: 'mm', widthValue: 2.4, widthUnit: 'mm',
      depthValue: 18, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '轻度裂缝，建议6个月后复查',
    },
    {
      id: uid('cp'), taskId: 'task-001', crackId: 'C-002',
      collectionTime: '2026-06-05T09:35:00+08:00',
      processTime: '2026-06-05T14:25:00+08:00',
      reviewTime: '2026-06-06T10:05:00+08:00',
      lengthValue: 580, lengthUnit: 'mm', widthValue: 3.8, widthUnit: 'mm',
      depthValue: 32, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '中度裂缝，需表面封闭处理',
    },
    {
      id: uid('cp'), taskId: 'task-001', crackId: 'C-003',
      collectionTime: '2026-06-05T09:40:00+08:00',
      processTime: '2026-06-05T14:30:00+08:00',
      reviewTime: '2026-06-06T10:10:00+08:00',
      lengthValue: 210, lengthUnit: 'mm', widthValue: 1.5, widthUnit: 'mm',
      depthValue: 12, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '微裂缝，记录观察',
    },
    {
      id: uid('cp'), taskId: 'task-002', crackId: 'C-001',
      collectionTime: '2026-06-06T08:00:00+08:00',
      processTime: '2026-06-06T12:00:00+08:00',
      reviewTime: '2026-06-07T09:00:00+08:00',
      lengthValue: 1200, lengthUnit: 'mm', widthValue: 5.2, widthUnit: 'mm',
      depthValue: 45, depthUnit: 'mm', collisionDetected: 1, overlapMaterialId: 'mat-002',
      conclusion: '重度裂缝，与钢筋保护层重叠，需紧急处理',
    },
    {
      id: uid('cp'), taskId: 'task-002', crackId: 'C-002',
      collectionTime: '2026-06-06T08:15:00+08:00',
      processTime: '2026-06-06T12:15:00+08:00',
      reviewTime: '2026-06-07T09:15:00+08:00',
      lengthValue: 450, lengthUnit: 'mm', widthValue: 2.8, widthUnit: 'mm',
      depthValue: 22, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '轻度裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-002', crackId: 'C-003',
      collectionTime: '2026-06-06T08:30:00+08:00',
      processTime: '2026-06-06T12:30:00+08:00',
      reviewTime: '2026-06-07T09:30:00+08:00',
      lengthValue: 760, lengthUnit: 'mm', widthValue: 4.1, widthUnit: 'mm',
      depthValue: 38, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '中度裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-002', crackId: 'C-004',
      collectionTime: '2026-06-06T08:45:00+08:00',
      processTime: '2026-06-06T12:45:00+08:00',
      reviewTime: '2026-06-07T09:45:00+08:00',
      lengthValue: 300, lengthUnit: 'mm', widthValue: 1.9, widthUnit: 'mm',
      depthValue: 15, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '微裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-002', crackId: 'C-005',
      collectionTime: '2026-06-06T09:00:00+08:00',
      processTime: '2026-06-06T13:00:00+08:00',
      reviewTime: '2026-06-07T10:00:00+08:00',
      lengthValue: 620, lengthUnit: 'mm', widthValue: 3.5, widthUnit: 'mm',
      depthValue: 28, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '中度裂缝',
    },
    {
      id: 'cp-bad-003', taskId: 'task-003', crackId: 'C-003',
      collectionTime: '2026-06-07T01:20:00Z',
      processTime: '2026-06-07T10:50:00+08:00',
      reviewTime: '2026-06-07T15:00:00+08:00',
      lengthValue: 250, lengthUnit: 'cm',
      widthValue: 3.2, widthUnit: 'mm',
      depthValue: 25, depthUnit: 'mm',
      collisionDetected: 1, overlapMaterialId: 'mat-007',
      conclusion: '严重超标裂缝，长度异常偏大，疑似单位换算错误',
    },
    {
      id: uid('cp'), taskId: 'task-003', crackId: 'C-001',
      collectionTime: '2026-06-07T09:00:00+08:00',
      processTime: '2026-06-07T10:30:00+08:00',
      reviewTime: '2026-06-07T14:30:00+08:00',
      lengthValue: 480, lengthUnit: 'mm', widthValue: 2.9, widthUnit: 'mm',
      depthValue: 20, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '中度裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-003', crackId: 'C-002',
      collectionTime: '2026-06-07T09:15:00+08:00',
      processTime: '2026-06-07T10:40:00+08:00',
      reviewTime: '2026-06-07T14:40:00+08:00',
      lengthValue: 540, lengthUnit: 'mm', widthValue: 3.6, widthUnit: 'mm',
      depthValue: 30, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '中度裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-003', crackId: 'C-004',
      collectionTime: '2026-06-07T09:45:00+08:00',
      processTime: '2026-06-07T11:10:00+08:00',
      reviewTime: '2026-06-07T15:10:00+08:00',
      lengthValue: 320, lengthUnit: 'mm', widthValue: 2.1, widthUnit: 'mm',
      depthValue: 16, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '轻度裂缝',
    },
    {
      id: uid('cp'), taskId: 'task-004', crackId: 'C-001',
      collectionTime: '2026-06-08T10:00:00+08:00',
      processTime: '2026-06-08T14:00:00+08:00',
      reviewTime: '',
      lengthValue: 410, lengthUnit: 'mm', widthValue: 2.5, widthUnit: 'mm',
      depthValue: 19, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-004', crackId: 'C-002',
      collectionTime: '2026-06-08T10:20:00+08:00',
      processTime: '2026-06-08T14:20:00+08:00',
      reviewTime: '',
      lengthValue: 290, lengthUnit: 'mm', widthValue: 1.8, widthUnit: 'mm',
      depthValue: 14, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-001',
      collectionTime: '2026-06-08T11:00:00+08:00',
      processTime: '2026-06-08T15:00:00+08:00',
      reviewTime: '',
      lengthValue: 820, lengthUnit: 'mm', widthValue: 4.5, widthUnit: 'mm',
      depthValue: 40, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-002',
      collectionTime: '2026-06-08T11:15:00+08:00',
      processTime: '2026-06-08T15:15:00+08:00',
      reviewTime: '',
      lengthValue: 350, lengthUnit: 'mm', widthValue: 2.2, widthUnit: 'mm',
      depthValue: 17, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-003',
      collectionTime: '2026-06-08T11:30:00+08:00',
      processTime: '2026-06-08T15:30:00+08:00',
      reviewTime: '',
      lengthValue: 670, lengthUnit: 'mm', widthValue: 3.9, widthUnit: 'mm',
      depthValue: 33, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-004',
      collectionTime: '2026-06-08T11:45:00+08:00',
      processTime: '2026-06-08T15:45:00+08:00',
      reviewTime: '',
      lengthValue: 240, lengthUnit: 'mm', widthValue: 1.6, widthUnit: 'mm',
      depthValue: 11, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-005',
      collectionTime: '2026-06-08T12:00:00+08:00',
      processTime: '2026-06-08T16:00:00+08:00',
      reviewTime: '',
      lengthValue: 510, lengthUnit: 'mm', widthValue: 3.0, widthUnit: 'mm',
      depthValue: 24, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
    {
      id: uid('cp'), taskId: 'task-005', crackId: 'C-006',
      collectionTime: '2026-06-08T12:15:00+08:00',
      processTime: '2026-06-08T16:15:00+08:00',
      reviewTime: '',
      lengthValue: 430, lengthUnit: 'mm', widthValue: 2.7, widthUnit: 'mm',
      depthValue: 21, depthUnit: 'mm', collisionDetected: 0, overlapMaterialId: null,
      conclusion: '待复核',
    },
  ];
  runBatch(cracks, insertCrack);

  const history = [
    {
      id: uid('h'), taskId: 'task-001',
      fieldName: 'status', oldValue: 'pending', newValue: 'passed',
      operator: '展馆讲解员-赵', operatedAt: twoDaysAgo,
      reason: '参数一致，材料校准完成，复核通过',
      collisionChanged: 0,
    },
    {
      id: uid('h'), taskId: 'task-002',
      fieldName: 'widthValue', oldValue: '5.6', newValue: '5.2',
      operator: '展馆讲解员-赵', operatedAt: yesterday,
      reason: '截图清单中宽度测量存在偏移，重新读取点云数据校正',
      collisionChanged: 1,
    },
  ];
  runBatch(history, insertHistory);

  const materials = [
    { id: 'mat-001', taskId: 'task-001', type: 'model', name: '长江二桥南引桥点云模型.las', sourceFile: 'CJ-2-QY-S_pointcloud.las', submittedBy: '李工程师', calibrationStatus: 'calibrated' },
    { id: 'mat-002', taskId: 'task-001', type: 'screenshot', name: 'C-001裂缝俯视截图', sourceFile: 'C-001_top.png', submittedBy: '李工程师', calibrationStatus: 'calibrated' },
    { id: 'mat-003', taskId: 'task-001', type: 'screenshot', name: 'C-002裂缝侧视截图', sourceFile: 'C-002_side.png', submittedBy: '李工程师', calibrationStatus: 'calibrated' },
    { id: 'mat-004', taskId: 'task-001', type: 'time_record', name: '采集时间表-20260605', sourceFile: 'timing_20260605.xlsx', submittedBy: '李工程师', calibrationStatus: 'calibrated' },
    { id: 'mat-005', taskId: 'task-002', type: 'model', name: '解放大道高架桥点云.las', sourceFile: 'JF-GDJ-07.las', submittedBy: '王测量员', calibrationStatus: 'calibrated' },
    { id: 'mat-006', taskId: 'task-002', type: 'screenshot', name: 'C-001重叠区域截图', sourceFile: 'JF-C001_overlap.png', submittedBy: '王测量员', calibrationStatus: 'calibrated' },
    { id: 'mat-007', taskId: 'task-003', type: 'model', name: '东湖大桥主拱圈-草稿版.las', sourceFile: 'DH-DQ-ZG_draft.las', submittedBy: '张技术员', calibrationStatus: 'uncalibrated' },
    { id: 'mat-008', taskId: 'task-003', type: 'screenshot', name: 'C-003异常截图', sourceFile: 'DH-C003_bad.png', submittedBy: '张技术员', calibrationStatus: 'conflict' },
    { id: 'mat-009', taskId: 'task-003', type: 'time_record', name: '东湖大桥采集时间UTC.txt', sourceFile: 'dh_time_utc.txt', submittedBy: '张技术员', calibrationStatus: 'conflict' },
    { id: 'mat-010', taskId: 'task-003', type: 'model', name: '东湖大桥主拱圈-正式版.las', sourceFile: 'DH-DQ-ZG_final.las', submittedBy: '张技术员', calibrationStatus: 'calibrated' },
    { id: 'mat-011', taskId: 'task-004', type: 'model', name: '江北快速路箱梁.las', sourceFile: 'JB-KS-23.las', submittedBy: '陈检测员', calibrationStatus: 'calibrated' },
    { id: 'mat-012', taskId: 'task-005', type: 'model', name: '光谷大桥横梁点云.las', sourceFile: 'GG-DQ-HL.las', submittedBy: '刘工', calibrationStatus: 'calibrated' },
  ];
  runBatch(materials, insertMaterial);
}
