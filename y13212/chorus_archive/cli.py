from pathlib import Path
from datetime import datetime

import click

from .archiver import archive_voice_parts
from .report import generate_html_report
from .screenshot import take_screenshot


def _print_divider(char="─", length=60):
    click.echo(char * length)


def _print_section(title):
    _print_divider("═")
    click.echo(f"  {title}")
    _print_divider("═")


def _print_stat(label, value, color=None):
    label_str = f"{label}："
    value_str = str(value)
    if color:
        value_str = click.style(value_str, fg=color, bold=True)
    click.echo(f"    {label_str:<12}{value_str}")


def _print_delivery_note(result, html_path, screenshot_path):
    click.echo()
    _print_section("交付说明")
    click.echo()
    click.echo("  录音师老许您好，以下是归档交付物清单：")
    click.echo()
    click.echo("  1. 合同扫描件")
    click.echo("     请与本次归档的曲目表原件一并存放")
    click.echo()
    click.echo("  2. 声部清单处理记录")
    _print_stat("     已处理", f"{result.processed} 条", "green")
    _print_stat("     坏行", f"{result.bad_lines} 条", "red")
    _print_stat("     跳过", f"{result.skipped_lines} 条", "yellow")
    _print_stat("     时码偏差", f"{result.timecode_off_lines} 条", "magenta")
    _print_stat("     人工改判", f"{result.manual_overridden_lines} 条", "blue")
    click.echo()
    click.echo("  3. 归档页面与截图")
    if html_path:
        click.echo(f"     HTML 页面：{html_path}")
    if screenshot_path:
        click.echo(f"     截图文件：{screenshot_path}")
    else:
        click.echo("     截图：未生成（未安装 playwright 或截图失败）")
    click.echo()
    if result.authorization_note:
        click.echo("  4. 授权备注")
        click.echo(f"     {result.authorization_note}")
        click.echo()
    click.echo("  核对方式：截图上的状态标签、数量统计应与本 CLI 输出完全一致。")
    click.echo("  如需出示给他人，提供截图 + 本 CLI 输出记录即可。")
    click.echo()


@click.command()
@click.option(
    "--parts", "-p",
    required=True,
    type=click.Path(exists=True),
    help="声部清单文件（CSV 或 Excel）"
)
@click.option(
    "--auth", "-a",
    type=click.Path(exists=True),
    default=None,
    help="授权备注文件（CSV/Excel/TXT）"
)
@click.option(
    "--manual", "-m",
    type=click.Path(exists=True),
    default=None,
    help="人工改判文件（CSV 或 Excel）"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    default="output",
    help="输出目录，默认 output/"
)
@click.option(
    "--no-screenshot",
    is_flag=True,
    default=False,
    help="不生成浏览器截图"
)
def main(parts, auth, manual, output, no_screenshot):
    """合唱声部清单归档工具"""

    click.echo()
    _print_section("合唱声部清单归档")
    click.echo(f"  开始时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo(f"  声部清单：{parts}")
    if auth:
        click.echo(f"  授权备注：{auth}")
    if manual:
        click.echo(f"  人工改判：{manual}")
    click.echo()

    result = archive_voice_parts(
        parts_file=parts,
        auth_file=auth,
        manual_file=manual,
        output_dir=output,
    )

    _print_section("归档统计")
    click.echo()
    _print_stat("总记录数", f"{result.total} 条")
    _print_stat("已处理", f"{result.processed} 条", "green")
    _print_stat("坏行", f"{result.bad_lines} 条", "red")
    _print_stat("跳过", f"{result.skipped_lines} 条", "yellow")
    _print_stat("时码偏差", f"{result.timecode_off_lines} 条", "magenta")
    _print_stat("人工改判", f"{result.manual_overridden_lines} 条", "blue")
    click.echo()

    if result.timecode_off_records:
        _print_section("时码偏差记录（单独拎出）")
        click.echo()
        for p in result.timecode_off_records:
            status_info = p.status.value
            if p.is_manual_overridden:
                status_info = f"{p.original_status.value} → {p.status.value}"
            click.echo(f"  [{p.track_no}] {p.part_name} - {p.singer}")
            click.echo(f"      时码：{p.timecode}（偏差：{p.timecode_deviation}）")
            if p.manual_note:
                click.echo(f"      人工改判：{p.manual_note}")
            click.echo(f"      状态：{status_info}")
            click.echo()

    if result.manual_overridden_records:
        _print_section("人工改判记录（与结论关联）")
        click.echo()
        for p in result.manual_overridden_records:
            click.echo(f"  [{p.track_no}] {p.part_name} - {p.singer}")
            click.echo(f"      原状态：{p.original_status.value}")
            click.echo(f"      现状态：{p.status.value}")
            click.echo(f"      改判说明：{p.manual_note or '（无）'}")
            click.echo()

    if result.bad_records:
        _print_section("坏行明细")
        click.echo()
        for r in result.bad_records:
            click.echo(f"  第 {r['行号']} 行：{r['原因']}")
            click.echo(f"      曲目编号={r['曲目编号'] or '空'}  声部={r['声部'] or '空'}  演唱者={r['演唱者'] or '空'}")
        click.echo()

    if result.skipped_records:
        _print_section("跳过行明细")
        click.echo()
        for r in result.skipped_records:
            click.echo(f"  第 {r['行号']} 行：[{r['曲目编号']}] {r['声部']} - {r['演唱者']}")
            click.echo(f"      原因：{r['原因']}")
        click.echo()

    output_dir = Path(output)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    html_path = str(output_dir / f"archive_{timestamp}.html")
    screenshot_path = str(output_dir / f"archive_{timestamp}.png")

    html_file = generate_html_report(result, html_path)
    result.output_html = html_file

    screenshot_file = None
    if not no_screenshot:
        screenshot_file = take_screenshot(html_file, screenshot_path)
        if screenshot_file:
            result.output_screenshot = screenshot_file

    _print_delivery_note(result, html_file, screenshot_file)

    _print_section("归档完成")
    click.echo(f"  完成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    click.echo()


if __name__ == "__main__":
    main()
