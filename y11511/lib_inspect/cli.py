import os
from pathlib import Path
from datetime import datetime

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree

from .store import DataStore
from .models import RecordStatus, RecordSource
from . import importer
from . import checker
from . import fixer
from . import reporter
from . import logger

console = Console()
WORKSPACE_DIR = Path.cwd() / ".lib-inspect"
DB_PATH = WORKSPACE_DIR / "data.db"


def get_store() -> DataStore:
    if not DB_PATH.exists():
        console.print("[red]错误: 工作区未初始化，请先运行 init 命令[/red]")
        raise click.Abort()
    return DataStore(DB_PATH)


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """图书馆馆际借阅多源导入巡检 CLI 工具"""
    pass


@cli.command()
@click.option("--force", is_flag=True, help="强制重新初始化（会删除现有数据）")
def init(force):
    """初始化工作区"""
    if WORKSPACE_DIR.exists():
        if force:
            import shutil
            shutil.rmtree(WORKSPACE_DIR)
            console.print("[yellow]已删除旧工作区[/yellow]")
        else:
            console.print("[green]工作区已存在[/green]")
            return

    WORKSPACE_DIR.mkdir(parents=True)
    (WORKSPACE_DIR / "imports").mkdir()
    (WORKSPACE_DIR / "exports").mkdir()
    (WORKSPACE_DIR / "logs").mkdir()

    DataStore(DB_PATH)
    logger.log_init(force)
    console.print(Panel.fit(
        "[green]工作区初始化成功[/green]\n"
        f"位置: {WORKSPACE_DIR}\n"
        "子目录: imports/, exports/, logs/",
        title="初始化完成"
    ))


@cli.command("import")
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--source", required=True,
              type=click.Choice(['借阅申请', '快递单', '读者赔偿记录', '客服备注']),
              help="数据来源类型")
@click.option("--operator", required=True, help="操作人姓名")
@click.option("--sheet-name", default=0, help="Excel 工作表名称或索引")
def import_cmd(file_path, source, operator, sheet_name):
    """导入数据文件"""
    store = get_store()
    source_enum = RecordSource(source)
    file_name = Path(file_path).name

    console.print(f"[cyan]正在导入 {file_name}...[/cyan]")
    try:
        records = importer.import_file(
            Path(file_path), source_enum, operator, sheet_name
        )
        for record in records:
            store.add_record(record)

        logger.log_import(file_name, source, len(records), operator)
        console.print(Panel.fit(
            f"[green]成功导入 {len(records)} 条记录[/green]\n"
            f"来源: {source}\n"
            f"操作人: {operator}",
            title="导入完成"
        ))
    except Exception as e:
        logger.log_import_error(file_name, source, str(e), operator)
        console.print(f"[red]导入失败: {str(e)}[/red]")
        raise click.Abort()


@cli.command("check")
@click.option("--record-id", help="只检查指定记录 ID")
@click.option("--fix-auto", is_flag=True, help="自动修复可修复的问题")
@click.option("--operator", default="system", help="操作人姓名")
def check_cmd(record_id, fix_auto, operator):
    """校验数据完整性和一致性"""
    store = get_store()

    if record_id:
        records = [store.get_record(record_id)]
        if not records[0]:
            console.print("[red]未找到指定记录[/red]")
            raise click.Abort()
    else:
        records = store.get_all_records()

    console.print(f"[cyan]正在校验 {len(records)} 条记录...[/cyan]")

    results = checker.check_records(store, records, fix_auto)

    table = Table(title="校验结果")
    table.add_column("记录ID", style="cyan")
    table.add_column("书名", style="green")
    table.add_column("检查项")
    table.add_column("状态", style="bold")
    table.add_column("信息")

    passed = 0
    failed = 0

    for result in results:
        status_style = "green" if result["passed"] else "red"
        status = "✓ 通过" if result["passed"] else "✗ 失败"
        table.add_row(
            result["record_id"][:8] + "...",
            result.get("book_title", "")[:20],
            result["check_name"],
            f"[{status_style}]{status}[/{status_style}]",
            result["message"][:40]
        )
        if result["passed"]:
            passed += 1
        else:
            failed += 1

    logger.log_check(len(records), passed, failed, fix_auto, operator)
    console.print(table)
    console.print(f"\n总计: {len(results)} 项检查, [green]{passed} 通过[/green], [red]{failed} 失败[/red]")


@cli.command()
@click.argument("record_id")
@click.option("--field", required=True, help="要修改的字段名")
@click.option("--value", required=True, help="新值")
@click.option("--operator", required=True, help="操作人姓名")
@click.option("--reason", required=True, help="修改原因")
def fix(record_id, field, value, operator, reason):
    """修正单条记录"""
    store = get_store()
    record = store.get_record(record_id)

    if not record:
        console.print("[red]未找到指定记录[/red]")
        raise click.Abort()

    old_value = str(getattr(record, field, ''))
    try:
        updated_record = fixer.update_field(record, field, value)
        store.update_record(updated_record, operator, reason)
        logger.log_fix(record_id, field, old_value, value, operator, reason)
        console.print(Panel.fit(
            f"[green]记录已更新[/green]\n"
            f"记录ID: {record_id}\n"
            f"字段: {field}\n"
            f"旧值: {old_value}\n"
            f"新值: {value}\n"
            f"操作人: {operator}\n"
            f"原因: {reason}",
            title="修正完成"
        ))
    except Exception as e:
        logger.log_fix_error(record_id, str(e), operator)
        console.print(f"[red]修正失败: {str(e)}[/red]")
        raise click.Abort()


@cli.command()
@click.argument("primary_id")
@click.option("--merge-ids", multiple=True, help="要合并的其他记录ID（可多次指定）")
@click.option("--operator", required=True, help="操作人姓名")
@click.option("--auto", is_flag=True, help="自动查找并合并所有相关多源记录")
def merge(primary_id, merge_ids, operator, auto):
    """合并多源记录为同一事实源"""
    store = get_store()
    primary = store.get_record(primary_id)

    if not primary:
        console.print("[red]未找到主记录[/red]")
        raise click.Abort()

    try:
        ids_to_merge = list(merge_ids)
        if auto:
            all_records = store.get_all_records()
            for other in all_records:
                if other.id == primary.id:
                    continue
                if (other.borrower_id == primary.borrower_id and
                    other.book_title == primary.book_title and
                    other.library_from == primary.library_from and
                    other.library_to == primary.library_to):
                    ids_to_merge.append(other.id)

        if not ids_to_merge:
            console.print("[yellow]没有找到可合并的记录[/yellow]")
            return

        records_to_merge = []
        for rid in ids_to_merge:
            record = store.get_record(rid)
            if record:
                records_to_merge.append(record)

        if not records_to_merge:
            console.print("[yellow]指定的记录ID都不存在[/yellow]")
            return

        console.print(f"[cyan]正在合并 {len(records_to_merge)} 条记录到主记录...[/cyan]")
        
        merged_record = fixer.merge_records(primary, records_to_merge)
        merged_record.status = RecordStatus.MERGED
        
        merged_record.issues = [i for i in merged_record.issues if '多源补传' not in i]

        store.update_record(merged_record, operator, "多源记录合并")

        for rid in ids_to_merge:
            store.delete_record(rid)

        logger.log_merge(primary_id, ids_to_merge, operator)
        console.print(Panel.fit(
            f"[green]合并成功[/green]\n"
            f"主记录ID: {primary_id[:8]}...\n"
            f"合并记录数: {len(records_to_merge)}\n"
            f"合并后状态: 已合并\n"
            f"操作人: {operator}",
            title="合并完成"
        ))
    except Exception as e:
        logger.log_merge_error(str(e), operator)
        console.print(f"[red]合并失败: {str(e)}[/red]")
        raise click.Abort()


@cli.command()
@click.option("--operator", required=True, help="操作人姓名")
@click.option("--reason", default="费用重新汇总", help="重算原因")
@click.option("--overdue-rate", default=0.5, type=float, help="逾期日费率（元/天）")
@click.option("--base-loan-period", default=30, type=int, help="基础借阅周期（天）")
def recalc(operator, reason, overdue_rate, base_loan_period):
    """重新计算所有费用汇总（处理逾期、污损、续借叠加）"""
    store = get_store()
    records = store.get_all_records()

    console.print(f"[cyan]正在重新计算 {len(records)} 条记录的费用...[/cyan]")
    console.print(f"[dim]逾期费率: ¥{overdue_rate}/天, 基础周期: {base_loan_period}天[/dim]")

    updated_count = 0
    for record in records:
        old_record = record.to_dict()
        updated_record = fixer.recalculate_fees(
            record,
            overdue_rate=overdue_rate,
            base_loan_period=base_loan_period
        )

        changed = False
        for key in ['express_fee', 'compensation_fee', 'overdue_fee', 'damage_fee', 'total_fee', 'is_overdue', 'is_damaged']:
            if old_record.get(key) != updated_record.to_dict().get(key):
                changed = True
                break

        if changed:
            store.update_record(updated_record, operator, reason)
            updated_count += 1

    logger.log_recalc(len(records), updated_count, operator, reason)
    console.print(Panel.fit(
        f"[green]重新计算完成[/green]\n"
        f"处理记录数: {len(records)}\n"
        f"更新记录数: {updated_count}\n"
        f"逾期费率: ¥{overdue_rate}/天\n"
        f"操作人: {operator}\n"
        f"原因: {reason}",
        title="费用重算"
    ))


@cli.command()
@click.option("--show-failed", is_flag=True, help="只显示失败记录")
@click.option("--show-duplicates", is_flag=True, help="显示重复记录")
@click.option("--operator", default="system", help="操作人姓名")
def report(show_failed, show_duplicates, operator):
    """生成数据报表"""
    store = get_store()
    logger.log_view("报表", operator=operator)
    summary = store.get_summary()

    summary_panel = Panel.fit(
        f"总记录数: [bold]{summary.total_records}[/bold]\n"
        f"有效记录: [green]{summary.valid_records}[/green]\n"
        f"无效记录: [red]{summary.invalid_records}[/red]\n\n"
        f"快递费总计: ¥{summary.total_express_fee:.2f}\n"
        f"赔偿费总计: ¥{summary.total_compensation_fee:.2f}\n"
        f"逾期费总计: ¥{summary.total_overdue_fee:.2f}\n"
        f"污损费总计: ¥{summary.total_damage_fee:.2f}\n"
        f"[bold]总费用: ¥{summary.total_fee:.2f}[/bold]",
        title="汇总统计"
    )
    console.print(summary_panel)

    source_table = Table(title="按来源统计")
    source_table.add_column("来源")
    source_table.add_column("数量", justify="right")
    for source, count in summary.by_source.items():
        source_table.add_row(source, str(count))
    console.print(source_table)

    if summary.issue_counts:
        issue_table = Table(title="问题类型统计")
        issue_table.add_column("问题类型")
        issue_table.add_column("数量", justify="right")
        for issue, count in summary.issue_counts.items():
            issue_table.add_row(issue, str(count))
        console.print(issue_table)

    if show_failed:
        failed_records = store.get_all_records(status=RecordStatus.CHECK_FAILED)
        if failed_records:
            reporter.print_failed_records(failed_records, console)

    if show_duplicates:
        duplicates = store.find_duplicates()
        if duplicates:
            reporter.print_duplicates(duplicates, console)


@cli.command()
@click.option("--record-id", help="查询指定记录的历史")
@click.option("--limit", default=50, help="显示条数限制")
@click.option("--operator", default="system", help="操作人姓名")
def history(record_id, limit, operator):
    """查看变更历史"""
    store = get_store()
    logger.log_view("变更历史", record_id, operator=operator)
    changes = store.get_change_history(record_id)[:limit]

    if not changes:
        console.print("[yellow]未找到变更历史[/yellow]")
        return

    table = Table(title="变更历史")
    table.add_column("时间", style="cyan")
    table.add_column("记录ID", style="blue")
    table.add_column("字段")
    table.add_column("旧值")
    table.add_column("新值")
    table.add_column("操作人", style="green")
    table.add_column("原因")

    for change in changes:
        table.add_row(
            change['timestamp'][:19],
            change['record_id'][:8] + "...",
            change['field_name'],
            str(change['old_value'])[:20],
            str(change['new_value'])[:20],
            change['operator'],
            change['reason'][:20]
        )

    console.print(table)


@cli.command()
@click.argument("record_id")
@click.option("--operator", default="system", help="操作人姓名")
def detail(record_id, operator):
    """查看记录详情"""
    store = get_store()
    logger.log_view("详情", record_id, operator=operator)
    record = store.get_record(record_id)

    if not record:
        console.print("[red]未找到指定记录[/red]")
        raise click.Abort()

    tree = Tree(f"[bold blue]记录详情[/bold blue] (ID: {record_id})")

    basic = tree.add("[bold]基本信息[/bold]")
    basic.add(f"来源: {record.source.value}")
    basic.add(f"原始文件: {record.original_file}")
    basic.add(f"原始行号: {record.original_row}")
    basic.add(f"书名: {record.book_title}")
    basic.add(f"借阅人: {record.borrower_name} ({record.borrower_id})")
    basic.add(f"借出馆: {record.library_from}")
    basic.add(f"借入馆: {record.library_to}")

    dates = tree.add("[bold]日期信息[/bold]")
    dates.add(f"申请日期: {record.apply_date or '-'}")
    dates.add(f"收到日期: {record.receive_date or '-'}")
    dates.add(f"应还日期: {record.due_date or '-'}")
    dates.add(f"归还日期: {record.return_date or '-'}")

    fees = tree.add("[bold]费用信息[/bold]")
    fees.add(f"快递费: ¥{record.express_fee:.2f}")
    fees.add(f"赔偿费: ¥{record.compensation_fee:.2f}")
    fees.add(f"逾期费: ¥{record.overdue_fee:.2f}")
    fees.add(f"污损费: ¥{record.damage_fee:.2f}")
    fees.add(f"[bold]总费用: ¥{record.total_fee:.2f}[/bold]")

    status = tree.add("[bold]状态信息[/bold]")
    status.add(f"当前状态: [cyan]{record.status.value}[/cyan]")
    status.add(f"是否逾期: {'是' if record.is_overdue else '否'}")
    status.add(f"是否污损: {'是' if record.is_damaged else '否'}")
    status.add(f"续借次数: {record.renew_count}")

    if record.issues:
        issues = tree.add("[bold red]存在问题[/bold red]")
        for issue in record.issues:
            issues.add(f"[red]• {issue}[/red]")

    if record.customer_notes:
        notes = tree.add("[bold]客服备注[/bold]")
        notes.add(record.customer_notes)

    console.print(tree)


@cli.command()
@click.option("--format", "fmt", default="xlsx",
              type=click.Choice(['xlsx', 'csv']),
              help="导出格式")
@click.option("--output", help="输出文件名")
@click.option("--include-failed", is_flag=True, help="包含失败记录")
@click.option("--operator", default="system", help="操作人姓名")
def export(fmt, output, include_failed, operator):
    """导出数据"""
    store = get_store()

    if not output:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output = WORKSPACE_DIR / "exports" / f"export_{timestamp}.{fmt}"
    else:
        output = Path(output)

    try:
        record_count = reporter.export_data(store, output, fmt, include_failed)
        logger.log_export(str(output.resolve()), record_count, fmt, include_failed, operator)
        console.print(Panel.fit(
            f"[green]导出成功[/green]\n"
            f"文件: {output.resolve()}\n"
            f"记录数: {record_count}",
            title="导出完成"
        ))
    except Exception as e:
        logger.log_export_error(str(output), str(e), operator)
        console.print(f"[red]导出失败: {str(e)}[/red]")
        raise click.Abort()


@cli.command()
@click.option("--status", help="按状态筛选")
@click.option("--source", help="按来源筛选")
@click.option("--operator", default="system", help="操作人姓名")
def list(status, source, operator):
    """列出所有记录"""
    store = get_store()
    logger.log_view("列表", operator=operator)

    status_enum = RecordStatus(status) if status else None
    source_enum = RecordSource(source) if source else None

    records = store.get_all_records(status=status_enum, source=source_enum)

    if not records:
        console.print("[yellow]未找到记录[/yellow]")
        return

    table = Table(title=f"记录列表 ({len(records)} 条)")
    table.add_column("记录ID", style="cyan")
    table.add_column("原始行号", justify="right")
    table.add_column("书名", style="green")
    table.add_column("借阅人")
    table.add_column("来源")
    table.add_column("状态", style="bold")
    table.add_column("总费用", justify="right")

    for record in records:
        table.add_row(
            record.id[:8] + "...",
            str(record.original_row),
            record.book_title[:15],
            record.borrower_name,
            record.source.value,
            record.status.value,
            f"¥{record.total_fee:.2f}"
        )

    console.print(table)


if __name__ == "__main__":
    cli()
