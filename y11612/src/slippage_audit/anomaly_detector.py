"""异常检测模块 - 检测停牌成交、手续费阶梯、撮合顺序变化等异常"""

from __future__ import annotations

import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class AnomalySeverity(str, Enum):
    """异常严重程度"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class AnomalyType(str, Enum):
    """异常类型"""
    SUSPENSION_TRADE = "suspension_trade"
    FEE_TIER_MISMATCH = "fee_tier_mismatch"
    MATCHING_ORDER_CHANGED = "matching_order_changed"
    PRICE_OUTSIDE_RANGE = "price_outside_range"
    SLIPPAGE_EXCEEDED = "slippage_exceeded"
    FEE_MISMATCH = "fee_mismatch"
    MISSING_KLINE = "missing_kline"
    NEGATIVE_FEE = "negative_fee"


@dataclass
class Anomaly:
    """异常记录"""
    type: AnomalyType
    severity: AnomalySeverity
    message: str
    trade_index: Optional[int] = None
    symbol: Optional[str] = None
    datetime: Optional[pd.Timestamp] = None
    expected: Optional[float] = None
    actual: Optional[float] = None
    diff: Optional[float] = None
    details: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "message": self.message,
            "trade_index": self.trade_index,
            "symbol": self.symbol,
            "datetime": self.datetime.isoformat() if self.datetime else None,
            "expected": self.expected,
            "actual": self.actual,
            "diff": self.diff,
            "details": self.details,
        }


class AnomalyDetector:
    """异常检测器"""

    def __init__(self, tolerance_bps: float = 1.0):
        self.tolerance = tolerance_bps / 10000
        self.anomalies: List[Anomaly] = []

    def clear(self):
        self.anomalies = []

    def detect_all(
        self,
        recalculated: pd.DataFrame,
        original_report: Optional[pd.DataFrame] = None,
        kline: Optional[pd.DataFrame] = None,
        suspension: Optional[pd.DataFrame] = None,
        fee_config: Optional[Dict] = None
    ) -> List[Anomaly]:
        """运行所有检测"""
        self.clear()

        if len(recalculated) == 0:
            return self.anomalies

        self.detect_suspension_trades(recalculated)
        self.detect_price_outside_range(recalculated, kline)
        self.detect_matching_order_change(recalculated)
        self.detect_negative_fee(recalculated)

        if original_report is not None and len(original_report) > 0:
            self.detect_fee_mismatch(recalculated, original_report)
            self.detect_slippage_mismatch(recalculated, original_report)

        if fee_config and fee_config.get('tiers'):
            self.detect_fee_tier_usage(recalculated, fee_config)

        return self.anomalies

    def detect_suspension_trades(self, recalculated: pd.DataFrame):
        """检测停牌期间成交"""
        suspended = recalculated[recalculated['is_suspended'] == True]
        for idx, row in suspended.iterrows():
            self.anomalies.append(Anomaly(
                type=AnomalyType.SUSPENSION_TRADE,
                severity=AnomalySeverity.CRITICAL,
                message=f"停牌期间仍有成交: {row['symbol']} 在 {row['datetime']}",
                trade_index=idx,
                symbol=row['symbol'],
                datetime=row['datetime'],
                details={
                    "volume": row['volume'],
                    "price": row['price'],
                    "amount": row['amount'],
                    "match_method": row.get('match_method', '')
                }
            ))

    def detect_price_outside_range(self, recalculated: pd.DataFrame, kline: Optional[pd.DataFrame]):
        """检测成交价超出K线范围"""
        if kline is None or len(kline) == 0:
            return

        for idx, row in recalculated.iterrows():
            match_kline = kline[
                (kline['symbol'] == row['symbol']) &
                (kline['datetime'] >= row['datetime'])
            ].head(1)

            if len(match_kline) == 0:
                self.anomalies.append(Anomaly(
                    type=AnomalyType.MISSING_KLINE,
                    severity=AnomalySeverity.WARNING,
                    message=f"缺少K线数据: {row['symbol']} 在 {row['datetime']} 之后",
                    trade_index=idx,
                    symbol=row['symbol'],
                    datetime=row['datetime'],
                    details={"signal_price": row['match_price']}
                ))
                continue

            kl = match_kline.iloc[0]
            price = row['match_price']

            if price < kl['low'] * (1 - self.tolerance) or price > kl['high'] * (1 + self.tolerance):
                self.anomalies.append(Anomaly(
                    type=AnomalyType.PRICE_OUTSIDE_RANGE,
                    severity=AnomalySeverity.WARNING,
                    message=f"成交价格超出K线范围: {row['symbol']} 价格={price:.2f}, 范围=[{kl['low']:.2f}, {kl['high']:.2f}]",
                    trade_index=idx,
                    symbol=row['symbol'],
                    datetime=row['datetime'],
                    expected=None,
                    actual=price,
                    details={
                        "kline_low": kl['low'],
                        "kline_high": kl['high'],
                        "kline_open": kl['open'],
                        "kline_close": kl['close'],
                        "match_method": row.get('match_method', '')
                    }
                ))

    def detect_matching_order_change(self, recalculated: pd.DataFrame):
        """检测撮合顺序变化（与时间顺序不一致）"""
        if len(recalculated) < 2:
            return

        for i in range(1, len(recalculated)):
            prev_time = recalculated.iloc[i - 1]['datetime']
            curr_time = recalculated.iloc[i]['datetime']

            if curr_time < prev_time:
                self.anomalies.append(Anomaly(
                    type=AnomalyType.MATCHING_ORDER_CHANGED,
                    severity=AnomalySeverity.CRITICAL,
                    message=f"撮合顺序异常: 第{i}笔成交时间早于第{i-1}笔",
                    trade_index=i,
                    symbol=recalculated.iloc[i]['symbol'],
                    datetime=curr_time,
                    details={
                        "prev_index": i - 1,
                        "prev_time": prev_time.isoformat(),
                        "curr_time": curr_time.isoformat(),
                        "prev_symbol": recalculated.iloc[i - 1]['symbol'],
                        "curr_symbol": recalculated.iloc[i]['symbol'],
                    }
                ))

    def detect_fee_mismatch(self, recalculated: pd.DataFrame, original: pd.DataFrame):
        """检测手续费与原始报告不一致"""
        min_len = min(len(recalculated), len(original))

        for i in range(min_len):
            recalc_fee = recalculated.iloc[i]['fee']
            orig_fee = original.iloc[i].get('fee', 0)
            amount = recalculated.iloc[i]['amount']

            if amount > 0:
                diff_pct = abs(recalc_fee - orig_fee) / amount
                if diff_pct > self.tolerance:
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.FEE_MISMATCH,
                        severity=AnomalySeverity.WARNING,
                        message=f"手续费差异: 第{i}笔 重算={recalc_fee:.2f}, 原始={orig_fee:.2f}",
                        trade_index=i,
                        symbol=recalculated.iloc[i]['symbol'],
                        datetime=recalculated.iloc[i]['datetime'],
                        expected=orig_fee,
                        actual=recalc_fee,
                        diff=recalc_fee - orig_fee,
                        details={
                            "diff_pct": diff_pct * 10000,
                            "amount": amount,
                            "direction": recalculated.iloc[i]['direction'],
                        }
                    ))

    def detect_slippage_mismatch(self, recalculated: pd.DataFrame, original: pd.DataFrame):
        """检测滑点与原始报告不一致"""
        min_len = min(len(recalculated), len(original))

        for i in range(min_len):
            recalc_slip = recalculated.iloc[i]['slippage']
            orig_slip = original.iloc[i].get('slippage', 0)
            amount = recalculated.iloc[i]['amount']

            if amount > 0:
                diff_pct = abs(recalc_slip - orig_slip) / amount
                if diff_pct > self.tolerance:
                    self.anomalies.append(Anomaly(
                        type=AnomalyType.SLIPPAGE_EXCEEDED,
                        severity=AnomalySeverity.WARNING,
                        message=f"滑点差异: 第{i}笔 重算={recalc_slip:.2f}, 原始={orig_slip:.2f}",
                        trade_index=i,
                        symbol=recalculated.iloc[i]['symbol'],
                        datetime=recalculated.iloc[i]['datetime'],
                        expected=orig_slip,
                        actual=recalc_slip,
                        diff=recalc_slip - orig_slip,
                        details={
                            "diff_pct": diff_pct * 10000,
                            "amount": amount,
                            "direction": recalculated.iloc[i]['direction'],
                        }
                    ))

    def detect_fee_tier_usage(self, recalculated: pd.DataFrame, fee_config: Dict):
        """检测手续费阶梯使用情况"""
        tiers = fee_config.get('tiers', [])
        if not tiers:
            return

        total_buy = 0
        total_sell = 0

        for idx, row in recalculated.iterrows():
            if row['direction'] > 0:
                total_buy += row['amount']
                current_total = total_buy
            else:
                total_sell += row['amount']
                current_total = total_sell

            rate_used = row.get('fee_rate_used', 0)
            expected_rate = self._get_expected_rate(current_total, row['direction'], fee_config)

            if abs(rate_used - expected_rate) > 1e-8:
                self.anomalies.append(Anomaly(
                    type=AnomalyType.FEE_TIER_MISMATCH,
                    severity=AnomalySeverity.WARNING,
                    message=f"手续费阶梯不匹配: 累计金额={current_total:.2f}, 使用费率={rate_used:.6f}, 预期费率={expected_rate:.6f}",
                    trade_index=idx,
                    symbol=row['symbol'],
                    datetime=row['datetime'],
                    expected=expected_rate,
                    actual=rate_used,
                    details={
                        "total_amount": current_total,
                        "direction": row['direction'],
                        "tiers": [t.get('threshold') for t in tiers],
                    }
                ))

    def _get_expected_rate(self, total_amount: float, direction: int, fee_config: Dict) -> float:
        """获取预期费率"""
        tiers = fee_config.get('tiers', [])
        default_buy = fee_config.get('commission', {}).get('buy', {}).get('rate', 0.0003)
        default_sell = fee_config.get('commission', {}).get('sell', {}).get('rate', 0.0013)

        buy_rate = default_buy
        sell_rate = default_sell

        for tier in sorted(tiers, key=lambda x: x.get('threshold', 0), reverse=True):
            if total_amount >= tier.get('threshold', 0):
                buy_rate = tier.get('buy_rate', buy_rate)
                sell_rate = tier.get('sell_rate', sell_rate)
                break

        return buy_rate if direction > 0 else sell_rate

    def detect_negative_fee(self, recalculated: pd.DataFrame):
        """检测负手续费（异常情况）"""
        negative_fees = recalculated[recalculated['fee'] < 0]
        for idx, row in negative_fees.iterrows():
            self.anomalies.append(Anomaly(
                type=AnomalyType.NEGATIVE_FEE,
                severity=AnomalySeverity.CRITICAL,
                message=f"负手续费异常: {row['symbol']} 手续费={row['fee']:.2f}",
                trade_index=idx,
                symbol=row['symbol'],
                datetime=row['datetime'],
                actual=row['fee'],
                details={
                    "volume": row['volume'],
                    "price": row['price'],
                    "amount": row['amount'],
                }
            ))

    def get_summary(self) -> Dict:
        """获取异常统计摘要"""
        summary = {
            "total": len(self.anomalies),
            "by_type": {},
            "by_severity": {
                "critical": 0,
                "warning": 0,
                "info": 0,
            }
        }

        for anomaly in self.anomalies:
            t = anomaly.type.value
            summary["by_type"][t] = summary["by_type"].get(t, 0) + 1
            summary["by_severity"][anomaly.severity.value] += 1

        return summary


def detect_anomalies(
    recalculated: pd.DataFrame,
    original_report: Optional[pd.DataFrame] = None,
    kline: Optional[pd.DataFrame] = None,
    suspension: Optional[pd.DataFrame] = None,
    fee_config: Optional[Dict] = None,
    tolerance_bps: float = 1.0
) -> Tuple[List[Anomaly], Dict]:
    """便捷函数：检测所有异常并返回结果和摘要"""
    detector = AnomalyDetector(tolerance_bps)
    anomalies = detector.detect_all(recalculated, original_report, kline, suspension, fee_config)
    summary = detector.get_summary()
    return anomalies, summary
