import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from datetime import datetime
from .models import init_db, get_session
from .utils import status_text, anomaly_text
from .config import REVIEW_STATUS, ANOMALY_TYPES, EXPORT_DIR

console = Console()


@click.group()
@click.version_option(version="1.0.0", prog_name="bde")
def cli():
    """保税仓进口关税暂估工具 (Bonded Duty Estimator)

    跨境供应链财务专用工具，支持批量文件导入、关税暂估计算、
    税则错用检测、汇率跨期检查、差异导出和月度报告生成。
    """
    init_db()


@cli.group(name="import")
def import_cmd():
    """导入数据（商品清单、报关单、暂估报告）"""
    pass


@import_cmd.command("file")
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--type", "data_type", type=click.Choice(["商品清单", "报关单", "暂估报告"]),
              help="指定数据类型，不指定则自动识别")
@click.option("--sheet", "sheet_name", help="指定工作表名称")
@click.option("--by", "imported_by", help="导入人")
@click.option("--force", is_flag=True, help="强制导入，跳过重复检查")
def import_file_cmd(file_path, data_type, sheet_name, imported_by, force):
    """导入单个Excel文件"""
    from .importer import import_file
    with console.status(f"[bold green]正在导入文件: {file_path}"):
        result = import_file(file_path, data_type, sheet_name, imported_by, force)

    if result["success"]:
        console.print(Panel.fit(
            f"[bold green]导入成功[/bold green]\n"
            f"数据类型: {result['data_type']}\n"
            f"导入记录ID: {result['import_id']}\n"
            f"有效记录数: {result['row_count']} 行",
            title="✅ 导入完成"
        ))
        if result.get("columns_mapped"):
            table = Table(title="列名映射")
            table.add_column("标准字段")
            table.add_column("原文件列名")
            for std, orig in result["columns_mapped"].items():
                table.add_row(std, orig)
            console.print(table)
    else:
        console.print(f"[bold red]导入失败:[/bold red] {result.get('error', '未知错误')}")
        if "duplicate_of" in result:
            console.print(f"重复导入记录ID: {result['duplicate_of']}，使用 --force 可强制导入")


@import_cmd.command("batch")
@click.argument("pattern")
@click.option("--type", "data_type", type=click.Choice(["商品清单", "报关单", "暂估报告"]),
              help="指定数据类型")
@click.option("--by", "imported_by", help="导入人")
@click.option("--force", is_flag=True, help="强制导入，跳过重复检查")
def import_batch_cmd(pattern, data_type, imported_by, force):
    """批量导入文件，支持通配符 例如: data/*.xlsx"""
    from .importer import import_batch
    with console.status(f"[bold green]正在批量导入: {pattern}"):
        result = import_batch(pattern, data_type, imported_by, force)

    if not result["success"]:
        console.print(f"[bold red]导入失败:[/bold red] {result.get('error', '未知错误')}")
        return

    table = Table(title=f"批量导入结果 ({result['success_count']}/{result['total']} 成功)")
    table.add_column("文件", overflow="fold")
    table.add_column("状态")
    table.add_column("详情")

    for r in result["results"]:
        if r["success"]:
            status = "[green]成功[/green]"
            detail = f"{r['data_type']}, {r['row_count']} 行"
        else:
            status = "[red]失败[/red]"
            detail = r.get("error", "未知错误")
        table.add_row(r["file"], status, detail)

    console.print(table)


@cli.command("estimate")
@click.option("--sku", help="指定SKU")
@click.option("--period", help="指定期间 (格式: YYYYMM 或 YYYY-MM)")
@click.option("--no-link", is_flag=True, help="跳过自动关联步骤")
def estimate_cmd(sku, period, no_link):
    """执行关税暂估计算和异常检测"""
    from .estimator import estimate_duty
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period) if period else None
    period_display = period or "全部期间"
    sku_display = sku or "全部SKU"

    with console.status(f"[bold green]正在执行暂估计算: {period_display} / {sku_display}"):
        results = estimate_duty(session, sku, period, auto_link=not no_link)

    if not results:
        console.print("[yellow]未找到需要计算的暂估记录[/yellow]")
        return

    approved = sum(1 for r in results if r["status"] == "APPROVED")
    pending = sum(1 for r in results if r["status"] == "PENDING")
    total_anomalies = sum(r["anomaly_count"] for r in results)

    console.print(Panel.fit(
        f"处理记录: {len(results)} 条\n"
        f"[green]通过: {approved} 条[/green]\n"
        f"[yellow]待复核: {pending} 条[/yellow]\n"
        f"[red]异常项: {total_anomalies} 项[/red]",
        title="✅ 暂估计算完成"
    ))

    if pending > 0:
        table = Table(title="待复核记录 (前10条)")
        table.add_column("ID")
        table.add_column("SKU")
        table.add_column("期间")
        table.add_column("异常数")
        table.add_column("主要异常")

        for r in [r for r in results if r["status"] == "PENDING"][:10]:
            main_anomaly = r["anomalies"][0]["anomaly_description"][:30] if r["anomalies"] else ""
            table.add_row(
                str(r["estimation_id"]),
                r["sku"],
                r["period"],
                str(r["anomaly_count"]),
                main_anomaly + "..." if len(main_anomaly) >= 30 else main_anomaly
            )
        console.print(table)


@cli.group()
def review():
    """复核管理（查看、审批、驳回、标记已复核）"""
    pass


@review.command("list")
@click.option("--period", help="指定期间")
@click.option("--anomaly", "anomaly_type",
              type=click.Choice(list(ANOMALY_TYPES.keys()) + list(ANOMALY_TYPES.values())),
              help="按异常类型筛选")
@click.option("--sku", help="指定SKU")
@click.option("--limit", default=20, help="显示数量限制")
def review_list(period, anomaly_type, sku, limit):
    """列出待复核记录"""
    from .reviewer import get_pending_reviews
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period) if period else None

    if anomaly_type and anomaly_type in ANOMALY_TYPES.values():
        for code, name in ANOMALY_TYPES.items():
            if name == anomaly_type:
                anomaly_type = code
                break

    results = get_pending_reviews(session, period, anomaly_type, sku, limit)

    if not results:
        console.print("[green]没有待复核记录[/green]")
        return

    table = Table(title=f"待复核记录 ({len(results)} 条)")
    table.add_column("ID")
    table.add_column("SKU")
    table.add_column("商品名称")
    table.add_column("期间")
    table.add_column("异常数")
    table.add_column("异常类型")

    for r in results:
        anomaly_types = "; ".join([a["type"] for a in r["anomalies"]])
        table.add_row(
            str(r["id"]),
            r["sku"],
            r["name"][:15] + "..." if len(r["name"]) > 15 else r["name"],
            r["period"],
            str(r["anomaly_count"]),
            anomaly_types[:25] + "..." if len(anomaly_types) > 25 else anomaly_types
        )
    console.print(table)


@review.command("show")
@click.argument("estimation_id", type=int)
def review_show(estimation_id):
    """查看单条暂估记录详情"""
    from .reviewer import get_detailed_estimation
    session = next(get_session())

    result = get_detailed_estimation(session, estimation_id)
    if not result:
        console.print(f"[red]记录不存在: {estimation_id}[/red]")
        return

    est = result["estimation"]
    console.print(Panel.fit(
        f"[bold]SKU:[/bold] {est['sku']}\n"
        f"[bold]期间:[/bold] {est['period']}\n"
        f"[bold]暂估编号:[/bold] {est['report_no']}\n"
        f"[bold]使用税则号:[/bold] {est['hs_code_used']}\n"
        f"[bold]使用汇率:[/bold] {est['exchange_rate_used']}\n"
        f"[bold]暂估关税:[/bold] {est['estimated_duty']}\n"
        f"[bold]暂估增值税:[/bold] {est['estimated_tax']}\n"
        f"[bold]暂估日期:[/bold] {est['estimation_date']}\n"
        f"[bold]暂估人:[/bold] {est['estimator']}\n"
        f"[bold]复核状态:[/bold] [{_status_color(est['status_code'])}]{est['status']}[/{_status_color(est['status_code'])}]",
        title=f"📋 暂估记录详情 #{estimation_id}"
    ))

    if result.get("goods"):
        g = result["goods"]
        table = Table(title="商品清单信息")
        table.add_column("项目")
        table.add_column("内容")
        table.add_row("商品名称", g["name"])
        table.add_row("基准税则号", g["hs_code"])
        table.add_row("申报税则号", g["declared_hs_code"])
        table.add_row("原产国", g["origin_country"])
        table.add_row("单价", str(g["unit_price"]))
        table.add_row("数量", str(g["quantity"]))
        table.add_row("合同号", g["contract_no"])
        console.print(table)

    if result.get("declaration"):
        d = result["declaration"]
        table = Table(title="报关单信息")
        table.add_column("项目")
        table.add_column("内容")
        table.add_row("报关单号", d["entry_no"])
        table.add_row("申报日期", str(d["entry_date"]))
        table.add_row("税则号", d["hs_code"])
        table.add_row("关税率(%)", str(d["duty_rate"]))
        table.add_row("增值税率(%)", str(d["tax_rate"]))
        table.add_row("CIF价", str(d["cif_amount"]))
        table.add_row("币制", d["currency"])
        table.add_row("汇率", str(d["exchange_rate"]))
        table.add_row("报关关税", str(d["duty_amount"]))
        table.add_row("报关增值税", str(d["tax_amount"]))
        console.print(table)

    if result.get("anomalies"):
        table = Table(title=f"异常记录 ({len(result['anomalies'])} 条)")
        table.add_column("ID")
        table.add_column("类型")
        table.add_column("描述")
        table.add_column("字段")
        table.add_column("原值")
        table.add_column("新值")
        table.add_column("状态")
        for a in result["anomalies"]:
            status = "[green]已解决[/green]" if a["resolved"] else "[red]待解决[/red]"
            table.add_row(
                str(a["id"]),
                a["type"],
                a["description"][:40],
                a["field"],
                str(a["old_value"])[:15],
                str(a["new_value"])[:15],
                status
            )
        console.print(table)

    if result.get("source_trace"):
        table = Table(title="数据来源追溯")
        table.add_column("类型")
        table.add_column("文件")
        table.add_column("工作表")
        table.add_column("行号")
        table.add_column("导入时间")
        for t in result["source_trace"]:
            file_short = t["file"].split("/")[-1]
            table.add_row(
                t["type"],
                file_short[:25] + "..." if len(file_short) > 25 else file_short,
                t.get("sheet", ""),
                str(t.get("row", "")),
                t["import_time"].strftime("%Y-%m-%d %H:%M") if t.get("import_time") else ""
            )
        console.print(table)


@review.command("approve")
@click.argument("estimation_id", type=int)
@click.option("--by", "reviewed_by", help="复核人")
@click.option("--notes", help="审批备注")
def review_approve(estimation_id, reviewed_by, notes):
    """审批通过单条记录"""
    from .reviewer import update_review_status
    session = next(get_session())
    result = update_review_status(session, estimation_id, "APPROVED", reviewed_by, notes)
    if result["success"]:
        console.print(f"[green]✅ 记录 #{estimation_id} 已通过审批[/green]")
        if result["resolved_anomalies"]:
            console.print(f"   同步解决 {result['resolved_anomalies']} 项异常")
    else:
        console.print(f"[red]操作失败: {result['error']}[/red]")


@review.command("reject")
@click.argument("estimation_id", type=int)
@click.option("--by", "reviewed_by", help="复核人")
@click.option("--notes", help="驳回原因", required=True)
def review_reject(estimation_id, reviewed_by, notes):
    """驳回单条记录"""
    from .reviewer import update_review_status
    session = next(get_session())
    result = update_review_status(session, estimation_id, "REJECTED", reviewed_by, notes)
    if result["success"]:
        console.print(f"[red]❌ 记录 #{estimation_id} 已驳回[/red]")
    else:
        console.print(f"[red]操作失败: {result['error']}[/red]")


@review.command("mark-reviewed")
@click.argument("estimation_id", type=int)
@click.option("--by", "reviewed_by", help="复核人")
def review_mark_reviewed(estimation_id, reviewed_by):
    """标记为已复核（保留异常记录）"""
    from .reviewer import update_review_status
    session = next(get_session())
    result = update_review_status(session, estimation_id, "REVIEWED", reviewed_by)
    if result["success"]:
        console.print(f"[yellow]⚠️  记录 #{estimation_id} 标记为已复核[/yellow]")
    else:
        console.print(f"[red]操作失败: {result['error']}[/red]")


@review.command("resolve-anomaly")
@click.argument("anomaly_id", type=int)
@click.option("--by", "resolved_by", help="处理人")
@click.option("--notes", help="处理备注", required=True)
def resolve_anomaly(anomaly_id, resolved_by, notes):
    """标记单条异常为已解决"""
    from .reviewer import resolve_anomaly
    session = next(get_session())
    result = resolve_anomaly(session, anomaly_id, resolved_by, notes)
    if result["success"]:
        console.print(f"[green]✅ 异常 #{anomaly_id} 标记为已解决[/green]")
    else:
        console.print(f"[red]操作失败: {result['error']}[/red]")


@review.command("stats")
@click.option("--period", help="指定期间")
def review_stats(period):
    """查看复核统计信息"""
    from .reviewer import get_review_statistics
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period) if period else None
    stats = get_review_statistics(session, period)

    table = Table(title=f"复核状态统计 - {period or '全部期间'}")
    table.add_column("状态")
    table.add_column("数量")
    table.add_column("占比")
    for code, info in stats["status_breakdown"].items():
        color = _status_color(code)
        table.add_row(
            f"[{color}]{info['label']}[/{color}]",
            str(info["count"]),
            f"{info['percentage']}%"
        )
    console.print(table)

    if stats["anomaly_breakdown"]:
        table = Table(title="待复核异常类型统计")
        table.add_column("异常类型")
        table.add_column("数量")
        for code, info in stats["anomaly_breakdown"].items():
            table.add_row(f"[red]{info['label']}[/red]", str(info["count"]))
        console.print(table)


@cli.group()
def diff():
    """差异比较（期间对比、导入批次对比）"""
    pass


@diff.command("period")
@click.argument("period1")
@click.argument("period2")
@click.option("--export", is_flag=True, help="导出差异结果")
def diff_period(period1, period2, export):
    """比较两个期间的差异"""
    from .exporter import compare_periods, build_diff_dataframe, export_to_excel
    from .utils import normalize_period
    session = next(get_session())

    period1 = normalize_period(period1)
    period2 = normalize_period(period2)

    with console.status(f"[bold green]正在比较 {period1} vs {period2}"):
        result = compare_periods(session, period1, period2)

    console.print(Panel.fit(
        f"期间 1 ({period1}): {result['period1_count']} 条\n"
        f"期间 2 ({period2}): {result['period2_count']} 条\n"
        f"涉及SKU: {result['total_skus']} 个\n"
        f"[red]差异项: {result['diff_count']} 项[/red]",
        title="📊 期间比较结果"
    ))

    if result["differences"]:
        table = Table(title="差异明细 (前20条)")
        table.add_column("SKU")
        table.add_column("变更类型")
        table.add_column("字段")
        table.add_column("原值")
        table.add_column("新值")
        table.add_column("差异值")

        for d in result["differences"][:20]:
            change_color = "green" if d["change_type"] == "新增" else "red" if d["change_type"] == "删除" else "yellow"
            table.add_row(
                d["sku"],
                f"[{change_color}]{d['change_type']}[/{change_color}]",
                d["field"],
                str(d["old_value"]),
                str(d["new_value"]),
                str(d.get("difference", ""))
            )
        console.print(table)

    if export and result["differences"]:
        df = build_diff_dataframe(result)
        export_result = export_to_excel(df, "期间差异", period=f"{period1}_vs_{period2}")
        if export_result["success"]:
            console.print(f"[green]差异文件已导出: {export_result['file_path']}[/green]")


@diff.command("import")
@click.argument("import_id1", type=int)
@click.argument("import_id2", type=int)
@click.option("--export", is_flag=True, help="导出差异结果")
def diff_import(import_id1, import_id2, export):
    """比较两个导入批次的差异"""
    from .exporter import compare_imports, build_diff_dataframe, export_to_excel
    session = next(get_session())

    with console.status(f"[bold green]正在比较导入批次 {import_id1} vs {import_id2}"):
        result = compare_imports(session, import_id1, import_id2)

    if not result.get("success"):
        console.print(f"[red]比较失败: {result['error']}[/red]")
        return

    console.print(Panel.fit(
        f"数据类型: {result['data_type']}\n"
        f"批次 1: {result['count1']} 条\n"
        f"批次 2: {result['count2']} 条\n"
        f"[red]差异项: {result['diff_count']} 项[/red]",
        title="📊 导入批次比较结果"
    ))

    if result["differences"]:
        table = Table(title="差异明细 (前20条)")
        table.add_column("关键字")
        table.add_column("变更类型")
        table.add_column("字段")
        table.add_column("原值")
        table.add_column("新值")

        for d in result["differences"][:20]:
            change_color = "green" if d["change_type"] == "新增" else "red" if d["change_type"] == "删除" else "yellow"
            table.add_row(
                d["key"],
                f"[{change_color}]{d['change_type']}[/{change_color}]",
                d["field"],
                str(d["old_value"]),
                str(d["new_value"])
            )
        console.print(table)

    if export and result["differences"]:
        df = build_diff_dataframe(result)
        export_result = export_to_excel(df, "导入差异", period=f"import_{import_id1}_vs_{import_id2}")
        if export_result["success"]:
            console.print(f"[green]差异文件已导出: {export_result['file_path']}[/green]")


@cli.group()
def export():
    """数据导出"""
    pass


@export.command("estimations")
@click.option("--period", help="指定期间")
@click.option("--status", type=click.Choice(list(REVIEW_STATUS.keys())), help="按状态筛选")
@click.option("--by", "exported_by", help="导出人")
@click.option("--notes", help="备注")
def export_estimations(period, status, exported_by, notes):
    """导出暂估记录明细"""
    from .exporter import build_estimation_dataframe, export_to_excel
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period) if period else None

    with console.status("[bold green]正在生成导出文件"):
        df = build_estimation_dataframe(session, period, status)
        if df.empty:
            console.print("[yellow]没有可导出的数据[/yellow]")
            return
        result = export_to_excel(df, "暂估明细", period, exported_by, notes)

    if result["success"]:
        console.print(Panel.fit(
            f"记录数: {result['row_count']} 条\n"
            f"校验码: {result['checksum']}\n"
            f"文件路径: {result['file_path']}",
            title="✅ 导出成功"
        ))


@export.command("anomalies")
@click.option("--period", help="指定期间")
@click.option("--all", "include_resolved", is_flag=True, help="包含已解决的异常")
@click.option("--by", "exported_by", help="导出人")
def export_anomalies(period, include_resolved, exported_by):
    """导出异常记录"""
    from .exporter import build_anomaly_dataframe, export_to_excel
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period) if period else None

    with console.status("[bold green]正在生成异常导出文件"):
        df = build_anomaly_dataframe(session, period, unresolved_only=not include_resolved)
        if df.empty:
            console.print("[yellow]没有可导出的异常数据[/yellow]")
            return
        result = export_to_excel(df, "异常明细", period, exported_by)

    if result["success"]:
        console.print(Panel.fit(
            f"记录数: {result['row_count']} 条\n"
            f"校验码: {result['checksum']}\n"
            f"文件路径: {result['file_path']}",
            title="✅ 异常导出成功"
        ))


@export.command("verify")
@click.argument("file_path", type=click.Path(exists=True))
def export_verify(file_path):
    """校验导出文件完整性"""
    from .exporter import verify_export_consistency

    result = verify_export_consistency(file_path)

    if result["valid"]:
        console.print("[green]✅ 文件校验通过，数据未被篡改[/green]")
    else:
        console.print("[red]❌ 文件校验失败，数据可能已被篡改[/red]")
        console.print(f"   保存校验码: {result['saved_checksum']}")
        console.print(f"   当前校验码: {result['current_checksum']}")

    if result["in_database"] and result["export_record"]:
        console.print("\n[blue]数据库导出记录:[/blue]")
        console.print(f"   导出类型: {result['export_record']['export_type']}")
        console.print(f"   所属期间: {result['export_record']['period']}")
        console.print(f"   导出时间: {result['export_record']['export_time']}")
        console.print(f"   导出人: {result['export_record']['exported_by']}")
    else:
        console.print("\n[yellow]⚠️  该文件无对应数据库导出记录[/yellow]")


@cli.command("report")
@click.argument("period")
@click.option("--by", "exported_by", help="报告生成人")
@click.option("--text-only", is_flag=True, help="仅输出文本摘要，不生成Excel")
def report_cmd(period, exported_by, text_only):
    """生成月度保税仓进口关税暂估报告"""
    from .report import generate_monthly_report, generate_summary_text
    from .utils import normalize_period
    session = next(get_session())

    period = normalize_period(period)

    with console.status(f"[bold green]正在生成 {period} 月度报告"):
        result = generate_monthly_report(session, period, exported_by)

    if not result["success"]:
        console.print(f"[red]报告生成失败: {result['error']}[/red]")
        return

    summary = generate_summary_text(period, result)
    console.print(summary)

    if not text_only:
        console.print(f"\n[green]完整报告已生成: {result['file_path']}[/green]")


@cli.command("info")
def info_cmd():
    """显示工具信息和数据存储位置"""
    from .config import APP_DIR, DB_PATH, EXPORT_DIR

    console.print(Panel.fit(
        f"[bold]保税仓进口关税暂估工具 (BDE)[/bold]\n"
        f"版本: 1.0.0\n\n"
        f"[bold]数据目录:[/bold] {APP_DIR}\n"
        f"[bold]数据库:[/bold] {DB_PATH}\n"
        f"[bold]导出目录:[/bold] {EXPORT_DIR}\n\n"
        f"[bold]支持的数据类型:[/bold]\n"
        f"  • 商品清单 - SKU、税则号、单价等基础信息\n"
        f"  • 报关单 - 报关单号、税率、CIF价等申报信息\n"
        f"  • 暂估报告 - 暂估关税、增值税等暂估记录\n\n"
        f"[bold]检测的异常类型:[/bold]\n"
        f"  • 税则错用 - HS编码不一致\n"
        f"  • 汇率跨期 - 汇率使用期间不一致\n"
        f"  • 补申报覆盖 - 同一SKU同一期间多次暂估\n"
        f"  • 计算口径不一致 - 暂估与计算值差异过大\n"
        f"  • 异常保留 - 税费为0或异常偏低\n"
        f"  • 数据缺失 - 关键字段为空",
        title="ℹ️  工具信息"
    ))


def _status_color(status_code):
    return {
        "PENDING": "yellow",
        "REVIEWED": "blue",
        "APPROVED": "green",
        "REJECTED": "red",
    }.get(status_code, "white")


if __name__ == "__main__":
    cli()
