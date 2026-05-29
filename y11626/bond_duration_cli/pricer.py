"""计算核心 - 现金流生成、曲线插值、久期/凸性/DV01/YTM 计算"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

import numpy as np

from .models import (
    Bond, BondMetrics, EmbeddedOptionType, YieldCurve, YieldCurvePoint,
)


@dataclass
class CashFlowItem:
    pay_date: date
    amount: float
    cf_type: str


def generate_cashflows(bond: Bond, settlement_date: date,
                       effective_maturity: Optional[date] = None) -> list[CashFlowItem]:
    """生成债券的现金流序列 - 考虑含权债的有效到期日"""
    flows: list[CashFlowItem] = []
    freq = bond.coupon_frequency
    coupon_per_period = bond.face_value * bond.coupon_rate / freq
    period_days = int(365 / freq)
    final_maturity = effective_maturity or bond.maturity_date

    d = bond.issue_date
    while d < final_maturity:
        d = _add_period(d, period_days)
        if d > settlement_date and d <= final_maturity:
            flows.append(CashFlowItem(pay_date=d, amount=coupon_per_period, cf_type="coupon"))
        if d >= final_maturity:
            break

    if final_maturity > settlement_date:
        flows.append(CashFlowItem(pay_date=final_maturity, amount=bond.face_value, cf_type="principal"))
    return flows


def _add_period(d: date, days: int) -> date:
    return d + timedelta(days=days)


def days_between(d1: date, d2: date) -> float:
    """精确天数差(年) - ACT/365"""
    return (d2 - d1).days / 365.0


class CurveInterpolator:
    """收益率曲线插值 - 支持线性/三次样条"""

    def __init__(self, curve: YieldCurve):
        self.curve = curve
        self._days = np.array([p.days for p in curve.points], dtype=float)
        self._rates = np.array([p.yield_rate for p in curve.points], dtype=float)

    def has_gap(self, threshold_days: int = 365) -> list[tuple[int, int]]:
        """检测曲线缺口 - 返回缺口的索引对"""
        gaps = []
        for i in range(len(self._days) - 1):
            if self._days[i + 1] - self._days[i] > threshold_days:
                gaps.append((i, i + 1))
        return gaps

    def interpolate(self, days: float, method: str = "cubic") -> float:
        """插值计算指定天数对应的收益率"""
        days = max(days, self._days[0])
        days = min(days, self._days[-1])

        if method == "linear":
            return float(np.interp(days, self._days, self._rates))
        elif method == "cubic":
            return float(self._cubic_interp(days))
        else:
            raise ValueError(f"未知插值方法: {method}")

    def _cubic_interp(self, x: float) -> float:
        """纯numpy三次样条插值(自然边界)"""
        n = len(self._days)
        if n < 4:
            return float(np.interp(x, self._days, self._rates))

        xs = self._days
        ys = self._rates

        h = np.diff(xs)
        lam = h[1:] / (h[:-1] + h[1:])
        mu = 1 - lam

        d = 6 * (
            (ys[2:] - ys[1:-1]) / h[1:] - (ys[1:-1] - ys[:-2]) / h[:-1]
        ) / (h[:-1] + h[1:])

        M = np.zeros(n)
        if n >= 3:
            A = np.diag(2 * np.ones(n - 2))
            for i in range(n - 3):
                A[i, i + 1] = lam[i]
                A[i + 1, i] = mu[i]
            try:
                M_inner = np.linalg.solve(A, d)
                M[1:-1] = M_inner
            except np.linalg.LinAlgError:
                return float(np.interp(x, self._days, self._rates))

        for i in range(n - 1):
            if xs[i] <= x <= xs[i + 1]:
                h_i = xs[i + 1] - xs[i]
                t = (x - xs[i]) / h_i
                val = (
                    (1 - t) * ys[i] + t * ys[i + 1]
                    + h_i ** 2 * (
                        (t ** 3 - 3 * t + 2) * M[i] / 6
                        + (t ** 3 - t) * M[i + 1] / 6
                    )
                )
                return float(val)
        return float(np.interp(x, self._days, self._rates))

    def get_rate(self, tenor_days: float, method: str = "cubic") -> float:
        return self.interpolate(tenor_days, method)


class BondPricer:
    """债券定价与风险指标计算"""

    def __init__(self, curve: YieldCurve, settlement_date: Optional[date] = None):
        self.curve = curve
        self.interpolator = CurveInterpolator(curve)
        self.settlement_date = settlement_date or curve.as_of_date
        self.warnings: list[str] = []

    def price_bond(self, bond: Bond) -> BondMetrics:
        """计算单只债券的全部指标"""
        metrics = BondMetrics(bond_id=bond.bond_id)
        self.warnings = []
        qty = bond.position / bond.face_value

        # --- 含权债特殊处理 ---
        eff_maturity, opt_warnings = self._adjust_maturity_for_option(bond)
        self.warnings.extend(opt_warnings)

        # --- 生成现金流 (含权债按有效到期日截断) ---
        flows = generate_cashflows(bond, self.settlement_date, effective_maturity=eff_maturity)
        if not flows:
            metrics.warnings.append("无有效现金流")
            return metrics

        # --- 计算折现因子与PV ---
        pv_sum = 0.0
        weighted_time = 0.0
        weighted_time_sq = 0.0

        for cf in flows:
            t = days_between(self.settlement_date, cf.pay_date)
            if t < 0:
                continue
            rate = self.interpolator.get_rate(t * 365, "cubic")
            df = math.exp(-rate * t)
            pv = cf.amount * df
            pv_sum += pv
            weighted_time += pv * t
            weighted_time_sq += pv * t * t

        if pv_sum < 1e-12:
            metrics.warnings.append("现值接近零")
            return metrics

        # --- Macaulay久期 ---
        mac_dur = weighted_time / pv_sum
        metrics.macaulay_duration = round(mac_dur, 6)

        # --- 修正久期 ---
        ytm_est = self._estimate_ytm(bond, eff_maturity)
        freq = bond.coupon_frequency
        mod_dur = mac_dur / (1 + ytm_est / freq)
        metrics.modified_duration = round(mod_dur, 6)

        # --- 凸性 ---
        convexity = weighted_time_sq / pv_sum
        metrics.convexity = round(convexity, 6)

        # --- DV01 ---
        dv01 = mod_dur * pv_sum * 0.0001 * qty
        metrics.dv01 = round(dv01, 2)

        # --- 现值 ---
        metrics.present_value = round(pv_sum * qty, 2)

        # --- 应计利息 ---
        metrics.accrued_interest = self._accrued_interest(bond)

        # --- 全价 ---
        metrics.dirty_price = round(pv_sum + metrics.accrued_interest, 2)

        # --- 有效久期(含权债) ---
        if bond.embedded_option != EmbeddedOptionType.NONE:
            metrics.effective_duration = self._effective_duration(bond, mod_dur)

        # --- YTM ---
        metrics.ytm = round(ytm_est, 6)

        # --- 关键利率久期(简化) ---
        metrics.key_rate_durations = self._key_rate_durations(bond, flows)

        metrics.warnings = self.warnings.copy()
        return metrics

    def _adjust_maturity_for_option(self, bond: Bond) -> tuple[date, list[str]]:
        """根据嵌入期权调整到期日"""
        if bond.embedded_option == EmbeddedOptionType.CALLABLE and bond.call_date:
            if bond.call_date < bond.maturity_date:
                return bond.call_date, []
        elif bond.embedded_option == EmbeddedOptionType.PUTTABLE and bond.put_date:
            if bond.put_date < bond.maturity_date:
                return bond.put_date, []
        return bond.maturity_date, []

    def _estimate_ytm(self, bond: Bond, maturity: date) -> float:
        """简化YTM估算 - 用当前曲线平均收益率"""
        t = days_between(self.settlement_date, maturity)
        return self.interpolator.get_rate(t * 365, "cubic")

    def _accrued_interest(self, bond: Bond) -> float:
        """应计利息"""
        freq = bond.coupon_frequency
        period_days = int(365 / freq)
        last_coupon = bond.issue_date
        next_coupon = _add_period(bond.issue_date, period_days)
        while next_coupon < self.settlement_date:
            last_coupon = next_coupon
            next_coupon = _add_period(next_coupon, period_days)
        if self.settlement_date <= bond.issue_date:
            return 0.0
        days_since = (self.settlement_date - last_coupon).days
        period_len = (next_coupon - last_coupon).days or 1
        return bond.face_value * bond.coupon_rate / freq * days_since / period_len

    def _effective_duration(self, bond: Bond, mod_dur: float) -> float:
        """有效久期 - 含权债近似处理"""
        factor = 0.85 if bond.embedded_option == EmbeddedOptionType.CALLABLE else 0.95
        return round(mod_dur * factor, 6)

    def _key_rate_durations(self, bond: Bond, flows: list[CashFlowItem]) -> dict[str, float]:
        """关键利率久期 - 简化版"""
        key_tenors = {
            "3M": 90, "6M": 180, "1Y": 365,
            "2Y": 730, "3Y": 1095, "5Y": 1825,
            "7Y": 2555, "10Y": 3650, "20Y": 7300, "30Y": 10950,
        }
        krds: dict[str, float] = {}
        base_pv = sum(
            cf.amount * math.exp(-self.interpolator.get_rate(
                days_between(self.settlement_date, cf.pay_date) * 365
            ) * days_between(self.settlement_date, cf.pay_date))
            for cf in flows
            if days_between(self.settlement_date, cf.pay_date) >= 0
        )
        if base_pv < 1e-12:
            return krds

        for tenor, days in key_tenors.items():
            shock_rate = self.interpolator.get_rate(days) + 0.01
            orig_rate = self.interpolator.get_rate(days)
            krds[tenor] = round((shock_rate - orig_rate) * base_pv * 0.0001, 4)
        return krds
