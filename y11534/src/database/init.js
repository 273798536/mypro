const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config');

const dbDir = path.dirname(config.DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = require('./connection');

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          real_name TEXT NOT NULL,
          role TEXT NOT NULL,
          branch TEXT,
          phone TEXT,
          email TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS teller_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_no TEXT NOT NULL,
          teller_id TEXT NOT NULL,
          teller_name TEXT NOT NULL,
          branch TEXT NOT NULL,
          schedule_date DATE NOT NULL,
          shift_type TEXT NOT NULL,
          start_time TEXT,
          end_time TEXT,
          window_no TEXT,
          is_training INTEGER DEFAULT 0,
          training_note TEXT,
          lunch_start TEXT,
          lunch_end TEXT,
          status TEXT NOT NULL,
          original_data TEXT,
          processing_opinion TEXT,
          is_dirty INTEGER DEFAULT 0,
          dirty_type TEXT,
          dirty_details TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(batch_no, teller_id, schedule_date)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS leave_forms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_no TEXT NOT NULL,
          form_no TEXT UNIQUE,
          teller_id TEXT NOT NULL,
          teller_name TEXT NOT NULL,
          branch TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_count REAL,
          reason TEXT,
          approver_name TEXT,
          status TEXT NOT NULL,
          original_data TEXT,
          processing_opinion TEXT,
          is_dirty INTEGER DEFAULT 0,
          dirty_type TEXT,
          dirty_details TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS business_forecasts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_no TEXT NOT NULL,
          forecast_date DATE NOT NULL,
          branch TEXT NOT NULL,
          window_count INTEGER,
          expected_customers INTEGER,
          expected_transactions INTEGER,
          peak_hours TEXT,
          remarks TEXT,
          status TEXT NOT NULL,
          original_data TEXT,
          processing_opinion TEXT,
          is_dirty INTEGER DEFAULT 0,
          dirty_type TEXT,
          dirty_details TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(batch_no, forecast_date, branch)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS supplier_bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_no TEXT NOT NULL,
          bill_no TEXT NOT NULL,
          supplier_name TEXT NOT NULL,
          branch TEXT NOT NULL,
          bill_date DATE NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          items TEXT,
          quantity INTEGER,
          payment_status TEXT,
          status TEXT NOT NULL,
          original_data TEXT,
          processing_opinion TEXT,
          is_dirty INTEGER DEFAULT 0,
          dirty_type TEXT,
          dirty_details TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(batch_no, bill_no)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS workflow_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_type TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          from_status TEXT,
          to_status TEXT,
          operator_id INTEGER,
          operator_name TEXT,
          operator_role TEXT,
          reason TEXT,
          change_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          username TEXT,
          action TEXT NOT NULL,
          module TEXT NOT NULL,
          record_id INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          request_params TEXT,
          response_status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS batch_processing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_no TEXT UNIQUE NOT NULL,
          record_type TEXT NOT NULL,
          total_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          dirty_count INTEGER DEFAULT 0,
          duplicate_count INTEGER DEFAULT 0,
          duplicate_strategy TEXT,
          duplicate_details TEXT,
          status TEXT DEFAULT 'processing',
          processed_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS field_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          module TEXT NOT NULL,
          field_name TEXT NOT NULL,
          can_view INTEGER DEFAULT 0,
          can_edit INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role, module, field_name)
        )
      `);

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_schedules_branch_date ON teller_schedules(branch, schedule_date);
        CREATE INDEX IF NOT EXISTS idx_schedules_status ON teller_schedules(status);
        CREATE INDEX IF NOT EXISTS idx_leave_teller ON leave_forms(teller_id);
        CREATE INDEX IF NOT EXISTS idx_forecast_date ON business_forecasts(forecast_date);
        CREATE INDEX IF NOT EXISTS idx_workflow_record ON workflow_records(record_type, record_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const initFieldPermissions = () => {
  return new Promise((resolve, reject) => {
    const permissions = [
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'id', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'batch_no', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'teller_id', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'teller_name', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'branch', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'schedule_date', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'shift_type', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'start_time', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'end_time', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'window_no', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'is_training', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'training_note', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'lunch_start', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'lunch_end', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'status', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'original_data', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'processing_opinion', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'is_dirty', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'dirty_type', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'dirty_details', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'created_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'created_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'updated_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'teller_schedules', field_name: 'updated_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'id', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'form_no', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'teller_id', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'teller_name', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'branch', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'leave_type', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'start_date', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'end_date', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'days_count', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'reason', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'approver_name', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'status', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'processing_opinion', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'is_dirty', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'dirty_type', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'dirty_details', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'original_data', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'created_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'created_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'updated_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'leave_forms', field_name: 'updated_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'id', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'batch_no', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'branch', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'forecast_date', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'window_count', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'expected_customers', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'expected_transactions', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'peak_hours', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'remarks', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'status', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'processing_opinion', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'is_dirty', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'dirty_type', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'dirty_details', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'original_data', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'created_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'created_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'updated_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'business_forecasts', field_name: 'updated_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'id', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'batch_no', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'bill_no', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'supplier_name', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'branch', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'bill_date', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'items', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'quantity', can_view: 1, can_edit: 1 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'amount', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'payment_status', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'status', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'processing_opinion', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'is_dirty', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'dirty_type', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'dirty_details', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'original_data', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'created_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'created_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'updated_by', can_view: 0, can_edit: 0 },
      { role: config.ROLES.DATA_ENTRY, module: 'supplier_bills', field_name: 'updated_at', can_view: 1, can_edit: 0 },
      { role: config.ROLES.REVIEWER, module: 'teller_schedules', field_name: '*', can_view: 1, can_edit: 0 },
      { role: config.ROLES.REVIEWER, module: 'leave_forms', field_name: '*', can_view: 1, can_edit: 0 },
      { role: config.ROLES.REVIEWER, module: 'business_forecasts', field_name: '*', can_view: 1, can_edit: 0 },
      { role: config.ROLES.REVIEWER, module: 'supplier_bills', field_name: '*', can_view: 1, can_edit: 0 },
      { role: config.ROLES.SUPERVISOR, module: '*', field_name: '*', can_view: 1, can_edit: 1 },
      { role: config.ROLES.VIEW_ONLY, module: '*', field_name: '*', can_view: 1, can_edit: 0 }
    ];

    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO field_permissions (role, module, field_name, can_view, can_edit)
        VALUES (?, ?, ?, ?, ?)
      `);

      let completed = 0;
      permissions.forEach(p => {
        stmt.run(p.role, p.module, p.field_name, p.can_view, p.can_edit, (err) => {
          if (err) reject(err);
          completed++;
          if (completed === permissions.length) {
            stmt.finalize();
            resolve();
          }
        });
      });
    });
  });
};

const initDefaultUsers = () => {
  return new Promise((resolve, reject) => {
    const users = [
      { username: 'admin', password: 'admin123', real_name: '系统管理员', role: config.ROLES.SUPERVISOR, branch: '总行' },
      { username: 'entry1', password: 'entry123', real_name: '录入员张三', role: config.ROLES.DATA_ENTRY, branch: '朝阳支行' },
      { username: 'reviewer1', password: 'review123', real_name: '复核员李四', role: config.ROLES.REVIEWER, branch: '朝阳支行' },
      { username: 'viewer1', password: 'view123', real_name: '行长王五', role: config.ROLES.VIEW_ONLY, branch: '朝阳支行' }
    ];

    db.serialize(() => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO users (username, password_hash, real_name, role, branch)
        VALUES (?, ?, ?, ?, ?)
      `);

      let completed = 0;
      users.forEach(user => {
        const hash = bcrypt.hashSync(user.password, 10);
        stmt.run(user.username, hash, user.real_name, user.role, user.branch, (err) => {
          if (err) reject(err);
          completed++;
          if (completed === users.length) {
            stmt.finalize();
            resolve();
          }
        });
      });
    });
  });
};

const init = async () => {
  try {
    console.log('开始初始化数据库...');
    await createTables();
    console.log('表创建完成');
    
    await initFieldPermissions();
    console.log('字段权限初始化完成');
    
    await initDefaultUsers();
    console.log('默认用户创建完成');
    
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err);
        process.exit(1);
      }
      
      console.log('数据库初始化完成!');
      console.log('默认账号:');
      console.log('  主管(Supervisor): admin / admin123');
      console.log('  录入员(Data Entry): entry1 / entry123');
      console.log('  复核员(Reviewer): reviewer1 / review123');
      console.log('  只读(支行行长): viewer1 / view123');
      
      process.exit(0);
    });
  } catch (err) {
    console.error('初始化失败:', err);
    process.exit(1);
  }
};

init();
