import pandas as pd
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from .decompose import DecomposeResult
from .data_loader import LoadedData, DataStatus, DataIssue


@dataclass
class Interpretation:
    overall: str
    available_summary: str
    pending_summary: str
    need_recollect_summary: str
    quality_assessment: str
    seasonal_findings: str
    trend_findings: str
    recommendations: List[str]
    details: Dict[str, str] = field(default_factory=dict)

    def to_markdown(self) -> str:
        lines = [
            "# 时间序列季节拆分结果说明",
            "",
            "## 一、总体结论",
            self.overall,
            "",
            "## 二、数据可用性分级",
            "",
            "### ✅ 可直接使用",
            self.available_summary,
            "",
            "### ⚠️ 暂缓使用（待数据分析员复核）",
            self.pending_summary,
            "",
            "### ❌ 需要重新采集",
            self.need_recollect_summary,
            "",
            "## 三、数据质量评估",
            self.quality_assessment,
            "",
            "## 四、分析发现",
            "",
            "### 季节性",
            self.seasonal_findings,
            "",
            "### 趋势",
            self.trend_findings,
            "",
            "## 五、后续建议",
        ]
        for i, rec in enumerate(self.recommendations, 1):
            lines.append(f"{i}. {rec}")
        return "\n".join(lines)

    def to_text(self) -> str:
        lines = [
            "===== 时间序列季节拆分结果说明 =====",
            "",
            "【总体结论】",
            self.overall,
            "",
            "【可直接使用】",
            self.available_summary,
            "",
            "【暂缓使用，待复核】",
            self.pending_summary,
            "",
            "【需要重新采集】",
            self.need_recollect_summary,
            "",
            "【数据质量】",
            self.quality_assessment,
            "",
            "【季节性发现】",
            self.seasonal_findings,
            "",
            "【趋势发现】",
            self.trend_findings,
            "",
            "【后续建议】",
        ]
        for i, rec in enumerate(self.recommendations, 1):
            lines.append(f"  {i}. {rec}")
        return "\n".join(lines)


class ResultInterpreter:
    def __init__(self):
        pass

    def interpret(
        self,
        loaded_data: LoadedData,
        result: DecomposeResult,
    ) -> Interpretation:
        summary = loaded_data.summary
        total = summary["总行数"]
        available = summary["可用行数"]
        pending = summary["暂缓行数"]
        need_recollect = summary["需重采行数"]

        available_pct = available / total * 100 if total > 0 else 0
        pending_pct = pending / total * 100 if total > 0 else 0
        need_pct = need_recollect / total * 100 if total > 0 else 0

        overall = self._build_overall(
            available_pct, pending_pct, need_pct, result
        )

        available_summary = self._build_available_summary(
            available, total, available_pct, result
        )
        pending_summary = self._build_pending_summary(
            pending, pending_pct, loaded_data.issues
        )
        need_recollect_summary = self._build_need_recollect_summary(
            need_recollect, need_pct, loaded_data.issues
        )

        quality_assessment = self._build_quality_assessment(
            available_pct, pending_pct, need_pct, result
        )

        seasonal_findings = self._build_seasonal_findings(result)
        trend_findings = self._build_trend_findings(result)

        recommendations = self._build_recommendations(
            pending, need_recollect, result, loaded_data.issues
        )

        details = {
            "seasonal_period": str(result.seasonal_period),
            "model_type": result.model_type,
        }
        for k, v in result.metrics.items():
            details[k] = f"{v:.4f}" if isinstance(v, float) else str(v)

        return Interpretation(
            overall=overall,
            available_summary=available_summary,
            pending_summary=pending_summary,
            need_recollect_summary=need_recollect_summary,
            quality_assessment=quality_assessment,
            seasonal_findings=seasonal_findings,
            trend_findings=trend_findings,
            recommendations=recommendations,
            details=details,
        )

    def _build_overall(
        self,
        available_pct: float,
        pending_pct: float,
        need_pct: float,
        result: DecomposeResult,
    ) -> str:
        if available_pct >= 90:
            quality_word = "良好"
        elif available_pct >= 70:
            quality_word = "一般"
        elif available_pct >= 50:
            quality_word = "较差"
        else:
            quality_word = "严重不足"

        season_strength = result.metrics["季节性强度"]
        if season_strength >= 0.6:
            season_word = "显著"
        elif season_strength >= 0.3:
            season_word = "存在"
        else:
            season_word = "较弱"

        trend_strength = result.metrics["趋势强度"]
        if trend_strength >= 0.6:
            trend_word = "趋势明显"
        elif trend_strength >= 0.3:
            trend_word = "有一定趋势"
        else:
            trend_word = "趋势不明显"

        return (
            f"本次分析数据质量{quality_word}（可用率 {available_pct:.1f}%），"
            f"季节性{season_word}（强度 {season_strength:.2f}），"
            f"{trend_word}（强度 {trend_strength:.2f}）。"
        )

    def _build_available_summary(
        self, available: int, total: int, pct: float, result: DecomposeResult
    ) -> str:
        if available == 0:
            return "没有可直接使用的数据，请先解决数据质量问题。"
        return (
            f"共 {available} 行（占 {pct:.1f}%）数据可直接用于分析和运营决策。"
            f"数据范围：{result.dates.min().strftime('%Y-%m-%d')} 至 "
            f"{result.dates.max().strftime('%Y-%m-%d')}，"
            f"覆盖 {len(result.dates)} 个时间点，周期为 {result.seasonal_period}。"
        )

    def _build_pending_summary(
        self, pending: int, pct: float, issues: List[DataIssue]
    ) -> str:
        if pending == 0:
            return "无暂缓数据，全部可用数据均已通过自动检查。"

        pending_issues = [i for i in issues if i.status == DataStatus.PENDING]
        issue_types = {}
        for iss in pending_issues:
            issue_types[iss.issue_type] = issue_types.get(iss.issue_type, 0) + 1

        type_desc = "、".join(f"{k} {v} 处" for k, v in issue_types.items())

        return (
            f"共 {pending} 行（占 {pct:.1f}%）数据需数据分析员复核后才能使用。"
            f"主要问题：{type_desc}。"
            f"建议运营同事使用时注意区分，对这部分数据暂不做关键决策依据。"
        )

    def _build_need_recollect_summary(
        self, need_recollect: int, pct: float, issues: List[DataIssue]
    ) -> str:
        if need_recollect == 0:
            return "无需要重新采集的数据。"

        recollect_issues = [
            i for i in issues if i.status == DataStatus.NEED_RECOLLECT
        ]
        issue_types = {}
        for iss in recollect_issues:
            issue_types[iss.issue_type] = issue_types.get(iss.issue_type, 0) + 1

        type_desc = "、".join(f"{k} {v} 处" for k, v in issue_types.items())

        return (
            f"共 {need_recollect} 行（占 {pct:.1f}%）数据需要重新采集或补录。"
            f"主要问题：{type_desc}。"
            f"这些数据已从分析结果中排除，请协调数据源尽快补齐。"
        )

    def _build_quality_assessment(
        self,
        available_pct: float,
        pending_pct: float,
        need_pct: float,
        result: DecomposeResult,
    ) -> str:
        mape = result.metrics["残差MAPE(%)"]

        if mape < 5:
            fit_word = "拟合精度高"
        elif mape < 10:
            fit_word = "拟合精度良好"
        elif mape < 20:
            fit_word = "拟合精度一般"
        else:
            fit_word = "拟合精度较低，需注意"

        return (
            f"可用率 {available_pct:.1f}%，暂缓率 {pending_pct:.1f}%，"
            f"需重采率 {need_pct:.1f}%。{fit_word}（MAPE={mape:.2f}%）。"
        )

    def _build_seasonal_findings(self, result: DecomposeResult) -> str:
        strength = result.metrics["季节性强度"]
        seasonal = result.seasonal
        period = result.seasonal_period

        peak_idx = seasonal.idxmax()
        trough_idx = seasonal.idxmin()

        if result.model_type == "multiplicative":
            peak_val = seasonal.max()
            trough_val = seasonal.min()
            desc = (
                f"季节峰值出现在 {peak_idx.strftime('%Y-%m-%d')} "
                f"（季节因子 {peak_val:.3f}），"
                f"低谷出现在 {trough_idx.strftime('%Y-%m-%d')} "
                f"（季节因子 {trough_val:.3f}）。"
            )
        else:
            peak_val = seasonal.max()
            trough_val = seasonal.min()
            desc = (
                f"季节峰值出现在 {peak_idx.strftime('%Y-%m-%d')} "
                f"（季节增量 {peak_val:.2f}），"
                f"低谷出现在 {trough_idx.strftime('%Y-%m-%d')} "
                f"（季节增量 {trough_val:.2f}）。"
            )

        if strength >= 0.6:
            level = "强季节性规律，运营决策中应重点参考季节因素。"
        elif strength >= 0.3:
            level = "有一定季节性，可作为参考但不宜过度依赖。"
        else:
            level = "季节性不明显，不必过度关注周期波动。"

        return desc + "周期长度 " + str(period) + "，" + level

    def _build_trend_findings(self, result: DecomposeResult) -> str:
        strength = result.metrics["趋势强度"]
        trend = result.trend
        first_val = trend.dropna().iloc[0]
        last_val = trend.dropna().iloc[-1]
        change_pct = (last_val - first_val) / abs(first_val) * 100 if first_val != 0 else 0

        if change_pct > 5:
            direction = f"整体呈上升趋势（{change_pct:.1f}%）"
        elif change_pct < -5:
            direction = f"整体呈下降趋势（{change_pct:.1f}%）"
        else:
            direction = "整体保持平稳"

        if strength >= 0.6:
            level = "趋势性强，长期方向明确。"
        elif strength >= 0.3:
            level = "存在一定趋势，但波动干扰较大。"
        else:
            level = "无明显趋势，以随机波动为主。"

        return f"{direction}。趋势强度 {strength:.2f}，{level}"

    def _build_recommendations(
        self,
        pending: int,
        need_recollect: int,
        result: DecomposeResult,
        issues: List[DataIssue],
    ) -> List[str]:
        recs = []

        if need_recollect > 0:
            recs.append(
                f"尽快安排 {need_recollect} 条需重新采集数据的补录工作，"
                f"避免影响后续分析覆盖度。"
            )

        if pending > 0:
            recs.append(
                f"数据分析员优先复核 {pending} 条暂缓数据，确认后可扩大可用范围。"
            )

        if result.metrics["季节性强度"] >= 0.5:
            recs.append(
                "运营活动安排建议结合季节性规律，在高峰期前提前备货/投放。"
            )

        if result.metrics["趋势强度"] >= 0.5:
            trend_vals = result.trend.dropna()
            if trend_vals.iloc[-1] > trend_vals.iloc[0]:
                recs.append("当前整体趋势向上，可适度扩大资源投入。")
            else:
                recs.append("当前整体趋势向下，建议评估风险并准备应对预案。")

        if result.metrics["残差MAPE(%)"] >= 15:
            recs.append(
                "当前模型残差较大，建议检查是否存在节假日、促销等未纳入的外部因素。"
            )

        if not recs:
            recs.append("当前数据质量和模型表现均良好，可按常规节奏推进。")

        recs.append(
            "运营同事使用结果时，注意区分数据状态标签：绿色=可直接使用，黄色=需复核，红色=已排除。"
        )

        return recs
