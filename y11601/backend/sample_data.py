import json
import random
from datetime import datetime, timedelta
from .models import get_connection, audit


def seed_sample_data():
    conn = get_connection()
    c = conn.cursor()

    c.execute("DELETE FROM margin_actions")
    c.execute("DELETE FROM notifications")
    c.execute("DELETE FROM margin_calculations")
    c.execute("DELETE FROM positions")
    c.execute("DELETE FROM quotes")
    c.execute("DELETE FROM contracts")

    contracts = [
        {
            'code': 'SR100-C-3000',
            'underlying': 'SR100',
            'option_type': 'CALL',
            'strike': 3000.0,
            'expiry_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            'multiplier': 10000
        },
        {
            'code': 'SR100-P-2800',
            'underlying': 'SR100',
            'option_type': 'PUT',
            'strike': 2800.0,
            'expiry_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            'multiplier': 10000
        },
        {
            'code': 'IF500-C-5500',
            'underlying': 'IF500',
            'option_type': 'CALL',
            'strike': 5500.0,
            'expiry_date': (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'),
            'multiplier': 10000
        },
        {
            'code': 'IF500-P-5200',
            'underlying': 'IF500',
            'option_type': 'PUT',
            'strike': 5200.0,
            'expiry_date': (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'),
            'multiplier': 10000
        },
        {
            'code': 'BAD-C-100',
            'underlying': 'BAD_STOCK',
            'option_type': 'CALL',
            'strike': -100.0,
            'expiry_date': '2020-01-01',
            'multiplier': 0
        }
    ]

    for ct in contracts:
        c.execute("""
            INSERT OR IGNORE INTO contracts (code, underlying, option_type, strike, expiry_date, multiplier)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ct['code'], ct['underlying'], ct['option_type'], ct['strike'], ct['expiry_date'], ct['multiplier']))

    positions = [
        {
            'account': 'ACC001',
            'contract_code': 'SR100-C-3000',
            'direction': 'LONG',
            'quantity': 10,
            'open_price': 85.5,
            'source': 'trading_system',
            'note': '正常看涨持仓'
        },
        {
            'account': 'ACC001',
            'contract_code': 'SR100-P-2800',
            'direction': 'LONG',
            'quantity': 5,
            'open_price': 42.3,
            'source': 'trading_system',
            'note': '保护性看跌'
        },
        {
            'account': 'ACC002',
            'contract_code': 'IF500-C-5500',
            'direction': 'SHORT',
            'quantity': 50,
            'open_price': 120.0,
            'source': 'manual_input',
            'note': '边界记录：大量空头，接近警戒线'
        },
        {
            'account': 'ACC002',
            'contract_code': 'IF500-P-5200',
            'direction': 'SHORT',
            'quantity': 30,
            'open_price': 95.0,
            'source': 'manual_input',
            'note': '与上方形成组合抵扣'
        },
        {
            'account': 'ACC999',
            'contract_code': 'BAD-C-100',
            'direction': 'LONG',
            'quantity': -999,
            'open_price': 0,
            'source': 'corrupted_data',
            'note': '明显坏数据：负价格、过期合约、乘数异常'
        }
    ]

    for pos in positions:
        c.execute("""
            INSERT INTO positions (account, contract_code, direction, quantity, open_price, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (pos['account'], pos['contract_code'], pos['direction'], pos['quantity'], pos['open_price'], pos['source'], pos['note']))

    base_time = datetime.now() - timedelta(minutes=30)
    quotes = []

    for i in range(10):
        ts = (base_time + timedelta(minutes=i * 3)).strftime('%Y-%m-%d %H:%M:%S')
        quotes.append({
            'contract_code': 'SR100-C-3000',
            'price': 80.0 + random.uniform(-5, 5),
            'iv': 0.20 + random.uniform(-0.01, 0.01),
            'delta': 0.55,
            'gamma': 0.003,
            'vega': 8.5,
            'theta': -2.1,
            'spot_price': 3020.0,
            'timestamp': ts
        })

    quotes.append({
        'contract_code': 'SR100-C-3000',
        'price': 95.0,
        'iv': 0.35,
        'delta': 0.58,
        'gamma': 0.004,
        'vega': 9.2,
        'theta': -2.5,
        'spot_price': 3030.0,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

    quotes.append({
        'contract_code': 'SR100-P-2800',
        'price': 38.5,
        'iv': 0.22,
        'delta': -0.42,
        'gamma': 0.002,
        'vega': 6.8,
        'theta': -1.5,
        'spot_price': 3020.0,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

    quotes.append({
        'contract_code': 'IF500-C-5500',
        'price': 135.0,
        'iv': 0.28,
        'delta': 0.62,
        'gamma': 0.002,
        'vega': 12.5,
        'theta': -3.5,
        'spot_price': 5600.0,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

    quotes.append({
        'contract_code': 'IF500-P-5200',
        'price': 88.0,
        'iv': 0.26,
        'delta': -0.45,
        'gamma': 0.001,
        'vega': 10.2,
        'theta': -2.8,
        'spot_price': 5600.0,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

    quotes.append({
        'contract_code': 'BAD-C-100',
        'price': 9999.0,
        'iv': 99.99,
        'delta': 2.5,
        'gamma': -1.0,
        'vega': 0,
        'theta': 0,
        'spot_price': 0,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

    for q in quotes:
        c.execute("""
            INSERT INTO quotes (contract_code, price, iv, delta, gamma, vega, theta, spot_price, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (q['contract_code'], q['price'], q['iv'], q['delta'], q['gamma'], q['vega'], q['theta'], q['spot_price'], q['timestamp']))

    try:
        c.execute("""
            CREATE TABLE IF NOT EXISTS account_balances (
                account TEXT PRIMARY KEY,
                balance REAL NOT NULL DEFAULT 1000000.0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
    except:
        pass

    c.execute("INSERT OR IGNORE INTO account_balances (account, balance) VALUES (?, ?)", ('ACC001', 5000000.0))
    c.execute("INSERT OR IGNORE INTO account_balances (account, balance) VALUES (?, ?)", ('ACC002', 800000.0))
    c.execute("INSERT OR IGNORE INTO account_balances (account, balance) VALUES (?, ?)", ('ACC999', 0.0))

    conn.commit()
    conn.close()

    audit('sample_data', None, 'seed', after_data={'contracts': len(contracts), 'positions': len(positions)})
    return {'contracts': len(contracts), 'positions': len(positions), 'quotes': len(quotes)}
