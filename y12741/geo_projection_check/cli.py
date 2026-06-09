from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click

from .checker import ProjectionChecker
from .loader import MaterialLoader
from .models import ReviewDecision, ReviewNote, ReviewSession
from .report import ReportGenerator


@click.group(invoke_without_command=True)
@click.version_option(package_name="geo-projection-check")
@click.pass_context
def main(ctx: click.Context) -> None:
    """几何投影误差校验系统 — 处理现实材料、交互式复核、冲突定位。"""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@main.command("run")
@click.option("--label", "label", default="", help="材料批次标签，便于投委会识别")
@click.option("--params", "params_path", type=click.Path(dir_okay=False), help="参数表 YAML 路径")
@click.option("--questions", "questions_path", type=click.Path(dir_okay=False), help="题目清单 CSV 路径")
@click.option("--scores", "scores_path", type=click.Path(dir_okay=False), help="评分记录 CSV 路径")
@click.option("--chart-before", "chart_before_path", type=click.Path(dir_okay=False), help="导出前图表快照 JSON")
@click.option("--chart-after", "chart_after_path", type=click.Path(dir_okay=False), help="导出后图表快照 JSON")
@click.option("--report", "report_path", type=click.Path(dir_okay=False), help="投委会报告输出路径 (.md)")
@click.option("--json", "json_path", type=click.Path(dir_okay=False), help="JSON 结果输出路径")
@click.option("--partial/--no-partial", default=True, help="边界缺失时先算能算的再列缺口 (默认开启)")
@click.option("--review", is_flag=True, help="运行完成后进入交互式复核")
def run_cmd(
    label: str,
    params_path: Optional[str],
    questions_path: Optional[str],
    scores_path: Optional[str],
    chart_before_path: Optional[str],
    chart_after_path: Optional[str],
    report_path: Optional[str],
    json_path: Optional[str],
    partial: bool,
    review: bool,
) -> None:
    """加载材料并执行几何投影误差校验。"""
    if not any([params_path, questions_path, scores_path, chart_before_path, chart_after_path]):
        click.echo("错误: 至少需要提供一种材料路径。使用 --help 查看参数。", err=True)
        sys.exit(2)

    loader = MaterialLoader()
    bundle = loader.load_bundle(
        label=label,
        params_path=params_path,
        questions_path=questions_path,
        scores_path=scores_path,
        chart_before_path=chart_before_path,
        chart_after_path=chart_after_path,
        allow_empty=True,
    )

    load_report = loader.last_report()
    for w in load_report.warnings:
        click.echo(f"[加载告警] {w}", err=True)

    checker = ProjectionChecker(partial_success=partial)
    result = checker.run(bundle)

    click.echo(ReportGenerator.terminal_summary(result))

    if json_path:
        ReportGenerator.to_json(result, json_path)
        click.echo(f"JSON 结果已写入: {json_path}")

    if report_path:
        Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(ReportGenerator.committee_report(result))
        click.echo(f"投委会报告已写入: {report_path}")

    if review:
        _interactive_review(result, json_path=json_path, report_path=report_path)

    if result.out_of_tolerance > 0 or result.has_conflicts:
        sys.exit(1)


def _interactive_review(result, json_path: Optional[str], report_path: Optional[str]) -> None:
    session = ReviewSession(result=result)
    click.echo("\n进入交互式复核 — 可对误差/冲突标注复核意见")
    click.echo("命令: n=下一条 p=上一条 a=接受 r=需修改 e=升级 d=暂缓 q=退出并保存")

    reviewables = [
        ("error", e) for e in result.errors if not e.within_tolerance
    ] + [
        ("conflict", c) for c in result.conflicts
    ]

    if not reviewables:
        click.echo("当前批次没有超差项或冲突项可复核，直接保存。")
        _save_review_result(result, json_path, report_path)
        return

    while not session.finished and reviewables:
        idx = session.current_index % len(reviewables)
        kind, item = reviewables[idx]
        click.echo("")
        click.echo(f"── 复核进度 {idx + 1}/{len(reviewables)} ──")
        if kind == "error":
            click.echo(
                f"[误差超差] {item.item_id}  err={item.distance_px:.2f}px  "
                f"expected={item.expected}  actual={item.actual}"
            )
            if item.chart_diff_delta:
                click.echo(f"   图表前后变化 Δ={item.chart_diff_delta}")
        else:
            click.echo(f"[约束冲突] {item.description}")
            click.echo(f"   来源材料: {', '.join(item.material_sources) if item.material_sources else '未标注'}")

        key = click.prompt("选择操作 (n/p/a/r/e/d/q)", default="n", show_default=True).strip().lower()
        if key == "q":
            session.finished = True
        elif key == "n":
            session.current_index = (idx + 1) % len(reviewables)
        elif key == "p":
            session.current_index = (idx - 1) % len(reviewables)
        elif key in {"a", "r", "e", "d"}:
            mapping = {"a": ReviewDecision.ACCEPT, "r": ReviewDecision.REVISE,
                       "e": ReviewDecision.ESCALATE, "d": ReviewDecision.DEFER}
            comment = click.prompt("  复核备注 (可留空)", default="", show_default=False)
            note = ReviewNote(
                author="cli-reviewer",
                decision=mapping[key],
                comment=comment,
            )
            if kind == "error":
                note.target_error_id = item.entry_id
            else:
                note.target_conflict_id = item.conflict_id
            result.notes.append(note)
            click.echo(f"  ✓ 已记录决策: {note.decision.value}")
            session.current_index = (idx + 1) % len(reviewables)
        else:
            click.echo("  未知命令")

    _save_review_result(result, json_path, report_path)


def _save_review_result(result, json_path: Optional[str], report_path: Optional[str]) -> None:
    if json_path:
        ReportGenerator.to_json(result, json_path)
        click.echo(f"\n复核结果已更新: {json_path}")
    if report_path:
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(ReportGenerator.committee_report(result))
        click.echo(f"投委会报告已更新: {report_path}")


@main.command("samples")
@click.option("--out", "out_dir", type=click.Path(file_okay=False), default="./samples", help="样例输出目录")
def samples_cmd(out_dir: str) -> None:
    """生成一批真实风格的样例材料（含坏数据、边界缺口、旧备注）。"""
    from . import create_sample_bundle
    create_sample_bundle(out_dir)
    click.echo(f"样例材料已生成到: {Path(out_dir).resolve()}")
    click.echo("运行示例: geo-check run --params samples/params.yaml --questions samples/questions.csv "
               "--scores samples/scores.csv --chart-before samples/chart_before.json "
               "--chart-after samples/chart_after.json --report samples/report.md --json samples/result.json --review")


if __name__ == "__main__":
    main()
