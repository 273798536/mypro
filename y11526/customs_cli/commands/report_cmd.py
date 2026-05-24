import click
import json
from rich.table import Table
from rich.panel import Panel
from datetime import datetime
from ..database import get_session, Package, TaxRecord, ExceptionRecord, DataSource


@click.command()
@click.option("--batch", "-b", "batch_id", help="指定批次号，不指定则全部")
@click.option("--format", "-f", "output_format", default="text",
              type=click.Choice(["text", "json", "summary"]),
              help="输出格式")
@click.option("--output", "-o", type=click.Path(), help="输出到文件")
@click.pass_context
def report(ctx, batch_id, output_format, output):
    """生成报告（客户经理重点关注）"""
    console = ctx.obj["console"]
    session = get_session()

    try:
        batch_filter = True if not batch_id else Package.batch_id == batch_id

        total_packages = session.query(Package).filter(batch_filter).count()
        total_tax_records = session.query(TaxRecord).filter(batch_filter).count()
        matched_tax = session.query(TaxRecord).filter(
            batch_filter, TaxRecord.is_matched == True
        ).count()

        exceptions = session.query(ExceptionRecord).filter(
            (True if not batch_id else ExceptionRecord.batch_id == batch_id),
            ExceptionRecord.is_resolved == False
        ).all()

        summary_data = {
            "report_time": datetime.utcnow().isoformat(),
            "batch_id": batch_id,
            "total_packages": total_packages,
            "total_tax_records": total_tax_records,
            "matched_tax": matched_tax,
            "unmatched_tax": total_tax_records - matched_tax,
            "total_exceptions": len(exceptions),
            "exceptions_by_type": {},
        }

        for e in exceptions:
            etype = e.exception_type.value
            summary_data["exceptions_by_type"][etype] = summary_data["exceptions_by_type"].get(etype, 0) + 1

        if output_format == "json":
            report_json = json.dumps(summary_data, indent=2, ensure_ascii=False)
            if output:
                with open(output, "w", encoding="utf-8") as f:
                    f.write(report_json)
                console.print(f"[green]报告已保存到: {output}[/green]")
            else:
                console.print(report_json)
            return

        if output_format == "summary":
            table = Table(title="数据汇总报告")
            table.add_column("指标", style="cyan")
            table.add_column("数值", style="green", justify="right")
            table.add_row("包裹总数", str(total_packages))
            table.add_row("税费记录总数", str(total_tax_records))
            table.add_row("已匹配税费", f"[green]{matched_tax}[/green]")
            table.add_row("未匹配税费", f"[red]{total_tax_records - matched_tax}[/red]")
            table.add_row("待处理异常", f"[yellow]{len(exceptions)}[/yellow]")
            console.print(table)
            return

        console.print(Panel.fit(
            f"[cyan]报告时间[/cyan]: {summary_data['report_time']}\n"
            f"[cyan]批次[/cyan]: {batch_id or '全部'}\n"
            f"[cyan]包裹总数[/cyan]: {total_packages}\n"
            f"[cyan]税费匹配[/cyan]: {matched_tax}/{total_tax_records}",
            title="清关巡检报告"
        ))

        if exceptions:
            exc_table = Table(title="异常清单 - 客户经理重点关注", show_lines=True)
            exc_table.add_column("ID", style="cyan")
            exc_table.add_column("类型", style="blue")
            exc_table.add_column("运单号", style="yellow")
            exc_table.add_column("原始行号", justify="right")
            exc_table.add_column("严重程度", style="magenta")
            exc_table.add_column("说明", style="white")

            for e in exceptions:
                exc_table.add_row(
                    str(e.id),
                    e.exception_type.value,
                    e.tracking_number or "-",
                    str(e.original_row) if e.original_row else "-",
                    e.severity,
                    e.message
                )

            console.print(exc_table)

        failed_sources = session.query(DataSource).filter(
            (True if not batch_id else DataSource.batch_id == batch_id),
            DataSource.failed_rows > 0
        ).all()

        if failed_sources:
            failed_table = Table(title="导入失败清单")
            failed_table.add_column("批次", style="green")
            failed_table.add_column("数据源", style="blue")
            failed_table.add_column("文件名", style="cyan")
            failed_table.add_column("失败行数", style="red", justify="right")

            for s in failed_sources:
                failed_table.add_row(
                    s.batch_id,
                    s.source_type.value,
                    s.file_name,
                    str(s.failed_rows)
                )
            console.print(failed_table)
            console.print("\n[yellow]提示: 使用 'customs-cli fix edit' 人工修正后重新导入[/yellow]")

    finally:
        session.close()
