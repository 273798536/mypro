#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
园区电费预付摊销系统
====================
支持curl验收的真实数据流程：
- 企业档案、预缴流水、电表读数录入
- 公摊规则配置与版本追溯
- 余额账本主线，扣费顺序统一
- 企业迁出待确认分支
- 读数缺口追踪与责任人标识
- 改动历史记录（公摊补录后可见）
- 月底摊销报表导出
"""

import sqlite3
import json
import csv
import io
from datetime import datetime, date
from flask import Flask, request, jsonify, g, Response
from functools import wraps

app = Flask(__name__)
DATABASE = 'park_elec.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.executescript('''
    CREATE TABLE IF NOT EXISTS enterprises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enterprise_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        floor TEXT,
        room TEXT,
        area REAL,
        status TEXT DEFAULT 'active',
        move_out_pending INTEGER DEFAULT 0,
        move_out_request_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prepayments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enterprise_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT,
        remark TEXT,
        created_by TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enterprise_id INTEGER NOT NULL,
        meter_code TEXT NOT NULL,
        reading_date TEXT NOT NULL,
        start_reading REAL NOT NULL,
        end_reading REAL NOT NULL,
        usage REAL NOT NULL,
        gap_remark TEXT,
        created_by TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
    );

    CREATE TABLE IF NOT EXISTS sharing_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        formula TEXT NOT NULL,
        params TEXT,
        effective_date TEXT NOT NULL,
        expire_date TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sharing_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        total_shared_amount REAL,
        calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        calculated_by TEXT,
        remark TEXT
    );

    CREATE TABLE IF NOT EXISTS balance_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enterprise_id INTEGER NOT NULL,
        period TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance REAL NOT NULL,
        related_id INTEGER,
        related_type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        remark TEXT
    );

    CREATE TABLE IF NOT EXISTS amortization (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enterprise_id INTEGER NOT NULL,
        period TEXT NOT NULL,
        meter_usage REAL,
        meter_amount REAL,
        shared_amount REAL,
        total_amount REAL,
        prepay_deducted REAL,
        closing_balance REAL,
        sharing_version_id INTEGER,
        status TEXT DEFAULT 'draft',
        reviewed_by TEXT,
        reviewed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
        FOREIGN KEY (sharing_version_id) REFERENCES sharing_versions(id)
    );

    CREATE TABLE IF NOT EXISTS change_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        amortization_affected INTEGER DEFAULT 0,
        remark TEXT
    );

    CREATE TABLE IF NOT EXISTS reading_gaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meter_reading_id INTEGER,
        enterprise_id INTEGER,
        gap_type TEXT,
        gap_description TEXT,
        responsible_person TEXT,
        next_action TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meter_reading_id) REFERENCES meter_readings(id)
    );

    CREATE TABLE IF NOT EXISTS system_params (
        key TEXT PRIMARY KEY,
        value TEXT,
        description TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_balance_enterprise ON balance_ledger(enterprise_id, period);
    CREATE INDEX IF NOT EXISTS idx_amortization_period ON amortization(period);
    CREATE INDEX IF NOT EXISTS idx_amortization_enterprise ON amortization(enterprise_id, period);
    ''')

    c.execute("INSERT OR IGNORE INTO system_params (key, value, description) VALUES (?, ?, ?)",
              ('electricity_price', '1.2', '基础电价(元/度)'))
    c.execute("INSERT OR IGNORE INTO system_params (key, value, description) VALUES (?, ?, ?)",
              ('deduction_order', 'prepayment,arrears', '扣费顺序'))

    conn.commit()
    conn.close()

def log_change(db, table_name, record_id, field_name, old_value, new_value, changed_by, amortization_affected=0, remark=''):
    db.execute('''INSERT INTO change_history 
        (table_name, record_id, field_name, old_value, new_value, changed_by, amortization_affected, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (table_name, record_id, field_name, str(old_value) if old_value else None,
         str(new_value) if new_value else None, changed_by, amortization_affected, remark))

def get_param(db, key):
    row = db.execute("SELECT value FROM system_params WHERE key = ?", (key,)).fetchone()
    return row['value'] if row else None

def get_enterprise_balance(db, enterprise_id, period=None):
    if period:
        row = db.execute('''SELECT balance FROM balance_ledger 
            WHERE enterprise_id = ? AND period <= ? 
            ORDER BY id DESC LIMIT 1''', (enterprise_id, period)).fetchone()
    else:
        row = db.execute('''SELECT balance FROM balance_ledger 
            WHERE enterprise_id = ? 
            ORDER BY id DESC LIMIT 1''', (enterprise_id,)).fetchone()
    return row['balance'] if row else 0.0

def add_balance_transaction(db, enterprise_id, period, tx_type, amount, related_id=None, related_type=None, remark=''):
    current_balance = get_enterprise_balance(db, enterprise_id, period)
    new_balance = current_balance + amount
    db.execute('''INSERT INTO balance_ledger 
        (enterprise_id, period, transaction_type, amount, balance, related_id, related_type, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (enterprise_id, period, tx_type, amount, new_balance, related_id, related_type, remark))
    return new_balance

def check_reading_gaps(db, enterprise_id, period):
    gaps = []
    year, month = map(int, period.split('-'))
    
    readings = db.execute('''SELECT * FROM meter_readings 
        WHERE enterprise_id = ? AND strftime('%Y-%m', reading_date) = ?
        ORDER BY reading_date''', (enterprise_id, period)).fetchall()
    
    if not readings:
        gaps.append({
            'type': 'missing_reading',
            'description': f'{period} 无电表读数记录',
            'responsible_person': '园区抄表员',
            'next_action': '请联系抄表员补录读数'
        })
    
    for r in readings:
        if r['end_reading'] < r['start_reading']:
            gaps.append({
                'type': 'reading_decrease',
                'description': f'读数异常：{r["meter_code"]} 期末读数{ r["end_reading"]} < 期初读数{r["start_reading"]}',
                'responsible_person': '园区运维部',
                'next_action': '请联系运维部核实用量'
            })
        if r['usage'] <= 0:
            gaps.append({
                'type': 'zero_usage',
                'description': f'{r["meter_code"]} 本期用量为{r["usage"]}度',
                'responsible_person': '企业联系人/园区运维',
                'next_action': '请核实企业是否停产或电表故障'
            })
    
    return gaps

@app.route('/api/enterprises', methods=['POST'])
def add_enterprise():
    data = request.json
    db = get_db()
    try:
        cursor = db.execute('''INSERT INTO enterprises 
            (enterprise_code, name, floor, room, area)
            VALUES (?, ?, ?, ?, ?)''',
            (data['enterprise_code'], data['name'], 
             data.get('floor'), data.get('room'), data.get('area')))
        db.commit()
        return jsonify({'success': True, 'id': cursor.lastrowid, 'message': '企业档案创建成功'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': '企业编码已存在'}), 400

@app.route('/api/enterprises/<int:enterprise_id>/move-out', methods=['POST'])
def request_move_out(enterprise_id):
    data = request.json
    db = get_db()
    ent = db.execute("SELECT * FROM enterprises WHERE id = ?", (enterprise_id,)).fetchone()
    if not ent:
        return jsonify({'success': False, 'message': '企业不存在'}), 404
    
    if ent['move_out_pending']:
        return jsonify({'success': False, 'message': '迁出申请已在处理中'}), 400
    
    balance = get_enterprise_balance(db, enterprise_id)
    
    db.execute('''UPDATE enterprises 
        SET move_out_pending = 1, move_out_request_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?''', (data.get('request_date', date.today().isoformat()), enterprise_id))
    
    db.execute('''INSERT INTO change_history 
        (table_name, record_id, field_name, old_value, new_value, changed_by, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)''',
        ('enterprises', enterprise_id, 'move_out_pending', '0', '1',
         data.get('operator', 'unknown'), f'企业申请迁出，当前余额: {balance}'))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': '迁出申请已提交，进入待确认分支',
        'pending_balance': balance,
        'next_step': '请财务核实所有摊销完成后确认迁出'
    })

@app.route('/api/enterprises/<int:enterprise_id>/move-out/confirm', methods=['POST'])
def confirm_move_out(enterprise_id):
    data = request.json
    db = get_db()
    ent = db.execute("SELECT * FROM enterprises WHERE id = ?", (enterprise_id,)).fetchone()
    if not ent or not ent['move_out_pending']:
        return jsonify({'success': False, 'message': '无待确认的迁出申请'}), 400
    
    balance = get_enterprise_balance(db, enterprise_id)
    if balance < 0:
        return jsonify({
            'success': False,
            'message': f'企业存在欠费 {abs(balance)} 元，无法确认迁出',
            'pending_amount': abs(balance)
        }), 400
    
    db.execute('''UPDATE enterprises 
        SET status = 'moved_out', move_out_pending = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?''', (enterprise_id,))
    
    db.execute('''INSERT INTO change_history 
        (table_name, record_id, field_name, old_value, new_value, changed_by, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)''',
        ('enterprises', enterprise_id, 'status', 'active', 'moved_out',
         data.get('operator', 'unknown'), f'企业迁出确认，最终余额: {balance}'))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': '企业迁出已确认',
        'final_balance': balance,
        'refund_amount': balance if balance > 0 else 0
    })

@app.route('/api/prepayments', methods=['POST'])
def add_prepayment():
    data = request.json
    db = get_db()
    ent = db.execute("SELECT * FROM enterprises WHERE id = ?", (data['enterprise_id'],)).fetchone()
    if not ent:
        return jsonify({'success': False, 'message': '企业不存在'}), 404
    
    cursor = db.execute('''INSERT INTO prepayments 
        (enterprise_id, amount, payment_date, payment_method, remark, created_by)
        VALUES (?, ?, ?, ?, ?, ?)''',
        (data['enterprise_id'], data['amount'], data['payment_date'],
         data.get('payment_method'), data.get('remark'), data.get('operator', 'unknown')))
    
    db.commit()
    return jsonify({'success': True, 'id': cursor.lastrowid, 'message': '预缴记录已创建，待复核'})

@app.route('/api/prepayments/<int:pid>/review', methods=['POST'])
def review_prepayment(pid):
    data = request.json
    db = get_db()
    prep = db.execute("SELECT * FROM prepayments WHERE id = ?", (pid,)).fetchone()
    if not prep:
        return jsonify({'success': False, 'message': '预缴记录不存在'}), 404
    if prep['status'] == 'reviewed':
        return jsonify({'success': False, 'message': '已复核，不可重复操作'}), 400
    
    period = data.get('period', datetime.strptime(prep['payment_date'], '%Y-%m-%d').strftime('%Y-%m'))
    
    db.execute('''UPDATE prepayments 
        SET status = 'reviewed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?''', (data.get('operator', 'unknown'), pid))
    
    new_balance = add_balance_transaction(
        db, prep['enterprise_id'], period, 'prepayment', prep['amount'],
        related_id=pid, related_type='prepayment', remark='预缴入账'
    )
    
    log_change(db, 'prepayments', pid, 'status', 'pending', 'reviewed', 
               data.get('operator', 'unknown'), remark='预缴复核通过，余额已更新')
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': '预缴复核通过，余额已更新',
        'current_balance': new_balance
    })

@app.route('/api/meter-readings', methods=['POST'])
def add_meter_reading():
    data = request.json
    db = get_db()
    ent = db.execute("SELECT * FROM enterprises WHERE id = ?", (data['enterprise_id'],)).fetchone()
    if not ent:
        return jsonify({'success': False, 'message': '企业不存在'}), 404
    
    usage = data['end_reading'] - data['start_reading']
    
    cursor = db.execute('''INSERT INTO meter_readings 
        (enterprise_id, meter_code, reading_date, start_reading, end_reading, usage, created_by, gap_remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (data['enterprise_id'], data['meter_code'], data['reading_date'],
         data['start_reading'], data['end_reading'], usage,
         data.get('operator', 'unknown'), data.get('gap_remark')))
    
    reading_id = cursor.lastrowid
    
    if data.get('gap_remark'):
        db.execute('''INSERT INTO reading_gaps 
            (meter_reading_id, enterprise_id, gap_type, gap_description, responsible_person, next_action)
            VALUES (?, ?, ?, ?, ?, ?)''',
            (reading_id, data['enterprise_id'], 'manual_flag',
             data['gap_remark'], data.get('responsible', '园区运维'),
             data.get('next_action', '待核实')))
    
    db.commit()
    return jsonify({
        'success': True,
        'id': reading_id,
        'usage': usage,
        'message': '读数已录入，待复核'
    })

@app.route('/api/meter-readings/<int:rid>/review', methods=['POST'])
def review_meter_reading(rid):
    data = request.json
    db = get_db()
    reading = db.execute("SELECT * FROM meter_readings WHERE id = ?", (rid,)).fetchone()
    if not reading:
        return jsonify({'success': False, 'message': '读数记录不存在'}), 404
    if reading['status'] == 'reviewed':
        return jsonify({'success': False, 'message': '已复核，不可重复操作'}), 400
    
    db.execute('''UPDATE meter_readings 
        SET status = 'reviewed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?''', (data.get('operator', 'unknown'), rid))
    
    period = datetime.strptime(reading['reading_date'], '%Y-%m-%d').strftime('%Y-%m')
    gaps = check_reading_gaps(db, reading['enterprise_id'], period)
    
    for gap in gaps:
        db.execute('''INSERT INTO reading_gaps 
            (meter_reading_id, enterprise_id, gap_type, gap_description, responsible_person, next_action)
            VALUES (?, ?, ?, ?, ?, ?)''',
            (rid, reading['enterprise_id'], gap['type'],
             gap['description'], gap['responsible_person'], gap['next_action']))
    
    log_change(db, 'meter_readings', rid, 'status', 'pending', 'reviewed',
               data.get('operator', 'unknown'), remark='读数复核通过')
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': '读数复核通过',
        'gaps_found': gaps
    })

@app.route('/api/sharing-rules', methods=['POST'])
def add_sharing_rule():
    data = request.json
    db = get_db()
    
    existing = db.execute("SELECT MAX(version) as max_v FROM sharing_rules WHERE rule_name = ?",
                         (data['rule_name'],)).fetchone()
    max_v = existing['max_v']
    if max_v:
        num = int(max_v.replace('V', '')) + 1
        version = f'V{num}'
    else:
        version = 'V1'
    
    if data.get('set_active', True):
        db.execute("UPDATE sharing_rules SET is_active = 0 WHERE rule_name = ?", (data['rule_name'],))
    
    cursor = db.execute('''INSERT INTO sharing_rules 
        (version, rule_name, rule_type, formula, params, effective_date, expire_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (version, data['rule_name'], data['rule_type'], data['formula'],
         json.dumps(data.get('params', {})), data['effective_date'],
         data.get('expire_date'), data.get('operator', 'unknown')))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'id': cursor.lastrowid,
        'version': version,
        'message': f'公摊规则 {version} 已创建'
    })

@app.route('/api/sharing-calculate', methods=['POST'])
def calculate_sharing():
    data = request.json
    period = data['period']
    db = get_db()
    
    active_rules = db.execute("SELECT * FROM sharing_rules WHERE is_active = 1").fetchall()
    if not active_rules:
        return jsonify({'success': False, 'message': '无激活的公摊规则'}), 400
    
    rule_versions = ','.join([f"{r['rule_name']}:{r['version']}" for r in active_rules])
    
    enterprises = db.execute("SELECT * FROM enterprises WHERE status = 'active'").fetchall()
    total_area = sum(e['area'] for e in enterprises if e['area'])
    
    shared_details = []
    total_shared = 0
    
    for rule in active_rules:
        params = json.loads(rule['params'] or '{}')
        rule_total = params.get('base_amount', 0)
        
        for ent in enterprises:
            if ent['move_out_pending']:
                continue
            
            ratio = ent['area'] / total_area if total_area else 1 / len(enterprises)
            ent_share = round(rule_total * ratio, 2)
            total_shared += ent_share
            
            shared_details.append({
                'enterprise_id': ent['id'],
                'enterprise_name': ent['name'],
                'rule_name': rule['rule_name'],
                'rule_version': rule['version'],
                'amount': ent_share,
                'area': ent['area'],
                'ratio': round(ratio * 100, 2)
            })
    
    cursor = db.execute('''INSERT INTO sharing_versions 
        (period, rule_version, total_shared_amount, calculated_by, remark)
        VALUES (?, ?, ?, ?, ?)''',
        (period, rule_versions, total_shared, 
         data.get('operator', 'unknown'), data.get('remark', '')))
    
    version_id = cursor.lastrowid
    
    for sd in shared_details:
        db.execute('''INSERT INTO change_history 
            (table_name, record_id, field_name, old_value, new_value, changed_by, amortization_affected, remark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            ('sharing_versions', version_id, 'shared_amount', None, sd['amount'],
             data.get('operator', 'unknown'), 1,
             f"公摊补录: {sd['rule_name']} {sd['rule_version']} 影响 {sd['enterprise_name']}"))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'version_id': version_id,
        'rule_versions': rule_versions,
        'total_shared': total_shared,
        'details': shared_details,
        'affected_amortizations': [d['enterprise_name'] for d in shared_details]
    })

@app.route('/api/amortize', methods=['POST'])
def do_amortize():
    data = request.json
    period = data['period']
    db = get_db()
    
    price = float(get_param(db, 'electricity_price') or 1.2)
    deduction_order = get_param(db, 'deduction_order') or 'prepayment,arrears'
    
    sharing_ver = db.execute('''SELECT * FROM sharing_versions 
        WHERE period = ? ORDER BY id DESC LIMIT 1''', (period,)).fetchone()
    
    enterprises = db.execute("SELECT * FROM enterprises WHERE status = 'active'").fetchall()
    
    results = []
    
    for ent in enterprises:
        ent_id = ent['id']
        ent_name = ent['name']
        
        if ent['move_out_pending']:
            results.append({
                'enterprise': ent_name,
                'status': 'skipped',
                'reason': '企业迁出待确认，暂不摊销'
            })
            continue
        
        readings = db.execute('''SELECT IFNULL(SUM(usage), 0) as total_usage 
            FROM meter_readings 
            WHERE enterprise_id = ? AND strftime('%Y-%m', reading_date) = ? AND status = 'reviewed'
            ''', (ent_id, period)).fetchone()
        meter_usage = readings['total_usage'] or 0
        meter_amount = round(meter_usage * price, 2)
        
        shared_amount = 0
        if sharing_ver:
            shared_rows = db.execute('''SELECT * FROM change_history 
                WHERE table_name = 'sharing_versions' AND record_id = ? 
                AND remark LIKE ?''', (sharing_ver['id'], f'%{ent_name}%')).fetchall()
            for sr in shared_rows:
                shared_amount += float(sr['new_value'] or 0)
        
        total_amount = round(meter_amount + shared_amount, 2)
        
        current_balance = get_enterprise_balance(db, ent_id, period)
        prepay_deducted = min(current_balance, total_amount) if current_balance > 0 else 0
        closing_balance = round(current_balance - total_amount, 2)
        
        existing = db.execute('''SELECT * FROM amortization 
            WHERE enterprise_id = ? AND period = ?''', (ent_id, period)).fetchone()
        
        if existing:
            db.execute('''UPDATE amortization 
                SET meter_usage = ?, meter_amount = ?, shared_amount = ?, total_amount = ?,
                    prepay_deducted = ?, closing_balance = ?, sharing_version_id = ?,
                    status = 'draft'
                WHERE id = ?''',
                (meter_usage, meter_amount, shared_amount, total_amount,
                 prepay_deducted, closing_balance, sharing_ver['id'] if sharing_ver else None,
                 existing['id']))
            
            if existing['total_amount'] != total_amount:
                log_change(db, 'amortization', existing['id'], 'total_amount',
                          existing['total_amount'], total_amount,
                          data.get('operator', 'unknown'), amortization_affected=1,
                          remark='公摊补录后重新计算，摊销金额已变动')
            
            amort_id = existing['id']
        else:
            cursor = db.execute('''INSERT INTO amortization 
                (enterprise_id, period, meter_usage, meter_amount, shared_amount, total_amount,
                 prepay_deducted, closing_balance, sharing_version_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (ent_id, period, meter_usage, meter_amount, shared_amount, total_amount,
                 prepay_deducted, closing_balance, sharing_ver['id'] if sharing_ver else None))
            amort_id = cursor.lastrowid
        
        add_balance_transaction(
            db, ent_id, period, 'amortization', -total_amount,
            related_id=amort_id, related_type='amortization',
            remark=f'{period}电费摊销'
        )
        
        results.append({
            'id': amort_id,
            'enterprise': ent_name,
            'meter_usage': meter_usage,
            'meter_amount': meter_amount,
            'shared_amount': shared_amount,
            'total_amount': total_amount,
            'prepay_balance_before': current_balance,
            'prepay_deducted': prepay_deducted,
            'closing_balance': closing_balance,
            'sharing_version': sharing_ver['rule_version'] if sharing_ver else 'N/A'
        })
    
    db.commit()
    
    return jsonify({
        'success': True,
        'period': period,
        'electricity_price': price,
        'deduction_order': deduction_order,
        'sharing_version': sharing_ver['rule_version'] if sharing_ver else 'N/A',
        'results': results
    })

@app.route('/api/amortize/<int:aid>/review', methods=['POST'])
def review_amortization(aid):
    data = request.json
    db = get_db()
    amort = db.execute("SELECT * FROM amortization WHERE id = ?", (aid,)).fetchone()
    if not amort:
        return jsonify({'success': False, 'message': '摊销记录不存在'}), 404
    if amort['status'] == 'reviewed':
        return jsonify({'success': False, 'message': '已复核，不可重复操作'}), 400
    
    gaps = check_reading_gaps(db, amort['enterprise_id'], amort['period'])
    
    db.execute('''UPDATE amortization 
        SET status = 'reviewed', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?''', (data.get('operator', 'unknown'), aid))
    
    log_change(db, 'amortization', aid, 'status', 'draft', 'reviewed',
               data.get('operator', 'unknown'), amortization_affected=1,
               remark='摊销复核通过')
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': '摊销复核通过',
        'gaps_to_verify': gaps
    })

@app.route('/api/balance-ledger', methods=['GET'])
def get_balance_ledger():
    enterprise_id = request.args.get('enterprise_id')
    period = request.args.get('period')
    db = get_db()
    
    query = "SELECT bl.*, e.name as enterprise_name FROM balance_ledger bl LEFT JOIN enterprises e ON bl.enterprise_id = e.id WHERE 1=1"
    params = []
    if enterprise_id:
        query += " AND bl.enterprise_id = ?"
        params.append(int(enterprise_id))
    if period:
        query += " AND bl.period = ?"
        params.append(period)
    query += " ORDER BY bl.created_at"
    
    rows = db.execute(query, params).fetchall()
    
    return jsonify({
        'success': True,
        'data': [dict(r) for r in rows]
    })

@app.route('/api/change-history', methods=['GET'])
def get_change_history():
    table_name = request.args.get('table')
    record_id = request.args.get('record_id')
    amortization_affected = request.args.get('amortization_affected')
    db = get_db()
    
    query = "SELECT * FROM change_history WHERE 1=1"
    params = []
    if table_name:
        query += " AND table_name = ?"
        params.append(table_name)
    if record_id:
        query += " AND record_id = ?"
        params.append(int(record_id))
    if amortization_affected:
        query += " AND amortization_affected = 1"
    query += " ORDER BY changed_at DESC"
    
    rows = db.execute(query, params).fetchall()
    
    return jsonify({
        'success': True,
        'affected_amortizations': [dict(r) for r in rows]
    })

@app.route('/api/reading-gaps', methods=['GET'])
def get_reading_gaps():
    enterprise_id = request.args.get('enterprise_id')
    status = request.args.get('status', 'open')
    db = get_db()
    
    query = '''SELECT rg.*, e.name as enterprise_name, mr.meter_code 
        FROM reading_gaps rg 
        LEFT JOIN enterprises e ON rg.enterprise_id = e.id
        LEFT JOIN meter_readings mr ON rg.meter_reading_id = mr.id
        WHERE rg.status = ?'''
    params = [status]
    if enterprise_id:
        query += " AND rg.enterprise_id = ?"
        params.append(int(enterprise_id))
    query += " ORDER BY rg.created_at DESC"
    
    rows = db.execute(query, params).fetchall()
    
    return jsonify({
        'success': True,
        'gaps': [dict(r) for r in rows]
    })

@app.route('/api/report/amortization', methods=['GET'])
def export_amortization_report():
    period = request.args.get('period')
    fmt = request.args.get('format', 'json')
    db = get_db()
    
    if not period:
        return jsonify({'success': False, 'message': '请指定月份参数 period=YYYY-MM'}), 400
    
    sharing_ver = db.execute('''SELECT * FROM sharing_versions 
        WHERE period = ? ORDER BY id DESC LIMIT 1''', (period,)).fetchone()
    
    query = '''SELECT a.*, e.name as enterprise_name, e.enterprise_code,
                      e.floor, e.room, e.area,
                      sv.rule_version as sharing_versions
               FROM amortization a
               LEFT JOIN enterprises e ON a.enterprise_id = e.id
               LEFT JOIN sharing_versions sv ON a.sharing_version_id = sv.id
               WHERE a.period = ?
               ORDER BY e.enterprise_code'''
    
    rows = db.execute(query, (period,)).fetchall()
    
    changes = db.execute('''SELECT record_id, field_name, old_value, new_value, changed_at, remark
        FROM change_history 
        WHERE table_name = 'amortization' AND amortization_affected = 1
        AND EXISTS (SELECT 1 FROM amortization a WHERE a.id = change_history.record_id AND a.period = ?)
        ORDER BY changed_at''', (period,)).fetchall()
    
    change_map = {}
    for c in changes:
        rid = c['record_id']
        if rid not in change_map:
            change_map[rid] = []
        change_map[rid].append({
            'field': c['field_name'],
            'from': c['old_value'],
            'to': c['new_value'],
            'at': c['changed_at'],
            'remark': c['remark']
        })
    
    report_data = []
    total_meter = 0
    total_shared = 0
    total_amount = 0
    
    for r in rows:
        d = dict(r)
        d['changes'] = change_map.get(r['id'], [])
        report_data.append(d)
        total_meter += r['meter_amount'] or 0
        total_shared += r['shared_amount'] or 0
        total_amount += r['total_amount'] or 0
    
    if fmt == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([f'园区电费预付摊销表 - {period}'])
        writer.writerow([f'公摊版本: {sharing_ver["rule_version"] if sharing_ver else "N/A"}'])
        writer.writerow([f'生成时间: {datetime.now().isoformat()}'])
        writer.writerow([])
        writer.writerow(['企业编码', '企业名称', '楼层', '房间', '面积',
                        '电表用量(度)', '电费(元)', '公摊(元)', '合计(元)',
                        '抵扣预缴', '期末余额', '状态', '变动记录'])
        
        for d in report_data:
            changes_str = '; '.join([f"{c['field']}:{c['from']}->{c['to']}" for c in d['changes']]) or '无'
            writer.writerow([
                d['enterprise_code'], d['enterprise_name'], d['floor'], d['room'], d['area'],
                d['meter_usage'], d['meter_amount'], d['shared_amount'], d['total_amount'],
                d['prepay_deducted'], d['closing_balance'], d['status'], changes_str
            ])
        
        writer.writerow([])
        writer.writerow(['合计', '', '', '', '', '', 
                        round(total_meter, 2), round(total_shared, 2), round(total_amount, 2),
                        '', '', '', ''])
        
        balance_query = '''SELECT e.enterprise_code, e.name, bl.transaction_type, bl.amount, bl.balance, bl.remark, bl.created_at
            FROM balance_ledger bl
            LEFT JOIN enterprises e ON bl.enterprise_id = e.id
            WHERE bl.period = ?
            ORDER BY e.enterprise_code, bl.created_at'''
        
        balance_rows = db.execute(balance_query, (period,)).fetchall()
        
        writer.writerow([])
        writer.writerow(['--- 余额账本追溯 ---'])
        writer.writerow(['企业编码', '企业名称', '交易类型', '金额', '余额', '备注', '时间'])
        for br in balance_rows:
            writer.writerow([br['enterprise_code'], br['name'], br['transaction_type'],
                            br['amount'], br['balance'], br['remark'], br['created_at']])
        
        return Response(output.getvalue(), mimetype='text/csv',
                       headers={'Content-Disposition': f'attachment; filename=amortization_{period}.csv'})
    
    return jsonify({
        'success': True,
        'period': period,
        'sharing_versions': sharing_ver['rule_version'] if sharing_ver else 'N/A',
        'balance_ledger_source': 'balance_ledger table, ordered by created_at',
        'deduction_order': get_param(db, 'deduction_order'),
        'electricity_price': get_param(db, 'electricity_price'),
        'summary': {
            'total_meter_amount': round(total_meter, 2),
            'total_shared_amount': round(total_shared, 2),
            'grand_total': round(total_amount, 2),
            'enterprise_count': len(report_data)
        },
        'details': report_data,
        'balance_ledger': get_balance_ledger_by_period(db, period)
    })

def get_balance_ledger_by_period(db, period):
    rows = db.execute('''SELECT bl.*, e.name as enterprise_name, e.enterprise_code
        FROM balance_ledger bl
        LEFT JOIN enterprises e ON bl.enterprise_id = e.id
        WHERE bl.period = ?
        ORDER BY bl.enterprise_id, bl.created_at''', (period,)).fetchall()
    return [dict(r) for r in rows]

@app.route('/api/enterprises', methods=['GET'])
def list_enterprises():
    db = get_db()
    rows = db.execute("SELECT * FROM enterprises ORDER BY enterprise_code").fetchall()
    return jsonify({'success': True, 'data': [dict(r) for r in rows]})

@app.route('/api/sharing-rules', methods=['GET'])
def list_sharing_rules():
    db = get_db()
    rows = db.execute("SELECT * FROM sharing_rules ORDER BY rule_name, version").fetchall()
    return jsonify({'success': True, 'data': [dict(r) for r in rows]})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
