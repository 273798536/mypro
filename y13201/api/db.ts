import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dbDir = join(__dirname, '..', 'data')
const dbPath = join(dbDir, 'conflicts.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function initDb(): Database.Database {
  if (db) return db

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables(db)
  seedData(db)

  return db
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'auth_expired', 'name_mismatch')),
      note TEXT NOT NULL DEFAULT '',
      auth_expired INTEGER NOT NULL DEFAULT 0,
      auth_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      batch INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      conflict_id TEXT,
      is_supplementary INTEGER NOT NULL DEFAULT 0,
      confirmed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (conflict_id) REFERENCES conflicts(id)
    );
    CREATE TABLE IF NOT EXISTS note_history (
      id TEXT PRIMARY KEY,
      conflict_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_supplementary INTEGER NOT NULL DEFAULT 0,
      operator_role TEXT NOT NULL DEFAULT 'manager' CHECK(operator_role IN ('manager', 'coordinator', 'teacher')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conflict_id) REFERENCES conflicts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
    CREATE INDEX IF NOT EXISTS idx_tracks_batch ON tracks(batch);
    CREATE INDEX IF NOT EXISTS idx_tracks_conflict_id ON tracks(conflict_id);
    CREATE INDEX IF NOT EXISTS idx_note_history_conflict_id ON note_history(conflict_id);
  `)
}

function seedData(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM conflicts').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertConflict = db.prepare(`
    INSERT INTO conflicts (id, title, status, note, auth_expired, auth_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTrack = db.prepare(`
    INSERT INTO tracks (id, name, display_name, batch, submitted_at, conflict_id, is_supplementary, confirmed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertNote = db.prepare(`
    INSERT INTO note_history (id, conflict_id, content, is_supplementary, operator_role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const c1 = crypto.randomUUID()
    const c2 = crypto.randomUUID()
    const c3 = crypto.randomUUID()
    const c4 = crypto.randomUUID()
    const c5 = crypto.randomUUID()
    const c6 = crypto.randomUUID()

    insertConflict.run(c1, '北京站耳返冲突', 'normal', '耳返设备分配时段重叠，需要重新协调安排', 0, '', '2024-01-05T10:00:00Z', '2024-01-06T14:30:00Z')
    insertConflict.run(c2, '上海站耳返频段冲突', 'auth_expired', '频段授权已到期，需要续期才能使用', 1, '频段B授权于2024-01-01到期，需联系设备方续期', '2024-01-07T09:00:00Z', '2024-01-08T16:00:00Z')
    insertConflict.run(c3, '广州站曲目衔接冲突', 'name_mismatch', '曲目名不一致: "夜曲" vs "夜的小夜曲"', 0, '', '2024-01-09T11:00:00Z', '2024-01-10T10:00:00Z')
    insertConflict.run(c4, '深圳站备用耳返不足', 'normal', '备用耳返数量不足，需要增调设备', 0, '', '2024-01-11T08:30:00Z', '2024-01-12T09:00:00Z')
    insertConflict.run(c5, '成都站耳返调试时间冲突', 'auth_expired', '设备授权到期，调试时间与其他站点重叠', 1, '设备C类授权于2024-01-03到期', '2024-01-13T13:00:00Z', '2024-01-14T11:00:00Z')
    insertConflict.run(c6, '武汉站耳返信号干扰', 'normal', '现场信号干扰导致耳返频繁断连', 0, '', '2024-01-15T10:30:00Z', '2024-01-16T15:00:00Z')

    const t1 = crypto.randomUUID()
    const t2 = crypto.randomUUID()
    const t3 = crypto.randomUUID()
    const t4 = crypto.randomUUID()
    const t5 = crypto.randomUUID()
    const t6 = crypto.randomUUID()
    const t7 = crypto.randomUUID()
    const t8 = crypto.randomUUID()
    const t9 = crypto.randomUUID()
    const t10 = crypto.randomUUID()

    insertTrack.run(t1, '夜曲', '夜曲', 1, '2024-01-10T08:00:00Z', c3, 0, 0)
    insertTrack.run(t2, '晴天', '晴天', 1, '2024-01-10T08:00:00Z', c1, 0, 1)
    insertTrack.run(t3, '七里香', '七里香', 1, '2024-01-10T08:00:00Z', c1, 0, 0)
    insertTrack.run(t4, '稻香', '稻香', 2, '2024-01-15T09:00:00Z', c4, 0, 1)
    insertTrack.run(t5, '青花瓷', '青花瓷', 2, '2024-01-15T09:00:00Z', c6, 0, 0)
    insertTrack.run(t6, '简单爱', '简单爱', 2, '2024-01-15T09:00:00Z', c6, 0, 1)
    insertTrack.run(t7, '夜的小夜曲', '夜的小夜曲', 3, '2024-01-22T10:00:00Z', c3, 1, 0)
    insertTrack.run(t8, '双截棍', '双截棍', 3, '2024-01-22T10:00:00Z', null, 1, 0)
    insertTrack.run(t9, '龙卷风', '龙卷风', 3, '2024-01-22T10:00:00Z', c1, 1, 0)
    insertTrack.run(t10, '听妈妈的话', '听妈妈的话', 3, '2024-01-22T10:00:00Z', null, 1, 0)

    insertNote.run(crypto.randomUUID(), c1, '发现耳返设备时段重叠问题', 0, 'manager', '2024-01-05T10:30:00Z')
    insertNote.run(crypto.randomUUID(), c1, '已联系设备组重新安排时段', 0, 'coordinator', '2024-01-06T14:00:00Z')
    insertNote.run(crypto.randomUUID(), c1, '补充：龙卷风曲目也需要调整耳返', 1, 'teacher', '2024-01-22T11:00:00Z')

    insertNote.run(crypto.randomUUID(), c2, '频段B授权到期，设备无法正常使用', 0, 'manager', '2024-01-07T09:30:00Z')
    insertNote.run(crypto.randomUUID(), c2, '已提交续期申请，等待审批', 0, 'coordinator', '2024-01-08T10:00:00Z')

    insertNote.run(crypto.randomUUID(), c3, '曲目名不一致："夜曲" 与 "夜的小夜曲"', 0, 'manager', '2024-01-09T11:30:00Z')
    insertNote.run(crypto.randomUUID(), c3, '确认为同一曲目不同版本，需要统一命名', 0, 'coordinator', '2024-01-10T09:00:00Z')
    insertNote.run(crypto.randomUUID(), c3, '补充：夜的小夜曲为补录版本', 1, 'teacher', '2024-01-22T12:00:00Z')

    insertNote.run(crypto.randomUUID(), c4, '备用耳返仅余2套，不足巡演需求', 0, 'manager', '2024-01-11T09:00:00Z')
    insertNote.run(crypto.randomUUID(), c4, '已向总部申请增调3套备用设备', 0, 'coordinator', '2024-01-12T08:30:00Z')

    insertNote.run(crypto.randomUUID(), c5, '设备C类授权到期，影响调试进度', 0, 'manager', '2024-01-13T13:30:00Z')
    insertNote.run(crypto.randomUUID(), c5, '续期授权已提交，预计3个工作日完成', 0, 'coordinator', '2024-01-14T10:00:00Z')
    insertNote.run(crypto.randomUUID(), c5, '补充：调试时间需避开成都站演出当天', 1, 'teacher', '2024-01-14T15:00:00Z')

    insertNote.run(crypto.randomUUID(), c6, '现场有无线电干扰，耳返频繁断连', 0, 'manager', '2024-01-15T11:00:00Z')
    insertNote.run(crypto.randomUUID(), c6, '已协调频谱管理部门排查干扰源', 0, 'coordinator', '2024-01-16T09:30:00Z')
  })

  transaction()
}
