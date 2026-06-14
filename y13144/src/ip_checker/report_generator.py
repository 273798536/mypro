"""报告生成器 - 生成图表、计算草稿追溯，供非技术人员理解"""

import os
import math
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np

try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')
    import seaborn as sns
    HAS_PLOTTING = True
except ImportError:
    HAS_PLOTTING = False

from .models import VerificationStatus, VerificationResult
from .verification_engine import VerificationEngine
from .calculation_spec import CalculationSpecManager
from .audit_trail import AuditTrail


class ReportGenerator:
    def __init__(
        self,
        output_dir: str = "./examples",
        use_chinese_font: bool = True,
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if HAS_PLOTTING and use_chinese_font:
            self._setup_chinese_font()

    def _setup_chinese_font(self):
        font_options = [
            '/System/Library/Fonts/PingFang.ttc',
            '/System/Library/Fonts/STHeiti Medium.ttc',
            '/Library/Fonts/Arial Unicode.ttf',
            '/System/Library/Fonts/Supplemental/Songti.ttc',
        ]
        for font_path in font_options:
            if os.path.exists(font_path):
                matplotlib.font_manager.fontManager.addfont(font_path)
                font_name = matplotlib.font_manager.FontProperties(fname=font_path).get_name()
                plt.rcParams['font.sans-serif'] = [font_name]
                plt.rcParams['axes.unicode_minus'] = False
                break

    def generate_status_chart(
        self,
        results_df: pd.DataFrame,
        context_id: str,
    ) -> str:
        if not HAS_PLOTTING:
            return "matplotlib 未安装，跳过图表生成"

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle(f"整数规划批量验算 - 结果概览\n上下文ID: {context_id}", fontsize=16, y=1.02)

        status_col = "_overall_status"
        if status_col in results_df.columns:
            status_counts = results_df[status_col].value_counts()
            colors = {
                "通过": "#27ae60",
                "失败": "#e74c3c",
                "警告": "#f39c12",
                "异常": "#8e44ad",
                "待处理": "#95a5a6",
            }
            bar_colors = [colors.get(s, "#34495e") for s in status_counts.index]

            axes[0, 0].bar(range(len(status_counts)), status_counts.values, color=bar_colors)
            axes[0, 0].set_xticks(range(len(status_counts)))
            axes[0, 0].set_xticklabels(status_counts.index, rotation=45)
            axes[0, 0].set_title("验算状态分布")
            axes[0, 0].set_ylabel("记录数")
            for i, v in enumerate(status_counts.values):
                axes[0, 0].text(i, v + 0.5, str(v), ha='center')

            axes[0, 1].pie(
                status_counts.values,
                labels=status_counts.index,
                colors=bar_colors,
                autopct='%1.1f%%',
                startangle=90,
            )
            axes[0, 1].set_title("状态占比")

        anomaly_cols = [c for c in results_df.columns if c.endswith("_anomaly")]
        if anomaly_cols:
            anomalies = []
            for col in anomaly_cols:
                anomalies.extend(results_df[col].dropna().tolist())
            if anomalies:
                anomaly_series = pd.Series(anomalies)
                anomaly_counts = anomaly_series.value_counts()
                axes[1, 0].barh(range(len(anomaly_counts)), anomaly_counts.values, color="#e67e22")
                axes[1, 0].set_yticks(range(len(anomaly_counts)))
                axes[1, 0].set_yticklabels(anomaly_counts.index)
                axes[1, 0].set_title("异常类型分布")
                axes[1, 0].set_xlabel("出现次数")
                for i, v in enumerate(anomaly_counts.values):
                    axes[1, 0].text(v + 0.1, i, str(v), va='center')

        source_col = "_source"
        if source_col in results_df.columns and status_col in results_df.columns:
            cross = pd.crosstab(results_df[source_col], results_df[status_col])
            cross.plot(kind='bar', stacked=True, ax=axes[1, 1], color=[colors.get(c, "#34495e") for c in cross.columns])
            axes[1, 1].set_title("各来源状态对比")
            axes[1, 1].set_xlabel("数据来源")
            axes[1, 1].set_ylabel("记录数")
            axes[1, 1].tick_params(axis='x', rotation=45)

        plt.tight_layout()
        chart_path = self.output_dir / f"status_overview_{context_id}.png"
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()

        return str(chart_path)

    def generate_value_comparison_chart(
        self,
        results_df: pd.DataFrame,
        field_prefix: str,
        context_id: str,
        title: str = "",
    ) -> Optional[str]:
        if not HAS_PLOTTING:
            return None

        calc_col = f"{field_prefix}_calculated"
        exp_col = f"{field_prefix}_expected"

        if calc_col not in results_df.columns or exp_col not in results_df.columns:
            return None

        plot_df = results_df[[calc_col, exp_col]].dropna()
        if plot_df.empty:
            return None

        fig, ax = plt.subplots(figsize=(12, 6))

        x = range(len(plot_df))
        width = 0.35

        ax.bar([i - width/2 for i in x], plot_df[calc_col], width, label='计算值', color='#3498db')
        ax.bar([i + width/2 for i in x], plot_df[exp_col], width, label='期望值', color='#2ecc71')

        for i, (calc, exp) in enumerate(zip(plot_df[calc_col], plot_df[exp_col])):
            diff = abs(calc - exp)
            if diff > 0:
                ax.annotate(
                    f"差:{diff:.1f}",
                    xy=(i, max(calc, exp)),
                    xytext=(0, 10),
                    textcoords='offset points',
                    ha='center',
                    fontsize=8,
                    color='#e74c3c',
                )

        ax.set_xlabel("记录序号")
        ax.set_ylabel("数值")
        ax.set_title(title or f"{field_prefix} - 计算值 vs 期望值")
        ax.legend()
        ax.axhline(y=0, color='r', linestyle='--', linewidth=0.5)

        plt.tight_layout()
        chart_path = self.output_dir / f"comparison_{field_prefix}_{context_id}.png"
        plt.savefig(chart_path, dpi=150, bbox_inches='tight')
        plt.close()

        return str(chart_path)

    def generate_draft_trace(
        self,
        result: VerificationResult,
        spec_manager: CalculationSpecManager,
        context_trace: Dict[str, Any],
    ) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("计算草稿追溯单")
        lines.append("=" * 70)
        lines.append(f"记录ID: {result.record_id}")
        lines.append(f"验算状态: 【{result.result_status.value}】")
        if result.anomaly_type:
            lines.append(f"⚠️  异常类型: {result.anomaly_type}")
        if result.error_message:
            lines.append(f"❌ 错误信息: {result.error_message}")
        lines.append("-" * 70)

        lines.append("【本次计算口径】")
        lines.append(f"  计算时间: {context_trace['calculation_date']}")
        lines.append(f"  复核人: {context_trace['reviewer']}")
        lines.append(f"  说明: {context_trace['description']}")
        lines.append(f"  假设条件: {context_trace['assumptions']}")
        lines.append(f"  来源文档: {', '.join(context_trace['source_documents'])}")
        lines.append("")

        lines.append("【应用的计算规则】")
        for rule in context_trace['applied_rules']:
            lines.append(f"  - {rule['formula_id']} (v{rule['version']}): {rule['description']}")
            lines.append(f"    制定人: {rule['created_by']}")
        lines.append("")

        lines.append("【原始输入】")
        for k, v in result.raw_inputs.items():
            if not k.endswith("_converted"):
                lines.append(f"  {k} = {v}")
        lines.append("")

        lines.append("【计算步骤追溯】")
        for step in result.processing_steps:
            status_marker = ""
            if step['status'] == '异常':
                status_marker = " ❌"
            elif step['status'] == '失败':
                status_marker = " ⚠️"
            elif step['status'] == '警告':
                status_marker = " ⚡"
            elif step['status'] == '通过':
                status_marker = " ✅"

            lines.append(f"  步骤{step['step']}{status_marker}: {step['action']}")
            lines.append(f"         详情: {step['detail']}")
            lines.append(f"         状态: {step['status']}")
            lines.append("")

        if result.unit_conversions:
            lines.append("【单位转换记录】")
            for uc in result.unit_conversions:
                lines.append(f"  字段: {uc['field']}")
                lines.append(f"    {uc['original_value']} {uc['from_unit']} → {uc['converted_value']:.4f} {uc['to_unit']}")
                lines.append(f"    换算系数: ×{uc['to_base_factor']} ÷{uc['from_base_factor']}")
                lines.append(f"    量纲: {uc.get('dimension', 'N/A')}")
            lines.append("")

        lines.append("【验算结果】")
        lines.append(f"  计算值: {result.calculated_value}")
        lines.append(f"  期望值: {result.expected_value}")
        if result.calculated_value is not None and result.expected_value is not None:
            diff = abs(result.calculated_value - result.expected_value)
            rel_diff = diff / abs(result.expected_value) if result.expected_value != 0 else float('inf')
            lines.append(f"  绝对偏差: {diff:.6f}")
            lines.append(f"  相对偏差: {rel_diff:.4%}")
            lines.append(f"  容差设置: {result.tolerance:.0%}")
        lines.append(f"  记录时间: {result.timestamp}")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_executive_summary(
        self,
        results_df: pd.DataFrame,
        engine: VerificationEngine,
        context_trace: Dict[str, Any],
    ) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("整数规划批量验算 - 执行摘要")
        lines.append("=" * 70)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"上下文ID: {context_trace['context_id']}")
        lines.append(f"复核人: {context_trace['reviewer']}")
        lines.append("")

        summary = engine.get_summary()
        total = sum(summary.values())
        lines.append(f"【总体情况】")
        lines.append(f"  总记录数: {total}")
        for status, count in summary.items():
            pct = count / total * 100 if total > 0 else 0
            marker = ""
            if status == "通过":
                marker = "✅"
            elif status == "失败":
                marker = "❌"
            elif status == "异常":
                marker = "🔴"
            elif status == "警告":
                marker = "🟡"
            lines.append(f"  {marker} {status}: {count} ({pct:.1f}%)")
        lines.append("")

        anomalies = engine.get_anomalies()
        if anomalies:
            lines.append(f"【异常明细 ({len(anomalies)} 条)】")
            anomaly_types = {}
            for a in anomalies:
                atype = a.anomaly_type or "未知"
                anomaly_types[atype] = anomaly_types.get(atype, 0) + 1

            for atype, count in anomaly_types.items():
                lines.append(f"  - {atype}: {count} 条")
            lines.append("")

            lines.append("【重点关注异常记录】")
            for i, a in enumerate(anomalies[:5]):
                lines.append(f"  {i+1}. 记录ID: {a.record_id}")
                lines.append(f"     类型: {a.anomaly_type}")
                lines.append(f"     状态: {a.result_status.value}")
                if a.error_message:
                    lines.append(f"     错误: {a.error_message}")
                lines.append(f"     追溯: 查看 details/{a.record_id}_trace.txt")
            if len(anomalies) > 5:
                lines.append(f"  ... 还有 {len(anomalies) - 5} 条异常记录")
            lines.append("")

        if "_source" in results_df.columns:
            lines.append("【数据来源分布】")
            source_counts = results_df["_source"].value_counts()
            for src, cnt in source_counts.items():
                lines.append(f"  - {src}: {cnt} 条")
            lines.append("")

        lines.append("【数字溯源说明】")
        lines.append("  所有计算值均可追溯到原始输入和单位转换过程。")
        lines.append("  点击异常记录可查看完整计算草稿和步骤追溯。")
        lines.append("  单位换算自动处理，量纲不一致会标记异常。")
        lines.append("")

        lines.append("【下一步建议】")
        if "异常" in summary:
            lines.append("  1. 优先处理标记为【异常】的记录，查看计算草稿追溯")
        if "失败" in summary:
            lines.append("  2. 核对标记为【失败】的记录，确认公式口径是否一致")
        if "警告" in summary:
            lines.append("  3. 关注【警告】记录，确认是否为合理边界情况")
        lines.append("  4. 查看审计历史，确认有无临时调整的判断")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_all_reports(
        self,
        results_df: pd.DataFrame,
        engine: VerificationEngine,
        spec_manager: CalculationSpecManager,
        audit_trail: AuditTrail,
        context_id: str,
    ) -> Dict[str, Any]:
        context_trace = spec_manager.get_context_trace(context_id)
        output = {}

        details_dir = self.output_dir / "details"
        details_dir.mkdir(exist_ok=True)

        for result in engine.results:
            trace = self.generate_draft_trace(result, spec_manager, context_trace)
            trace_path = details_dir / f"{result.record_id}_trace.txt"
            with open(trace_path, "w", encoding="utf-8") as f:
                f.write(trace)
            if result.anomaly_type:
                output.setdefault("anomaly_traces", []).append(str(trace_path))

        summary_text = self.generate_executive_summary(results_df, engine, context_trace)
        summary_path = self.output_dir / f"executive_summary_{context_id}.txt"
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(summary_text)
        output["summary"] = str(summary_path)

        chart_path = self.generate_status_chart(results_df, context_id)
        output["status_chart"] = chart_path

        for prefix in ["total_price", "tax_amount", "unit_cost"]:
            comp_chart = self.generate_value_comparison_chart(
                results_df, prefix, context_id,
                title=f"{prefix} 计算值与期望值对比"
            )
            if comp_chart:
                output.setdefault("comparison_charts", []).append(comp_chart)

        audit_report = audit_trail.generate_change_report()
        audit_path = self.output_dir / f"audit_trail_{context_id}.txt"
        with open(audit_path, "w", encoding="utf-8") as f:
            f.write(audit_report)
        output["audit_report"] = str(audit_path)

        audit_df = audit_trail.get_full_history_dataframe()
        if not audit_df.empty:
            audit_csv = self.output_dir / f"audit_history_{context_id}.csv"
            audit_df.to_csv(audit_csv, index=False, encoding="utf-8-sig")
            output["audit_csv"] = str(audit_csv)

        results_csv = self.output_dir / f"verification_results_{context_id}.csv"
        results_df.to_csv(results_csv, index=False, encoding="utf-8-sig")
        output["results_csv"] = str(results_csv)

        import json as _json
        results_json = self.output_dir / "verification_results.json"
        serialized = {
            "context_id": context_id,
            "context_trace": context_trace,
            "generated_at": datetime.now().isoformat(),
            "summary": engine.get_summary(),
            "anomaly_count": len(engine.get_anomalies()),
            "results": [
                {
                    "record_id": r.record_id,
                    "result_status": r.result_status.value,
                    "calculated_value": r.calculated_value,
                    "expected_value": r.expected_value,
                    "tolerance": r.tolerance,
                    "raw_inputs": {k: (v if not isinstance(v, float) or not math.isnan(v) else None)
                                   for k, v in r.raw_inputs.items()},
                    "processing_steps": r.processing_steps,
                    "unit_conversions": r.unit_conversions,
                    "error_message": r.error_message,
                    "anomaly_type": r.anomaly_type,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                }
                for r in engine.results
            ],
        }
        with open(results_json, "w", encoding="utf-8") as f:
            _json.dump(serialized, f, ensure_ascii=False, indent=2, default=str)
        output["results_json"] = str(results_json)

        anomaly_index = []
        for r in engine.results:
            if r.anomaly_type or r.result_status.value in ("异常", "失败"):
                anomaly_index.append({
                    "record_id": r.record_id,
                    "anomaly_type": r.anomaly_type,
                    "status": r.result_status.value,
                    "error_message": r.error_message,
                    "trace_file": f"details/{r.record_id}_trace.txt",
                })
        anomaly_index_path = self.output_dir / "anomaly_index.json"
        with open(anomaly_index_path, "w", encoding="utf-8") as f:
            _json.dump(anomaly_index, f, ensure_ascii=False, indent=2)
        output["anomaly_index"] = str(anomaly_index_path)

        return output
