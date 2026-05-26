import json
import math
from datetime import datetime, timedelta
from .models import get_connection, audit


def black_scholes_call(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)


def black_scholes_put(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    return K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)


def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def vega(S, K, T, r, sigma):
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    return S * math.sqrt(T) * norm_pdf(d1)


def norm_pdf(x):
    return (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x ** 2)


RISK_LEVELS = {
    'SAFE': {'min_ratio': 1.5, 'label': '安全', 'color': '#10b981'},
    'WARNING': {'min_ratio': 1.2, 'label': '警戒', 'color': '#f59e0b'},
    'DANGER': {'min_ratio': 1.0, 'label': '危险', 'color': '#ef4444'},
    'CRITICAL': {'min_ratio': 0.8, 'label': '紧急', 'color': '#dc2626'}
}

IV_JUMP_THRESHOLD = 0.15


def detect_iv_jump(contract_code, current_iv):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT iv FROM quotes WHERE contract_code = ? ORDER BY timestamp DESC LIMIT 10",
        (contract_code,)
    )
    rows = c.fetchall()
    conn.close()

    if len(rows) < 3:
        return False, 0.0

    historical_ivs = [row['iv'] for row in rows[:-1]] if len(rows) > 1 else [row['iv'] for row in rows]
    avg_iv = sum(historical_ivs) / len(historical_ivs)

    if avg_iv == 0:
        return False, 0.0

    jump_pct = abs(current_iv - avg_iv) / avg_iv
    return jump_pct >= IV_JUMP_THRESHOLD, round(jump_pct, 4)


def calc_position_margin(contract, position, quote):
    S = quote['spot_price']
    K = contract['strike']
    sigma = quote['iv']
    r = 0.02
    expiry = datetime.strptime(contract['expiry_date'], '%Y-%m-%d')
    T = max((expiry - datetime.now()).days / 365.0, 0.001)
    multiplier = contract['multiplier']

    if contract['option_type'] == 'CALL':
        option_price = black_scholes_call(S, K, T, r, sigma)
    else:
        option_price = black_scholes_put(S, K, T, r, sigma)

    qty = abs(position['quantity'])

    if position['direction'] == 'LONG':
        raw_margin = option_price * multiplier * qty * 0.5
    else:
        if S > K and contract['option_type'] == 'CALL':
            itm_margin = (S - K) * multiplier * qty
        elif S < K and contract['option_type'] == 'PUT':
            itm_margin = (K - S) * multiplier * qty
        else:
            itm_margin = 0
        raw_margin = option_price * multiplier * qty * 0.15 + itm_margin * 0.5

    return round(raw_margin, 2)


def calc_combo_offset(account):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        SELECT p.id, p.contract_code, p.direction, p.quantity, p.open_price,
               c.underlying, c.option_type, c.strike, c.expiry_date, c.multiplier
        FROM positions p
        JOIN contracts c ON p.contract_code = c.code
        WHERE p.account = ?
    """, (account,))
    positions = [dict(row) for row in c.fetchall()]
    conn.close()

    offset = 0.0
    combo_details = []

    grouped = {}
    for pos in positions:
        key = (pos['underlying'], pos['expiry_date'])
        if key not in grouped:
            grouped[key] = {'CALL': {'LONG': [], 'SHORT': []}, 'PUT': {'LONG': [], 'SHORT': []}}
        grouped[key][pos['option_type']][pos['direction']].append(pos)

    for key, types in grouped.items():
        underlying, expiry = key

        call_long = types['CALL']['LONG']
        call_short = types['CALL']['SHORT']
        put_long = types['PUT']['LONG']
        put_short = types['PUT']['SHORT']

        for cl in call_long:
            for cs in call_short:
                if cl['strike'] == cs['strike']:
                    pair_qty = min(cl['quantity'], cs['quantity'])
                    if pair_qty > 0:
                        combo_offset = pair_qty * cl['multiplier'] * 0.1
                        offset += combo_offset
                        combo_details.append({
                            'type': 'BULL_CALL_SPREAD',
                            'strike': cl['strike'],
                            'offset': round(combo_offset, 2)
                        })

        for pl in put_long:
            for ps in put_short:
                if pl['strike'] == ps['strike']:
                    pair_qty = min(pl['quantity'], ps['quantity'])
                    if pair_qty > 0:
                        combo_offset = pair_qty * pl['multiplier'] * 0.1
                        offset += combo_offset
                        combo_details.append({
                            'type': 'BEAR_PUT_SPREAD',
                            'strike': pl['strike'],
                            'offset': round(combo_offset, 2)
                        })

    return round(offset, 2), combo_details


def recalculate_all():
    conn = get_connection()
    c = conn.cursor()

    c.execute("DELETE FROM margin_calculations")
    c.execute("UPDATE notifications SET status = 'CANCELLED' WHERE status = 'PENDING'")

    c.execute("""
        SELECT p.id as position_id, p.account, p.contract_code, p.direction, p.quantity, p.open_price,
               c.underlying, c.option_type, c.strike, c.expiry_date, c.multiplier,
               q.id as quote_id, q.price, q.iv, q.delta, q.gamma, q.vega, q.theta, q.spot_price, q.timestamp
        FROM positions p
        JOIN contracts c ON p.contract_code = c.code
        JOIN quotes q ON q.contract_code = c.code
        WHERE q.timestamp = (SELECT MAX(timestamp) FROM quotes q2 WHERE q2.contract_code = c.code)
    """)
    rows = [dict(row) for row in c.fetchall()]

    account_margins = {}
    results = []

    for row in rows:
        contract = {
            'underlying': row['underlying'],
            'option_type': row['option_type'],
            'strike': row['strike'],
            'expiry_date': row['expiry_date'],
            'multiplier': row['multiplier']
        }
        position = {
            'id': row['position_id'],
            'direction': row['direction'],
            'quantity': row['quantity'],
            'open_price': row['open_price']
        }
        quote = {
            'id': row['quote_id'],
            'price': row['price'],
            'iv': row['iv'],
            'delta': row['delta'],
            'gamma': row['gamma'],
            'vega': row['vega'],
            'theta': row['theta'],
            'spot_price': row['spot_price']
        }

        is_valid = (
            contract['strike'] > 0 and
            quote['spot_price'] > 0 and
            quote['iv'] > 0 and quote['iv'] < 10 and
            contract['multiplier'] > 0 and
            position['quantity'] > 0
        )

        if not is_valid:
            continue

        raw_margin = calc_position_margin(contract, position, quote)
        iv_jump, iv_jump_pct = detect_iv_jump(row['contract_code'], row['iv'])

        if row['account'] not in account_margins:
            account_margins[row['account']] = {'total': 0.0, 'positions': []}
        account_margins[row['account']]['total'] += raw_margin
        account_margins[row['account']]['positions'].append(row['position_id'])

        raw_data = {
            'position_id': row['position_id'],
            'contract_code': row['contract_code'],
            'direction': row['direction'],
            'quantity': row['quantity'],
            'spot_price': row['spot_price'],
            'strike': row['strike'],
            'iv': row['iv'],
            'raw_margin': raw_margin
        }

        results.append({
            'position_id': row['position_id'],
            'quote_id': row['quote_id'],
            'account': row['account'],
            'contract_code': row['contract_code'],
            'required_margin': raw_margin,
            'iv_jump_detected': 1 if iv_jump else 0,
            'iv_jump_pct': iv_jump_pct if iv_jump else None,
            'raw_data': raw_data
        })

    for account, data in account_margins.items():
        combo_offset, combo_details = calc_combo_offset(account)

        c.execute("SELECT SUM(amount) as deposited FROM margin_actions WHERE account = ? AND action_type = 'DEPOSIT'", (account,))
        deposited = c.fetchone()['deposited'] or 0.0

        c.execute("SELECT balance FROM account_balances WHERE account = ?", (account,))
        balance_row = c.fetchone()
        base_balance = balance_row['balance'] if balance_row else 1000000.0
        available = base_balance + deposited

        for r in results:
            if r['account'] == account:
                effective_margin = max(r['required_margin'] - (combo_offset * (r['required_margin'] / data['total'] if data['total'] > 0 else 0)), 0)
                margin_ratio = available / effective_margin if effective_margin > 0 else 999

                if margin_ratio >= 1.5:
                    risk_level = 'SAFE'
                elif margin_ratio >= 1.2:
                    risk_level = 'WARNING'
                elif margin_ratio >= 1.0:
                    risk_level = 'DANGER'
                else:
                    risk_level = 'CRITICAL'

                r['available_margin'] = round(available, 2)
                r['required_margin'] = round(effective_margin, 2)
                r['margin_ratio'] = round(margin_ratio, 4)
                r['risk_level'] = risk_level
                r['combo_offset_applied'] = 1 if combo_offset > 0 else 0
                r['combo_offset_amount'] = round(combo_offset * (r['required_margin'] / data['total'] if data['total'] > 0 else 0), 2)

                c.execute("""
                    INSERT INTO margin_calculations 
                    (position_id, quote_id, required_margin, available_margin, margin_ratio, risk_level,
                     iv_jump_detected, iv_jump_pct, combo_offset_applied, combo_offset_amount, raw_calculation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    r['position_id'], r['quote_id'], r['required_margin'], r['available_margin'],
                    r['margin_ratio'], r['risk_level'], r['iv_jump_detected'], r['iv_jump_pct'],
                    r['combo_offset_applied'], r['combo_offset_amount'], json.dumps(r['raw_data'], ensure_ascii=False)
                ))

    conn.commit()
    conn.close()

    return results


def generate_notifications():
    conn = get_connection()
    c = conn.cursor()

    c.execute("""
        SELECT mc.*, p.account, p.contract_code, p.direction, p.quantity, c.underlying
        FROM margin_calculations mc
        JOIN positions p ON mc.position_id = p.id
        JOIN contracts c ON p.contract_code = c.code
        WHERE mc.risk_level IN ('DANGER', 'CRITICAL')
    """)
    rows = [dict(row) for row in c.fetchall()]

    notifications = []

    for row in rows:
        dedup_key = f"{row['account']}_{row['contract_code']}_{row['risk_level']}"

        c.execute("""
            SELECT id, status FROM notifications 
            WHERE dedup_key = ? AND status IN ('PENDING', 'SENT', 'ACKNOWLEDGED')
            ORDER BY created_at DESC LIMIT 1
        """, (dedup_key,))
        existing = c.fetchone()

        is_duplicate = 0
        duplicate_of = None

        if existing:
            is_duplicate = 1
            duplicate_of = existing['id']

        shortfall = max(0, row['required_margin'] - row['available_margin'])

        c.execute("""
            INSERT INTO notifications
            (margin_calc_id, account, contract_code, required_amount, current_margin, shortfall, status,
             dedup_key, is_duplicate, duplicate_of, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['account'], row['contract_code'],
            row['required_margin'], row['available_margin'], shortfall,
            'PENDING' if not is_duplicate else 'CANCELLED',
            dedup_key, is_duplicate, duplicate_of,
            f"IV跳变: {row['iv_jump_pct']}" if row['iv_jump_detected'] else None
        ))

        notifications.append({
            'id': c.lastrowid,
            'account': row['account'],
            'contract_code': row['contract_code'],
            'risk_level': row['risk_level'],
            'shortfall': shortfall,
            'is_duplicate': is_duplicate,
            'iv_jump': row['iv_jump_detected'],
            'combo_offset': row['combo_offset_applied']
        })

    conn.commit()
    conn.close()

    audit('notifications', None, 'generate', after_data={'count': len(notifications)})
    return notifications


def generate_daily_report():
    conn = get_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) as cnt FROM margin_calculations")
    total = c.fetchone()['cnt']

    c.execute("SELECT risk_level, COUNT(*) as cnt FROM margin_calculations GROUP BY risk_level")
    by_risk = {row['risk_level']: row['cnt'] for row in c.fetchall()}

    c.execute("SELECT COUNT(*) as cnt FROM notifications WHERE is_duplicate = 1")
    dup_count = c.fetchone()['cnt']

    c.execute("SELECT COUNT(*) as cnt FROM margin_calculations WHERE iv_jump_detected = 1")
    iv_jump_count = c.fetchone()['cnt']

    c.execute("SELECT COUNT(*) as cnt FROM margin_calculations WHERE combo_offset_applied = 1")
    combo_count = c.fetchone()['cnt']

    c.execute("""
        SELECT mc.*, p.account, p.contract_code, c.underlying
        FROM margin_calculations mc
        JOIN positions p ON mc.position_id = p.id
        JOIN contracts c ON p.contract_code = c.code
        ORDER BY mc.margin_ratio ASC
        LIMIT 10
    """)
    worst_positions = [dict(row) for row in c.fetchall()]

    summary = {
        'total_positions': total,
        'by_risk': by_risk,
        'duplicate_notifications': dup_count,
        'iv_jump_detections': iv_jump_count,
        'combo_offsets': combo_count,
        'generated_at': datetime.now().isoformat()
    }

    c.execute("""
        INSERT INTO risk_reports (report_type, period, summary, data, operator)
        VALUES (?, ?, ?, ?, ?)
    """, (
        'DAILY', datetime.now().strftime('%Y-%m-%d'),
        json.dumps(summary, ensure_ascii=False),
        json.dumps(worst_positions, ensure_ascii=False),
        'system'
    ))
    report_id = c.lastrowid

    conn.commit()
    conn.close()

    audit('risk_reports', report_id, 'generate')
    return {'id': report_id, 'summary': summary}
