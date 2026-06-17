-- 奖励模型偏差复核 初始化 schema
-- records: 标注记录，record_id 为自然主键（CSV 中的唯一标识）
CREATE TABLE IF NOT EXISTS records (
  record_id TEXT PRIMARY KEY,
  model_version TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response_a TEXT NOT NULL,
  response_b TEXT NOT NULL,
  human_label TEXT NOT NULL,
  rm_prediction TEXT,
  annotator TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- record_versions: 记录属于哪些导入版本（同一 record_id 可属于多个版本，支撑重导入/补录去重）
CREATE TABLE IF NOT EXISTS record_versions (
  record_id TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  PRIMARY KEY (record_id, version)
);

-- conclusions: 每条记录最多一份结论（record_id 为主键，保证「同一件事不出现两份结论」）
CREATE TABLE IF NOT EXISTS conclusions (
  record_id TEXT PRIMARY KEY REFERENCES records(record_id) ON DELETE CASCADE,
  conclusion TEXT NOT NULL CHECK (conclusion IN ('通过','待确认','驳回')),
  bias_type TEXT,
  severity TEXT,
  reviewer TEXT,
  feedback TEXT,
  concluded_at TEXT NOT NULL,
  version TEXT
);

-- versions: 每次导入生成一个版本快照
CREATE TABLE IF NOT EXISTS versions (
  version TEXT PRIMARY KEY,
  label TEXT,
  created_at TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_records_model_version ON records(model_version);
CREATE INDEX IF NOT EXISTS idx_record_versions_version ON record_versions(version);
CREATE INDEX IF NOT EXISTS idx_conclusions_conclusion ON conclusions(conclusion);
