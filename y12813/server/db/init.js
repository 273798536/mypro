const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, 'insect_trap.db')

let SQL = null
let db = null
let saveTimer = null

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      const data = db.export()
      fs.writeFileSync(dbPath, data)
    } catch (e) {
      console.error('保存数据库失败:', e.message)
    }
  }, 100)
}

function convertRow(columns, values) {
  const obj = {}
  columns.forEach((col, i) => { obj[col] = values[i] })
  return obj
}

function createStatement(sql) {
  const inner = origPrepare(sql)
  return {
    run(...args) {
      try {
        if (args.length === 1 && Array.isArray(args[0])) {
          inner.bind(args[0])
        } else if (args.length > 0) {
          inner.bind(args)
        }
        inner.step()
        inner.reset()
        scheduleSave()
        const lastRow = origExec('SELECT last_insert_rowid() as id')
        const changesRow = origExec('SELECT changes() as c')
        const info = {
          lastInsertRowid: lastRow[0]?.values?.[0]?.[0],
          changes: changesRow[0]?.values?.[0]?.[0] || 0
        }
        return info
      } catch (e) {
        inner.reset()
        throw e
      }
    },
    get(...args) {
      try {
        if (args.length === 1 && Array.isArray(args[0])) {
          inner.bind(args[0])
        } else if (args.length > 0) {
          inner.bind(args)
        }
        if (inner.step()) {
          const cols = inner.getColumnNames()
          const vals = inner.get()
          inner.reset()
          return convertRow(cols, vals)
        }
        inner.reset()
        return undefined
      } catch (e) {
        inner.reset()
        throw e
      }
    },
    all(...args) {
      try {
        if (args.length === 1 && Array.isArray(args[0])) {
          inner.bind(args[0])
        } else if (args.length > 0) {
          inner.bind(args)
        }
        const cols = inner.getColumnNames()
        const rows = []
        while (inner.step()) {
          rows.push(convertRow(cols, inner.get()))
        }
        inner.reset()
        return rows
      } catch (e) {
        inner.reset()
        throw e
      }
    },
    free() {
      try { inner.free() } catch (e) {}
    }
  }
}

async function initDatabase() {
  if (db) return db

  SQL = await initSqlJs()

  let fileBuffer = null
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath)
    console.log('加载已有数据库文件:', dbPath)
  } else {
    console.log('创建新数据库文件:', dbPath)
  }

  db = new SQL.Database(fileBuffer)

  db.pragma = (s) => { db.run('PRAGMA ' + s) }

  origPrepare = db.prepare.bind(db)
  db.prepare = (sql) => createStatement(sql)

  origExec = db.exec.bind(db)
  db.exec = function(sql) {
    const results = origExec(sql)
    scheduleSave()
    return results
  }

  initSchema()
  scheduleSave()

  console.log('数据库初始化完成')
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sampling_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      area TEXT,
      building TEXT,
      floor TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS trap_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_no TEXT UNIQUE NOT NULL,
      trap_date TEXT NOT NULL,
      operator TEXT NOT NULL,
      trap_type TEXT,
      weather TEXT,
      temperature REAL,
      humidity REAL,
      remark TEXT,
      has_batch_effect INTEGER DEFAULT 0,
      batch_effect_note TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS trap_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_no TEXT UNIQUE NOT NULL,
      batch_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      trap_start_time TEXT,
      trap_end_time TEXT,
      insect_count INTEGER DEFAULT 0,
      insect_types TEXT,
      sample_status TEXT DEFAULT 'pending',
      quality_score REAL,
      photo_path TEXT,
      collected_by TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      conclusion TEXT,
      source_import_id INTEGER,
      is_duplicate INTEGER DEFAULT 0,
      duplicate_of_id INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS review_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      reviewer TEXT NOT NULL,
      comment TEXT NOT NULL,
      comment_type TEXT DEFAULT 'review',
      previous_status TEXT,
      new_status TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      import_batch_no TEXT UNIQUE NOT NULL,
      file_name TEXT,
      total_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      duplicate_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      imported_by TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS record_changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by TEXT,
      changed_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `)

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_records_batch ON trap_records(batch_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_records_location ON trap_records(location_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_records_status ON trap_records(sample_status)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_records_import ON trap_records(source_import_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_review_record ON review_comments(record_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_changelog_record ON record_changelog(record_id)`)
  } catch (e) {
    console.warn('索引创建提示:', e.message)
  }

  db.transaction = (fn) => {
    return (...args) => {
      db.exec('BEGIN TRANSACTION')
      try {
        const result = fn(...args)
        db.exec('COMMIT')
        return result
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    }
  }

  console.log('数据库Schema初始化完成')
}

module.exports = initDatabase
