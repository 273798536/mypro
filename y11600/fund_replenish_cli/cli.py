import click
import sys
from pathlib import Path
from datetime import date
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .core import (
    DataLoader,
    IdempotentManager,
    HolidayManager,
    ReplenishProcessor,
    ReconciliationExporter,
)
from .models import ReplenishStatus

console = Console()


@click.group()
@click.version_option(version="1.0.0", prog_name="fund-replenish")
def main():
    """基金定投断点补扣 CLI 工具"""
    pass


@main.command()
@click.option("--input-dir", "-i", required=True, type=click.Path(exists=True, file_okay=False), help="输入数据目录")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出结果目录")
@click.option("--run-date", "-d", default=None, help="运行日期 (YYYY-MM-DD)，默认为今天")
@click.option("--holiday-file", "-h", default=None, type=click.Path(exists=True, dir_okay=False), help="节假日配置文件")
@click.option("--force", is_flag=True, help="强制重新处理所有记录，忽略幂等状态")
def process(input_dir, output_dir, run_date, holiday_file, force):
    """处理银行回盘并生成补扣名单和对账报告"""
    console.print(Panel.fit(
        Text("基金定投断点补扣处理", style="bold blue"),
        border_style="blue"
    ))

    try:
        run_date_val = date.fromisoformat(run_date) if run_date else date.today()
    except ValueError:
        console.print(f"[red]错误: 日期格式不正确，请使用 YYYY-MM-DD 格式[/red]")
        sys.exit(1)

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    console.print(f"\n[cyan]输入目录:[/cyan] {input_dir}")
    console.print(f"[cyan]输出目录:[/cyan] {output_dir}")
    console.print(f"[cyan]运行日期:[/cyan] {run_date_val}")
    if holiday_file:
        console.print(f"[cyan]节假日文件:[/cyan] {holiday_file}")

    with console.status("[green]加载数据中...[/green]"):
        try:
            loader = DataLoader(input_dir)
            data = loader.load_all()
        except Exception as e:
            console.print(f"[red]加载数据失败: {e}[/red]")
            sys.exit(1)

    console.print(f"  ✓ 加载银行回盘: {len(data['bank_returns'])} 条")
    console.print(f"  ✓ 加载客户计划: {len(data['customer_plans'])} 条")
    console.print(f"  ✓ 加载失败原因: {len(data['failure_reasons'])} 条")
    console.print(f"  ✓ 加载补扣窗口: {len(data['replenish_windows'])} 条")
    console.print(f"  ✓ 加载人工备注: {len(data['manual_remarks'])} 条")

    with console.status("[green]初始化处理器...[/green]"):
        idempotent_mgr = IdempotentManager(output_dir)
        holiday_mgr = HolidayManager(holiday_file)
        processor = ReplenishProcessor(idempotent_mgr, holiday_mgr)
        exporter = ReconciliationExporter(output_dir)

    with console.status("[green]构建补扣记录...[/green]"):
        all_records = processor.build_records(
            data["bank_returns"],
            data["customer_plans"],
            data["failure_reasons"],
            data["replenish_windows"],
            data["manual_remarks"],
        )

        if not force:
            filtered_records = []
            skipped = 0
            for record in all_records:
                record_key = idempotent_mgr.generate_record_key(record.bank_return)
                if idempotent_mgr.is_processed(record_key):
                    skipped += 1
                else:
                    filtered_records.append(record)
            records = filtered_records
            if skipped > 0:
                console.print(f"  ℹ 跳过已处理的记录: {skipped} 条 (使用 --force 可强制重新处理)")
        else:
            records = all_records
            console.print(f"  ℹ 已启用 --force，强制处理所有记录")

    console.print(f"  ✓ 构建补扣记录: {len(records)} 条")

    if len(records) == 0:
        console.print("\n[yellow]所有记录均已处理，无新记录需要处理。使用 --force 可强制重新处理。[/yellow]")
        return

    with console.status("[green]处理补扣逻辑...[/green]"):
        records, summary = processor.process_all(run_date_val)

    with console.status("[green]更新幂等状态...[/green]"):
        for record in records:
            record_key = idempotent_mgr.generate_record_key(record.bank_return)
            idempotent_mgr.mark_processed(record_key, "processed")

    table = Table(title="处理结果汇总", show_header=True, header_style="bold magenta")
    table.add_column("状态", style="cyan")
    table.add_column("数量", justify="right")
    table.add_column("金额(元)", justify="right")

    table.add_row("总记录数", str(summary.total_records), f"{summary.total_amount:,.2f}")
    table.add_row("可补扣", str(len([r for r in records if r.status == ReplenishStatus.ELIGIBLE])), "-")
    table.add_row("待人工复核", str(summary.review_required_count), "-", style="yellow")
    table.add_row("客户暂停", str(summary.paused_count), "-", style="blue")
    table.add_row("节假日顺延", str(summary.deferred_count), "-", style="cyan")
    table.add_row("重复扣款风险", str(summary.duplicate_risk_count), "-", style="red")
    table.add_row("已作废", str(summary.cancelled_count), "-", style="dim")

    console.print()
    console.print(table)

    if processor.warnings:
        console.print(f"\n[yellow]⚠ 告警信息 ({len(processor.warnings)} 条):[/yellow]")
        for w in processor.warnings[:10]:
            console.print(f"  {w}")
        if len(processor.warnings) > 10:
            console.print(f"  ... 还有 {len(processor.warnings) - 10} 条告警，详见输出文件")

    with console.status("[green]导出结果...[/green]"):
        result_files = exporter.export_all(records, summary, processor.warnings)

    console.print("\n[green]✓ 处理完成![/green]")
    console.print("\n[cyan]输出文件:[/cyan]")
    for name, path in result_files.items():
        console.print(f"  • {name}: {path}")

    eligible_count = len([r for r in records if r.status == ReplenishStatus.ELIGIBLE])
    if eligible_count > 0:
        console.print(f"\n[yellow]提示: 有 {eligible_count} 条记录状态为'可补扣'，导出文件中已包含补扣日期安排[/yellow]")


@main.command()
@click.option("--input-dir", "-i", required=True, type=click.Path(exists=True, file_okay=False), help="输入数据目录")
@click.option("--output-dir", "-o", required=True, type=click.Path(file_okay=False), help="输出结果目录")
def list_records(input_dir, output_dir):
    """查看当前待处理记录列表"""
    loader = DataLoader(input_dir)
    data = loader.load_all()

    idempotent_mgr = IdempotentManager(output_dir)
    processor = ReplenishProcessor(idempotent_mgr)
    records = processor.build_records(
        data["bank_returns"],
        data["customer_plans"],
        data["failure_reasons"],
        data["replenish_windows"],
        data["manual_remarks"],
    )

    table = Table(title="待处理记录列表", show_header=True, header_style="bold magenta")
    table.add_column("流水号", style="cyan")
    table.add_column("客户", style="green")
    table.add_column("基金")
    table.add_column("金额(元)", justify="right")
    table.add_column("返回信息")
    table.add_column("状态", style="yellow")

    for r in records[:20]:
        status_style = {
            ReplenishStatus.ELIGIBLE: "green",
            ReplenishStatus.REVIEW_REQUIRED: "yellow",
            ReplenishStatus.PAUSED: "blue",
            ReplenishStatus.DUPLICATE_RISK: "red",
            ReplenishStatus.HOLIDAY_DEFERRED: "cyan",
            ReplenishStatus.CANCELLED: "dim",
        }.get(r.status, "white")

        table.add_row(
            r.bank_return.serial_no,
            f"{r.bank_return.customer_name}({r.bank_return.customer_id})",
            r.customer_plan.fund_name,
            f"{r.bank_return.amount:,.2f}",
            r.bank_return.return_msg[:20],
            Text(r.status.value, style=status_style),
        )

    console.print(table)
    if len(records) > 20:
        console.print(f"\n[dim]... 还有 {len(records) - 20} 条记录[/dim]")


@main.command()
@click.option("--output-dir", "-o", required=True, type=click.Path(exists=True, file_okay=False), help="输出结果目录")
def status(output_dir):
    """查看当前处理状态和历史批次"""
    idempotent_mgr = IdempotentManager(output_dir)
    batches = idempotent_mgr.get_all_batches()

    console.print(Panel.fit(
        Text("处理状态", style="bold blue"),
        border_style="blue"
    ))

    console.print(f"\n[cyan]输出目录:[/cyan] {output_dir}")
    console.print(f"[cyan]已处理记录:[/cyan] {len(idempotent_mgr.processed_keys)} 条")
    console.print(f"[cyan]历史批次:[/cyan] {len(batches)} 个")

    if batches:
        console.print("\n[cyan]最近批次:[/cyan]")
        for batch in batches[-5:]:
            batch_name = Path(batch).name
            console.print(f"  • {batch_name}")


@main.command()
@click.option("--input-dir", "-i", required=True, type=click.Path(file_okay=False), help="样例数据输出目录")
def generate_sample(input_dir):
    """生成样例数据用于测试"""
    from .sample_data import generate_all_samples

    Path(input_dir).mkdir(parents=True, exist_ok=True)
    generate_all_samples(input_dir)
    console.print(f"[green]✓ 样例数据已生成到: {input_dir}[/green]")
    console.print("\n包含文件:")
    console.print("  • bank_returns.csv - 银行回盘数据")
    console.print("  • customer_plans.csv - 客户定投计划")
    console.print("  • failure_reasons.csv - 失败原因配置")
    console.print("  • replenish_windows.csv - 补扣窗口配置")
    console.print("  • manual_remarks.csv - 人工备注")
    console.print("\n样例包含:")
    console.print("  ✓ 1条正常记录(王五-可直接补扣)")
    console.print("  ✓ 1条边界记录(李四-客户暂停)")
    console.print("  ✓ 1条坏数据(张三-重复扣款风险)")
    console.print("  共4条回盘记录，覆盖完整处理链")


if __name__ == "__main__":
    main()
