import click
import sys
import os
from typing import List, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

from .models import (
    RowStatus, GrayFlag, ModificationType,
    SnapshotVersion, SnapshotThreshold
)
from .processor import SnapshotProcessor
from .diff import VersionComparator
from .exporter import SnapshotExporter

console = Console()


def _print_stats_summary(stats):
    total = stats.total
    processed = stats.processed
    bad = stats.bad
    skipped = stats.skipped
    boundary = stats.boundary

    grid = Table.grid(expand=True)
    grid.add_column(justify="center", ratio=1)
    grid.add_column(justify="center", ratio=1)
    grid.add_column(justify="center", ratio=1)
    grid.add_column(justify="center", ratio=1)
    grid.add_column(justify="center", ratio=1)

    def make_stat(label, value, color, count=None, total_count=None):
        pct = f"({count/total_count:.2%})" if count is not None and total_count else ""
        return Text.assemble(
            (f"{label}\n", "dim"),
            (f"{value} ", color),
            (pct, "dim"),
        )

    grid.add_row(
        make_stat("总数", total, "white"),
        make_stat("已处理", processed, "green", processed, total),
        make_stat("坏行", bad, "red", bad, total),
        make_stat("跳过", skipped, "yellow", skipped, total),
        make_stat("边界", boundary, "magenta", boundary, total),
    )

    console.print(Panel(grid, title="[bold]处理统计[/bold]", border_style="blue"))


def _print_gray_stats(stats, version):
    table = Table(title="灰度发布统计", box=box.SIMPLE)
    table.add_column("状态", style="cyan")
    table.add_column("数量", justify="right")
    table.add_column("占比", justify="right")
    table.add_column("说明", style="dim")

    total = stats.total
    gray_candidate = stats.gray_candidate
    gray_enabled = stats.gray_enabled
    gray_error = stats.gray_error
    normal = total - gray_candidate - gray_enabled - gray_error

    table.add_row(
        "灰度候选",
        str(gray_candidate),
        f"{gray_candidate/total:.2%}" if total else "0%",
        "等待灰度验证",
        style="yellow",
    )
    table.add_row(
        "灰度生效",
        str(gray_enabled),
        f"{gray_enabled/total:.2%}" if total else "0%",
        "已进入灰度流量",
        style="green",
    )
    table.add_row(
        "灰度错误",
        str(gray_error),
        f"{gray_error/total:.2%}" if total else "0%",
        "灰度比例配置错误",
        style="red",
    )
    table.add_row(
        "正常",
        str(normal),
        f"{normal/total:.2%}" if total else "0%",
        "非灰度样本",
        style="white",
    )

    console.print(table)

    if version.gray_ratio_config is not None:
        console.print(
            f"\n[dim]灰度配置比例:[/dim] [cyan]{version.gray_ratio_config}[/cyan]  "
            f"[dim]实际灰度比例:[/dim] [cyan]{stats.gray_rate:.2%}[/cyan]"
        )
        if version.gray_ratio_config < 0 or version.gray_ratio_config > 1:
            console.print(
                "[red]⚠️  警告: 灰度比例配置错误，应在 0-1 之间[/red]"
            )


def _print_modification_stats(stats):
    table = Table(title="修改统计", box=box.SIMPLE)
    table.add_column("修改类型", style="cyan")
    table.add_column("数量", justify="right")
    table.add_column("占比", justify="right")

    total = stats.total
    manual = stats.manual_corrections
    auto = stats.auto_fixes
    threshold = stats.threshold_adjustments

    table.add_row(
        "人工修正", str(manual),
        f"{manual/total:.2%}" if total else "0%",
        style="magenta",
    )
    table.add_row(
        "自动修复", str(auto),
        f"{auto/total:.2%}" if total else "0%",
        style="blue",
    )
    table.add_row(
        "阈值调整", str(threshold),
        f"{threshold/total:.2%}" if total else "0%",
        style="yellow",
    )

    console.print(table)


def _print_metrics(metrics):
    table = Table(title="特征指标", box=box.SIMPLE)
    table.add_column("特征", style="cyan")
    table.add_column("均值", justify="right")
    table.add_column("标准差", justify="right")
    table.add_column("最小值", justify="right")
    table.add_column("最大值", justify="right")
    table.add_column("缺失", justify="right")
    table.add_column("异常", justify="right")

    for feature in sorted(metrics.mean_values.keys()):
        table.add_row(
            feature,
            f"{metrics.mean_values[feature]:.4f}",
            f"{metrics.std_values[feature]:.4f}",
            f"{metrics.min_values[feature]:.4f}",
            f"{metrics.max_values[feature]:.4f}",
            str(metrics.null_counts[feature]),
            str(metrics.outlier_counts[feature]),
        )

    console.print(table)


def _print_bad_rows(rows, limit: int = 20):
    bad_rows = [r for r in rows if r.status == RowStatus.BAD]
    if not bad_rows:
        console.print("\n[green]✓ 无坏行[/green]")
        return

    table = Table(title=f"坏行详情 (共 {len(bad_rows)} 行)", box=box.SIMPLE)
    table.add_column("sample_id", style="cyan")
    table.add_column("错误原因", style="red")

    for row in bad_rows[:limit]:
        table.add_row(row.sample_id, row.error_message or "未知错误")

    if len(bad_rows) > limit:
        table.add_row(f"... 还有 {len(bad_rows) - limit} 行", "...")

    console.print(table)


def _print_skipped_rows(rows, limit: int = 20):
    skipped_rows = [r for r in rows if r.status == RowStatus.SKIPPED]
    if not skipped_rows:
        console.print("\n[green]✓ 无跳过行[/green]")
        return

    table = Table(title=f"跳过行详情 (共 {len(skipped_rows)} 行)", box=box.SIMPLE)
    table.add_column("sample_id", style="cyan")
    table.add_column("原因", style="yellow")

    for row in skipped_rows[:limit]:
        table.add_row(row.sample_id, row.error_message or "按规则跳过")

    if len(skipped_rows) > limit:
        table.add_row(f"... 还有 {len(skipped_rows) - limit} 行", "...")

    console.print(table)


def _print_boundary_rows(rows, limit: int = 20):
    boundary_rows = [r for r in rows if r.is_boundary]
    if not boundary_rows:
        console.print("\n[green]✓ 无边界样本[/green]")
        return

    table = Table(title=f"边界样本详情 (共 {len(boundary_rows)} 行)", box=box.SIMPLE)
    table.add_column("sample_id", style="magenta")
    table.add_column("特征预览", style="dim")

    for row in boundary_rows[:limit]:
        features_preview = ", ".join(
            f"{k}={v:.2f}" for k, v in list(row.features.items())[:3]
        )
        table.add_row(row.sample_id, features_preview + "..." if len(row.features) > 3 else features_preview)

    if len(boundary_rows) > limit:
        table.add_row(f"... 还有 {len(boundary_rows) - limit} 行", "...")

    console.print(table)


def _print_modified_rows(rows, limit: int = 20):
    modified_rows = [r for r in rows if r.modification_type != ModificationType.NONE]
    if not modified_rows:
        console.print("\n[green]✓ 无修改记录[/green]")
        return

    table = Table(title=f"修改记录详情 (共 {len(modified_rows)} 行)", box=box.SIMPLE)
    table.add_column("sample_id", style="cyan")
    table.add_column("修改类型", style="magenta")
    table.add_column("修改说明", style="dim")

    type_map = {
        ModificationType.MANUAL_CORRECTION: "人工修正",
        ModificationType.AUTO_FIX: "自动修复",
        ModificationType.THRESHOLD_ADJUSTMENT: "阈值调整",
    }

    for row in modified_rows[:limit]:
        table.add_row(
            row.sample_id,
            type_map.get(row.modification_type, row.modification_type.value),
            row.modification_note or "",
        )

    if len(modified_rows) > limit:
        table.add_row(f"... 还有 {len(modified_rows) - limit} 行", "...", "...")

    console.print(table)


def _print_gray_rows(rows, limit: int = 20):
    gray_rows = [r for r in rows if r.gray_flag != GrayFlag.NORMAL]
    if not gray_rows:
        console.print("\n[green]✓ 无灰度标记样本[/green]")
        return

    table = Table(title=f"灰度标记样本 (共 {len(gray_rows)} 行)", box=box.SIMPLE)
    table.add_column("sample_id", style="cyan")
    table.add_column("灰度状态", style="yellow")
    table.add_column("灰度比例", justify="right")

    flag_map = {
        GrayFlag.GRAY_CANDIDATE: "灰度候选",
        GrayFlag.GRAY_ENABLED: "灰度生效",
        GrayFlag.GRAY_ERROR: "灰度错误",
    }

    for row in gray_rows[:limit]:
        table.add_row(
            row.sample_id,
            flag_map.get(row.gray_flag, row.gray_flag.value),
            f"{row.gray_ratio:.2%}" if row.gray_ratio is not None else "N/A",
        )

    if len(gray_rows) > limit:
        table.add_row(f"... 还有 {len(gray_rows) - limit} 行", "...", "...")

    console.print(table)


def _print_diff_summary(diff):
    console.print("\n" + "=" * 60)
    console.print(f"[bold]版本对比[/bold]: {diff.old_version_id} → {diff.new_version_id}")
    console.print("=" * 60)

    if diff.sample_changes:
        added = len([c for c in diff.sample_changes if c["change_type"] == "added"])
        removed = len([c for c in diff.sample_changes if c["change_type"] == "removed"])
        modified = len([c for c in diff.sample_changes if c["change_type"] == "modified"])

        console.print(f"\n[cyan]样本变化:[/cyan] +{added} 新增, -{removed} 删除, ~{modified} 修改")

    if diff.threshold_changes:
        console.print(f"[cyan]阈值变化:[/cyan] {len(diff.threshold_changes)} 项")

    if diff.manual_corrections:
        console.print(f"[cyan]人工修正:[/cyan] {len(diff.manual_corrections)} 条")

    if diff.metric_changes:
        console.print(f"[cyan]指标变化:[/cyan] {len(diff.metric_changes)} 个特征")

    if diff.status_changes:
        console.print(f"[cyan]状态变化:[/cyan] {len(diff.status_changes)} 项")

    if diff.gray_changes:
        console.print(f"[cyan]灰度变化:[/cyan] 有变化")
        if "gray_ratio_config" in diff.gray_changes:
            grc = diff.gray_changes["gray_ratio_config"]
            console.print(f"  灰度配置: {grc['old']} → {grc['new']}")
        if "gray_samples" in diff.gray_changes:
            gs = diff.gray_changes["gray_samples"]
            console.print(f"  灰度样本: +{gs['count_added']} 新增, -{gs['count_removed']} 移除")


def _parse_thresholds(thresholds_str: Optional[str]) -> dict:
    if not thresholds_str:
        return {}

    thresholds = {}
    for item in thresholds_str.split(","):
        parts = item.strip().split(":")
        if len(parts) >= 3:
            feature = parts[0].strip()
            min_val = float(parts[1]) if parts[1] else None
            max_val = float(parts[2]) if parts[2] else None
            is_manual = len(parts) > 3 and parts[3].lower() == "manual"
            thresholds[feature] = SnapshotThreshold(
                feature_name=feature,
                min_value=min_val,
                max_value=max_val,
                is_manual=is_manual,
            )
    return thresholds


@click.group()
@click.version_option(version="0.1.0", prog_name="tqs")
def main():
    """训练队列版本快照 - MLOps训练数据质量管理工具"""
    pass


@main.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--version-name", "-n", default="", help="版本名称")
@click.option("--version-desc", "-d", default="", help="版本描述")
@click.option("--parent-version", "-p", default=None, help="父版本ID")
@click.option("--gray-ratio", "-g", type=float, default=None, help="灰度比例 (0-1)")
@click.option("--thresholds", "-t", default=None, help="阈值配置, 格式: feature1:min:max[:manual],feature2:...")
@click.option("--feature-cols", "-f", default=None, help="特征列名, 逗号分隔")
@click.option("--label-col", "-l", default=None, help="标签列名")
@click.option("--sample-id-col", "-s", default=None, help="样本ID列名")
@click.option("--output-dir", "-o", default="./output", help="输出目录")
@click.option("--export-json/--no-export-json", default=True, help="是否导出JSON")
@click.option("--export-csv/--no-export-csv", default=True, help="是否导出CSV")
@click.option("--export-report/--no-export-report", default=True, help="是否导出报告")
@click.option("--detail-limit", default=20, help="详情列表显示行数限制")
def process(
    file_path, version_name, version_desc, parent_version, gray_ratio,
    thresholds, feature_cols, label_col, sample_id_col, output_dir,
    export_json, export_csv, export_report, detail_limit
):
    """处理特征快照文件并生成版本快照"""

    console.print(
        Panel.fit(
            "[bold]训练队列版本快照[/bold]\n"
            "[dim]Training Queue Snapshot[/dim]",
            border_style="blue",
        )
    )

    version = SnapshotVersion(
        name=version_name,
        description=version_desc,
        parent_version=parent_version,
        gray_ratio_config=gray_ratio,
        thresholds=_parse_thresholds(thresholds),
    )

    processor = SnapshotProcessor(version=version)

    feature_cols_list = feature_cols.split(",") if feature_cols else None

    try:
        with console.status(f"[green]正在处理文件: {file_path}[/green]"):
            snapshot = processor.process(
                file_path=file_path,
                feature_cols=feature_cols_list,
                label_col=label_col,
                sample_id_col=sample_id_col,
            )
    except Exception as e:
        console.print(f"[red]处理失败: {e}[/red]")
        sys.exit(1)

    console.print(f"\n[green]✓ 处理完成[/green] 快照ID: {snapshot.snapshot_id}")
    console.print(f"[dim]版本ID: {snapshot.version.version_id}[/dim]")
    console.print(f"[dim]处理时长: {snapshot.stats.end_time - snapshot.stats.start_time}[/dim]")

    _print_stats_summary(snapshot.stats)
    _print_gray_stats(snapshot.stats, snapshot.version)
    _print_modification_stats(snapshot.stats)
    _print_metrics(snapshot.metrics)
    _print_bad_rows(snapshot.rows, detail_limit)
    _print_skipped_rows(snapshot.rows, detail_limit)
    _print_boundary_rows(snapshot.rows, detail_limit)
    _print_modified_rows(snapshot.rows, detail_limit)
    _print_gray_rows(snapshot.rows, detail_limit)

    exporter = SnapshotExporter(output_dir=output_dir)
    exported_files = []

    if export_json:
        json_path = exporter.export_json(snapshot)
        exported_files.append(("JSON", json_path))

    if export_csv:
        csv_path = exporter.export_csv(snapshot)
        exported_files.append(("CSV", csv_path))

    if export_report:
        report_path = exporter.export_report(snapshot)
        exported_files.append(("报告", report_path))

    if exported_files:
        console.print("\n[cyan]导出文件:[/cyan]")
        for fmt, path in exported_files:
            console.print(f"  [green]✓[/green] {fmt}: {path}")


@main.command()
@click.argument("old_snapshot", type=click.Path(exists=True))
@click.argument("new_snapshot", type=click.Path(exists=True))
@click.option("--output-dir", "-o", default="./output", help="输出目录")
@click.option("--export-report/--no-export-report", default=True, help="是否导出对比报告")
def compare(old_snapshot, new_snapshot, output_dir, export_report):
    """对比两个版本快照"""

    exporter = SnapshotExporter(output_dir=output_dir)

    try:
        with console.status("[green]正在加载快照...[/green]"):
            old_snap = exporter.load_snapshot(old_snapshot)
            new_snap = exporter.load_snapshot(new_snapshot)
    except Exception as e:
        console.print(f"[red]加载失败: {e}[/red]")
        sys.exit(1)

    comparator = VersionComparator()

    with console.status("[green]正在对比版本...[/green]"):
        diff = comparator.compare(old_snap, new_snap)

    _print_diff_summary(diff)

    console.print("\n[cyan]旧版本统计:[/cyan]")
    _print_stats_summary(old_snap.stats)

    console.print("\n[cyan]新版本统计:[/cyan]")
    _print_stats_summary(new_snap.stats)

    if diff.status_changes:
        table = Table(title="状态变化详情", box=box.SIMPLE)
        table.add_column("指标", style="cyan")
        table.add_column("旧值", justify="right")
        table.add_column("新值", justify="right")
        table.add_column("变化", justify="right")

        for field, change in diff.status_changes.items():
            delta = change["delta"]
            delta_str = f"[green]{delta:+d}[/green]" if delta > 0 else f"[red]{delta:+d}[/red]" if delta < 0 else f"{delta:+d}"
            table.add_row(
                field,
                str(change["old"]),
                str(change["new"]),
                delta_str,
            )
        console.print(table)

    if diff.metric_changes:
        table = Table(title="指标变化详情 (Top 10)", box=box.SIMPLE)
        table.add_column("特征", style="cyan")
        table.add_column("均值变化", justify="right")
        table.add_column("标准差变化", justify="right")
        table.add_column("异常值变化", justify="right")

        for feature, changes in list(diff.metric_changes.items())[:10]:
            mean_delta = changes.get("mean_delta", 0)
            std_delta = changes.get("std_delta", 0)
            outlier_delta = changes.get("outlier_delta", 0)

            mean_str = f"[green]{mean_delta:+.4f}[/green]" if mean_delta > 0 else f"[red]{mean_delta:+.4f}[/red]" if mean_delta < 0 else f"{mean_delta:+.4f}"
            std_str = f"[green]{std_delta:+.4f}[/green]" if std_delta > 0 else f"[red]{std_delta:+.4f}[/red]" if std_delta < 0 else f"{std_delta:+.4f}"
            outlier_str = f"[green]{outlier_delta:+d}[/green]" if outlier_delta < 0 else f"[red]{outlier_delta:+d}[/red]" if outlier_delta > 0 else f"{outlier_delta:+d}"

            table.add_row(feature, mean_str, std_str, outlier_str)

        if len(diff.metric_changes) > 10:
            table.add_row(f"... 还有 {len(diff.metric_changes) - 10} 个特征", "...", "...", "...")

        console.print(table)

    if export_report:
        report_path = exporter.export_diff_report(diff)
        console.print(f"\n[cyan]对比报告已导出:[/cyan] [green]{report_path}[/green]")


@main.command()
@click.argument("snapshot_file", type=click.Path(exists=True))
@click.option("--status", "-s", multiple=True,
              type=click.Choice(["processed", "bad", "skipped", "boundary"]),
              help="按状态筛选")
@click.option("--gray", "-g", multiple=True,
              type=click.Choice(["normal", "gray_candidate", "gray_enabled", "gray_error"]),
              help="按灰度状态筛选")
@click.option("--modification", "-m", multiple=True,
              type=click.Choice(["none", "manual_correction", "auto_fix", "threshold_adjustment"]),
              help="按修改类型筛选")
@click.option("--boundary-only", is_flag=True, help="仅显示边界样本")
@click.option("--limit", "-n", default=50, help="显示行数限制")
def filter(snapshot_file, status, gray, modification, boundary_only, limit):
    """筛选并显示快照中的样本"""

    exporter = SnapshotExporter()

    try:
        snapshot = exporter.load_snapshot(snapshot_file)
    except Exception as e:
        console.print(f"[red]加载失败: {e}[/red]")
        sys.exit(1)

    processor = SnapshotProcessor()

    status_filter = [RowStatus(s) for s in status] if status else None
    gray_filter = [GrayFlag(g) for g in gray] if gray else None
    modification_filter = [ModificationType(m) for m in modification] if modification else None

    filtered = processor.filter_rows(
        snapshot,
        status_filter=status_filter,
        gray_filter=gray_filter,
        modification_filter=modification_filter,
        boundary_only=boundary_only,
    )

    console.print(f"\n[cyan]筛选结果:[/cyan] 共 {len(filtered)} 行 (显示前 {limit} 行)")

    if not filtered:
        console.print("[yellow]无匹配记录[/yellow]")
        return

    table = Table(title="筛选结果", box=box.SIMPLE)
    table.add_column("sample_id", style="cyan")
    table.add_column("状态", style="green")
    table.add_column("灰度", style="yellow")
    table.add_column("边界", style="magenta")
    table.add_column("修改", style="blue")
    table.add_column("特征预览", style="dim")

    status_map = {
        RowStatus.PROCESSED: "已处理",
        RowStatus.BAD: "坏行",
        RowStatus.SKIPPED: "跳过",
        RowStatus.BOUNDARY: "边界",
    }

    gray_map = {
        GrayFlag.NORMAL: "正常",
        GrayFlag.GRAY_CANDIDATE: "候选",
        GrayFlag.GRAY_ENABLED: "生效",
        GrayFlag.GRAY_ERROR: "错误",
    }

    mod_map = {
        ModificationType.NONE: "-",
        ModificationType.MANUAL_CORRECTION: "人工",
        ModificationType.AUTO_FIX: "自动",
        ModificationType.THRESHOLD_ADJUSTMENT: "阈值",
    }

    for row in filtered[:limit]:
        features_preview = ", ".join(
            f"{k}={v:.2f}" for k, v in list(row.features.items())[:2]
        )
        table.add_row(
            row.sample_id,
            status_map.get(row.status, row.status.value),
            gray_map.get(row.gray_flag, row.gray_flag.value),
            "是" if row.is_boundary else "-",
            mod_map.get(row.modification_type, row.modification_type.value),
            features_preview + "..." if len(row.features) > 2 else features_preview,
        )

    if len(filtered) > limit:
        table.add_row(f"... 还有 {len(filtered) - limit} 行", "...", "...", "...", "...", "...")

    console.print(table)


@main.command()
@click.argument("snapshot_file", type=click.Path(exists=True))
@click.argument("sample_id")
def detail(snapshot_file, sample_id):
    """查看样本详情"""

    exporter = SnapshotExporter()

    try:
        snapshot = exporter.load_snapshot(snapshot_file)
    except Exception as e:
        console.print(f"[red]加载失败: {e}[/red]")
        sys.exit(1)

    target_row = None
    for row in snapshot.rows:
        if row.sample_id == sample_id:
            target_row = row
            break

    if not target_row:
        console.print(f"[red]未找到样本: {sample_id}[/red]")
        sys.exit(1)

    status_map = {
        RowStatus.PROCESSED: ("已处理", "green"),
        RowStatus.BAD: ("坏行", "red"),
        RowStatus.SKIPPED: ("跳过", "yellow"),
        RowStatus.BOUNDARY: ("边界", "magenta"),
    }

    gray_map = {
        GrayFlag.NORMAL: ("正常", "white"),
        GrayFlag.GRAY_CANDIDATE: ("灰度候选", "yellow"),
        GrayFlag.GRAY_ENABLED: ("灰度生效", "green"),
        GrayFlag.GRAY_ERROR: ("灰度错误", "red"),
    }

    mod_map = {
        ModificationType.NONE: ("无", "white"),
        ModificationType.MANUAL_CORRECTION: ("人工修正", "magenta"),
        ModificationType.AUTO_FIX: ("自动修复", "blue"),
        ModificationType.THRESHOLD_ADJUSTMENT: ("阈值调整", "yellow"),
    }

    status_text, status_color = status_map.get(target_row.status, (target_row.status.value, "white"))
    gray_text, gray_color = gray_map.get(target_row.gray_flag, (target_row.gray_flag.value, "white"))
    mod_text, mod_color = mod_map.get(target_row.modification_type, (target_row.modification_type.value, "white"))

    console.print(f"\n[bold]样本详情: {sample_id}[/bold]")
    console.print("=" * 60)

    table = Table(box=box.SIMPLE, show_header=False)
    table.add_column("字段", style="cyan")
    table.add_column("值")

    table.add_row("状态", f"[{status_color}]{status_text}[/{status_color}]")
    table.add_row("灰度标记", f"[{gray_color}]{gray_text}[/{gray_color}]")
    table.add_row("灰度比例", f"{target_row.gray_ratio:.2%}" if target_row.gray_ratio is not None else "N/A")
    table.add_row("修改类型", f"[{mod_color}]{mod_text}[/{mod_color}]")
    table.add_row("修改说明", target_row.modification_note or "-")
    table.add_row("边界样本", "是" if target_row.is_boundary else "否")
    table.add_row("错误信息", target_row.error_message or "-")
    table.add_row("来源版本", target_row.source_version or "-")
    table.add_row("标签", str(target_row.label) if target_row.label is not None else "-")
    table.add_row("时间戳", target_row.timestamp.isoformat())

    console.print(table)

    console.print(f"\n[cyan]特征值 ({len(target_row.features)} 个):[/cyan]")
    feature_table = Table(box=box.SIMPLE)
    feature_table.add_column("特征名", style="cyan")
    feature_table.add_column("值", justify="right")

    for feature, value in sorted(target_row.features.items()):
        feature_table.add_row(feature, f"{value:.6f}")

    console.print(feature_table)


if __name__ == "__main__":
    main()
