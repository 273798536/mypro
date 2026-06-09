from __future__ import annotations

from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from .models import RowStatus
from .storage import ensure_output_dir, load_state, save_state
from .parser import load_drafts, parse_text_block
from .merge import (
    merge_rows, find_duplicates, merge_into_state,
    confirm_assignment, reject_assignment, edit_assignment,
)
from .counterexample import run_all_checks
from .export import export_all
from .samples import generate_samples, is_first_run


console = Console()


def _common_dirs(f):
    f = click.option(
        "--input", "input_dir", type=click.Path(file_okay=False, path_type=Path),
        default=Path("./input"), show_default=True, help="输入目录（计算草稿）",
    )(f)
    f = click.option(
        "--output", "output_dir", type=click.Path(file_okay=False, path_type=Path),
        default=Path("./output"), show_default=True, help="输出目录",
    )(f)
    return f


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option("0.1.0", prog_name="ip-scheduler")
def cli():
    """整数规划排班器 - 建模社助教工具\n
    日常入口: ip-scheduler counterexample (生成反例/检测冲突)\n
    月底/课前: ip-scheduler export  (导出图表与结论)
    """


@cli.command("init")
@_common_dirs
@click.option("--force", is_flag=True, help="覆盖已存在的示例文件")
def cmd_init(input_dir: Path, output_dir: Path, force: bool):
    """首次使用：生成示例草稿材料，方便理解格式。"""
    out = ensure_output_dir(output_dir)
    created = generate_samples(input_dir, force=force)
    state = load_state(out)
    state.input_dir = str(input_dir)
    state.output_dir = str(out)
    save_state(out, state)
    if created:
        console.print(f"[green]已生成 {len(created)} 份示例草稿到 {input_dir}[/green]")
        for p in created:
            console.print(f"  - {p.name}")
    else:
        console.print(f"[yellow]输入目录已有文件，跳过示例生成。使用 --force 覆盖。[/yellow]")
    console.print(f"\n下一步：[cyan]ip-scheduler counterexample --input {input_dir} --output {output_dir}[/cyan]")


@cli.command("parse")
@_common_dirs
@click.option("--text", help="直接解析单行文本（调试用）")
def cmd_parse(input_dir: Path, output_dir: Path, text: Optional[str]):
    """解析计算草稿并显示结果（不写入项目状态）。"""
    ensure_output_dir(output_dir)
    if text:
        rows = parse_text_block(text, source_file="<cli>")
    else:
        if not input_dir.exists():
            console.print(f"[red]输入目录不存在: {input_dir}[/red]")
            if is_first_run(output_dir):
                console.print(f"[yellow]建议先执行: ip-scheduler init --input {input_dir} --output {output_dir}[/yellow]")
            raise click.Abort()
        rows = load_drafts(input_dir)

    table = Table(title=f"解析结果 (共 {len(rows)} 行)")
    table.add_column("#", justify="right")
    table.add_column("来源")
    table.add_column("姓名")
    table.add_column("日期")
    table.add_column("班次")
    table.add_column("工时")
    table.add_column("备注")
    table.add_column("空值")
    table.add_column("解析错误")

    for r in rows[:50]:
        table.add_row(
            str(r.raw_index),
            r.source_file,
            r.person or "-",
            r.date or "-",
            r.shift or "-",
            f"{r.hours:.1f}" if r.hours is not None else "-",
            (r.note or "")[:20],
            "✓" if r.is_empty else "",
            ";".join(r.parse_errors)[:30],
        )
    console.print(table)
    if len(rows) > 50:
        console.print(f"[dim]仅显示前 50 行，共 {len(rows)} 行[/dim]")

    dups = find_duplicates(rows)
    if dups:
        dup_table = Table(title=f"检测到 {len(dups)} 组重复行（内容哈希相同）")
        dup_table.add_column("内容哈希")
        dup_table.add_column("行数")
        dup_table.add_column("来源")
        for h, g in dups.items():
            dup_table.add_row(h, str(len(g)), ", ".join(f"{r.source_file}:{r.raw_index}" for r in g[:3]))
        console.print(dup_table)


@cli.command("counterexample")
@_common_dirs
@click.option("--reparse", is_flag=True, help="即使输入未变化也强制重新解析（幂等安全）")
def cmd_counterexample(input_dir: Path, output_dir: Path, reparse: bool):
    """日常入口：解析草稿 + 去重合并 + 生成反例。\n
    同一批材料重复运行不会越跑越乱（按内容哈希幂等合并）。
    """
    out = ensure_output_dir(output_dir)
    state = load_state(out)

    if is_first_run(out):
        generate_samples(input_dir)
        console.print(f"[green]首次使用：已生成示例草稿到 {input_dir}[/green]")

    changed = state.is_source_changed(input_dir)
    if changed or reparse or not state.assignments:
        rows = load_drafts(input_dir)
        console.print(f"解析草稿：[cyan]{len(rows)}[/cyan] 行")

        assignments, groups = merge_rows(rows)
        console.print(f"去重合并后：[cyan]{len(assignments)}[/cyan] 条候选排班")

        dups = find_duplicates(rows)
        if dups:
            console.print(f"[yellow]发现 {len(dups)} 组重复草稿（已自动合并）[/yellow]")

        added = merge_into_state(state, assignments, out)
        if added:
            console.print(f"新增排班：[green]+{len(added)}[/green]")

        state.input_dir = str(input_dir)
        state.output_dir = str(out)
        state.refresh_source_hashes(input_dir)
    else:
        console.print(f"[dim]输入文件未变化，跳过解析。使用 --reparse 强制重跑。[/dim]")

    ces = run_all_checks(state, out)
    state.touch()
    save_state(out, state)

    if not ces:
        console.print("[green]未发现问题 ✓[/green]")
    else:
        by_sev: dict[str, int] = {}
        for ce in ces:
            by_sev[ce.severity] = by_sev.get(ce.severity, 0) + 1
        summary = " ".join(f"[{k}]{v}[/{k}]" for k, v in by_sev.items())
        console.print(f"生成反例：{summary}")

        table = Table(title="反例列表")
        table.add_column("级别")
        table.add_column("规则")
        table.add_column("描述")
        table.add_column("影响条目")
        for ce in ces:
            color = {"error": "red", "warning": "yellow", "info": "cyan"}.get(ce.severity, "white")
            table.add_row(
                f"[{color}]{ce.severity}[/{color}]",
                ce.rule,
                ce.description,
                str(len(ce.affected_assignments)),
            )
        console.print(table)

    pending = sum(1 for a in state.assignments.values() if a.status == RowStatus.PENDING)
    confirmed = sum(1 for a in state.assignments.values() if a.status == RowStatus.CONFIRMED)
    rejected = sum(1 for a in state.assignments.values() if a.status == RowStatus.REJECTED)
    console.print(f"\n状态概览: 待确认 [yellow]{pending}[/yellow] | 通过 [green]{confirmed}[/green] | 驳回 [red]{rejected}[/red]")
    console.print(f"[dim]项目状态保存在: {out / 'project_state.json'}[/dim]")


@cli.command("confirm")
@click.argument("assignment_id")
@_common_dirs
@click.option("--comment", default="", help="备注")
@click.option("--operator", default="ta", help="操作人")
def cmd_confirm(assignment_id: str, input_dir: Path, output_dir: Path, comment: str, operator: str):
    """将待确认条目标记为通过。前后变化会写审计日志。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)
    if confirm_assignment(state, assignment_id, out, operator=operator, comment=comment):
        console.print(f"[green]已确认 {assignment_id}[/green]")
    else:
        console.print(f"[red]未找到 {assignment_id}[/red]")
        raise click.Abort()


@cli.command("reject")
@click.argument("assignment_id")
@_common_dirs
@click.option("--comment", default="", help="备注")
@click.option("--operator", default="ta", help="操作人")
def cmd_reject(assignment_id: str, input_dir: Path, output_dir: Path, comment: str, operator: str):
    """驳回排班条目。前后变化会写审计日志。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)
    if reject_assignment(state, assignment_id, out, operator=operator, comment=comment):
        console.print(f"[red]已驳回 {assignment_id}[/red]")
    else:
        console.print(f"[red]未找到 {assignment_id}[/red]")
        raise click.Abort()


@cli.command("edit")
@click.argument("assignment_id")
@_common_dirs
@click.option("--person", help="修改姓名")
@click.option("--date", help="修改日期 YYYY-MM-DD")
@click.option("--shift", help="修改班次")
@click.option("--hours", type=float, help="修改工时")
@click.option("--operator", default="ta", help="操作人")
def cmd_edit(assignment_id: str, input_dir: Path, output_dir: Path, **kwargs):
    """人工修排班字段。每次修改都会记录审计日志（before/after）。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)
    fields = {k: v for k, v in kwargs.items() if v is not None and k != "operator"}
    if not fields:
        console.print("[yellow]未指定任何修改字段[/yellow]")
        raise click.Abort()
    if edit_assignment(state, assignment_id, out, operator=kwargs.get("operator", "ta"), **fields):
        console.print(f"[green]已更新 {assignment_id}: {fields}[/green]")
    else:
        console.print(f"[red]未找到 {assignment_id} 或字段无变化[/red]")
        raise click.Abort()


@cli.command("list")
@_common_dirs
@click.option("--status", type=click.Choice(["all", "pending", "confirmed", "rejected"]), default="all")
def cmd_list(input_dir: Path, output_dir: Path, status: str):
    """列出排班条目。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)
    items = list(state.assignments.values())
    if status != "all":
        s = RowStatus(status)
        items = [a for a in items if a.status == s]

    if not items:
        console.print("[dim]（空）[/dim]")
        return

    table = Table(title=f"排班列表 ({len(items)} 条)")
    table.add_column("ID")
    table.add_column("状态")
    table.add_column("姓名")
    table.add_column("日期")
    table.add_column("班次")
    table.add_column("工时")
    table.add_column("来源")
    for a in items:
        color = {"pending": "yellow", "confirmed": "green", "rejected": "red"}.get(a.status.value, "white")
        table.add_row(
            a.assignment_id,
            f"[{color}]{a.status.value}[/{color}]",
            a.person, a.date, a.shift, f"{a.hours:.1f}",
            ",".join(a.source_rows[:2]),
        )
    console.print(table)


@cli.command("audit")
@_common_dirs
@click.option("--assignment-id", help="仅看某条排班的历史")
def cmd_audit(input_dir: Path, output_dir: Path, assignment_id: Optional[str]):
    """查看审计日志（人工修正留痕）。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)
    records = state.audit
    if assignment_id:
        records = [r for r in records if r.assignment_id == assignment_id]
    if not records:
        console.print("[dim]（暂无审计记录）[/dim]")
        return

    table = Table(title=f"审计日志 ({len(records)} 条)")
    table.add_column("时间")
    table.add_column("排班ID")
    table.add_column("操作人")
    table.add_column("变更")
    table.add_column("备注")
    for r in records:
        import json
        delta = []
        for k in set(r.before) | set(r.after):
            b = r.before.get(k)
            a = r.after.get(k)
            if b != a:
                delta.append(f"{k}: {b!r} → {a!r}")
        table.add_row(
            r.timestamp, r.assignment_id, r.operator,
            "; ".join(delta)[:60], r.comment,
        )
    console.print(table)


@cli.command("export")
@_common_dirs
def cmd_export(input_dir: Path, output_dir: Path):
    """月底/课前用：导出 CSV 与图表。"""
    out = ensure_output_dir(output_dir)
    state = load_state(out)

    if not state.assignments:
        console.print("[yellow]项目状态为空。先运行 ip-scheduler counterexample[/yellow]")
        raise click.Abort()

    results = export_all(state, out)
    console.print("[green]已导出：[/green]")
    for k, v in results.items():
        if v:
            console.print(f"  - {k}: [cyan]{v}[/cyan]")
        else:
            console.print(f"  - {k}: [dim](跳过)[/dim]")


def main():
    cli()


if __name__ == "__main__":
    main()
