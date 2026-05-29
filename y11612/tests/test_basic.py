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

    def test_tiered_fee_buy(self):
        """测试买入阶梯费率"""
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
        assert abs(detail['rate_used'] - 0.00025) < 1e-8

    def test_tiered_fee_sell(self):
        """测试卖出阶梯费率 - 这是之前的bug所在"""
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
        fee, detail = calc.calculate(10000, -1, total_amount=2000000)
        assert abs(fee - 11) < 0.01
        assert abs(detail['rate_used'] - 0.0011) < 1e-8

    def test_tiered_fee_sell_below_threshold(self):
        """测试卖出未达阶梯阈值时使用默认费率"""
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
        fee, detail = calc.calculate(10000, -1, total_amount=500000)
        assert abs(fee - 13) < 0.01
        assert abs(detail['rate_used'] - 0.0013) < 1e-8

    def test_multiple_tiers(self):
        """测试多档位阶梯费率"""
        config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 0},
                'sell': {'rate': 0.0013, 'min_fee': 0}
            },
            'tiers': [
                {'threshold': 1000000, 'buy_rate': 0.00025, 'sell_rate': 0.0011},
                {'threshold': 5000000, 'buy_rate': 0.0002, 'sell_rate': 0.0010},
            ]
        }
        calc = FeeCalculator(config)

        fee, detail = calc.calculate(10000, -1, total_amount=2000000)
        assert abs(detail['rate_used'] - 0.0011) < 1e-8

        fee, detail = calc.calculate(10000, -1, total_amount=6000000)
        assert abs(detail['rate_used'] - 0.0010) < 1e-8


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


class TestAuditTrail:
    """测试审计追踪"""

    def test_parameter_version_logging(self, tmp_path):
        """测试参数版本记录"""
        from slippage_audit.audit_trail import create_audit_trail

        output_dir = str(tmp_path / "audit_test")
        audit = create_audit_trail(output_dir)

        fee_config = {
            'commission': {
                'buy': {'rate': 0.0003, 'min_fee': 5},
                'sell': {'rate': 0.0013, 'min_fee': 5}
            }
        }

        audit.log_parameter_version(
            name="fee_config",
            value=fee_config,
            reason="初始手续费配置",
            changed_by="test_user"
        )

        assert len(audit.parameter_versions) == 1
        assert audit.parameter_versions[0].name == "fee_config"
        assert audit.parameter_versions[0].version == "v1"
        assert audit.parameter_versions[0].changed_by == "test_user"
        assert audit.parameter_versions[0].effective_to is None

    def test_correction_logging(self, tmp_path):
        """测试修正痕迹记录"""
        from slippage_audit.audit_trail import create_audit_trail

        output_dir = str(tmp_path / "audit_test")
        audit = create_audit_trail(output_dir)

        audit.log_correction(
            field="fee",
            old_value=2.5,
            new_value=11.0,
            reason="手续费阶梯不匹配：卖出费率应为0.0011",
            corrected_by="audit_system",
            trade_index=5,
            symbol="000001.SZ"
        )

        assert len(audit.corrections) == 1
        assert audit.corrections[0].field == "fee"
        assert audit.corrections[0].old_value == 2.5
        assert audit.corrections[0].new_value == 11.0
        assert audit.corrections[0].trade_index == 5
        assert "000001.SZ" in audit.corrections[0].symbol

    def test_audit_summary(self, tmp_path):
        """测试审计摘要"""
        from slippage_audit.audit_trail import create_audit_trail

        output_dir = str(tmp_path / "audit_test")
        audit = create_audit_trail(output_dir)

        audit.log_parameter_version(
            name="fee_config",
            value={"test": "value"},
            reason="测试参数"
        )

        audit.log_correction(
            field="test_field",
            old_value=1,
            new_value=2,
            reason="测试修正"
        )

        summary = audit.get_summary()
        assert summary["total_parameter_versions"] == 1
        assert summary["total_corrections"] == 1
