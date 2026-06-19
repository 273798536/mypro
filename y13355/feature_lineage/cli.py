from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List, Optional

import click

from .config_loader import ConfigLoader
from .models import ConfigSource, ProcessingResult
from .processor import DataProcessor
from .report_generator import ReportGenerator


@click.group()
@click.version_option()
def main():
    """特征血缘任务追踪系统 - Feature Lineage Task Tracking"""
    pass


@main.command()
@click.option(
    "--config", "-c",
    required=True,
    type=click.Path(exists=True),
    help="灰度配置文件路径 (YAML)",
)
@click.option(
    "--data", "-d",
    required=True,
    type=click.Path(exists=True),
    help="待处理数据文件路径 (CSV/JSON/Excel)",
)
@click.option(
    "--incremental-config", "-i",
    multiple=True,
    type=click.Path(exists=True),
    help="增量配置文件，可多次指定",
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="报告输出文件路径",
)
@click.option(
    "--format", "-f",
    type=click.Choice(["text", "json", "markdown"]),
    default="text",
    help="报告输出格式",
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="显示详细处理过程",
)
def run(
    config: str,
    data: str,
    incremental_config: List[str],
    output: Optional[str],
    format: str,
    verbose: bool,
):
    """普通模式：处理特征血缘追踪任务"""
    click.echo("=" * 60)
    click.echo("  特征血缘任务追踪 - 普通模式")
    click.echo("=" * 60)

    config_loader = ConfigLoader()

    click.echo(f"\n[1/4] 加载基础灰度配置: {config}")
    base_cfg, base_changes = config_loader.load_grayscale_config(config)
    click.echo(f"  ✓ 配置 ID: {base_cfg.config_id}")
    click.echo(f"  ✓ 特征数量: {len(base_cfg.features)}")

    current_cfg = base_cfg
    all_changes = list(base_changes)

    if incremental_config:
        click.echo(f"\n[2/4] 加载增量配置 ({len(incremental_config)} 个)")
        for idx, inc_cfg in enumerate(incremental_config, 1):
            click.echo(f"  [{idx}/{len(incremental_config)}] {inc_cfg}")
            incr_cfg, incr_changes = config_loader.load_incremental(
                inc_cfg, current_cfg.config_id
            )
            current_cfg, merge_changes = config_loader.merge_configs(
                current_cfg.config_id, incr_cfg.config_id
            )
            all_changes.extend(merge_changes)
            click.echo(
                f"    ✓ 变更数: {len(merge_changes)}"
            )

    click.echo(f"\n[3/4] 处理数据文件: {data}")
    processor = DataProcessor(config_loader, current_cfg)
    result = processor.process_file(data)
    result.changes = all_changes

    stats = result.stats.breakdown
    click.echo(f"  ✓ 总数: {stats['total']}")
    click.echo(f"    - 已处理: {stats['processed']}")
    click.echo(f"    - 坏行: {stats['bad']}")
    click.echo(f"    - 跳过: {stats['skipped']}")

    bad_rows = processor.get_bad_rows()
    if bad_rows:
        click.echo(f"\n  坏行详情 ({len(bad_rows)}):")
        for row in bad_rows[:5]:
            click.echo(
                f"    - 行 {row.source_line}, 对象 {row.source_object}: {row.error_message}"
            )
        if len(bad_rows) > 5:
            click.echo(f"    ... 还有 {len(bad_rows) - 5} 条")

    skipped_rows = processor.get_skipped_rows()
    if skipped_rows:
        click.echo(f"\n  跳过行详情 ({len(skipped_rows)}):")
        for row in skipped_rows[:5]:
            click.echo(
                f"    - 行 {row.source_line}, 对象 {row.source_object}: {row.skip_reason}"
            )
        if len(skipped_rows) > 5:
            click.echo(f"    ... 还有 {len(skipped_rows) - 5} 条")

    click.echo(f"\n[4/4] 生成报告")
    report_gen = ReportGenerator(config_loader)
    report = report_gen.generate_report(
        result, output_format=format, output_file=output
    )

    if output:
        click.echo(f"  ✓ 报告已保存: {output}")

    click.echo("\n")
    report_gen.print_console_report(report)

    if result.stats.bad > 0:
        click.echo(
            f"\n⚠️  警告: 发现 {result.stats.bad} 条坏数据，"
            f"请检查原始数据行或具体对象"
        )


@main.command()
@click.option(
    "--config", "-c",
    required=True,
    type=click.Path(exists=True),
    help="灰度配置文件路径 (YAML)",
)
@click.option(
    "--data", "-d",
    required=True,
    type=click.Path(exists=True),
    help="待处理数据文件路径 (CSV/JSON/Excel)",
)
@click.option(
    "--delayed-feature",
    required=True,
    help="要延迟注入的特征 ID",
)
@click.option(
    "--delayed-row",
    type=int,
    default=5,
    help="延迟注入的行索引 (从 0 开始)",
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="报告输出文件路径",
)
@click.option(
    "--format", "-f",
    type=click.Choice(["text", "json", "markdown"]),
    default="text",
    help="报告输出格式",
)
def test(
    config: str,
    data: str,
    delayed_feature: str,
    delayed_row: int,
    output: Optional[str],
    format: str,
):
    """测试模式：注入延迟特征，验证乱序处理能力"""
    click.echo("=" * 60)
    click.echo("  特征血缘任务追踪 - 测试模式")
    click.echo("=" * 60)
    click.echo(f"\n⚠️  测试配置:")
    click.echo(f"  - 延迟特征: {delayed_feature}")
    click.echo(f"  - 注入行索引: {delayed_row}")

    config_loader = ConfigLoader()

    click.echo(f"\n[1/3] 加载灰度配置: {config}")
    cfg, changes = config_loader.load_grayscale_config(
        config, config_source=ConfigSource.TEST
    )
    click.echo(f"  ✓ 配置 ID: {cfg.config_id}")
    click.echo(f"  ✓ 特征数量: {len(cfg.features)}")

    if delayed_feature not in {f.feature_id for f in cfg.features}:
        click.echo(f"\n✗ 错误: 延迟特征 {delayed_feature} 不在灰度配置中")
        click.echo("  可用特征:")
        for f in cfg.features:
            click.echo(f"    - {f.feature_id} ({f.feature_name})")
        sys.exit(1)

    click.echo(f"\n[2/3] 处理数据文件（注入延迟特征）: {data}")
    processor = DataProcessor(config_loader, cfg)
    result = processor.process_file(
        data,
        delayed_feature_id=delayed_feature,
        delayed_row_index=delayed_row,
    )
    result.changes = changes

    stats = result.stats.breakdown
    click.echo(f"  ✓ 总数: {stats['total']}")
    click.echo(f"    - 已处理: {stats['processed']}")
    click.echo(f"    - 坏行: {stats['bad']}")
    click.echo(f"    - 跳过: {stats['skipped']}")

    if result.has_delayed_feature:
        click.echo(f"\n  ✓ 延迟特征已注入: {result.delayed_feature_id}")
        injected_row = result.rows[delayed_row]
        if injected_row.status == "processed":
            click.echo("    ✓ 系统正确处理了迟到的特征")
        else:
            click.echo(
                f"    ⚠️  系统对迟到特征的处理状态: {injected_row.status}"
            )
            if injected_row.error_message:
                click.echo(f"       错误信息: {injected_row.error_message}")
            if injected_row.skip_reason:
                click.echo(f"       跳过原因: {injected_row.skip_reason}")

    click.echo(f"\n[3/3] 生成报告")
    report_gen = ReportGenerator(config_loader)
    report = report_gen.generate_report(
        result, output_format=format, output_file=output
    )

    if output:
        click.echo(f"  ✓ 报告已保存: {output}")

    click.echo("\n")
    report_gen.print_console_report(report)

    if result.has_delayed_feature and result.rows[delayed_row].status == "processed":
        click.echo("\n✅ 测试通过: 系统正确处理了迟到的特征")
    else:
        click.echo("\n⚠️  测试注意: 请检查系统对乱序材料的处理是否符合预期")


@main.command()
@click.option(
    "--config", "-c",
    required=True,
    type=click.Path(exists=True),
    help="灰度配置文件路径 (YAML)",
)
@click.option(
    "--data", "-d",
    required=True,
    type=click.Path(exists=True),
    help="待处理数据文件路径 (CSV/JSON/Excel)",
)
@click.option(
    "--incremental-config", "-i",
    multiple=True,
    type=click.Path(exists=True),
    help="增量配置文件，可多次指定",
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    default="handover_report.md",
    help="交接报告输出路径",
)
def handover(
    config: str,
    data: str,
    incremental_config: List[str],
    output: str,
):
    """交接模式：平台算法阿岑按普通交接方式试用"""
    click.echo("=" * 60)
    click.echo("  特征血缘任务追踪 - 交接模式")
    click.echo("=" * 60)
    click.echo("\n👋 你好，阿岑！这是交接模式的引导流程")

    config_loader = ConfigLoader()

    click.echo(f"\n[步骤 1/5] 从灰度配置找到原始说法")
    click.echo(f"  加载配置: {config}")
    base_cfg, base_changes = config_loader.load_grayscale_config(config)
    click.echo(f"  ✓ 配置 ID: {base_cfg.config_id}")
    click.echo(f"  ✓ 版本: {base_cfg.version}")
    click.echo(f"  ✓ 特征列表:")
    for f in base_cfg.features:
        sample_hint = f"{len(f.sample_ids)}个样本" if f.sample_ids else "无样本限制"
        threshold_hint = f"阈值={f.threshold}" if f.threshold else "无阈值"
        click.echo(
            f"    - {f.feature_id} ({f.feature_name}): "
            f"{threshold_hint}, {sample_hint}, "
            f"来源={f.source_file}:{f.source_line}"
        )

    current_cfg = base_cfg
    all_changes = list(base_changes)

    if incremental_config:
        click.echo(f"\n  发现 {len(incremental_config)} 个增量配置:")
        for idx, inc_cfg in enumerate(incremental_config, 1):
            click.echo(f"  [{idx}] {inc_cfg}")
            incr_cfg, incr_changes = config_loader.load_incremental(
                inc_cfg, current_cfg.config_id
            )
            current_cfg, merge_changes = config_loader.merge_configs(
                current_cfg.config_id, incr_cfg.config_id
            )
            all_changes.extend(merge_changes)

            for change in merge_changes:
                if change.is_overwrite:
                    click.echo(
                        f"    ⚠️  覆盖警告: 特征 {change.feature_id} 的 "
                        f"{change.change_type.value} 被覆盖 "
                        f"({change.old_value} → {change.new_value})"
                    )

    click.echo(f"\n[步骤 2/5] 处理数据文件: {data}")
    processor = DataProcessor(config_loader, current_cfg)
    result = processor.process_file(data)
    result.changes = all_changes

    stats = result.stats.breakdown
    click.echo(f"  处理结果统计:")
    click.echo(f"  ✓ 总数: {stats['total']}")
    click.echo(f"    - 已处理: {stats['processed']} ({stats['processed']/stats['total']*100:.1f}%)")
    click.echo(f"    - 坏行: {stats['bad']} ({stats['bad']/stats['total']*100:.1f}%)")
    click.echo(f"    - 跳过: {stats['skipped']} ({stats['skipped']/stats['total']*100:.1f}%)")

    click.echo(f"\n[步骤 3/5] 检查坏数据问题")
    bad_rows = processor.get_bad_rows()
    if bad_rows:
        click.echo(f"  发现 {len(bad_rows)} 条坏数据:")
        for row in bad_rows[:10]:
            cfg_ref = ""
            if row.matched_feature:
                feature = current_cfg.get_feature(row.matched_feature)
                if feature:
                    cfg_ref = f" (配置来源: {feature.source_file}:{feature.source_line})"
            click.echo(
                f"    - 行 {row.source_line}, 对象 {row.source_object}: "
                f"{row.error_message}{cfg_ref}"
            )
    else:
        click.echo("  ✓ 无坏数据")

    click.echo(f"\n[步骤 4/5] 检查跳过原因")
    skipped_rows = processor.get_skipped_rows()
    if skipped_rows:
        click.echo(f"  跳过 {len(skipped_rows)} 行:")
        for row in skipped_rows[:10]:
            click.echo(
                f"    - 行 {row.source_line}, 对象 {row.source_object}: "
                f"{row.skip_reason}"
            )
            if row.matched_feature:
                feature = current_cfg.get_feature(row.matched_feature)
                if feature:
                    click.echo(
                        f"      建议: 检查灰度配置 {feature.source_file}:{feature.source_line}"
                    )
    else:
        click.echo("  ✓ 无跳过行")

    click.echo(f"\n[步骤 5/5] 生成交接报告")
    report_gen = ReportGenerator(config_loader)
    report = report_gen.generate_report(
        result, output_format="markdown", output_file=output
    )

    click.echo(f"\n📋 交接报告摘要:")
    click.echo(f"  - 报告 ID: {report.report_id}")
    click.echo(f"  - 任务 ID: {report.task_id}")
    click.echo(f"  - 配置 ID: {report.config_id}")
    click.echo(f"  - 报告文件: {output}")

    sample_changes = len(report.sample_changes.details)
    threshold_changes = len(report.threshold_changes.details)
    manual_changes = len(report.manual_overrides.details)

    if sample_changes + threshold_changes + manual_changes > 0:
        click.echo(f"\n📊 变更统计:")
        if sample_changes:
            click.echo(f"  - 样本变化: {sample_changes} 处")
        if threshold_changes:
            click.echo(f"  - 阈值变化: {threshold_changes} 处")
        if manual_changes:
            click.echo(f"  - 人工改判: {manual_changes} 处")

    click.echo(f"\n✅ 交接完成！请查看 {output} 了解详情")
    click.echo(f"   可以从灰度配置文件溯源原始说法，")
    click.echo(f"   也可以从报告摘要讲清处理结果。")


@main.command()
@click.option(
    "--config",
    required=True,
    type=click.Path(exists=True),
    help="配置文件路径",
)
@click.option(
    "--feature",
    required=True,
    help="要查询的特征 ID",
)
def trace(config: str, feature: str):
    """查询特征的配置溯源历史"""
    config_loader = ConfigLoader()
    cfg, _ = config_loader.load_grayscale_config(config)

    trace = config_loader.get_feature_traceability(cfg.config_id, feature)

    if not trace:
        click.echo(f"未找到特征 {feature} 的配置记录")
        return

    click.echo(f"特征 {feature} 的配置溯源:")
    for idx, t in enumerate(trace, 1):
        click.echo(f"\n[{idx}] 版本 {t['version']}")
        click.echo(f"    配置 ID: {t['config_id']}")
        click.echo(f"    来源: {t['source_file']}:{t['source_line']}")
        click.echo(f"    配置类型: {t['config_source']}")
        click.echo(f"    阈值: {t['value']['threshold']}")
        click.echo(f"    样本: {t['value']['sample_ids']}")
        click.echo(f"    更新时间: {t['updated_at']}")


if __name__ == "__main__":
    main()
