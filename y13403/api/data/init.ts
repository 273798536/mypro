import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = path.join(__dirname, 'topo-review.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      record_no TEXT NOT NULL,
      param_version TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      boundary_result TEXT NOT NULL DEFAULT 'unknown',
      remark TEXT DEFAULT '',
      is_late_submission INTEGER NOT NULL DEFAULT 0,
      no_mismatch INTEGER NOT NULL DEFAULT 0,
      current_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      boundary_result TEXT NOT NULL,
      remark TEXT DEFAULT '',
      param_version TEXT NOT NULL,
      operator TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(id)
    );
    CREATE INDEX IF NOT EXISTS idx_versions_record ON versions(record_id);

    CREATE TABLE IF NOT EXISTS computation_steps (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      step_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      passed INTEGER NOT NULL,
      contributes_to_conclusion INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(id)
    );
    CREATE INDEX IF NOT EXISTS idx_steps_record ON computation_steps(record_id);

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const countRow = db.prepare('SELECT COUNT(*) AS c FROM records').get() as { c: number };
  if (countRow.c === 0) {
    seedData();
  }
}

function seedData() {
  const now = new Date().toISOString();
  const mk = (offsetMin: number) => {
    const d = new Date(Date.now() - offsetMin * 60_000);
    return d.toISOString();
  };

  const insertRecord = db.prepare(`
    INSERT INTO records (id, record_no, param_version, status, boundary_result, remark, is_late_submission, no_mismatch, current_version, created_at, updated_at)
    VALUES (@id, @recordNo, @paramVersion, @status, @boundaryResult, @remark, @isLateSubmission, @noMismatch, @currentVersion, @createdAt, @updatedAt)
  `);

  const insertVersion = db.prepare(`
    INSERT INTO versions (id, record_id, version, status, boundary_result, remark, param_version, operator, changed_at)
    VALUES (@id, @recordId, @version, @status, @boundaryResult, @remark, @paramVersion, @operator, @changedAt)
  `);

  const records = [
    {
      id: 'rec-001',
      recordNo: 'TOPO-2026-0142',
      paramVersion: 'v2.3.1',
      status: 'pending',
      boundaryResult: 'pass',
      remark: '',
      isLateSubmission: 0,
      noMismatch: 0,
      currentVersion: 1,
      createdAt: mk(700),
      updatedAt: mk(700),
    },
    {
      id: 'rec-002',
      recordNo: 'TOPO-2026-142',
      paramVersion: 'v2.3.1',
      status: 'pending',
      boundaryResult: 'unknown',
      remark: '阿乔口头备注：编号好像少一位，明天问下小李',
      isLateSubmission: 0,
      noMismatch: 1,
      currentVersion: 1,
      createdAt: mk(650),
      updatedAt: mk(650),
    },
    {
      id: 'rec-003',
      recordNo: 'TOPO-2026-0143',
      paramVersion: 'v2.2.8',
      status: 'need_evidence',
      boundaryResult: 'unknown',
      remark: '下午才补交，参数版本和之前不一样，待核实',
      isLateSubmission: 1,
      noMismatch: 0,
      currentVersion: 1,
      createdAt: mk(200),
      updatedAt: mk(60),
    },
    {
      id: 'rec-004',
      recordNo: 'TOPO-2026-0144',
      paramVersion: 'v2.3.1',
      status: 'manual_overruled',
      boundaryResult: 'pass',
      remark: '人工改判：原判定 fail，经复核边界条件满足',
      isLateSubmission: 0,
      noMismatch: 0,
      currentVersion: 2,
      createdAt: mk(750),
      updatedAt: mk(180),
    },
    {
      id: 'rec-005',
      recordNo: 'TOPO-2026-0145',
      paramVersion: 'v2.3.1',
      status: 'confirmed',
      boundaryResult: 'pass',
      remark: '',
      isLateSubmission: 0,
      noMismatch: 0,
      currentVersion: 1,
      createdAt: mk(800),
      updatedAt: mk(240),
    },
  ];

  const versions = [
    {
      id: 'ver-001-1',
      recordId: 'rec-001',
      version: 1,
      status: 'pending',
      boundaryResult: 'pass',
      remark: '',
      paramVersion: 'v2.3.1',
      operator: 'system',
      changedAt: mk(700),
    },
    {
      id: 'ver-002-1',
      recordId: 'rec-002',
      version: 1,
      status: 'pending',
      boundaryResult: 'unknown',
      remark: '阿乔口头备注：编号好像少一位，明天问下小李',
      paramVersion: 'v2.3.1',
      operator: '阿乔',
      changedAt: mk(650),
    },
    {
      id: 'ver-003-1',
      recordId: 'rec-003',
      version: 1,
      status: 'need_evidence',
      boundaryResult: 'unknown',
      remark: '下午才补交，参数版本和之前不一样，待核实',
      paramVersion: 'v2.2.8',
      operator: '阿乔',
      changedAt: mk(60),
    },
    {
      id: 'ver-004-1',
      recordId: 'rec-004',
      version: 1,
      status: 'pending',
      boundaryResult: 'fail',
      remark: '',
      paramVersion: 'v2.3.1',
      operator: 'system',
      changedAt: mk(750),
    },
    {
      id: 'ver-004-2',
      recordId: 'rec-004',
      version: 2,
      status: 'manual_overruled',
      boundaryResult: 'pass',
      remark: '人工改判：原判定 fail，经复核边界条件满足',
      paramVersion: 'v2.3.1',
      operator: '阿乔',
      changedAt: mk(180),
    },
    {
      id: 'ver-005-1',
      recordId: 'rec-005',
      version: 1,
      status: 'confirmed',
      boundaryResult: 'pass',
      remark: '',
      paramVersion: 'v2.3.1',
      operator: '阿乔',
      changedAt: mk(240),
    },
  ];

  const tx = db.transaction(() => {
    for (const r of records) insertRecord.run(r as any);
    for (const v of versions) insertVersion.run(v as any);
  });
  tx();

  for (const r of records) {
    seedComputationSteps(r.id, r as any);
  }
}

function seedComputationSteps(recordId: string, record: any) {
  const insertStep = db.prepare(`
    INSERT INTO computation_steps (id, record_id, step_id, title, description, input_json, output_json, passed, contributes_to_conclusion, timestamp)
    VALUES (@id, @recordId, @stepId, @title, @description, @inputJson, @outputJson, @passed, @contributesToConclusion, @timestamp)
  `);

  const now = new Date().toISOString();
  const steps = [];

  if (record.noMismatch) {
    steps.push({
      id: `${recordId}-step-1`,
      recordId,
      stepId: 1,
      title: '编号一致性检查',
      description: '校验 recordNo 是否符合 TOPO-YYYY-NNNN 四位序号格式',
      inputJson: JSON.stringify({ recordNo: record.recordNo, pattern: 'TOPO-\\d{4}-\\d{4}' }),
      outputJson: JSON.stringify({ matched: false, expected: 'TOPO-YYYY-NNNN', actual: record.recordNo }),
      passed: 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-2`,
      recordId,
      stepId: 2,
      title: '参数版本校验',
      description: '检查参数版本号是否符合 vMAJOR.MINOR.PATCH 格式',
      inputJson: JSON.stringify({ paramVersion: record.paramVersion }),
      outputJson: JSON.stringify({ valid: true, version: record.paramVersion }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-3`,
      recordId,
      stepId: 3,
      title: '拓扑边界判定',
      description: '基于编号异常无法完成边界判定，标记为 unknown',
      inputJson: JSON.stringify({ numberValid: false, versionValid: true }),
      outputJson: JSON.stringify({ result: 'unknown', reason: '编号不一致，跳过边界计算' }),
      passed: 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
  } else if (record.isLateSubmission) {
    steps.push({
      id: `${recordId}-step-1`,
      recordId,
      stepId: 1,
      title: '编号一致性检查',
      description: '校验 recordNo 是否符合 TOPO-YYYY-NNNN 四位序号格式',
      inputJson: JSON.stringify({ recordNo: record.recordNo }),
      outputJson: JSON.stringify({ matched: true }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-2`,
      recordId,
      stepId: 2,
      title: '参数版本校验',
      description: '当前基准 v2.3.x，迟到材料使用的是 v2.2.8，低于基准',
      inputJson: JSON.stringify({ paramVersion: record.paramVersion, baseline: 'v2.3.x' }),
      outputJson: JSON.stringify({ belowBaseline: true, diff: 'v2.2.8 < v2.3.x' }),
      passed: 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-3`,
      recordId,
      stepId: 3,
      title: '拓扑边界判定',
      description: '参数版本低于基准，需人工补证据后再判定',
      inputJson: JSON.stringify({ versionValid: false }),
      outputJson: JSON.stringify({ result: 'unknown', reason: '版本低于基准，待补证据' }),
      passed: 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
  } else if (record.status === 'manual_overruled') {
    steps.push({
      id: `${recordId}-step-1`,
      recordId,
      stepId: 1,
      title: '编号一致性检查',
      description: '校验 recordNo 是否符合 TOPO-YYYY-NNNN 四位序号格式',
      inputJson: JSON.stringify({ recordNo: record.recordNo }),
      outputJson: JSON.stringify({ matched: true }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-2`,
      recordId,
      stepId: 2,
      title: '参数版本校验',
      description: '参数版本 v2.3.1 符合基准',
      inputJson: JSON.stringify({ paramVersion: record.paramVersion, baseline: 'v2.3.x' }),
      outputJson: JSON.stringify({ valid: true }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-3`,
      recordId,
      stepId: 3,
      title: '拓扑边界初判',
      description: '系统基于路径边界阈值初判为不通过',
      inputJson: JSON.stringify({ pathLength: 14, threshold: 12, nodeCount: 7 }),
      outputJson: JSON.stringify({ result: 'fail', reason: 'pathLength 14 > threshold 12' }),
      passed: 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-4`,
      recordId,
      stepId: 4,
      title: '人工改判覆盖',
      description: '复核员阿乔手动将结论改为 pass，附说明',
      inputJson: JSON.stringify({ operator: '阿乔', originalResult: 'fail' }),
      outputJson: JSON.stringify({ overriddenTo: 'pass', remark: '边界条件特殊节点豁免' }),
      passed: 1,
      contributesToConclusion: 1,
      timestamp: now,
    });
  } else {
    steps.push({
      id: `${recordId}-step-1`,
      recordId,
      stepId: 1,
      title: '编号一致性检查',
      description: '校验 recordNo 是否符合 TOPO-YYYY-NNNN 四位序号格式',
      inputJson: JSON.stringify({ recordNo: record.recordNo }),
      outputJson: JSON.stringify({ matched: true }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-2`,
      recordId,
      stepId: 2,
      title: '参数版本校验',
      description: '参数版本符合基准',
      inputJson: JSON.stringify({ paramVersion: record.paramVersion }),
      outputJson: JSON.stringify({ valid: true }),
      passed: 1,
      contributesToConclusion: 0,
      timestamp: now,
    });
    steps.push({
      id: `${recordId}-step-3`,
      recordId,
      stepId: 3,
      title: '拓扑边界判定',
      description: `路径长度与节点数均在阈值内，结论为 ${record.boundaryResult}`,
      inputJson: JSON.stringify({ pathLength: 9, threshold: 12, nodeCount: 5 }),
      outputJson: JSON.stringify({ result: record.boundaryResult }),
      passed: record.boundaryResult === 'pass' ? 1 : 0,
      contributesToConclusion: 1,
      timestamp: now,
    });
  }

  const tx = db.transaction(() => {
    for (const s of steps) insertStep.run(s as any);
  });
  tx();
}

export default db;
