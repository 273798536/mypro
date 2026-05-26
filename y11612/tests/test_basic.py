"""基础测试用例"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from slippage_audit.matching_engine import FeeCalculator, SlippageCalculator, MatchingEngine, TradeResult
from slippage_audit.anomaly_detector import AnomalyDetector, AnomalySeverity, AnomalyType


class TestFeeCalculator:
    """测试手续费计算器"""

    def test_basic_buy_fee(self):
        config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 5},
                'sell': {'rate': 0.0013, 'min_fee': 5}
            }
        }
        calc = FeeCalculator(config)
        fee, detail = calc.calculate(10000, 1)
        assert fee == 5
        assert detail['commission'] == 5

    def test_buy_fee_without_min(self):
        config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 0},
                'sell': {'rate': 0.0013, 'min_fee': 0}
            }
        }
        calc = FeeCalculator(config)
        fee, detail = calc.calculate(10000, 1)
        assert abs(fee - 3) < 0.01
        assert abs(detail['commission'] - 3) < 0.01

    def test_sell_fee_with_stamp_duty(self):
        config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 5},
                'sell': {'rate': 0.0013, 'min_fee': 5, 'stamp_duty': 0.001}
            }
        }
        calc = FeeCalculator(config)
        fee, detail = calc.calculate(10000, -1)
        assert 'stamp_duty' in detail
        assert detail['stamp_duty'] == 10
        assert abs(fee - 23) < 0.01

    def test_tiered_fee(self):
        config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 0},
                'sell': {'rate': 0.0013, 'min_fee': 0}
            },
            'tiers': [
                {'threshold': 1000000, 'buy_rate': 0.00025, 'sell_rate': 0.0011}
            ]
        }
        calc = FeeCalculator(config)
        fee, detail = calc.calculate(10000, 1, total_amount=2000000)
        assert abs(fee - 2.5) < 0.01


class TestSlippageCalculator:
    """测试滑点计算器"""

    def test_fixed_slippage_buy(self):
        params = {'model': 'fixed', 'fixed': {'buy_bps': 3, 'sell_bps': 3}}
        calc = SlippageCalculator(params)
        slip, detail = calc.calculate(100, 1)
        assert abs(slip - 0.03) < 0.001
        assert detail['bps'] == 3

    def test_fixed_slippage_sell(self):
        params = {'model': 'fixed', 'fixed': {'buy_bps': 5, 'sell_bps': 3}}
        calc = SlippageCalculator(params)
        slip, detail = calc.calculate(100, -1)
        assert abs(slip - 0.03) < 0.001

    def test_percentage_slippage(self):
        params = {'model': 'percentage', 'percentage': {'buy_ratio': 0.0005, 'sell_ratio': 0.0003}}
        calc = SlippageCalculator(params)
        slip, detail = calc.calculate(100, 1)
        assert abs(slip - 0.05) < 0.001


class TestAnomalyDetector:
    """测试异常检测器"""

    def test_suspension_detection(self):
        detector = AnomalyDetector()
        recalculated = pd.DataFrame([
            {
                'datetime': pd.Timestamp('2024-01-15'),
                'symbol': '000001.SZ',
                'is_suspended': True,
                'volume': 1000,
                'price': 10.0,
                'amount': 10000,
                'match_method': 'test',
            }
        ])
        anomalies = detector.detect_suspension_trades(recalculated)
        assert len(detector.anomalies) == 1
        assert detector.anomalies[0].type == AnomalyType.SUSPENSION_TRADE
        assert detector.anomalies[0].severity == AnomalySeverity.CRITICAL

    def test_matching_order_change(self):
        detector = AnomalyDetector()
        recalculated = pd.DataFrame([
            {'datetime': pd.Timestamp('2024-01-02'), 'symbol': '000001.SZ'},
            {'datetime': pd.Timestamp('2024-01-01'), 'symbol': '600000.SH'},
        ])
        detector.detect_matching_order_change(recalculated)
        assert len(detector.anomalies) == 1
        assert detector.anomalies[0].type == AnomalyType.MATCHING_ORDER_CHANGED

    def test_negative_fee_detection(self):
        detector = AnomalyDetector()
        recalculated = pd.DataFrame([
            {
                'datetime': pd.Timestamp('2024-01-01'),
                'symbol': '000001.SZ',
                'fee': -10,
                'volume': 1000,
                'price': 10.0,
                'amount': 10000,
            }
        ])
        detector.detect_negative_fee(recalculated)
        assert len(detector.anomalies) == 1
        assert detector.anomalies[0].type == AnomalyType.NEGATIVE_FEE


class TestMatchingEngine:
    """测试撮合引擎"""

    def test_market_order_matching(self):
        kline = pd.DataFrame([
            {
                'datetime': pd.Timestamp('2024-01-01'),
                'symbol': '000001.SZ',
                'open': 10.0,
                'high': 10.5,
                'low': 9.9,
                'close': 10.2,
            }
        ])
        engine = MatchingEngine(kline, {}, {'model': 'fixed', 'fixed': {'buy_bps': 0, 'sell_bps': 0}})
        signal = pd.Series({
            'datetime': pd.Timestamp('2024-01-01'),
            'symbol': '000001.SZ',
            'direction': 1,
            'volume': 1000,
            'price': 0,
            'order_type': 'market',
        })
        result = engine.match_signal(signal)
        assert result.match_price == 10.0
        assert '开盘价' in result.match_method


def test_integration():
    """集成测试"""
    kline = pd.DataFrame([
        {
            'datetime': pd.Timestamp('2024-01-01'),
            'symbol': '000001.SZ',
            'open': 10.0,
            'high': 10.5,
            'low': 9.9,
            'close': 10.2,
            'volume': 100000,
            'amount': 1000000,
        },
        {
            'datetime': pd.Timestamp('2024-01-02'),
            'symbol': '000001.SZ',
            'open': 10.2,
            'high': 10.8,
            'low': 10.1,
            'close': 10.5,
            'volume': 120000,
            'amount': 1250000,
        },
    ])

    signals = pd.DataFrame([
        {
            'datetime': pd.Timestamp('2024-01-01'),
            'symbol': '000001.SZ',
            'direction': 1,
            'volume': 1000,
            'price': 10.0,
            'order_type': 'market',
        },
        {
            'datetime': pd.Timestamp('2024-01-02'),
            'symbol': '000001.SZ',
            'direction': -1,
            'volume': 1000,
            'price': 10.5,
            'order_type': 'market',
        },
    ])

    fee_config = {
        'commission': {
            'buy': {'rate': 0.0003, 'min_fee': 5},
            'sell': {'rate': 0.0013, 'min_fee': 5}
        }
    }
    slip_params = {'model': 'fixed', 'fixed': {'buy_bps': 3, 'sell_bps': 3}}

    engine = MatchingEngine(kline, fee_config, slip_params)
    results = engine.match_all(signals)

    assert len(results) == 2
    assert 'fee' in results.columns
    assert 'slippage' in results.columns
    assert 'match_price' in results.columns
