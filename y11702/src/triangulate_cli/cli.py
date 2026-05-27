from __future__ import annotations

import os
import sys

import click

from . import __version__
from .outlier import remove_outliers
from .parser import parse_file
from .report import generate_report
from .triangulation import Triangulator
from .visualization import create_map_plot


@click.group()
@click.version_option(__version__, prog_name="triangulate")
def cli():
    """三角测量定位CLI工具 - 用于无线电测向定位计算"""
    pass


@cli.command()
@click.argument("input_file", type=click.Path(exists=True, readable=True))
@click.option(
    "--output",
    "-o",
    type=click.Path(),
    help="输出目录路径",
    default="output",
)
@click.option(
    "--no-outlier",
    is_flag=True,
    help="禁用离群值检测",
)
@click.option(
    "--residual-threshold",
    type=float,
    default=50.0,
    help="离群值检测残差阈值",
)
@click.option(
    "--confidence",
    type=float,
    default=0.95,
    help="置信水平 (0.68, 0.95, 0.99)",
)
@click.option(
    "--report-format",
    type=click.Choice(["text", "json", "both"]),
    default="text",
    help="报告输出格式",
)
@click.option(
    "--no-map",
    is_flag=True,
    help="不生成地图图片",
)
@click.option(
    "--dpi",
    type=int,
    default=150,
    help="地图图片DPI",
)
@click.option(
    "--quiet",
    "-q",
    is_flag=True,
    help="静默模式，只输出结果",
)
def run(
    input_file,
    output,
    no_outlier,
    residual_threshold,
    confidence,
    report_format,
    no_map,
    dpi,
    quiet,
):
    """执行三角测量定位计算

    INPUT_FILE: 输入观测数据文件路径
    """
    if not quiet:
        click.echo(f"正在读取输入文件: {input_file}")

    input_data, parse_errors, parse_warnings = parse_file(input_file)

    if parse_errors:
        click.echo(f"发现 {len(parse_errors)} 个解析错误:", err=True)
        for err in parse_errors:
            click.echo(f"  ✗ {err}", err=True)
        if not quiet:
            click.echo("")

    if parse_warnings and not quiet:
        click.echo(f"发现 {len(parse_warnings)} 个警告:")
        for w in parse_warnings:
            click.echo(f"  ⚠ {w}")
        click.echo("")

    if len(input_data.observations) < 2:
        click.echo("错误: 至少需要2个观测点才能进行三角测量", err=True)
        sys.exit(1)

    if not quiet:
        click.echo(f"读取到 {len(input_data.observations)} 个观测点")

    algorithm_warnings = []

    if not no_outlier and len(input_data.observations) >= 3:
        if not quiet:
            click.echo("正在进行离群值检测...")
        inliers, outliers, outlier_warnings = remove_outliers(
            input_data.observations,
            residual_threshold=residual_threshold,
        )
        algorithm_warnings.extend(outlier_warnings)
        if outliers and not quiet:
            click.echo(f"检测到 {len(outliers)} 个离群值")
    else:
        inliers = input_data.observations

    if not quiet:
        click.echo("正在执行三角测量计算...")

    triangulator = Triangulator(inliers)

    try:
        result = triangulator.triangulate(
            map_bounds=input_data.map_bounds,
            confidence_level=confidence,
        )
    except ValueError as e:
        click.echo(f"计算错误: {e}", err=True)
        sys.exit(1)

    algorithm_warnings.extend(triangulator.warnings)

    if algorithm_warnings and not quiet:
        click.echo("")
        click.echo("算法警告:")
        for w in algorithm_warnings:
            click.echo(f"  ⚠ [{w.severity}] {w.message}")

    if not quiet:
        click.echo("")
        click.echo("=" * 50)
        click.echo("定位结果:")
        click.echo(f"  估计位置: ({result.estimated_position.x:.4f}, {result.estimated_position.y:.4f})")
        click.echo(f"  置信度: {result.confidence_score * 100:.1f}%")
        click.echo(f"  使用观测: {len(result.used_observations)}/{len(input_data.observations)}")
        if result.error_ellipse:
            click.echo(f"  误差椭圆: 长轴={result.error_ellipse.major_axis:.4f}, "
                       f"短轴={result.error_ellipse.minor_axis:.4f}")
        click.echo("=" * 50)

    os.makedirs(output, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(input_file))[0]

    if report_format in ["text", "both"]:
        report_path = os.path.join(output, f"{base_name}_report.txt")
        generate_report(
            report_path,
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
            fmt="text",
            title=f"{base_name} 三角测量定位报告",
        )
        if not quiet:
            click.echo(f"文本报告已保存: {report_path}")

    if report_format in ["json", "both"]:
        json_path = os.path.join(output, f"{base_name}_report.json")
        generate_report(
            json_path,
            result,
            input_data,
            parse_errors,
            parse_warnings,
            algorithm_warnings,
            fmt="json",
        )
        if not quiet:
            click.echo(f"JSON报告已保存: {json_path}")

    if not no_map:
        map_path = os.path.join(output, f"{base_name}_map.png")
        create_map_plot(
            map_path,
            result,
            input_data.observations,
            input_data.map_bounds,
            dpi=dpi,
        )
        if not quiet:
            click.echo(f"地图已保存: {map_path}")

    if not quiet:
        click.echo("")
        click.echo("✓ 处理完成!")


@cli.command()
@click.argument("input_file", type=click.Path(exists=True, readable=True))
def validate(input_file):
    """验证输入数据格式

    INPUT_FILE: 输入观测数据文件路径
    """
    click.echo(f"正在验证: {input_file}")
    click.echo("")

    input_data, parse_errors, parse_warnings = parse_file(input_file)

    if parse_errors:
        click.echo(f"❌ 发现 {len(parse_errors)} 个错误:")
        for err in parse_errors:
            click.echo(f"   {err}")
        click.echo("")
    else:
        click.echo("✓ 解析无错误")

    if parse_warnings:
        click.echo(f"⚠ 发现 {len(parse_warnings)} 个警告:")
        for w in parse_warnings:
            click.echo(f"   {w}")
        click.echo("")

    click.echo(f"观测点数量: {len(input_data.observations)}")

    for i, obs in enumerate(input_data.observations, 1):
        click.echo(f"  {i}. {obs.station_id}: "
                   f"位置({obs.position.x:.2f}, {obs.position.y:.2f}), "
                   f"方位角 {obs.bearing.angle:.2f} {obs.bearing.unit.value} "
                   f"(来源: {obs.source})")

    if input_data.map_bounds:
        click.echo(f"地图边界: X[{input_data.map_bounds.min_x}, {input_data.map_bounds.max_x}], "
                   f"Y[{input_data.map_bounds.min_y}, {input_data.map_bounds.max_y}]")

    if len(input_data.observations) >= 2:
        click.echo("")
        click.echo("✓ 数据有效，可以进行三角测量计算")
    else:
        click.echo("")
        click.echo("⚠ 观测点不足，需要至少2个观测点")


@cli.command()
@click.option(
    "--output",
    "-o",
    type=click.Path(),
    help="输出文件路径",
    default="example_observations.txt",
)
def example(output):
    """生成示例输入文件"""
    content = """# 三角测量定位示例输入文件
# 格式说明:
# - 使用 [section] 标记区域
# - 以 # 开头的行为注释
# - 观测数据格式: 测站ID, X坐标, Y坐标, 方位角[单位], [误差], [备注]
#   支持的角度单位: deg/°, rad, grad, mil/mils

[metadata]
coord_system = cartesian
description = 示例观测数据

[map]
name = 测试区域
bounds = 0, 1000, 0, 1000

[observations]
# 格式: 测站ID, X, Y, 方位角, 误差, 备注
A, 100, 100, 45deg, 2, 北侧测站
B, 900, 100, 135°, 2, 东北侧测站
C, 500, 900, 270deg, 3, 南侧测站
D, 200, 500, 80deg, 2, 西侧测站
"""
    with open(output, "w", encoding="utf-8") as f:
        f.write(content)
    click.echo(f"✓ 示例文件已生成: {output}")


if __name__ == "__main__":
    cli()
