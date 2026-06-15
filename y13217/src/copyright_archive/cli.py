"""CLI主入口 - 版权授权清单归档处理系统"""
import os
import sys
from datetime import datetime

import click

from .models import ProcessingContext, JudgmentStatus, Actor
from .sample_data_generator import SampleDataGenerator
from .file_parser import FileParser
from .matching_processor import MatchingProcessor
from .note_processor import NoteProcessor
from .manual_confirmation import ManualConfirmationHandler
from .history_tracker import HistoryTracker
from .timeline_generator import TimelineGenerator


@click.command()
@click.option('--output-dir', default='./output',
              help='输出目录路径，默认: ./output')
@click.option('--generate-sample/--no-generate-sample', default=True,
              help='是否生成样例数据，默认: 是')
@click.option('--auto-confirm/--no-auto-confirm', default=True,
              help='是否自动模拟人工确认，默认: 是')
@click.option('--verbose/--no-verbose', default=True,
              help='是否显示详细处理过程，默认: 是')
def main(output_dir: str, generate_sample: bool, auto_confirm: bool, verbose: bool):
    """
    版权授权清单归档处理系统

    一条命令跑完"版权授权清单归档"整包流程，包括：
    1. 生成/解析样例数据
    2. 文件名与曲目表匹配
    3. 应用后补备注、口头备注、运营备注
    4. 人工批注覆盖旧判断（卡点机制）
    5. 生成历史时间线（HTML/Markdown/JSON）
    """
    output_dir = os.path.abspath(output_dir)
    raw_data_dir = os.path.join(output_dir, "raw_data")
    timeline_dir = os.path.join(output_dir, "timeline")

    if verbose:
        click.echo("=" * 70)
        click.echo("🎵 版权授权清单归档处理系统")
        click.echo("=" * 70)
        click.echo(f"📂 输出目录: {output_dir}")
        click.echo(f"📊 生成样例: {'是' if generate_sample else '否'}")
        click.echo(f"✍️  自动确认: {'是' if auto_confirm else '否'}")
        click.echo("=" * 70)

    context = ProcessingContext()

    if generate_sample:
        if verbose:
            click.echo("\n📦 步骤 1/7: 生成样例数据...")
        generator = SampleDataGenerator(output_dir)
        generator.generate_all()
        if verbose:
            click.echo("   ✅ 样例数据生成完成")
            click.echo(f"   📄 原始数据目录: {raw_data_dir}")

    if verbose:
        click.echo("\n📖 步骤 2/7: 解析文件...")
    parser = FileParser(raw_data_dir)
    context = parser.parse_all(context)
    if verbose:
        click.echo(f"   ✅ 解析完成: {len(context.repertoire)} 首曲目, "
                   f"{len(context.copyright_files)} 个版权文件, "
                   f"{len(context.notes)} 条备注")

    if verbose:
        click.echo("\n🔍 步骤 3/7: 文件名与曲目表匹配...")
    matcher = MatchingProcessor()
    context = matcher.process(context)
    if verbose:
        matched = sum(1 for m in context.match_results if m.status == JudgmentStatus.MATCHED)
        mismatched = sum(1 for m in context.match_results if m.status == JudgmentStatus.MISMATCHED)
        pending = sum(1 for m in context.match_results if m.status == JudgmentStatus.PENDING)
        click.echo(f"   ✅ 匹配完成: 已匹配 {matched}, 不匹配 {mismatched}, 待确认 {pending}")

        click.echo("\n   📋 匹配结果详情:")
        for result in context.match_results:
            status_icon = {
                JudgmentStatus.MATCHED: "✅",
                JudgmentStatus.MISMATCHED: "❌",
                JudgmentStatus.PENDING: "⏳",
                JudgmentStatus.OVERRIDDEN: "🔄",
                JudgmentStatus.CONFIRMED: "✓"
            }.get(result.status, "❓")
            click.echo(f"   {status_icon} {result.filename}")
            if result.mismatch_details:
                click.echo(f"      ℹ️  {result.mismatch_details}")

    if verbose:
        click.echo("\n📝 步骤 4/7: 应用备注（后补/口头/运营）...")
    note_processor = NoteProcessor()
    context = note_processor.process(context)
    if verbose:
        overridden = sum(1 for c in context.judgment_cards if c.is_overridden)
        linjie_count = sum(1 for c in context.judgment_cards if c.overridden_by == Actor.LIN_JIE)
        operation_count = sum(1 for c in context.judgment_cards if c.overridden_by == Actor.OPERATION_MANAGER)
        click.echo(f"   ✅ 备注应用完成: {overridden} 个判断被覆盖")
        click.echo(f"      👩‍🏫 林姐覆盖: {linjie_count} 个")
        click.echo(f"      👔 运营主管覆盖: {operation_count} 个")

    if verbose:
        click.echo("\n✍️  步骤 5/7: 人工批注覆盖旧判断（卡点处理）...")
    confirm_handler = ManualConfirmationHandler(auto_confirm=auto_confirm)
    context = confirm_handler.process(context)
    if verbose:
        manual_count = sum(1 for c in context.judgment_cards if c.overridden_by == Actor.MANUAL)
        click.echo(f"   ✅ 人工确认处理完成: {manual_count} 个判断被人工批注覆盖")

    if verbose:
        click.echo("\n📜 步骤 6/7: 完善历史记录...")
    history_tracker = HistoryTracker()
    context = history_tracker.finalize_history(context)
    if verbose:
        click.echo(f"   ✅ 历史记录完善完成: 共 {len(context.history)} 条历史记录")

    if verbose:
        click.echo("\n⏱️  步骤 7/7: 生成历史时间线...")
    timeline_generator = TimelineGenerator(timeline_dir)
    outputs = timeline_generator.generate_all(context)
    if verbose:
        click.echo("   ✅ 时间线生成完成:")
        for fmt, path in outputs.items():
            click.echo(f"      📄 {fmt.upper()}: {path}")

    if verbose:
        click.echo("\n" + "=" * 70)
        click.echo("🎉 处理完成！")
        click.echo("=" * 70)
        click.echo(f"\n📊 最终统计:")
        click.echo(f"   📄 版权文件总数: {len(context.copyright_files)}")
        click.echo(f"   ✅ 最终匹配: {sum(1 for c in context.judgment_cards if c.current_judgment == JudgmentStatus.MATCHED)}")
        click.echo(f"   ❌ 最终不匹配: {sum(1 for c in context.judgment_cards if c.current_judgment == JudgmentStatus.MISMATCHED)}")
        click.echo(f"   🔄 被覆盖判断: {sum(1 for c in context.judgment_cards if c.is_overridden)}")
        click.echo(f"   👩‍🏫 林姐判断: {sum(1 for c in context.judgment_cards if c.overridden_by == Actor.LIN_JIE)}")
        click.echo(f"   👔 运营主管改动: {sum(1 for c in context.judgment_cards if c.overridden_by == Actor.OPERATION_MANAGER)}")
        click.echo(f"   ✍️  人工批注: {sum(1 for c in context.judgment_cards if c.overridden_by == Actor.MANUAL)}")
        click.echo(f"   ⏳ 待确认: {len(context.pending_confirmations)}")

    click.echo("\n" + "=" * 70)
    confirm_handler.print_exit_messages()

    click.echo("\n" + "=" * 70)
    click.echo("📂 输出文件位置:")
    click.echo("=" * 70)
    click.echo(f"   📁 原始数据: {raw_data_dir}")
    for fmt, path in outputs.items():
        click.echo(f"   📄 {fmt.upper()}时间线: {path}")
    click.echo("\n💡 提示: 打开 HTML 时间线可获得最佳可视化体验")
    click.echo("=" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())
