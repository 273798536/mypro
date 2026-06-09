import os
import sys

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .batch_manager import BatchManager
from .data_loader import load_all_data
from .anomaly_detector import detect_anomalies
from .calculator import process_batch_calculations
from .report_generator import generate_text_report, save_text_report
from .exporter import export_to_excel


console = Console()


def _print_header():
    title = Text("氨氮监测异常解释工具", style="bold cyan")
    subtitle = Text("NH3-N Monitor Anomaly Explainer", style="dim")
    console.print(Panel.fit(Text.assemble(title, "\n", subtitle), border_style="cyan"))


def _print_batch_summary(batch, monitors, reagents, anomalies):
    table = Table(title="批次处理概要", show_header=True, header_style="bold magenta")
    table.add_column("项目", style="bold")
    table.add_column("内容")
    table.add_row("批次ID", batch.batch_id)
    table.add_row("批次名称", batch.batch_name)
    table.add_row("监测记录数", str(len(monitors)))
    table.add_row("试剂台账数", str(len(reagents)))
    table.add_row("检出异常数", str(len(anomalies)))
    if anomalies:
        by_severity = {}
        for a in anomalies:
            by_severity[a.severity] = by_severity.get(a.severity, 0) + 1
        parts = []
        for lvl, name in [("critical", "严重"), ("major", "主要"), ("minor", "次要"), ("info", "提示")]:
            if lvl in by_severity:
                color = {"critical": "red", "major": "yellow", "minor": "green", "info": "blue"}.get(lvl, "white")
                parts.append(f"[{color}]{name}: {by_severity[lvl]}[/]")
        table.add_row("按严重程度", ", ".join(parts))
    console.print(table)


def _print_anomalies_preview(anomalies, monitors):
    if not anomalies:
        console.print("[green]✓ 本批次未检出异常[/green]")
        return
    monitor_map = {m.record_id: m for m in monitors}
    table = Table(title="异常预览（前10条）", show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=4)
    table.add_column("严重程度", width=10)
    table.add_column("异常类型", width=16)
    table.add_column("样品", width=20)
    table.add_column("问题描述")

    for i, a in enumerate(anomalies[:10], 1):
        sev_style = {
            "critical": "bold red",
            "major": "bold yellow",
            "minor": "bold green",
            "info": "bold blue",
        }.get(a.severity, "white")
        sev_cn = {"critical": "严重", "major": "主要", "minor": "次要", "info": "提示"}.get(a.severity, a.severity)
        m = monitor_map.get(a.monitor_record_id)
        sample = f"{m.sample_name}({m.sample_id})" if m else a.monitor_record_id
        from .models import ANOMALY_TYPES
        at_cn = ANOMALY_TYPES.get(a.anomaly_type, a.anomaly_type)
        table.add_row(str(i), f"[{sev_style}]{sev_cn}[/]", at_cn, sample, a.description)

    console.print(table)
    if len(anomalies) > 10:
        console.print(f"[dim]... 还有 {len(anomalies) - 10} 条，详见导出文件[/dim]")


@click.group()
@click.version_option(package_name="nh3n_explainer", prog_name="nh3n")
def cli():
    """氨氮监测异常解释工具 - 处理氨氮监测数据的异常检测、配平计算和报告生成"""
    pass


@cli.command()
@click.option("-i", "--input-dir", required=True, type=click.Path(exists=True, file_okay=False), help="输入数据目录（包含监测记录和试剂台账）")
@click.option("-o", "--output-dir", required=True, type=click.Path(file_okay=False), help="输出报告目录")
@click.option("-n", "--batch-name", default=None, help="批次名称（可选，自动生成默认名）")
@click.option("--force", is_flag=True, help="强制重新处理，即使已存在相同输入的完成批次")
def run(input_dir, output_dir, batch_name, force):
    """运行一次异常检测和报告生成"""
    _print_header()

    input_dir = os.path.abspath(input_dir)
    output_dir = os.path.abspath(output_dir)
    bm = BatchManager(input_dir, output_dir)

    if not force:
        existing = bm.find_existing_batch()
        if existing:
            console.print(f"[yellow]⚠ 发现已完成批次：{existing.batch_name} ({existing.batch_id})[/yellow]")
            console.print("[dim]输入内容未变化，若要重新处理请加 --force[/dim]")
            results = bm.load_processing_results(existing.batch_id)
            if results:
                console.print(f"[green]✓ 直接使用已有结果，共检出 {existing.anomaly_count} 条异常[/green]")
                console.print(f"  报告文件见输出目录: {output_dir}")
            return

    console.print(f"[cyan]→ 读取数据目录：{input_dir}[/cyan]")
    monitors, reagents = load_all_data(input_dir)
    console.print(f"  ✓ 读取监测记录 {len(monitors)} 条，试剂台账 {len(reagents)} 条")

    batch = bm.create_batch(batch_name)
    console.print(f"[cyan]→ 创建批次：{batch.batch_name} ({batch.batch_id})[/cyan]")

    console.print("[cyan]→ 检测异常...[/cyan]")
    anomalies = detect_anomalies(monitors, reagents)
    console.print(f"  ✓ 共检出 {len(anomalies)} 条异常")

    console.print("[cyan]→ 配平计算和复测建议...[/cyan]")
    balance_results, retest_plans = process_batch_calculations(monitors, reagents, anomalies)

    console.print("[cyan]→ 保存批次处理结果...[/cyan]")
    bm.save_processing_results(batch, monitors, reagents, anomalies)
    bm.complete_batch(batch)

    console.print("[cyan]→ 生成文本报告...[/cyan]")
    report_text = generate_text_report(batch, monitors, reagents, anomalies, balance_results)
    report_path = save_text_report(report_text, output_dir, batch.batch_id)
    console.print(f"  ✓ 文本报告: {report_path}")

    console.print("[cyan]→ 生成Excel导出...[/cyan]")
    excel_path = export_to_excel(batch, monitors, reagents, anomalies, balance_results, output_dir)
    console.print(f"  ✓ Excel报告: {excel_path}")

    _print_batch_summary(batch, monitors, reagents, anomalies)
    _print_anomalies_preview(anomalies, monitors)

    console.print("")
    console.print(Panel.fit(
        f"[green]处理完成！[/green]\n"
        f"可转发的Excel: [bold]{excel_path}[/bold]\n"
        f"详细说明TXT: [bold]{report_path}[/bold]\n"
        f"批次追溯ID: [bold]{batch.batch_id}[/bold]",
        border_style="green",
        title="输出文件",
    ))


@cli.command("list")
@click.option("-o", "--output-dir", required=True, type=click.Path(file_okay=False), help="输出目录（包含批次索引）")
def list_batches(output_dir):
    """列出历史处理批次"""
    _print_header()
    output_dir = os.path.abspath(output_dir)
    bm = BatchManager(".", output_dir)
    batches = bm.list_batches()

    if not batches:
        console.print("[yellow]暂无历史批次[/yellow]")
        return

    table = Table(title="历史批次", show_header=True, header_style="bold magenta")
    table.add_column("批次ID", style="bold")
    table.add_column("批次名称")
    table.add_column("创建时间")
    table.add_column("状态")
    table.add_column("异常数")

    for b in batches:
        status_style = {"completed": "green", "processing": "yellow", "pending": "dim"}.get(b["status"], "white")
        table.add_row(
            b["batch_id"],
            b["batch_name"],
            b["created_at"],
            f"[{status_style}]{b['status']}[/]",
            str(b.get("anomaly_count", 0)),
        )
    console.print(table)


@cli.command()
@click.option("-i", "--input-dir", required=True, type=click.Path(exists=True, file_okay=False), help="输入数据目录")
@click.option("-o", "--output-dir", required=True, type=click.Path(file_okay=False), help="输出目录")
@click.argument("anomaly_id")
def trace(input_dir, output_dir, anomaly_id):
    """根据异常编号追溯完整链路（从异常→监测记录→试剂台账→处理意见）"""
    _print_header()
    output_dir = os.path.abspath(output_dir)
    input_dir = os.path.abspath(input_dir)
    bm = BatchManager(input_dir, output_dir)
    batches = bm.list_batches()

    target_anomaly = None
    target_batch_id = None
    for b in batches:
        results = bm.load_processing_results(b["batch_id"])
        if not results:
            continue
        for a in results.get("anomaly_records", []):
            if a["anomaly_id"] == anomaly_id:
                target_anomaly = a
                target_batch_id = b["batch_id"]
                break
        if target_anomaly:
            break

    if not target_anomaly:
        console.print(f"[red]✗ 未找到异常编号: {anomaly_id}[/red]")
        console.print("[dim]请用 nh3n list -o <输出目录> 查看历史批次[/dim]")
        sys.exit(1)

    results = bm.load_processing_results(target_batch_id)
    monitors = {m["record_id"]: m for m in results.get("monitor_records", [])}
    reagents = {r["reagent_id"]: r for r in results.get("reagent_records", [])}

    m = monitors.get(target_anomaly["monitor_record_id"], {})

    console.print("")
    console.print(Panel.fit(
        f"[bold]异常编号[/bold]: {target_anomaly['anomaly_id']}\n"
        f"[bold]异常类型[/bold]: {target_anomaly['anomaly_type']}\n"
        f"[bold]严重程度[/bold]: {target_anomaly['severity']}\n"
        f"[bold]所属批次[/bold]: {target_batch_id}",
        title="异常基本信息", border_style="red",
    ))

    console.print("")
    table = Table(title="▼ 关联监测记录", show_header=True, header_style="bold blue")
    table.add_column("字段")
    table.add_column("值")
    for k, label in [
        ("sample_name", "样品名称"),
        ("sample_id", "样品编号"),
        ("monitor_date", "监测日期"),
        ("blank_control_value", "空白对照值"),
        ("blank_control_unit", "空白单位"),
        ("sample_value", "样品值"),
        ("sample_unit", "样品单位"),
        ("standard_curve_id", "标准曲线编号"),
        ("operator", "检测人员"),
        ("reviewer", "审核人员"),
        ("remarks", "备注"),
        ("reagent_ids", "关联试剂"),
    ]:
        v = m.get(k, "")
        if isinstance(v, list):
            v = "、".join(v)
        table.add_row(label, str(v) if v else "[dim]（未填）[/]")
    console.print(table)

    if target_anomaly.get("reagent_evidence"):
        console.print("")
        table = Table(title="▼ 关联试剂台账（证据链）", show_header=True, header_style="bold green")
        table.add_column("试剂编号")
        table.add_column("名称")
        table.add_column("批号")
        table.add_column("厂家")
        table.add_column("开瓶日期")
        table.add_column("有效期")
        table.add_column("使用人")
        table.add_column("台账备注")
        for rid in target_anomaly["reagent_evidence"]:
            r = reagents.get(rid)
            if r:
                table.add_row(
                    rid, r.get("name", ""), r.get("batch_no", ""), r.get("manufacturer", ""),
                    str(r.get("open_date", "") or ""),
                    str(r.get("expiry_date", "") or ""),
                    r.get("operator", "") or "[dim]未填[/]",
                    r.get("remarks", "") or "[dim]无[/]",
                )
            else:
                table.add_row(rid, "[red]台账中未找到[/]", "", "", "", "", "", "")
        console.print(table)

    console.print("")
    console.print(Panel.fit(
        target_anomaly.get("plain_explanation", ""),
        title="▼ 普通话解释（可直接转发同事）", border_style="cyan",
    ))

    if target_anomaly.get("balance_calc"):
        bc = target_anomaly["balance_calc"]
        console.print("")
        table = Table(title="▼ 配平计算结果（界面/报告共用）", show_header=True, header_style="bold magenta")
        table.add_column("项目")
        table.add_column("数值")
        table.add_row("公式", bc.get("formula", ""))
        table.add_row("空白吸光度", f"{bc.get('blank_absorbance')} {bc.get('blank_unit')}")
        table.add_row("样品吸光度", f"{bc.get('sample_absorbance')} {bc.get('sample_unit')}")
        table.add_row("校正吸光度", str(bc.get("corrected_absorbance")))
        if bc.get("standard_curve"):
            sc = bc["standard_curve"]
            table.add_row("标曲斜率", str(sc.get("slope")))
            table.add_row("标曲截距", str(sc.get("intercept")))
        table.add_row("计算浓度", f"{bc.get('concentration_mg_l')} {bc.get('concentration_unit')}")
        table.add_row("稀释倍数", str(bc.get("dilution_factor")))
        if bc.get("calculation_notes"):
            for note in bc["calculation_notes"]:
                table.add_row("[yellow]⚠ 说明[/]", note)
        console.print(table)

    if target_anomaly.get("retest_suggestion"):
        console.print("")
        console.print(Panel.fit(
            target_anomaly["retest_suggestion"],
            title="▼ 复测建议", border_style="yellow",
        ))

    if target_anomaly.get("action_suggestion"):
        console.print("")
        console.print(Panel.fit(
            target_anomaly["action_suggestion"],
            title="▼ 处理意见", border_style="green",
        ))


def main():
    cli()


if __name__ == "__main__":
    main()
