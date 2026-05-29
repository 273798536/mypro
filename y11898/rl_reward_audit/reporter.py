import json
from typing import Dict, Any, List
from pathlib import Path

from .models import AnalysisResult, Anomaly, AnomalyType


class ReportGenerator:
    def __init__(self, analysis_result: AnalysisResult):
        self.result = analysis_result

    def generate_terminal_summary(self) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("  强化学习奖励审计 - 终端摘要")
        lines.append("=" * 70)
        lines.append("")

        summary = self.result.summary

        lines.append("📊 总体统计")
        lines.append("-" * 40)
        lines.append(f"  轨迹数量: {summary['num_trajectories']}")
        lines.append(f"  完成轨迹: {summary['num_complete_trajectories']}")
        lines.append(f"  总步数: {summary['total_steps']}")
        lines.append(f"  总奖励: {summary['total_reward']:.4f}")
        lines.append(f"  平均每轨迹奖励: {summary['avg_reward_per_trajectory']:.4f}")
        lines.append(f"  平均每轨迹步数: {summary['avg_steps_per_trajectory']:.1f}")
        lines.append("")

        if summary["num_corrections"] > 0 or summary["num_errors"] > 0:
            lines.append("⚠️  数据修正")
            lines.append("-" * 40)
            if summary["num_corrections"] > 0:
                lines.append(f"  自动修正: {summary['num_corrections']} 处")
            if summary["num_errors"] > 0:
                lines.append(f"  错误: {summary['num_errors']} 处")
            lines.append("")

        lines.append("🏆 奖励贡献度排行")
        lines.append("-" * 40)
        for i, rc in enumerate(summary["reward_contribution"][:5], 1):
            bar_length = int(rc["ratio"] * 30)
            bar = "█" * bar_length + "░" * (30 - bar_length)
            lines.append(
                f"  {i}. {rc['name']:20s} {bar} {rc['ratio']*100:5.1f}% ({rc['total']:.2f})"
            )
        lines.append("")

        anomalies_by_type: Dict[AnomalyType, List[Anomaly]] = {}
        for anomaly in self.result.anomalies:
            if anomaly.anomaly_type not in anomalies_by_type:
                anomalies_by_type[anomaly.anomaly_type] = []
            anomalies_by_type[anomaly.anomaly_type].append(anomaly)

        if anomalies_by_type:
            lines.append("🚨 异常检测结果")
            lines.append("-" * 40)

            if AnomalyType.REWARD_LEAKAGE in anomalies_by_type:
                leakage = anomalies_by_type[AnomalyType.REWARD_LEAKAGE]
                lines.append(f"  🔴 奖励泄漏: {len(leakage)} 处")
                for a in leakage[:3]:
                    lines.append(f"     - {a.description}")
                if len(leakage) > 3:
                    lines.append(f"     ... 还有 {len(leakage) - 3} 处")

            if AnomalyType.ACTION_LOOP in anomalies_by_type:
                loops = anomalies_by_type[AnomalyType.ACTION_LOOP]
                lines.append(f"  🟡 动作循环: {len(loops)} 处")
                for a in loops[:2]:
                    lines.append(f"     - {a.description}")

            if AnomalyType.TERMINATION_ERROR in anomalies_by_type:
                term = anomalies_by_type[AnomalyType.TERMINATION_ERROR]
                lines.append(f"  🟠 终止条件异常: {len(term)} 处")

            if AnomalyType.SUSPICIOUS_REWARD in anomalies_by_type:
                sus = anomalies_by_type[AnomalyType.SUSPICIOUS_REWARD]
                lines.append(f"  🟣 可疑奖励: {len(sus)} 处")

            lines.append("")

        if self.result.parsing_result.corrections:
            lines.append("📝 数据修正详情")
            lines.append("-" * 40)
            for corr in self.result.parsing_result.corrections[:10]:
                step_info = f"步骤 {corr.step_id}" if corr.step_id is not None else "全局"
                lines.append(f"  [{step_info}] {corr.message}")
            if len(self.result.parsing_result.corrections) > 10:
                lines.append(
                    f"  ... 还有 {len(self.result.parsing_result.corrections) - 10} 处修正"
                )

        lines.append("")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_human_report(self) -> str:
        sections = []

        sections.append("# 强化学习奖励审计报告")
        sections.append("")
        sections.append("---")
        sections.append("")

        summary = self.result.summary

        sections.append("## 📊 执行概览")
        sections.append("")
        sections.append("| 指标 | 数值 |")
        sections.append("|------|------|")
        sections.append(f"| 轨迹数量 | {summary['num_trajectories']} |")
        sections.append(f"| 完成轨迹 | {summary['num_complete_trajectories']} |")
        sections.append(f"| 总步数 | {summary['total_steps']} |")
        sections.append(f"| 总奖励 | {summary['total_reward']:.4f} |")
        sections.append(f"| 平均每轨迹奖励 | {summary['avg_reward_per_trajectory']:.4f} |")
        sections.append("")

        sections.append("## 🏆 奖励构成分析")
        sections.append("")
        sections.append("各奖励项对总奖励的贡献比例：")
        sections.append("")
        for rc in summary["reward_contribution"]:
            sections.append(f"- **{rc['name']}**: {rc['ratio']*100:.1f}% (累计 {rc['total']:.2f})")
        sections.append("")

        sections.append("## 🔍 异常检测详情")
        sections.append("")

        leakage_anomalies = [
            a for a in self.result.anomalies
            if a.anomaly_type == AnomalyType.REWARD_LEAKAGE
        ]

        if leakage_anomalies:
            sections.append("### 🔴 奖励泄漏")
            sections.append("")
            sections.append(
                "**什么是奖励泄漏？**"
            )
            sections.append(
                "奖励泄漏是指智能体发现了奖励函数中的漏洞，"
                "通过一些非预期的行为获取了大量奖励。"
                "这就像学生发现考试题目有漏洞，"
                "不用真正学习就能拿高分。"
            )
            sections.append("")

            for i, anomaly in enumerate(leakage_anomalies, 1):
                sections.append(f"#### 泄漏 #{i}")
                sections.append("")
                sections.append(f"- **位置**: 轨迹 {anomaly.trajectory_id}, 步骤 {anomaly.step_id}")
                sections.append(f"- **严重程度**: {'🔴 高' if anomaly.severity == 'high' else '🟡 中'}")
                sections.append("")
                sections.append("**发生了什么？**")
                sections.append(f"> {anomaly.description}")
                sections.append("")
                sections.append("**为什么会这样？**")
                sections.append(
                    f"- 在步骤 {anomaly.step_id}，智能体可能发现了某种状态组合"
                )
                sections.append(
                    f"- 该状态下，'{anomaly.evidence.get('reward_name', 'unknown')}' 奖励项被大量触发"
                )
                sections.append(
                    f"- 实际奖励值 {anomaly.evidence.get('actual_value', 0):.4f} 远高于平均值 {anomaly.evidence.get('expected_mean', 0):.4f}"
                )
                sections.append("")
                sections.append("**建议怎么做？**")
                sections.append(f"> {anomaly.recommendation}")
                sections.append("")
        else:
            sections.append("### ✅ 奖励泄漏")
            sections.append("")
            sections.append("未检测到明显的奖励泄漏问题。")
            sections.append("")

        loop_anomalies = [
            a for a in self.result.anomalies
            if a.anomaly_type == AnomalyType.ACTION_LOOP
        ]

        if loop_anomalies:
            sections.append("### 🟡 动作循环")
            sections.append("")
            sections.append("**什么是动作循环？**")
            sections.append(
                "动作循环是指智能体反复执行相同的动作序列，"
                "陷入局部最优而无法前进。"
            )
            sections.append("")
            for i, anomaly in enumerate(loop_anomalies, 1):
                sections.append(f"#### 循环 #{i}")
                sections.append("")
                sections.append(f"- **位置**: 轨迹 {anomaly.trajectory_id}")
                sections.append(
                    f"- **循环模式**: {' → '.join(anomaly.evidence.get('pattern', []))}"
                )
                sections.append(
                    f"- **重复次数**: {anomaly.evidence.get('repeat_count', 0)} 次"
                )
                sections.append("")
                sections.append("**建议怎么做？**")
                sections.append(f"> {anomaly.recommendation}")
                sections.append("")

        term_anomalies = [
            a for a in self.result.anomalies
            if a.anomaly_type == AnomalyType.TERMINATION_ERROR
        ]

        if term_anomalies:
            sections.append("### 🟠 终止条件异常")
            sections.append("")
            sections.append(f"共检测到 {len(term_anomalies)} 处终止条件异常，")
            sections.append("可能需要人工复核终止条件设置。")
            sections.append("")

        sections.append("## 📝 数据修正记录")
        sections.append("")

        if self.result.parsing_result.corrections:
            sections.append("导入过程中自动修正了以下数据问题：")
            sections.append("")
            for corr in self.result.parsing_result.corrections:
                step_info = f"步骤 {corr.step_id}" if corr.step_id is not None else "全局"
                sections.append(f"- [{step_info}] {corr.message}")
        else:
            sections.append("数据导入顺利，无需修正。")
        sections.append("")

        sections.append("---")
        sections.append("")
        sections.append("*报告生成完毕*")

        return "\n".join(sections)

    def generate_machine_readable(self) -> Dict[str, Any]:
        data = {
            "version": "1.0",
            "summary": self.result.summary,
            "reward_aggregations": {
                name: {
                    "total": agg.total,
                    "mean": agg.mean,
                    "std": agg.std,
                    "min": agg.min,
                    "max": agg.max,
                    "contribution_ratio": agg.contribution_ratio,
                }
                for name, agg in self.result.reward_aggregations.items()
            },
            "anomalies": [
                {
                    "type": anomaly.anomaly_type.value,
                    "severity": anomaly.severity,
                    "trajectory_id": anomaly.trajectory_id,
                    "step_id": anomaly.step_id,
                    "description": anomaly.description,
                    "evidence": anomaly.evidence,
                    "recommendation": anomaly.recommendation,
                }
                for anomaly in self.result.anomalies
            ],
            "corrections": [
                {
                    "field_name": corr.field_name,
                    "step_id": corr.step_id,
                    "correction_type": corr.correction_type,
                    "message": corr.message,
                }
                for corr in self.result.parsing_result.corrections
            ],
            "errors": self.result.parsing_result.errors,
        }
        return data

    def save_terminal_summary(self, output_path: str) -> None:
        content = self.generate_terminal_summary()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

    def save_human_report(self, output_path: str) -> None:
        content = self.generate_human_report()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

    def save_json_report(self, output_path: str) -> None:
        data = self.generate_machine_readable()
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def save_all(self, output_dir: str, base_name: str = "audit_report") -> None:
        dir_path = Path(output_dir)
        dir_path.mkdir(parents=True, exist_ok=True)

        self.save_terminal_summary(str(dir_path / f"{base_name}_summary.txt"))
        self.save_human_report(str(dir_path / f"{base_name}_human.md"))
        self.save_json_report(str(dir_path / f"{base_name}_machine.json"))
