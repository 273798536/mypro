import os
import sys
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from .data_merge import DataMerger
from .batch import BatchProcessor
from .report import ReportGenerator

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="crowdpay")
def main():
    """众包工资冻结发放处理工具"""
    pass


@main.command()
@click.option(
    "--ticket", "-t", required=True, help="客服工单文件路径 (Excel/CSV)"
)
@click.option(
    "--salary", "-s", required=True, help="计薪流水文件路径 (Excel/CSV)"
)
@click.option(
    "--freeze", "-f", required=True, help="冻结名单文件路径 (Excel/CSV)"
)
@click.option("--output", "-o", default="./output", help="输出目录")
@click.option(
    "--compare", "-c", default=None, help="对比的上一批次ID"
)
@click.option(
    "--format", "fmt", default="all",
    type=click.Choice(["txt", "excel", "all"]),
    help="报告格式",
)
def process(ticket, salary, freeze, output, compare, fmt):
    """处理工资冻结发放"""

    console.print(
        Panel.fit(
            "[bold blue]众包工资冻结发放处理[/bold blue]\n"
            "开始处理数据...",
            border_style="blue",
        )
    )

    if not os.path.exists(output):
        os.makedirs(output)

    with console.status("[bold green]加载数据中..."):
        merger = DataMerger()
        ticket_data = merger.load_ticket_data(ticket)
        salary_data = merger.load_payment_salary(salary)
        freeze_records = merger.load_freeze_tickets(freeze)

        console.print(f"✓ 工单数据：{len(ticket_data)} 条")
        console.print(f"✓ 计薪流水：{len(salary_data)} 条")
        console.print(f"✓ 冻结记录：{len(freeze_records)} 条")

    with console.status("[bold green]合并数据并对比差异..."):
        riders, diffs = merger.compare_and_merge(
            ticket_data, salary_data, freeze_records
        )
        diff_summary = merger.get_diff_summary()

        console.print(f"✓ 合并后骑手：{len(riders)} 人")
        console.print(f"✓ 发现差异：{diff_summary['total_diffs']} 处")

        if diffs:
            table = Table(title="差异概览")
            table.add_column("字段")
            table.add_column("差异数", justify="right")
            for field, count in diff_summary["by_field"].items():
                table.add_row(field, str(count))
            console.print(table)

    with console.status("[bold green]执行批次处理..."):
        processor = BatchProcessor(output_dir=output)
        report = processor.process_batch(riders, diffs, compare)

        console.print(f"✓ 批次号：{report.batch_id}")
        console.print(f"✓ 冻结人数：{report.frozen_count} 人")
        console.print(f"✓ 冻结金额：{report.frozen_amount:.2f} 元")
        console.print(f"✓ 银行卡失败：{len(report.bank_failures)} 人")
        console.print(f"✓ 重复冻结：{len(report.duplicate_freezes)} 条")

    with console.status("[bold green]生成报告..."):
        reporter = ReportGenerator(output_dir=output)

        if fmt in ("txt", "all"):
            txt_path = reporter.generate_human_readable_report(report)
            console.print(f"✓ 文本报告：{txt_path}")

        if fmt in ("excel", "all"):
            excel_path = reporter.generate_excel_report(report, riders)
            console.print(f"✓ Excel报告：{excel_path}")

    console.print(
        Panel.fit(
            "[bold green]处理完成！[/bold green]\n"
            f"批次号：{report.batch_id}\n"
            f"报告目录：{output}/human_reports/",
            border_style="green",
        )
    )


@main.command(name="list")
@click.option("--output", "-o", default="./output", help="输出目录")
def list_batches(output):
    """列出所有处理批次"""
    processor = BatchProcessor(output_dir=output)
    batches = processor.list_batches()

    if not batches:
        console.print("[yellow]暂无批次记录[/yellow]")
        return

    table = Table(title="批次列表")
    table.add_column("序号", justify="right")
    table.add_column("批次号")
    table.add_column("日期")

    for i, batch_id in enumerate(batches, 1):
        parts = batch_id.split("_")
        date_str = (
            f"{parts[1][:4]}-{parts[1][4:6]}-{parts[1][6:8]} "
            f"{parts[2][:2]}:{parts[2][2:4]}:{parts[2][4:6]}"
        )
        table.add_row(str(i), batch_id, date_str)

    console.print(table)


@main.command()
@click.argument("batch_id")
@click.argument("rider_id")
@click.option("--output", "-o", default="./output", help="输出目录")
def trace(batch_id, rider_id, output):
    """查看单个骑手的状态流转记录"""
    processor = BatchProcessor(output_dir=output)
    trace_data = processor.get_rider_trace(batch_id, rider_id)

    if not trace_data:
        console.print(f"[red]未找到骑手 {rider_id} 的追踪记录[/red]")
        return

    console.print(
        Panel.fit(
            f"[bold blue]骑手状态追踪[/bold blue]\n"
            f"姓名：{trace_data['rider_name']}\n"
            f"ID：{trace_data['rider_id']}\n"
            f"当前状态：{trace_data['payment_status']}\n"
            f"最终金额：{trace_data['final_amount']:.2f} 元",
            border_style="blue",
        )
    )

    table = Table(title="状态流转记录")
    table.add_column("步骤", justify="right")
    table.add_column("从状态")
    table.add_column("到状态")
    table.add_column("原因")
    table.add_column("操作人")
    table.add_column("时间")

    for step in trace_data["status_trace"]:
        table.add_row(
            str(step["step"]),
            step["from"],
            step["to"],
            step["reason"],
            step["operator"],
            step["time"].split("T")[1][:8],
        )
    console.print(table)

    if trace_data["freezes"]:
        freeze_table = Table(title="冻结明细")
        freeze_table.add_column("顺序", justify="right")
        freeze_table.add_column("类型")
        freeze_table.add_column("金额", justify="right")
        freeze_table.add_column("状态")
        freeze_table.add_column("原因")

        for f in trace_data["freezes"]:
            freeze_table.add_row(
                str(f["sequence"] + 1),
                f["type"],
                f"{f['amount']:.2f}",
                f["status"],
                f["reason"],
            )
        console.print(freeze_table)


@main.command()
@click.argument("batch_id")
@click.option("--output", "-o", default="./output", help="输出目录")
def show(batch_id, output):
    """查看批次报告摘要"""
    processor = BatchProcessor(output_dir=output)
    report = processor.load_batch_report(batch_id)

    if not report:
        console.print(f"[red]未找到批次 {batch_id} 的报告[/red]")
        return

    console.print(
        Panel.fit(
            f"[bold blue]批次报告摘要[/bold blue]\n"
            f"批次号：{report.batch_id}\n"
            f"生成时间：{report.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
            border_style="blue",
        )
    )

    summary_table = Table(title="汇总数据")
    summary_table.add_column("项目")
    summary_table.add_column("数值", justify="right")
    summary_table.add_row("发放总人数", f"{report.total_riders} 人")
    summary_table.add_row("发放总金额", f"{report.total_amount:.2f} 元")
    summary_table.add_row("冻结人数", f"{report.frozen_count} 人")
    summary_table.add_row("冻结金额", f"{report.frozen_amount:.2f} 元")
    summary_table.add_row("重复冻结", f"{len(report.duplicate_freezes)} 条")
    summary_table.add_row("银行卡失败", f"{len(report.bank_failures)} 人")
    console.print(summary_table)

    if report.inconsistencies:
        console.print("\n[bold yellow]⚠ 与上一批次不一致：[/bold yellow]")
        for inc in report.inconsistencies:
            console.print(f"  • {inc['human_reason']}")


@main.command()
@click.option(
    "--output", "-o", default="./output", help="输出目录"
)
def examples(output):
    """生成示例数据文件"""
    import pandas as pd

    examples_dir = f"{output}/examples"
    os.makedirs(examples_dir, exist_ok=True)

    ticket_df = pd.DataFrame(
        [
            {
                "骑手ID": "R001",
                "姓名": "张三",
                "应发金额": 5200.0,
                "基本工资": 4000.0,
                "银行卡号": "6222021234567890123",
                "银行名称": "工商银行",
                "身份证号": "110101199001011234",
                "手机号": "13800138001",
            },
            {
                "骑手ID": "R002",
                "姓名": "李四",
                "应发金额": 4800.0,
                "基本工资": 3800.0,
                "银行卡号": "6222021234567890456",
                "银行名称": "建设银行",
                "身份证号": "110101199002025678",
                "手机号": "13800138002",
            },
            {
                "骑手ID": "R003",
                "姓名": "王五",
                "应发金额": 5500.0,
                "基本工资": 4200.0,
                "银行卡号": "6222021234567890789",
                "银行名称": "农业银行",
                "身份证号": "110101199003039012",
                "手机号": "13800138003",
            },
        ]
    )
    ticket_path = f"{examples_dir}/客服工单.xlsx"
    ticket_df.to_excel(ticket_path, index=False)
    console.print(f"✓ 客服工单示例：{ticket_path}")

    salary_df = pd.DataFrame(
        [
            {
                "骑手ID": "R001",
                "姓名": "张三",
                "应发金额": 5000.0,
                "基本工资": 4000.0,
                "银行卡号": "6222021234567890123",
                "银行名称": "工商银行",
                "身份证号": "110101199001011234",
                "手机号": "13800138001",
            },
            {
                "骑手ID": "R002",
                "姓名": "李四",
                "应发金额": 4800.0,
                "基本工资": 3800.0,
                "银行卡号": "6222021234567890456",
                "银行名称": "建设银行",
                "身份证号": "110101199002025678",
                "手机号": "13800138002",
            },
            {
                "骑手ID": "R004",
                "姓名": "赵六",
                "应发金额": 5100.0,
                "基本工资": 4000.0,
                "银行卡号": "6222021234567890321",
                "银行名称": "中国银行",
                "身份证号": "110101199004043456",
                "手机号": "13800138004",
            },
        ]
    )
    salary_path = f"{examples_dir}/计薪流水.xlsx"
    salary_df.to_excel(salary_path, index=False)
    console.print(f"✓ 计薪流水示例：{salary_path}")

    freeze_df = pd.DataFrame(
        [
            {
                "骑手ID": "R001",
                "冻结类型": "投诉冻结",
                "冻结金额": 500.0,
                "冻结原因": "客户投诉送餐超时",
                "投诉单号": "CMP202405001",
                "操作人": "客服小王",
            },
            {
                "骑手ID": "R001",
                "冻结类型": "投诉冻结",
                "冻结金额": 500.0,
                "冻结原因": "客户投诉送餐超时",
                "投诉单号": "CMP202405001",
                "操作人": "客服小李",
            },
            {
                "骑手ID": "R002",
                "冻结类型": "补贴追回",
                "冻结金额": 300.0,
                "冻结原因": "天气补贴重复发放",
                "投诉单号": "",
                "操作人": "财务小张",
            },
            {
                "骑手ID": "R003",
                "冻结类型": "银行卡失败",
                "冻结金额": 5500.0,
                "冻结原因": "卡号错误打款失败",
                "投诉单号": "",
                "操作人": "银行接口",
            },
        ]
    )
    freeze_path = f"{examples_dir}/冻结名单.xlsx"
    freeze_df.to_excel(freeze_path, index=False)
    console.print(f"✓ 冻结名单示例：{freeze_path}")

    console.print(
        Panel.fit(
            "[bold green]示例数据生成完成！[/bold green]\n"
            f"目录：{examples_dir}\n\n"
            "使用示例：\n"
            f"crowdpay process -t {ticket_path} -s {salary_path} -f {freeze_path}",
            border_style="green",
        )
    )


if __name__ == "__main__":
    main()
