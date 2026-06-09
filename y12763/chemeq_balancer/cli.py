"""
化学方程式配平 CLI 工具主入口
============================

子命令:
    balance   - 快速配平单条方程式 (独立使用, 不涉及批次)
    batch     - 批次报告管理 (创建、列表、查看、添加反应、状态变更)
    retest    - 复测建议 (日常入口, 列出需处理事项)
    export    - 导出批次报告 (月底/课前汇报)
    trace     - 数据追溯 (从结果反查来源与处理历史)
    demo      - 生成演示数据并展示完整流程

所有展示信息与导出文件使用同一数据源 (BatchReport.compute_summary),
杜绝"界面显示通过、文件写待确认"的不一致。
"""

import sys
import json
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from .balancer import (
    BalanceMethod,
    balance_equation,
    parse_equation,
)
from .models import ReactionStatus
from .reports import (
    BatchManager,
    create_default_manager,
    RetestManager,
    Exporter,
    ExportFormat,
    Tracer,
)
from .storage import get_default_storage, set_default_storage_path


console = Console()


def _print_header():
    console.print(
        Panel.fit(
            "[bold cyan]化学方程式配平 CLI[/bold cyan]  v1.0.0\n"
            "[dim]面向药化课题组的批次报告管理工具[/dim]",
            border_style="cyan",
        )
    )


# ---------------------------------------------------------------------------
# balance 子命令
# ---------------------------------------------------------------------------

@click.group()
@click.option("--store-path", type=click.Path(dir_okay=False), help="指定数据存储文件路径")
@click.pass_context
def cli(ctx, store_path: Optional[str]):
    if store_path:
        set_default_storage_path(store_path)
    ctx.ensure_object(dict)
    ctx.obj["storage"] = get_default_storage()
    ctx.obj["batch_manager"] = BatchManager(ctx.obj["storage"])
    ctx.obj["retest_manager"] = RetestManager(ctx.obj["storage"])
    ctx.obj["exporter"] = Exporter(ctx.obj["storage"])
    ctx.obj["tracer"] = Tracer(ctx.obj["storage"])


@cli.command()
@click.argument("equation", type=str)
@click.option("--method", type=click.Choice(["auto", "matrix", "lcm"]), default="auto",
              help="配平方法: auto(默认)、matrix(矩阵消元法)、lcm(最小公倍数法)")
@click.option("--show-table/--no-table", default=True, help="显示元素守恒表")
def balance(equation: str, method: str, show_table: bool):
    """快速配平单条化学方程式 (不涉及批次管理)"""
    _print_header()
    method_enum = BalanceMethod(method)
    console.print(f"[bold]输入方程式:[/bold] {equation}")
    console.print(f"[dim]配平方法: {method_enum.value}[/dim]")
    console.print()

    result = balance_equation(equation, method=method_enum)

    if result.success:
        console.print(Panel(
            f"[bold green]配平成功[/bold green]\n\n"
            f"[bold]原始:[/bold]   {result.equation.raw_text}\n"
            f"[bold]配平后:[/bold] [green]{result.format_equation()}[/green]\n"
            f"[bold]系数:[/bold]   {result.coefficients}\n"
            f"[bold]算法:[/bold]   {result.method.value}",
            border_style="green",
            title="配平结果",
        ))

        if show_table and result.balanced_eq:
            table = Table(title="元素守恒验证", box=box.SIMPLE_HEAVY, header_style="bold cyan")
            table.add_column("元素", justify="center")
            table.add_column("反应物总数", justify="right")
            table.add_column("产物总数", justify="right")
            table.add_column("守恒", justify="center")
            for elem, info in result.element_table().items():
                mark = "[green]✓[/green]" if info["conserved"] else "[red]✗[/red]"
                table.add_row(elem, str(info["reactants"]), str(info["products"]), mark)
            console.print(table)
    else:
        console.print(Panel(
            f"[bold red]配平失败[/bold red]\n\n"
            f"[bold]原因代码:[/bold] {result.fail_reason}\n"
            f"[bold]详细说明:[/bold] {result.fail_message}",
            border_style="red",
            title="配平结果",
        ))

        console.print()
        console.print("[bold yellow]失败原因说明:[/bold yellow]")
        reasons = {
            "PARSE_ERROR": "输入字符串无法解析 (括号不匹配、元素符号错误等)",
            "NO_SOLUTION": "反应物产物元素不一致或方程式不可能配平",
            "INFINITE_SOLUTIONS": "零空间维度>1, 可能是多步独立反应未拆分",
            "OVERFLOW": "系数过大(>10000), 建议拆分为多步反应",
            "UNKNOWN": "未知错误, 请反馈给工具维护者",
        }
        for code, desc in reasons.items():
            prefix = "[bold red]>[/bold red] " if code == result.fail_reason else "  "
            console.print(f"{prefix}[dim]{code}:[/dim] {desc}")


# ---------------------------------------------------------------------------
# batch 子命令组
# ---------------------------------------------------------------------------

@cli.group()
def batch():
    """批次报告管理 (创建、查看、添加反应、审核)"""


@batch.command("list")
def batch_list():
    """列出所有批次的摘要"""
    _print_header()
    mgr: BatchManager = create_default_manager()
    batches = mgr.list_batches()
    if not batches:
        console.print("[yellow]暂无批次报告, 使用 'chemeq batch create' 创建[/yellow]")
        return
    table = Table(title="批次报告列表", box=box.ROUNDED, header_style="bold magenta")
    table.add_column("批次ID", style="cyan")
    table.add_column("标题")
    table.add_column("总数", justify="right")
    table.add_column("通过", justify="right", style="green")
    table.add_column("待确认", justify="right", style="yellow")
    table.add_column("需复测", justify="right", style="red")
    table.add_column("空白对照", justify="center")
    table.add_column("合格率", justify="right")
    table.add_column("操作员")
    table.add_column("更新时间")
    for b in batches:
        blank_mark = "[green]✓[/green]" if b["has_blank_control"] else "[red]✗[/red]"
        table.add_row(
            b["id"],
            b["title"],
            str(b["total_reactions"]),
            str(b["verified_count"] + b["blank_count"]),
            str(b["pending_count"]),
            str(b["needs_retest_count"]),
            blank_mark,
            b["approval_rate_display"],
            b["operator"] or "-",
            b["updated_at"][:19].replace("T", " "),
        )
    console.print(table)


@batch.command("create")
@click.option("--title", required=True, help="批次标题")
@click.option("--operator", default="", help="操作员姓名")
@click.option("--desc", default="", help="批次描述")
def batch_create(title: str, operator: str, desc: str):
    """创建新批次报告"""
    mgr: BatchManager = create_default_manager()
    batch = mgr.create_batch(title, operator, desc)
    console.print(Panel(
        f"[bold green]批次创建成功[/bold green]\n\n"
        f"[bold]ID:[/bold]       {batch.id}\n"
        f"[bold]标题:[/bold]     {batch.title}\n"
        f"[bold]操作员:[/bold]   {operator or '未填'}\n"
        f"[bold]描述:[/bold]     {desc or '-'}\n"
        f"[bold]创建时间:[/bold] {batch.created_at[:19]}\n\n"
        f"[dim]下一步: chemeq batch add-reaction --batch-id {batch.id} --equation 'H2 + O2 -> H2O'[/dim]",
        border_style="green",
    ))


@batch.command("show")
@click.option("--batch-id", required=True, help="批次 ID")
def batch_show(batch_id: str):
    """查看单个批次的详细信息 (界面摘要与导出同源)"""
    mgr: BatchManager = create_default_manager()
    batch = mgr.get_batch(batch_id)
    if batch is None:
        console.print(f"[red]批次不存在: {batch_id}[/red]")
        return
    summary = batch.compute_summary()
    disp = summary.to_display_dict()

    _print_header()
    console.print(Panel(
        f"[bold]{batch.title}[/bold]\n"
        f"[dim]ID: {batch.id} | 操作员: {batch.operator or '未填'} | 更新: {summary.last_updated[:19]}[/dim]\n\n"
        f"[bold]状态总览:[/bold] {disp['status_overview']}\n"
        f"[bold]合格率:     [/bold] {disp['approval_rate_display']}\n",
        title="批次摘要 (与导出文件完全一致)",
        border_style="cyan",
    ))

    ok, issues = mgr.check_blank_control(batch_id)
    if not ok:
        for issue in issues:
            console.print(f"[red]⚠ 质控问题: {issue}[/red]")

    if summary.duplicate_conflicts:
        console.print(f"[yellow]⚠ 指纹冲突 {summary.duplicate_conflicts} 组, 请查看 'chemeq retest list'[/yellow]")

    if batch.reactions:
        table = Table(title="反应记录", box=box.ROUNDED, header_style="bold blue")
        table.add_column("ID", style="cyan")
        table.add_column("实验编号")
        table.add_column("方程式")
        table.add_column("状态")
        table.add_column("空白", justify="center")
        table.add_column("操作员")
        table.add_column("更新")
        status_style = {
            "pending": "yellow", "verified": "green", "rejected": "red",
            "needs_retest": "magenta", "blank_control": "dim",
        }
        for r in batch.reactions:
            st = r.status.value
            style = status_style.get(st, "")
            blank_mark = "[cyan]✓[/cyan]" if r.is_blank else ""
            table.add_row(
                r.id,
                r.experiment_id or "-",
                (r.balanced_equation or r.raw_equation)[:60],
                f"[{style}]{r.status.display_name}[/{style}]",
                blank_mark,
                r.operator or "-",
                r.updated_at[:16].replace("T", " "),
            )
        console.print(table)
    else:
        console.print("[dim]该批次暂无反应记录[/dim]")


@batch.command("add-reaction")
@click.option("--batch-id", required=True, help="批次 ID")
@click.option("--equation", required=True, help="化学方程式, 如 'H2 + O2 -> H2O'")
@click.option("--operator", default="", help="操作员姓名")
@click.option("--conditions", default="", help="反应条件, 如 '25°C, 1atm, 催化剂Pd/C'")
@click.option("--exp-id", default="", help="实验编号")
@click.option("--notes", default="", help="备注")
@click.option("--blank", is_flag=True, help="标记为空白对照 (不参与统计但用于质控)")
@click.option("--source", default="manual", help="来源: manual/import/script")
@click.option("--no-balance", is_flag=True, help="不自动配平 (仅记录原始方程式)")
def batch_add_reaction(batch_id, equation, operator, conditions, exp_id, notes, blank, source, no_balance):
    """向批次添加一条反应记录 (自动去重+补录)"""
    mgr: BatchManager = create_default_manager()
    result = mgr.add_reaction(
        batch_id=batch_id,
        raw_equation=equation,
        operator=operator,
        reaction_conditions=conditions,
        experiment_id=exp_id,
        notes=notes,
        is_blank=blank,
        source=source,
        auto_balance=not no_balance,
    )
    if result.success:
        color = "green"
        tag = "新增" if not result.is_duplicate else "补录合并"
    else:
        color = "yellow"
        tag = "被拒绝"

    console.print(Panel(
        f"[bold {color}]{tag}: {result.action}[/bold {color}]\n\n"
        + (
            f"[bold]记录ID:[/bold]   {result.reaction.id}\n"
            f"[bold]指纹:[/bold]     {result.reaction.fingerprint[:24]}...\n"
            f"[bold]状态:[/bold]     {result.reaction.status.display_name}\n"
            f"[bold]配平结果:[/bold] {result.reaction.balanced_equation or '(未配平)'}"
            if result.reaction else ""
        )
        + (("\n[yellow]警告:\n" + "\n".join(f"  - {w}" for w in result.warnings)) if result.warnings else ""),
        border_style=color,
        title="添加结果",
    ))


@batch.command("set-status")
@click.option("--batch-id", required=True)
@click.option("--reaction-id", required=True)
@click.option("--status", required=True,
              type=click.Choice(["pending", "verified", "rejected", "needs_retest", "blank_control"]))
@click.option("--operator", default="")
@click.option("--comment", default="")
def batch_set_status(batch_id, reaction_id, status, operator, comment):
    """变更反应记录的审核状态"""
    mgr: BatchManager = create_default_manager()
    ok = mgr.set_status(batch_id, reaction_id, ReactionStatus(status), operator, comment)
    if ok:
        console.print(f"[green]状态已更新为 {ReactionStatus(status).display_name}[/green]")
    else:
        console.print("[red]更新失败, 请检查批次ID和反应ID是否正确[/red]")


@batch.command("qc-check")
@click.option("--batch-id", required=True)
def batch_qc_check(batch_id):
    """批次质控检查 (含空白对照缺失检测)"""
    mgr: BatchManager = create_default_manager()
    batch = mgr.get_batch(batch_id)
    if batch is None:
        console.print(f"[red]批次不存在: {batch_id}[/red]")
        return
    summary = batch.compute_summary()
    console.print(f"[bold]批次:[/bold] {batch.title} ({batch.id})")
    console.print()

    console.print("[bold cyan]质控项检查:[/bold cyan]")
    ok, issues = mgr.check_blank_control(batch_id)
    console.print(f"  空白对照:   {'[green]✓ 通过[/green]' if ok else '[red]✗ 不通过[/red]'}")
    for issue in issues:
        console.print(f"    [red]· {issue}[/red]")

    console.print(f"  指纹冲突:   {'[red]✗ 存在 ' + str(summary.duplicate_conflicts) + ' 组[/red]' if summary.duplicate_conflicts else '[green]✓ 无冲突[/green]'}")
    console.print(f"  数据一致性: {'[green]✓ 完全一致[/green]' if summary.all_consistent else '[yellow]✗ 待处理[/yellow]'}")

    if not summary.all_consistent:
        console.print()
        console.print("[yellow]  → 请运行 'chemeq retest list' 查看待处理事项[/yellow]")


# ---------------------------------------------------------------------------
# retest 子命令组 (日常入口)
# ---------------------------------------------------------------------------

@cli.group()
def retest():
    """复测建议 (日常入口: 每天上班先跑这个)"""


@retest.command("list")
@click.option("--batch-id", default=None, help="仅查看指定批次")
@click.option("--scan/--no-scan", default=True, help="是否先扫描再显示")
def retest_list(batch_id, scan):
    """列出所有待处理的复测建议"""
    _print_header()
    mgr = RetestManager()
    if scan:
        mgr.scan_all()
    items = mgr.list_unresolved(batch_id)
    if not items:
        console.print("[green]🎉 所有批次状态良好, 无待处理事项[/green]")
        return
    table = Table(title=f"待处理复测建议 ({len(items)} 条)", box=box.ROUNDED, header_style="bold magenta")
    table.add_column("优先级")
    table.add_column("建议ID", style="cyan")
    table.add_column("批次")
    table.add_column("反应ID")
    table.add_column("原因")
    table.add_column("建议")
    prio_style = {"critical": "red bold", "high": "red", "medium": "yellow", "low": "dim"}
    for it in items:
        style = prio_style.get(it["priority"], "")
        table.add_row(
            f"[{style}]{it['priority_display']}[/{style}]",
            it["id"],
            it["batch_title"],
            it["reaction_id"] or "-",
            it["reason"],
            it["recommendation"] or "-",
        )
    console.print(table)


@retest.command("resolve")
@click.argument("suggestion_id")
@click.option("--operator", default="")
@click.option("--comment", default="")
def retest_resolve(suggestion_id, operator, comment):
    """标记一条复测建议为已解决"""
    mgr = RetestManager()
    if mgr.resolve(suggestion_id, operator, comment):
        console.print(f"[green]已标记 {suggestion_id} 为已解决[/green]")
    else:
        console.print(f"[red]未找到建议 {suggestion_id}[/red]")


# ---------------------------------------------------------------------------
# export 子命令 (月底/课前汇报)
# ---------------------------------------------------------------------------

@cli.command()
@click.option("--batch-id", required=True, help="批次 ID")
@click.option("--format", "fmt", default="txt", type=click.Choice(["json", "csv", "txt"]),
              help="导出格式: txt(默认,人可读)、json(完整)、csv(表格)")
@click.option("--output", "-o", type=click.Path(dir_okay=False), default=None,
              help="输出文件路径, 不填则打印到终端")
def export(batch_id: str, fmt: str, output: Optional[str]):
    """导出批次报告 (月底/课前汇报)"""
    mgr = create_default_manager()
    batch = mgr.get_batch(batch_id)
    if batch is None:
        console.print(f"[red]批次不存在: {batch_id}[/red]")
        return

    fmt_enum = ExportFormat(fmt)
    exporter = Exporter()

    if output:
        path = exporter.save_to_file(batch, output, fmt_enum)
        console.print(f"[green]已导出到: {path}[/green]")
    else:
        content = exporter.export_batch(batch, fmt_enum)
        click.echo(content)

    summary = batch.compute_summary()
    console.print(f"\n[dim]摘要校验 (与导出文件完全一致): "
                  f"共{summary.total_reactions}条 | "
                  f"通过{summary.verified_count + summary.blank_count} | "
                  f"待确认{summary.pending_count} | "
                  f"需复测{summary.needs_retest_count} | "
                  f"空白对照{'✓' if summary.has_blank_control else '✗'}[/dim]")


# ---------------------------------------------------------------------------
# trace 子命令 (倒查)
# ---------------------------------------------------------------------------

@cli.command()
@click.option("--reaction-id", default=None, help="通过反应 ID 追溯")
@click.option("--equation", default=None, help="通过方程式内容追溯")
@click.option("--conditions", default="", help="配合 --equation 的反应条件")
@click.option("--exp-id", default="", help="配合 --equation 的实验编号")
@click.option("--batch-id", default=None, help="可选, 限定批次范围")
def trace(reaction_id, equation, conditions, exp_id, batch_id):
    """数据追溯: 从结果反查来源与处理历史 (验收倒查专用)"""
    _print_header()
    tracer = Tracer()
    if reaction_id:
        result = tracer.trace_reaction_id(reaction_id, batch_id)
    elif equation:
        result = tracer.trace_equation(equation, conditions, exp_id)
    else:
        console.print("[red]请提供 --reaction-id 或 --equation[/red]")
        return
    console.print(result.format_human())


# ---------------------------------------------------------------------------
# demo 子命令 (一键演示完整流程)
# ---------------------------------------------------------------------------

@cli.command()
@click.option("--clean", is_flag=True, help="清空现有数据后生成演示 (慎用)")
def demo(clean: bool):
    """生成演示数据并走一遍完整流程"""
    _print_header()
    console.print("[bold cyan]生成演示数据...[/bold cyan]")

    if clean:
        store_path = get_default_storage().path
        if store_path.exists():
            store_path.unlink()
            console.print(f"[dim]已清空: {store_path}[/dim]")

    mgr = create_default_manager()
    batch = mgr.create_batch(
        title="演示批次 - 2026年6月新药合成组",
        operator="演示用户",
        description="验收会演示: 包含通过、待确认、配平失败、空白对照完整场景",
    )
    bid = batch.id

    samples = [
        ("H2 + O2 -> H2O", "25°C, 1atm", "EXP-001", False),
        ("CH4 + O2 -> CO2 + H2O", "完全燃烧", "EXP-002", False),
        ("Fe + HCl -> FeCl3 + H2", "室温", "EXP-003", False),
        ("Ca(OH)2 + CO2 -> CaCO3 + H2O", "", "EXP-004", False),
        ("KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", "酸性条件", "EXP-005", False),
        ("H2O -> H2 + O2", "空白对照", "BLANK-001", True),
    ]
    for eq, cond, exp, is_blank in samples:
        mgr.add_reaction(bid, eq, operator="演示用户", reaction_conditions=cond,
                         experiment_id=exp, is_blank=is_blank)

    rcts = {r.experiment_id: r for r in mgr.get_batch(bid).reactions}
    if "EXP-001" in rcts:
        mgr.set_status(bid, rcts["EXP-001"].id, ReactionStatus.VERIFIED, operator="审核员A", comment="系数符合文献")
    if "EXP-002" in rcts:
        mgr.set_status(bid, rcts["EXP-002"].id, ReactionStatus.VERIFIED, operator="审核员A", comment="已复核")
    if "EXP-003" in rcts:
        mgr.set_status(bid, rcts["EXP-003"].id, ReactionStatus.REJECTED, operator="审核员B", comment="产物应该是FeCl2, 需要补充还原剂选择说明")

    console.print(f"[green]演示批次已创建: {bid}[/green]")
    console.print()
    console.print("[bold]执行复测扫描 (日常入口):[/bold]")
    rm = RetestManager()
    items = rm.scan_all()
    if items:
        for it in items[:5]:
            console.print(f"  [{it['priority_display']}] {it['reason']}")
    else:
        console.print("  (无待处理项)")
    console.print()

    console.print("[bold]执行质控检查 (含空白对照):[/bold]")
    ok, issues = mgr.check_blank_control(bid)
    console.print(f"  空白对照: {'[green]✓[/green]' if ok else '[red]✗[/red]'}")
    for i in issues:
        console.print(f"    {i}")
    console.print()

    console.print("[bold]数据追溯演示 (从 EXP-001 反查):[/bold]")
    if "EXP-001" in rcts:
        tracer = Tracer()
        tr = tracer.trace_reaction_id(rcts["EXP-001"].id, bid)
        console.print(f"  找到反应: {tr.reaction['id'] if tr.reaction else 'N/A'}")
        console.print(f"  审计记录: {len(tr.audit_trail)} 条")
        for a in tr.audit_trail[:3]:
            console.print(f"    - [{a['timestamp'][:19]}] {a['action']} by {a['operator'] or 'system'}: {a['comment']}")
    console.print()

    console.print("[bold]导出演示 (TXT 人可读):[/bold]")
    exporter = Exporter()
    out = exporter.export_batch(mgr.get_batch(bid), ExportFormat.TXT)
    for line in out.splitlines()[:10]:
        console.print(f"  {line}")
    console.print(f"  ... (共 {len(out.splitlines())} 行, 使用 chemeq export 查看完整)")
    console.print()

    console.print(Panel(
        f"[bold green]演示完成[/bold green]\n\n"
        f"[bold]关键命令速查:[/bold]\n"
        f"  chemeq batch list                 查看所有批次\n"
        f"  chemeq batch show --batch-id {bid}\n"
        f"  chemeq retest list                日常入口: 待处理事项\n"
        f"  chemeq export --batch-id {bid} -o report.txt\n"
        f"  chemeq trace --reaction-id <id>   验收倒查: 追溯来源\n\n"
        f"[bold]数据存储位置:[/bold] {get_default_storage().path}\n"
        f"[dim]第一份样例报告已生成, 使用 export 子命令导出即可[/dim]",
        border_style="green",
    ))


if __name__ == "__main__":
    cli()
