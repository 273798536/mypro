import db from './database.js'
import { v4 as uuidv4 } from 'uuid'

const id = () => uuidv4()

function createTables() {
  db.exec(`
    DROP TABLE IF EXISTS operation_logs;
    DROP TABLE IF EXISTS exception_items;
    DROP TABLE IF EXISTS deduction_details;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS packages;
    DROP TABLE IF EXISTS ownership_changes;
    DROP TABLE IF EXISTS pet_profiles;
    DROP TABLE IF EXISTS member_accounts;

    CREATE TABLE member_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','frozen','closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE pet_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT NOT NULL DEFAULT '',
      current_owner_id TEXT NOT NULL REFERENCES member_accounts(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE ownership_changes (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pet_profiles(id),
      previous_owner_id TEXT NOT NULL REFERENCES member_accounts(id),
      new_owner_id TEXT NOT NULL REFERENCES member_accounts(id),
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
      confirmed_by TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      member_id TEXT NOT NULL REFERENCES member_accounts(id),
      total_deductions INTEGER NOT NULL,
      used_deductions INTEGER NOT NULL DEFAULT 0,
      remaining_deductions INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','exhausted')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES member_accounts(id),
      pet_id TEXT REFERENCES pet_profiles(id),
      package_id TEXT REFERENCES packages(id),
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('consumption','recharge','refund')),
      is_backfilled INTEGER NOT NULL DEFAULT 0,
      backfill_note TEXT,
      backfilled_at TEXT,
      affected_detail_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE deduction_details (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id),
      package_id TEXT NOT NULL REFERENCES packages(id),
      deduction_count INTEGER NOT NULL DEFAULT 1,
      remaining_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal','duplicate','expired','manual_override')),
      original_status TEXT,
      manual_override_by TEXT,
      manual_override_at TEXT,
      manual_override_reason TEXT,
      backfill_affected INTEGER NOT NULL DEFAULT 0,
      backfill_source_transaction_id TEXT REFERENCES transactions(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE exception_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('ownership_change','package_expired','duplicate_deduction','backfill_impact','amount_anomaly')),
      severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('warning','critical')),
      related_member_id TEXT REFERENCES member_accounts(id),
      related_pet_id TEXT REFERENCES pet_profiles(id),
      related_transaction_id TEXT REFERENCES transactions(id),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','resolved')),
      resolved_by TEXT,
      resolved_at TEXT,
      resolution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE operation_logs (
      id TEXT PRIMARY KEY,
      operator TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function seedData() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const memberIds: string[] = []
  const members = [
    { name: '张伟', phone: '13800001001', balance: 3500, status: 'active' },
    { name: '李娜', phone: '13800001002', balance: 2800, status: 'active' },
    { name: '王芳', phone: '13800001003', balance: 1500, status: 'active' },
    { name: '刘洋', phone: '13800001004', balance: 5200, status: 'active' },
    { name: '陈静', phone: '13800001005', balance: 800, status: 'active' },
    { name: '赵磊', phone: '13800001006', balance: 1200, status: 'frozen' },
    { name: '孙婷', phone: '13800001007', balance: 4100, status: 'active' },
    { name: '周强', phone: '13800001008', balance: 0, status: 'closed' },
  ]

  const insertMember = db.prepare(`
    INSERT INTO member_accounts (id, name, phone, balance, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  for (const m of members) {
    const mid = id()
    memberIds.push(mid)
    const createdAt = '2025-01-' + (10 + members.indexOf(m)).toString().padStart(2, '0') + ' 09:00:00'
    insertMember.run(mid, m.name, m.phone, m.balance, m.status, createdAt, now)
  }

  const petIds: string[] = []
  const pets = [
    { name: '旺财', species: '狗', breed: '金毛', ownerIdx: 0 },
    { name: '咪咪', species: '猫', breed: '英短', ownerIdx: 1 },
    { name: '球球', species: '狗', breed: '柯基', ownerIdx: 2 },
    { name: '小白', species: '猫', breed: '布偶', ownerIdx: 3 },
    { name: '大黄', species: '狗', breed: '中华田园犬', ownerIdx: 4 },
    { name: '花花', species: '猫', breed: '橘猫', ownerIdx: 5 },
    { name: '豆豆', species: '兔', breed: '荷兰垂耳兔', ownerIdx: 6 },
    { name: '毛毛', species: '狗', breed: '萨摩耶', ownerIdx: 7 },
    { name: '团团', species: '猫', breed: '加菲猫', ownerIdx: 0 },
    { name: '小黑', species: '狗', breed: '拉布拉多', ownerIdx: 1 },
    { name: '乖乖', species: '猫', breed: '暹罗猫', ownerIdx: 2 },
    { name: '糖糖', species: '仓鼠', breed: '金丝熊', ownerIdx: 3 },
  ]

  const insertPet = db.prepare(`
    INSERT INTO pet_profiles (id, name, species, breed, current_owner_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const p of pets) {
    const pid = id()
    petIds.push(pid)
    const createdAt = '2025-02-' + (5 + pets.indexOf(p)).toString().padStart(2, '0') + ' 10:00:00'
    insertPet.run(pid, p.name, p.species, p.breed, memberIds[p.ownerIdx], createdAt)
  }

  const insertOwnership = db.prepare(`
    INSERT INTO ownership_changes (id, pet_id, previous_owner_id, new_owner_id, reason, status, confirmed_by, confirmed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const ownershipChanges = [
    { petIdx: 9, prevIdx: 1, newIdx: 0, reason: '朋友赠送', status: 'pending' },
    { petIdx: 4, prevIdx: 4, newIdx: 3, reason: '转让', status: 'confirmed', confirmedBy: '管理员' },
    { petIdx: 11, prevIdx: 3, newIdx: 6, reason: '领养', status: 'pending' },
    { petIdx: 10, prevIdx: 2, newIdx: 5, reason: '代养', status: 'rejected', confirmedBy: '管理员' },
    { petIdx: 5, prevIdx: 5, newIdx: 2, reason: '转赠', status: 'confirmed', confirmedBy: '管理员' },
    { petIdx: 7, prevIdx: 7, newIdx: 0, reason: '转让照顾', status: 'pending' },
  ]

  const ownershipIds: string[] = []
  for (const oc of ownershipChanges) {
    const ocid = id()
    ownershipIds.push(ocid)
    const createdAt = '2025-03-' + (10 + ownershipChanges.indexOf(oc)).toString().padStart(2, '0') + ' 14:00:00'
    const confirmedAt = oc.status === 'confirmed' ? '2025-03-' + (11 + ownershipChanges.indexOf(oc)).toString().padStart(2, '0') + ' 10:00:00' : null
    insertOwnership.run(
      ocid, petIds[oc.petIdx], memberIds[oc.prevIdx], memberIds[oc.newIdx],
      oc.reason, oc.status, oc.confirmedBy || null, confirmedAt, createdAt
    )
  }

  const insertPackage = db.prepare(`
    INSERT INTO packages (id, name, member_id, total_deductions, used_deductions, remaining_deductions, price, expires_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const packagesData = [
    { name: '基础体检套餐', memberIdx: 0, total: 5, used: 3, remaining: 2, price: 500, expires: '2026-12-31', status: 'active' },
    { name: '疫苗套餐', memberIdx: 0, total: 3, used: 3, remaining: 0, price: 600, expires: '2026-06-30', status: 'exhausted' },
    { name: '洗牙套餐', memberIdx: 1, total: 2, used: 1, remaining: 1, price: 300, expires: '2026-09-30', status: 'active' },
    { name: '绝育套餐', memberIdx: 2, total: 1, used: 0, remaining: 1, price: 2000, expires: '2026-12-31', status: 'active' },
    { name: '住院套餐', memberIdx: 3, total: 10, used: 7, remaining: 3, price: 5000, expires: '2026-08-31', status: 'active' },
    { name: '美容套餐', memberIdx: 5, total: 5, used: 3, remaining: 2, price: 800, expires: '2025-04-01', status: 'expired' },
    { name: '基础体检套餐', memberIdx: 4, total: 5, used: 2, remaining: 3, price: 500, expires: '2025-03-01', status: 'expired' },
    { name: '疫苗套餐', memberIdx: 6, total: 3, used: 1, remaining: 2, price: 600, expires: '2026-11-30', status: 'active' },
    { name: '美容套餐', memberIdx: 7, total: 5, used: 3, remaining: 2, price: 800, expires: '2026-10-31', status: 'active' },
    { name: '住院套餐', memberIdx: 0, total: 10, used: 0, remaining: 10, price: 5000, expires: '2025-02-01', status: 'expired' },
  ]

  const packageIds: string[] = []
  for (const pkg of packagesData) {
    const pkgId = id()
    packageIds.push(pkgId)
    const createdAt = '2025-01-' + (15 + packagesData.indexOf(pkg)).toString().padStart(2, '0') + ' 08:00:00'
    insertPackage.run(pkgId, pkg.name, memberIds[pkg.memberIdx], pkg.total, pkg.used, pkg.remaining, pkg.price, pkg.expires + ' 23:59:59', pkg.status, createdAt)
  }

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (id, member_id, pet_id, package_id, amount, type, is_backfilled, backfill_note, backfilled_at, affected_detail_ids, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transactionsData = [
    { memberIdx: 0, petIdx: 0, pkgIdx: 0, amount: 100, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-01 10:30:00' },
    { memberIdx: 0, petIdx: 0, pkgIdx: 0, amount: 100, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-01 10:35:00' },
    { memberIdx: 1, petIdx: 1, pkgIdx: 2, amount: 150, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-02 11:00:00' },
    { memberIdx: 2, petIdx: 2, pkgIdx: 3, amount: 2000, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-03 09:15:00' },
    { memberIdx: 3, petIdx: 3, pkgIdx: 4, amount: 350, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-04 14:20:00' },
    { memberIdx: 5, petIdx: 5, pkgIdx: 5, amount: 160, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-05 16:00:00' },
    { memberIdx: 6, petIdx: 6, pkgIdx: 7, amount: 200, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-06 10:00:00' },
    { memberIdx: 7, petIdx: 7, pkgIdx: 8, amount: 160, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-07 11:30:00' },
    { memberIdx: 0, petIdx: 8, pkgIdx: 0, amount: 100, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-08 09:00:00' },
    { memberIdx: 4, petIdx: 4, pkgIdx: 6, amount: 100, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-09 13:00:00' },
    { memberIdx: 3, petIdx: 3, pkgIdx: 4, amount: 350, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-04 14:25:00' },
    { memberIdx: 0, petIdx: 0, pkgIdx: 0, amount: 100, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-10 15:00:00' },
    { memberIdx: 1, petIdx: 9, pkgIdx: 7, amount: 200, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-11 10:00:00' },
    { memberIdx: 6, petIdx: 6, pkgIdx: 7, amount: 200, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-12 09:30:00' },
    { memberIdx: 2, petIdx: 2, pkgIdx: 3, amount: 0, type: 'recharge', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-13 08:00:00' },
    { memberIdx: 4, petIdx: 4, pkgIdx: 6, amount: 0, type: 'recharge', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-14 08:00:00' },
    { memberIdx: 5, petIdx: 5, pkgIdx: 5, amount: 160, type: 'consumption', backfilled: 1, backfillNote: '补录3月份消费记录', backfilledAt: '2025-05-01 09:00:00', affected: '[]', date: '2025-03-15 14:00:00' },
    { memberIdx: 4, petIdx: 4, pkgIdx: 6, amount: 100, type: 'consumption', backfilled: 1, backfillNote: '补录2月份消费记录', backfilledAt: '2025-05-02 10:00:00', affected: '[]', date: '2025-02-20 11:00:00' },
    { memberIdx: 0, petIdx: null, pkgIdx: null, amount: 3000, type: 'recharge', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-15 09:00:00' },
    { memberIdx: 3, petIdx: null, pkgIdx: null, amount: 5000, type: 'recharge', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-16 09:00:00' },
    { memberIdx: 1, petIdx: 1, pkgIdx: 2, amount: 150, type: 'consumption', backfilled: 1, backfillNote: '补录4月初消费', backfilledAt: '2025-05-03 11:00:00', affected: '[]', date: '2025-04-01 08:30:00' },
    { memberIdx: 6, petIdx: null, pkgIdx: null, amount: 2000, type: 'recharge', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-17 09:00:00' },
    { memberIdx: 0, petIdx: 0, pkgIdx: 9, amount: 500, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-18 14:00:00' },
    { memberIdx: 7, petIdx: 7, pkgIdx: 8, amount: 160, type: 'consumption', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-19 10:30:00' },
    { memberIdx: 3, petIdx: 3, pkgIdx: 4, amount: 350, type: 'refund', backfilled: 0, backfillNote: null, backfilledAt: null, affected: '[]', date: '2025-04-20 16:00:00' },
  ]

  const transactionIds: string[] = []
  for (const t of transactionsData) {
    const tid = id()
    transactionIds.push(tid)
    insertTransaction.run(
      tid, memberIds[t.memberIdx], t.petIdx !== null ? petIds[t.petIdx] : null,
      t.pkgIdx !== null ? packageIds[t.pkgIdx] : null, t.amount, t.type,
      t.backfilled, t.backfillNote, t.backfilledAt, t.affected, t.date
    )
  }

  const insertDeduction = db.prepare(`
    INSERT INTO deduction_details (id, transaction_id, package_id, deduction_count, remaining_count, status, original_status, manual_override_by, manual_override_at, manual_override_reason, backfill_affected, backfill_source_transaction_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const deductionDetails = [
    { tIdx: 0, pkgIdx: 0, count: 1, remaining: 2, status: 'normal' },
    { tIdx: 1, pkgIdx: 0, count: 1, remaining: 1, status: 'duplicate' },
    { tIdx: 2, pkgIdx: 2, count: 1, remaining: 1, status: 'normal' },
    { tIdx: 3, pkgIdx: 3, count: 1, remaining: 0, status: 'normal' },
    { tIdx: 4, pkgIdx: 4, count: 1, remaining: 2, status: 'normal' },
    { tIdx: 5, pkgIdx: 5, count: 1, remaining: 1, status: 'expired' },
    { tIdx: 6, pkgIdx: 7, count: 1, remaining: 1, status: 'normal' },
    { tIdx: 7, pkgIdx: 8, count: 1, remaining: 1, status: 'normal' },
    { tIdx: 8, pkgIdx: 0, count: 1, remaining: 0, status: 'normal' },
    { tIdx: 9, pkgIdx: 6, count: 1, remaining: 2, status: 'expired' },
    { tIdx: 10, pkgIdx: 4, count: 1, remaining: 1, status: 'duplicate' },
    { tIdx: 11, pkgIdx: 0, count: 1, remaining: 0, status: 'normal' },
    { tIdx: 12, pkgIdx: 7, count: 1, remaining: 1, status: 'normal' },
    { tIdx: 13, pkgIdx: 7, count: 1, remaining: 0, status: 'duplicate' },
    { tIdx: 16, pkgIdx: 5, count: 1, remaining: 0, status: 'normal', backfillAffected: 1, backfillSource: 16 },
    { tIdx: 17, pkgIdx: 6, count: 1, remaining: 2, status: 'expired', backfillAffected: 1, backfillSource: 17 },
    { tIdx: 22, pkgIdx: 9, count: 1, remaining: 9, status: 'expired' },
    { tIdx: 23, pkgIdx: 8, count: 1, remaining: 1, status: 'normal' },
  ]

  const deductionIds: string[] = []
  for (const d of deductionDetails) {
    const did = id()
    deductionIds.push(did)
    const t = transactionsData[d.tIdx]
    const overrideBy = d.status === 'manual_override' ? '管理员' : null
    const overrideAt = d.status === 'manual_override' ? now : null
    const overrideReason = d.status === 'manual_override' ? '经核实为正常消费' : null
    const originalStatus = d.status === 'manual_override' ? 'duplicate' : null
    const backfillAffected = (d as any).backfillAffected || 0
    const backfillSource = (d as any).backfillSource !== undefined ? transactionIds[(d as any).backfillSource] : null
    insertDeduction.run(
      did, transactionIds[d.tIdx], packageIds[d.pkgIdx], d.count, d.remaining,
      d.status, originalStatus, overrideBy, overrideAt, overrideReason,
      backfillAffected, backfillSource, t.date
    )
  }

  const insertException = db.prepare(`
    INSERT INTO exception_items (id, type, severity, related_member_id, related_pet_id, related_transaction_id, description, status, resolved_by, resolved_at, resolution, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const exceptions = [
    { type: 'ownership_change', severity: 'warning', memberIdx: 1, petIdx: 9, tIdx: null, desc: '小黑所有权变更待确认：李娜→张伟', status: 'pending' },
    { type: 'package_expired', severity: 'warning', memberIdx: 4, petIdx: 4, tIdx: null, desc: '陈静基础体检套餐已过期，剩余3次未使用', status: 'pending' },
    { type: 'duplicate_deduction', severity: 'critical', memberIdx: 0, petIdx: 0, tIdx: 1, desc: '旺财同日重复扣款，基础体检套餐连续扣除2次', status: 'pending' },
    { type: 'duplicate_deduction', severity: 'critical', memberIdx: 3, petIdx: 3, tIdx: 10, desc: '小白住院套餐重复扣款', status: 'pending' },
    { type: 'backfill_impact', severity: 'warning', memberIdx: 5, petIdx: 5, tIdx: 16, desc: '赵磊美容套餐补录交易影响已有扣款明细', status: 'pending' },
    { type: 'backfill_impact', severity: 'warning', memberIdx: 4, petIdx: 4, tIdx: 17, desc: '陈静基础体检套餐补录交易影响已有扣款明细', status: 'confirmed' },
    { type: 'amount_anomaly', severity: 'critical', memberIdx: 7, petIdx: null, tIdx: null, desc: '周强账户余额为0且状态为已关闭，存在异常', status: 'pending' },
    { type: 'package_expired', severity: 'warning', memberIdx: 0, petIdx: 0, tIdx: null, desc: '张伟住院套餐已过期，剩余10次未使用', status: 'pending' },
  ]

  const exceptionIds: string[] = []
  for (const e of exceptions) {
    const eid = id()
    exceptionIds.push(eid)
    const createdAt = '2025-05-' + (5 + exceptions.indexOf(e)).toString().padStart(2, '0') + ' 10:00:00'
    const resolvedAt = e.status === 'confirmed' ? '2025-05-10 15:00:00' : null
    const resolvedBy = e.status === 'confirmed' ? '管理员' : null
    insertException.run(
      eid, e.type, e.severity,
      e.memberIdx !== null ? memberIds[e.memberIdx] : null,
      e.petIdx !== null ? petIds[e.petIdx] : null,
      e.tIdx !== null ? transactionIds[e.tIdx] : null,
      e.desc, e.status, resolvedBy, resolvedAt, null, createdAt
    )
  }

  const insertLog = db.prepare(`
    INSERT INTO operation_logs (id, operator, action, target_type, target_id, old_value, new_value, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const logs = [
    { operator: '管理员', action: 'create', targetType: 'member', targetIdx: 0, oldVal: null, newVal: '张伟', note: '创建会员账户' },
    { operator: '管理员', action: 'confirm', targetType: 'ownership_change', targetIdx: 1, oldVal: 'pending', newVal: 'confirmed', note: '确认大黄所有权变更' },
    { operator: '管理员', action: 'manual_override', targetType: 'deduction_detail', targetIdx: 0, oldVal: 'duplicate', newVal: 'normal', note: '经核实为正常消费，手动修改扣款状态' },
    { operator: '管理员', action: 'resolve', targetType: 'exception', targetIdx: 5, oldVal: 'pending', newVal: 'confirmed', note: '确认补录交易影响' },
    { operator: '管理员', action: 'create', targetType: 'package', targetIdx: 3, oldVal: null, newVal: '绝育套餐', note: '为王芳创建绝育套餐' },
  ]

  for (const l of logs) {
    const lid = id()
    const createdAt = '2025-05-' + (1 + logs.indexOf(l)).toString().padStart(2, '0') + ' 09:00:00'
    let targetId: string
    if (l.targetType === 'member') targetId = memberIds[l.targetIdx]
    else if (l.targetType === 'ownership_change') targetId = ownershipIds[l.targetIdx]
    else if (l.targetType === 'deduction_detail') targetId = deductionIds[l.targetIdx]
    else if (l.targetType === 'exception') targetId = exceptionIds[l.targetIdx]
    else targetId = packageIds[l.targetIdx]
    insertLog.run(lid, l.operator, l.action, l.targetType, targetId, l.oldVal, l.newVal, l.note, createdAt)
  }
}

export function initDatabase() {
  createTables()
  seedData()
  console.log('Database initialized with seed data')
}
