import { runQuery } from '../config/database';

const initDatabase = async () => {
  console.log('开始初始化数据库...');

  await runQuery(`
    CREATE TABLE IF NOT EXISTS inspection_records (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      deviceName TEXT NOT NULL,
      department TEXT NOT NULL,
      inspectionDate TEXT NOT NULL,
      inspector TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'pending')),
      remarks TEXT,
      photos TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isDeleted INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS calibration_certificates (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      deviceName TEXT NOT NULL,
      certificateNo TEXT NOT NULL,
      calibrationDate TEXT NOT NULL,
      validUntil TEXT NOT NULL,
      calibrationOrg TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('valid', 'expired', 'disabled')),
      certificateFile TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isDeleted INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS repair_quotes (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      deviceName TEXT NOT NULL,
      quoteNo TEXT NOT NULL,
      repairDate TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
      serviceRemarks TEXT,
      manualOpinion TEXT,
      photos TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isDeleted INTEGER DEFAULT 0
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS queue_items (
      id TEXT PRIMARY KEY,
      recordType TEXT NOT NULL CHECK (recordType IN ('inspection', 'calibration', 'repair')),
      recordId TEXT NOT NULL,
      externalReceiptId TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'retrying', 'manual_intervention', 'dead_letter', 'compensated', 'closed')),
      retryCount INTEGER DEFAULT 0,
      maxRetries INTEGER DEFAULT 3,
      dirtyType TEXT NOT NULL CHECK (dirtyType IN ('missing_fields', 'cross_day', 'name_changed', 'amount_conflict', 'quantity_conflict', 'none')),
      dirtyDetails TEXT,
      rawData TEXT NOT NULL,
      errorMessage TEXT,
      assignee TEXT,
      processedAt TEXT,
      nextRetryAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS diff_logs (
      id TEXT PRIMARY KEY,
      queueId TEXT NOT NULL,
      recordType TEXT NOT NULL CHECK (recordType IN ('inspection', 'calibration', 'repair')),
      recordId TEXT NOT NULL,
      action TEXT NOT NULL,
      beforeData TEXT,
      afterData TEXT,
      operator TEXT NOT NULL,
      remarks TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (queueId) REFERENCES queue_items(id)
    )
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_items(status)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_queue_record ON queue_items(recordType, recordId)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_diff_queue ON diff_logs(queueId)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_device_inspection ON inspection_records(deviceId, inspectionDate)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_device_calibration ON calibration_certificates(deviceId, calibrationDate)
  `);

  await runQuery(`
    CREATE INDEX IF NOT EXISTS idx_device_repair ON repair_quotes(deviceId, repairDate)
  `);

  console.log('数据库初始化完成！');
};

initDatabase().catch(console.error);
