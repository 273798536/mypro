-- 检查记录表
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  garage_code TEXT NOT NULL,
  scope TEXT,
  base_unit TEXT NOT NULL DEFAULT 'mm',
  status TEXT NOT NULL DEFAULT 'pending',
  min_clearance_required REAL NOT NULL DEFAULT 2200,
  current_batch_id TEXT,
  last_editor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 剖面参数表（每个 batch 一条）
CREATE TABLE IF NOT EXISTS section_params (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  beam_height REAL NOT NULL DEFAULT 600,
  pipe_diameter REAL NOT NULL DEFAULT 150,
  ceiling_thickness REAL NOT NULL DEFAULT 50,
  slab_thickness REAL NOT NULL DEFAULT 200,
  floor_elevation REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);

-- 测量点表（截图清单）
CREATE TABLE IF NOT EXISTS measure_points (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  section_line_id TEXT,
  code TEXT NOT NULL,
  coord_x REAL NOT NULL,
  coord_y REAL NOT NULL,
  coord_z REAL NOT NULL,
  measured_value REAL NOT NULL,
  calculated_clearance REAL,
  is_abnormal INTEGER NOT NULL DEFAULT 0,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'normal',
  remark TEXT,
  handling_opinion TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);

-- 变更历史表
CREATE TABLE IF NOT EXISTS change_history (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  operator TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_measure_points_inspection ON measure_points(inspection_id);
CREATE INDEX IF NOT EXISTS idx_measure_points_batch ON measure_points(batch_id);
CREATE INDEX IF NOT EXISTS idx_history_inspection ON change_history(inspection_id);
CREATE INDEX IF NOT EXISTS idx_history_batch ON change_history(batch_id);
