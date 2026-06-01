const Database = require('better-sqlite3');
const path = require('path');
const config = require('../../config.json');

let db;

function initDB() {
  const dbPath = path.join(__dirname, '../../', config.database.path);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  createTables();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      width REAL NOT NULL,
      depth REAL NOT NULL,
      height REAL NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_latest INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shelves (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      code TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      width REAL NOT NULL,
      depth REAL NOT NULL,
      height REAL NOT NULL,
      level_count INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_latest INTEGER DEFAULT 1,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS forbidden_zones (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      width REAL NOT NULL,
      depth REAL NOT NULL,
      height REAL NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_latest INTEGER DEFAULT 1,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS blind_zones (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      name TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      width REAL NOT NULL,
      depth REAL NOT NULL,
      height REAL NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_latest INTEGER DEFAULT 1,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS drone_routes (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_latest INTEGER DEFAULT 1,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS route_waypoints (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      action TEXT,
      FOREIGN KEY (route_id) REFERENCES drone_routes(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_tasks (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      drone_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inspection_results (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      result_hash TEXT NOT NULL,
      total_points INTEGER NOT NULL,
      passed_points INTEGER NOT NULL,
      has_forbidden_zone_violation INTEGER DEFAULT 0,
      has_blind_zone_miss INTEGER DEFAULT 0,
      has_height_violation INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES inspection_tasks(id),
      FOREIGN KEY (route_id) REFERENCES drone_routes(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_violations (
      id TEXT PRIMARY KEY,
      result_id TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      location_x REAL,
      location_y REAL,
      location_z REAL,
      suggestion TEXT NOT NULL,
      affected_shelf_code TEXT,
      waypoint_sequence INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_id) REFERENCES inspection_results(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_reports (
      id TEXT PRIMARY KEY,
      result_id TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (result_id) REFERENCES inspection_results(id)
    );

    CREATE INDEX IF NOT EXISTS idx_warehouses_latest ON warehouses(is_latest);
    CREATE INDEX IF NOT EXISTS idx_shelves_code ON shelves(code, is_latest);
    CREATE INDEX IF NOT EXISTS idx_shelves_warehouse ON shelves(warehouse_id, is_latest);
    CREATE INDEX IF NOT EXISTS idx_routes_warehouse ON drone_routes(warehouse_id, is_latest);
    CREATE INDEX IF NOT EXISTS idx_results_hash ON inspection_results(result_hash);
    CREATE INDEX IF NOT EXISTS idx_violations_type ON inspection_violations(violation_type);
  `);
}

function getDB() {
  if (!db) {
    initDB();
  }
  return db;
}

module.exports = { initDB, getDB, createTables };
