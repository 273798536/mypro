from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console

from . import __version__
from .core import SplineOvershootChecker
from .counterexample import CounterExampleGenerator
from .io_utils import load_samples_from_csv, load_samples_from_jsonl
from .models import CheckStatus, CorrectionAction, SampleRecord, SampleSource
from .reporting import (
    render_counterexamples,
    render_result_table,
    render_short_summary,
    render_trace,
    write_report_json,
)
from .store import WorkspaceStore


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(__version__, "-V", "--version")
@click.option(
    "--workspace", "-w",
    default="./spline_workspace",
    show_default=True,
    type=click.Path(file_okay=False),
    help="工作区目录，存放样本、结果、修正记录",
)
@click.pass_context
def main(ctx: click.Context, workspace: str):
    """样条插值过冲检查工具

    日常入口：\n
      spline-check batch review -i data/samples.csv    # 批量复核（最常用）

    月底/课前：\n
      spline-check counterexample run                   # 生成并讲解反例
    """
    ctx.ensure_object(dict)
    ctx.obj["workspace"] = Path(workspace)
    ctx.obj["console"] = Console()


# ---------- batch：日常入口 ----------
@main.group()
def batch():
    """批量复核（日常主入口）"""


@batch.command("review")
@click.option(
    "--input", "-i", "input_path",
    required=False,
    type=click.Path(exists=True, dir_okay=False),
    help="输入 CSV/JSONL 文件。不传则使用工作区已有样本。",
)
@click.option(
    "--warn", default=0.5, show_default=True, type=float,
    help="过冲阈值（> 此值进入暂缓/重采）",
)
@click.option(
    "--fail", default=2.0, show_default=True, type=float,
    help="重采阈值（> 此值标记需重新采集）",
)
@click.option(
    "--smoothing-range", "s_range",
    default="0,0.1,1.0", show_default=True,
    help="自动搜索的平滑系数列表，逗号分隔",
)
@click.option(
    "--report", "-o", "report_path",
    default=None, type=click.Path(dir_okay=False),
    help="报告 JSON 输出路径（默认 工作区/report_时间戳.json）",
)
@click.option("--show-detail/--no-detail", default=False, show_default=True, help="是否显示逐样本表格")
@click.pass_context
def batch_review(
    ctx: click.Context,
    input_path: Optional[str],
    warn: float,
    fail: float,
    s_range: str,
    report_path: Optional[str],
    show_detail: bool,
):
    """批量复核样本（日常主入口）

    \b
    示例:
      spline-check batch review -i examples/samples.csv
      spline-check batch review -i data/new.jsonl --warn 0.3 --fail 1.5
      spline-check batch review               # 对工作区已有样本重新跑
    """
    console: Console = ctx.obj["console"]
    store = WorkspaceStore(ctx.obj["workspace"])

    duplicates = []
    if input_path:
        samples = _load_input(input_path, console)
        added, dup = store.add_samples(samples)
        duplicates = dup
        console.print(
            f"[dim]导入完成: 新增 {len(added)} 条，重复跳过 {len(dup)} 条[/dim]"
        )
    else:
        samples = store.list_samples()
        if not samples:
            console.print("[red]工作区无样本，请先通过 -i 导入 CSV/JSONL[/red]")
            sys.exit(1)
        console.print(f"[dim]使用工作区已有 {len(samples)} 条样本[/dim]")

    s_values = [float(x.strip()) for x in s_range.split(",") if x.strip()]
    checker = SplineOvershootChecker(
        overshoot_warn=warn,
        overshoot_fail=fail,
        s_range=s_values,
    )

    samples_to_check = store.list_samples()
    for sample in samples_to_check:
        result = checker.check(sample)
        store.save_result(result)

    report = store.build_report(duplicates=duplicates)
    render_short_summary(report, console)
    if show_detail:
        render_result_table(report.results, console)

    if not report_path:
        ts = report.generated_at.strftime("%Y%m%d_%H%M%S")
        report_path = str(store.root / f"report_{ts}.json")
    write_report_json(report, report_path)
    console.print(f"[green]报告已写入:[/green] {report_path}")


# ---------- trace：追溯 ----------
@main.command("trace")
@click.argument("sample_id")
@click.pass_context
def trace_cmd(ctx: click.Context, sample_id: str):
    """从 sample_id 追溯来源和处理记录（验收倒查）

    \b
    示例:
      spline-check trace S001
    """
    console: Console = ctx.obj["console"]
    store = WorkspaceStore(ctx.obj["workspace"])
    sample = store.get_sample(sample_id)
    if not sample:
        console.print(f"[red]找不到样本: {sample_id}[/red]")
        sys.exit(1)
    links = store.build_trace(sample_id)
    if not links:
        console.print("[yellow]该样本尚无检查/修正记录，请先运行 batch review[/yellow]")
        return
    render_trace(links, console)


# ---------- correct：人工修正留痕 ----------
@main.command("correct")
@click.argument("sample_id")
@click.option(
    "--action", "-a",
    type=click.Choice(["confirm_pass", "mark_recollect", "add_note", "update_params"]),
    required=True,
    help="修正动作: confirm_pass(待确认→通过) | mark_recollect(→重采) | add_note | update_params",
)
@click.option("--operator", "-u", required=True, help="操作人")
@click.option("--reason", "-r", required=True, help="修正原因/说明")
@click.option("--note", "-n", default=None, help="备注文本（可选）")
@click.pass_context
def correct_cmd(
    ctx: click.Context,
    sample_id: str,
    action: str,
    operator: str,
    reason: str,
    note: Optional[str],
):
    """人工修正并留痕（状态变更前后可对比）

    \b
    示例:
      spline-check correct S001 -a confirm_pass -u 张三 -r "人工复核后确认无过冲"
      spline-check correct S002 -a mark_recollect -u 张三 -r "异常点明显，需重采"
      spline-check correct S003 -a add_note -u 李四 -r "见附件截图" -n "已邮件发学生"
    """
    console: Console = ctx.obj["console"]
    store = WorkspaceStore(ctx.obj["workspace"])

    sample = store.get_sample(sample_id)
    if not sample:
        console.print(f"[red]找不到样本: {sample_id}[/red]")
        sys.exit(1)

    result_before = store.get_result(sample_id)
    rec = store.apply_correction(
        sample_id=sample_id,
        action=CorrectionAction(action),
        operator=operator,
        reason=reason,
        note=note,
    )
    diff = rec.describe_diff()
    console.print(f"[green]已记录修正[/green] {sample_id}: {diff}")
    console.print(f"[dim]原因: {reason} | 操作人: {operator}[/dim]")


# ---------- counterexample：月底/课前 ----------
@main.group()
def counterexample():
    """反例生成（月底复盘/课前讲题）"""


@counterexample.command("run")
@click.option("--seed", default=42, show_default=True, type=int, help="随机种子")
@click.pass_context
def counterexample_run(ctx: click.Context, seed: int):
    """生成典型反例并给出可解释说明

    \b
    示例:
      spline-check counterexample run
    """
    console: Console = ctx.obj["console"]
    store = WorkspaceStore(ctx.obj["workspace"])
    gen = CounterExampleGenerator(seed=seed)

    samples = gen.generate_all()
    added, dup = store.add_samples(samples)
    if dup:
        console.print(f"[dim]反例已存在，跳过 {len(dup)} 条[/dim]")
    checker = SplineOvershootChecker()
    for s in samples:
        store.save_result(checker.check(s))

    results_map = {r.sample_id: r for r in store.list_results()}
    render_counterexamples(gen, results_map, console)


# ---------- sample：单样本快速查询 ----------
@main.command("status")
@click.argument("sample_id")
@click.pass_context
def status_cmd(ctx: click.Context, sample_id: str):
    """查看单个样本当前状态

    \b
    示例:
      spline-check status S001
    """
    console: Console = ctx.obj["console"]
    store = WorkspaceStore(ctx.obj["workspace"])
    result = store.get_result(sample_id)
    if not result:
        console.print(f"[yellow]样本 {sample_id} 尚未检查[/yellow]")
        return
    from .reporting import _STATUS_COLOR, _STATUS_LABEL
    console.print(
        f"[cyan]{sample_id}[/cyan] → "
        f"[{_STATUS_COLOR[result.status]}]{_STATUS_LABEL[result.status]}[/{_STATUS_COLOR[result.status]}]  "
        f"(过冲={result.has_overshoot}, 最大={result.max_overshoot})"
    )
    if result.note:
        console.print(f"[dim]备注: {result.note}[/dim]")


# ---------- helpers ----------
def _load_input(path: str, console: Console):
    p = Path(path)
    if p.suffix.lower() in (".csv",):
        return load_samples_from_csv(p)
    if p.suffix.lower() in (".jsonl", ".ndjson"):
        return load_samples_from_jsonl(p)
    console.print(f"[yellow]未识别后缀 {p.suffix}，尝试按 CSV 解析[/yellow]")
    return load_samples_from_csv(p)


if __name__ == "__main__":
    main()
