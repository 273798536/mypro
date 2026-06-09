import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from typing import Optional

from .database import SessionLocal, engine, Base
from . import crud, schemas, reporting, demo_data

Base.metadata.create_all(bind=engine)

console = Console()


def _get_db():
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


@click.group()
def cli():
    """导数符号变化表投研工具 - 命令行入口"""
    pass


@cli.command()
@click.option("--source", required=True, help="来源文件名")
@click.option("--operator", default="system", help="导入人")
@click.option("--remark", default=None, help="备注")
def create_batch(source, operator, remark):
    """创建一个新的导入批次"""
    db = _get_db()
    try:
        batch = crud.create_batch(db, schemas.BatchCreate(
            source_file=source, imported_by=operator, remark=remark
        ))
        console.print(Panel.fit(
            f"批次创建成功！\n批次号: [bold green]{batch.batch_no}[/bold green]\n"
            f"批次ID: [bold]{batch.id}[/bold]\n来源文件: {source}",
            title="✅ 新建批次", border_style="green"
        ))
    finally:
        db.close()


@cli.command("list-batches")
def list_batches_cmd():
    """查看所有批次列表"""
    db = _get_db()
    try:
        batches = crud.list_batches(db)
        if not batches:
            rprint("[yellow]暂无批次数据，请先导入或运行 demo-seed[/yellow]")
            return

        table = Table(title="批次列表", show_lines=True)
        table.add_column("ID", justify="right", style="cyan", no_wrap=True)
        table.add_column("批次号", style="green")
        table.add_column("来源文件")
        table.add_column("导入时间")
        table.add_column("状态", style="bold")
        table.add_column("记录数", justify="right")
        table.add_column("异常数", justify="right", style="red")

        status_style = {
            "imported": "white",
            "reviewing": "yellow",
            "reviewed": "green",
            "reported": "blue",
            "archived": "dim"
        }
        for b in batches:
            table.add_row(
                str(b.id), b.batch_no, b.source_file,
                b.imported_at.strftime("%Y-%m-%d %H:%M"),
                f"[{status_style.get(b.status, 'white')}]{b.status}[/]",
                str(b.total_records), str(b.anomaly_count)
            )
        console.print(table)
    finally:
        db.close()


@cli.command()
@click.argument("batch_id", type=int)
def list_records(batch_id):
    """查看指定批次下的记录（默认显示异常记录）"""
    db = _get_db()
    try:
        records = crud.list_records(db, batch_id=batch_id, limit=200)
        if not records:
            rprint("[yellow]该批次暂无记录[/yellow]")
            return

        anomalies = [r for r in records if r.is_anomaly]
        normal = [r for r in records if not r.is_anomaly]

        if anomalies:
            table = Table(title=f"⚠ 异常记录（共 {len(anomalies)} 条）", show_lines=True)
            table.add_column("ID", justify="right", style="cyan")
            table.add_column("行号", justify="right")
            table.add_column("指标名称", style="bold")
            table.add_column("数值", justify="right")
            table.add_column("单位", style="red")
            table.add_column("一阶导符号")
            table.add_column("二阶导符号")
            table.add_column("符号变化", style="yellow")
            table.add_column("异常详情", style="red")
            table.add_column("状态", style="bold")
            table.add_column("复核入口", style="blue")

            for r in anomalies:
                table.add_row(
                    str(r.id), str(r.row_no), r.indicator_name,
                    str(r.value) if r.value is not None else "-",
                    r.unit or "[red bold]缺失[/]",
                    r.first_derivative_sign or "-",
                    r.second_derivative_sign or "-",
                    r.sign_change_type or "-",
                    r.anomaly_detail or "-",
                    r.status,
                    f"fix-record {r.id}"
                )
            console.print(table)

        if normal:
            table2 = Table(title=f"正常记录（共 {len(normal)} 条，显示前10条）", show_lines=True)
            table2.add_column("ID", justify="right", style="cyan")
            table2.add_column("指标名称")
            table2.add_column("数值", justify="right")
            table2.add_column("单位")
            table2.add_column("符号变化")
            table2.add_column("状态")
            for r in normal[:10]:
                table2.add_row(
                    str(r.id), r.indicator_name,
                    str(r.value) if r.value is not None else "-",
                    r.unit or "-",
                    r.sign_change_type or "-",
                    r.status
                )
            console.print(table2)
    finally:
        db.close()


@cli.command("fix-record")
@click.argument("record_id", type=int)
@click.option("--unit", default=None, help="修正后的单位")
@click.option("--value", type=float, default=None, help="修正后的数值")
@click.option("--code", default=None, help="修正后的指标代码")
@click.option("--reviewer", default="anonymous", help="复核人")
@click.option("--comment", default=None, help="复核意见")
def fix_record_cmd(record_id, unit, value, code, reviewer, comment):
    """修正异常记录（无需重新导入）"""
    db = _get_db()
    try:
        old = crud.get_record(db, record_id)
        if not old:
            rprint(f"[red]记录 {record_id} 不存在[/red]")
            return

        rprint(f"[bold]修正前:[/bold] {old.indicator_name} | "
               f"数值={old.value} | 单位={old.unit} | 代码={old.indicator_code}")

        updated = crud.fix_record(db, record_id, schemas.RecordFix(
            unit=unit, value=value, indicator_code=code,
            reviewer=reviewer, comment=comment
        ))
        if updated:
            rprint(f"[bold green]修正后:[/bold green] {updated.indicator_name} | "
                   f"数值={updated.value} | 单位={updated.unit} | 代码={updated.indicator_code}")
            rprint(f"[green]✅ 记录状态已更新为: {updated.status}[/green]")
            if not updated.is_anomaly:
                rprint("[green]✨ 异常状态已自动清除[/green]")
            rprint(f"[blue]追溯入口: trace-record {record_id}[/blue]")
    finally:
        db.close()


@cli.command("trace-record")
@click.argument("record_id", type=int)
def trace_record_cmd(record_id):
    """顺着异常记录追溯：显示来源、题目清单、处理意见、批次状态流转"""
    db = _get_db()
    try:
        result = crud.trace_record(db, record_id)
        if not result:
            rprint(f"[red]记录 {record_id} 不存在[/red]")
            return

        rec = result.record
        batch = result.batch

        console.print(Panel.fit(
            f"[bold]指标:[/bold] {rec.indicator_name}\n"
            f"[bold]记录ID:[/bold] {rec.id}  |  [bold]行号:[/bold] {rec.row_no}\n"
            f"[bold]数值:[/bold] {rec.value}  |  [bold]单位:[/bold] {rec.unit or '[red]缺失[/]'}\n"
            f"[bold]一阶导:[/bold] {rec.first_derivative} ({rec.first_derivative_sign})\n"
            f"[bold]二阶导:[/bold] {rec.second_derivative} ({rec.second_derivative_sign})\n"
            f"[bold]符号变化:[/bold] {rec.sign_change_type or '无'}\n"
            f"[bold]异常:[/bold] {'是 - ' + (rec.anomaly_detail or '') if rec.is_anomaly else '否'}\n"
            f"[bold]当前状态:[/bold] {rec.status}",
            title="📋 记录详情", border_style="cyan"
        ))

        console.print(Panel.fit(
            f"[bold]批次号:[/bold] {batch.batch_no}\n"
            f"[bold]来源文件:[/bold] {batch.source_file}\n"
            f"[bold]导入时间:[/bold] {batch.imported_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"[bold]导入人:[/bold] {batch.imported_by}\n"
            f"[bold]批次状态:[/bold] {batch.status}\n"
            f"[bold]备注:[/bold] {batch.remark or '无'}",
            title="📦 来源批次", border_style="blue"
        ))

        if result.status_transitions:
            tbl = Table(title="🔄 批次状态流转", show_lines=False)
            tbl.add_column("时间", style="dim")
            tbl.add_column("从状态")
            tbl.add_column("→", style="bold", justify="center")
            tbl.add_column("到状态", style="green")
            tbl.add_column("操作人")
            tbl.add_column("说明")
            for t in result.status_transitions:
                tbl.add_row(
                    t.transitioned_at.strftime("%Y-%m-%d %H:%M"),
                    t.from_status or "(新建)",
                    "→", t.to_status, t.operator, t.comment or "-"
                )
            console.print(tbl)

        if result.question_list:
            tbl = Table(title="❓ 待核实题目清单", show_lines=True)
            tbl.add_column("编号", style="cyan")
            tbl.add_column("来源", style="yellow")
            tbl.add_column("关联字段", style="dim")
            tbl.add_column("问题", style="bold red")
            for q in result.question_list:
                tbl.add_row(q["id"], q["source"], q.get("related_field", "-"), q["question"])
            console.print(tbl)

        if result.handling_opinions:
            tbl = Table(title="📝 处理意见记录", show_lines=True)
            tbl.add_column("时间", style="dim")
            tbl.add_column("操作人")
            tbl.add_column("动作", style="bold")
            tbl.add_column("意见内容")
            for op in result.handling_opinions:
                tbl.add_row(op["time"], op["reviewer"], op["action"], op["opinion"])
            console.print(tbl)

        if not result.handling_opinions:
            rprint("[yellow]⚠ 暂无处理意见，可执行 fix-record 或 review-record[/yellow]")

        console.print("\n[dim]修正入口:[/dim] fix-record " + str(record_id))
        console.print("[dim]复核入口:[/dim] review-record " + str(record_id) + " --action confirm --comment '意见'")
    finally:
        db.close()


@cli.command("review-record")
@click.argument("record_id", type=int)
@click.option("--action", type=click.Choice(["review", "confirm", "reject", "fix"]), required=True)
@click.option("--reviewer", default="anonymous", help="复核人")
@click.option("--comment", default=None, help="复核意见")
@click.option("--unit", default=None, help="同步修正单位（可选）")
@click.option("--value", type=float, default=None, help="同步修正数值（可选）")
def review_record_cmd(record_id, action, reviewer, comment, unit, value):
    """对记录执行复核动作：review / confirm / reject / fix"""
    db = _get_db()
    try:
        updated = crud.review_record(db, record_id, schemas.RecordReview(
            action=action, reviewer=reviewer, comment=comment, unit=unit, value=value
        ))
        if not updated:
            rprint(f"[red]记录 {record_id} 不存在[/red]")
            return
        rprint(f"[green]✅ 复核完成[/green] {updated.indicator_name} "
               f"状态: {updated.status}  |  追溯: trace-record {record_id}")
    finally:
        db.close()


@cli.command("batch-status")
@click.argument("batch_id", type=int)
@click.option("--new-status", required=True, help="新状态: imported/reviewing/reviewed/reported/archived")
@click.option("--operator", default="system", help="操作人")
@click.option("--comment", default=None, help="变更说明")
def batch_status_cmd(batch_id, new_status, operator, comment):
    """推进批次状态"""
    db = _get_db()
    try:
        updated = crud.update_batch_status(db, batch_id, schemas.BatchStatusUpdate(
            new_status=new_status, operator=operator, comment=comment
        ))
        if not updated:
            rprint(f"[red]批次 {batch_id} 不存在[/red]")
            return
        rprint(f"[green]✅ 批次状态已更新:[/green] {updated.batch_no} → {updated.status}")
    finally:
        db.close()


@cli.command("gen-report")
@click.argument("batch_id", type=int)
@click.option("--title", default=None, help="报告标题")
@click.option("--by", default="system", help="报告生成人")
def gen_report_cmd(batch_id, title, by):
    """为指定批次生成报告快照（含普通话解释，可直接复制）"""
    db = _get_db()
    try:
        snapshot = reporting.create_report_snapshot(db, batch_id, created_by=by, title=title)
        if not snapshot:
            rprint(f"[red]批次 {batch_id} 不存在[/red]")
            return

        console.print(Panel.fit(
            snapshot.plain_explanation or "",
            title=f"📄 {snapshot.title} - 普通话摘要（可直接复制转发）",
            border_style="green"
        ))
        rprint(f"\n[blue]报告快照ID:[/blue] {snapshot.id}")
        rprint(f"[blue]文本导出:[/blue] export-report {snapshot.id}")
        rprint(f"[blue]图表数据:[/blue] chart-data {batch_id}")
    finally:
        db.close()


@cli.command("export-report")
@click.argument("snapshot_id", type=int)
@click.option("--output", default=None, help="输出文件路径，默认打印到终端")
def export_report_cmd(snapshot_id, output):
    """导出报告为文本文件"""
    db = _get_db()
    try:
        text = reporting.export_report_text(db, snapshot_id)
        if not text:
            rprint(f"[red]报告快照 {snapshot_id} 不存在[/red]")
            return
        if output:
            with open(output, "w", encoding="utf-8") as f:
                f.write(text)
            rprint(f"[green]✅ 报告已导出到: {output}[/green]")
        else:
            console.print(text)
    finally:
        db.close()


@cli.command("chart-data")
@click.argument("batch_id", type=int)
@click.option("--no-snapshot", is_flag=True, help="不使用快照，实时计算")
def chart_data_cmd(batch_id, no_snapshot):
    """查看批次图表数据（与报告共用同一批数据）"""
    db = _get_db()
    try:
        data = reporting.export_chart_data(db, batch_id, use_snapshot=not no_snapshot)
        if not data:
            rprint(f"[red]批次 {batch_id} 无数据[/red]")
            return

        pie1 = data.get("sign_change_pie", {})
        pie2 = data.get("anomaly_pie", {})

        console.print(Panel.fit(
            "\n".join([
                "[bold]📊 导数符号变化统计:[/bold]",
                *([f"  {k}: {v} 条" for k, v in pie1.items()] or ["  (无变化)"]),
                "",
                "[bold]⚠ 异常类型统计:[/bold]",
                *([f"  {k}: {v} 条" for k, v in pie2.items()] or ["  (无异常)"]),
                "",
                f"共 {len(data.get('bar_chart', {}).get('x', []))} 个指标"
            ]),
            title="📈 图表数据（与报告共用记录）", border_style="magenta"
        ))
    finally:
        db.close()


@cli.command()
@click.option("--batch-ids", default=None, help="批次ID逗号分隔，如 1,2")
@click.option("--limit", default=3, help="默认对比最近N批")
def compare(batch_ids, limit):
    """多批次历史对比（共用报告快照数据）"""
    db = _get_db()
    try:
        parsed = None
        if batch_ids:
            parsed = [int(x.strip()) for x in batch_ids.split(",") if x.strip()]
        result = reporting.compare_batches_with_report(db, batch_ids=parsed, limit=limit)

        table = Table(title="🔍 历史批次对比", show_lines=True)
        table.add_column("批次号", style="green")
        table.add_column("导入时间")
        table.add_column("状态")
        table.add_column("记录数", justify="right")
        table.add_column("异常数", justify="right", style="red")
        table.add_column("报告链接", style="blue")

        for b in result["comparison"]["batches"]:
            ref = result["snapshot_refs"].get(b["batch_no"], {})
            imported_at = b["imported_at"]
            if not isinstance(imported_at, str):
                imported_at = imported_at.strftime("%Y-%m-%d %H:%M:%S")
            table.add_row(
                b["batch_no"], imported_at[:16], b["status"],
                str(b["total_records"]), str(b["anomaly_count"]),
                ref.get("report_url", "(暂无报告)")
            )
        console.print(table)

        if result["comparison"]["common_indicators"]:
            rprint(f"[dim]共通指标 {len(result['comparison']['common_indicators'])} 个:[/dim] "
                   f"{', '.join(result['comparison']['common_indicators'][:5])}...")

        rprint(f"[dim]{result['note']}[/dim]")
    finally:
        db.close()


@cli.command("demo-seed")
def demo_seed_cmd():
    """灌入演示数据（2个批次，含单位缺失等异常）"""
    db = _get_db()
    try:
        result = demo_data.seed_all(db)
        summary = result.get("summary", {})
        console.print(Panel.fit(
            f"演示数据已就绪！\n"
            f"批次1: [bold]{result['batch1']['batch_no']}[/bold] (ID={result['batch1']['batch_id']}) "
            f"- {summary.get('total_records_batch1', 0)} 条记录\n"
            f"批次2: [bold]{result['batch2']['batch_no']}[/bold] (ID={result['batch2']['batch_id']}) "
            f"- {summary.get('total_records_batch2', 0)} 条记录\n\n"
            f"[yellow]验收路径建议:[/yellow]\n"
            f"  1) list-batches                 # 查看批次\n"
            f"  2) list-records <batch1_id>     # 定位异常记录（含缺失单位）\n"
            f"  3) trace-record <anomaly_id>    # 顺异常追溯题目清单、处理意见\n"
            f"  4) fix-record <anomaly_id> --unit % --comment '补单位'  # 复核入口修正\n"
            f"  5) trace-record <anomaly_id>    # 再查，状态和处理意见已更新\n"
            f"  6) gen-report <batch1_id>       # 生成带普通话解释的报告\n"
            f"  7) compare                      # 历史对比（共用报告快照）",
            title="✅ Demo数据已生成", border_style="green"
        ))
    finally:
        db.close()


def main():
    cli()


if __name__ == "__main__":
    main()
