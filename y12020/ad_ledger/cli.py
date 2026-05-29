from __future__ import annotations

import csv
import sys
from datetime import date
from pathlib import Path

import click

from .store import Store
from .engine import Engine
from .reporter import generate_balance_report, generate_export_csv


def _get_store() -> Store:
    base = Path.cwd()
    store = Store(base)
    if not store.is_initialized():
        click.echo("错误: 当前目录未初始化账本。请先运行 ad-ledger init", err=True)
        sys.exit(1)
    return store


def _read_csv(path: str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        click.echo(f"错误: 文件不存在 {path}", err=True)
        sys.exit(1)

    with p.open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = [row for row in reader]

    if not rows:
        click.echo("警告: CSV 文件为空", err=True)
    return rows


def _normalize_recharges(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "recharge_id": row["recharge_id"].strip(),
            "account_id": row["account_id"].strip(),
            "amount": row["amount"].strip(),
            "date": row["date"].strip(),
            "operator": row["operator"].strip(),
            "note": row.get("note", "").strip(),
        })
    return result


def _normalize_consumptions(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "consumption_id": row["consumption_id"].strip(),
            "account_id": row["account_id"].strip(),
            "amount": row["amount"].strip(),
            "date": row["date"].strip(),
            "settled_date": row.get("settled_date", "").strip() or None,
            "note": row.get("note", "").strip(),
        })
    return result


def _normalize_rebates(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "rebate_id": row["rebate_id"].strip(),
            "account_id": row["account_id"].strip(),
            "amount": row["amount"].strip(),
            "date": row["date"].strip(),
            "rebate_from_recharge_id": row["rebate_from_recharge_id"].strip(),
            "note": row.get("note", "").strip(),
        })
    return result


def _normalize_refunds(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "refund_id": row["refund_id"].strip(),
            "account_id": row["account_id"].strip(),
            "amount": row["amount"].strip(),
            "date": row["date"].strip(),
            "refund_from_id": row["refund_from_id"].strip(),
            "refund_from_type": row["refund_from_type"].strip(),
            "note": row.get("note", "").strip(),
        })
    return result


def _normalize_accounts(rows: list[dict]) -> list[dict]:
    result = []
    for row in rows:
        result.append({
            "account_id": row["account_id"].strip(),
            "name": row["name"].strip(),
            "platform": row["platform"].strip(),
            "currency": row.get("currency", "CNY").strip(),
        })
    return result


def _print_import_result(added: int, skipped: int, conflicts: int):
    click.echo(f"  新增: {added}  跳过(已存在): {skipped}  冲突: {conflicts}")
    if conflicts > 0:
        click.echo("  ⚠ 存在冲突！请运行 ad-ledger conflicts 查看详情", err=True)


@click.group()
def main():
    """广告预充值消耗账本"""
    pass


@main.command()
def init():
    """在当前目录初始化账本"""
    store = Store(Path.cwd())
    if store.is_initialized():
        click.echo("账本已存在，跳过初始化")
        return
    store.init()
    click.echo("账本已初始化 → .ad-ledger/")


@main.command("import-accounts")
@click.argument("csv_file")
def import_accounts(csv_file: str):
    """从 CSV 导入客户账户"""
    store = _get_store()
    rows = _read_csv(csv_file)
    records = _normalize_accounts(rows)
    added, skipped, conflicts = store.import_accounts(records)
    _print_import_result(added, skipped, conflicts)


@main.command("import-recharges")
@click.argument("csv_file")
def import_recharges(csv_file: str):
    """从 CSV 导入充值流水"""
    store = _get_store()
    rows = _read_csv(csv_file)
    records = _normalize_recharges(rows)
    added, skipped, conflicts = store.import_recharges(records)
    _print_import_result(added, skipped, conflicts)


@main.command("import-consumptions")
@click.argument("csv_file")
def import_consumptions(csv_file: str):
    """从 CSV 导入消耗记录"""
    store = _get_store()
    rows = _read_csv(csv_file)
    records = _normalize_consumptions(rows)
    added, skipped, conflicts = store.import_consumptions(records)
    _print_import_result(added, skipped, conflicts)


@main.command("import-rebates")
@click.argument("csv_file")
def import_rebates(csv_file: str):
    """从 CSV 导入返点记录"""
    store = _get_store()
    rows = _read_csv(csv_file)
    records = _normalize_rebates(rows)
    added, skipped, conflicts = store.import_rebates(records)
    _print_import_result(added, skipped, conflicts)


@main.command("import-refunds")
@click.argument("csv_file")
def import_refunds(csv_file: str):
    """从 CSV 导入退款记录"""
    store = _get_store()
    rows = _read_csv(csv_file)
    records = _normalize_refunds(rows)
    added, skipped, conflicts = store.import_refunds(records)
    _print_import_result(added, skipped, conflicts)


@main.command()
@click.option("--as-of", default=None, help="截止日期 (YYYY-MM-DD)，默认今天")
def reconcile(as_of: str | None):
    """执行对账：消耗匹配 + 余额计算"""
    store = _get_store()
    as_of_date = date.fromisoformat(as_of) if as_of else None
    engine = Engine(store)
    result = engine.reconcile(as_of_date)

    click.echo(f"匹配消耗: {len(result.matched)}")
    click.echo(f"未匹配消耗: {len(result.unmatched_consumptions)}")
    click.echo(f"结算延迟: {len(result.delayed_consumptions)}")
    click.echo(f"悬空返点: {len(result.orphan_rebates)}")
    click.echo(f"悬空退款: {len(result.orphan_refunds)}")
    click.echo(f"警告: {len(result.warnings)}")

    if result.warnings:
        click.echo("")
        click.echo("⚠ 警告:")
        for w in result.warnings:
            click.echo(f"  - {w}")


@main.command()
def balance():
    """查看余额报告"""
    store = _get_store()
    engine = Engine(store)
    result = engine.reconcile()

    consumptions = store.load_consumptions()
    rebates = store.load_rebates()
    refunds = store.load_refunds()

    report = generate_balance_report(result, consumptions, rebates, refunds)
    click.echo(report)


@main.command()
@click.option("--output", "-o", default="ledger_export.csv", help="导出文件路径")
def export(output: str):
    """导出对账 CSV"""
    store = _get_store()
    engine = Engine(store)
    result = engine.reconcile()

    consumptions = store.load_consumptions()
    rebates = store.load_rebates()
    refunds = store.load_refunds()

    csv_content = generate_export_csv(result, consumptions, rebates, refunds)
    Path(output).write_text(csv_content, encoding="utf-8-sig")
    click.echo(f"已导出 → {output}")


@main.command()
def conflicts():
    """查看未解决的冲突"""
    store = _get_store()
    conflict_list = store.load_conflicts()

    if not conflict_list:
        click.echo("没有未解决的冲突")
        return

    click.echo(f"共 {len(conflict_list)} 条冲突:")
    click.echo("")
    for i, c in enumerate(conflict_list, 1):
        click.echo(f"  [{i}] 类型: {c['record_type']}  ID: {c['record_id']}")
        click.echo(f"      已有: {c['existing']}")
        click.echo(f"      新入: {c['incoming']}")
        click.echo(f"      时间: {c['detected_at']}")
        click.echo("")
