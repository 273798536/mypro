import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '..', 'data')

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const dbPath = join(dataDir, 'mcs.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    run_at TEXT NOT NULL,
    total_reads INTEGER NOT NULL DEFAULT 0,
    low_quality_reads INTEGER NOT NULL DEFAULT 0,
    anomaly_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS read_qualities (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    read_id TEXT NOT NULL,
    quality_score REAL NOT NULL,
    is_low_quality INTEGER NOT NULL DEFAULT 0,
    reason_category TEXT,
    reason_explanation TEXT,
    anomaly_id TEXT,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
  );

  CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    read_id TEXT NOT NULL,
    culture_record_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
  );

  CREATE TABLE IF NOT EXISTS review_actions (
    id TEXT PRIMARY KEY,
    anomaly_id TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    operator TEXT NOT NULL,
    operated_at TEXT NOT NULL,
    FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
  );

  CREATE TABLE IF NOT EXISTS culture_records (
    id TEXT PRIMARY KEY,
    sample_id TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS culture_record_versions (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    conclusion TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    change_reason TEXT,
    FOREIGN KEY (record_id) REFERENCES culture_records(id)
  );

  CREATE TABLE IF NOT EXISTS processing_records (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    anomaly_id TEXT,
    culture_record_id TEXT,
    action TEXT NOT NULL,
    operator TEXT NOT NULL,
    operated_at TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (batch_id) REFERENCES batches(id)
  );
`)

const countRow = db.prepare('SELECT COUNT(*) as cnt FROM batches').get() as { cnt: number }
if (countRow.cnt === 0) {
  const insertBatch = db.prepare(`
    INSERT INTO batches (id, name, run_at, total_reads, low_quality_reads, anomaly_count, status)
    VALUES (@id, @name, @run_at, @total_reads, @low_quality_reads, @anomaly_count, @status)
  `)
  const insertRead = db.prepare(`
    INSERT INTO read_qualities (id, batch_id, read_id, quality_score, is_low_quality, reason_category, reason_explanation, anomaly_id)
    VALUES (@id, @batch_id, @read_id, @quality_score, @is_low_quality, @reason_category, @reason_explanation, @anomaly_id)
  `)
  const insertAnomaly = db.prepare(`
    INSERT INTO anomalies (id, batch_id, read_id, culture_record_id, status, created_by, created_at)
    VALUES (@id, @batch_id, @read_id, @culture_record_id, @status, @created_by, @created_at)
  `)
  const insertReview = db.prepare(`
    INSERT INTO review_actions (id, anomaly_id, action, reason, operator, operated_at)
    VALUES (@id, @anomaly_id, @action, @reason, @operator, @operated_at)
  `)
  const insertCulture = db.prepare(`
    INSERT INTO culture_records (id, sample_id, conclusion, current_version, updated_at, updated_by)
    VALUES (@id, @sample_id, @conclusion, @current_version, @updated_at, @updated_by)
  `)
  const insertCultureVersion = db.prepare(`
    INSERT INTO culture_record_versions (id, record_id, version, conclusion, changed_by, changed_at, change_reason)
    VALUES (@id, @record_id, @version, @conclusion, @changed_by, @changed_at, @change_reason)
  `)
  const insertProcessing = db.prepare(`
    INSERT INTO processing_records (id, batch_id, anomaly_id, culture_record_id, action, operator, operated_at, reason)
    VALUES (@id, @batch_id, @anomaly_id, @culture_record_id, @action, @operator, @operated_at, @reason)
  `)

  const seed = db.transaction(() => {
    const batch1Id = uuidv4()
    const batch2Id = uuidv4()
    const batch3Id = uuidv4()

    insertBatch.run({
      id: batch1Id,
      name: 'BATCH-2026-001',
      run_at: '2026-05-28T09:15:00Z',
      total_reads: 20,
      low_quality_reads: 5,
      anomaly_count: 2,
      status: 'completed',
    })
    insertBatch.run({
      id: batch2Id,
      name: 'BATCH-2026-002',
      run_at: '2026-06-02T14:30:00Z',
      total_reads: 20,
      low_quality_reads: 4,
      anomaly_count: 2,
      status: 'in_progress',
    })
    insertBatch.run({
      id: batch3Id,
      name: 'BATCH-2026-003',
      run_at: '2026-06-08T10:00:00Z',
      total_reads: 20,
      low_quality_reads: 3,
      anomaly_count: 1,
      status: 'pending',
    })

    const lowQualityReasons = [
      { category: '低平均质量', explanation: '该读段平均质量分数为12，低于阈值20，可能源于测序仪光学系统校准偏差' },
      { category: '3\'端质量衰减', explanation: '3\'端连续8个碱基质量值低于15，提示样本降解或测序试剂老化' },
      { category: '高N率', explanation: '该读段N碱基占比达8.2%，超过阈值5%，疑为测序flow cell气泡干扰所致' },
      { category: ' adaptor残留', explanation: '检测到adapter序列残留，占比6.1%，可能由于文库插入片段过短导致双端测序读穿' },
      { category: 'GC含量异常', explanation: 'GC含量为72.3%，偏离正态分布范围[40%,60%]，提示潜在微生物污染或扩增偏倚' },
    ]

    const readData: Array<{
      id: string; batch_id: string; read_id: string; quality_score: number;
      is_low_quality: number; reason_category: string | null;
      reason_explanation: string | null; anomaly_id: string | null;
    }> = []

    const anomaly1Id = uuidv4()
    const anomaly2Id = uuidv4()
    const anomaly3Id = uuidv4()
    const anomaly4Id = uuidv4()
    const anomaly5Id = uuidv4()
    const culture1Id = uuidv4()
    const culture2Id = uuidv4()
    const culture3Id = uuidv4()
    const culture4Id = uuidv4()

    for (let i = 1; i <= 20; i++) {
      const isLow = i <= 5
      const reason = isLow ? lowQualityReasons[i - 1] : null
      let anomalyId: string | null = null
      if (i === 1) anomalyId = anomaly1Id
      if (i === 2) anomalyId = anomaly2Id
      const qualityScore = isLow ? 8 + Math.floor(Math.random() * 12) : 25 + Math.floor(Math.random() * 20)
      readData.push({
        id: uuidv4(),
        batch_id: batch1Id,
        read_id: `BATCH-2026-001-READ-${String(i).padStart(3, '0')}`,
        quality_score: qualityScore,
        is_low_quality: isLow ? 1 : 0,
        reason_category: reason?.category ?? null,
        reason_explanation: reason?.explanation ?? null,
        anomaly_id: anomalyId,
      })
    }

    for (let i = 1; i <= 20; i++) {
      const isLow = i <= 4
      const reason = isLow ? lowQualityReasons[i - 1] : null
      let anomalyId: string | null = null
      if (i === 1) anomalyId = anomaly3Id
      if (i === 2) anomalyId = anomaly4Id
      const qualityScore = isLow ? 6 + Math.floor(Math.random() * 14) : 22 + Math.floor(Math.random() * 23)
      readData.push({
        id: uuidv4(),
        batch_id: batch2Id,
        read_id: `BATCH-2026-002-READ-${String(i).padStart(3, '0')}`,
        quality_score: qualityScore,
        is_low_quality: isLow ? 1 : 0,
        reason_category: reason?.category ?? null,
        reason_explanation: reason?.explanation ?? null,
        anomaly_id: anomalyId,
      })
    }

    for (let i = 1; i <= 20; i++) {
      const isLow = i <= 3
      const reason = isLow ? lowQualityReasons[i - 1] : null
      let anomalyId: string | null = null
      if (i === 1) anomalyId = anomaly5Id
      const qualityScore = isLow ? 5 + Math.floor(Math.random() * 15) : 24 + Math.floor(Math.random() * 21)
      readData.push({
        id: uuidv4(),
        batch_id: batch3Id,
        read_id: `BATCH-2026-003-READ-${String(i).padStart(3, '0')}`,
        quality_score: qualityScore,
        is_low_quality: isLow ? 1 : 0,
        reason_category: reason?.category ?? null,
        reason_explanation: reason?.explanation ?? null,
        anomaly_id: anomalyId,
      })
    }

    for (const r of readData) {
      insertRead.run(r)
    }

    insertAnomaly.run({
      id: anomaly1Id,
      batch_id: batch1Id,
      read_id: 'BATCH-2026-001-READ-001',
      culture_record_id: culture1Id,
      status: 'approved',
      created_by: '张伟',
      created_at: '2026-05-28T10:30:00Z',
    })
    insertAnomaly.run({
      id: anomaly2Id,
      batch_id: batch1Id,
      read_id: 'BATCH-2026-001-READ-002',
      culture_record_id: culture1Id,
      status: 'rejected',
      created_by: '张伟',
      created_at: '2026-05-28T10:35:00Z',
    })
    insertAnomaly.run({
      id: anomaly3Id,
      batch_id: batch2Id,
      read_id: 'BATCH-2026-002-READ-001',
      culture_record_id: null,
      status: 'pending',
      created_by: '李娜',
      created_at: '2026-06-02T15:00:00Z',
    })
    insertAnomaly.run({
      id: anomaly4Id,
      batch_id: batch2Id,
      read_id: 'BATCH-2026-002-READ-002',
      culture_record_id: null,
      status: 'pending',
      created_by: '李娜',
      created_at: '2026-06-02T15:05:00Z',
    })
    insertAnomaly.run({
      id: anomaly5Id,
      batch_id: batch3Id,
      read_id: 'BATCH-2026-003-READ-001',
      culture_record_id: null,
      status: 'pending',
      created_by: '王强',
      created_at: '2026-06-08T11:00:00Z',
    })

    insertReview.run({
      id: uuidv4(),
      anomaly_id: anomaly1Id,
      action: 'approve',
      reason: '质量分数异常偏低，结合培养记录确认为大肠埃希菌污染，予以通过复核',
      operator: '刘芳',
      operated_at: '2026-05-28T14:20:00Z',
    })
    insertReview.run({
      id: uuidv4(),
      anomaly_id: anomaly2Id,
      action: 'approve',
      reason: '确认为测序污染，3\'端质量衰减模式与已知污染特征匹配',
      operator: '刘芳',
      operated_at: '2026-05-28T14:35:00Z',
    })
    insertReview.run({
      id: uuidv4(),
      anomaly_id: anomaly2Id,
      action: 'reject',
      reason: '二次复核认为：该低质量读段在同源序列中重复出现，排除偶发测序错误，维持低质量标记',
      operator: '陈明',
      operated_at: '2026-05-29T09:10:00Z',
    })

    insertCulture.run({
      id: culture1Id,
      sample_id: 'SMP-2026-001',
      conclusion: '检出大肠埃希菌污染，浓度超出可接受范围',
      current_version: 2,
      updated_at: '2026-05-30T10:00:00Z',
      updated_by: '刘芳',
    })
    insertCulture.run({
      id: culture2Id,
      sample_id: 'SMP-2026-002',
      conclusion: '未检出致病性微生物，样本符合放行标准',
      current_version: 1,
      updated_at: '2026-06-01T09:00:00Z',
      updated_by: '陈明',
    })
    insertCulture.run({
      id: culture3Id,
      sample_id: 'SMP-2026-003',
      conclusion: '检出铜绿假单胞菌，建议复检确认',
      current_version: 3,
      updated_at: '2026-06-05T16:00:00Z',
      updated_by: '张伟',
    })
    insertCulture.run({
      id: culture4Id,
      sample_id: 'SMP-2026-004',
      conclusion: '检出枯草芽孢杆菌，非致病性，但需评估对实验影响',
      current_version: 2,
      updated_at: '2026-06-07T11:30:00Z',
      updated_by: '李娜',
    })

    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture1Id,
      version: 1,
      conclusion: '疑似革兰氏阴性杆菌污染，待进一步鉴定',
      changed_by: '刘芳',
      changed_at: '2026-05-29T09:00:00Z',
      change_reason: '初步培养结果提示革兰氏阴性杆菌',
    })
    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture1Id,
      version: 2,
      conclusion: '检出大肠埃希菌污染，浓度超出可接受范围',
      changed_by: '刘芳',
      changed_at: '2026-05-30T10:00:00Z',
      change_reason: '生化鉴定确认大肠埃希菌',
    })

    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture2Id,
      version: 1,
      conclusion: '未检出致病性微生物，样本符合放行标准',
      changed_by: '陈明',
      changed_at: '2026-06-01T09:00:00Z',
      change_reason: '初始培养鉴定结果',
    })

    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture3Id,
      version: 1,
      conclusion: '疑似非发酵菌，需进一步鉴定',
      changed_by: '张伟',
      changed_at: '2026-06-03T10:00:00Z',
      change_reason: '初步培养结果提示非发酵菌',
    })
    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture3Id,
      version: 2,
      conclusion: '疑似铜绿假单胞菌，等待药敏试验确认',
      changed_by: '张伟',
      changed_at: '2026-06-04T14:00:00Z',
      change_reason: '氧化酶试验阳性，疑似铜绿假单胞菌',
    })
    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture3Id,
      version: 3,
      conclusion: '检出铜绿假单胞菌，建议复检确认',
      changed_by: '张伟',
      changed_at: '2026-06-05T16:00:00Z',
      change_reason: 'VITEK鉴定确认铜绿假单胞菌',
    })

    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture4Id,
      version: 1,
      conclusion: '检出芽孢杆菌属，种属待定',
      changed_by: '李娜',
      changed_at: '2026-06-06T09:00:00Z',
      change_reason: '培养可见芽孢杆菌菌落',
    })
    insertCultureVersion.run({
      id: uuidv4(),
      record_id: culture4Id,
      version: 2,
      conclusion: '检出枯草芽孢杆菌，非致病性，但需评估对实验影响',
      changed_by: '李娜',
      changed_at: '2026-06-07T11:30:00Z',
      change_reason: '16S rRNA测序鉴定为枯草芽孢杆菌',
    })

    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch1Id,
      anomaly_id: anomaly1Id,
      culture_record_id: culture1Id,
      action: '复核通过',
      operator: '刘芳',
      operated_at: '2026-05-28T14:20:00Z',
      reason: '质量分数异常偏低，结合培养记录确认为大肠埃希菌污染，予以通过复核',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch1Id,
      anomaly_id: anomaly2Id,
      culture_record_id: culture1Id,
      action: '复核通过',
      operator: '刘芳',
      operated_at: '2026-05-28T14:35:00Z',
      reason: '确认为测序污染，3\'端质量衰减模式与已知污染特征匹配',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch1Id,
      anomaly_id: anomaly2Id,
      culture_record_id: culture1Id,
      action: '复核驳回',
      operator: '陈明',
      operated_at: '2026-05-29T09:10:00Z',
      reason: '二次复核认为：该低质量读段在同源序列中重复出现，排除偶发测序错误，维持低质量标记',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch2Id,
      anomaly_id: anomaly3Id,
      culture_record_id: culture3Id,
      action: '标记异常',
      operator: '李娜',
      operated_at: '2026-06-02T15:00:00Z',
      reason: '技师发起异常复核申请，关联铜绿假单胞菌培养记录',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch2Id,
      anomaly_id: anomaly4Id,
      culture_record_id: null,
      action: '标记异常',
      operator: '李娜',
      operated_at: '2026-06-02T15:05:00Z',
      reason: '技师发起异常复核申请，等待关联培养记录',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch3Id,
      anomaly_id: anomaly5Id,
      culture_record_id: null,
      action: '标记异常',
      operator: '王强',
      operated_at: '2026-06-08T11:00:00Z',
      reason: '技师发起异常复核申请',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch1Id,
      anomaly_id: anomaly2Id,
      culture_record_id: culture1Id,
      action: '培养记录更新',
      operator: '刘芳',
      operated_at: '2026-05-30T10:00:00Z',
      reason: '生化鉴定确认大肠埃希菌（v1→v2）',
    })
    insertProcessing.run({
      id: uuidv4(),
      batch_id: batch1Id,
      anomaly_id: null,
      culture_record_id: culture2Id,
      action: '培养记录创建',
      operator: '陈明',
      operated_at: '2026-06-01T09:00:00Z',
      reason: '初始培养鉴定结果（SMP-2026-002 v1）',
    })
  })

  seed()
}

export default db
