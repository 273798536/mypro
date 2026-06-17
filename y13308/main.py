"""病历问答误判回放 - 主 CLI 入口"""

import click
import sys
import os
from rich.console import Console

console = Console()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from replay.processor import process_data
from replay.cli_output import (
    print_process_summary, print_eval_breakdown, print_outliers,
    print_records_table, print_record_detail, print_field_mapping,
    print_threshold_info
)
from replay.filters import filter_records, get_record_by_id
from replay.exporter import export_csv, export_excel, export_json, export_screenshot_report


@click.group()
@click.version_option(version="1.0.0", prog_name="病历问答误判回放")
def cli():
    """病历问答误判回放工具 - 分析评测数据、定位误判样本"""
    pass


@cli.command()
@click.argument("data_file", type=click.Path(exists=True))
@click.option("--config", "-c", default="config.yaml", help="配置文件路径", show_default=True)
@click.option("--threshold", "-t", type=float, default=None, help="置信度阈值，覆盖配置文件")
@click.option("--limit", "-n", type=int, default=20, help="显示的记录条数", show_default=True)
def run(data_file, config, threshold, limit):
    """运行误判回放分析"""
    try:
        console.print(f"[bold cyan]🚀 开始处理数据文件:[/bold cyan] {data_file}")

        records, stats, extra_info = process_data(data_file, config, threshold)

        print_threshold_info(extra_info["threshold"])
        print_field_mapping(extra_info["column_mapping"], extra_info["warnings"])
        print_process_summary(stats)
        print_eval_breakdown(stats)
        print_outliers(stats)

        if stats.total > 0:
            console.print(f"\n[bold]显示前 {min(limit, len(records))} 条记录:[/bold]")
            print_records_table(records, limit=limit)

        console.print(f"\n[green]✅ 分析完成！使用 'replay list' 查看筛选结果，'replay export' 导出报告[/green]")

        return records, stats, extra_info

    except Exception as e:
        console.print(f"[red]❌ 处理失败: {e}[/red]")
        raise


@cli.command()
@click.argument("data_file", type=click.Path(exists=True))
@click.option("--config", "-c", default="config.yaml", help="配置文件路径")
@click.option("--threshold", "-t", type=float, default=None, help="置信度阈值")
@click.option("--status", help="按处理状态筛选: 已处理/已跳过/坏行")
@click.option("--eval-result", help="按评测结论筛选: 正确/误判/不确定")
@click.option("--source", help="按来源关键词筛选")
@click.option("--only-duplicates", is_flag=True, help="只显示重复评测样本")
@click.option("--only-outliers", is_flag=True, help="只显示拉偏结论样本")
@click.option("--only-wrong", is_flag=True, help="只显示误判样本")
@click.option("--limit", "-n", type=int, default=50, help="显示条数")
def list(data_file, config, threshold, status, eval_result, source,
         only_duplicates, only_outliers, only_wrong, limit):
    """筛选并列出记录"""
    records, stats, extra_info = process_data(data_file, config, threshold)

    filtered = filter_records(
        records,
        status=status,
        eval_result=eval_result,
        source=source,
        only_duplicates=only_duplicates,
        only_outliers=only_outliers,
        only_wrong=only_wrong
    )

    console.print(f"[bold]筛选结果:[/bold] 共 {len(filtered)} 条 (原始 {len(records)} 条)")
    print_process_summary(stats)
    print_records_table(filtered, limit=limit)


@cli.command()
@click.argument("data_file", type=click.Path(exists=True))
@click.argument("record_id")
@click.option("--config", "-c", default="config.yaml", help="配置文件路径")
@click.option("--threshold", "-t", type=float, default=None, help="置信度阈值")
def detail(data_file, record_id, config, threshold):
    """查看单条记录详情"""
    records, _, _ = process_data(data_file, config, threshold)
    rec = get_record_by_id(records, record_id)

    if rec:
        print_record_detail(rec)
    else:
        console.print(f"[red]❌ 未找到记录 ID: {record_id}[/red]")


@cli.command()
@click.argument("data_file", type=click.Path(exists=True))
@click.option("--config", "-c", default="config.yaml", help="配置文件路径")
@click.option("--threshold", "-t", type=float, default=None, help="置信度阈值")
@click.option("--format", "-f", "fmt", type=click.Choice(["csv", "excel", "json", "report"]),
              default="excel", help="导出格式", show_default=True)
@click.option("--output-dir", "-o", default="exports", help="输出目录", show_default=True)
def export(data_file, config, threshold, fmt, output_dir):
    """
    导出分析结果
    - csv: CSV 明细表
    - excel: Excel (汇总+明细)
    - json: 完整数据 JSON (可用于重跑)
    - report: 截图说明 Markdown 报告
    """
    records, stats, extra_info = process_data(data_file, config, threshold)
    th = extra_info["threshold"]

    if fmt == "csv":
        path = export_csv(records, stats, output_dir)
    elif fmt == "excel":
        path = export_excel(records, stats, output_dir)
    elif fmt == "json":
        path = export_json(records, stats, extra_info, output_dir)
    else:
        path = export_screenshot_report(records, stats, threshold=th, export_dir=output_dir)

    console.print(f"[green]✅ 导出成功:[/green] {path}")
    print_process_summary(stats)


if __name__ == "__main__":
    cli()
