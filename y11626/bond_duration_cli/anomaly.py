"""异常检测模块 - 曲线缺点、久期异常值、含权债到期口径"""
from __future__ import annotations

from datetime import date
from typing import Optional

from .models import Bond, BondMetrics, EmbeddedOptionType, YieldCurve
from .pricer import CurveInterpolator


class AnomalyType:
    CURVE_GAP = "curve_gap"
    CURVE_NEGATIVE_RATE = "curve_negative_rate"
    CURVE_INVERSION = "curve_inversion"
    DURATION_NEGATIVE = "duration_negative"
    DURATION_TOO_LARGE = "duration_too_large"
    DURATION_EXCEEDS_MATURITY = "duration_exceeds_maturity"
    DV01_MISMATCH = "dv01_mismatch"
    OPTION_MATURITY_MISMATCH = "option_maturity_mismatch"
    RATING_DOWNGRADE_RISK = "rating_downgrade_risk"
    CASHFLOW_OUT_OF_RANGE = "cashflow_out_of_range"


class AnomalySeverity:
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class AnomalyDetector:
    """异常检测器 - 识别并标记问题"""

    def __init__(self, curve: YieldCurve, settlement_date: Optional[date] = None):
        self.curve = curve
        self.interpolator = CurveInterpolator(curve)
        self.settlement_date = settlement_date or curve.as_of_date
        self._anomalies: list[dict] = []

    def detect_all(self, bonds: list[Bond], metrics: dict[str, BondMetrics]) -> list[dict]:
        """执行所有检测"""
        self._anomalies = []

        self._check_curve()
        for bond in bonds:
            m = metrics.get(bond.bond_id)
            if m:
                self._check_bond(bond, m)

        return self._anomalies

    def _add(self, anomaly_type: str, severity: str, message: str,
             target: str, details: Optional[dict] = None):
        self._anomalies.append({
            "type": anomaly_type,
            "severity": severity,
            "message": message,
            "target": target,
            "details": details or {},
        })

    # ── 曲线检测 ──────────────────────────────────────────

    def _check_curve(self):
        """检测收益率曲线异常"""
        points = self.curve.points

        # 1. 曲线缺点/缺口
        gaps = self.interpolator.has_gap(threshold_days=730)  # 2年以上才提示
        for i, j in gaps:
            gap_days = points[j].days - points[i].days
            self._add(
                AnomalyType.CURVE_GAP,
                AnomalySeverity.WARNING,  # 改为warning级别
                f"收益率曲线缺数据点: {points[i].tenor} 到 {points[j].tenor} 间隔{gap_days}天",
                self.curve.curve_id,
                {"gap_days": gap_days, "from_tenor": points[i].tenor, "to_tenor": points[j].tenor},
            )

        # 2. 负利率
        for p in points:
            if p.yield_rate < 0:
                self._add(
                    AnomalyType.CURVE_NEGATIVE_RATE,
                    AnomalySeverity.WARNING,
                    f"收益率曲线出现负利率: {p.tenor} = {p.yield_rate:.4%}",
                    self.curve.curve_id,
                    {"tenor": p.tenor, "rate": p.yield_rate},
                )

        # 3. 曲线倒挂
        for k in range(len(points) - 1):
            if points[k].yield_rate > points[k + 1].yield_rate:
                self._add(
                    AnomalyType.CURVE_INVERSION,
                    AnomalySeverity.WARNING,
                    f"收益率曲线倒挂: {points[k].tenor}={points[k].yield_rate:.4%} > "
                    f"{points[k+1].tenor}={points[k+1].yield_rate:.4%}",
                    self.curve.curve_id,
                    {"tenor_1": points[k].tenor, "rate_1": points[k].yield_rate,
                     "tenor_2": points[k + 1].tenor, "rate_2": points[k + 1].yield_rate},
                )

    # ── 债券检测 ──────────────────────────────────────────

    def _check_bond(self, bond: Bond, m: BondMetrics):
        """检测单只债券"""
        # 1. 久期为负
        if m.modified_duration is not None and m.modified_duration < 0:
            self._add(
                AnomalyType.DURATION_NEGATIVE,
                AnomalySeverity.ERROR,
                f"债券{bond.bond_id}修正久期为负: {m.modified_duration:.4f}",
                bond.bond_id,
                {"modified_duration": m.modified_duration},
            )

        # 2. 久期异常大
        if m.modified_duration is not None and m.modified_duration > 30:
            self._add(
                AnomalyType.DURATION_TOO_LARGE,
                AnomalySeverity.WARNING,
                f"债券{bond.bond_id}修正久期异常大: {m.modified_duration:.4f}年",
                bond.bond_id,
                {"modified_duration": m.modified_duration},
            )

        # 3. 久期超过剩余期限(含权债用期权日)
        if m.modified_duration is not None:
            eff_maturity = bond.maturity_date
            if bond.embedded_option == EmbeddedOptionType.CALLABLE and bond.call_date:
                eff_maturity = bond.call_date
            elif bond.embedded_option == EmbeddedOptionType.PUTTABLE and bond.put_date:
                eff_maturity = bond.put_date
            remaining = (eff_maturity - self.settlement_date).days / 365.0
            if remaining > 0 and m.modified_duration > remaining + 0.5:
                self._add(
                    AnomalyType.DURATION_EXCEEDS_MATURITY,
                    AnomalySeverity.WARNING,
                    f"债券{bond.bond_id}久期({m.modified_duration:.2f}年)超过剩余期限({remaining:.2f}年)",
                    bond.bond_id,
                    {"modified_duration": m.modified_duration, "remaining_years": remaining,
                     "effective_maturity": str(eff_maturity)},
                )

        # 4. 含权债到期口径
        if bond.embedded_option != EmbeddedOptionType.NONE:
            option_date = bond.call_date or bond.put_date
            opt_type = "赎回" if bond.embedded_option == EmbeddedOptionType.CALLABLE else "回售"
            if option_date and option_date < bond.maturity_date:
                self._add(
                    AnomalyType.OPTION_MATURITY_MISMATCH,
                    AnomalySeverity.WARNING,
                    f"含权债{bond.bond_id}:{opt_type}日({option_date})早于到期日({bond.maturity_date}),"
                    f"现金流/久期/DV01全部按{opt_type}日口径计算,实际到期存在不确定性",
                    bond.bond_id,
                    {"option_date": str(option_date), "maturity_date": str(bond.maturity_date),
                     "option_type": bond.embedded_option.value},
                )

        # 5. PV异常低(偏离面值+应计利息太多)
        if m.present_value is not None and m.dirty_price is not None:
            expected_dirty = bond.face_value + (m.accrued_interest or 0)
            if abs(m.dirty_price - expected_dirty) > bond.face_value * 0.3:
                self._add(
                    AnomalyType.CASHFLOW_OUT_OF_RANGE,
                    AnomalySeverity.WARNING,
                    f"债券{bond.bond_id}全价({m.dirty_price:.2f})偏离面值+应计利息过大,请确认票息和曲线",
                    bond.bond_id,
                    {"dirty_price": m.dirty_price, "expected_dirty": expected_dirty},
                )
