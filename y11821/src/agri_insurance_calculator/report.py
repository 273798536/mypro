from typing import List, Optional
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import print as rprint
import json

from .models import CalculationResult, VoucherRecord, ActionItem, VoucherStatus, DamageLevel


STATUS_COLORS = {
    VoucherStatus.PENDING: "yellow",
    VoucherStatus.VERIFIED: "blue",
    VoucherStatus.DISPUTED: "bright_yellow",
    VoucherStatus.REJECTED: "red",
    VoucherStatus.APPROVED: "green",
}

DAMAGE_COLORS = {
    DamageLevel.NONE: "white",
    DamageLevel.MILD: "cyan",
    DamageLevel.MODERATE: "yellow",
    DamageLevel.SEVERE: "bright_yellow",
    DamageLevel.TOTAL: "red",
}


def format_terminal_summary(result: CalculationResult, show_traces: bool = False) -> None:
    console = Console()

    console.print(Panel.fit(
        f"[bold green]农险灾损赔付测算报告[/bold green]\n"
        f"批次号: {result.batch_id}\n"
        f"测算时间: {result.calculated_at.strftime('%Y-%m-%d %H:%M:%S')}",
        border_style="green"
    ))

    summary_table = Table(title="汇总统计", show_header=True, header_style="bold magenta")
    summary_table.add_column("指标", style="cyan")
    summary_table.add_column("数值", justify="right")
    summary_table.add_row("农户总数", f"{result.total_farmers} 户")
    summary_table.add_row("原始总面积", f"{result.total_original_area:.2f} 亩")
    summary_table.add_row("去重后总面积", f"{result.total_deduplicated_area:.2f} 亩")
    summary_table.add_row("去重减少面积", f"{result.total_original_area - result.total_deduplicated_area:.2f} 亩")
    summary_table.add_row("总赔付金额", f"[bold green]{result.total_compensation:.2f}[/bold green] 元")
    console.print(summary_table)

    status_table = Table(title="凭证状态分布", show_header=True, header_style="bold magenta")
    status_table.add_column("状态", style="cyan")
    status_table.add_column("数量", justify="right")
    for status, count in result.status_summary.items():
        color = STATUS_COLORS.get(status, "white")
        status_table.add_row(f"[{color}]{status.value}[/{color}]", str(count))
    console.print(status_table)

    damage_table = Table(title="灾损等级分布", show_header=True, header_style="bold magenta")
    damage_table.add_column("等级", style="cyan")
    damage_table.add_column("面积(亩)", justify="right")
    for level, area in result.damage_summary.items():
        color = DAMAGE_COLORS.get(level, "white")
        damage_table.add_row(f"[{color}]{level.value}[/{color}]", f"{area:.2f}")
    console.print(damage_table)

    if result.dedup_results:
        dedup_table = Table(title="⚠️  图斑重叠去重记录", show_header=True, header_style="bold yellow")
        dedup_table.add_column("农户", style="cyan")
        dedup_table.add_column("原始面积", justify="right")
        dedup_table.add_column("重叠面积", justify="right")
        dedup_table.add_column("去重后面积", justify="right")
        dedup_table.add_column("重叠图斑")
        for dedup in result.dedup_results:
            dedup_table.add_row(
                dedup.farmer_name,
                f"{dedup.original_area:.2f}",
                f"[red]{dedup.overlapping_area:.2f}[/red]",
                f"[green]{dedup.deduplicated_area:.2f}[/green]",
                ", ".join(dedup.overlapping_with)
            )
        console.print(dedup_table)

    if result.level_changes:
        level_table = Table(title="⚠️  等级变更记录", show_header=True, header_style="bold yellow")
        level_table.add_column("农户", style="cyan")
        level_table.add_column("原等级")
        level_table.add_column("新等级")
        level_table.add_column("变更原因")
        for change in result.level_changes:
            old_color = DAMAGE_COLORS.get(change.original_level, "white")
            new_color = DAMAGE_COLORS.get(change.new_level, "white")
            level_table.add_row(
                change.farmer_name,
                f"[{old_color}]{change.original_level.value}[/{old_color}]",
                f"[{new_color}]{change.new_level.value}[/{new_color}]",
                change.reason
            )
        console.print(level_table)

    if result.missing_signatures:
        sig_table = Table(title="⚠️  缺失签字记录", show_header=True, header_style="bold red")
        sig_table.add_column("农户", style="cyan")
        sig_table.add_column("村庄")
        sig_table.add_column("申报面积", justify="right")
        sig_table.add_column("申报损失")
        for sig in result.missing_signatures:
            sig_table.add_row(
                sig.farmer_name,
                sig.village,
                f"{sig.reported_area:.2f}",
                sig.reported_damage
            )
        console.print(sig_table)

    detail_table = Table(title="赔付清单", show_header=True, header_style="bold magenta")
    detail_table.add_column("凭证号", style="cyan")
    detail_table.add_column("农户")
    detail_table.add_column("村庄")
    detail_table.add_column("状态")
    detail_table.add_column("面积(亩)", justify="right")
    detail_table.add_column("等级")
    detail_table.add_column("赔付金额", justify="right")
    detail_table.add_column("问题提示", style="red")

    for voucher in result.vouchers:
        status_color = STATUS_COLORS.get(voucher.status, "white")
        damage_color = DAMAGE_COLORS.get(voucher.damage_level, "white")
        issues = " | ".join(voucher.issues) if voucher.issues else ""
        detail_table.add_row(
            voucher.voucher_id,
            voucher.farmer_name,
            voucher.village,
            f"[{status_color}]{voucher.status.value}[/{status_color}]",
            f"{voucher.area:.2f}",
            f"[{damage_color}]{voucher.damage_level.value}[/{damage_color}]",
            f"[bold green]{voucher.compensation_amount:.2f}[/bold green]",
            issues
        )
    console.print(detail_table)

    if result.action_items:
        action_table = Table(title="📋 待办事项", show_header=True, header_style="bold red")
        action_table.add_column("优先级", style="bold")
        action_table.add_column("类型")
        action_table.add_column("责任方")
        action_table.add_column("问题描述")
        action_table.add_column("修改文件")
        action_table.add_column("修改字段")

        priority_order = {"高": 0, "中": 1, "低": 2}
        sorted_actions = sorted(result.action_items, key=lambda x: priority_order.get(x.priority, 3))

        for action in sorted_actions:
            priority_color = "red" if action.priority == "高" else "yellow" if action.priority == "中" else "white"
            action_table.add_row(
                f"[{priority_color}]{action.priority}[/{priority_color}]",
                action.type,
                action.responsible_person,
                action.description,
                action.file_to_modify,
                action.field_to_fix
            )
        console.print(action_table)

    if show_traces:
        console.print(Panel.fit("[bold]溯源追踪详情[/bold]", border_style="blue"))
        for voucher in result.vouchers:
            console.print(f"\n[bold cyan]{voucher.farmer_name} ({voucher.voucher_id})[/bold cyan]")
            for trace in voucher.traces:
                console.print(f"  [bold]结论:[/bold] {trace.conclusion}")
                console.print(f"  [bold]计算过程:[/bold]")
                for step in trace.calculation_steps:
                    console.print(f"    → {step}")
                if trace.sources:
                    console.print(f"  [bold]数据来源:[/bold]")
                    for src in trace.sources:
                        console.print(f"    • {src.format()}")


def format_human_report(result: CalculationResult, output_path: Optional[str] = None) -> str:
    lines = []
    lines.append("=" * 80)
    lines.append("农险灾损赔付测算报告")
    lines.append("=" * 80)
    lines.append(f"批次号: {result.batch_id}")
    lines.append(f"测算时间: {result.calculated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    lines.append("一、汇总统计")
    lines.append("-" * 40)
    lines.append(f"农户总数: {result.total_farmers} 户")
    lines.append(f"原始总面积: {result.total_original_area:.2f} 亩")
    lines.append(f"去重后总面积: {result.total_deduplicated_area:.2f} 亩")
    lines.append(f"去重减少面积: {result.total_original_area - result.total_deduplicated_area:.2f} 亩")
    lines.append(f"总赔付金额: {result.total_compensation:.2f} 元")
    lines.append("")

    lines.append("二、凭证状态分布")
    lines.append("-" * 40)
    for status, count in result.status_summary.items():
        lines.append(f"  {status.value}: {count} 单")
    lines.append("")

    lines.append("三、灾损等级分布")
    lines.append("-" * 40)
    for level, area in result.damage_summary.items():
        lines.append(f"  {level.value}: {area:.2f} 亩")
    lines.append("")

    if result.dedup_results:
        lines.append("四、图斑重叠去重记录")
        lines.append("-" * 40)
        for i, dedup in enumerate(result.dedup_results, 1):
            lines.append(f"  {i}. {dedup.farmer_name}:")
            lines.append(f"     原始面积: {dedup.original_area:.2f} 亩")
            lines.append(f"     重叠面积: {dedup.overlapping_area:.2f} 亩")
            lines.append(f"     去重后面积: {dedup.deduplicated_area:.2f} 亩")
            lines.append(f"     重叠图斑: {', '.join(dedup.overlapping_with)}")
            lines.append(f"     数据来源: {dedup.trace.sources[0].format() if dedup.trace.sources else '无'}")
        lines.append("")

    if result.level_changes:
        lines.append("五、等级变更记录")
        lines.append("-" * 40)
        for i, change in enumerate(result.level_changes, 1):
            lines.append(f"  {i}. {change.farmer_name}:")
            lines.append(f"     原等级: {change.original_level.value}")
            lines.append(f"     新等级: {change.new_level.value}")
            lines.append(f"     变更原因: {change.reason}")
            lines.append(f"     下一步: 联系{change.action_item.responsible_person}复核")
            lines.append(f"     修改文件: {change.action_item.file_to_modify}")
            lines.append(f"     修改字段: {change.action_item.field_to_fix}")
        lines.append("")

    if result.missing_signatures:
        lines.append("六、缺失签字记录")
        lines.append("-" * 40)
        for i, sig in enumerate(result.missing_signatures, 1):
            lines.append(f"  {i}. {sig.farmer_name} ({sig.village}):")
            lines.append(f"     申报面积: {sig.reported_area:.2f} 亩")
            lines.append(f"     申报损失: {sig.reported_damage}")
            lines.append(f"     下一步: 联系村主任/包片干部补签")
            lines.append(f"     修改文件: {sig.source_ref.file_path}")
            lines.append(f"     修改字段: records.{sig.record_id}.has_signature")
        lines.append("")

    lines.append("七、赔付清单")
    lines.append("-" * 40)
    lines.append(f"{'凭证号':<20} {'农户':<10} {'村庄':<10} {'状态':<10} {'面积':>8} {'等级':<6} {'赔付金额':>12} {'备注'}")
    lines.append("-" * 100)
    for voucher in result.vouchers:
        issues = ";".join(voucher.issues) if voucher.issues else ""
        lines.append(
            f"{voucher.voucher_id:<20} {voucher.farmer_name:<10} {voucher.village:<10} "
            f"{voucher.status.value:<10} {voucher.area:>7.2f} {voucher.damage_level.value:<6} "
            f"{voucher.compensation_amount:>11.2f} {issues}"
        )
    lines.append("")

    lines.append("八、溯源追踪")
    lines.append("-" * 40)
    for voucher in result.vouchers:
        lines.append(f"\n【{voucher.farmer_name} - {voucher.voucher_id}】")
        for trace in voucher.traces:
            lines.append(f"  ▶ {trace.conclusion}")
            lines.append(f"    计算过程:")
            for step in trace.calculation_steps:
                lines.append(f"      {step}")
            if trace.sources:
                lines.append(f"    数据来源:")
                for src in trace.sources:
                    lines.append(f"      {src.format()}")
    lines.append("")

    lines.append("九、待办事项")
    lines.append("-" * 40)
    priority_order = {"高": 0, "中": 1, "低": 2}
    sorted_actions = sorted(result.action_items, key=lambda x: priority_order.get(x.priority, 3))
    for i, action in enumerate(sorted_actions, 1):
        lines.append(f"  [{action.priority}] {i}. {action.type}")
        lines.append(f"     责任方: {action.responsible_person}")
        lines.append(f"     联系方式: {action.contact or '见农户档案'}")
        lines.append(f"     问题描述: {action.description}")
        lines.append(f"     修改文件: {action.file_to_modify}")
        lines.append(f"     修改字段: {action.field_to_fix}")
        lines.append(f"     关联结论: {action.related_conclusion}")
        lines.append(f"     当前状态: {action.status}")
        lines.append("")

    lines.append("=" * 80)
    lines.append("报告结束")
    lines.append("=" * 80)

    content = "\n".join(lines)
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
    return content


def format_machine_readable(result: CalculationResult, output_path: Optional[str] = None) -> dict:
    data = {
        "batch_id": result.batch_id,
        "calculated_at": result.calculated_at.isoformat(),
        "summary": {
            "total_farmers": result.total_farmers,
            "total_original_area": result.total_original_area,
            "total_deduplicated_area": result.total_deduplicated_area,
            "total_reduced_area": round(result.total_original_area - result.total_deduplicated_area, 2),
            "total_compensation": result.total_compensation
        },
        "status_summary": {k.value: v for k, v in result.status_summary.items()},
        "damage_summary": {k.value: v for k, v in result.damage_summary.items()},
        "vouchers": [
            {
                "voucher_id": v.voucher_id,
                "farmer_id": v.farmer_id,
                "farmer_name": v.farmer_name,
                "village": v.village,
                "status": v.status.value,
                "area": v.area,
                "damage_level": v.damage_level.value,
                "compensation_amount": v.compensation_amount,
                "issues": v.issues,
                "traces": [
                    {
                        "conclusion_id": t.conclusion_id,
                        "conclusion": t.conclusion,
                        "value": t.value,
                        "calculation_steps": t.calculation_steps,
                        "sources": [
                            {
                                "source": s.source.value,
                                "file_path": s.file_path,
                                "field": s.field,
                                "raw_value": s.raw_value
                            }
                            for s in t.sources
                        ]
                    }
                    for t in v.traces
                ],
                "action_items": [
                    {
                        "action_id": a.action_id,
                        "type": a.type,
                        "description": a.description,
                        "responsible_person": a.responsible_person,
                        "contact": a.contact,
                        "file_to_modify": a.file_to_modify,
                        "field_to_fix": a.field_to_fix,
                        "priority": a.priority,
                        "status": a.status
                    }
                    for a in v.action_items
                ]
            }
            for v in result.vouchers
        ],
        "dedup_results": [
            {
                "original_parcel_id": d.original_parcel_id,
                "farmer_name": d.farmer_name,
                "original_area": d.original_area,
                "overlapping_area": d.overlapping_area,
                "deduplicated_area": d.deduplicated_area,
                "overlapping_with": d.overlapping_with,
                "applied": d.applied,
                "trace": {
                    "conclusion_id": d.trace.conclusion_id,
                    "conclusion": d.trace.conclusion,
                    "calculation_steps": d.trace.calculation_steps
                }
            }
            for d in result.dedup_results
        ],
        "level_changes": [
            {
                "farmer_id": lc.farmer_id,
                "farmer_name": lc.farmer_name,
                "original_level": lc.original_level.value,
                "new_level": lc.new_level.value,
                "reason": lc.reason,
                "action_item": {
                    "action_id": lc.action_item.action_id,
                    "type": lc.action_item.type,
                    "responsible_person": lc.action_item.responsible_person,
                    "file_to_modify": lc.action_item.file_to_modify,
                    "field_to_fix": lc.action_item.field_to_fix
                }
            }
            for lc in result.level_changes
        ],
        "missing_signatures": [
            {
                "record_id": s.record_id,
                "farmer_id": s.farmer_id,
                "farmer_name": s.farmer_name,
                "village": s.village,
                "reported_area": s.reported_area,
                "reported_damage": s.reported_damage,
                "notes": s.notes
            }
            for s in result.missing_signatures
        ],
        "action_items": [
            {
                "action_id": a.action_id,
                "type": a.type,
                "description": a.description,
                "responsible_person": a.responsible_person,
                "contact": a.contact,
                "file_to_modify": a.file_to_modify,
                "field_to_fix": a.field_to_fix,
                "priority": a.priority,
                "status": a.status,
                "related_conclusion": a.related_conclusion
            }
            for a in result.action_items
        ]
    }

    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    return data
