"""CLI命令入口。"""

from __future__ import annotations

import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from . import __version__
from .db import init_db, get_db_path
from . import models
from . import engine
from . import exporter

console = Console()


# ---------------------------------------------------------------------------
# 基础
# ---------------------------------------------------------------------------

@click.group()
@click.version_option(__version__, prog_name="rq")
def main():
    """银行理财赎回排队服务。"""


@main.command()
def init():
    """初始化数据库。"""
    init_db()
    console.print(f"[green]数据库已初始化[/green]: {get_db_path()}")


@main.command()
def status():
    """查看整体状态概览。"""
    init_db()
    orders = models.list_orders()
    if not orders:
        console.print("[yellow]暂无赎回单[/yellow]")
        return

    status_count: dict[str, int] = {}
    for o in orders:
        status_count[o.status] = status_count.get(o.status, 0) + 1

    table = Table(title="赎回排队状态概览")
    table.add_column("状态", style="cyan")
    table.add_column("数量", justify="right", style="magenta")
    for st, cnt in sorted(status_count.items()):
        table.add_row(st, str(cnt))
    console.print(table)


# ---------------------------------------------------------------------------
# 导入
# ---------------------------------------------------------------------------

@main.command("import-product")
@click.argument("code")
@click.argument("name")
def import_product(code: str, name: str):
    """导入产品: CODE NAME"""
    init_db()
    p = models.upsert_product(code, name)
    console.print(f"[green]产品已导入[/green]: {p.code} {p.name}")


@main.command("import-open-day")
@click.argument("product_code")
@click.argument("date")
@click.option("--source", default="CLI", help="数据来源")
@click.option("--note", default=None, help="备注")
def import_open_day(product_code: str, date: str, source: str, note: str | None):
    """导入开放日: PRODUCT_CODE DATE"""
    init_db()
    d = models.upsert_open_day(product_code, date, source, note)
    console.print(f"[green]开放日已导入[/green]: {d.product_code} {d.open_date}")


@main.command("import-balance")
@click.argument("product_code")
@click.argument("customer_id")
@click.argument("amount", type=float)
@click.argument("snapshot_date")
@click.option("--source", default="CLI", help="数据来源")
def import_balance(product_code: str, customer_id: str, amount: float, snapshot_date: str, source: str):
    """导入份额余额: PRODUCT_CODE CUSTOMER_ID AMOUNT SNAPSHOT_DATE"""
    init_db()
    b = models.upsert_share_balance(product_code, customer_id, amount, snapshot_date, source)
    console.print(f"[green]余额已导入[/green]: {b.product_code} {b.customer_id} 总{b.balance:.4f} 锁{b.locked:.4f}")


@main.command("import-order")
@click.argument("order_no")
@click.argument("product_code")
@click.argument("customer_id")
@click.argument("amount", type=float)
@click.argument("apply_date")
@click.option("--source", default="CLI", help="数据来源")
def import_order(order_no: str, product_code: str, customer_id: str, amount: float, apply_date: str, source: str):
    """导入赎回单: ORDER_NO PRODUCT_CODE CUSTOMER_ID AMOUNT APPLY_DATE"""
    init_db()
    o = models.create_order(order_no, product_code, customer_id, amount, apply_date, source)
    console.print(f"[green]赎回单已导入[/green]: {o.order_no} {o.product_code} {o.customer_id} {o.amount:.4f}")


# ---------------------------------------------------------------------------
# 处理
# ---------------------------------------------------------------------------

@main.command("process")
@click.option("--order", "order_no", default=None, help="处理指定赎回单号，不指定则处理全部待处理")
@click.option("--current-date", default=None, help="当前处理日期 YYYY-MM-DD，默认今天")
def process(order_no: str | None, current_date: str | None):
    """处理赎回排队：校验→锁定→顺延判定。"""
    init_db()
    results: list[engine.ProcessResult] = []

    if order_no:
        results.append(engine.process_order(order_no))
    else:
        results = engine.process_all(current_date)

    if not results:
        console.print("[yellow]没有需要处理的订单[/yellow]")
        return

    table = Table(title="处理结果")
    table.add_column("赎回单号", style="cyan")
    table.add_column("最终状态", style="magenta")
    table.add_column("告警", style="yellow", no_wrap=False)
    table.add_column("详情", style="white")

    for r in results:
        alert_msgs = "\n".join(a.format() for a in r.alerts) if r.alerts else "-"
        table.add_row(r.order_no, r.final_status, alert_msgs, r.details)

    console.print(table)


@main.command("cancel")
@click.argument("order_no")
@click.option("--cancel-date", required=True, help="撤单日期 YYYY-MM-DD")
@click.option("--source", default="CLI", help="数据来源")
@click.option("--reason", default=None, help="撤单原因")
def cancel(order_no: str, cancel_date: str, source: str, reason: str | None):
    """撤单回滚: ORDER_NO --cancel-date DATE"""
    init_db()
    r = engine.cancel_order(order_no, cancel_date, source, reason)
    for a in r.alerts:
        console.print(a.format())
    console.print(f"[green]撤单处理[/green]: {r.order_no} → {r.final_status}")


@main.command("arrive")
@click.argument("order_no")
@click.option("--arrive-date", required=True, help="到账日期 YYYY-MM-DD")
@click.option("--amount", "amount", type=float, required=True, help="到账金额")
@click.option("--source", default="CLI", help="数据来源")
def arrive(order_no: str, arrive_date: str, amount: float, source: str):
    """到账确认: ORDER_NO --arrive-date DATE --amount AMOUNT"""
    init_db()
    r = engine.confirm_arrival(order_no, arrive_date, amount, source)
    for a in r.alerts:
        console.print(a.format())
    console.print(f"[green]到账确认[/green]: {r.order_no} → {r.final_status}")


# ---------------------------------------------------------------------------
# 查询
# ---------------------------------------------------------------------------

@main.command("query")
@click.argument("order_no", required=False)
@click.option("--status", "status_filter", default=None, help="按状态过滤")
def query(order_no: str | None, status_filter: str | None):
    """查询赎回单。"""
    init_db()

    if order_no:
        o = models.get_order(order_no)
        if not o:
            console.print(f"[red]未找到[/red]: {order_no}")
            return
        table = Table(title=f"赎回单 {o.order_no}")
        for k, v in vars(o).items():
            table.add_row(k, str(v))
        console.print(table)

        cancel = models.get_cancellation(order_no)
        if cancel:
            table2 = Table(title="撤单记录")
            table2.add_column("撤单日期")
            table2.add_column("原因")
            table2.add_column("来源")
            table2.add_row(cancel.cancel_date, cancel.reason or "-", cancel.source)
            console.print(table2)

        arrival = models.get_arrival_report(order_no)
        if arrival:
            table3 = Table(title="到账报告")
            table3.add_column("到账日期")
            table3.add_column("到账金额")
            table3.add_column("来源")
            table3.add_row(arrival.arrive_date, f"{arrival.arrive_amount:.4f}", arrival.source)
            console.print(table3)

        logs = models.list_audit_logs("redemption_order", order_no)
        if logs:
            table4 = Table(title="审计痕迹")
            table4.add_column("时间")
            table4.add_column("操作")
            table4.add_column("旧值")
            table4.add_column("新值")
            for log in logs:
                table4.add_row(log.created_at or "-", log.action, log.old_value or "-", log.new_value or "-")
            console.print(table4)
        return

    orders = models.list_orders(status_filter)
    if not orders:
        console.print("[yellow]无匹配记录[/yellow]")
        return

    table = Table(title=f"赎回单列表（{status_filter or '全部'}）")
    table.add_column("单号", style="cyan")
    table.add_column("产品")
    table.add_column("客户")
    table.add_column("金额", justify="right")
    table.add_column("申请日")
    table.add_column("状态", style="magenta")
    table.add_column("开放日")
    table.add_column("巨额")
    table.add_column("顺延")
    for o in orders:
        table.add_row(
            o.order_no, o.product_code, o.customer_id,
            f"{o.amount:.4f}", o.apply_date, o.status,
            "是" if o.is_open_day else "否",
            "是" if o.is_large_redemption else "否",
            str(o.defer_count),
        )
    console.print(table)


# ---------------------------------------------------------------------------
# 导出
# ---------------------------------------------------------------------------

@main.command("export")
@click.option("--dir", "output_dir", default="exports", help="导出目录")
@click.option("--type", "export_type", type=click.Choice(["queue", "shares", "open-days", "audit", "all"]), default="all")
def export(output_dir: str, export_type: str):
    """导出报告。"""
    init_db()
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    if export_type == "queue":
        p = exporter.export_queue_report(str(out / "赎回排队报告.csv"))
    elif export_type == "shares":
        p = exporter.export_share_report(str(out / "份额余额报告.csv"))
    elif export_type == "open-days":
        p = exporter.export_open_days_report(str(out / "开放日日历.csv"))
    elif export_type == "audit":
        p = exporter.export_audit_report(str(out / "审计痕迹.csv"))
    else:
        paths = exporter.export_all(output_dir)
        for k, v in paths.items():
            console.print(f"[green]已导出[/green]: {v}")
        return

    console.print(f"[green]已导出[/green]: {p}")


# ---------------------------------------------------------------------------
# 告警检查
# ---------------------------------------------------------------------------

@main.command("check-alerts")
def check_alerts():
    """检查所有告警（非开放日、巨额、已顺延、撤单后）。"""
    init_db()
    orders = models.list_orders()

    issues: list[tuple[str, str]] = []
    for o in orders:
        if not o.is_open_day:
            issues.append((o.order_no, f"非开放日申请（{o.apply_date}）"))
        if o.is_large_redemption:
            issues.append((o.order_no, f"巨额赎回（已顺延 {o.defer_count} 次）"))
        if o.status == "DEFERRED":
            issues.append((o.order_no, f"顺延中，下次处理日：{o.next_process_date or '-'}"))
        if o.status == "CANCELLED":
            cancel = models.get_cancellation(o.order_no)
            issues.append((o.order_no, f"已撤单（{cancel.cancel_date if cancel else '-'}）"))

    if not issues:
        console.print("[green]无告警[/green]")
        return

    table = Table(title="告警清单")
    table.add_column("赎回单号", style="cyan")
    table.add_column("告警内容", style="yellow")
    for order_no, msg in issues:
        table.add_row(order_no, msg)
    console.print(table)


if __name__ == "__main__":
    main()
