-- 材料批次表
CREATE TABLE IF NOT EXISTS material_batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('annotation_record', 'segmentation_list', 'training_sample')),
  file_name TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  error_records INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 对话记录表
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  customer_text TEXT NOT NULL,
  robot_text TEXT,
  full_context TEXT,
  truncated INTEGER DEFAULT 0,
  truncation_reason TEXT,
  source_file TEXT NOT NULL,
  source_row INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  original_annotation TEXT NOT NULL,
  ai_prediction TEXT NOT NULL,
  ai_confidence REAL NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('high', 'medium', 'low', 'normal')),
  drift_score REAL DEFAULT 0,
  batch_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES material_batches(id)
);

-- 版本追踪表
CREATE TABLE IF NOT EXISTS version_records (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  version_type TEXT NOT NULL CHECK (version_type IN ('annotation', 'prediction', 'manual', 'rollback')),
  intent TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  remark TEXT,
  operator TEXT NOT NULL,
  prompt_version_id TEXT,
  training_sample_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  parent_version_id TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id),
  FOREIGN KEY (parent_version_id) REFERENCES version_records(id)
);

-- 复核记录表
CREATE TABLE IF NOT EXISTS review_records (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  original_intent TEXT NOT NULL,
  corrected_intent TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'pending')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- 提示词版本表
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  description TEXT,
  effective_from DATETIME NOT NULL,
  effective_to DATETIME,
  is_active INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 报告表
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  batch_ids TEXT,
  format TEXT NOT NULL,
  include_technical_details INTEGER DEFAULT 0,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  generated_by TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_batch_id ON conversations(batch_id);
CREATE INDEX IF NOT EXISTS idx_conversations_risk_level ON conversations(risk_level);
CREATE INDEX IF NOT EXISTS idx_version_records_conversation_id ON version_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_review_records_conversation_id ON review_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_status ON material_batches(status);
