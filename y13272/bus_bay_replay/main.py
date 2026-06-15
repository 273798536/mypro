import click
import os
from pathlib import Path

from replay.engine import ReplayEngine


@click.group(help="公交港湾投诉回放 - 投诉记录回放与追溯工具")
def cli():
    pass


@cli.command("start", help="启动回放，从数据目录加载记录并生成报告")
@click.option("--data-dir", "-d", default="data", help="数据目录路径 (默认: data)")
@click.option("--output", "-o", default="report.md", help="报告输出路径 (默认: report.md)")
@click.option("--state-dir", default=".replay_state", help="状态存储目录 (默认: .replay_state)")
def start(data_dir, output, state_dir):
    click.echo("正在启动公交港湾投诉回放...")
    click.echo(f"数据目录: {os.path.abspath(data_dir)}")

    engine = ReplayEngine(data_dir=data_dir, state_dir=state_dir)
    result = engine.start()

    click.echo("")
    click.echo("=== 回放完成 ===")
    click.echo(f"投诉记录: {result['total_records']} 条 (接收 {result['accepted']}, 去重 {result['duplicates']})")
    click.echo(f"会议纪要: {result['total_minutes']} 份")
    click.echo("")

    stats = result["status_stats"]
    click.echo("状态分布:")
    for status, count in stats.items():
        click.echo(f"  {status}: {count} 条")

    report_path = engine.generate_report(output)
    click.echo("")
    click.echo(f"报告已生成: {os.path.abspath(report_path)}")

    if result["messages"]:
        click.echo("")
        click.echo("去重日志:")
        for msg in result["messages"][:5]:
            click.echo(f"  {msg}")
        if len(result["messages"]) > 5:
            click.echo(f"  ... 还有 {len(result['messages']) - 5} 条")


@cli.command("rerun", help="重放回放，清空状态重新加载")
@click.option("--data-dir", "-d", default="data", help="数据目录路径 (默认: data)")
@click.option("--output", "-o", default="report.md", help="报告输出路径 (默认: report.md)")
@click.option("--state-dir", default=".replay_state", help="状态存储目录 (默认: .replay_state)")
def rerun(data_dir, output, state_dir):
    click.echo("正在重放回放（清空历史状态）...")
    click.echo(f"数据目录: {os.path.abspath(data_dir)}")

    engine = ReplayEngine(data_dir=data_dir, state_dir=state_dir)
    result = engine.rerun()

    click.echo("")
    click.echo("=== 重放完成 ===")
    click.echo(f"投诉记录: {result['total_records']} 条 (接收 {result['accepted']}, 去重 {result['duplicates']})")
    click.echo(f"会议纪要: {result['total_minutes']} 份")
    click.echo("")

    stats = result["status_stats"]
    click.echo("状态分布:")
    for status, count in stats.items():
        click.echo(f"  {status}: {count} 条")

    report_path = engine.generate_report(output)
    click.echo("")
    click.echo(f"报告已生成: {os.path.abspath(report_path)}")


@cli.command("report", help="查看当前状态的 Markdown 报告")
@click.option("--output", "-o", default="report.md", help="报告输出路径 (默认: report.md)")
@click.option("--state-dir", default=".replay_state", help="状态存储目录 (默认: .replay_state)")
@click.option("--data-dir", "-d", default="data", help="数据目录路径 (默认: data)")
@click.option("--view", "-v", is_flag=True, help="在终端查看报告摘要")
def report(output, state_dir, data_dir, view):
    engine = ReplayEngine(data_dir=data_dir, state_dir=state_dir)

    if not engine.load_state():
        click.echo("未找到已保存的状态，请先运行 start 命令")
        return

    report_path = engine.generate_report(output)
    click.echo(f"报告已生成: {os.path.abspath(report_path)}")

    if view:
        stats = engine.stats()
        click.echo("")
        click.echo("=== 报告摘要 ===")
        click.echo(f"投诉记录: {stats['total_records']} 条")
        click.echo(f"会议纪要: {stats['total_minutes']} 份")
        click.echo(f"历史操作: {stats['total_history']} 条")
        click.echo("")
        click.echo("状态分布:")
        for status, count in stats["status_stats"].items():
            click.echo(f"  {status}: {count} 条")


@cli.command("trace", help="追溯会议纪要原始版本")
@click.argument("minute_id")
@click.option("--output", "-o", default=None, help="溯源报告输出路径")
@click.option("--state-dir", default=".replay_state", help="状态存储目录")
@click.option("--data-dir", "-d", default="data", help="数据目录路径")
def trace(minute_id, output, state_dir, data_dir):
    engine = ReplayEngine(data_dir=data_dir, state_dir=state_dir)

    if not engine.load_state():
        click.echo("未找到已保存的状态，请先运行 start 命令")
        return

    output_path = output or f"trace_{minute_id}.md"
    result = engine.generate_minute_trace_report(minute_id, output_path)

    if result:
        click.echo(f"溯源报告已生成: {os.path.abspath(result)}")
    else:
        click.echo(f"未找到会议纪要: {minute_id}")


@cli.command("review", help="查看待复核点位（三类分开）")
@click.option("--state-dir", default=".replay_state", help="状态存储目录")
@click.option("--data-dir", "-d", default="data", help="数据目录路径")
def review(state_dir, data_dir):
    engine = ReplayEngine(data_dir=data_dir, state_dir=state_dir)

    if not engine.load_state():
        click.echo("未找到已保存的状态，请先运行 start 命令")
        return

    review_data = engine.get_review_list()

    click.echo("=== 待复核点位 ===")
    click.echo("")

    for category, records in review_data.items():
        click.echo(f"【{category}】共 {len(records)} 条")
        if records:
            for r in records[:10]:
                click.echo(f"  - {r.complaint_id} | {r.bay_name} | {r.complaint_type}")
            if len(records) > 10:
                click.echo(f"  ... 还有 {len(records) - 10} 条")
        else:
            click.echo("  （无）")
        click.echo("")


if __name__ == "__main__":
    cli()
