#!/usr/bin/env python3
"""生成示例测试数据 - 用于演示和测试量化回测滑点审计工具
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import yaml


def generate_kline_data(output_dir: str, start_date: str = "2024-01-01", days: int = 60):
    """生成示例K线数据"""
    dates = pd.date_range(start=start_date, periods=days, freq='D')
    symbols = ['000001.SZ', '600000.SH', '000002.SZ', '600519.SH']
    
    records = []
    for symbol in symbols:
        base_price = {
            '000001.SZ': 10.0,
            '600000.SH': 8.0,
            '000002.SZ': 15.0,
            '600519.SH': 1800.0,
        }[symbol]
        
        price = base_price
        for date in dates:
            if date.weekday() >= 5:
                continue
                
            returns = np.random.normal(0, 0.02)
            open_price = price
            close_price = price * (1 + returns)
            high_price = max(open_price, close_price) * (1 + abs(np.random.normal(0, 0.01)))
            low_price = min(open_price, close_price) * (1 - abs(np.random.normal(0, 0.01)))
            volume = np.random.randint(100000, 1000000)
            amount = (open_price + close_price) / 2 * volume
            
            records.append({
                'datetime': date,
                'symbol': symbol,
                'open': round(open_price, 2),
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'close': round(close_price, 2),
                'volume': volume,
                'amount': round(amount, 2),
            })
            price = close_price
    
    df = pd.DataFrame(records)
    output_path = os.path.join(output_dir, 'kline', 'kline_data.csv')
    df.to_csv(output_path, index=False)
    print(f"✓ K线数据已生成: {output_path} ({len(df)} 行")
    return df


def generate_signals(output_dir: str, kline_df: pd.DataFrame, num_signals: int = 100):
    """生成示例成交信号"""
    if kline_df is None or len(kline_df) == 0:
        dates = pd.date_range(start='2024-01-01', periods=60, freq='D')
        symbols = ['000001.SZ', '600000.SH']
    else:
        dates = kline_df['datetime'].unique()
        symbols = kline_df['symbol'].unique()
    
    records = []
    for i in range(num_signals):
        date = np.random.choice(dates)
        symbol = np.random.choice(symbols)
        
        if kline_df is not None and len(kline_df) > 0:
            kline_row = kline_df[(kline_df['datetime'] == date) & (kline_df['symbol'] == symbol)]
            if len(kline_row) > 0:
                price = kline_row.iloc[0]['close']
            else:
                price = 10.0
        else:
            price = 10.0
        
        direction = np.random.choice([1, -1])
        volume = np.random.randint(100, 10000)
        order_type = np.random.choice(['market', 'limit'])
        
        records.append({
            'datetime': date,
            'symbol': symbol,
            'direction': direction,
            'volume': volume,
            'price': round(price * (1 + np.random.normal(0, 0.01)), 2),
            'order_type': order_type,
        })
    
    df = pd.DataFrame(records)
    df = df.sort_values('datetime').reset_index(drop=True)
    
    output_path = os.path.join(output_dir, 'signals', 'signals.csv')
    df.to_csv(output_path, index=False)
    print(f"✓ 成交信号已生成: {output_path} ({len(df)} 行)")
    return df


def generate_fee_table(output_dir: str):
    """生成示例手续费表"""
    fee_config = {
        'commission': {
            'buy': {
                'rate': 0.0003,
                'min_fee': 5
            },
            'sell': {
                'rate': 0.0013,
                'min_fee': 5,
                'stamp_duty': 0.001
            }
        },
        'tiers': [
            {
                'threshold': 1000000,
                'buy_rate': 0.00025,
                'sell_rate': 0.0011
            },
            {
                'threshold': 5000000,
                'buy_rate': 0.0002,
                'sell_rate': 0.0010
            }
        ]
    }
    
    output_path = os.path.join(output_dir, 'fee_table', 'fee.yaml')
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(fee_config, f, allow_unicode=True, default_flow_style=False)
    print(f"✓ 手续费表已生成: {output_path}")


def generate_suspension(output_dir: str):
    """生成示例停牌日历"""
    records = [
        {
            'symbol': '000001.SZ',
            'suspend_date': '2024-01-15',
            'resume_date': '2024-01-20',
            'reason': '重大事项停牌'
        },
        {
            'symbol': '600000.SH',
            'suspend_date': '2024-02-01',
            'resume_date': '2024-02-05',
            'reason': '临时停牌'
        },
    ]
    
    df = pd.DataFrame(records)
    output_path = os.path.join(output_dir, 'suspension', 'suspension.csv')
    df.to_csv(output_path, index=False)
    print(f"✓ 停牌日历已生成: {output_path} ({len(df)} 行)")
    return df


def generate_slippage_params(output_dir: str):
    """生成示例滑点参数"""
    params = {
        'model': 'fixed',
        'fixed': {
            'buy_bps': 3,
            'sell_bps': 3
        },
        'percentage': {
            'buy_ratio': 0.0003,
            'sell_ratio': 0.0003
        },
        'volatility': {
            'lookback': 20,
            'multiplier': 0.1
        }
    }
    
    output_path = os.path.join(output_dir, 'slippage_params', 'slippage.yaml')
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(params, f, allow_unicode=True, default_flow_style=False)
    print(f"✓ 滑点参数已生成: {output_path}")


def generate_backtest_report(output_dir: str, signals_df: pd.DataFrame):
    """生成示例原始回测报告（包含一些有意的错误用于演示）"""
    records = []
    for _, signal in signals_df.iterrows():
        direction = signal['direction']
        price = signal['price']
        volume = signal['volume']
        amount = price * volume
        
        fee = amount * 0.0003 if direction > 0 else amount * 0.0013
        slippage = amount * 0.0003
        
        if np.random.random() < 0.1:
            fee *= 0.5
            slippage *= 0
        
        records.append({
            'datetime': signal['datetime'],
            'symbol': signal['symbol'],
            'direction': direction,
            'volume': volume,
            'price': price,
            'amount': amount,
            'fee': round(fee, 2),
            'slippage': round(slippage, 2),
            'net_pnl': round(np.random.normal(0, 1000), 2),
        })
    
    df = pd.DataFrame(records)
    output_path = os.path.join(output_dir, 'backtest_report', 'backtest.csv')
    df.to_csv(output_path, index=False)
    print(f"✓ 原始回测报告已生成: {output_path} ({len(df)} 行)")
    return df


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sample_dir = os.path.join(base_dir, 'sample_data')
    
    subdirs = ['kline', 'signals', 'fee_table', 'suspension', 'slippage_params', 'backtest_report']
    for d in subdirs:
        os.makedirs(os.path.join(sample_dir, d), exist_ok=True)
    
    print("=" * 50)
    print("生成示例数据用于测试数据...")
    print("=" * 50)
    
    kline_df = generate_kline_data(sample_dir)
    signals_df = generate_signals(sample_dir, kline_df)
    generate_fee_table(sample_dir)
    generate_suspension(sample_dir)
    generate_slippage_params(sample_dir)
    generate_backtest_report(sample_dir, signals_df)
    
    print("=" * 50)
    print(f"✓ 所有示例数据已生成在: {sample_dir}")
    print("=" * 50)
    print()
    print("运行审计命令:")
    print(f"  slippage-audit audit -i sample_data -o results")


if __name__ == '__main__':
    main()
