import os
import sys
import json

import click

from .processor import process_csv
from .storage import (
    save_processing_record, load_processing_record, list_batches,
    update_review, trace_record,
)
from .report import export_result_csv, export_html_report, generate_abnormal_screenshots, generate_triangle_plot
from .judgement import DEFAULT_TOLERANCE, DEFAULT_ANGLE_TOLERANCE


def _print_summary(summary: dict):
    click.echo("=" * 60)
    click.echo(f"批次号: {summary['batch_id']}")
    click.echo(f"状态:   {summary['status']}")
    click.echo(f"总计:   {summary['total']} 条")
    click.echo(f"  相似:   {summary['similar']}")
    click.echo(f"  不相似: {summary['different']}")
    click.echo(f"  失败:   {summary['failed']}")
    click.echo(f"  警告:   {summary['warnings']}")
    click.echo(f"  已复核: {summary['reviewed']}")
    click.echo("=" * 60)


@click.group(help="几何相似判定工具 — 三角形 SSS/SAS/AA 判定、批量复核、反查追踪")
def cli():
    pass


@cli.command("run", help="导入 CSV 并执行批量判定")
@click.option("--input", "-i", "input_csv", required=True, type=click.Path(exists=True), help="输入 CSV 文件路径")
@click.option("--tolerance", "-t", type=float, default=DEFAULT_TOLERANCE, show_default=True, help="比例容差 (相对偏差)")
@click.option("--angle-tolerance", "-a", type=float, default=DEFAULT_ANGLE_TOLERANCE, show_default=True, help="角度容差 (度)")
@click.option("--method", "-m", type=click.Choice(["AUTO", "SSS", "SAS", "AA"]), default="AUTO", show_default=True, help="强制使用的判定方法")
@click.option("--no-export", is_flag=True, help="处理后不自动导出结果")
def cmd_run(input_csv, tolerance, angle_tolerance, method, no_export):
    click.echo(f"▶ 正在处理: {input_csv}")
    click.echo(f"  比例容差: {tolerance:.2e}, 角度容差: {angle_tolerance:.4f}°, 判定方法: {method}")
    pr = process_csv(input_csv, tolerance, angle_tolerance, force_method=method if method != "AUTO" else None)
    path = save_processing_record(pr)
    click.echo(f"✓ 批次 {pr.batch_id} 已保存至 {path}")
    _print_summary(pr.summary())
    abnormal = pr.abnormal_records()
    if abnormal:
        click.echo(f"\n⚠ 检测到 {len(abnormal)} 条异常/需复核记录，已自动生成对比截图...")
        count = generate_abnormal_screenshots(pr)
        save_processing_record(pr)
        click.echo(f"  已生成 {count} 张异常记录截图")
    if not no_export:
        csv_path = export_result_csv(pr)
        html_path = export_html_report(pr)
        click.echo(f"\n📄 CSV 结果: {csv_path}")
        click.echo(f"🌐 HTML 报告: {html_path}")
    click.echo(f"\n🔍 复核异常: python -m geo_similarity.cli abnormal --batch {pr.batch_id}")
    click.echo(f"📋 复核单条: python -m geo_similarity.cli review --batch {pr.batch_id} --record <记录ID> --note \"意见\"")


@cli.command("list", help="列出所有处理批次")
def cmd_list():
    batches = list_batches()
    if not batches:
        click.echo("暂无处理批次，使用 'run' 命令导入 CSV 开始处理。")
        return
    click.echo(f"共 {len(batches)} 个处理批次：\n")
    for b in batches:
        flag = "⚠ " if b["failed"] or b["warnings"] else "  "
        click.echo(
            f"{flag}[{b['batch_id']}] 状态={b['status']:<8} "
            f"总数={b['total']:<4} 相似={b['similar']:<4} 不相似={b['different']:<4} "
            f"失败={b['failed']:<3} 警告={b['warnings']:<3} 已复核={b['reviewed']}"
        )


@cli.command("abnormal", help="查看指定批次的异常/需复核记录")
@click.option("--batch", "-b", "batch_id", required=True, help="批次号")
def cmd_abnormal(batch_id):
    pr = load_processing_record(batch_id)
    if pr is None:
        click.echo(f"✗ 批次 {batch_id} 不存在")
        sys.exit(1)
    abnormal = pr.abnormal_records()
    click.echo(f"批次 {batch_id} 异常/需复核记录 ({len(abnormal)} 条)：\n")
    if not abnormal:
        click.echo("✅ 本批次无异常记录。")
        return
    for idx, rec in enumerate(abnormal, 1):
        r = rec.result
        click.echo("-" * 60)
        click.echo(f"[{idx}] 记录ID: {rec.record_id}")
        click.echo(f"    来源:   {rec.source_file} 第 {rec.source_row} 行")
        if r:
            sim = "相似" if r.is_similar is True else ("不相似" if r.is_similar is False else "判定失败")
            click.echo(f"    判定:   {r.method} -> {sim}")
            click.echo(f"    误差:   {r.error_magnitude:.6e}")
            if r.error_reason:
                click.echo(f"    原因:   {r.error_reason}")
            if r.warning:
                click.echo(f"    警告:   {r.warning}")
        if rec.reviewed:
            click.echo(f"    复核:   ✓ 已复核 — {rec.review_note}")
        else:
            click.echo(f"    复核:   ✗ 未复核")
        if rec.screenshot_path:
            click.echo(f"    截图:   {rec.screenshot_path}")
    click.echo("-" * 60)
    click.echo(f"\n📋 复核命令: python -m geo_similarity.cli review --batch {batch_id} --record <记录ID> --note \"意见\" [--override yes|no]")
    click.echo(f"🔍 反查命令: python -m geo_similarity.cli trace --batch {batch_id} --record <记录ID>")


@cli.command("review", help="复核单条记录（写入处理意见，可人工修正判定结果）")
@click.option("--batch", "-b", "batch_id", required=True, help="批次号")
@click.option("--record", "-r", "record_id", required=True, help="记录ID")
@click.option("--note", "-n", required=True, help="复核处理意见")
@click.option("--override", type=click.Choice(["yes", "no"]), default=None, help="人工修正判定结论: yes=相似, no=不相似")
def cmd_review(batch_id, record_id, note, override):
    override_bool = None
    if override == "yes":
        override_bool = True
    elif override == "no":
        override_bool = False
    rec = update_review(batch_id, record_id, note, reviewed=True, override_result=override_bool)
    if rec is None:
        click.echo(f"✗ 未找到批次 {batch_id} 或记录 {record_id}")
        sys.exit(1)
    click.echo(f"✓ 记录 {record_id} 复核已写入")
    click.echo(f"  复核意见: {note}")
    if override is not None:
        click.echo(f"  判定修正为: {'相似' if override_bool else '不相似'}")
    if rec.screenshot_path:
        click.echo(f"  关联截图: {rec.screenshot_path}")
    pr = load_processing_record(batch_id)
    if pr:
        csv_path = export_result_csv(pr)
        html_path = export_html_report(pr)
        click.echo(f"\n📄 结果已重新导出: {csv_path}")
        click.echo(f"🌐 报告已重新导出: {html_path}")


@cli.command("trace", help="反查单条记录的完整链路（从结果追溯来源与处理记录）")
@click.option("--batch", "-b", "batch_id", required=True, help="批次号")
@click.option("--record", "-r", "record_id", required=True, help="记录ID")
@click.option("--json", "as_json", is_flag=True, help="以 JSON 格式输出")
def cmd_trace(batch_id, record_id, as_json):
    info = trace_record(batch_id, record_id)
    if info is None:
        click.echo(f"✗ 未找到批次 {batch_id} 或记录 {record_id}")
        sys.exit(1)
    if as_json:
        click.echo(json.dumps(info, ensure_ascii=False, indent=2))
        return
    click.echo("=" * 60)
    click.echo("🔍 反查链路")
    click.echo("=" * 60)
    t = info["trace"]
    click.echo(f"批次号:       {info['batch']['batch_id']}")
    click.echo(f"记录ID:       {t['record_id']}")
    click.echo(f"处理时间:     {t['timestamp']}")
    click.echo(f"来源文件:     {t['source_file']}")
    click.echo(f"来源CSV行号:  第 {t['source_row']} 行")
    click.echo(f"复核状态:     {'已复核' if t['reviewed'] else '未复核'}")
    if t["review_note"]:
        click.echo(f"复核意见:     {t['review_note']}")
    if t["screenshot_path"]:
        click.echo(f"图表截图:     {t['screenshot_path']}")
    rec = info["record"]
    r = rec.get("result")
    if r:
        click.echo("\n--- 判定详情 ---")
        click.echo(f"判定方法:     {r.get('method')}")
        sim = r.get("is_similar")
        click.echo(f"判定结果:     {'相似' if sim is True else ('不相似' if sim is False else '判定失败')}")
        click.echo(f"误差幅度:     {r.get('error_magnitude', 0):.6e}")
        if r.get("error_reason"):
            click.echo(f"失败原因:     {r['error_reason']}")
        if r.get("warning"):
            click.echo(f"警告:         {r['warning']}")
        click.echo(f"\n公式说明:\n{r.get('formula', '')}")
        click.echo(f"\n适用范围:\n{r.get('scope', '')}")
        if r.get("details"):
            click.echo(f"\n计算详情:")
            click.echo(json.dumps(r["details"], ensure_ascii=False, indent=2))
    click.echo("\n--- 原始三角形参数 ---")
    t1 = rec["triangle_1"]
    t2 = rec["triangle_2"]
    click.echo(f"△1: a={t1['a']}, b={t1['b']}, c={t1['c']}, 角A={t1.get('angle_A')}, 角B={t1.get('angle_B')}, 角C={t1.get('angle_C')}")
    click.echo(f"△2: a={t2['a']}, b={t2['b']}, c={t2['c']}, 角A={t2.get('angle_A')}, 角B={t2.get('angle_B')}, 角C={t2.get('angle_C')}")
    click.echo("=" * 60)


@cli.command("export", help="重新导出指定批次的 CSV 结果与 HTML 报告")
@click.option("--batch", "-b", "batch_id", required=True, help="批次号")
@click.option("--with-screenshots", is_flag=True, help="同时为所有异常记录重新生成截图")
def cmd_export(batch_id, with_screenshots):
    pr = load_processing_record(batch_id)
    if pr is None:
        click.echo(f"✗ 批次 {batch_id} 不存在")
        sys.exit(1)
    if with_screenshots:
        count = 0
        for rec in pr.judgement_records:
            if generate_triangle_plot(rec, pr.batch_id):
                count += 1
        save_processing_record(pr)
        click.echo(f"✓ 已生成 {count} 张截图")
    csv_path = export_result_csv(pr)
    html_path = export_html_report(pr)
    click.echo(f"📄 CSV 结果: {csv_path}")
    click.echo(f"🌐 HTML 报告: {html_path}")


@cli.command("demo", help="生成示例 CSV 输入数据到 data/demo_input.csv")
def cmd_demo():
    from . import demo
    path = demo.generate_demo_csv()
    click.echo(f"✓ 示例数据已生成: {path}")
    click.echo(f"\n运行示例: python -m geo_similarity.cli run -i {path}")


if __name__ == "__main__":
    cli()
