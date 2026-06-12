#!/usr/bin/env python3
"""海冰厚度巡检图 - 命令行工具"""

import sys
import logging
from pathlib import Path

import click

from sea_ice_inspector.processor import DataProcessingEngine
from sea_ice_inspector.report import ReportGenerator
from sea_ice_inspector.review import ReviewManager
from sea_ice_inspector.sample_data import SampleDataGenerator
from sea_ice_inspector.models import ProcessingBatch, DataStatus, ExceptionType, InspectionPhoto
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cli")


class AppState:
    def __init__(self):
        self.engine = DataProcessingEngine()
        self.reporter = ReportGenerator()
        self.reviewer = ReviewManager()
        self.batch: ProcessingBatch = None


pass_state = click.make_pass_decorator(AppState, ensure=True)


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """海冰厚度巡检图 - 数据处理与报告生成工具

    所有图表、明细、下载文件共用同一批处理记录，
    复核备注和潮汐计算也挂在同一条记录上，确保数据一致。
    """
    pass


@cli.command()
@click.option("--count", default=20, help="生成浮标数据数量")
@click.option("--missing", default=5, help="缺失照片的浮标数量")
@pass_state
def demo(state: AppState, count: int, missing: int):
    """生成示例数据并运行完整演示流程"""
    click.echo("=" * 60)
    click.echo("  海冰厚度巡检图 - 演示模式")
    click.echo("=" * 60)
    click.echo("")

    click.echo(f"[1/5] 生成示例数据: {count} 个浮标, {missing} 个缺失照片")
    generator = SampleDataGenerator()
    buoys, photos = generator.generate_full_dataset(count, missing)
    click.echo(f"      ✓ 浮标数据: {len(buoys)} 条")
    click.echo(f"      ✓ 巡检照片: {len(photos)} 张")
    click.echo("")

    click.echo("[2/5] 数据处理（容错模式：照片缺失不阻断）")
    state.batch = state.engine.process_batch(buoys, photos, fail_fast=False)
    click.echo(f"      ✓ 总计: {state.batch.total_count}")
    click.echo(f"      ✓ 处理完成: {state.batch.processed_count}")
    click.echo(f"      ✓ 部分完成: {state.batch.partial_count}")
    click.echo(f"      ✓ 处理失败: {state.batch.failed_count}")
    click.echo(f"      ✓ 数据缺口: {state.batch.gaps_count}")
    click.echo("")

    click.echo("[3/5] 生成报告")
    report_files = state.reporter.generate_full_report(state.batch)
    for name, path in report_files.items():
        click.echo(f"      ✓ {name}: {path}")
    click.echo("")

    click.echo("[4/5] 数据缺口清单（给科研助理补）")
    gaps = state.engine.get_data_gaps_report(state.batch)
    for gap in gaps[:5]:
        click.echo(f"      • {gap['buoy_id']} - {gap['description']}")
    if len(gaps) > 5:
        click.echo(f"      ... 还有 {len(gaps) - 5} 条")
    click.echo("")

    click.echo("[5/5] 待复核项入口")
    pending = state.reviewer.get_pending_review_items(state.batch)
    click.echo(f"      共 {len(pending)} 项待复核")
    for item in pending[:3]:
        click.echo(
            f"      • [{item['exception_type']}] {item['buoy_id']} - "
            f"{item['description'][:40]}..."
        )
    if len(pending) > 3:
        click.echo(f"      ... 还有 {len(pending) - 3} 项")
    click.echo("")

    click.echo("=" * 60)
    click.echo("  演示完成！")
    click.echo("  下一步:")
    click.echo("    • python main.py report   - 查看完整报告")
    click.echo("    • python main.py gaps     - 查看数据缺口")
    click.echo("    • python main.py review   - 进入复核模式")
    click.echo("    • python main.py trace    - 追溯单条异常")
    click.echo("=" * 60)


@cli.command()
@pass_state
def report(state: AppState):
    """显示海冰巡检报告"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据，或使用 process 命令导入数据")
        return

    text = state.reporter.generate_plain_text_summary(state.batch)
    click.echo(text)


@cli.command()
@pass_state
def gaps(state: AppState):
    """查看数据缺口清单（给科研助理）"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    gaps = state.engine.get_data_gaps_report(state.batch)
    click.echo("=" * 60)
    click.echo("  数据缺口清单（科研助理待补充）")
    click.echo("=" * 60)
    click.echo("")

    if not gaps:
        click.echo("  ✓ 暂无数据缺口，所有资料齐全")
    else:
        for i, gap in enumerate(gaps, 1):
            click.echo(f"  {i}. [{gap['gap_type']}] 浮标 {gap['buoy_id']}")
            click.echo(f"     说明: {gap['description']}")
            click.echo(f"     负责人: {gap['reported_to']}")
            click.echo(f"     记录ID: {gap['record_id']}")
            click.echo("")

    click.echo(f"  共 {len(gaps)} 项待补充")
    click.echo("")
    click.echo("  补充照片命令:")
    click.echo("    python main.py add-photo <记录ID> <照片路径>")
    click.echo("")


@cli.command()
@pass_state
def review(state: AppState):
    """进入复核模式（列出待复核项）"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    summary = state.reviewer.get_review_summary(state.batch)
    pending = state.reviewer.get_pending_review_items(state.batch)

    click.echo("=" * 60)
    click.echo("  复核工作台")
    click.echo("=" * 60)
    click.echo("")
    click.echo(f"  总记录数: {summary['total_records']}")
    click.echo(f"  待复核: {summary['pending_review']}")
    click.echo(f"  已完成复核: {summary['reviewed']}")
    click.echo(f"  数据缺口: {summary['gaps_pending']}")
    click.echo("")

    click.echo("  异常分类统计:")
    for ex_type, stats in summary["exceptions_by_type"].items():
        click.echo(
            f"    {ex_type}: 总计 {stats['total']}, "
            f"已复核 {stats['reviewed']}, 待处理 {stats['pending']}"
        )
    click.echo("")

    click.echo("  待复核项:")
    if not pending:
        click.echo("    ✓ 全部已完成复核")
    else:
        for i, item in enumerate(pending, 1):
            item_type = "异常" if "trace_id" in item else "缺口"
            item_id = item.get("trace_id") or item.get("gap_id", "")
            click.echo(
                f"    {i}. [{item_type}] {item_id}"
            )
            click.echo(f"       浮标: {item['buoy_id']}")
            click.echo(f"       类型: {item['exception_type']}")
            click.echo(f"       描述: {item['description']}")
            click.echo(f"       处理意见: {item['processing_opinion']}")
            click.echo(f"       记录ID: {item['record_id']}")
            click.echo("")

    click.echo("  复核操作:")
    click.echo("    python main.py trace <异常ID>     - 追溯异常详情")
    click.echo("    python main.py add-note <记录ID>  - 添加复核备注")
    click.echo("    python main.py fix-thickness      - 修正冰厚")
    click.echo("    python main.py add-photo          - 补充照片")
    click.echo("")


@cli.command()
@click.argument("trace_id")
@pass_state
def trace(state: AppState, trace_id: str):
    """追溯一条异常记录，查看完整链路"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    for record in state.batch.records:
        for trace_item in record.exception_traces:
            if trace_item.trace_id == trace_id:
                detail = state.reviewer.trace_exception(record, trace_id)
                click.echo("=" * 60)
                click.echo(f"  异常追溯: {trace_id}")
                click.echo("=" * 60)
                click.echo("")

                click.echo("  【异常信息】")
                click.echo(f"    类型: {detail['trace']['exception_type']}")
                click.echo(f"    描述: {detail['trace']['description']}")
                click.echo(f"    检测时间: {detail['trace']['detected_time']}")
                click.echo("")

                click.echo("  【处理意见】")
                click.echo(f"    {detail['processing_opinion']}")
                click.echo("")

                click.echo("  【原始浮标数据】")
                buoy = detail["buoy_data"]
                click.echo(f"    浮标ID: {buoy['buoy_id']}")
                click.echo(f"    时间: {buoy['timestamp']}")
                click.echo(f"    位置: {buoy['latitude']}, {buoy['longitude']}")
                click.echo(f"    原始冰厚: {buoy['ice_thickness']} cm")
                click.echo(f"    数据来源: {buoy['raw_source']}")
                click.echo("")

                if detail["tide_calculation"]:
                    tide = detail["tide_calculation"]
                    click.echo("  【潮汐计算】")
                    click.echo(f"    算法版本: {tide['algorithm_version']}")
                    click.echo(f"    当前潮位: {tide['current_tide']} m")
                    click.echo(f"    高潮: {tide['high_tide']} m")
                    click.echo(f"    低潮: {tide['low_tide']} m")
                    click.echo(f"    校正后厚度: {tide['tide_corrected_thickness']} cm")
                    click.echo("")

                if detail["inspection_photo"]:
                    photo = detail["inspection_photo"]
                    click.echo("  【巡检照片】")
                    click.echo(f"    照片ID: {photo['photo_id']}")
                    click.echo(f"    上传时间: {photo['timestamp']}")
                    click.echo(f"    文件路径: {photo['file_path']}")
                    click.echo(f"    上传人: {photo['uploader']}")
                    if photo["annotation"]:
                        click.echo(f"    备注: {photo['annotation']}")
                    click.echo("")

                if detail["review_notes"]:
                    click.echo("  【复核记录】")
                    for note in detail["review_notes"]:
                        click.echo(f"    - {note['reviewer']} 于 {note['review_time']}")
                        click.echo(f"      {note['content']}")
                    click.echo("")

                click.echo("  【记录状态】")
                click.echo(f"    状态: {detail['record_status']}")
                click.echo("")

                click.echo("  ★ 追溯链路完整：异常 → 浮标原始数据 → 处理意见 → 潮汐计算 → 照片 → 复核记录")
                click.echo("")
                return

    click.echo(f"未找到异常记录: {trace_id}")


@cli.command()
@click.argument("record_id")
@click.option("--reviewer", default="科研助理", help="复核人姓名")
@click.option("--content", prompt="请输入复核备注内容", help="复核备注内容")
@pass_state
def add_note(state: AppState, record_id: str, reviewer: str, content: str):
    """为指定记录添加复核备注"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    for record in state.batch.records:
        if record.record_id == record_id:
            updated = state.reviewer.add_review_note(
                record=record,
                reviewer=reviewer,
                content=content,
                is_exception=False,
            )
            click.echo(f"✓ 已为记录 {record_id} 添加复核备注")
            click.echo(f"  当前状态: {updated.status.value}")
            click.echo(f"  备注数: {len(updated.review_notes)}")
            return

    click.echo(f"未找到记录: {record_id}")


@cli.command()
@click.argument("record_id")
@click.option("--photo-path", required=True, help="照片文件路径")
@click.option("--reviewer", default="科研助理", help="上传人")
@pass_state
def add_photo(state: AppState, record_id: str, photo_path: str, reviewer: str):
    """为指定记录补充巡检照片"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    for record in state.batch.records:
        if record.record_id == record_id:
            photo = InspectionPhoto(
                photo_id=f"photo_{len(record.review_notes)+1:04d}",
                buoy_id=record.buoy_id,
                timestamp=datetime.now(),
                file_path=photo_path,
                uploader=reviewer,
                annotation="复核补充照片",
            )
            updated = state.reviewer.add_inspection_photo(record, photo, reviewer)
            state.batch.update_stats()

            click.echo(f"✓ 已为记录 {record_id} 补充照片")
            click.echo(f"  当前状态: {updated.status.value}")
            click.echo(f"  剩余缺口: {len([g for g in updated.data_gaps if not g.resolved])}")
            return

    click.echo(f"未找到记录: {record_id}")


@cli.command()
@click.argument("record_id")
@click.option("--thickness", type=float, required=True, help="修正后的冰厚(cm)")
@click.option("--reason", prompt="请输入修正原因", help="修正原因")
@click.option("--reviewer", default="科研助理", help="复核人")
@pass_state
def fix_thickness(state: AppState, record_id: str, thickness: float, reason: str, reviewer: str):
    """修正指定记录的冰厚值（自动重算潮汐）"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    for record in state.batch.records:
        if record.record_id == record_id:
            old_thickness = record.final_ice_thickness
            updated = state.reviewer.update_ice_thickness(
                record=record,
                new_thickness=thickness,
                reviewer=reviewer,
                reason=reason,
                recalculate_tide=True,
            )
            state.batch.update_stats()

            click.echo(f"✓ 已修正记录 {record_id} 的冰厚")
            click.echo(f"  原值: {old_thickness} cm")
            click.echo(f"  新值: {updated.final_ice_thickness} cm (潮汐校正后)")
            click.echo(f"  状态: {updated.status.value}")
            click.echo("")
            click.echo("  ★ 潮汐已同步重算，报告和图表会自动使用新数据")
            return

    click.echo(f"未找到记录: {record_id}")


@cli.command()
@pass_state
def export(state: AppState):
    """导出完整报告（图表+Excel）"""
    if state.batch is None:
        click.echo("请先运行 demo 生成数据")
        return

    click.echo("正在生成完整报告...")
    files = state.reporter.generate_full_report(state.batch)

    click.echo("")
    click.echo("✓ 报告生成完成！所有文件共用同一批数据：")
    click.echo("")
    for name, path in files.items():
        labels = {
            "text": "文本报告",
            "thickness_chart": "厚度时序图",
            "spatial_chart": "空间分布图",
            "excel": "Excel明细表",
        }
        click.echo(f"  • {labels.get(name, name)}: {path}")
    click.echo("")
    click.echo("  ★ 图表、明细、复核记录全部来自同一批处理记录")
    click.echo("")


def main():
    cli()


if __name__ == "__main__":
    main()
