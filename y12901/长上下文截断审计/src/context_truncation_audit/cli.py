import click
import pandas as pd
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from context_truncation_audit.core import TruncationAuditor
from context_truncation_audit.versioning import VersionTracker
from context_truncation_audit.exporters import ExcelExporter, HtmlExporter


@click.group()
@click.version_option(version="1.0.0", prog_name="长上下文截断审计工具")
def cli():
    """长上下文截断审计工具
    
    用于审计和分析长文本截断情况，支持多种数据源导入、人工修正追踪、
    Excel和HTML格式导出，生成的报告即使不懂代码也能看懂。
    """
    pass


@cli.command()
@click.option(
    "--input", "-i",
    type=click.Path(exists=True, dir_okay=False),
    required=True,
    help="输入数据文件路径，支持CSV和Excel格式。必须包含'原始内容'列",
)
@click.option(
    "--output", "-o",
    type=click.Path(dir_okay=False),
    default="audit_result.xlsx",
    show_default=True,
    help="输出报告文件路径，根据扩展名自动判断格式（.xlsx或.html）",
)
@click.option(
    "--max-tokens",
    type=int,
    default=4096,
    show_default=True,
    help="Token数量限制，超过这个值视为截断",
)
@click.option(
    "--context-window",
    type=int,
    default=8192,
    show_default=True,
    help="模型上下文窗口大小，接近这个值会发出警告",
)
@click.option(
    "--source-name",
    type=str,
    default="",
    help="给这批数据标记一个来源名称，方便区分不同批次",
)
@click.option(
    "--with-explanation/--no-explanation",
    default=True,
    show_default=True,
    help="是否在Excel报告里包含名词说明sheet（给非技术人员看）",
)
def audit(input, output, max_tokens, context_window, source_name, with_explanation):
    """执行截断审计
    
    从输入文件读取数据，分析每一条记录是否被截断，生成审计报告。
    
    示例:
      长上下文截断审计 audit -i data.csv -o result.xlsx
      长上下文截断审计 audit -i old_records.csv --max-tokens 2048 --source-name 旧表
    """
    click.echo(f"📂 正在读取输入文件: {input}")
    
    df = _read_input_file(input)
    click.echo(f"✅ 读取成功，共 {len(df)} 条记录")
    
    auditor = TruncationAuditor(
        max_tokens=max_tokens,
        context_window=context_window,
    )
    
    records = []
    for _, row in df.iterrows():
        record = {
            "id": str(row.get("记录编号", row.get("id", ""))),
            "original_text": str(row.get("原始内容", row.get("original_text", ""))),
            "truncated_text": str(row.get("截断内容", row.get("truncated_text", ""))) if pd.notna(row.get("截断内容", row.get("truncated_text"))) else None,
            "source": source_name or str(row.get("来源", row.get("source", ""))),
            "manual_note": str(row.get("人工备注", row.get("manual_note", ""))) if pd.notna(row.get("人工备注", row.get("manual_note"))) else "",
            "metadata": {},
        }
        records.append(record)
    
    click.echo("🔍 正在分析截断情况...")
    results = auditor.audit_batch(records)
    
    truncated_count = sum(1 for r in results if r.is_truncated)
    click.echo(f"📊 分析完成：截断 {truncated_count} 条 / 共 {len(results)} 条")
    
    stats = auditor.get_statistics(results)
    click.echo(f"   截断率: {stats['截断率']}")
    click.echo(f"   平均Token数: {stats['平均Token数']}")
    
    _export_results(results, output, stats, with_explanation)
    click.echo(f"🎉 报告已生成: {output}")


@cli.command()
@click.option(
    "--old-data",
    type=click.Path(exists=True, dir_okay=False),
    required=True,
    help="旧数据文件路径（旧表数据）",
)
@click.option(
    "--new-data",
    type=click.Path(exists=True, dir_okay=False),
    required=True,
    help="新数据文件路径（人工反馈/补录数据）",
)
@click.option(
    "--output", "-o",
    type=click.Path(dir_okay=False),
    default="merge_result.xlsx",
    show_default=True,
    help="合并后的输出文件路径",
)
@click.option(
    "--id-column",
    type=str,
    default="记录编号",
    show_default=True,
    help="用于匹配两条数据的编号列名",
)
def merge(old_data, new_data, output, id_column):
    """合并多份数据并追踪版本变化
    
    把旧表数据和人工反馈合并，相同记录编号的会保留版本历史，
    人工修正过的判断能在报告里看到前后差别。
    
    示例:
      长上下文截断审计 merge --old-data old.csv --new-data feedback.csv -o merged.xlsx
    """
    click.echo(f"📂 读取旧数据: {old_data}")
    df_old = _read_input_file(old_data)
    click.echo(f"   旧数据共 {len(df_old)} 条")
    
    click.echo(f"📂 读取新数据: {new_data}")
    df_new = _read_input_file(new_data)
    click.echo(f"   新数据共 {len(df_new)} 条")
    
    auditor = TruncationAuditor()
    tracker = VersionTracker()
    
    all_ids = set()
    all_records = {}
    
    for _, row in df_old.iterrows():
        rid = str(row.get(id_column, ""))
        if rid:
            all_ids.add(rid)
            all_records[rid] = {"old": row}
    
    for _, row in df_new.iterrows():
        rid = str(row.get(id_column, ""))
        if rid:
            all_ids.add(rid)
            if rid in all_records:
                all_records[rid]["new"] = row
            else:
                all_records[rid] = {"new": row}
    
    click.echo(f"🔄 共涉及 {len(all_ids)} 条记录")
    
    results = []
    for rid in sorted(all_ids):
        data = all_records[rid]
        
        if "old" in data:
            old_row = data["old"]
            old_result = auditor.audit_record(
                record_id=rid,
                original_text=str(old_row.get("原始内容", "")),
                source=str(old_row.get("来源", "旧表")),
                manual_note=str(old_row.get("人工备注", "")) if pd.notna(old_row.get("人工备注")) else "",
            )
            tracker.add_version(
                record_id=rid,
                is_truncated=old_result.is_truncated,
                reason=old_result.reason.value,
                reason_detail=old_result.reason_detail,
                severity=old_result.severity,
                manual_note=old_result.manual_note,
                auditor="system",
                change_summary="初始版本（旧表数据）",
                data={"original_preview": old_result.to_dict()["原始内容预览"]},
            )
        
        if "new" in data:
            new_row = data["new"]
            new_result = auditor.audit_record(
                record_id=rid,
                original_text=str(new_row.get("原始内容", "")),
                source=str(new_row.get("来源", "人工反馈")),
                manual_note=str(new_row.get("人工备注", "")) if pd.notna(new_row.get("人工备注")) else "",
            )
            
            manual_judgment = new_row.get("修正判断", new_row.get("状态", ""))
            if manual_judgment and manual_judgment != "":
                is_manual_truncated = "截断" in str(manual_judgment) or "不完整" in str(manual_judgment)
                if "不截断" in str(manual_judgment):
                    is_manual_truncated = False
                
                tracker.add_version(
                    record_id=rid,
                    is_truncated=is_manual_truncated,
                    reason=str(manual_judgment),
                    reason_detail=f"人工判断：{manual_judgment}",
                    severity=new_result.severity,
                    manual_note=str(new_row.get("人工备注", "")) if pd.notna(new_row.get("人工备注")) else "",
                    auditor="人工复核",
                    change_summary=f"人工修正判断：{manual_judgment}",
                    data={"original_preview": new_result.to_dict()["原始内容预览"]},
                )
            
            results.append(new_result)
    
    changed = tracker.get_changed_records()
    click.echo(f"📝 人工修正改变判断的有 {len(changed)} 条")
    
    latest_records = tracker.get_all_records_latest()
    results_dicts = [r.to_dict() for r in results]
    
    excel_exporter = ExcelExporter()
    excel_exporter.export_version_comparison(tracker, output)
    click.echo(f"🎉 版本对比报告已生成: {output}")
    
    html_output = os.path.splitext(output)[0] + "_detail.html"
    html_exporter = HtmlExporter()
    html_exporter.export_audit_results(results, html_output, tracker=tracker)
    click.echo(f"📄 详细HTML报告已生成: {html_output}")


@cli.command("demo")
def run_demo():
    """运行样例演示
    
    直接用 samples 目录里的样例数据跑一遍，看看效果，不用自己准备数据。
    """
    sample_dir = Path(__file__).resolve().parents[2] / "samples"
    old_file = sample_dir / "old_records.csv"
    new_file = sample_dir / "manual_feedback.csv"
    
    if not old_file.exists():
        click.echo(f"❌ 找不到样例文件: {old_file}")
        return
    
    output_dir = Path.cwd() / "demo_output"
    output_dir.mkdir(exist_ok=True)
    
    click.echo("🚀 运行样例演示...")
    click.echo(f"   旧表数据: {old_file}")
    click.echo(f"   人工反馈: {new_file}")
    click.echo("")
    
    from context_truncation_audit.core import TruncationAuditor
    from context_truncation_audit.versioning import VersionTracker
    from context_truncation_audit.exporters import ExcelExporter, HtmlExporter
    
    df_old = pd.read_csv(old_file)
    df_new = pd.read_csv(new_file)
    
    auditor = TruncationAuditor(max_tokens=200, context_window=500)
    tracker = VersionTracker()
    
    all_ids = list(df_old["记录编号"].astype(str)) + list(df_new["记录编号"].astype(str))
    all_ids = sorted(set(all_ids))
    
    results = []
    
    for rid in all_ids:
        old_row = df_old[df_old["记录编号"].astype(str) == rid]
        new_row = df_new[df_new["记录编号"].astype(str) == rid]
        
        if len(old_row) > 0:
            row = old_row.iloc[0]
            result = auditor.audit_record(
                record_id=rid,
                original_text=str(row.get("原始内容", "")),
                source=str(row.get("来源", "旧表")),
                manual_note=str(row.get("人工备注", "")) if pd.notna(row.get("人工备注")) else "",
            )
            tracker.add_version(
                record_id=rid,
                is_truncated=result.is_truncated,
                reason=result.reason.value,
                reason_detail=result.reason_detail,
                severity=result.severity,
                manual_note=result.manual_note,
                auditor="system",
                change_summary="初始版本（旧表自动审计）",
                data={"original_preview": result.to_dict()["原始内容预览"]},
            )
        
        if len(new_row) > 0:
            row = new_row.iloc[0]
            result = auditor.audit_record(
                record_id=rid,
                original_text=str(row.get("原始内容", "")),
                source=str(row.get("来源", "人工反馈")),
                manual_note=str(row.get("人工备注", "")) if pd.notna(row.get("人工备注")) else "",
            )
            
            manual_judgment = str(row.get("修正判断", ""))
            if manual_judgment and manual_judgment != "nan":
                is_manual_truncated = "截断" in manual_judgment or "不完整" in manual_judgment
                if "不截断" in manual_judgment:
                    is_manual_truncated = False
                
                tracker.add_version(
                    record_id=rid,
                    is_truncated=is_manual_truncated,
                    reason=manual_judgment,
                    reason_detail=f"人工复核判断：{manual_judgment}",
                    severity=result.severity,
                    manual_note=str(row.get("人工备注", "")) if pd.notna(row.get("人工备注")) else "",
                    auditor="人工复核",
                    change_summary=f"人工修正：{manual_judgment}",
                    data={"original_preview": result.to_dict()["原始内容预览"]},
                )
            
            results.append(result)
    
    stats = auditor.get_statistics(results)
    
    excel_output = output_dir / "审计报告.xlsx"
    excel_exporter = ExcelExporter()
    
    wb_results = []
    for r in results:
        latest = tracker.get_latest(r.record_id)
        if latest:
            r.is_truncated = latest.is_truncated
            r.reason_detail = latest.reason_detail
            r.manual_note = latest.manual_note
        wb_results.append(r)
    
    excel_exporter.export_audit_results(wb_results, str(excel_output), stats)
    
    version_output = output_dir / "版本对比.xlsx"
    excel_exporter.export_version_comparison(tracker, str(version_output))
    
    html_output = output_dir / "审计报告.html"
    html_exporter = HtmlExporter()
    html_exporter.export_audit_results(wb_results, str(html_output), stats, tracker)
    
    click.echo("")
    click.echo("✅ 演示完成！")
    click.echo(f"📊 总记录数: {len(results)}")
    click.echo(f"⚠️  截断记录: {sum(1 for r in results if r.is_truncated)} 条")
    click.echo(f"📝 人工修正: {len(tracker.get_changed_records())} 条")
    click.echo("")
    click.echo("📁 生成的文件在 demo_output 目录里：")
    click.echo(f"   - 审计报告.xlsx （Excel格式，给非技术人员看）")
    click.echo(f"   - 版本对比.xlsx （人工修正前后对比）")
    click.echo(f"   - 审计报告.html （网页版报告）")
    click.echo("")
    click.echo("💡 打开 Excel 文件可以看到：")
    click.echo("   - 审计总览：统计数据和原因分布")
    click.echo("   - 详细记录：每条数据的审计结果，可筛选排序")
    click.echo("   - 名词说明：给不懂技术的人看的解释")


def _read_input_file(filepath):
    ext = Path(filepath).suffix.lower()
    if ext == ".csv":
        return pd.read_csv(filepath)
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(filepath)
    else:
        raise click.BadParameter(f"不支持的文件格式: {ext}，请使用CSV或Excel文件")


def _export_results(results, output_path, stats, with_explanation):
    exporter = ExcelExporter()
    ext = Path(output_path).suffix.lower()
    
    if ext == ".html":
        html_exporter = HtmlExporter()
        html_exporter.export_audit_results(results, output_path, stats)
    else:
        exporter.export_audit_results(results, output_path, stats, include_details=with_explanation)


if __name__ == "__main__":
    cli()
