import json
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
import io
import csv

from ..models import get_connection, audit
from ..margin_engine import recalculate_all, generate_notifications, generate_daily_report, calc_combo_offset, detect_iv_jump

api = Blueprint('api', __name__, url_prefix='/api')


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


@api.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@api.route('/contracts', methods=['GET'])
def list_contracts():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM contracts ORDER BY code")
    contracts = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(contracts)


@api.route('/contracts', methods=['POST'])
def create_contract():
    data = request.json
    if not data:
        return jsonify({'error': '缺少数据'}), 400

    required = ['code', 'underlying', 'option_type', 'strike', 'expiry_date']
    for field in required:
        if field not in data:
            return jsonify({'error': f'缺少字段: {field}'}), 400

    if data['option_type'] not in ('CALL', 'PUT'):
        return jsonify({'error': 'option_type 必须是 CALL 或 PUT'}), 400

    if data['strike'] <= 0:
        return jsonify({'error': '行权价必须大于0'}), 400

    try:
        expiry = datetime.strptime(data['expiry_date'], '%Y-%m-%d')
        if expiry < datetime.now():
            return jsonify({'error': '到期日不能早于今天'}), 400
    except:
        return jsonify({'error': '到期日格式错误'}), 400

    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO contracts (code, underlying, option_type, strike, expiry_date, multiplier)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data['code'], data['underlying'], data['option_type'],
            data['strike'], data['expiry_date'], data.get('multiplier', 10000)
        ))
        contract_id = c.lastrowid
        conn.commit()
        audit('contracts', contract_id, 'create', after_data=data)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

    conn.close()
    return jsonify({'id': contract_id, 'message': '合约已创建'}), 201


@api.route('/contracts/<int:contract_id>', methods=['PUT'])
def update_contract(contract_id):
    data = request.json
    if not data:
        return jsonify({'error': '缺少数据'}), 400

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,))
    existing = c.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '合约不存在'}), 404

    before = dict(existing)
    allowed = ['strike', 'expiry_date', 'multiplier']
    updates = {k: v for k, v in data.items() if k in allowed}

    if updates:
        set_clause = ', '.join([f"{k} = ?" for k in updates])
        values = list(updates.values()) + [contract_id]
        c.execute(f"UPDATE contracts SET {set_clause} WHERE id = ?", values)
        conn.commit()
        audit('contracts', contract_id, 'update', before_data=before, after_data=updates)

    conn.close()
    return jsonify({'message': '合约已更新'})


@api.route('/positions', methods=['GET'])
def list_positions():
    account = request.args.get('account')
    conn = get_connection()
    c = conn.cursor()

    if account:
        c.execute("SELECT * FROM positions WHERE account = ? ORDER BY account, contract_code", (account,))
    else:
        c.execute("SELECT * FROM positions ORDER BY account, contract_code")

    positions = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(positions)


@api.route('/positions', methods=['POST'])
def create_position():
    data = request.json
    if not data:
        return jsonify({'error': '缺少数据'}), 400

    required = ['account', 'contract_code', 'direction', 'quantity', 'open_price']
    for field in required:
        if field not in data:
            return jsonify({'error': f'缺少字段: {field}'}), 400

    if data['direction'] not in ('LONG', 'SHORT'):
        return jsonify({'error': 'direction 必须是 LONG 或 SHORT'}), 400

    if data['quantity'] <= 0:
        return jsonify({'error': '数量必须大于0'}), 400

    if data['open_price'] < 0:
        return jsonify({'error': '开仓价不能为负'}), 400

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT code FROM contracts WHERE code = ?", (data['contract_code'],))
    if not c.fetchone():
        conn.close()
        return jsonify({'error': '合约不存在'}), 400

    try:
        c.execute("""
            INSERT INTO positions (account, contract_code, direction, quantity, open_price, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data['account'], data['contract_code'], data['direction'],
            data['quantity'], data['open_price'],
            data.get('source', 'manual'), data.get('note', '')
        ))
        pos_id = c.lastrowid
        conn.commit()
        audit('positions', pos_id, 'create', after_data=data)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

    conn.close()
    return jsonify({'id': pos_id, 'message': '持仓已创建'}), 201


@api.route('/positions/<int:pos_id>', methods=['DELETE'])
def delete_position(pos_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM positions WHERE id = ?", (pos_id,))
    existing = c.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '持仓不存在'}), 404

    before = dict(existing)
    c.execute("DELETE FROM positions WHERE id = ?", (pos_id,))
    conn.commit()
    audit('positions', pos_id, 'delete', before_data=before)
    conn.close()
    return jsonify({'message': '持仓已删除'})


@api.route('/quotes', methods=['GET'])
def list_quotes():
    contract_code = request.args.get('contract')
    conn = get_connection()
    c = conn.cursor()

    if contract_code:
        c.execute("SELECT * FROM quotes WHERE contract_code = ? ORDER BY timestamp DESC LIMIT 100", (contract_code,))
    else:
        c.execute("""
            SELECT * FROM quotes WHERE timestamp IN (
                SELECT MAX(timestamp) FROM quotes GROUP BY contract_code
            ) ORDER BY contract_code
        """)

    quotes = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(quotes)


@api.route('/quotes', methods=['POST'])
def add_quote():
    data = request.json
    if not data:
        return jsonify({'error': '缺少数据'}), 400

    required = ['contract_code', 'price', 'iv', 'delta', 'gamma', 'vega', 'theta', 'spot_price']
    for field in required:
        if field not in data:
            return jsonify({'error': f'缺少字段: {field}'}), 400

    if data['price'] < 0 or data['iv'] < 0 or data['spot_price'] < 0:
        return jsonify({'error': '价格、IV和现货价不能为负'}), 400

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT code FROM contracts WHERE code = ?", (data['contract_code'],))
    if not c.fetchone():
        conn.close()
        return jsonify({'error': '合约不存在'}), 400

    try:
        c.execute("""
            INSERT INTO quotes (contract_code, price, iv, delta, gamma, vega, theta, spot_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['contract_code'], data['price'], data['iv'],
            data['delta'], data['gamma'], data['vega'], data['theta'], data['spot_price']
        ))
        quote_id = c.lastrowid
        conn.commit()
        audit('quotes', quote_id, 'create', after_data=data)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

    conn.close()
    return jsonify({'id': quote_id, 'message': '行情已录入'}), 201


@api.route('/margin/recalculate', methods=['POST'])
def trigger_recalculate():
    results = recalculate_all()
    return jsonify({'message': '保证金已重算', 'count': len(results), 'details': results})


@api.route('/margin/current', methods=['GET'])
def get_current_margin():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT mc.*, p.account, p.contract_code, p.direction, p.quantity, p.open_price,
               c.underlying, c.option_type, c.strike, c.expiry_date,
               q.price as option_price, q.iv, q.delta, q.spot_price
        FROM margin_calculations mc
        JOIN positions p ON mc.position_id = p.id
        JOIN contracts c ON p.contract_code = c.code
        JOIN quotes q ON mc.quote_id = q.id
        ORDER BY mc.margin_ratio ASC
    """)
    results = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(results)


@api.route('/notifications', methods=['GET'])
def list_notifications():
    status = request.args.get('status')
    conn = get_connection()
    c = conn.cursor()

    if status:
        c.execute("SELECT * FROM notifications WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        c.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200")

    notifications = rows_to_list(c.fetchall())

    for n in notifications:
        if n['duplicate_of']:
            c.execute("SELECT id, status, created_at FROM notifications WHERE id = ?", (n['duplicate_of'],))
            orig = c.fetchone()
            if orig:
                n['original_notification'] = dict(orig)

    conn.close()
    return jsonify(notifications)


@api.route('/notifications/<int:notif_id>/send', methods=['POST'])
def send_notification(notif_id):
    data = request.json or {}
    channel = data.get('channel', 'SYSTEM')

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
    existing = c.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '通知不存在'}), 404

    if existing['is_duplicate']:
        conn.close()
        return jsonify({'error': '重复通知不能发送，请先处理原始通知'}), 400

    c.execute("""
        UPDATE notifications SET status = 'SENT', channel = ?, sent_at = ? WHERE id = ?
    """, (channel, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), notif_id))
    conn.commit()
    audit('notifications', notif_id, 'send', before_data=dict(existing), after_data={'status': 'SENT', 'channel': channel})

    conn.close()
    return jsonify({'message': '通知已发送'})


@api.route('/notifications/<int:notif_id>/acknowledge', methods=['POST'])
def acknowledge_notification(notif_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
    existing = c.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '通知不存在'}), 404

    c.execute("""
        UPDATE notifications SET status = 'ACKNOWLEDGED', acknowledged_at = ? WHERE id = ?
    """, (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), notif_id))
    conn.commit()
    audit('notifications', notif_id, 'acknowledge', before_data=dict(existing), after_data={'status': 'ACKNOWLEDGED'})

    conn.close()
    return jsonify({'message': '客户已确认'})


@api.route('/notifications/<int:notif_id>/resolve', methods=['POST'])
def resolve_notification(notif_id):
    data = request.json or {}
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
    existing = c.fetchone()
    if not existing:
        conn.close()
        return jsonify({'error': '通知不存在'}), 404

    c.execute("""
        UPDATE notifications SET status = 'RESOLVED', resolved_at = ?, note = ? WHERE id = ?
    """, (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), data.get('note', ''), notif_id))
    conn.commit()
    audit('notifications', notif_id, 'resolve', before_data=dict(existing), after_data={'status': 'RESOLVED'})

    conn.close()
    return jsonify({'message': '通知已解决'})


@api.route('/actions', methods=['GET'])
def list_actions():
    account = request.args.get('account')
    conn = get_connection()
    c = conn.cursor()

    if account:
        c.execute("SELECT * FROM margin_actions WHERE account = ? ORDER BY created_at DESC", (account,))
    else:
        c.execute("SELECT * FROM margin_actions ORDER BY created_at DESC LIMIT 200")

    actions = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(actions)


@api.route('/actions', methods=['POST'])
def create_action():
    data = request.json
    if not data:
        return jsonify({'error': '缺少数据'}), 400

    required = ['account', 'action_type', 'amount']
    for field in required:
        if field not in data:
            return jsonify({'error': f'缺少字段: {field}'}), 400

    if data['action_type'] not in ('DEPOSIT', 'CLOSE', 'OFFSET', 'MANUAL_ADJUST', 'REJECT'):
        return jsonify({'error': '无效的动作类型'}), 400

    if data['amount'] < 0:
        return jsonify({'error': '金额不能为负'}), 400

    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO margin_actions (notification_id, account, action_type, amount, detail, operator)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data.get('notification_id'), data['account'], data['action_type'],
            data['amount'], data.get('detail', ''), data.get('operator', 'system')
        ))
        action_id = c.lastrowid

        if data['action_type'] == 'DEPOSIT':
            c.execute("SELECT balance FROM account_balances WHERE account = ?", (data['account'],))
            bal = c.fetchone()
            if bal:
                c.execute("UPDATE account_balances SET balance = balance + ?, updated_at = ? WHERE account = ?",
                         (data['amount'], datetime.now().strftime('%Y-%m-%d %H:%M:%S'), data['account']))
            else:
                c.execute("INSERT INTO account_balances (account, balance) VALUES (?, ?)",
                         (data['account'], data['amount']))

        conn.commit()
        audit('margin_actions', action_id, 'create', after_data=data)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

    conn.close()
    return jsonify({'id': action_id, 'message': '动作已记录'}), 201


@api.route('/combo-offset/<account>', methods=['GET'])
def get_combo_offset(account):
    offset, details = calc_combo_offset(account)
    return jsonify({'account': account, 'total_offset': offset, 'details': details})


@api.route('/iv-jump/<contract_code>', methods=['GET'])
def check_iv_jump(contract_code):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT iv FROM quotes WHERE contract_code = ? ORDER BY timestamp DESC LIMIT 1", (contract_code,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': '无行情数据'}), 404

    detected, pct = detect_iv_jump(contract_code, row['iv'])
    return jsonify({'contract_code': contract_code, 'iv_jump_detected': detected, 'iv_jump_pct': pct})


@api.route('/reports/daily', methods=['POST'])
def create_daily_report():
    report = generate_daily_report()
    return jsonify(report), 201


@api.route('/reports', methods=['GET'])
def list_reports():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, report_type, period, generated_at, summary FROM risk_reports ORDER BY generated_at DESC LIMIT 50")
    reports = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(reports)


@api.route('/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM risk_reports WHERE id = ?", (report_id,))
    report = c.fetchone()
    conn.close()

    if not report:
        return jsonify({'error': '报告不存在'}), 404

    result = dict(report)
    result['summary'] = json.loads(result['summary'])
    result['data'] = json.loads(result['data'])
    return jsonify(result)


@api.route('/reports/export/csv', methods=['GET'])
def export_csv():
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT mc.*, p.account, p.contract_code, p.direction, p.quantity,
               c.underlying, c.option_type, c.strike, c.expiry_date,
               q.price as option_price, q.iv, q.spot_price
        FROM margin_calculations mc
        JOIN positions p ON mc.position_id = p.id
        JOIN contracts c ON p.contract_code = c.code
        JOIN quotes q ON mc.quote_id = q.id
        ORDER BY mc.margin_ratio ASC
    """)
    rows = rows_to_list(c.fetchall())
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        '账户', '合约代码', '标的', '类型', '行权价', '到期日',
        '方向', '数量', '期权价', 'IV', '现货价',
        '所需保证金', '可用保证金', '保证金比例', '风险等级',
        'IV跳变', 'IV跳变%', '组合抵扣', '抵扣金额', '计算时间'
    ])

    risk_labels = {'SAFE': '安全', 'WARNING': '警戒', 'DANGER': '危险', 'CRITICAL': '紧急'}
    for r in rows:
        writer.writerow([
            r['account'], r['contract_code'], r['underlying'], r['option_type'],
            r['strike'], r['expiry_date'], r['direction'], r['quantity'],
            r['option_price'], r['iv'], r['spot_price'],
            r['required_margin'], r['available_margin'], r['margin_ratio'],
            risk_labels.get(r['risk_level'], r['risk_level']),
            '是' if r['iv_jump_detected'] else '否', r['iv_jump_pct'] or '',
            '是' if r['combo_offset_applied'] else '否', r['combo_offset_amount'],
            r['created_at']
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'margin_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )


@api.route('/audit', methods=['GET'])
def list_audit():
    entity_type = request.args.get('type')
    conn = get_connection()
    c = conn.cursor()

    if entity_type:
        c.execute("SELECT * FROM audit_log WHERE entity_type = ? ORDER BY created_at DESC LIMIT 200", (entity_type,))
    else:
        c.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200")

    logs = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(logs)


@api.route('/accounts', methods=['GET'])
def list_accounts():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM account_balances ORDER BY account")
    accounts = rows_to_list(c.fetchall())
    conn.close()
    return jsonify(accounts)


@api.route('/accounts', methods=['POST'])
def create_account():
    data = request.json
    if not data or 'account' not in data:
        return jsonify({'error': '缺少账户号'}), 400

    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT OR IGNORE INTO account_balances (account, balance) VALUES (?, ?)",
                 (data['account'], data.get('balance', 1000000.0)))
        conn.commit()
        audit('account_balances', data['account'], 'create', after_data=data)
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

    conn.close()
    return jsonify({'message': '账户已创建'})


@api.route('/notifications/generate', methods=['POST'])
def trigger_generate_notifications():
    results = generate_notifications()
    return jsonify({'message': '通知已生成', 'count': len(results), 'details': results})


@api.route('/validate/<contract_code>', methods=['GET'])
def validate_contract(contract_code):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM contracts WHERE code = ?", (contract_code,))
    contract = c.fetchone()
    conn.close()

    if not contract:
        return jsonify({'valid': False, 'errors': ['合约不存在']})

    errors = []
    if contract['strike'] <= 0:
        errors.append('行权价异常')
    try:
        expiry = datetime.strptime(contract['expiry_date'], '%Y-%m-%d')
        if expiry < datetime.now():
            errors.append('合约已过期')
    except:
        errors.append('到期日格式错误')

    return jsonify({'valid': len(errors) == 0, 'errors': errors})
