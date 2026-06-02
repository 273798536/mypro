import os
import sys
import click
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich import box

from .__init__ import __version__, __app_name__
from .data_loader import DataLoader
from .queue_theory import (
    simulate_interval,
    calculate_mmcc_metrics,
    find_min_agents,
    compare_agent_scenarios,
    QueueConfig,
    SimulationResult
)
from .visualization import Visualizer
from .report import ReportGenerator
from .errors import QueueSchedulerError


console = Console()


def print_banner():
    banner = f"""
╔══════════════════════════════════════════════════════════════╗
║                    排队论客服排班 CLI                         ║
║              Queue Scheduler v{__version__}                       ║
╚══════════════════════════════════════════════════════════════╝
    """
    console.print(banner, style="cyan")


def print_data_summary(loader: DataLoader):
    summary = loader.get_data_summary()

    table = Table(title="📊 数据概览", box=box.ROUNDED, show_header=True)
    table.add_column("数据类型", style="cyan", no_wrap=True)
    table.add_column("指标", style="green")
    table.add_column("数值", style="yellow")

    for data_type, metrics in summary.items():
        if data_type == '数据来源':
            continue
        first = True
        for metric, value in metrics.items():
            if first:
                table.add_row(f"[bold]{data_type}[/bold]", metric, str(value))
                first = False
            else:
                table.add_row("", metric, str(value))

    console.print(table)

    if '数据来源' in summary and summary['数据来源']:
        console.print("\n📁 数据来源文件：", style="bold blue")
        for source, path in summary['数据来源'].items():
            console.print(f"   {source}: {path}", style="dim")


def print_interval_results(result: SimulationResult, show_all: bool = False):
    console.print("\n📋 时段明细:", style="bold cyan")

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold blue")
    table.add_column("时段", style="cyan", no_wrap=True)
    table.add_column("坐席", justify="center")
    table.add_column("来电", justify="right")
    table.add_column("接听", justify="right")
    table.add_column("放弃", justify="right")
    table.add_column("平均等待(s)", justify="right")
    table.add_column("最大等待(s)", justify="right")
    table.add_column("服务水平", justify="center")
    table.add_column("利用率", justify="center")

    intervals = result.intervals
    if not show_all and len(intervals) > 12:
        display_intervals = intervals[:6] + [None] + intervals[-6:]
    else:
        display_intervals = intervals

    for interval in display_intervals:
        if interval is None:
            table.add_row("...", "...", "...", "...", "...", "...", "...", "...", "...")
            continue

        sl_color = "green" if interval.service_level >= result.config.target_service_level else "red"
        util_color = "green" if interval.agent_utilization < 0.9 else "yellow"

        table.add_row(
            interval.interval_start.strftime("%H:%M"),
            str(interval.num_agents),
            str(interval.offered_calls),
            str(interval.answered_calls),
            str(interval.abandoned_calls),
            f"{interval.avg_wait_time:.1f}",
            f"{interval.max_wait_time:.1f}",
            f"[{sl_color}]{interval.service_level*100:.1f}%[/{sl_color}]",
            f"[{util_color}]{interval.agent_utilization*100:.1f}%[/{util_color}]"
        )

    console.print(table)


def print_comparison_table(scenarios, base_agents, target_sl):
    console.print("\n📊 多坐席方案对比:", style="bold cyan")

    table = Table(box=box.ROUNDED, show_header=True, header_style="bold blue")
    table.add_column("坐席数", style="cyan", justify="center")
    table.add_column("服务水平", justify="center")
    table.add_column("平均等待(s)", justify="right")
    table.add_column("减少等待", justify="center")
    table.add_column("平均排队", justify="right")
    table.add_column("利用率", justify="center")
    table.add_column("达标", justify="center")

    for s in scenarios:
        sl_color = "green" if s['meets_target'] else "red"
        is_base = s['agents'] == base_agents

        reduction = "-"
        if s['wait_reduction_vs_base'] is not None and s['agents'] != base_agents:
            pct = s['wait_reduction_vs_base'] * 100
            if pct > 1:
                reduction = f"[green]↓{pct:.0f}%[/green]"
            elif pct < -1:
                reduction = f"[red]↑{abs(pct):.0f}%[/red]"

        agent_display = f"[bold]{s['agents']}[/bold]" if is_base else str(s['agents'])

        table.add_row(
            agent_display,
            f"[{sl_color}]{s['service_level']*100:.1f}%[/{sl_color}]",
            f"{s['avg_wait_seconds']:.1f}",
            reduction,
            f"{s['avg_queue_length']:.2f}",
            f"{s['agent_utilization']*100:.1f}%",
            "✅" if s['meets_target'] else "❌"
        )

    console.print(table)


@click.group()
@click.version_option(__version__, prog_name=__app_name__)
@click.option('--output-dir', default='output', help='输出目录')
@click.pass_context
def cli(ctx, output_dir):
    """排队论客服排班CLI - 基于M/M/c模型的客服排班优化工具"""
    ctx.ensure_object(dict)
    ctx.obj['output_dir'] = output_dir
    ctx.obj['loader'] = DataLoader()
    ctx.obj['visualizer'] = Visualizer(output_dir)
    ctx.obj['reporter'] = ReportGenerator(output_dir)
    ctx.obj['config'] = QueueConfig()


@cli.command()
@click.option('--calls', 'calls_file', help='来电记录文件路径 (CSV/Excel)')
@click.option('--shifts', 'shifts_file', help='班表文件路径 (CSV/Excel)')
@click.option('--holidays', 'holidays_file', help='节假日文件路径 (CSV/Excel)')
@click.option('--samples', is_flag=True, help='使用内置样例数据')
@click.pass_context
def load(ctx, calls_file, shifts_file, holidays_file, samples):
    """导入数据：来电记录、班表、节假日"""
    print_banner()
    loader = ctx.obj['loader']

    sample_dir = os.path.join(os.path.dirname(__file__), '..', 'samples')

    try:
        if samples:
            console.print("📦 使用内置样例数据...", style="cyan")
            calls_file = os.path.join(sample_dir, 'calls.csv')
            shifts_file = os.path.join(sample_dir, 'shifts.csv')
            holidays_file = os.path.join(sample_dir, 'holidays.csv')

        if calls_file:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("📞 加载来电记录...", total=None)
                loader.load_call_records(calls_file)
                progress.update(task, description="✅ 来电记录加载完成")

        if shifts_file:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("📅 加载班表数据...", total=None)
                loader.load_shifts(shifts_file)
                progress.update(task, description="✅ 班表数据加载完成")

        if holidays_file:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("🎊 加载节假日数据...", total=None)
                loader.load_holidays(holidays_file)
                progress.update(task, description="✅ 节假日数据加载完成")

        print_data_summary(loader)

        ctx.obj['data_loaded'] = True

    except QueueSchedulerError as e:
        console.print(e)
        sys.exit(1)
    except Exception as e:
        console.print(f"❌ 发生未预期的错误：{e}", style="red")
        console.print("💡 建议：请检查数据格式，或使用 --samples 参数体验功能", style="dim")
        sys.exit(1)


@cli.command()
@click.option('--arrival-rate', '-λ', type=float, required=True, help='每小时平均来电数')
@click.option('--handle-time', '-μ', type=float, required=True, help='平均通话时长(秒)')
@click.option('--agents', '-c', type=int, required=True, help='坐席数量')
@click.option('--target-sl', type=float, default=0.80, help='目标服务水平 (如0.8表示80%)')
@click.option('--target-wait', type=float, default=20.0, help='目标等待时间(秒)')
@click.pass_context
def calc(ctx, arrival_rate, handle_time, agents, target_sl, target_wait):
    """快速计算：输入参数直接计算排队指标"""
    print_banner()

    try:
        from .errors import validate_service_level
        validate_service_level(target_sl)

        config = ctx.obj['config']
        config.target_service_level = target_sl
        config.target_wait_seconds = target_wait

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("🔢 计算排队论指标...", total=None)
            metrics = calculate_mmcc_metrics(
                arrival_rate=arrival_rate,
                avg_handle_seconds=handle_time,
                num_agents=agents,
                target_wait_seconds=target_wait
            )
            progress.update(task, description="✅ 计算完成")

        console.print("\n📊 M/M/c 排队模型计算结果:", style="bold cyan")

        table = Table(box=box.ROUNDED, show_header=False)
        table.add_column("指标", style="cyan")
        table.add_column("数值", style="yellow")
        table.add_column("说明", style="dim")

        rows = [
            ("到达率 (λ)", f"{arrival_rate:.1f} 通/小时", "平均每小时来电数量"),
            ("服务率 (μ)", f"{metrics['service_rate']:.1f} 通/小时", "每坐席每小时可处理的电话数"),
            ("交通强度 (a)", f"{metrics['traffic_intensity']:.2f}", f"需要 {np.ceil(metrics['traffic_intensity']):.0f} 个坐席才能跟上"),
            ("坐席数 (c)", f"{agents} 人", "当前配置的坐席数量"),
            ("坐席利用率", f"{metrics['agent_utilization']*100:.1f}%", "坐席忙于通话的时间比例"),
            ("需要等待的概率", f"{metrics['probability_wait']*100:.1f}%", "客户来电时需要排队的概率"),
            ("平均等待时间", f"{metrics['avg_wait_seconds']:.1f} 秒", "客户的平均排队等待时间"),
            ("平均排队长度", f"{metrics['avg_queue_length']:.2f} 人", "平均排队等待的客户数"),
            ("服务水平", f"{metrics['service_level']*100:.1f}%", f"{target_wait:.0f}秒内接听的比例"),
            ("系统稳定性", "✅ 稳定" if metrics['is_stable'] else "❌ 不稳定", "到达率必须小于总服务率")
        ]

        for metric, value, desc in rows:
            table.add_row(metric, value, desc)

        console.print(table)

        if not metrics['is_stable']:
            console.print(Panel.fit(
                f"⚠️  系统不稳定！当前坐席数不足以处理来电量。\n"
                f"   至少需要 {int(np.ceil(arrival_rate * handle_time / 3600) + 1)} 个坐席才能保证系统稳定。",
                title="重要提示",
                border_style="red"
            ))

        if metrics['service_level'] < target_sl:
            min_agents = find_min_agents(arrival_rate, handle_time, target_sl, target_wait)
            console.print(Panel.fit(
                f"💡 当前坐席数 {agents} 人无法达到 {target_sl*100:.0f}% @ {target_wait:.0f}秒 的目标。\n"
                f"   建议增加到 {min_agents} 个坐席。",
                title="优化建议",
                border_style="yellow"
            ))

        return metrics

    except QueueSchedulerError as e:
        console.print(e)
        sys.exit(1)


@cli.command()
@click.option('--arrival-rate', '-λ', type=float, required=True, help='每小时平均来电数')
@click.option('--handle-time', '-μ', type=float, required=True, help='平均通话时长(秒)')
@click.option('--base-agents', type=int, required=True, help='当前坐席数量')
@click.option('--target-sl', type=float, default=0.80, help='目标服务水平')
@click.option('--target-wait', type=float, default=20.0, help='目标等待时间(秒)')
@click.option('--extra', type=int, default=3, help='上下浮动范围')
@click.option('--plot/--no-plot', default=True, help='是否生成对比图')
@click.pass_context
def compare(ctx, arrival_rate, handle_time, base_agents, target_sl, target_wait, extra, plot):
    """坐席对比：分析不同坐席数对等待时间的影响"""
    print_banner()

    try:
        config = ctx.obj['config']
        config.target_service_level = target_sl
        config.target_wait_seconds = target_wait

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("📊 生成多坐席方案对比...", total=None)
            scenarios = compare_agent_scenarios(
                arrival_rate=arrival_rate,
                avg_handle_seconds=handle_time,
                base_agents=base_agents,
                target_service_level=target_sl,
                target_wait_seconds=target_wait,
                extra_agents=extra
            )
            progress.update(task, description="✅ 对比分析完成")

        print_comparison_table(scenarios, base_agents, target_sl)

        base_scenario = next((s for s in scenarios if s['agents'] == base_agents), None)
        if base_scenario:
            better = [s for s in scenarios if s['agents'] > base_agents and s['meets_target']]
            if better and not base_scenario['meets_target']:
                best = min(better, key=lambda x: x['agents'])
                reduction = (base_scenario['avg_wait_seconds'] - best['avg_wait_seconds'])
                console.print(Panel.fit(
                    f"📈 老板问：多开一个坐席到底少等多久？\n\n"
                    f"   当前 {base_agents} 人 → 平均等待 {base_scenario['avg_wait_seconds']:.1f}秒，服务水平 {base_scenario['service_level']*100:.0f}%\n"
                    f"   增加到 {best['agents']} 人 → 平均等待 {best['avg_wait_seconds']:.1f}秒，服务水平 {best['service_level']*100:.0f}%\n\n"
                    f"   ✅ 每增加 {best['agents'] - base_agents} 个坐席，平均等待减少 {reduction:.1f} 秒\n"
                    f"   ✅ 服务水平提升 {best['service_level']*100 - base_scenario['service_level']*100:.0f} 个百分点",
                    title="效果量化",
                    border_style="green"
                ))

        if plot:
            visualizer = ctx.obj['visualizer']
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("🎨 生成对比图表...", total=None)
                chart_path = visualizer.plot_agent_comparison(
                    scenarios, base_agents, target_sl,
                    filename=f"compare_agents_{base_agents}.png"
                )
                progress.update(task, description=f"✅ 图表已保存: {chart_path}")

            ctx.obj['last_charts'] = {'坐席方案对比': chart_path}

        return scenarios

    except QueueSchedulerError as e:
        console.print(e)
        sys.exit(1)


@cli.command()
@click.option('--date', 'sim_date', help='模拟日期 (YYYY-MM-DD)，默认使用来电记录的最早日期')
@click.option('--start-hour', type=int, default=8, help='开始小时')
@click.option('--end-hour', type=int, default=22, help='结束小时')
@click.option('--interval', type=int, default=30, help='时间间隔(分钟)')
@click.option('--target-sl', type=float, default=0.80, help='目标服务水平')
@click.option('--target-wait', type=float, default=20.0, help='目标等待时间(秒)')
@click.option('--iterations', type=int, default=500, help='模拟迭代次数')
@click.option('--show-all', is_flag=True, help='显示所有时段详情')
@click.option('--plot/--no-plot', default=True, help='是否生成图表')
@click.option('--export/--no-export', default=True, help='是否导出报告')
@click.option('--samples', is_flag=True, help='使用内置样例数据')
@click.option('--calls', 'calls_file', help='来电记录文件路径 (CSV/Excel)')
@click.option('--shifts', 'shifts_file', help='班表文件路径 (CSV/Excel)')
@click.option('--holidays', 'holidays_file', help='节假日文件路径 (CSV/Excel)')
@click.pass_context
def simulate(ctx, sim_date, start_hour, end_hour, interval, target_sl, target_wait, iterations, show_all, plot, export, samples, calls_file, shifts_file, holidays_file):
    """排队模拟：基于导入的数据分析排班效果"""
    print_banner()
    loader = ctx.obj['loader']

    sample_dir = os.path.join(os.path.dirname(__file__), '..', 'samples')

    if samples:
        console.print("📦 使用内置样例数据...", style="cyan")
        calls_file = os.path.join(sample_dir, 'calls.csv')
        shifts_file = os.path.join(sample_dir, 'shifts.csv')
        holidays_file = os.path.join(sample_dir, 'holidays.csv')

    if calls_file:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("📞 加载来电记录...", total=None)
            loader.load_call_records(calls_file)
            progress.update(task, description="✅ 来电记录加载完成")

    if shifts_file:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("📅 加载班表数据...", total=None)
            loader.load_shifts(shifts_file)
            progress.update(task, description="✅ 班表数据加载完成")

    if holidays_file:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("🎊 加载节假日数据...", total=None)
            loader.load_holidays(holidays_file)
            progress.update(task, description="✅ 节假日数据加载完成")

    if not loader.call_records:
        console.print(Panel.fit(
            "⚠️  请先导入数据！使用:\n"
            "   qs simulate --samples (使用样例数据)\n"
            "   qs simulate --calls <来电文件> --shifts <班表文件> --holidays <节假日文件>",
            title="需要数据",
            border_style="yellow"
        ))
        sys.exit(1)

    try:
        config = ctx.obj['config']
        config.target_service_level = target_sl
        config.target_wait_seconds = target_wait
        config.sim_iterations = iterations

        if not sim_date:
            sim_date = loader.get_date_range()[0]
        else:
            sim_date = datetime.strptime(sim_date, '%Y-%m-%d').date()

        if not loader.shifts:
            console.print(Panel.fit(
                "⚠️  未检测到班表数据，将基于来电规律计算每个时段需要的坐席数",
                title="提示",
                border_style="yellow"
            ))

        merged_data = loader.merge_data_for_simulation(sim_date, sim_date, interval)

        start_dt = datetime.combine(sim_date, datetime.min.time().replace(hour=start_hour))
        end_dt = datetime.combine(sim_date, datetime.min.time().replace(hour=end_hour))

        filtered_data = merged_data[
            (merged_data['datetime'] >= start_dt) &
            (merged_data['datetime'] < end_dt)
        ].copy()

        if filtered_data.empty:
            console.print(f"❌ 指定时段内没有数据: {start_hour}:00 - {end_hour}:00", style="red")
            sys.exit(1)

        holiday = loader.is_holiday(sim_date)
        if holiday:
            console.print(Panel.fit(
                f"🎊 今天是 {holiday.name}"
                f"{' (高峰日)' if holiday.is_peak else ''}"
                f"，来电倍数: {holiday.traffic_multiplier}x",
                title="节假日提醒",
                border_style="cyan"
            ))

        result = SimulationResult(config=config)
        all_wait_times = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TimeElapsedColumn(),
            console=console
        ) as progress:
            task = progress.add_task("⚡ 运行排队模拟...", total=len(filtered_data))

            for _, row in filtered_data.iterrows():
                interval_start = row['datetime'].to_pydatetime()
                interval_end = interval_start + timedelta(minutes=interval)

                if row['agent_count'] == 0 and loader.shifts:
                    progress.advance(task)
                    continue

                arrival_rate = row['arrival_rate']
                avg_handle = row['avg_handle_seconds']

                if not loader.shifts:
                    try:
                        num_agents = find_min_agents(
                            arrival_rate=arrival_rate,
                            avg_handle_seconds=avg_handle,
                            target_service_level=target_sl,
                            target_wait_seconds=target_wait
                        )
                    except Exception:
                        num_agents = max(1, int(np.ceil(arrival_rate * avg_handle / 3600)) + 1)
                else:
                    num_agents = max(1, int(row['agent_count']))

                if arrival_rate > 0 and avg_handle > 0:
                    stats, wait_times = simulate_interval(
                        interval_start=interval_start,
                        interval_end=interval_end,
                        arrival_rate=arrival_rate,
                        avg_handle_seconds=avg_handle,
                        num_agents=num_agents,
                        config=config
                    )
                    result.intervals.append(stats)
                    all_wait_times.extend(wait_times)

                progress.advance(task)

        result.wait_time_distribution = all_wait_times

        data_summary = loader.get_data_summary()

        console.print(f"\n✅ 模拟完成！日期: {sim_date}", style="bold green")
        print_interval_results(result, show_all)

        if plot:
            visualizer = ctx.obj['visualizer']
            charts = {}

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("🎨 生成可视化图表...", total=None)

                if result.wait_time_distribution:
                    charts['等待时间分布'] = visualizer.plot_wait_time_distribution(
                        result.wait_time_distribution, target_wait
                    )
                charts['服务水平时间线'] = visualizer.plot_service_level_by_interval(
                    result.intervals, target_sl
                )
                charts['每日排班汇总'] = visualizer.plot_daily_summary(result)

                if loader.call_records:
                    patterns = loader.analyze_call_patterns(sim_date, sim_date)
                    if not patterns.empty:
                        charts['来电规律热力图'] = visualizer.plot_call_pattern_heatmap(patterns)

                progress.update(task, description="✅ 图表生成完成")

            for name, path in charts.items():
                console.print(f"   📊 {name}: {path}", style="dim")

            ctx.obj['last_charts'] = charts

        if export:
            reporter = ctx.obj['reporter']
            charts = ctx.obj.get('last_charts', {})

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("📄 导出分析报告...", total=None)
                prefix = f"sim_{sim_date.strftime('%Y%m%d')}"
                outputs = reporter.export_all(result, data_summary, charts, prefix)
                progress.update(task, description="✅ 报告导出完成")

            console.print("\n📁 导出文件:", style="bold blue")
            for fmt, path in outputs.items():
                console.print(f"   {fmt.upper()}: {path}", style="dim")

        ctx.obj['last_result'] = result

        return result

    except QueueSchedulerError as e:
        console.print(e)
        sys.exit(1)
    except Exception as e:
        console.print(f"❌ 模拟失败：{e}", style="red")
        import traceback
        console.print(traceback.format_exc(), style="dim")
        sys.exit(1)


@cli.command()
@click.option('--arrival-rate', '-λ', type=float, required=True, help='每小时平均来电数')
@click.option('--handle-time', '-μ', type=float, required=True, help='平均通话时长(秒)')
@click.option('--target-sl', type=float, default=0.80, help='目标服务水平')
@click.option('--target-wait', type=float, default=20.0, help='目标等待时间(秒)')
@click.option('--max-agents', type=int, default=50, help='最大坐席数')
@click.pass_context
def min_agents(ctx, arrival_rate, handle_time, target_sl, target_wait, max_agents):
    """计算最少坐席：达到目标服务水平需要的最少坐席数"""
    print_banner()

    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("🎯 计算最少坐席数...", total=None)
            n = find_min_agents(
                arrival_rate=arrival_rate,
                avg_handle_seconds=handle_time,
                target_service_level=target_sl,
                target_wait_seconds=target_wait,
                max_agents=max_agents
            )
            progress.update(task, description="✅ 计算完成")

        metrics = calculate_mmcc_metrics(
            arrival_rate=arrival_rate,
            avg_handle_seconds=handle_time,
            num_agents=n,
            target_wait_seconds=target_wait
        )

        console.print(Panel.fit(
            f"🎯 达到 {target_sl*100:.0f}% @ {target_wait:.0f}秒 的目标\n"
            f"   最少需要: [bold green]{n} 个坐席[/bold green]\n\n"
            f"   到达率: {arrival_rate:.1f} 通/小时\n"
            f"   平均通话时长: {handle_time:.0f} 秒\n\n"
            f"   预期效果:\n"
            f"   • 服务水平: {metrics['service_level']*100:.1f}%\n"
            f"   • 平均等待: {metrics['avg_wait_seconds']:.1f} 秒\n"
            f"   • 坐席利用率: {metrics['agent_utilization']*100:.1f}%\n"
            f"   • 需要等待概率: {metrics['probability_wait']*100:.1f}%",
            title="最少坐席计算",
            border_style="green"
        ))

        return n

    except QueueSchedulerError as e:
        console.print(e)
        sys.exit(1)


@cli.command()
def samples():
    """查看样例数据格式说明"""
    print_banner()

    console.print("📋 样例数据格式说明:", style="bold cyan")

    console.print("\n📞 来电记录 (calls.csv):", style="cyan")
    calls_table = Table(box=box.ROUNDED)
    calls_table.add_column("列名", style="yellow")
    calls_table.add_column("类型", style="green")
    calls_table.add_column("必填", style="red")
    calls_table.add_column("说明", style="dim")
    calls_table.add_row("来电时间", "datetime", "✅", "格式: 2024-01-01 09:15:30")
    calls_table.add_row("等待时长(秒)", "number", "✅", "客户排队等待时间")
    calls_table.add_row("通话时长(秒)", "number", "✅", "坐席接听后的通话时间")
    calls_table.add_row("坐席工号", "string", "⬜", "接听的坐席工号")
    calls_table.add_row("是否放弃", "boolean", "⬜", "客户是否放弃等待")
    console.print(calls_table)

    console.print("\n📅 班表 (shifts.csv):", style="cyan")
    shifts_table = Table(box=box.ROUNDED)
    shifts_table.add_column("列名", style="yellow")
    shifts_table.add_column("类型", style="green")
    shifts_table.add_column("必填", style="red")
    shifts_table.add_column("说明", style="dim")
    shifts_table.add_row("坐席工号", "string", "✅", "坐席唯一标识")
    shifts_table.add_row("日期", "date", "✅", "格式: 2024-01-01")
    shifts_table.add_row("上班时间", "time", "✅", "格式: 09:00")
    shifts_table.add_row("下班时间", "time", "✅", "格式: 18:00")
    shifts_table.add_row("休息开始", "time", "⬜", "格式: 12:00")
    shifts_table.add_row("休息结束", "time", "⬜", "格式: 13:00")
    console.print(shifts_table)

    console.print("\n🎊 节假日 (holidays.csv):", style="cyan")
    holidays_table = Table(box=box.ROUNDED)
    holidays_table.add_column("列名", style="yellow")
    holidays_table.add_column("类型", style="green")
    holidays_table.add_column("必填", style="red")
    holidays_table.add_column("说明", style="dim")
    holidays_table.add_row("日期", "date", "✅", "格式: 2024-01-01")
    holidays_table.add_row("节假日名称", "string", "✅", "如: 元旦")
    holidays_table.add_row("是否高峰", "boolean", "⬜", "是否为业务高峰日")
    holidays_table.add_row("来电倍数", "number", "⬜", "相对于平日的来电倍数")
    console.print(holidays_table)

    sample_dir = os.path.join(os.path.dirname(__file__), '..', 'samples')
    console.print(f"\n💡 样例数据位置: {sample_dir}", style="dim")
    console.print("🚀 快速体验: qs load --samples && qs simulate", style="bold green")


def main():
    try:
        cli(obj={})
    except KeyboardInterrupt:
        console.print("\n👋 用户中断操作，程序退出", style="yellow")
        sys.exit(0)
