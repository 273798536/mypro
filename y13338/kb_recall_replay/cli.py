from __future__ import annotations

import click
from rich.console import Console
from rich.table import Table

from .models import EvaluationResult, RecordStatus
from .replay import ReplayEngine
from .report import generate_report
from .store import Store

console = Console()


def _get_store(ctx: click.Context) -> Store:
    return ctx.obj["store"]


def _get_engine(ctx: click.Context) -> ReplayEngine:
    return ctx.obj["engine"]


@click.group()
@click.option("--store-path", default="kb_replay_store.json", help="存储文件路径")
@click.pass_context
def cli(ctx: click.Context, store_path: str) -> None:
    ctx.ensure_object(dict)
    store = Store(store_path)
    engine = ReplayEngine(store)
    ctx.obj["store"] = store
    ctx.obj["engine"] = engine
    ctx.obj["store_path"] = store_path


@cli.command(name="import")
@click.argument("file_path")
@click.pass_context
def import_materials(ctx: click.Context, file_path: str) -> None:
    engine = _get_engine(ctx)
    try:
        imported = engine.import_materials(file_path)
        console.print(f"[green]成功导入 {len(imported)} 条记录[/green]")
        for rec in imported:
            console.print(f"  {rec.name} ({rec.id})")
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
    except Exception as e:
        console.print(f"[red]导入失败：{e}[/red]")


@cli.command()
@click.option("--name", required=True, help="记录名称")
@click.option("--evidence-path", default="", help="证据路径")
@click.option("--alias", multiple=True, help="别名（可多次指定）")
@click.option("--notes", default="", help="备注")
@click.pass_context
def add(
    ctx: click.Context,
    name: str,
    evidence_path: str,
    alias: tuple[str, ...],
    notes: str,
) -> None:
    engine = _get_engine(ctx)
    rec, merged = engine.add_record(
        name=name,
        evidence_path=evidence_path,
        aliases=list(alias),
        notes=notes,
    )
    if merged:
        console.print(f"[yellow]名称匹配到已有记录，已追加版本：{rec.name} ({rec.id})[/yellow]")
    else:
        console.print(f"[green]新建记录：{rec.name} ({rec.id})[/green]")


@cli.command()
@click.argument("record_id")
@click.option("--evaluator", required=True, help="评测人")
@click.option("--result", type=click.Choice(["confirmed", "false_positive", "false_negative", "inconclusive"]), required=True)
@click.option("--score", type=float, default=None, help="分数")
@click.option("--impact-scope", default="", help="影响范围")
@click.option("--source-line", default="", help="来源行")
@click.option("--evidence-ref", default="", help="证据引用")
@click.pass_context
def evaluate(
    ctx: click.Context,
    record_id: str,
    evaluator: str,
    result: str,
    score: float | None,
    impact_scope: str,
    source_line: str,
    evidence_ref: str,
) -> None:
    engine = _get_engine(ctx)
    try:
        ev = engine.evaluate(
            record_id=record_id,
            evaluator=evaluator,
            result=EvaluationResult(result),
            score=score,
            impact_scope=impact_scope,
            source_line=source_line,
            evidence_ref=evidence_ref,
        )
        dup_msg = " [yellow]⚠️ 重复评测[/yellow]" if ev.is_duplicate else ""
        console.print(f"[green]评测完成：{ev.id}{dup_msg}[/green]")
        console.print(f"  结果：{result} | 评测人：{evaluator}")
        if ev.is_duplicate and ev.duplicate_of:
            console.print(f"  与 {ev.duplicate_of} 重复")
    except ValueError as e:
        console.print(f"[red]{e}[/red]")


@cli.command()
@click.argument("record_id")
@click.option("--sample-change", multiple=True, help="样本变化描述 (format: desc|before|after)")
@click.option("--threshold-change", multiple=True, help="阈值变化描述 (format: desc|before|after)")
@click.option("--human-correction", multiple=True, help="人工改判描述 (format: desc|original|corrected|operator)")
@click.pass_context
def gray(
    ctx: click.Context,
    record_id: str,
    sample_change: tuple[str, ...],
    threshold_change: tuple[str, ...],
    human_correction: tuple[str, ...],
) -> None:
    engine = _get_engine(ctx)

    def _parse_triplet(s: str) -> dict:
        parts = s.split("|")
        return {
            "description": parts[0] if len(parts) > 0 else "",
            "before": parts[1] if len(parts) > 1 else "",
            "after": parts[2] if len(parts) > 2 else "",
        }

    def _parse_quad(s: str) -> dict:
        parts = s.split("|")
        return {
            "description": parts[0] if len(parts) > 0 else "",
            "original_result": parts[1] if len(parts) > 1 else "",
            "corrected_result": parts[2] if len(parts) > 2 else "",
            "operator": parts[3] if len(parts) > 3 else "",
        }

    try:
        g = engine.add_gray_result(
            record_id=record_id,
            sample_changes=[_parse_triplet(s) for s in sample_change],
            threshold_changes=[_parse_triplet(s) for s in threshold_change],
            human_corrections=[_parse_quad(s) for s in human_correction],
        )
        console.print(f"[green]灰度结果已添加[/green]")
    except ValueError as e:
        console.print(f"[red]{e}[/red]")


@cli.command()
@click.argument("record_id")
@click.option("--status", type=click.Choice(["pending", "processed", "needs_evidence"]), required=True)
@click.pass_context
def status(ctx: click.Context, record_id: str, status: str) -> None:
    engine = _get_engine(ctx)
    try:
        rec = engine.update_status(record_id, RecordStatus(status))
        console.print(f"[green]{rec.name} 状态更新为 {status}[/green]")
    except ValueError as e:
        console.print(f"[red]{e}[/red]")


@cli.command(name="list")
@click.option("--filter-status", type=click.Choice(["pending", "processed", "needs_evidence"]), default=None)
@click.pass_context
def list_records(ctx: click.Context, filter_status: str | None) -> None:
    store = _get_store(ctx)
    if filter_status:
        records = store.list_by_status(filter_status)
    else:
        records = store.list_all()

    if not records:
        console.print("[yellow]暂无记录[/yellow]")
        return

    table = Table(title="知识库召回误判回放记录")
    table.add_column("ID", style="cyan")
    table.add_column("名称", style="white")
    table.add_column("状态", style="green")
    table.add_column("版本数", justify="right")
    table.add_column("评测数", justify="right")
    table.add_column("别名", style="dim")

    status_display = {
        RecordStatus.PENDING: "⏳ 待处理",
        RecordStatus.PROCESSED: "✅ 已处理",
        RecordStatus.NEEDS_EVIDENCE: "🔍 待补证据",
    }

    for rec in records:
        table.add_row(
            rec.id,
            rec.name,
            status_display.get(rec.status, rec.status.value),
            str(len(rec.versions)),
            str(len(rec.evaluations)),
            ", ".join(rec.aliases) or "-",
        )

    console.print(table)


@cli.command()
@click.option("--output", "-o", default="replay_report.md", help="输出文件路径")
@click.pass_context
def report(ctx: click.Context, output: str) -> None:
    store = _get_store(ctx)
    content = generate_report(store)
    from pathlib import Path
    Path(output).write_text(content, encoding="utf-8")
    console.print(f"[green]报告已生成：{output}[/green]")


@cli.command()
@click.argument("record_id")
@click.pass_context
def evidence(ctx: click.Context, record_id: str) -> None:
    engine = _get_engine(ctx)
    try:
        chain = engine.get_evidence_chain(record_id)
        if not chain:
            console.print("[yellow]该记录暂无证据链[/yellow]")
            return

        console.print(f"[bold]证据链 — {record_id}[/bold]")
        for entry in chain:
            if entry["type"] == "version":
                console.print(f"\n📄 [bold]版本变更[/bold] {entry['timestamp']}")
                if entry["notes"]:
                    console.print(f"   备注：{entry['notes']}")
                if entry["screenshots"]:
                    console.print(f"   截图：{', '.join(entry['screenshots'])}")
                if entry["values"]:
                    for k, v in entry["values"].items():
                        console.print(f"   {k}：{v}")
            elif entry["type"] == "evaluation":
                dup_tag = " [yellow]⚠️重复[/yellow]" if entry["is_duplicate"] else ""
                console.print(f"\n🔎 [bold]评测[/bold] {entry['timestamp']}{dup_tag}")
                console.print(f"   结果：{entry['result']} | 评测人：{entry['evaluator']}")
                if entry["score"] is not None:
                    console.print(f"   分数：{entry['score']}")
                if entry["evidence_ref"]:
                    console.print(f"   证据引用：{entry['evidence_ref']}")
                if entry["impact_scope"]:
                    console.print(f"   影响范围：{entry['impact_scope']}")
                if entry["source_line"]:
                    console.print(f"   来源行：{entry['source_line']}")
            elif entry["type"] == "gray_result":
                console.print(f"\n🧪 [bold]灰度结果[/bold] {entry['timestamp']}")
                if entry["sample_changes"]:
                    console.print(f"   样本变化：{len(entry['sample_changes'])} 项")
                if entry["threshold_changes"]:
                    console.print(f"   阈值变化：{len(entry['threshold_changes'])} 项")
                if entry["human_corrections"]:
                    console.print(f"   人工改判：{len(entry['human_corrections'])} 项")
    except ValueError as e:
        console.print(f"[red]{e}[/red]")


if __name__ == "__main__":
    cli()
