import os
import sys
import json
import click

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from core.batch_processor import run_batch_process, trace_record
from reports.report_generator import generate_text_report, generate_plain_email_copy
from exports.excel_exporter import export_to_excel


DEFAULT_SAMPLE_DIR = os.path.join(ROOT, "sample_data")
DEFAULT_REPORT_DIR = os.path.join(ROOT, "reports", "output")
DEFAULT_EXPORT_DIR = os.path.join(ROOT, "exports", "output")


@click.group(
    help="人审反馈闭环助手：一键跑批、去重+灰度对比用同一批数据、异常可顺着往回查到标注和处理意见。"
         "首次使用直接运行 'human_audit run' 即可，无需手工整理数据。"
)
def cli():
    pass


@cli.command(
    "run",
    help="运行一次完整批处理：读取数据→去重→灰度对比→生成报告→导出Excel。"
         "默认直接用内置样例数据，零参数即可跑通。",
)
@click.option(
    "--data-dir", "-d",
    default=DEFAULT_SAMPLE_DIR,
    show_default=True,
    type=click.Path(exists=True, file_okay=False),
    help="数据所在目录。目录里需要放：旧版人审表_5月.xlsx、新版人审表_5月下.xlsx、"
         "标注记录及处理意见.xlsx、灰度对比反馈表.xlsx、版本回滚与异常案例.xlsx。",
)
@click.option(
    "--batch-id", "-b",
    default="",
    help="自定义批处理编号（可选）。不填则自动按 BATCH-年月日-时分秒 生成。",
)
@click.option(
    "--trace-id", "-t",
    default=None,
    help="指定一个记录ID（如 NEW000023、OLD00018），报告和导出里会自动附带这条记录的完整追踪链路。",
)
@click.option(
    "--report-dir", "-r",
    default=DEFAULT_REPORT_DIR,
    show_default=True,
    type=click.Path(file_okay=False),
    help="TXT报告输出目录。",
)
@click.option(
    "--export-dir", "-e",
    default=DEFAULT_EXPORT_DIR,
    show_default=True,
    type=click.Path(file_okay=False),
    help="Excel导出目录。",
)
@click.option(
    "--skip-excel",
    is_flag=True,
    default=False,
    help="只生成TXT报告，不导出Excel。",
)
@click.option(
    "--print-summary/--no-print-summary",
    default=True,
    help="运行结束后是否在控制台打印简要摘要。",
)
def run_cmd(data_dir, batch_id, trace_id, report_dir, export_dir, skip_excel, print_summary):
    click.echo("=" * 60)
    click.echo("  人审反馈闭环助手 - 开始运行")
    click.echo("=" * 60)
    click.echo(f"数据目录    : {data_dir}")
    click.echo(f"批处理编号  : {batch_id or '(自动生成)'}")
    click.echo(f"追踪记录ID  : {trace_id or '(不指定)'}")
    click.echo(f"报告输出    : {report_dir}")
    click.echo(f"Excel导出   : {'(跳过)' if skip_excel else export_dir}")
    click.echo("-" * 60)

    click.echo("[1/4] 加载数据并统一字段、建立标注+灰度关联 ...")
    batch = run_batch_process(data_dir, batch_id=batch_id)
    click.echo(f"      完成，批处理编号 = {batch.batch_id}")
    click.echo(f"      总记录数 = {batch.stats['总记录数']}，"
               f"旧版={batch.stats['旧版表记录数']}，新版={batch.stats['新版表记录数']}")

    click.echo("[2/4] 样本去重 + 灰度对比（共用同一批处理记录） ...")
    click.echo(f"      重复组数 = {batch.stats['重复组数']}，"
               f"被判定重复记录 = {batch.stats['重复记录数']}条")
    click.echo(f"      去重后有效记录 = {batch.stats['去重后有效记录数']}条")
    gray = batch.stats["灰度对比分析"]
    if gray:
        for g, info in gray.items():
            click.echo(f"      {g}：共{info['总数']}条，一致率 {info['一致率(%)']}%")

    click.echo("[3/4] 生成TXT报告（含可直接转发的大白话说明） ...")
    report_path = generate_text_report(batch, report_dir)
    email_path = generate_plain_email_copy(batch, report_dir)
    click.echo(f"      完整报告 -> {report_path}")
    click.echo(f"      可直接转发 -> {email_path}")

    excel_path = ""
    if not skip_excel:
        click.echo("[4/4] 导出Excel（6个sheet、长文本截断附通俗说明） ...")
        excel_path = export_to_excel(batch, export_dir, trace_id=trace_id)
        click.echo(f"      Excel文件 -> {excel_path}")
    else:
        click.echo("[4/4] 已跳过Excel导出。")

    if trace_id:
        click.echo("")
        click.echo(f"【追踪记录 {trace_id} 的完整链路】")
        chain = trace_record(batch, trace_id)
        click.echo(json.dumps(chain, ensure_ascii=False, indent=2))

    if print_summary:
        click.echo("")
        click.echo("=" * 60)
        click.echo("  简要总结（给平台工程师快速看）：")
        click.echo("=" * 60)
        s = batch.stats
        click.echo(f"  · 总记录 {s['总记录数']} / 去重后 {s['去重后有效记录数']}")
        click.echo(f"  · 重复 {s['重复记录数']} 条 / 重复组 {s['重复组数']} 组")
        click.echo(f"  · 金额单位缺失 {s['金额单位缺失数']} 条 / 补录备注 {s['含补录备注记录数']} 条")
        click.echo(f"  · 已标注 {s['已标注记录数']} 条 / 有处理意见 {s['有处理意见记录数']} 条")
        click.echo(f"  · 异常案例 {s['异常案例数']} 条")
        if trace_id:
            click.echo(f"  · 指定追踪 {trace_id}：结果已写在Excel'sheet 6'里")
        click.echo("")
        click.echo("  验收提示：从异常案例里拿一条记录ID，再运行：")
        click.echo(f"    human_audit trace --data-dir \"{data_dir}\" --id <记录ID>")
        click.echo("  可以验证是否能顺着追到标注记录和处理意见。")

    click.echo("")
    click.echo("运行完成。")
    return 0


@cli.command(
    "trace",
    help="顺着一条异常/记录ID往回查，完整输出：基本信息、去重信息、标注、处理意见、灰度判定、跨表关联、异常案例。",
)
@click.option(
    "--data-dir", "-d",
    default=DEFAULT_SAMPLE_DIR,
    show_default=True,
    type=click.Path(exists=True, file_okay=False),
    help="数据目录（同 run 命令）。",
)
@click.option(
    "--id", "record_id",
    required=True,
    help="要追踪的记录ID，例如 NEW000023 或 OLD00018。",
)
@click.option(
    "--batch-id", "-b",
    default="",
    help="可选，自定义批处理编号。",
)
def trace_cmd(data_dir, record_id, batch_id):
    click.echo(f"加载数据 ...")
    batch = run_batch_process(data_dir, batch_id=batch_id)
    click.echo(f"追踪记录：{record_id}")
    click.echo("")
    chain = trace_record(batch, record_id)
    if not chain.get("找到"):
        click.echo(click.style(f"✗ 未找到：{chain.get('原因', '')}", fg="red"))
        return 1
    click.echo(click.style("✓ 找到完整链路，明细如下：", fg="green"))
    click.echo("")
    for section, content in chain.items():
        if section in ("找到", "记录ID"):
            continue
        click.echo(click.style(f"【{section}】", fg="cyan", bold=True))
        if isinstance(content, dict):
            for k, v in content.items():
                click.echo(f"  {k:<18} : {v}")
        elif isinstance(content, list):
            for item in content:
                click.echo(f"  · {item}")
        else:
            click.echo(f"  {content}")
        click.echo("")

    click.echo("验证说明：")
    click.echo("  上面链路中，'标注与处理链路'里有'标注标签+处理意见+标注人+时间'；")
    click.echo("  '去重信息'里有跨表重复的依据；")
    click.echo("  如果这条记录在异常表里，还会在最下面看到'关联异常案例'及证据路径。")
    return 0


@cli.command(
    "samples",
    help="重新生成样例数据。如果不小心删了样例xlsx，可以跑这个命令恢复。",
)
@click.option(
    "--output-dir", "-o",
    default=DEFAULT_SAMPLE_DIR,
    show_default=True,
    type=click.Path(file_okay=False),
    help="样例数据输出目录。",
)
def samples_cmd(output_dir):
    click.echo(f"重新生成样例数据到：{output_dir}")
    gen_script = os.path.join(ROOT, "sample_data", "generate_samples.py")
    os.makedirs(output_dir, exist_ok=True)
    os.environ["SAMPLE_OUTPUT_DIR"] = output_dir
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen", gen_script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    click.echo("完成。")
    return 0


def main():
    cli()


if __name__ == "__main__":
    main()
