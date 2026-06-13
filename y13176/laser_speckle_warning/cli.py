from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click

from .core import (
    list_available_versions,
    run_chain,
    shift_param_tier,
)
from .core.param_versioning import ResultHistory
from .core.warning_calculator import compare_results


@click.group()
@click.version_option(package_name="laser-speckle-warning", prog_name="laser-speckle-warning")
def main() -> None:
    """激光散斑阈值预警处理链"""
    pass


@main.command("run")
@click.option(
    "--input-dir", "-i",
    required=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输入目录（需包含 materials/ 与可选的 photos/ 子目录）",
)
@click.option(
    "--output-dir", "-o",
    required=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输出目录（终端摘要与接口返回分别写入不同文件）",
)
@click.option(
    "--param", "-p", "param_tag",
    default="v1.1-normal",
    show_default=True,
    help="参数版本标签，使用 list-params 查看可用版本",
)
@click.option(
    "--allow-gap/--no-allow-gap",
    default=False,
    show_default=True,
    help="存在采样缺口时是否强制继续计算",
)
@click.option(
    "--expected-samples",
    type=int,
    default=None,
    help="期望的样本总数（用于检测位置缺失）",
)
@click.option(
    "--quiet", "-q",
    is_flag=True,
    help="仅写入文件，不在终端打印摘要",
)
def run(
    input_dir: Path,
    output_dir: Path,
    param_tag: str,
    allow_gap: bool,
    expected_samples: Optional[int],
    quiet: bool,
) -> None:
    """执行一次完整的激光散斑阈值预警处理链。

    终端摘要写入 <output-dir>/terminal_summary.txt，
    结构化接口返回写入 <output-dir>/interface_response.json，二者不混用。
    """
    summary, response, _steps = run_chain(
        input_dir=input_dir,
        output_dir=output_dir,
        param_tag=param_tag,
        allow_gap_calculation=allow_gap,
        expected_sample_count=expected_samples,
    )
    if not quiet:
        click.echo(summary.render())
        click.echo(f"[接口返回] 已写入 {output_dir / 'interface_response.json'}")
        click.echo(f"[终端摘要] 已写入 {output_dir / 'terminal_summary.txt'}")
    if response.overall_status.value in ("采样缺口暂停", "待人工确认"):
        sys.exit(2)


@main.command("list-params")
def list_params() -> None:
    """列出所有可用的参数版本"""
    for v in list_available_versions():
        click.echo(f"- {v['version_tag']}: {v['description']}")
        click.echo(f"    公式: {v['formula']}")


@main.command("shift")
@click.option(
    "--output-dir", "-o",
    required=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="同一次任务的输出目录（包含 history/）",
)
@click.option(
    "--input-dir", "-i",
    required=True,
    type=click.Path(file_okay=False, path_type=Path),
    help="输入目录（同 run 命令）",
)
@click.option(
    "--direction", "-d",
    type=click.Choice(["up", "down"]),
    default="up",
    show_default=True,
    help="参数调档方向：up=收紧一档，down=放宽一档",
)
@click.option(
    "--allow-gap/--no-allow-gap",
    default=False,
    show_default=True,
)
def shift(
    output_dir: Path,
    input_dir: Path,
    direction: str,
    allow_gap: bool,
) -> None:
    """基于上一次计算的参数版本调档后复算，并输出变化原因报告。"""
    history = ResultHistory(output_dir)
    last = history.latest()
    if last is None:
        raise click.ClickException("未找到历史计算结果，请先使用 run 命令执行一次计算")
    _prev_result, prev_params = last
    new_params = shift_param_tier(prev_params.version_tag, 1 if direction == "up" else -1)
    click.echo(f"参数调档: {prev_params.version_tag} -> {new_params.version_tag}")
    click.echo(f"调档说明: {new_params.description}")

    summary, response, _ = run_chain(
        input_dir=input_dir,
        output_dir=output_dir,
        param_tag=new_params.version_tag,
        allow_gap_calculation=allow_gap,
    )
    click.echo(summary.render())

    latest = history.latest()
    if latest and last:
        diff = compare_results(last[0], latest[0], last[1], latest[1])
        click.echo("")
        click.echo("=" * 60)
        click.echo("参数调档后结果变化分析")
        click.echo("=" * 60)
        for k, v in diff.items():
            click.echo(f"  [{k}]")
            if isinstance(v, list):
                for item in v:
                    click.echo(f"    - {item}")
            elif isinstance(v, dict):
                for dk, dv in v.items():
                    if isinstance(dv, tuple) and len(dv) == 2:
                        click.echo(f"    - {dk}: {dv[0]} -> {dv[1]}")
                    else:
                        click.echo(f"    - {dk}: {dv}")
            else:
                click.echo(f"    {v}")


@main.command("report")
@click.option(
    "--output-dir", "-o",
    required=True,
    type=click.Path(file_okay=False, path_type=Path),
)
def report(output_dir: Path) -> None:
    """打印最近一次接口返回的要点，适合接手同事快速了解状态。"""
    iface_path = output_dir / "interface_response.json"
    if not iface_path.exists():
        raise click.ClickException(f"未找到接口返回文件: {iface_path}")
    from .core import InterfaceResponse
    response = InterfaceResponse.load_json(iface_path)
    click.echo(f"运行ID: {response.chain_run_id}")
    click.echo(f"整体状态: {response.overall_status.value}")
    click.echo(f"使用参数: {response.param_version_used}")
    click.echo(f"历史版本: {' <- '.join(response.param_version_history) or '(无)'}")
    if response.warning_result:
        r = response.warning_result
        click.echo(f"预警级别: {r.warning_level.value}")
        click.echo(f"公式: {r.formula_used}")
        click.echo(f"阈值={r.threshold_value} {r.intensity_unit}  "
                   f"均值={r.average_intensity}  最大={r.max_intensity}")
        if r.boundary_samples:
            click.echo("  边界样本:")
            for b in r.boundary_samples[:3]:
                click.echo(f"    {b.position_label}: 强度={b.speckle_intensity}, "
                           f"距阈值={b.distance_to_threshold:+.2f} - {b.note}")
    click.echo("")
    click.echo(f"[已处理] {len(response.processed)} 项")
    for item in response.processed:
        click.echo(f"  - [{item.kind}] {item.display_name} ({item.status})")
    click.echo("")
    click.echo(f"[待补材料] {len(response.pending_materials)} 项")
    for item in response.pending_materials:
        click.echo(f"  - [{item.kind}] {item.identifier}: {item.reason}")
        click.echo(f"      操作: {item.required_action}")
        click.echo(f"      影响: {item.affected_scope}")
    click.echo("")
    click.echo(f"[人工改判] {len(response.manual_judgments)} 项")
    for mj in response.manual_judgments:
        click.echo(f"  - {mj.item_ref}: {mj.original_level.value} -> {mj.overridden_level.value} "
                   f"({mj.operator}: {mj.reason})")


if __name__ == "__main__":
    main()
