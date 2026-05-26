"""报告生成模块 - 评分计算和图表导出"""

from __future__ import annotations

import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .anomaly_detector import Anomaly, AnomalySeverity


@dataclass
class ScoreComponent:
    """评分组成部分"""
    name: str
    score: float
    max_score: float
    weight: float
    details: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "score": self.score,
            "max_score": self.max_score,
            "weight": self.weight,
            "weighted_score": self.score * self.weight / self.max_score if self.max_score > 0 else 0,
            "details": self.details,
        }


@dataclass
class AuditScore:
    """审计评分结果"""
    total_score: float
    max_score: float
    weighted_score: float
    components: List[ScoreComponent]
    grade: str
    anomalies_count: Dict
    summary: str

    def to_dict(self) -> Dict:
        return {
            "total_score": self.total_score,
            "max_score": self.max_score,
            "weighted_score": self.weighted_score,
            "grade": self.grade,
            "components": [c.to_dict() for c in self.components],
            "anomalies_count": self.anomalies_count,
            "summary": self.summary,
        }


class ScoreCalculator:
    """评分计算器"""

    def calculate(
        self,
        recalculated: pd.DataFrame,
        anomalies: List[Anomaly],
        original_report: Optional[pd.DataFrame] = None,
    ) -> AuditScore:
        """计算审计评分"""
        components: List[ScoreComponent] = []
        total_trades = len(recalculated)

        components.append(self._score_suspension(anomalies, total_trades))
        components.append(self._score_matching_order(anomalies, total_trades))
        components.append(self._score_fee_accuracy(anomalies, total_trades))
        components.append(self._score_slippage_accuracy(anomalies, total_trades))
        components.append(self._score_price_range(anomalies, total_trades))
        components.append(self._score_data_completeness(recalculated, anomalies))

        if original_report is not None and len(original_report) > 0:
            components.append(self._score_report_consistency(recalculated, original_report))

        weighted_score = sum(
            c.score * c.weight / c.max_score if c.max_score > 0 else 0
            for c in components
        )
        total_max_weight = sum(c.weight for c in components)
        normalized_score = (weighted_score / total_max_weight * 100) if total_max_weight > 0 else 0

        grade = self._get_grade(normalized_score)

        anomaly_counts = {}
        for a in anomalies:
            t = a.type.value
            anomaly_counts[t] = anomaly_counts.get(t, 0) + 1

        summary = self._generate_summary(normalized_score, grade, anomalies, components)

        return AuditScore(
            total_score=sum(c.score for c in components),
            max_score=sum(c.max_score for c in components),
            weighted_score=normalized_score,
            components=components,
            grade=grade,
            anomalies_count=anomaly_counts,
            summary=summary,
        )

    def _score_suspension(self, anomalies: List[Anomaly], total_trades: int) -> ScoreComponent:
        """停牌成交评分 - 权重最高，因为这是严重错误"""
        critical = [a for a in anomalies if a.type.value == 'suspension_trade']
        count = len(critical)
        max_score = 100
        weight = 0.25

        if count == 0:
            score = max_score
            details = {"message": "无停牌期间成交"}
        else:
            penalty = min(count * 20, max_score)
            score = max(0, max_score - penalty)
            details = {
                "suspension_trades": count,
                "penalty_per_trade": 20,
                "message": f"发现 {count} 笔停牌期间成交，每笔扣20分"
            }

        return ScoreComponent("停牌合规", score, max_score, weight, details)

    def _score_matching_order(self, anomalies: List[Anomaly], total_trades: int) -> ScoreComponent:
        """撮合顺序评分"""
        order_issues = [a for a in anomalies if a.type.value == 'matching_order_changed']
        count = len(order_issues)
        max_score = 100
        weight = 0.20

        if count == 0:
            score = max_score
            details = {"message": "撮合顺序正常"}
        else:
            penalty = min(count * 15, max_score)
            score = max(0, max_score - penalty)
            details = {
                "order_issues": count,
                "penalty_per_issue": 15,
                "message": f"发现 {count} 处撮合顺序异常，每处扣15分"
            }

        return ScoreComponent("撮合顺序", score, max_score, weight, details)

    def _score_fee_accuracy(self, anomalies: List[Anomaly], total_trades: int) -> ScoreComponent:
        """手续费准确度评分"""
        fee_issues = [a for a in anomalies if a.type.value in ['fee_mismatch', 'fee_tier_mismatch', 'negative_fee']]
        count = len(fee_issues)
        max_score = 100
        weight = 0.20

        if count == 0:
            score = max_score
            details = {"message": "手续费计算准确"}
        else:
            penalty = min(count * 5, max_score)
            score = max(0, max_score - penalty)
            details = {
                "fee_issues": count,
                "penalty_per_issue": 5,
                "message": f"发现 {count} 处手续费异常，每处扣5分"
            }

        return ScoreComponent("手续费准确度", score, max_score, weight, details)

    def _score_slippage_accuracy(self, anomalies: List[Anomaly], total_trades: int) -> ScoreComponent:
        """滑点准确度评分"""
        slip_issues = [a for a in anomalies if a.type.value == 'slippage_exceeded']
        count = len(slip_issues)
        max_score = 100
        weight = 0.15

        if count == 0:
            score = max_score
            details = {"message": "滑点计算准确"}
        else:
            penalty = min(count * 3, max_score)
            score = max(0, max_score - penalty)
            details = {
                "slippage_issues": count,
                "penalty_per_issue": 3,
                "message": f"发现 {count} 处滑点差异，每处扣3分"
            }

        return ScoreComponent("滑点准确度", score, max_score, weight, details)

    def _score_price_range(self, anomalies: List[Anomaly], total_trades: int) -> ScoreComponent:
        """价格范围合规评分"""
        price_issues = [a for a in anomalies if a.type.value == 'price_outside_range']
        count = len(price_issues)
        max_score = 100
        weight = 0.10

        if count == 0:
            score = max_score
            details = {"message": "所有成交价在K线范围内"}
        else:
            penalty = min(count * 5, max_score)
            score = max(0, max_score - penalty)
            details = {
                "price_issues": count,
                "penalty_per_issue": 5,
                "message": f"发现 {count} 笔成交价超出K线范围，每笔扣5分"
            }

        return ScoreComponent("价格范围", score, max_score, weight, details)

    def _score_data_completeness(self, recalculated: pd.DataFrame, anomalies: List[Anomaly]) -> ScoreComponent:
        """数据完整性评分"""
        missing_kline = [a for a in anomalies if a.type.value == 'missing_kline']
        count = len(missing_kline)
        total_trades = len(recalculated)
        max_score = 100
        weight = 0.10

        if total_trades == 0:
            return ScoreComponent("数据完整性", 0, max_score, weight, {"message": "无成交数据"})

        completeness_ratio = (total_trades - count) / total_trades
        score = int(completeness_ratio * max_score)

        details = {
            "total_trades": total_trades,
            "missing_kline": count,
            "completeness_ratio": completeness_ratio,
            "message": f"数据完整度 {completeness_ratio*100:.1f}%，{count} 笔缺少K线数据"
        }

        return ScoreComponent("数据完整性", score, max_score, weight, details)

    def _score_report_consistency(self, recalculated: pd.DataFrame, original: pd.DataFrame) -> ScoreComponent:
        """报告一致性评分"""
        max_score = 100
        weight = 0.10

        if len(recalculated) == 0 or len(original) == 0:
            return ScoreComponent("报告一致性", 50, max_score, weight, {"message": "数据不足，无法比较"})

        min_len = min(len(recalculated), len(original))
        recalc_total_fee = recalculated.iloc[:min_len]['fee'].sum()
        orig_total_fee = original.iloc[:min_len].get('fee', pd.Series([0]*min_len)).sum()

        recalc_total_slip = recalculated.iloc[:min_len]['slippage'].sum()
        orig_total_slip = original.iloc[:min_len].get('slippage', pd.Series([0]*min_len)).sum()

        total_amount = recalculated.iloc[:min_len]['amount'].sum()

        if total_amount == 0:
            return ScoreComponent("报告一致性", 50, max_score, weight, {"message": "成交金额为0"})

        fee_diff_pct = abs(recalc_total_fee - orig_total_fee) / total_amount * 10000
        slip_diff_pct = abs(recalc_total_slip - orig_total_slip) / total_amount * 10000

        avg_diff = (fee_diff_pct + slip_diff_pct) / 2
        score = max(0, int(max_score - avg_diff * 10))

        details = {
            "fee_diff_bps": fee_diff_pct,
            "slip_diff_bps": slip_diff_pct,
            "recalc_fee_total": recalc_total_fee,
            "orig_fee_total": orig_total_fee,
            "recalc_slip_total": recalc_total_slip,
            "orig_slip_total": orig_total_slip,
            "message": f"手续费差异 {fee_diff_pct:.2f}bps, 滑点差异 {slip_diff_pct:.2f}bps"
        }

        return ScoreComponent("报告一致性", score, max_score, weight, details)

    def _get_grade(self, score: float) -> str:
        """根据分数获取评级"""
        if score >= 90:
            return "A (优秀)"
        elif score >= 80:
            return "B (良好)"
        elif score >= 70:
            return "C (合格)"
        elif score >= 60:
            return "D (风险)"
        else:
            return "F (严重)"

    def _generate_summary(
        self,
        score: float,
        grade: str,
        anomalies: List[Anomaly],
        components: List[ScoreComponent]
    ) -> str:
        """生成评分摘要"""
        critical = sum(1 for a in anomalies if a.severity == AnomalySeverity.CRITICAL)
        warning = sum(1 for a in anomalies if a.severity == AnomalySeverity.WARNING)

        lowest_component = min(components, key=lambda c: c.score / c.max_score if c.max_score > 0 else 1)

        summary = (
            f"综合评分: {score:.1f}/100 ({grade})\n"
            f"异常总数: {len(anomalies)} (严重: {critical}, 警告: {warning})\n"
            f"最低分项: {lowest_component.name} - {lowest_component.score}/{lowest_component.max_score}\n"
            f"建议: {self._get_recommendation(score, critical, warning)}"
        )
        return summary

    def _get_recommendation(self, score: float, critical: int, warning: int) -> str:
        """生成建议"""
        if critical > 0:
            return "存在严重异常（停牌成交/撮合顺序错误），建议立即修正后重新回测"
        elif score < 60:
            return "评分过低，建议全面检查回测系统的撮合逻辑和费用计算"
        elif score < 80:
            return "存在较多异常，建议逐项核对手续费和滑点参数设置"
        elif score < 90:
            return "基本合格，少量异常需要关注"
        else:
            return "回测质量良好，可以信任回测结果"


class ChartExporter:
    """图表导出器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.charts_dir = os.path.join(output_dir, "charts")
        os.makedirs(self.charts_dir, exist_ok=True)

        sns.set_style("whitegrid")
        sns.set_palette("husl")
        plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False

    def export_all(
        self,
        recalculated: pd.DataFrame,
        original_report: Optional[pd.DataFrame] = None,
        anomalies: Optional[List[Anomaly]] = None,
        score: Optional[AuditScore] = None,
    ) -> List[str]:
        """导出所有图表"""
        exported = []

        if len(recalculated) > 0:
            exported.append(self.export_cumulative_pnl(recalculated, original_report))
            exported.append(self.export_fee_breakdown(recalculated))
            exported.append(self.export_slippage_distribution(recalculated))
            exported.append(self.export_daily_turnover(recalculated))

        if anomalies:
            exported.append(self.export_anomaly_summary(anomalies))

        if score:
            exported.append(self.export_score_radar(score))

        return [f for f in exported if f]

    def export_cumulative_pnl(
        self,
        recalculated: pd.DataFrame,
        original_report: Optional[pd.DataFrame] = None,
    ) -> Optional[str]:
        """导出累计收益曲线对比图"""
        fig, ax = plt.subplots(figsize=(12, 6))

        recalc_pnl = self._calculate_cumulative_pnl(recalculated)
        ax.plot(recalc_pnl.index, recalc_pnl.values, label='重算后收益', linewidth=2, color='#2ecc71')

        if original_report is not None and len(original_report) > 0:
            orig_pnl = self._calculate_cumulative_pnl(original_report)
            ax.plot(orig_pnl.index, orig_pnl.values, label='原始报告收益', linewidth=2, color='#e74c3c', alpha=0.7)

        ax.set_title('累计收益曲线对比', fontsize=14, fontweight='bold')
        ax.set_xlabel('时间')
        ax.set_ylabel('累计收益')
        ax.legend()
        ax.grid(True, alpha=0.3)

        filepath = os.path.join(self.charts_dir, 'cumulative_pnl.png')
        plt.tight_layout()
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath

    def _calculate_cumulative_pnl(self, df: pd.DataFrame) -> pd.Series:
        """计算累计收益"""
        df_sorted = df.sort_values('datetime').copy()
        if 'net_pnl' in df_sorted.columns:
            pnl = df_sorted.groupby('datetime')['net_pnl'].sum().cumsum()
        else:
            df_sorted['pnl'] = np.where(
                df_sorted['direction'] > 0,
                -df_sorted['net_amount'],
                df_sorted['net_amount']
            )
            pnl = df_sorted.groupby('datetime')['pnl'].sum().cumsum()
        return pnl

    def export_fee_breakdown(self, recalculated: pd.DataFrame) -> Optional[str]:
        """导出费用构成图"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        total_fee = recalculated['fee'].sum()
        total_slip = recalculated['slippage'].sum()
        total_amount = recalculated['amount'].sum()

        labels = ['手续费', '滑点']
        values = [total_fee, total_slip]
        colors = ['#3498db', '#e67e22']

        ax1.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
        ax1.set_title('交易成本构成', fontsize=12, fontweight='bold')

        fee_by_symbol = recalculated.groupby('symbol').agg({
            'fee': 'sum',
            'slippage': 'sum',
            'amount': 'sum'
        }).sort_values('amount', ascending=True).tail(10)

        if len(fee_by_symbol) > 0:
            y_pos = np.arange(len(fee_by_symbol))
            ax2.barh(y_pos, fee_by_symbol['fee'], label='手续费', color='#3498db', alpha=0.8)
            ax2.barh(y_pos, fee_by_symbol['slippage'], left=fee_by_symbol['fee'],
                     label='滑点', color='#e67e22', alpha=0.8)
            ax2.set_yticks(y_pos)
            ax2.set_yticklabels(fee_by_symbol.index)
            ax2.set_title('各标的交易成本（Top 10）', fontsize=12, fontweight='bold')
            ax2.legend()
            ax2.set_xlabel('金额')

        plt.tight_layout()
        filepath = os.path.join(self.charts_dir, 'fee_breakdown.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath

    def export_slippage_distribution(self, recalculated: pd.DataFrame) -> Optional[str]:
        """导出滑点分布图"""
        fig, ax = plt.subplots(figsize=(10, 6))

        slip_bps = (recalculated['slippage'] / recalculated['amount'] * 10000).replace([np.inf, -np.inf], np.nan).dropna()

        if len(slip_bps) > 0:
            ax.hist(slip_bps, bins=50, alpha=0.7, color='#9b59b6', edgecolor='black')
            ax.axvline(slip_bps.mean(), color='red', linestyle='--', linewidth=2,
                      label=f'均值: {slip_bps.mean():.2f} bps')
            ax.axvline(slip_bps.median(), color='green', linestyle='--', linewidth=2,
                      label=f'中位数: {slip_bps.median():.2f} bps')

        ax.set_title('滑点分布（bps）', fontsize=14, fontweight='bold')
        ax.set_xlabel('滑点 (bps)')
        ax.set_ylabel('频次')
        ax.legend()
        ax.grid(True, alpha=0.3)

        filepath = os.path.join(self.charts_dir, 'slippage_distribution.png')
        plt.tight_layout()
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath

    def export_daily_turnover(self, recalculated: pd.DataFrame) -> Optional[str]:
        """导出每日成交额图"""
        fig, ax = plt.subplots(figsize=(12, 6))

        daily = recalculated.copy()
        daily['date'] = pd.to_datetime(daily['datetime']).dt.date
        daily_stats = daily.groupby('date').agg({
            'amount': 'sum',
            'fee': 'sum',
            'slippage': 'sum'
        })

        if len(daily_stats) > 0:
            ax.bar(daily_stats.index, daily_stats['amount'], alpha=0.6, color='#1abc9c', label='成交额')
            ax2 = ax.twinx()
            ax2.plot(daily_stats.index, daily_stats['fee'] + daily_stats['slippage'],
                    color='#e74c3c', linewidth=2, marker='o', label='交易成本')
            ax2.set_ylabel('交易成本', color='#e74c3c')

        ax.set_title('每日成交额与交易成本', fontsize=14, fontweight='bold')
        ax.set_xlabel('日期')
        ax.set_ylabel('成交额')
        ax.legend(loc='upper left')
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        filepath = os.path.join(self.charts_dir, 'daily_turnover.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath

    def export_anomaly_summary(self, anomalies: List[Anomaly]) -> Optional[str]:
        """导出异常统计图"""
        if not anomalies:
            return None

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

        type_counts = {}
        for a in anomalies:
            t = a.type.value
            type_counts[t] = type_counts.get(t, 0) + 1

        types = sorted(type_counts.keys(), key=lambda x: type_counts[x], reverse=True)
        counts = [type_counts[t] for t in types]

        ax1.bar(range(len(types)), counts, color='#e74c3c', alpha=0.8)
        ax1.set_xticks(range(len(types)))
        ax1.set_xticklabels(types, rotation=45, ha='right')
        ax1.set_title('异常类型分布', fontsize=12, fontweight='bold')
        ax1.set_ylabel('数量')

        severity_counts = {'critical': 0, 'warning': 0, 'info': 0}
        for a in anomalies:
            severity_counts[a.severity.value] += 1

        labels = ['严重', '警告', '信息']
        values = [severity_counts['critical'], severity_counts['warning'], severity_counts['info']]
        colors = ['#e74c3c', '#f39c12', '#3498db']

        ax2.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
        ax2.set_title('异常严重程度分布', fontsize=12, fontweight='bold')

        plt.tight_layout()
        filepath = os.path.join(self.charts_dir, 'anomaly_summary.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath

    def export_score_radar(self, score: AuditScore) -> Optional[str]:
        """导出评分雷达图"""
        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(projection='polar'))

        categories = [c.name for c in score.components]
        values = [c.score / c.max_score * 100 if c.max_score > 0 else 0 for c in score.components]

        N = len(categories)
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += angles[:1]
        values += values[:1]

        ax.plot(angles, values, 'o-', linewidth=2, color='#2ecc71')
        ax.fill(angles, values, alpha=0.25, color='#2ecc71')

        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, fontsize=10)
        ax.set_ylim(0, 100)
        ax.set_title(f'审计评分: {score.weighted_score:.1f}/100 - {score.grade}',
                    fontsize=14, fontweight='bold', y=1.1)

        plt.tight_layout()
        filepath = os.path.join(self.charts_dir, 'score_radar.png')
        plt.savefig(filepath, dpi=150, bbox_inches='tight')
        plt.close()
        return filepath


def calculate_score(
    recalculated: pd.DataFrame,
    anomalies: List[Anomaly],
    original_report: Optional[pd.DataFrame] = None,
) -> AuditScore:
    """便捷函数：计算审计评分"""
    calculator = ScoreCalculator()
    return calculator.calculate(recalculated, anomalies, original_report)


def export_charts(
    output_dir: str,
    recalculated: pd.DataFrame,
    original_report: Optional[pd.DataFrame] = None,
    anomalies: Optional[List[Anomaly]] = None,
    score: Optional[AuditScore] = None,
) -> List[str]:
    """便捷函数：导出所有图表"""
    exporter = ChartExporter(output_dir)
    return exporter.export_all(recalculated, original_report, anomalies, score)
