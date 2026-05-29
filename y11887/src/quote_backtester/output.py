"""输出格式模块 - 终端摘要、人读报告、机器可读JSON"""

import json
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

from .models import (
    BacktraceResult, BacktraceSummary, QuoteItem,
    DiscountTier, CustomerLevel, ApprovalLevel
)


class OutputFormatter:
    """输出格式化器 - 确保三种输出口径一致"""

    def __init__(self, console: Optional[Console] = None):
        self.console = console or Console()

    def format_all(
        self,
        results: List[BacktraceResult],
        summary: BacktraceSummary,
        output_dir: Optional[str] = None
    ) -> dict:
        """生成所有三种格式的输出"""
        machine_readable = self._build_machine_readable(results, summary)
        
        self._print_terminal_summary(results, summary)
        
        if output_dir:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            self._write_human_report(results, summary, output_path)
            self._write_machine_readable(machine_readable, output_path)
            
            self.console.print(f"\n[green]报告已导出到: {output_path.resolve()}[/green]")
        
        return machine_readable

    def _build_machine_readable(
        self, results: List[BacktraceResult], summary: BacktraceSummary
    ) -> dict:
        """构建机器可读JSON结构 - 与其他输出口径一致"""
        return {
            "metadata": {
                "tool_name": "报价阶梯反推器",
                "version": "1.0.0",
                "run_mode": summary.run_mode,
                "run_time": summary.run_time.isoformat(),
                "generated_at": datetime.now().isoformat()
            },
            "summary": {
                "total_records": summary.total_records,
                "records_with_anomalies": summary.records_with_anomalies,
                "records_with_warnings": summary.records_with_warnings,
                "records_with_overlapping_tiers": summary.records_with_overlapping_tiers,
                "records_with_approval_overrides": summary.records_with_approval_overrides,
                "records_with_rounding_issues": summary.records_with_rounding_issues,
                "total_rounding_error_amount": round(summary.total_rounding_error_amount, 2),
                "overlapping_tier_groups": [
                    [self._serialize_tier(t) for t in group]
                    for group in summary.overlapping_tier_groups
                ],
                "key_question_answered": {
                    "has_overlapping_tiers": len(summary.overlapping_tier_groups) > 0,
                    "overlapping_tier_count": len(summary.overlapping_tier_groups),
                    "overlapping_tiers_blocked": self._check_overlaps_blocked(summary.overlapping_tier_groups)
                }
            },
            "detailed_results": [
                self._serialize_result(r) for r in results
            ],
            "data_sources": {
                "original_names_preserved": True,
                "fields_preserved": [
                    "item_name", "item_code", "customer_name",
                    "customer_level_raw", "tier_name",
                    "approval_level_raw", "required_approval_level"
                ]
            }
        }

    def _serialize_quote_item(self, item: QuoteItem) -> dict:
        """序列化报价项 - 保留原始字段名"""
        return {
            "original_record": item.original_record,
            "item_name": item.item_name,
            "item_code": item.item_code,
            "list_price": item.list_price,
            "final_price": item.final_price,
            "quantity": item.quantity,
            "customer_name": item.customer_name,
            "customer_level_raw": item.customer_level_raw,
            "salesperson": item.salesperson,
            "approval_level_raw": item.approval_level_raw,
            "quoted_discount": item.quoted_discount,
            "quote_date": item.quote_date.isoformat() if item.quote_date else None,
            "notes": item.notes,
            "actual_discount_rate": round(item.actual_discount_rate, 4),
            "actual_discount_pct": item.actual_discount_pct
        }

    def _serialize_tier(self, tier: DiscountTier) -> dict:
        """序列化折扣阶梯"""
        return {
            "original_record": tier.original_record,
            "tier_name": tier.tier_name,
            "min_amount": tier.min_amount,
            "max_amount": tier.max_amount,
            "discount_rate": tier.discount_rate,
            "discount_pct": round(tier.discount_rate * 100, 1),
            "required_approval_level": tier.required_approval_level,
            "applicable_customer_levels": tier.applicable_customer_levels,
            "is_active": tier.is_active
        }

    def _serialize_approval_level(self, level: Optional[ApprovalLevel]) -> Optional[dict]:
        """序列化审批级别"""
        if not level:
            return None
        return {
            "original_record": level.original_record,
            "level_name": level.level_name,
            "level_order": level.level_order,
            "max_discount_allowed": level.max_discount_allowed,
            "max_discount_allowed_pct": round(level.max_discount_allowed * 100, 1),
            "max_amount_allowed": level.max_amount_allowed,
            "approver_title": level.approver_title
        }

    def _serialize_result(self, result: BacktraceResult) -> dict:
        """序列化单条反推结果"""
        return {
            "quote_item": self._serialize_quote_item(result.quote_item),
            "transaction_amount": round(result.transaction_amount, 2),
            "actual_discount_rate": round(result.actual_discount_rate, 4),
            "actual_discount_pct": round(result.actual_discount_rate * 100, 2),
            "matched_tier": self._serialize_tier(result.matched_tier) if result.matched_tier else None,
            "tier_match_confidence": round(result.tier_match_confidence, 2),
            "applicable_tiers": [self._serialize_tier(t) for t in result.applicable_tiers],
            "overlapping_tiers": [
                [self._serialize_tier(t) for t in group]
                for group in result.overlapping_tiers
            ],
            "required_approval": self._serialize_approval_level(result.required_approval),
            "actual_approval": self._serialize_approval_level(result.actual_approval),
            "is_approval_overridden": result.is_approval_overridden,
            "inferred_rounding_mode": result.inferred_rounding_mode.value if result.inferred_rounding_mode else None,
            "rounding_error": round(result.rounding_error, 4),
            "theoretical_prices": {k: round(v, 2) for k, v in result.theoretical_prices.items()},
            "anomalies": result.anomalies,
            "warnings": result.warnings,
            "explanations": result.explanations,
            "has_issues": len(result.anomalies) > 0 or len(result.warnings) > 0
        }

    def _check_overlaps_blocked(self, groups: List[List[DiscountTier]]) -> str:
        """检查阶梯重叠是否被拦住 - 回答销售经理最关心的问题"""
        if not groups:
            return "无阶梯重叠，配置正常"
        
        status_parts = []
        for i, group in enumerate(groups, 1):
            tier_names = "、".join(f"「{t.tier_name}」" for t in group)
            status_parts.append(f"组{i}：{tier_names} 存在重叠区间，系统已标记但未自动拦截，需人工核对")
        
        return "；".join(status_parts)

    def _print_terminal_summary(
        self, results: List[BacktraceResult], summary: BacktraceSummary
    ) -> None:
        """打印终端摘要 - 简洁高效"""
        self.console.print()
        self.console.print(Panel.fit(
            Text("📊 报价阶梯反推器 - 终端摘要", style="bold blue"),
            border_style="blue"
        ))

        self._print_summary_stats(summary)
        
        if summary.overlapping_tier_groups:
            self._print_overlapping_tiers(summary.overlapping_tier_groups)
        
        self._print_anomaly_summary(results, summary)
        
        if summary.run_mode == "review":
            self._print_review_details(results)
        
        self._print_key_answer(summary)

    def _print_summary_stats(self, summary: BacktraceSummary) -> None:
        """打印汇总统计"""
        table = Table(title="📈 总体统计", box=box.SIMPLE, show_header=True)
        table.add_column("指标", style="cyan")
        table.add_column("数值", justify="right", style="bold")
        table.add_column("说明", style="dim")

        table.add_row("总记录数", str(summary.total_records), "本次分析的报价单数")
        table.add_row("含异常记录", f"[red]{summary.records_with_anomalies}[/red]", 
                     f"占比 {summary.records_with_anomalies/summary.total_records*100:.1f}%" if summary.total_records else "-")
        table.add_row("含警告记录", f"[yellow]{summary.records_with_warnings}[/yellow]",
                     f"占比 {summary.records_with_warnings/summary.total_records*100:.1f}%" if summary.total_records else "-")
        table.add_row("阶梯重叠记录", f"[magenta]{summary.records_with_overlapping_tiers}[/magenta]",
                     f"涉及 {len(summary.overlapping_tier_groups)} 组重叠")
        table.add_row("审批越权记录", f"[red]{summary.records_with_approval_overrides}[/red]", "级别不够审批")
        table.add_row("舍入误差记录", f"[yellow]{summary.records_with_rounding_issues}[/yellow]",
                     f"累计误差 ¥{summary.total_rounding_error_amount:.2f}")

        self.console.print(table)

    def _print_overlapping_tiers(self, groups: List[List[DiscountTier]]) -> None:
        """打印重叠阶梯详情"""
        table = Table(title="⚠️  阶梯重叠检测", box=box.SIMPLE, show_header=True)
        table.add_column("组号", style="magenta")
        table.add_column("重叠阶梯", style="cyan")
        table.add_column("区间", style="yellow")
        table.add_column("折扣率", justify="right")
        table.add_column("风险等级", style="red")

        for i, group in enumerate(groups, 1):
            for j, tier in enumerate(group):
                max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "∞"
                if j == 0:
                    table.add_row(
                        f"组{i}",
                        f"「{tier.tier_name}」",
                        f"[{tier.min_amount:.2f}, {max_str})",
                        f"{tier.discount_rate*100:.1f}%",
                        "🔴 高风险"
                    )
                else:
                    table.add_row(
                        "",
                        f"「{tier.tier_name}」",
                        f"[{tier.min_amount:.2f}, {max_str})",
                        f"{tier.discount_rate*100:.1f}%",
                        ""
                    )

        self.console.print(table)
        self.console.print("💡 [dim]重叠阶梯会导致同金额可套用不同折扣，建议立即修正配置[/dim]")

    def _print_anomaly_summary(
        self, results: List[BacktraceResult], summary: BacktraceSummary
    ) -> None:
        """打印异常摘要"""
        if not summary.records_with_anomalies and not summary.records_with_warnings:
            self.console.print("\n[green]✅ 所有记录正常，无异常无警告[/green]")
            return

        problem_results = [r for r in results if r.anomalies or r.warnings]
        
        table = Table(title="🔍 异常/警告明细（前10条）", box=box.SIMPLE, show_header=True)
        table.add_column("#", style="dim")
        table.add_column("客户/产品", style="cyan")
        table.add_column("金额", justify="right")
        table.add_column("实际折扣", justify="right")
        table.add_column("问题类型", style="red")
        table.add_column("问题摘要", style="yellow")

        for i, result in enumerate(problem_results[:10], 1):
            item = result.quote_item
            problem_types = []
            if result.anomalies:
                problem_types.append("[red]异常[/red]")
            if result.warnings:
                problem_types.append("[yellow]警告[/yellow]")
            
            first_problem = (result.anomalies + result.warnings)[0][:30] + "..."
            
            table.add_row(
                str(i),
                f"{item.customer_name}\n{item.item_name}",
                f"¥{result.transaction_amount:.2f}",
                f"{result.actual_discount_rate*100:.1f}%",
                "/".join(problem_types),
                first_problem
            )

        self.console.print(table)
        
        if len(problem_results) > 10:
            self.console.print(f"[dim]... 还有 {len(problem_results) - 10} 条问题记录，请查看完整报告[/dim]")

    def _print_review_details(self, results: List[BacktraceResult]) -> None:
        """打印月底复盘模式的详细信息"""
        self.console.print()
        self.console.print(Panel.fit(
            Text("📋 月底复盘 - 异常定位详情", style="bold magenta"),
            border_style="magenta"
        ))

        for i, result in enumerate(results, 1):
            if not result.anomalies and not result.warnings:
                continue
            
            item = result.quote_item
            self.console.print(f"\n[bold]记录 {i}: {item.customer_name} - {item.item_name}[/bold]")
            self.console.print(f"  金额: ¥{result.transaction_amount:.2f} | 标准价: ¥{item.list_price:.2f} | 最终价: ¥{item.final_price:.2f}")
            self.console.print(f"  实际折扣: {result.actual_discount_rate*100:.1f}% | 匹配阶梯: {result.matched_tier.tier_name if result.matched_tier else '无'}")
            
            for anomaly in result.anomalies:
                self.console.print(f"  [red]❌ 异常: {anomaly}[/red]")
            for warning in result.warnings:
                self.console.print(f"  [yellow]⚠️  警告: {warning}[/yellow]")

    def _print_key_answer(self, summary: BacktraceSummary) -> None:
        """回答销售经理最关心的问题"""
        self.console.print()
        self.console.print(Panel.fit(
            Text("❓ 核心问题：阶梯重叠有没有被拦住？", style="bold green"),
            border_style="green"
        ))
        
        answer = self._check_overlaps_blocked(summary.overlapping_tier_groups)
        if not summary.overlapping_tier_groups:
            self.console.print(f"[green]✅ {answer}[/green]")
        else:
            self.console.print(f"[yellow]⚠️  {answer}[/yellow]")

    def _write_human_report(
        self, results: List[BacktraceResult], summary: BacktraceSummary,
        output_path: Path
    ) -> None:
        """写人读报告 - 销售经理能看懂、能转述的程度"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"报价反推报告_{timestamp}.txt"
        filepath = output_path / filename

        lines = []
        
        lines.append("=" * 70)
        lines.append("                          报价阶梯反推报告")
        lines.append("=" * 70)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"运行模式: {'日常操作' if summary.run_mode == 'daily' else '月底复盘'}")
        lines.append(f"分析范围: {summary.total_records} 条报价记录")
        lines.append("")

        lines.append("-" * 70)
        lines.append("一、总体情况")
        lines.append("-" * 70)
        lines.append(f"  总记录数:              {summary.total_records} 条")
        lines.append(f"  异常记录:              {summary.records_with_anomalies} 条")
        lines.append(f"  警告记录:              {summary.records_with_warnings} 条")
        lines.append(f"  阶梯重叠记录:          {summary.records_with_overlapping_tiers} 条")
        lines.append(f"  审批越权记录:          {summary.records_with_approval_overrides} 条")
        lines.append(f"  舍入误差记录:          {summary.records_with_rounding_issues} 条")
        lines.append(f"  累计舍入误差金额:      ¥{summary.total_rounding_error_amount:.2f}")
        lines.append("")

        lines.append("-" * 70)
        lines.append("二、核心问题答复：阶梯重叠有没有被拦住？")
        lines.append("-" * 70)
        lines.append(f"  {self._check_overlaps_blocked(summary.overlapping_tier_groups)}")
        lines.append("")

        if summary.overlapping_tier_groups:
            lines.append("-" * 70)
            lines.append("三、阶梯重叠详情")
            lines.append("-" * 70)
            for i, group in enumerate(summary.overlapping_tier_groups, 1):
                lines.append(f"  重叠组 {i}:")
                for tier in group:
                    max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "无限大"
                    lines.append(f"    - 「{tier.tier_name}」")
                    lines.append(f"      区间: [{tier.min_amount:.2f}, {max_str})")
                    lines.append(f"      折扣: {tier.discount_rate*100:.1f}%")
                    lines.append(f"      适用客户等级: {', '.join(tier.applicable_customer_levels)}")
                    lines.append(f"      需审批级别: {tier.required_approval_level}")
                lines.append(f"  风险说明: 金额在重叠区间内时，可能被套用不同折扣，存在合规风险")
                lines.append(f"  处理建议: 立即修正阶梯配置，确保区间不重叠")
                lines.append("")

        lines.append("-" * 70)
        lines.append("四、详细记录分析")
        lines.append("-" * 70)

        for i, result in enumerate(results, 1):
            item = result.quote_item
            lines.append(f"\n【记录 {i}】 {item.customer_name} - {item.item_name}")
            lines.append("-" * 50)
            lines.append(f"  产品编码: {item.item_code}")
            lines.append(f"  销售人员: {item.salesperson}")
            lines.append(f"  客户等级: {item.customer_level_raw}")
            lines.append(f"  标准价:   ¥{item.list_price:.2f}")
            lines.append(f"  最终价:   ¥{item.final_price:.2f}")
            lines.append(f"  数量:     {item.quantity}")
            lines.append(f"  交易金额: ¥{result.transaction_amount:.2f}")
            lines.append(f"  实际折扣: {result.actual_discount_rate*100:.1f}%")
            lines.append("")

            if result.matched_tier:
                tier = result.matched_tier
                max_str = f"{tier.max_amount:.2f}" if tier.max_amount else "无限大"
                lines.append(f"  匹配阶梯: 「{tier.tier_name}」")
                lines.append(f"    阶梯区间: [{tier.min_amount:.2f}, {max_str})")
                lines.append(f"    阶梯折扣: {tier.discount_rate*100:.1f}%")
                lines.append(f"    匹配度:   {result.tier_match_confidence*100:.0f}%")
            else:
                lines.append(f"  匹配阶梯: 无匹配阶梯")

            if result.required_approval:
                lines.append(f"  需要审批: 「{result.required_approval.level_name}」"
                           f"(最大可批 {result.required_approval.max_discount_allowed*100:.1f}%)")
            if result.actual_approval:
                lines.append(f"  实际审批: 「{result.actual_approval.level_name}」"
                           f"(最大可批 {result.actual_approval.max_discount_allowed*100:.1f}%)")
            if result.is_approval_overridden:
                lines.append(f"  ⚠️  审批越权: 是")

            if result.inferred_rounding_mode:
                lines.append(f"  舍入模式: 「{result.inferred_rounding_mode.value}」")
                lines.append(f"  舍入误差: {result.rounding_error:.4f} 元")

            if result.explanations:
                lines.append(f"\n  解释说明:")
                for exp in result.explanations:
                    lines.append(f"    - {exp}")

            if result.anomalies:
                lines.append(f"\n  ❌ 异常项:")
                for anomaly in result.anomalies:
                    lines.append(f"    - {anomaly}")

            if result.warnings:
                lines.append(f"\n  ⚠️  警告项:")
                for warning in result.warnings:
                    lines.append(f"    - {warning}")

        lines.append("\n" + "=" * 70)
        lines.append("                     报告结束")
        lines.append("=" * 70)
        lines.append(f"原始名称已全部保留，可直接用于与同事核对材料")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        self.console.print(f"[green]人读报告已生成: {filename}[/green]")

    def _write_machine_readable(self, data: dict, output_path: Path) -> None:
        """写机器可读JSON"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"报价反推数据_{timestamp}.json"
        filepath = output_path / filename

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        self.console.print(f"[green]机器可读JSON已生成: {filename}[/green]")
