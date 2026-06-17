import click
import json
from typing import Optional

from processor import EssayEvidenceReviewer
from models import ReviewSummary, ReviewStatus


def print_stat_table(summary: ReviewSummary) -> None:
    stats = summary.stats
    click.echo("\n" + "=" * 60)
    click.echo("📊 作文批改证据复核 - 统计报告")
    click.echo("=" * 60)

    click.echo(f"\n📝 总行数: {stats.total}")
    click.echo("-" * 40)

    click.echo(f"✅ 已处理: {stats.processed} 行")
    click.echo(f"📋 待补材料: {stats.pending_material} 行")
    click.echo(f"👤 人工改判: {stats.human_overridden} 行")
    click.echo(f"⏸️  已挂起: {stats.suspended} 行")
    click.echo(f"❌ 坏行: {stats.bad_lines} 行")
    click.echo(f"⏭️  跳过行: {stats.skipped} 行")

    click.echo("-" * 40)
    click.echo(f"📚 缺引用: {stats.citations_missing} 条")
    click.echo(f"🔍 旧误判样本: {stats.old_misjudgments} 条")

    processed_pct = (stats.processed / stats.total * 100) if stats.total > 0 else 0
    click.echo("-" * 40)
    click.echo(f"📈 处理完成率: {processed_pct:.1f}%")
    click.echo("=" * 60)


def print_bad_lines(summary: ReviewSummary) -> None:
    if not summary.bad_lines:
        return

    click.echo("\n" + "=" * 60)
    click.echo("⚠️  异常行详情")
    click.echo("=" * 60)

    bad_lines = [b for b in summary.bad_lines if b["type"] == "bad_line"]
    skipped_lines = [b for b in summary.bad_lines if b["type"] == "skipped"]

    if bad_lines:
        click.echo(f"\n❌ 坏行 ({len(bad_lines)} 条):")
        for item in bad_lines:
            click.echo(f"  第{item['line_number']}行: {item['error']}")
            click.echo(f"    原文: {item['raw_line'][:80]}...")

    if skipped_lines:
        click.echo(f"\n⏭️  跳过行 ({len(skipped_lines)} 条):")
        for item in skipped_lines:
            click.echo(f"  第{item['line_number']}行: {item['error']}")
            click.echo(f"    原文: {item['raw_line'][:60]}...")

    click.echo("=" * 60)


def print_missing_citations_report(summary: ReviewSummary) -> None:
    pending = summary.pending_material
    if not pending:
        return

    click.echo("\n" + "=" * 60)
    click.echo("📋 待补材料详情（缺引用）")
    click.echo("=" * 60)

    for i, result in enumerate(pending, 1):
        mo = result.model_output
        click.echo(f"\n{i}. 作文ID: {result.essay_id}")
        click.echo(f"   模型版本: {mo.model_version} | 得分: {mo.score}")
        click.echo(f"   引用状态: {result.citation_status.value}")
        click.echo(f"   审核备注: {result.review_notes}")

        if result.missing_citations:
            click.echo("   需补充:")
            for req in result.missing_citations:
                click.echo(f"     • {req}")

        if result.is_old_misjudgment and result.misjudgment_explanation:
            click.echo(f"   💡 误判说明: {result.misjudgment_explanation}")

        click.echo(f"   反馈原文: {mo.feedback[:100]}...")

    click.echo("\n" + "=" * 60)


def print_human_overridden(summary: ReviewSummary) -> None:
    overridden = summary.human_overridden
    if not overridden:
        return

    click.echo("\n" + "=" * 60)
    click.echo("👤 人工改判记录")
    click.echo("=" * 60)

    for i, result in enumerate(overridden, 1):
        mo = result.model_output
        click.echo(f"\n{i}. 作文ID: {result.essay_id}")
        click.echo(f"   模型版本: {mo.model_version} | 原得分: {mo.score}")
        click.echo(f"   改判原因: {mo.override_reason or '未注明'}")
        click.echo(f"   审核备注: {result.review_notes}")

    click.echo("\n" + "=" * 60)


def print_suspended(summary: ReviewSummary) -> None:
    suspended = summary.suspended
    if not suspended:
        return

    click.echo("\n" + "=" * 60)
    click.echo("⏸️  挂起记录（需负责人确认）")
    click.echo("=" * 60)

    for i, result in enumerate(suspended, 1):
        mo = result.model_output
        click.echo(f"\n{i}. 作文ID: {result.essay_id}")
        click.echo(f"   模型版本: {mo.model_version} | 得分: {mo.score}")
        click.echo(f"   重复冲突: essay_id={result.duplicate_of}")
        click.echo(f"   审核备注: {result.review_notes}")
        click.echo(f"   操作提示: 请使用 --confirm {result.essay_id} 确认后继续")

    click.echo("\n" + "=" * 60)


def print_misjudgment_report(summary: ReviewSummary) -> None:
    all_results = summary.processed + summary.pending_material + summary.human_overridden
    misjudgments = [r for r in all_results if r.is_old_misjudgment]

    if not misjudgments:
        return

    click.echo("\n" + "=" * 60)
    click.echo("🔍 旧模型误判样本分析")
    click.echo("=" * 60)

    for i, result in enumerate(misjudgments, 1):
        mo = result.model_output
        click.echo(f"\n{i}. 作文ID: {result.essay_id}")
        click.echo(f"   状态: {result.status.value}")
        click.echo(f"   旧模型版本: {mo.model_version} | 得分: {mo.score}")
        if result.misjudgment_explanation:
            click.echo(f"   📝 改判解释:")
            for line in result.misjudgment_explanation.split("；"):
                click.echo(f"      • {line.strip()}")

    click.echo("\n" + "=" * 60)


def print_interface_output(summary: ReviewSummary, output_format: str = "json") -> None:
    if output_format == "json":
        interface_data = {
            "summary": {
                "total": summary.stats.total,
                "processed": summary.stats.processed,
                "pending_material": summary.stats.pending_material,
                "human_overridden": summary.stats.human_overridden,
                "suspended": summary.stats.suspended,
                "bad_lines": summary.stats.bad_lines,
                "skipped": summary.stats.skipped,
                "citations_missing": summary.stats.citations_missing,
                "old_misjudgments": summary.stats.old_misjudgments,
            },
            "processed": [
                {
                    "essay_id": r.essay_id,
                    "model_version": r.model_output.model_version,
                    "score": r.model_output.score,
                    "citation_status": r.citation_status.value,
                    "review_notes": r.review_notes,
                    "is_old_misjudgment": r.is_old_misjudgment,
                    "misjudgment_explanation": r.misjudgment_explanation,
                }
                for r in summary.processed
            ],
            "pending_material": [
                {
                    "essay_id": r.essay_id,
                    "model_version": r.model_output.model_version,
                    "score": r.model_output.score,
                    "citation_status": r.citation_status.value,
                    "missing_citations": r.missing_citations,
                    "review_notes": r.review_notes,
                }
                for r in summary.pending_material
            ],
            "human_overridden": [
                {
                    "essay_id": r.essay_id,
                    "model_version": r.model_output.model_version,
                    "original_score": r.model_output.score,
                    "override_reason": r.model_output.override_reason,
                    "review_notes": r.review_notes,
                }
                for r in summary.human_overridden
            ],
            "suspended": [
                {
                    "essay_id": r.essay_id,
                    "model_version": r.model_output.model_version,
                    "score": r.model_output.score,
                    "duplicate_of": r.duplicate_of,
                    "review_notes": r.review_notes,
                }
                for r in summary.suspended
            ],
            "bad_lines": summary.bad_lines,
        }
        click.echo(json.dumps(interface_data, ensure_ascii=False, indent=2))


@click.group()
@click.version_option(version="0.1.0", prog_name="evidence-review")
def cli():
    """作文批改证据复核工具 - 检查模型输出的引用证据完整性"""
    pass


@cli.command("review")
@click.argument("input_file", type=click.Path(exists=True))
@click.option(
    "--strict/--no-strict",
    default=True,
    help="严格模式：引用少于2条视为薄弱",
)
@click.option(
    "--auto-confirm",
    is_flag=True,
    help="自动确认挂起的重复评测（不推荐）",
)
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["text", "json"]),
    default="text",
    help="输出格式",
)
@click.option(
    "--output",
    "output_file",
    type=click.Path(),
    help="输出文件路径",
)
def review(input_file: str, strict: bool, auto_confirm: bool, output_format: str, output_file: Optional[str]):
    """复核模型输出的证据引用"""
    click.echo(f"🔍 开始复核: {input_file}")
    click.echo(f"   严格模式: {'开启' if strict else '关闭'}")

    reviewer = EssayEvidenceReviewer(strict_mode=strict)
    summary = reviewer.process_file(input_file, auto_confirm_suspended=auto_confirm)

    if output_format == "text":
        print_stat_table(summary)
        print_bad_lines(summary)
        print_missing_citations_report(summary)
        print_human_overridden(summary)
        print_suspended(summary)
        print_misjudgment_report(summary)

        if summary.suspended:
            click.echo("\n⚠️  存在挂起记录，请负责人确认后使用 --confirm 继续处理")
    else:
        print_interface_output(summary, output_format)

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            if output_format == "json":
                import io
                import sys
                old_stdout = sys.stdout
                sys.stdout = io.StringIO()
                print_interface_output(summary, output_format)
                json_output = sys.stdout.getvalue()
                sys.stdout = old_stdout
                f.write(json_output)
            else:
                click.echo("⚠️  text格式暂不支持写入文件，请使用 --format json")

    click.echo("\n✅ 复核完成")


@cli.command("confirm")
@click.argument("essay_id")
@click.argument("input_file", type=click.Path(exists=True))
@click.option(
    "--strict/--no-strict",
    default=True,
    help="严格模式：引用少于2条视为薄弱",
)
def confirm(essay_id: str, input_file: str, strict: bool):
    """确认挂起的重复评测"""
    click.echo(f"✅ 确认作文: {essay_id}")

    reviewer = EssayEvidenceReviewer(strict_mode=strict)
    summary = reviewer.process_file(input_file)

    if essay_id not in [s.essay_id for s in summary.suspended]:
        click.echo(f"❌ 未找到挂起的作文: {essay_id}")
        if summary.suspended:
            click.echo(f"\n当前挂起列表:")
            for s in summary.suspended:
                click.echo(f"  - {s.essay_id}")
        return

    click.echo(f"\n📝 已确认处理:")
    new_summary = reviewer.process_file(input_file, auto_confirm_suspended=True)

    confirmed_result = None
    for r in new_summary.processed + new_summary.pending_material + new_summary.human_overridden:
        if r.essay_id == essay_id:
            confirmed_result = r
            break

    if confirmed_result:
        click.echo(f"   作文ID: {confirmed_result.essay_id}")
        click.echo(f"   状态: {confirmed_result.status.value}")
        click.echo(f"   备注: {confirmed_result.review_notes}")

    print_stat_table(new_summary)


@cli.command("stats")
@click.argument("input_file", type=click.Path(exists=True))
def stats(input_file: str):
    """仅显示统计信息"""
    reviewer = EssayEvidenceReviewer()
    summary = reviewer.process_file(input_file)
    print_stat_table(summary)


def main():
    cli()


if __name__ == "__main__":
    main()
