"""归因分析 - 找出拖累最大的券 + 情景对比"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .models import (
    Bond, BondMetrics, PortfolioSummary, YieldCurve, YieldCurvePoint,
    ScenarioConfig, AnalysisResult,
)
from .pricer import BondPricer
from .anomaly import AnomalyDetector


@dataclass
class AttributionResult:
    """单只债券的归因条目"""
    bond_id: str
    name: str
    position: float
    present_value: float
    modified_duration: float
    dv01: float
    contribution_pct: float
    contribution_rank: int


class AttributionAnalyzer:
    """归因分析器 - 找出对组合久期/DV01贡献最大的券"""

    def __init__(self, bonds: list[Bond], metrics: dict[str, BondMetrics]):
        self.bonds = bonds
        self.metrics = metrics

    def compute(self, top_n: int = 5) -> PortfolioSummary:
        """计算组合汇总与归因"""
        total_pv = 0.0
        total_dv01 = 0.0
        contributions: dict[str, float] = {}

        # 计算总PV和总DV01
        for bond in self.bonds:
            m = self.metrics.get(bond.bond_id)
            if m and m.present_value and m.dv01:
                total_pv += m.present_value
                total_dv01 += m.dv01
                contributions[bond.bond_id] = m.dv01

        # 加权久期
        if total_pv > 0:
            weighted_dur = sum(
                (self.metrics[b.bond_id].modified_duration or 0)
                * (self.metrics[b.bond_id].present_value or 0)
                for b in self.bonds
                if self.metrics.get(b.bond_id) and self.metrics[b.bond_id].present_value
            ) / total_pv
        else:
            weighted_dur = 0.0

        # 加权凸性
        if total_pv > 0:
            weighted_conv = sum(
                (self.metrics[b.bond_id].convexity or 0)
                * (self.metrics[b.bond_id].present_value or 0)
                for b in self.bonds
                if self.metrics.get(b.bond_id) and self.metrics[b.bond_id].present_value
            ) / total_pv
        else:
            weighted_conv = 0.0

        # 归因百分比
        contrib_pct = {
            bid: (dv / total_dv01 * 100) if total_dv01 > 0 else 0
            for bid, dv in contributions.items()
        }

        # 找出拖累最大的券
        sorted_contribs = sorted(contrib_pct.items(), key=lambda x: x[1], reverse=True)
        worst = []
        for rank, (bid, pct) in enumerate(sorted_contribs[:top_n], 1):
            bond_map = {b.bond_id: b for b in self.bonds}
            b = bond_map.get(bid)
            m = self.metrics.get(bid)
            if b and m:
                worst.append({
                    "rank": rank,
                    "bond_id": bid,
                    "name": b.name,
                    "position": b.position,
                    "present_value": m.present_value or 0,
                    "modified_duration": m.modified_duration or 0,
                    "dv01": m.dv01 or 0,
                    "contribution_pct": round(pct, 2),
                })

        return PortfolioSummary(
            total_pv=round(total_pv, 2),
            total_dv01=round(total_dv01, 2),
            weighted_duration=round(weighted_dur, 6),
            weighted_convexity=round(weighted_conv, 6),
            contribution_by_bond={k: round(v, 4) for k, v in contributions.items()},
            worst_contributors=worst,
        )


class ScenarioRunner:
    """情景对比 - 平行移动/扭曲"""

    @staticmethod
    def apply_scenario(base_curve: YieldCurve, scenario: ScenarioConfig) -> YieldCurve:
        """根据情景配置生成新的收益率曲线"""
        new_points = []
        for p in base_curve.points:
            rate = p.yield_rate
            # 平行移动
            rate += scenario.shift_bp / 10000
            # 扭曲
            if scenario.twist_short_bp != 0 or scenario.twist_long_bp != 0:
                pivot_days = {
                    "3M": 90, "6M": 180, "1Y": 365,
                    "2Y": 730, "3Y": 1095, "5Y": 1825,
                    "7Y": 2555, "10Y": 3650, "20Y": 7300, "30Y": 10950,
                }.get(scenario.pivot_tenor, 1825)
                if p.days <= pivot_days:
                    rate += scenario.twist_short_bp / 10000 * (1 - p.days / pivot_days)
                else:
                    rate += scenario.twist_long_bp / 10000 * (p.days - pivot_days) / (36500 - pivot_days)
            new_points.append(YieldCurvePoint(
                tenor=p.tenor, days=p.days, yield_rate=round(rate, 6),
            ))
        return YieldCurve(
            curve_id=f"{base_curve.curve_id}-{scenario.name}",
            name=f"{base_curve.name}_{scenario.name}",
            currency=base_curve.currency,
            as_of_date=base_curve.as_of_date,
            points=new_points,
        )

    @staticmethod
    def run_comparison(
        bonds: list[Bond],
        base_curve: YieldCurve,
        scenarios: list[ScenarioConfig],
    ) -> list[AnalysisResult]:
        """运行多个情景并返回对比结果"""
        results: list[AnalysisResult] = []

        # 基准情景
        base_pricer = BondPricer(base_curve)
        base_metrics = {b.bond_id: base_pricer.price_bond(b) for b in bonds}
        base_detector = AnomalyDetector(base_curve)
        base_anomalies = base_detector.detect_all(bonds, base_metrics)
        base_attribution = AttributionAnalyzer(bonds, base_metrics).compute()
        results.append(AnalysisResult(
            scenario_name="base",
            curve_id=base_curve.curve_id,
            bond_metrics=base_metrics,
            portfolio=base_attribution,
            anomalies=base_anomalies,
        ))

        # 各个情景
        for scenario in scenarios:
            scen_curve = ScenarioRunner.apply_scenario(base_curve, scenario)
            pricer = BondPricer(scen_curve)
            metrics = {b.bond_id: pricer.price_bond(b) for b in bonds}
            detector = AnomalyDetector(scen_curve)
            anomalies = detector.detect_all(bonds, metrics)
            attribution = AttributionAnalyzer(bonds, metrics).compute()
            results.append(AnalysisResult(
                scenario_name=scenario.name,
                curve_id=scen_curve.curve_id,
                bond_metrics=metrics,
                portfolio=attribution,
                anomalies=anomalies,
            ))

        return results
