"""命令行入口：热泵循环阈值预警。

用法：
  python -m heatpump_alert.cli --input ./input --output ./output
  python -m heatpump_alert.cli -i ./input -o ./output
"""
import os
import sys
import click

from .data_loader import load_nameplate, load_samples, load_note
from .alert_engine import run_alert
from .output_writer import write_outputs, format_terminal_summary
from .chart_generator import generate_charts


@click.command()
@click.option("-i", "--input", "input_dir", default="./input",
              show_default=True, help="输入目录路径（含设备铭牌、样本数据、后补说明）")
@click.option("-o", "--output", "output_dir", default="./output",
              show_default=True, help="输出目录路径（摘要、明细、图表、异常分目录存放）")
@click.option("--no-chart", is_flag=True, help="不生成图表")
@click.option("--quiet", is_flag=True, help="静默模式，不打印终端摘要")
def main(input_dir: str, output_dir: str, no_chart: bool, quiet: bool):
    """热泵循环阈值预警 — 设备运行参数版本可追溯。

    输入目录应包含：
    - nameplate.csv / nameplate.xlsx  设备铭牌数据
    - samples.csv / samples.xlsx      循环样本数据
    - note.txt（可选）                后补说明
    """
    input_dir = os.path.abspath(input_dir)
    output_dir = os.path.abspath(output_dir)

    if not os.path.isdir(input_dir):
        click.echo(f"错误：输入目录不存在 — {input_dir}", err=True)
        sys.exit(1)

    try:
        nameplate_df = load_nameplate(input_dir)
    except FileNotFoundError as e:
        click.echo(f"错误：{e}", err=True)
        sys.exit(1)

    try:
        samples_df = load_samples(input_dir)
    except FileNotFoundError as e:
        click.echo(f"错误：{e}", err=True)
        sys.exit(1)

    note = load_note(input_dir)
    details_df, summary = run_alert(samples_df, nameplate_df)
    files, summary_text, output_dirs = write_outputs(output_dir, details_df, summary, note)

    if not no_chart:
        charts = generate_charts(output_dirs, details_df, summary)
        files.update({f"图表-{k}": v for k, v in charts.items() if v})

    if not quiet:
        click.echo(summary_text)
        click.echo()
        click.echo("生成的输出文件：")
        for name, path in files.items():
            click.echo(f"  [{name}]  {path}")
    else:
        print(files["JSON结果"])


if __name__ == "__main__":
    main()
