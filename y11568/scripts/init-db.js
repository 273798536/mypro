const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/city_lighting.db');
const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await runQuery('BEGIN TRANSACTION');

        await runQuery(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('entry', 'review', 'supervisor', 'readonly')),
            name TEXT NOT NULL,
            department TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS work_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            road_section TEXT NOT NULL,
            light_count INTEGER DEFAULT 0,
            fault_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'closed')),
            description TEXT,
            location TEXT,
            entry_user_id INTEGER,
            review_user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_user_id) REFERENCES users(id),
            FOREIGN KEY (review_user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS inspection_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER NOT NULL,
            photo_url TEXT NOT NULL,
            photo_type TEXT,
            upload_user_id INTEGER,
            remark TEXT,
            is_abnormal INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            FOREIGN KEY (upload_user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS repair_hotlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER NOT NULL,
            caller_name TEXT,
            caller_phone TEXT,
            call_time DATETIME NOT NULL,
            fault_description TEXT,
            handler TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS spare_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER NOT NULL,
            part_batch_no TEXT NOT NULL,
            part_name TEXT NOT NULL,
            part_model TEXT,
            quantity INTEGER DEFAULT 1,
            is_qualified INTEGER DEFAULT 1,
            use_user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            FOREIGN KEY (use_user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS external_receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER NOT NULL,
            receipt_no TEXT UNIQUE NOT NULL,
            receipt_type TEXT,
            content TEXT,
            submit_org TEXT,
            submit_time DATETIME,
            has_exception INTEGER DEFAULT 0,
            exception_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS operation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation_type TEXT NOT NULL,
            table_name TEXT,
            record_id INTEGER,
            user_id INTEGER,
            user_role TEXT,
            before_data TEXT,
            after_data TEXT,
            diff_summary TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS bad_data_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_table TEXT NOT NULL,
            source_data TEXT,
            error_type TEXT NOT NULL,
            error_message TEXT NOT NULL,
            reporter_user_id INTEGER,
            is_resolved INTEGER DEFAULT 0,
            resolved_user_id INTEGER,
            resolved_at DATETIME,
            resolution_note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_user_id) REFERENCES users(id),
            FOREIGN KEY (resolved_user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS reconciliation_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_order_id INTEGER NOT NULL,
            reconciliation_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'matched', 'mismatched', 'manual_fixed')),
            before_state TEXT,
            after_state TEXT,
            operator_user_id INTEGER,
            remark TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            FOREIGN KEY (operator_user_id) REFERENCES users(id)
          )
        `);

        await runQuery(`
          CREATE TABLE IF NOT EXISTS road_section_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            main_road_section TEXT NOT NULL,
            related_work_order_ids TEXT,
            merge_status TEXT DEFAULT 'pending' CHECK(merge_status IN ('pending', 'merged', 'split', 'manual')),
            operator_user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_user_id) REFERENCES users(id)
          )
        `);

        await runQuery('COMMIT');
        console.log('数据库表结构创建完成');
        resolve();
      } catch (err) {
        await runQuery('ROLLBACK').catch(() => {});
        reject(err);
      }
    });
  });
};

const initUsers = async () => {
  const users = [
    { username: 'entry_user', password: 'entry123', role: 'entry', name: '录入员张三', department: '运维部' },
    { username: 'review_user', password: 'review123', role: 'review', name: '复核员李四', department: '质控部' },
    { username: 'super_user', password: 'super123', role: 'supervisor', name: '主管王五', department: '市政管理处' },
    { username: 'readonly_user', password: 'readonly123', role: 'readonly', name: '查看员赵六', department: '审计部' }
  ];

  await runQuery('BEGIN TRANSACTION');
  
  try {
    for (const user of users) {
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE username = ?', [user.username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!existing) {
        const hash = await bcrypt.hash(user.password, 10);
        await runQuery(
          'INSERT INTO users (username, password, role, name, department) VALUES (?, ?, ?, ?, ?)',
          [user.username, hash, user.role, user.name, user.department]
        );
        console.log(`  创建用户: ${user.username} (${user.role})`);
      } else {
        console.log(`  跳过已存在用户: ${user.username}`);
      }
    }
    
    await runQuery('COMMIT');
    console.log('初始用户创建完成');
  } catch (err) {
    await runQuery('ROLLBACK').catch(() => {});
    throw err;
  }
};

const printUserIds = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, role, name FROM users ORDER BY id', (err, rows) => {
      if (err) reject(err);
      else {
        console.log('\n用户ID映射:');
        rows.forEach(u => {
          console.log(`  id=${u.id}: ${u.username} (${u.role}) - ${u.name}`);
        });
        resolve();
      }
    });
  });
};

const init = async () => {
  try {
    console.log('开始初始化数据库...');
    await initDatabase();
    await initUsers();
    await printUserIds();
    console.log('\n数据库初始化完成!');
    console.log('\n默认账号:');
    console.log('  录入员: entry_user / entry123');
    console.log('  复核员: review_user / review123');
    console.log('  主管:   super_user / super123');
    console.log('  只读:   readonly_user / readonly123');
  } catch (err) {
    console.error('初始化失败:', err);
  } finally {
    db.close();
  }
};

init();
