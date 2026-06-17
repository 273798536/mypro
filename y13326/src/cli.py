import click
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.parser import parse_file
from src.comparator import compare_versions
from src.exporter import export_result
from src.corrections import (
    load_manual_corrections,
    add_manual_correction,
    get_corrections_by_cluster,
    get_corrections_by_version,
    load_history,
    add_history_record,
)


@click.group()
def cli():
    """舆情聚类灰度对比工具"""
    pass


@cli.command()
@click.option("--old", "old_file", required=True, help="旧版数据文件路径")
@click.option("--new", "new_file", required=True, help="新版数据文件路径")
@click.option("--old-version", default="v1", help="旧版本号")
@click.option("--new-version", default="v2", help="新版本号")
@click.option("--threshold", default=0.5, type=float, help="置信度阈值")
@click.option("--export", "export_format", type=click.Choice(["json", "csv", "both"]), help="导出格式")
@click.option("--output-dir", default="output", help="输出目录")
@click.option("--operator", default="", help="操作人")
@click.option("--save-history/--no-save-history", default=True, help="是否保存历史记录")
@click.option("--detail/--no-detail", default=False, help="是否显示详细变更")
def compare(old_file, new_file, old_version, new_version, threshold, export_format, output_dir, operator, save_history, detail):
    """对比两个版本的舆情聚类结果"""

    click.echo("=" * 60)
    click.echo(f"舆情聚类灰度对比: {old_version} -> {new_version}")
    click.echo("=" * 60)

    try:
        records_old, stats_old = parse_file(old_file)
        records_new, stats_new = parse_file(new_file)
    except Exception as e:
        click.echo(click.style(f"错误: {str(e)}", fg="red"), err=True)
        sys.exit(1)

    _print_parse_stats("旧版", stats_old, old_version)
    _print_parse_stats("新版", stats_new, new_version)

    corrections = load_manual_corrections()

    result = compare_versions(
        records_old,
        records_new,
        stats_old,
        stats_new,
        version_old=old_version,
        version_new=new_version,
        threshold=threshold,
        manual_corrections=corrections,
    )

    click.echo("")
    click.echo("-" * 60)
    click.echo("【聚类变化】")
    click.echo("-" * 60)
    click.echo(f"  旧版聚类总数: {result.total_clusters_old}")
    click.echo(f"  新版聚类总数: {result.total_clusters_new}")
    click.echo(f"  新增聚类: {len(result.new_clusters)} 个")
    click.echo(f"  删除聚类: {len(result.removed_clusters)} 个")
    click.echo(f"  变化聚类: {len(result.changed_clusters)} 个")

    if detail and result.new_clusters:
        click.echo("")
        click.echo("  新增聚类列表:")
        for cid in result.new_clusters:
            click.echo(f"    - {cid}")

    if detail and result.removed_clusters:
        click.echo("")
        click.echo("  删除聚类列表:")
        for cid in result.removed_clusters:
            click.echo(f"    - {cid}")

    if detail and result.changed_clusters:
        click.echo("")
        click.echo("  变化聚类详情:")
        for item in result.changed_clusters:
            click.echo(f"    - {item['cluster_id']} ({item['title']}):")
            for change in item["changes"]:
                click.echo(f"      {change['field']}: {change['old']} -> {change['new']}")

    click.echo("")
    click.echo("-" * 60)
    click.echo("【样本指标】")
    click.echo("-" * 60)
    cs = result.confidence_stats
    click.echo(f"  置信度均值: {cs['old_avg']:.4f} -> {cs['new_avg']:.4f} (变化: {cs['diff_avg']:+.4f})")
    click.echo(f"  置信度中位数: {cs['old_median']:.4f} -> {cs['new_median']:.4f}")
    click.echo(f"  置信度范围: [{cs['old_min']:.4f}, {cs['old_max']:.4f}] -> [{cs['new_min']:.4f}, {cs['new_max']:.4f}]")

    click.echo("")
    click.echo("-" * 60)
    click.echo(f"【阈值指标 (阈值={threshold})】")
    click.echo("-" * 60)
    tm = result.threshold_metrics
    click.echo(f"  高于阈值: {tm['old_above_threshold']} -> {tm['new_above_threshold']} (变化: {tm['diff_above_threshold']:+d})")
    click.echo(f"  低于阈值: {tm['old_below_threshold']} -> {tm['new_below_threshold']}")

    click.echo("")
    click.echo("-" * 60)
    click.echo("【情感变化】")
    click.echo("-" * 60)
    sc = result.sentiment_changes
    click.echo(f"  正面变化: {sc.get('positive', 0)}")
    click.echo(f"  负面变化: {sc.get('negative', 0)}")
    click.echo(f"  中性变化: {sc.get('neutral', 0)}")
    click.echo(f"  总计: {sc.get('total', 0)}")

    click.echo("")
    click.echo("-" * 60)
    click.echo("【人工修正影响】")
    click.echo("-" * 60)
    if result.manual_correction_impact:
        click.echo(f"  共 {len(result.manual_correction_impact)} 条修正影响新版结果")
        if detail:
            for item in result.manual_correction_impact:
                click.echo(f"    - [{item['correction_id']}] {item['cluster_id']} {item['cluster_title']}")
                click.echo(f"      {item['field']}: {item['old_value']} -> {item['new_value']}")
                click.echo(f"      操作人: {item['operator']} | 备注: {item['remark']}")
    else:
        click.echo("  无人工修正记录")

    click.echo("")
    click.echo("-" * 60)
    click.echo(f"【引用缺失告警】")
    click.echo("-" * 60)
    if result.citation_issues:
        click.echo(click.style(f"  发现 {len(result.citation_issues)} 条引用缺失但高置信度的记录！", fg="yellow"))
        for issue in result.citation_issues:
            click.echo(click.style(f"  - {issue}", fg="yellow"))
    else:
        click.echo("  无引用缺失问题")

    if export_format:
        export_path = export_result(result, output_dir, export_format)
        click.echo("")
        click.echo("-" * 60)
        click.echo("【导出结果】")
        click.echo("-" * 60)
        click.echo(f"  导出路径: {export_path}")
        click.echo(f"  导出格式: {export_format}")

        if save_history:
            summary = (f"新增{len(result.new_clusters)} 删除{len(result.removed_clusters)} "
                       f"变化{len(result.changed_clusters)} 告警{len(result.citation_issues)}")
            history_rec = add_history_record(old_version, new_version, summary, export_path, operator)
            click.echo(f"  历史记录ID: {history_rec.run_id}")

    click.echo("")
    click.echo("=" * 60)
    click.echo("对比完成")
    click.echo("=" * 60)


def _print_parse_stats(label: str, stats, version: str):
    click.echo("")
    click.echo(f"【{label}解析统计 ({version})】")
    click.echo(f"  总行数: {stats.total}")
    click.echo(f"  已处理行: {stats.processed}")
    if stats.bad_lines > 0:
        click.echo(click.style(f"  坏行: {stats.bad_lines}", fg="red"))
    else:
        click.echo(f"  坏行: {stats.bad_lines}")
    if stats.skipped_lines > 0:
        click.echo(click.style(f"  跳过行: {stats.skipped_lines}", fg="yellow"))
    else:
        click.echo(f"  跳过行: {stats.skipped_lines}")

    if stats.bad_details:
        click.echo(click.style("  坏行详情:", fg="red"))
        for detail in stats.bad_details[:5]:
            click.echo(click.style(f"    - {detail}", fg="red"))
        if len(stats.bad_details) > 5:
            click.echo(click.style(f"    ... 还有 {len(stats.bad_details) - 5} 条", fg="red"))

    if stats.skipped_details:
        click.echo(click.style("  跳过行详情:", fg="yellow"))
        for detail in stats.skipped_details[:3]:
            click.echo(click.style(f"    - {detail}", fg="yellow"))
        if len(stats.skipped_details) > 3:
            click.echo(click.style(f"    ... 还有 {len(stats.skipped_details) - 3} 条", fg="yellow"))


@cli.group()
def correction():
    """人工修正管理"""
    pass


@correction.command("add")
@click.option("--cluster-id", required=True, help="聚类ID")
@click.option("--field", required=True, help="修正字段")
@click.option("--old-value", required=True, help="旧值")
@click.option("--new-value", required=True, help="新值")
@click.option("--operator", required=True, help="操作人")
@click.option("--remark", required=True, help="修正备注")
@click.option("--version", default="", help="所属版本")
def add_correction(cluster_id, field, old_value, new_value, operator, remark, version):
    """添加一条人工修正记录"""
    rec = add_manual_correction(cluster_id, field, old_value, new_value, operator, remark, version)
    click.echo(f"已添加人工修正: {rec.correction_id}")
    click.echo(f"  聚类: {rec.cluster_id}")
    click.echo(f"  字段: {rec.field_name}")
    click.echo(f"  变更: {rec.old_value} -> {rec.new_value}")
    click.echo(f"  操作人: {rec.operator}")
    click.echo(f"  备注: {rec.remark}")
    if rec.version:
        click.echo(f"  版本: {rec.version}")


@correction.command("list")
@click.option("--cluster-id", help="按聚类ID筛选")
@click.option("--version", help="按版本筛选")
def list_corrections(cluster_id, version):
    """列出人工修正记录"""
    if cluster_id:
        corrections = get_corrections_by_cluster(cluster_id)
    elif version:
        corrections = get_corrections_by_version(version)
    else:
        corrections = load_manual_corrections()

    if not corrections:
        click.echo("无人工修正记录")
        return

    click.echo(f"共 {len(corrections)} 条人工修正记录:")
    click.echo("")
    for rec in corrections:
        click.echo(f"[{rec.correction_id}] {rec.cluster_id} - {rec.field_name}")
        click.echo(f"  {rec.old_value} -> {rec.new_value}")
        click.echo(f"  操作人: {rec.operator} | 备注: {rec.remark}")
        if rec.version:
            click.echo(f"  版本: {rec.version}")
        click.echo(f"  时间: {rec.created_at}")
        click.echo("")


@cli.command()
@click.option("--limit", default=10, help="显示最近N条")
def history(limit):
    """查看对比历史记录"""
    records = load_history()
    if not records:
        click.echo("无历史记录")
        return

    records = sorted(records, key=lambda r: r.run_time, reverse=True)[:limit]

    click.echo(f"最近 {len(records)} 条对比历史:")
    click.echo("")
    for rec in records:
        click.echo(f"[{rec.run_id}] {rec.version_old} -> {rec.version_new}")
        click.echo(f"  时间: {rec.run_time}")
        if rec.operator:
            click.echo(f"  操作人: {rec.operator}")
        click.echo(f"  摘要: {rec.summary}")
        click.echo(f"  结果文件: {rec.result_file}")
        click.echo("")


@cli.command()
def guide():
    """快速上手指南 (接班必看)"""
    click.echo("=" * 50)
    click.echo("舆情聚类灰度对比 · 快速上手")
    click.echo("=" * 50)
    click.echo("")
    click.echo("样例在哪")
    click.echo("  数据: data/samples/v1.json, v2.json")
    click.echo("  命令: python -m src.cli compare --old data/samples/v1.json --new data/samples/v2.json --detail")
    click.echo("")
    click.echo("异常在哪看")
    click.echo("  坏行(红)/跳过行(黄): 解析统计区块")
    click.echo("  引用缺失告警: 黄色「引用缺失告警」区块")
    click.echo("  历史记录: python -m src.cli history")
    click.echo("")
    click.echo("结果怎么导出")
    click.echo("  加参数: --export json|csv|both")
    click.echo("  指定目录: --output-dir output/")
    click.echo("")
    click.echo("常用速查")
    click.echo("  对比+导出: python -m src.cli compare --old v1.json --new v2.json --detail --export both")
    click.echo("  加修正: python -m src.cli correction add --cluster-id C001 --field sentiment --old-value neutral --new-value negative --operator 老唐 --remark 备注 --version v2")
    click.echo("  看修正: python -m src.cli correction list")
    click.echo("  看历史: python -m src.cli history")
    click.echo("")


if __name__ == "__main__":
    cli()
