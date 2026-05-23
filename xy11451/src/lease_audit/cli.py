import click
from rich.console import Console
from rich.table import Table

from lease_audit.models.database import init_database
from lease_audit.utils.common import get_data_dir, get_db_path, get_current_user
from lease_audit.services.import_service import ImportService
from lease_audit.services.check_service import CheckService
from lease_audit.services.fix_service import FixService
from lease_audit.services.report_service import ReportService
from lease_audit.services.history_service import HistoryService
from lease_audit.services.export_service import ExportService

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def main():
    """设备租赁归还多源导入巡检 CLI 工具"""
    pass


@main.command()
@click.option("--force", is_flag=True, help="强制重新初始化")
def init(force):
    """初始化本地数据库和配置"""
    data_dir = get_data_dir()
    db_path = get_db_path()
    
    console.print(f"[bold blue]初始化设备租赁巡检工具...[/bold blue]")
    console.print(f"数据目录: {data_dir}")
    console.print(f"数据库路径: {db_path}")
    
    try:
        init_database(db_path)
        console.print("[bold green]✓[/bold green] 数据库初始化完成")
        
        from lease_audit.services.init_service import InitService
        init_service = InitService(db_path)
        init_service.init_configs(force=force)
        
        console.print("[bold green]✓[/bold green] 系统配置初始化完成")
        console.print(f"[bold green]✓[/bold green] 当前用户: {get_current_user()}")
        
        console.print("\n[bold green]初始化成功！[/bold green]")
        console.print("使用 'lease-audit --help' 查看可用命令")
    except Exception as e:
        console.print(f"[bold red]初始化失败: {e}[/bold red]")
        raise click.Abort()


@main.command()
@click.argument("source_type", type=click.Choice(["lease", "return", "photo", "repair", "handover"]))
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--sheet", default=0, help="Excel工作表名称或索引")
@click.option("--dry-run", is_flag=True, help="仅预览不实际导入")
@click.option("--skip-duplicate-check", is_flag=True, help="跳过重复检查")
def import_cmd(source_type, file_path, sheet, dry_run, skip_duplicate_check):
    """导入数据 (lease:出库单, return:归还记录, photo:照片清单, repair:维修估价, handover:门店交接纸)"""
    console.print(f"[bold blue]开始导入 {source_type} 数据...[/bold blue]")
    console.print(f"文件: {file_path}")
    
    try:
        service = ImportService(get_db_path())
        result = service.import_file(
            source_type=source_type,
            file_path=file_path,
            sheet_name=sheet,
            dry_run=dry_run,
            skip_duplicate_check=skip_duplicate_check
        )
        
        if dry_run:
            console.print("\n[bold yellow]预览模式 - 未实际导入[/bold yellow]")
        
        table = Table(title="导入结果")
        table.add_column("项目", style="cyan")
        table.add_column("数量", style="magenta")
        table.add_row("总记录数", str(result["total"]))
        table.add_row("成功导入", str(result["success"]))
        table.add_row("重复跳过", str(result["duplicates"]))
        table.add_row("失败记录", str(result["failed"]))
        console.print(table)
        
        if result["failed"] > 0:
            console.print(f"\n[bold red]失败记录详情:[/bold red]")
            for failure in result["failures"][:10]:
                console.print(f"  行{failure['row_no']}: {failure['error']}")
            if len(result["failures"]) > 10:
                console.print(f"  ... 还有 {len(result['failures']) - 10} 条失败记录")
        
        console.print(f"\n[bold green]批次号: {result['batch_no']}[/bold green]")
        
    except Exception as e:
        console.print(f"[bold red]导入失败: {e}[/bold red]")
        raise click.Abort()


@main.command()
@click.option("--batch-no", help="指定批次号检查")
@click.option("--source-type", help="指定数据源类型")
@click.option("--check-duplicates", is_flag=True, help="检查重复数据")
@click.option("--check-integrity", is_flag=True, help="检查数据完整性")
@click.option("--check-consistency", is_flag=True, help="检查数据一致性")
@click.option("--all", "check_all", is_flag=True, help="运行所有检查")
def check(batch_no, source_type, check_duplicates, check_integrity, check_consistency, check_all):
    """检查数据质量"""
    if not any([check_duplicates, check_integrity, check_consistency, check_all]):
        check_all = True
    
    console.print("[bold blue]开始数据检查...[/bold blue]")
    
    try:
        service = CheckService(get_db_path())
        
        if check_all or check_duplicates:
            dup_result = service.check_duplicates(batch_no=batch_no, source_type=source_type)
            _print_check_result("重复数据检查", dup_result)
        
        if check_all or check_integrity:
            int_result = service.check_integrity(batch_no=batch_no, source_type=source_type)
            _print_check_result("数据完整性检查", int_result)
        
        if check_all or check_consistency:
            con_result = service.check_consistency(batch_no=batch_no)
            _print_check_result("数据一致性检查", con_result)
        
    except Exception as e:
        console.print(f"[bold red]检查失败: {e}[/bold red]")
        raise click.Abort()


def _print_check_result(title, result):
    console.print(f"\n[bold]{title}[/bold]")
    if result["issues"]:
        for issue in result["issues"][:10]:
            console.print(f"  [red]⚠[/red] {issue}")
        if len(result["issues"]) > 10:
            console.print(f"  ... 还有 {len(result['issues']) - 10} 个问题")
        console.print(f"  [bold red]共发现 {len(result['issues'])} 个问题[/bold red]")
    else:
        console.print(f"  [bold green]✓ 未发现问题[/bold green]")


@main.command()
@click.argument("batch_no")
@click.option("--resolve-all", is_flag=True, help="尝试自动修复所有问题")
@click.option("--row-no", type=int, help="指定行号修复")
@click.option("--reimport-file", type=click.Path(exists=True), help="使用修正后的文件重新导入")
def fix(batch_no, resolve_all, row_no, reimport_file):
    """修复数据问题"""
    console.print(f"[bold blue]开始修复批次 {batch_no}...[/bold blue]")
    
    try:
        service = FixService(get_db_path())
        
        if reimport_file:
            result = service.reimport_batch(batch_no, reimport_file)
            console.print(f"[bold green]✓ 重新导入完成[/bold green]")
            console.print(f"  成功: {result['success']}, 失败: {result['failed']}")
        elif resolve_all:
            result = service.resolve_all_failures(batch_no)
            console.print(f"[bold green]✓ 自动修复完成[/bold green]")
            console.print(f"  已解决: {result['resolved']}, 仍失败: {result['remaining']}")
        elif row_no:
            result = service.resolve_failure(batch_no, row_no)
            console.print(f"[bold green]✓ 行 {row_no} 修复状态: {result['status']}[/bold green]")
        else:
            failures = service.list_failures(batch_no)
            table = Table(title=f"批次 {batch_no} 失败记录")
            table.add_column("行号", style="cyan")
            table.add_column("错误类型", style="yellow")
            table.add_column("错误信息", style="red")
            table.add_column("状态", style="magenta")
            for f in failures:
                table.add_row(
                    str(f["row_no"]),
                    f["error_type"],
                    f["error_message"][:50],
                    "已解决" if f["resolved"] else "未解决"
                )
            console.print(table)
        
    except Exception as e:
        console.print(f"[bold red]修复失败: {e}[/bold red]")
        raise click.Abort()


@main.command()
@click.option("--format", "report_format", type=click.Choice(["summary", "detail", "financial"]), default="summary")
@click.option("--start-date", help="开始日期 (YYYY-MM-DD)")
@click.option("--end-date", help="结束日期 (YYYY-MM-DD)")
@click.option("--customer", help="按客户筛选")
@click.option("--output", type=click.Path(), help="输出文件路径")
def report(report_format, start_date, end_date, customer, output):
    """生成报表"""
    console.print(f"[bold blue]生成{report_format}报表...[/bold blue]")
    
    try:
        service = ReportService(get_db_path())
        
        if report_format == "summary":
            data = service.summary_report(start_date, end_date, customer)
            _print_summary_report(data)
        elif report_format == "detail":
            data = service.detail_report(start_date, end_date, customer)
            _print_detail_report(data)
        elif report_format == "financial":
            data = service.financial_report(start_date, end_date, customer)
            _print_financial_report(data)
        
        if output:
            service.export_report(data, output, report_format)
            console.print(f"[bold green]✓ 报表已导出到: {output}[/bold green]")
        
    except Exception as e:
        console.print(f"[bold red]生成报表失败: {e}[/bold red]")
        raise click.Abort()


def _print_summary_report(data):
    table = Table(title="汇总报表")
    table.add_column("项目", style="cyan")
    table.add_column("数值", style="magenta")
    for key, value in data.items():
        if isinstance(value, (int, float)):
            table.add_row(key, f"{value:,}")
        else:
            table.add_row(key, str(value))
    console.print(table)


def _print_detail_report(data):
    table = Table(title="明细报表")
    for col in data["columns"]:
        table.add_column(col)
    for row in data["rows"][:20]:
        table.add_row(*[str(v) for v in row])
    console.print(table)
    if len(data["rows"]) > 20:
        console.print(f"... 共 {len(data['rows'])} 条记录")


def _print_financial_report(data):
    console.print("\n[bold]财务汇总[/bold]")
    for section, rows in data.items():
        if isinstance(rows, list):
            console.print(f"\n{section}:")
            for row in rows[:10]:
                console.print(f"  {row}")


@main.command()
@click.option("--batch-no", help="按批次号查询")
@click.option("--entity-type", help="按实体类型查询")
@click.option("--entity-id", type=int, help="按实体ID查询")
@click.option("--limit", type=int, default=50, help="显示条数")
@click.option("--all", "show_all", is_flag=True, help="显示所有记录")
def history(batch_no, entity_type, entity_id, limit, show_all):
    """查询操作历史"""
    console.print("[bold blue]查询历史记录...[/bold blue]")
    
    try:
        service = HistoryService(get_db_path())
        records = service.query_history(
            batch_no=batch_no,
            entity_type=entity_type,
            entity_id=entity_id,
            limit=limit if not show_all else None
        )
        
        table = Table(title="操作历史")
        table.add_column("时间", style="cyan")
        table.add_column("操作类型", style="yellow")
        table.add_column("实体", style="magenta")
        table.add_column("操作人", style="green")
        table.add_column("备注", style="white")
        
        for rec in records:
            table.add_row(
                rec["operated_at"],
                rec["operation_type"],
                f"{rec['entity_type']}:{rec['entity_id']}" if rec["entity_id"] else rec["entity_type"],
                rec["operated_by"],
                rec["remark"][:30] if rec["remark"] else ""
            )
        
        console.print(table)
        console.print(f"共 {len(records)} 条记录")
        
    except Exception as e:
        console.print(f"[bold red]查询失败: {e}[/bold red]")
        raise click.Abort()


@main.command()
@click.argument("export_type", type=click.Choice(["all", "leases", "returns", "repairs", "failures"]))
@click.option("--format", "file_format", type=click.Choice(["excel", "csv", "json"]), default="excel")
@click.option("--output", type=click.Path(), help="输出文件路径")
@click.option("--start-date", help="开始日期")
@click.option("--end-date", help="结束日期")
@click.option("--include-failures", is_flag=True, help="包含失败记录")
def export(export_type, file_format, output, start_date, end_date, include_failures):
    """导出数据"""
    console.print(f"[bold blue]导出 {export_type} 数据...[/bold blue]")
    
    try:
        service = ExportService(get_db_path())
        result = service.export_data(
            export_type=export_type,
            file_format=file_format,
            output_path=output,
            start_date=start_date,
            end_date=end_date,
            include_failures=include_failures
        )
        
        console.print(f"[bold green]✓ 导出成功[/bold green]")
        console.print(f"  文件: {result['file_path']}")
        console.print(f"  记录数: {result['record_count']}")
        if include_failures:
            console.print(f"  失败记录: {result['failure_count']}")
        
    except Exception as e:
        console.print(f"[bold red]导出失败: {e}[/bold red]")
        raise click.Abort()


@main.command()
def doctor():
    """系统诊断和自动化检查"""
    console.print("[bold blue]运行系统诊断...[/bold blue]")
    
    try:
        from lease_audit.services.doctor_service import DoctorService
        service = DoctorService(get_db_path())
        results = service.run_all_checks()
        
        all_passed = True
        for check_name, result in results.items():
            status = "[bold green]PASS[/bold green]" if result["passed"] else "[bold red]FAIL[/bold red]"
            if not result["passed"]:
                all_passed = False
            console.print(f"  {status} {check_name}: {result['message']}")
            if result.get("details"):
                for detail in result["details"][:3]:
                    console.print(f"    - {detail}")
        
        if all_passed:
            console.print("\n[bold green]✓ 所有检查通过[/bold green]")
        else:
            console.print("\n[bold yellow]⚠ 部分检查未通过，请查看上述详情[/bold yellow]")
        
    except Exception as e:
        console.print(f"[bold red]诊断失败: {e}[/bold red]")
        raise click.Abort()


if __name__ == "__main__":
    main()
