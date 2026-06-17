"""命令行入口：热泵循环阈值预警。

用法：
  python -m heatpump_alert.cli --input ./input --output ./output
  python -m heatpump_alert.cli -i ./input -o ./output

退出码：
  0 = 全部成功
  1 = 输入数据校验失败（列缺失、文件找不到等）
  2 = 输出写入失败（磁盘、权限等）
  3 = 其他运行时异常
"""
import os
import sys
import traceback
import click

from .data_loader import (
    load_nameplate, load_samples, load_note,
    DataValidationError,
)
from .alert_engine import run_alert
from .output_writer import write_outputs, OutputWriteError
from .chart_generator import generate_charts


EXIT_OK = 0
EXIT_INPUT_ERROR = 1
EXIT_OUTPUT_ERROR = 2
EXIT_RUNTIME_ERROR = 3


@click.command()
@click.option("-i", "--input", "input_dir", default="./input",
              show_default=True, help="输入目录路径（含设备铭牌、样本数据、后补说明）")
@click.option("-o", "--output", "output_dir", default="./output",
              show_default=True, help="输出目录路径（摘要、明细、图表、异常分目录存放）")
@click.option("--no-chart", is_flag=True, help="不生成图表")
@click.option("--quiet", is_flag=True, help="静默模式，成功时只输出 JSON 路径，失败时仍打印错误")
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
        click.echo(
            f"\n[输入错误] 输入目录不存在：{input_dir}\n"
            f"请先创建该目录，并放入：\n"
            f"  - nameplate.csv（设备铭牌）\n"
            f"  - samples.csv（循环样本）\n"
            f"  - note.txt（可选，后补说明）\n"
            f"详细格式参考：运营接手指南.md",
            err=True
        )
        sys.exit(EXIT_INPUT_ERROR)

    try:
        nameplate_df = load_nameplate(input_dir)
    except DataValidationError as e:
        click.echo(f"\n[输入错误] {e}", err=True)
        sys.exit(EXIT_INPUT_ERROR)
    except Exception as e:
        click.echo(f"\n[运行错误] 加载设备铭牌时发生未预期异常：{e}", err=True)
        click.echo(traceback.format_exc(), err=True)
        sys.exit(EXIT_RUNTIME_ERROR)

    try:
        samples_df = load_samples(input_dir)
    except DataValidationError as e:
        click.echo(f"\n[输入错误] {e}", err=True)
        sys.exit(EXIT_INPUT_ERROR)
    except Exception as e:
        click.echo(f"\n[运行错误] 加载样本数据时发生未预期异常：{e}", err=True)
        click.echo(traceback.format_exc(), err=True)
        sys.exit(EXIT_RUNTIME_ERROR)

    try:
        note = load_note(input_dir)
    except DataValidationError as e:
        click.echo(f"\n[输入警告（不阻断）] {e}", err=True)
        note = ""

    try:
        details_df, summary = run_alert(samples_df, nameplate_df)
    except Exception as e:
        click.echo(f"\n[运行错误] 预警计算失败：{e}", err=True)
        click.echo(traceback.format_exc(), err=True)
        sys.exit(EXIT_RUNTIME_ERROR)

    try:
        files, summary_text, output_dirs, write_errors = write_outputs(
            output_dir, details_df, summary, note
        )
    except OutputWriteError as e:
        click.echo(f"\n[输出错误] {e}", err=True)
        if e.written_files:
            click.echo("已部分写入的文件：", err=True)
            for k, v in e.written_files.items():
                click.echo(f"  [{k}] {v}", err=True)
        sys.exit(EXIT_OUTPUT_ERROR)
    except Exception as e:
        click.echo(f"\n[运行错误] 写入输出时发生未预期异常：{e}", err=True)
        click.echo(traceback.format_exc(), err=True)
        sys.exit(EXIT_RUNTIME_ERROR)

    charts = {}
    if not no_chart:
        try:
            charts = generate_charts(output_dirs, details_df, summary)
            files.update({f"图表-{k}": v for k, v in charts.items() if v})
        except Exception as e:
            click.echo(f"\n[输出警告（不阻断）] 图表生成失败：{e}", err=True)
            if not quiet:
                click.echo(f"  （可以稍后手动重跑，或使用 --no-chart 跳过）", err=True)

    exit_code = EXIT_OK
    if write_errors:
        exit_code = EXIT_OUTPUT_ERROR
        if not quiet:
            click.echo(f"\n[输出警告] 部分文件写入有问题：", err=True)
            for err in write_errors:
                click.echo(f"  - {err}", err=True)

    if not quiet:
        click.echo(summary_text)
        if charts:
            click.echo()
            click.echo("生成的图表：")
            for name, path in charts.items():
                if path:
                    click.echo(f"  [图表-{name}]  {path}")
        click.echo()
        click.echo("生成的输出文件：")
        for name, path in files.items():
            click.echo(f"  [{name}]  {path}")
        if write_errors:
            click.echo()
            click.echo(f"注意：存在 {len(write_errors)} 条写入警告，请检查以上提示。")
    else:
        if exit_code == EXIT_OK:
            print(files.get("JSON结果", "NO_JSON"))
        else:
            click.echo(
                f"静默模式下检测到错误（退出码 {exit_code}），"
                f"取消静默以查看详情。",
                err=True
            )

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
