import os
import json
from datetime import datetime
from typing import List, Optional
from tabulate import tabulate
from .models import RiskReport, ParlayBet, RiskLevel, LegStatus


class ReportGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_all(self, report: RiskReport) -> None:
        self._generate_terminal_summary(report)
        self._generate_markdown_report(report)
        self._generate_json_report(report)
        self._generate_trace_files(report)

    def _generate_terminal_summary(self, report: RiskReport) -> None:
        print("\n" + "=" * 80)
        print("  组合投注风险分析报告 - 终端摘要")
        print("=" * 80)
        print(f"  报告ID: {report.report_id}")
        print(f"  生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 80)

        summary_headers = ["指标", "数值"]
        summary_data = [
            ["组合总数", report.total_parlays],
            ["总本金", f"¥{report.total_stake:,.2f}"],
            ["总潜在派彩", f"¥{report.total_potential_payout:,.2f}"],
            ["总实际派彩", f"¥{report.total_actual_payout:,.2f}"],
            ["总盈亏", f"¥{report.total_profit:,.2f}"],
        ]
        print("\n  📊 总体概览")
        print(tabulate(summary_data, headers=summary_headers, tablefmt="simple", showindex=False))

        print("\n  ⚠️  风险分布")
        risk_headers = ["风险等级", "数量", "占比"]
        risk_data = []
        for level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]:
            count = report.risk_distribution.get(level, 0)
            pct = (count / report.total_parlays * 100) if report.total_parlays > 0 else 0
            risk_data.append([level.value, count, f"{pct:.1f}%"])
        print(tabulate(risk_data, headers=risk_headers, tablefmt="simple", showindex=False))

        critical_issues = [i for i in report.summary_issues if i.level == "CRITICAL"]
        warning_issues = [i for i in report.summary_issues if i.level == "WARNING"]

        print(f"\n  ❌ 严重问题: {len(critical_issues)} 个")
        for issue in critical_issues[:5]:
            print(f"     - [{issue.code}] {issue.message}")
        if len(critical_issues) > 5:
            print(f"     ... 还有 {len(critical_issues) - 5} 个严重问题")

        print(f"\n  ⚠️  警告问题: {len(warning_issues)} 个")
        for issue in warning_issues[:3]:
            print(f"     - [{issue.code}] {issue.message}")
        if len(warning_issues) > 3:
            print(f"     ... 还有 {len(warning_issues) - 3} 个警告")

        print("\n  🎯 组合明细摘要")
        parlay_headers = ["组合ID", "关数", "本金", "组合赔率", "潜在派彩", "实际派彩", "盈亏", "状态", "风险等级"]
        parlay_data = []
        for p in report.parlays:
            profit_str = f"¥{p.profit:,.2f}"
            if p.profit > 0:
                profit_str = f"+¥{p.profit:,.2f}"
            parlay_data.append([
                p.parlay_id,
                len(p.legs),
                f"¥{p.stake.amount:,.2f}",
                f"{p.total_odds:.2f}",
                f"¥{p.potential_payout:,.2f}",
                f"¥{p.actual_payout:,.2f}",
                profit_str,
                p.status.value,
                p.risk_level.value
            ])
        print(tabulate(parlay_data, headers=parlay_headers, tablefmt="simple", showindex=False))

        high_risk = [p for p in report.parlays if p.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]]
        if high_risk:
            print("\n  🔴 高风险组合详情")
            for p in high_risk:
                self._print_parlay_detail(p)

        print("\n" + "=" * 80)
        print(f"  详细报告已生成至: {self.output_dir}")
        print("=" * 80 + "\n")

    def _print_parlay_detail(self, parlay: ParlayBet) -> None:
        print(f"\n    组合: {parlay.parlay_id} | 追踪ID: {parlay.trace_id}")
        print(f"    描述: {parlay.calculation_trace.get('description', 'N/A')}")
        print(f"    风险等级: {parlay.risk_level.value} | 风险评分: {parlay.risk_score:.4f}")

        if parlay.validation_issues:
            print("    问题:")
            for issue in parlay.validation_issues:
                icon = "❌" if issue.level == "CRITICAL" else "⚠️"
                print(f"      {icon} [{issue.code}] {issue.message}")

        high_corr = [c for c in parlay.correlations if c.correlation >= 0.7]
        if high_corr:
            print("    高相关性配对:")
            for c in high_corr:
                print(f"      - {c.match_a} <-> {c.match_b}")
                print(f"        相关系数: {c.correlation:.2f} | 原因: {c.reason}")

        print("    组合明细:")
        for leg in parlay.legs:
            status_icon = {
                "WON": "✅", "LOST": "❌", "PENDING": "⏳",
                "VOID": "🔄", "EXPIRED": "⏰"
            }.get(leg.status.value, "❓")
            odd_status = "🟢" if leg.match_odds.status.value == "VALID" else "🔴"
            print(f"      {status_icon} [{leg.leg_id}] {leg.match_odds.home_team} vs {leg.match_odds.away_team}")
            print(f"         {odd_status} {leg.match_odds.market_type} - {leg.match_odds.selection} @ {leg.match_odds.odd_value}")
            if leg.result:
                print(f"         赛果: {leg.result.home_score}-{leg.result.away_score} | 状态: {leg.status.value}")

    def _generate_markdown_report(self, report: RiskReport) -> None:
        md_path = os.path.join(self.output_dir, "risk_report.md")
        lines = []

        lines.append("# 组合投注风险分析报告")
        lines.append("")
        lines.append(f"- **报告ID**: {report.report_id}")
        lines.append(f"- **生成时间**: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 📊 总体概览")
        lines.append("")
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| 组合总数 | {report.total_parlays} |")
        lines.append(f"| 总本金 | ¥{report.total_stake:,.2f} |")
        lines.append(f"| 总潜在派彩 | ¥{report.total_potential_payout:,.2f} |")
        lines.append(f"| 总实际派彩 | ¥{report.total_actual_payout:,.2f} |")
        lines.append(f"| 总盈亏 | {'+' if report.total_profit > 0 else ''}¥{report.total_profit:,.2f} |")
        lines.append("")

        lines.append("## ⚠️ 风险分布")
        lines.append("")
        lines.append("| 风险等级 | 数量 | 占比 | 说明 |")
        lines.append("|----------|------|------|------|")
        risk_desc = {
            "LOW": "低风险 - 跨赛事低相关",
            "MEDIUM": "中风险 - 存在一定相关性",
            "HIGH": "高风险 - 高相关或存在过期赔率",
            "CRITICAL": "严重风险 - 全部过期或零本金"
        }
        for level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]:
            count = report.risk_distribution.get(level, 0)
            pct = (count / report.total_parlays * 100) if report.total_parlays > 0 else 0
            lines.append(f"| {level.value} | {count} | {pct:.1f}% | {risk_desc[level.value]} |")
        lines.append("")

        critical_issues = [i for i in report.summary_issues if i.level == "CRITICAL"]
        warning_issues = [i for i in report.summary_issues if i.level == "WARNING"]

        if critical_issues:
            lines.append("## ❌ 严重问题汇总")
            lines.append("")
            lines.append("| 错误代码 | 问题描述 | 关联关卡 | 详情 |")
            lines.append("|----------|----------|----------|------|")
            for issue in critical_issues:
                details = json.dumps(issue.details, ensure_ascii=False) if issue.details else ""
                lines.append(f"| {issue.code} | {issue.message} | {issue.leg_id or '-'} | `{details}` |")
            lines.append("")

        if warning_issues:
            lines.append("## ⚠️ 警告问题汇总")
            lines.append("")
            lines.append("| 警告代码 | 问题描述 | 关联关卡 | 详情 |")
            lines.append("|----------|----------|----------|------|")
            for issue in warning_issues:
                details = json.dumps(issue.details, ensure_ascii=False) if issue.details else ""
                lines.append(f"| {issue.code} | {issue.message} | {issue.leg_id or '-'} | `{details}` |")
            lines.append("")

        lines.append("## 🎯 组合投注明细")
        lines.append("")

        for parlay in report.parlays:
            risk_emoji = {
                "LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"
            }.get(parlay.risk_level.value, "⚪")

            lines.append(f"### {risk_emoji} {parlay.parlay_id} - {parlay.calculation_trace.get('description', '组合投注')}")
            lines.append("")
            lines.append(f"- **追踪ID**: `{parlay.trace_id}`")
            lines.append(f"- **风险等级**: {parlay.risk_level.value} (评分: {parlay.risk_score:.4f})")
            lines.append(f"- **状态**: {parlay.status.value}")
            lines.append(f"- **本金**: ¥{parlay.stake.amount:,.2f}")
            lines.append(f"- **组合赔率**: {parlay.total_odds:.4f}")
            lines.append(f"- **潜在派彩**: ¥{parlay.potential_payout:,.2f}")
            lines.append(f"- **实际派彩**: ¥{parlay.actual_payout:,.2f}")
            lines.append(f"- **盈亏**: {'+' if parlay.profit > 0 else ''}¥{parlay.profit:,.2f}")
            lines.append("")

            high_corr = [c for c in parlay.correlations if c.correlation >= 0.7]
            if high_corr:
                lines.append("#### 🔗 高相关性警告")
                lines.append("")
                lines.append("| 赛事A | 赛事B | 相关系数 | 原因 |")
                lines.append("|-------|-------|----------|------|")
                for c in high_corr:
                    lines.append(f"| {c.match_a} | {c.match_b} | {c.correlation:.2f} | {c.reason} |")
                lines.append("")

            lines.append("#### 📋 投注关明细")
            lines.append("")
            lines.append("| 关卡ID | 赛事 | 市场 | 选项 | 赔率 | 赔率状态 | 赛果 | 状态 |")
            lines.append("|--------|------|------|------|------|----------|------|------|")
            for leg in parlay.legs:
                match_name = f"{leg.match_odds.home_team} vs {leg.match_odds.away_team}"
                result_str = f"{leg.result.home_score}-{leg.result.away_score}" if leg.result else "-"
                lines.append(f"| {leg.leg_id} | {match_name} | {leg.match_odds.market_type} | {leg.match_odds.selection} | {leg.match_odds.odd_value} | {leg.match_odds.status.value} | {result_str} | {leg.status.value} |")
            lines.append("")

            if parlay.validation_issues:
                lines.append("#### ⚠️ 验证问题")
                lines.append("")
                for issue in parlay.validation_issues:
                    level_icon = "❌" if issue.level == "CRITICAL" else "⚠️"
                    lines.append(f"- {level_icon} **[{issue.code}]** {issue.message}")
                    if issue.details:
                        lines.append(f"  - 详情: `{json.dumps(issue.details, ensure_ascii=False)}`")
                lines.append("")

            lines.append("#### 🔍 计算追溯")
            lines.append("")
            lines.append("可使用以下命令查看完整计算过程:")
            lines.append("```bash")
            lines.append(f"python main.py --trace {parlay.trace_id} --input-dir ./sample_input --output-dir ./output")
            lines.append("```")
            lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("*报告由组合投注风险分析工具自动生成*")

        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"  ✓ Markdown报告: {md_path}")

    def _generate_json_report(self, report: RiskReport) -> None:
        json_path = os.path.join(self.output_dir, "risk_report.json")
        report_dict = report.to_dict()
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)
        print(f"  ✓ JSON报告: {json_path}")

    def _generate_trace_files(self, report: RiskReport) -> None:
        trace_dir = os.path.join(self.output_dir, "traces")
        os.makedirs(trace_dir, exist_ok=True)

        for parlay in report.parlays:
            trace_path = os.path.join(trace_dir, f"trace_{parlay.trace_id}.json")
            trace_data = {
                "parlay_id": parlay.parlay_id,
                "trace_id": parlay.trace_id,
                "description": parlay.calculation_trace.get("description", ""),
                "generated_at": report.generated_at.isoformat(),
                "calculation_trace": parlay.calculation_trace,
                "final_result": {
                    "risk_level": parlay.risk_level.value,
                    "risk_score": parlay.risk_score,
                    "total_odds": parlay.total_odds,
                    "stake": parlay.stake.amount,
                    "potential_payout": parlay.potential_payout,
                    "actual_payout": parlay.actual_payout,
                    "profit": parlay.profit,
                    "status": parlay.status.value
                },
                "validation_issues": [i.to_dict() for i in parlay.validation_issues],
                "high_correlations": [c.to_dict() for c in parlay.correlations if c.correlation >= 0.7]
            }
            with open(trace_path, "w", encoding="utf-8") as f:
                json.dump(trace_data, f, ensure_ascii=False, indent=2)

        index_path = os.path.join(trace_dir, "trace_index.json")
        index_data = {
            "report_id": report.report_id,
            "generated_at": report.generated_at.isoformat(),
            "traces": [
                {
                    "parlay_id": p.parlay_id,
                    "trace_id": p.trace_id,
                    "risk_level": p.risk_level.value,
                    "description": p.calculation_trace.get("description", "")
                }
                for p in report.parlays
            ]
        }
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)

        print(f"  ✓ 追溯文件目录: {trace_dir}")

    def print_trace_detail(self, trace_id: str, report: Optional[RiskReport] = None) -> bool:
        trace_dir = os.path.join(self.output_dir, "traces")
        trace_path = os.path.join(trace_dir, f"trace_{trace_id}.json")

        if os.path.exists(trace_path):
            with open(trace_path, "r", encoding="utf-8") as f:
                trace_data = json.load(f)
        elif report:
            target = None
            for p in report.parlays:
                if p.trace_id == trace_id or p.parlay_id == trace_id:
                    target = p
                    break
            if not target:
                print(f"❌ 未找到追踪ID: {trace_id}")
                return False
            trace_data = {
                "parlay_id": target.parlay_id,
                "trace_id": target.trace_id,
                "description": target.calculation_trace.get("description", ""),
                "calculation_trace": target.calculation_trace,
                "final_result": {
                    "risk_level": target.risk_level.value,
                    "risk_score": target.risk_score,
                    "total_odds": target.total_odds,
                    "stake": target.stake.amount,
                    "potential_payout": target.potential_payout,
                    "actual_payout": target.actual_payout,
                    "profit": target.profit,
                    "status": target.status.value
                },
                "validation_issues": [i.to_dict() for i in target.validation_issues],
                "high_correlations": [c.to_dict() for c in target.correlations if c.correlation >= 0.7]
            }
        else:
            print(f"❌ 未找到追踪ID: {trace_id}")
            return False

        print("\n" + "=" * 80)
        print(f"  🔍 计算追溯详情 - {trace_data.get('parlay_id', 'N/A')}")
        print("=" * 80)
        print(f"  追踪ID: {trace_data['trace_id']}")
        print(f"  描述: {trace_data.get('description', 'N/A')}")
        print("-" * 80)

        final = trace_data["final_result"]
        print("\n  📌 最终结果")
        print(f"     风险等级: {final['risk_level']} | 风险评分: {final['risk_score']:.4f}")
        print(f"     组合赔率: {final['total_odds']:.4f} | 本金: ¥{final['stake']:,.2f}")
        print(f"     潜在派彩: ¥{final['potential_payout']:,.2f} | 实际派彩: ¥{final['actual_payout']:,.2f}")
        print(f"     盈亏: {'+' if final['profit'] > 0 else ''}¥{final['profit']:,.2f} | 状态: {final['status']}")

        calc_trace = trace_data.get("calculation_trace", {})
        steps = calc_trace.get("steps", [])
        for step in steps:
            step_name = step.get("step", "unknown")
            print(f"\n  📝 步骤: {step_name}")
            for key, value in step.items():
                if key == "step":
                    continue
                if isinstance(value, list):
                    print(f"     {key}:")
                    for item in value:
                        if isinstance(item, dict):
                            item_str = ", ".join([f"{k}={v}" for k, v in item.items()])
                            print(f"       - {item_str}")
                        else:
                            print(f"       - {item}")
                elif isinstance(value, dict):
                    print(f"     {key}:")
                    for k, v in value.items():
                        print(f"       {k}: {v}")
                else:
                    print(f"     {key}: {value}")

        if trace_data.get("validation_issues"):
            print("\n  ⚠️  验证问题")
            for issue in trace_data["validation_issues"]:
                icon = "❌" if issue["level"] == "CRITICAL" else "⚠️"
                print(f"     {icon} [{issue['code']}] {issue['message']}")
                if issue.get("details"):
                    print(f"        详情: {json.dumps(issue['details'], ensure_ascii=False)}")

        if trace_data.get("high_correlations"):
            print("\n  🔗 高相关性")
            for corr in trace_data["high_correlations"]:
                print(f"     - {corr['match_a']} <-> {corr['match_b']}")
                print(f"       相关系数: {corr['correlation']:.2f} | {corr['reason']}")

        print("\n" + "=" * 80)
        return True
