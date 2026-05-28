#!/usr/bin/env python3
import click
import os
import sys
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from water_rocket_analyzer.core.data_loader import DataLoader, FlightData
from water_rocket_analyzer.core.physics_model import PhysicsModel, PhysicsParameters
from water_rocket_analyzer.core.trajectory_fitter import TrajectoryFitter, FitConfig
from water_rocket_analyzer.core.anomaly_detector import AnomalyDetector
from water_rocket_analyzer.core.animation_player import AnimationPlayer
from water_rocket_analyzer.core.report_generator import ReportGenerator

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """🚀 水火箭飞行分析工具 - 从高度记录估算初速度、阻力和落地时间"""
    pass


@cli.command()
@click.argument('data_file', type=click.Path(exists=True))
@click.option('--metadata', '-m', type=click.Path(exists=True), help='元数据JSON文件路径')
@click.option('--output', '-o', type=click.Path(), help='输出目录', default='output')
@click.option('--no-plot', is_flag=True, help='不显示图表')
@click.option('--no-animation', is_flag=True, help='不生成动画')
@click.option('--verbose', '-v', is_flag=True, help='显示详细信息')
def analyze(data_file, metadata, output, no_plot, no_animation, verbose):
    """分析水火箭飞行数据并生成完整报告"""
    console.print(Panel.fit(
        "[bold blue]🚀 水火箭飞行分析器[/bold blue]\n"
        f"数据文件: [cyan]{data_file}[/cyan]",
        border_style="blue"
    ))

    os.makedirs(output, exist_ok=True)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:

        task1 = progress.add_task("加载数据...", total=100)
        loader = DataLoader()
        flight_data = loader.load_csv(data_file, metadata)
        progress.update(task1, advance=100)

        task2 = progress.add_task("异常检测与数据清洗...", total=100)
        detector = AnomalyDetector()
        anomaly_report = detector.detect_and_fix(flight_data)
        quality_score = detector.get_data_quality_score(flight_data)
        progress.update(task2, advance=100)

        task3 = progress.add_task("参数拟合...", total=100)
        params = PhysicsParameters(
            rocket_mass=flight_data.metadata.rocket_mass,
            rocket_diameter=flight_data.metadata.rocket_diameter,
            wind_speed=flight_data.metadata.wind_speed,
            wind_direction=flight_data.metadata.wind_direction
        )
        physics_model = PhysicsModel(params)
        fitter = TrajectoryFitter(physics_model)

        fit_config = FitConfig(
            fixed_launch_angle=flight_data.metadata.launch_angle
        )
        fit_result = fitter.fit(flight_data, fit_config)
        progress.update(task3, advance=100)

        task4 = progress.add_task("敏感性分析...", total=100)
        sensitivity = fitter.sensitivity_analysis(flight_data, fit_config)
        progress.update(task4, advance=100)

        task5 = progress.add_task("生成图表...", total=100)
        if not no_plot:
            player = AnimationPlayer()
            player.output_dir = output
            player.create_comparison_plot(flight_data, fit_result)
            if not no_animation:
                try:
                    player.create_flight_animation(
                        flight_data, fit_result,
                        show_plots=False,
                        output_path=os.path.join(output, "flight_animation.gif")
                    )
                except Exception as e:
                    console.print(f"[yellow]⚠️  动画生成失败: {e}[/yellow]")
        progress.update(task5, advance=100)

        task6 = progress.add_task("生成报告...", total=100)
        reporter = ReportGenerator(output_dir=output)
        report_path = reporter.generate_markdown_report(
            flight_data, fit_result, anomaly_report, quality_score, sensitivity
        )
        progress.update(task6, advance=100)

    _print_summary(flight_data, fit_result, anomaly_report, quality_score, report_path)

    console.print(f"\n✅ 分析完成！报告已保存至: [green]{report_path}[/green]")
    console.print(f"📊 输出目录: [cyan]{output}[/cyan]")


def _print_summary(flight_data, fit_result, anomaly_report, quality_score, report_path):
    console.print("\n" + "=" * 60)
    console.print("[bold]📋 分析结果摘要[/bold]")
    console.print("=" * 60)

    console.print(f"\n[bold blue]🎯 关键参数[/bold blue]")
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("参数")
    table.add_column("估算值", justify="right")
    table.add_column("置信区间", justify="right")
    table.add_row(
        "初速度 v₀",
        f"{fit_result.initial_velocity:.2f} m/s",
        f"[{fit_result.confidence_interval['v0'][0]:.2f}, {fit_result.confidence_interval['v0'][1]:.2f}]"
    )
    table.add_row(
        "阻力系数 C_d",
        f"{fit_result.drag_coefficient:.4f}",
        f"[{fit_result.confidence_interval['Cd'][0]:.4f}, {fit_result.confidence_interval['Cd'][1]:.4f}]"
    )
    table.add_row("发射角", f"{fit_result.launch_angle:.1f}°", "-")
    console.print(table)

    console.print(f"\n[bold blue]📈 轨迹预测[/bold blue]")
    traj = fit_result.fitted_trajectory
    table2 = Table(show_header=True, header_style="bold magenta")
    table2.add_column("指标")
    table2.add_column("值", justify="right")
    table2.add_row("最大高度", f"{traj.max_height:.2f} m")
    table2.add_row("到达最高点时间", f"{traj.max_height_time:.2f} s")
    table2.add_row("落地时间", f"{traj.landing_time:.2f} s")
    table2.add_row("飞行时间", f"{traj.flight_duration:.2f} s")
    table2.add_row("落地点", f"({traj.landing_position[0]:.1f}, {traj.landing_position[1]:.1f}) m")
    console.print(table2)

    console.print(f"\n[bold blue]✅ 拟合质量[/bold blue]")
    table3 = Table(show_header=True, header_style="bold magenta")
    table3.add_column("指标")
    table3.add_column("值", justify="right")
    table3.add_column("评价", justify="center")
    rmse_rating = "🟢 优秀" if fit_result.rmse < 0.5 else "🟡 良好" if fit_result.rmse < 2 else "🟠 一般"
    r2_rating = "🟢 优秀" if fit_result.r_squared > 0.95 else "🟡 良好" if fit_result.r_squared > 0.85 else "🟠 一般"
    table3.add_row("RMSE", f"{fit_result.rmse:.3f} m", rmse_rating)
    table3.add_row("R²", f"{fit_result.r_squared:.4f}", r2_rating)
    console.print(table3)

    console.print(f"\n[bold yellow]⚠️  异常检测[/bold yellow]")
    console.print(f"  总异常数: {anomaly_report.total_anomalies}")
    console.print(f"  自动修复: [green]{anomaly_report.auto_fixed_count}[/green]")
    console.print(f"  待人工确认: [red]{anomaly_report.needs_review_count}[/red]")

    console.print(f"\n[bold cyan]📊 数据质量评级: {quality_score['grade']}[/bold cyan]")
    console.print(f"  综合得分: {quality_score['overall_score']:.2f}/1.0")


@cli.command()
@click.argument('data_file', type=click.Path(exists=True))
@click.option('--v0', type=float, required=True, help='初速度 (m/s)')
@click.option('--cd', type=float, default=0.4, help='阻力系数')
@click.option('--angle', type=float, default=90.0, help='发射角 (度)')
@click.option('--wind', type=float, default=0.0, help='风速 (m/s)')
@click.option('--mass', type=float, default=0.5, help='火箭质量 (kg)')
@click.option('--output', '-o', type=click.Path(), help='输出目录', default='output')
def simulate(data_file, v0, cd, angle, wind, mass, output):
    """使用指定参数模拟水火箭飞行轨迹"""
    console.print(Panel.fit(
        "[bold green]🛸 轨迹模拟器[/bold green]\n"
        f"v₀ = {v0} m/s | C_d = {cd} | angle = {angle}°",
        border_style="green"
    ))

    params = PhysicsParameters(
        Cd=cd,
        rocket_mass=mass,
        wind_speed=wind
    )
    physics = PhysicsModel(params)

    result = physics.simulate_trajectory(v0, angle)

    console.print("\n[bold]模拟结果:[/bold]")
    table = Table(show_header=True, header_style="bold green")
    table.add_column("指标")
    table.add_column("值", justify="right")
    table.add_row("最大高度", f"{result.max_height:.2f} m")
    table.add_row("到达最高点时间", f"{result.max_height_time:.2f} s")
    table.add_row("落地时间", f"{result.landing_time:.2f} s")
    table.add_row("总飞行时间", f"{result.flight_duration:.2f} s")
    table.add_row("水平落地点", f"({result.landing_position[0]:.2f}, {result.landing_position[1]:.2f}) m")
    console.print(table)

    loader = DataLoader()
    flight_data = loader.load_csv(data_file)

    os.makedirs(output, exist_ok=True)
    player = AnimationPlayer()
    player.output_dir = output

    from water_rocket_analyzer.core.trajectory_fitter import FitResult
    dummy_fit = FitResult(
        initial_velocity=v0,
        drag_coefficient=cd,
        launch_angle=angle,
        rmse=0,
        r_squared=1,
        max_height_error=0,
        landing_time_error=0,
        fitted_trajectory=result
    )

    plot_path = player.create_comparison_plot(flight_data, dummy_fit)
    console.print(f"\n✅ 对比图已保存: [green]{plot_path}[/green]")


@cli.command()
@click.argument('output_dir', type=click.Path(), default='data')
def sample(output_dir):
    """生成示例数据文件用于测试"""
    import pandas as pd
    import numpy as np

    os.makedirs(output_dir, exist_ok=True)

    v0 = 35.0
    cd = 0.42
    angle = 85.0

    params = PhysicsParameters(Cd=cd, rocket_mass=0.5)
    physics = PhysicsModel(params)
    traj = physics.simulate_trajectory(v0, angle)

    times = np.array([p.time for p in traj.points])
    heights = np.array([p.z for p in traj.points])

    sample_times = np.arange(0, times[-1], 0.05)
    sample_heights = np.interp(sample_times, times, heights)

    np.random.seed(42)
    noise = np.random.normal(0, 0.3, size=len(sample_heights))
    sample_heights_noisy = sample_heights + noise

    spike_idx = int(len(sample_times) * 0.4)
    sample_heights_noisy[spike_idx] += 8.0

    df = pd.DataFrame({
        'time': sample_times,
        'altitude': sample_heights_noisy,
        'water_volume': 500,
        'launch_angle': angle,
        'wind_speed': 2.5,
        'air_pressure': 101325
    })

    sample_path = os.path.join(output_dir, 'sample_flight_data.csv')
    df.to_csv(sample_path, index=False)

    meta = {
        "water_volume": 500,
        "launch_angle": angle,
        "wind_speed": 2.5,
        "wind_direction": 45,
        "air_pressure": 101325,
        "rocket_mass": 0.5,
        "rocket_diameter": 0.09,
        "notes": "示例测试数据，包含模拟噪声和人工异常点",
        "actual_v0": v0,
        "actual_Cd": cd
    }
    import json
    with open(os.path.join(output_dir, 'sample_metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    console.print(f"✅ 示例数据已生成: [green]{sample_path}[/green]")
    console.print(f"   真实参数: v₀={v0} m/s, C_d={cd}")
    console.print(f"\n💡 运行测试: [cyan]python cli.py analyze {sample_path}[/cyan]")


@cli.command()
@click.argument('data_file', type=click.Path(exists=True))
def inspect(data_file):
    """快速查看数据文件基本信息"""
    loader = DataLoader()
    flight_data = loader.load_csv(data_file)

    console.print(Panel.fit(
        f"[bold]📊 数据文件: {Path(data_file).name}[/bold]",
        border_style="cyan"
    ))

    table = Table(show_header=True, header_style="bold cyan")
    table.add_column("项目")
    table.add_column("值", justify="right")
    table.add_row("数据点数", str(len(flight_data.data_points)))
    table.add_row("记录时长", f"{flight_data.time_series[-1]:.2f} s")
    table.add_row("采样频率", f"{len(flight_data.data_points) / flight_data.time_series[-1]:.1f} Hz")
    table.add_row("最大高度", f"{np.max(flight_data.altitude_series):.2f} m")
    table.add_row("最小高度", f"{np.min(flight_data.altitude_series):.2f} m")
    table.add_row("平均高度", f"{np.mean(flight_data.altitude_series):.2f} m")
    console.print(table)

    console.print("\n[bold]元数据:[/bold]")
    meta = flight_data.metadata
    console.print(f"  装水量: {meta.water_volume} mL")
    console.print(f"  发射角: {meta.launch_angle}°")
    console.print(f"  风速: {meta.wind_speed} m/s")
    console.print(f"  气压: {meta.air_pressure} Pa")
    console.print(f"  火箭质量: {meta.rocket_mass} kg")


if __name__ == '__main__':
    cli()
