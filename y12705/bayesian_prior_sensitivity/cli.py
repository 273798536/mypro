"""CLI 命令行接口 - 参数清晰，使用便捷"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .audit import AuditTrailManager
from .core import (
    batch_review,
    check_constraints,
    compute_sensitivity,
    trace_conclusion,
)
from .dataloader import DataStore, save_model_list
from .errors import BPSError
from .models import (
    BoundaryCase,
    CaseStatus,
    PriorParams,
    ScoringRecord,
    SourceMaterial,
    StudentAnswer,
)
from .reporting import (
    format_committee_view,
    format_result_json,
    format_single_result,
    format_summary_text,
)

console = Console()

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")


def _get_store(data_dir: str) -> DataStore:
    return DataStore(data_dir)


@click.group(help="贝叶斯先验敏感性分析工具 - 边界样例批量复核系统")
@click.option(
    "--data-dir",
    "-d",
    type=click.Path(),
    default="./bps_data",
    show_default=True,
    help="数据目录路径，存放所有 JSONL/CSV 数据文件",
)
@click.pass_context
def main(ctx: click.Context, data_dir: str) -> None:
    ctx.ensure_object(dict)
    ctx.obj["data_dir"] = os.path.abspath(data_dir)
    ctx.obj["store"] = _get_store(ctx.obj["data_dir"])


@main.command("init-sample", help="一键生成样例数据，不需要手工整理")
@click.option("--data-dir", "-d", type=click.Path(), default="./bps_data", show_default=True,
              help="目标数据目录，样例数据将复制到这里")
@click.option("--overwrite", is_flag=True, default=False, help="若目录已存在则覆盖")
def init_sample(data_dir: str, overwrite: bool) -> None:
    """一键初始化样例数据"""
    target = os.path.abspath(data_dir)
    if os.path.exists(target) and not overwrite:
        console.print(f"[yellow]目录已存在: {target}，使用 --overwrite 覆盖或指定其它目录[/yellow]")
        sys.exit(1)

    if os.path.exists(target):
        shutil.rmtree(target)

    store = DataStore(target)
    cases = [
        BoundaryCase(
            case_id="BC-001",
            description="学生在二次函数顶点式应用中，对 h 的符号判断常出错",
            boundary_flag=True,
            prior_params=PriorParams(alpha=2.0, beta=5.0, distribution="beta",
                                     description="弱信息先验，偏向较低正确率"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["math", "quadratic", "boundary"],
        ),
        BoundaryCase(
            case_id="BC-002",
            description="古文翻译中实词活用的边界样例",
            boundary_flag=True,
            prior_params=PriorParams(alpha=3.0, beta=3.0, distribution="beta",
                                     description="对称先验，无明显倾向"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["chinese", "translation"],
        ),
        BoundaryCase(
            case_id="BC-003",
            description="物理受力分析中摩擦力方向判定",
            boundary_flag=True,
            prior_params=PriorParams(alpha=1.0, beta=1.0, distribution="beta",
                                     description="无信息先验 Beta(1,1)"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["physics", "mechanics"],
        ),
    ]
    scoring = [
        ScoringRecord(record_id="S-001", case_id="BC-001", scorer="expert_a", score=0.4, notes="正确率偏低"),
        ScoringRecord(record_id="S-002", case_id="BC-001", scorer="expert_b", score=0.35, notes="和预期一致"),
        ScoringRecord(record_id="S-003", case_id="BC-001", scorer="expert_c", score=0.5, notes="部分学生掌握尚可"),
        ScoringRecord(record_id="S-004", case_id="BC-002", scorer="expert_a", score=0.6),
        ScoringRecord(record_id="S-005", case_id="BC-002", scorer="expert_b", score=0.55),
        ScoringRecord(record_id="S-006", case_id="BC-002", scorer="expert_c", score=0.65),
        ScoringRecord(record_id="S-007", case_id="BC-003", scorer="expert_a", score=0.3),
        ScoringRecord(record_id="S-008", case_id="BC-003", scorer="expert_b", score=0.25),
        ScoringRecord(record_id="S-009", case_id="BC-003", scorer="expert_c", score=0.3),
    ]
    sources = [
        SourceMaterial(material_id="M-001", case_id="BC-001", material_type="question_text",
                       content="已知二次函数 y=2(x-3)²+4，求其顶点坐标。", location="教材P45例2"),
        SourceMaterial(material_id="M-002", case_id="BC-001", material_type="rubric",
                       content="顶点式 y=a(x-h)²+k 中顶点为(h,k)，h 取括号内常数的相反数。",
                       location="评分标准v2.1"),
        SourceMaterial(material_id="M-003", case_id="BC-001", material_type="reference_answer",
                       content="顶点坐标为 (3, 4)", location="参考答案"),
        SourceMaterial(material_id="M-004", case_id="BC-002", material_type="question_text",
                       content="翻译：渔人甚异之。", location="《桃花源记》"),
        SourceMaterial(material_id="M-005", case_id="BC-002", material_type="rubric",
                       content="'异'为意动用法，译为'对……感到诧异'。", location="评分标准v2.1"),
        SourceMaterial(material_id="M-006", case_id="BC-002", material_type="reference_answer",
                       content="渔人对看到的景象感到非常诧异。", location="参考答案"),
        SourceMaterial(material_id="M-007", case_id="BC-003", material_type="question_text",
                       content="一物体沿斜面匀速下滑，请判断摩擦力方向。", location="物理必修一P78"),
        SourceMaterial(material_id="M-008", case_id="BC-003", material_type="rubric",
                       content="摩擦力方向与相对运动方向相反，沿斜面向上。", location="评分标准v2.1"),
        SourceMaterial(material_id="M-009", case_id="BC-003", material_type="reference_answer",
                       content="摩擦力沿斜面向上。", location="参考答案"),
    ]
    answers = [
        StudentAnswer(answer_id="A-001", case_id="BC-001", student_id="STU-101",
                      is_correct=False, answer_content="(-3, 4)", error_category="h符号错误", score=0),
        StudentAnswer(answer_id="A-002", case_id="BC-001", student_id="STU-102",
                      is_correct=True, answer_content="(3, 4)", score=1),
        StudentAnswer(answer_id="A-003", case_id="BC-001", student_id="STU-103",
                      is_correct=False, answer_content="(3, -4)", error_category="k符号错误", score=0),
        StudentAnswer(answer_id="A-004", case_id="BC-002", student_id="STU-201",
                      is_correct=True, answer_content="渔人对此感到很诧异", score=1),
        StudentAnswer(answer_id="A-005", case_id="BC-002", student_id="STU-202",
                      is_correct=False, answer_content="渔人很奇怪", error_category="意动未译出", score=0),
        StudentAnswer(answer_id="A-006", case_id="BC-003", student_id="STU-301",
                      is_correct=False, answer_content="沿斜面向下", error_category="方向反", score=0),
    ]

    store.save_cases(cases)
    store.save_scoring(scoring)
    store.save_sources(sources)
    store.save_answers(answers)

    console.print(f"[green]✓ 样例数据已生成: {target}[/green]")
    console.print(f"  - boundary_cases.jsonl  ({len(cases)} 条边界样例)")
    console.print(f"  - scoring_records.jsonl ({len(scoring)} 条评分记录)")
    console.print(f"  - source_materials.jsonl({len(sources)} 条来源材料)")
    console.print(f"  - student_answers.jsonl ({len(answers)} 条学生答题)")
    console.print("")
    console.print("[cyan]下一步建议:[/cyan]")
    console.print(f"  bps --data-dir {target} list-cases          列出所有边界样例")
    console.print(f"  bps --data-dir {target} check-constraints    运行约束校验")
    console.print(f"  bps --data-dir {target} batch-review         批量复核并生成报告")


@main.command("list-cases", help="列出所有边界样例")
@click.option("--status", type=click.Choice(["pending", "approved", "rejected", "needs_recollection", "temporary_hold"]),
              default=None, help="按状态过滤")
@click.option("--format", "fmt", type=click.Choice(["table", "json"]), default="table", help="输出格式")
@click.pass_context
def list_cases(ctx: click.Context, status: str | None, fmt: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()

    if status:
        bundles = {cid: b for cid, b in bundles.items() if b.case.status.value == status}

    if fmt == "json":
        data = []
        for cid, b in bundles.items():
            data.append({
                "case_id": cid,
                "description": b.case.description,
                "status": b.case.status.value,
                "version": b.case.version,
                "scoring_count": len(b.scoring_records),
                "source_count": len(b.source_materials),
                "answer_count": len(b.student_answers),
            })
        click.echo(json.dumps(data, ensure_ascii=False, indent=2))
        return

    table = Table(title="边界样例列表", show_lines=False)
    table.add_column("样例ID", style="cyan")
    table.add_column("描述", style="white", overflow="fold")
    table.add_column("状态", style="yellow")
    table.add_column("版本")
    table.add_column("评分数")
    table.add_column("来源数")
    table.add_column("答题数")

    status_map = {
        "pending": "待确认",
        "approved": "已通过",
        "rejected": "已拒绝",
        "needs_recollection": "需重采",
        "temporary_hold": "暂缓",
    }
    for cid, b in sorted(bundles.items()):
        table.add_row(
            cid,
            b.case.description,
            status_map.get(b.case.status.value, b.case.status.value),
            f"v{b.case.version}",
            str(len(b.scoring_records)),
            str(len(b.source_materials)),
            str(len(b.student_answers)),
        )
    console.print(table)


@main.command("show-case", help="显示单个边界样例详情")
@click.argument("case_id")
@click.option("--trace/--no-trace", default=False, help="包含结论追溯信息")
@click.pass_context
def show_case(ctx: click.Context, case_id: str, trace: bool) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)
    bundle = bundles[case_id]
    result = bundle.sensitivity_result
    click.echo(format_single_result(bundle, result, include_trace=trace))


@main.command("check-constraints", help="约束校验（检查评分、来源材料、先验参数等）")
@click.option("--case-id", default=None, help="仅校验指定边界样例，不填则校验全部")
@click.option("--raise-on-fail", is_flag=True, default=False, help="遇到违规直接报错退出")
@click.pass_context
def check_constraints_cmd(ctx: click.Context, case_id: str | None, raise_on_fail: bool) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id:
        if case_id not in bundles:
            console.print(f"[red]未找到边界样例: {case_id}[/red]")
            sys.exit(1)
        bundles = {case_id: bundles[case_id]}

    total_ok = 0
    total_fail = 0
    for cid, bundle in bundles.items():
        try:
            violations = check_constraints(bundle, raise_on_fail=raise_on_fail)
        except BPSError as e:
            console.print(f"[red]{e}[/red]")
            sys.exit(1)

        if violations:
            total_fail += 1
            console.print(f"[yellow]✗ {cid}: 共 {len(violations)} 条违规[/yellow]")
            for v in violations:
                console.print(f"    - {v}")
        else:
            total_ok += 1
            console.print(f"[green]✓ {cid}: 约束校验通过[/green]")

    console.print("")
    console.print(f"汇总: 通过 {total_ok}，失败 {total_fail}，总计 {len(bundles)}")


@main.command("compute", help="计算单个边界样例的先验敏感性")
@click.argument("case_id")
@click.option("--save/--no-save", default=True, help="保存计算结果到 sensitivity_results.jsonl")
@click.pass_context
def compute_cmd(ctx: click.Context, case_id: str, save: bool) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)
    bundle = bundles[case_id]
    try:
        result = compute_sensitivity(bundle)
    except BPSError as e:
        console.print(f"[red]{e}[/red]")
        sys.exit(1)

    click.echo(format_single_result(bundle, result, include_trace=False))

    if save:
        existing = store.load_results()
        existing = [r for r in existing if r.case_id != case_id]
        existing.append(result)
        store.save_results(existing)
        console.print(f"[green]✓ 结果已保存到 {store.results_path}[/green]")


@main.command("batch-review", help="批量复核所有边界样例（约束校验 + 敏感性计算）")
@click.option("--view", type=click.Choice(["summary", "committee", "all", "json"]),
              default="all", help="报告视图")
@click.option("--output", "-o", type=click.Path(), default=None, help="将 JSON 报告写入文件")
@click.pass_context
def batch_review_cmd(ctx: click.Context, view: str, output: str | None) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()

    review = batch_review(bundles)
    report = review["report"]

    if view in ("summary", "all"):
        click.echo(format_summary_text(report))
        click.echo("")
    if view in ("committee", "all"):
        click.echo(format_committee_view(report))

    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(format_result_json(report))
        console.print(f"[green]✓ JSON 报告已写入: {output}[/green]")
    elif view == "json":
        click.echo(format_result_json(report))

    if review["results"]:
        existing = store.load_results()
        existing_map = {r.case_id: r for r in existing}
        for cid, r in review["results"].items():
            existing_map[cid] = r
        store.save_results(list(existing_map.values()))

    if review["errors"]:
        console.print("")
        console.print("[yellow]计算过程中出现以下问题:[/yellow]")
        for cid, err in review["errors"].items():
            console.print(f"  - {cid}: {err}")


@main.command("amend-status", help="人工修正边界样例状态（留痕）")
@click.argument("case_id")
@click.option("--to", "to_status", required=True,
              type=click.Choice(["pending", "approved", "rejected", "needs_recollection", "temporary_hold"]),
              help="目标状态")
@click.option("--operator", required=True, help="操作人（留痕用）")
@click.option("--reason", default="", help="变更原因（留痕用）")
@click.pass_context
def amend_status_cmd(ctx: click.Context, case_id: str, to_status: str, operator: str, reason: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)

    bundle = bundles[case_id]
    audits = store.load_audit()
    manager = AuditTrailManager(audits)

    target = CaseStatus(to_status)
    from_status = bundle.case.status
    try:
        manager.record_status_change(bundle, target, operator, reason)
    except BPSError as e:
        console.print(f"[red]{e}[/red]")
        sys.exit(1)

    all_cases = store.load_cases()
    all_cases = [c if c.case_id != case_id else bundle.case for c in all_cases]
    store.save_cases(all_cases)
    store.save_audit(manager.entries)

    console.print(f"[green]✓ 状态变更: {from_status.value} → {to_status}[/green]")
    console.print(f"  操作人: {operator}")
    console.print(f"  原因:   {reason or '(未填写)'}")
    console.print(f"  版本:   v{bundle.case.version}")


@main.command("amend-conclusion", help="人工修正边界样例结论（留痕）")
@click.argument("case_id")
@click.option("--to", "to_conclusion", required=True, help="新结论内容")
@click.option("--operator", required=True, help="操作人（留痕用）")
@click.option("--reason", default="", help="变更原因（留痕用）")
@click.pass_context
def amend_conclusion_cmd(ctx: click.Context, case_id: str, to_conclusion: str, operator: str, reason: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)

    bundle = bundles[case_id]
    audits = store.load_audit()
    manager = AuditTrailManager(audits)

    old = bundle.case.conclusion
    manager.record_conclusion_change(bundle, to_conclusion, operator, reason)

    all_cases = store.load_cases()
    all_cases = [c if c.case_id != case_id else bundle.case for c in all_cases]
    store.save_cases(all_cases)
    store.save_audit(manager.entries)

    console.print(f"[green]✓ 结论已更新[/green]")
    console.print(f"  原结论: {old or '(空)'}")
    console.print(f"  新结论: {to_conclusion}")
    console.print(f"  操作人: {operator}")
    console.print(f"  原因:   {reason or '(未填写)'}")


@main.command("show-trail", help="查看留痕记录和状态变更对比")
@click.argument("case_id")
@click.pass_context
def show_trail_cmd(ctx: click.Context, case_id: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)

    audits = store.load_audit()
    manager = AuditTrailManager(audits)
    diff = manager.get_change_diff(case_id)
    click.echo(f"边界样例 {case_id} 的变更留痕:")
    click.echo(diff)


@main.command("trace", help="追溯结论来源（拉回来源材料）")
@click.argument("case_id")
@click.option("--format", "fmt", type=click.Choice(["text", "json"]), default="text", help="输出格式")
@click.pass_context
def trace_cmd(ctx: click.Context, case_id: str, fmt: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)
    bundle = bundles[case_id]
    evidence = trace_conclusion(bundle)
    if fmt == "json":
        click.echo(json.dumps(evidence, ensure_ascii=False, indent=2, default=str))
    else:
        click.echo(format_single_result(bundle, bundle.sensitivity_result, include_trace=True))


@main.command("report", help="生成投委会视图或结果摘要")
@click.option("--view", type=click.Choice(["summary", "committee"]), default="committee",
              help="报告视图类型")
@click.option("--format", "fmt", type=click.Choice(["text", "json"]), default="text", help="输出格式")
@click.pass_context
def report_cmd(ctx: click.Context, view: str, fmt: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    review = batch_review(bundles)
    report = review["report"]

    if fmt == "json":
        click.echo(format_result_json(report))
    elif view == "summary":
        click.echo(format_summary_text(report))
    else:
        click.echo(format_committee_view(report))


@main.command("load-scoring", help="加载评分记录（用于补录缺失的评分）")
@click.option("--case-id", required=True, help="边界样例 ID")
@click.option("--scorer", required=True, help="评分人（如 expert_a）")
@click.option("--score", required=True, type=float, help="评分分数")
@click.option("--notes", default="", help="备注")
@click.pass_context
def load_scoring_cmd(ctx: click.Context, case_id: str, scorer: str, score: float, notes: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)

    import uuid
    record = ScoringRecord(
        record_id=f"S-{uuid.uuid4().hex[:8]}",
        case_id=case_id,
        scorer=scorer,
        score=score,
        notes=notes,
    )
    existing = store.load_scoring()
    existing = [r for r in existing if not (r.case_id == case_id and r.scorer == scorer)]
    existing.append(record)
    store.save_scoring(existing)
    console.print(f"[green]✓ 评分记录已保存: {scorer}={score} for {case_id}[/green]")


@main.command("add-source", help="添加来源材料（用于补录缺失的来源）")
@click.option("--case-id", required=True, help="边界样例 ID")
@click.option("--type", "material_type", required=True, help="材料类型（如 question_text/rubric/reference_answer）")
@click.option("--content", required=True, help="材料内容")
@click.option("--location", default="", help="材料位置（如教材P45）")
@click.pass_context
def add_source_cmd(ctx: click.Context, case_id: str, material_type: str, content: str, location: str) -> None:
    store: DataStore = ctx.obj["store"]
    bundles = store.build_bundles()
    if case_id not in bundles:
        console.print(f"[red]未找到边界样例: {case_id}[/red]")
        sys.exit(1)

    import uuid
    material = SourceMaterial(
        material_id=f"M-{uuid.uuid4().hex[:8]}",
        case_id=case_id,
        material_type=material_type,
        content=content,
        location=location,
    )
    existing = store.load_sources()
    existing = [m for m in existing if not (m.case_id == case_id and m.material_type == material_type)]
    existing.append(material)
    store.save_sources(existing)
    console.print(f"[green]✓ 来源材料已保存: [{material_type}] for {case_id}[/green]")


if __name__ == "__main__":
    main()
