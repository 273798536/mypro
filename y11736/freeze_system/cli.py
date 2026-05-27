import os
import sys
from datetime import datetime, timedelta
from typing import Optional
import click
from tabulate import tabulate

from .database import init_db
from .services.freeze_service import FreezeService
from .services.import_service import DataImporter
from .services.risk_service import RiskDetection
from .services.report_service import ReportService
from .services.audit_service import AuditService
from .models import Merchant, Order, FreezeRecord
from .database import get_db
from .config import IMPORT_DIR, EXPORT_DIR


def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise click.BadParameter(f"日期格式错误: {date_str}，请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS")


def _print_result(result: dict):
    if result.get("success"):
        click.echo(click.style(f"✓ 操作成功", fg="green"))
        if "freeze_no" in result:
            click.echo(f"  冻结单号: {result['freeze_no']}")
        if "appeal_no" in result:
            click.echo(f"  申诉单号: {result['appeal_no']}")
        if "unfreeze_no" in result:
            click.echo(f"  解冻单号: {result['unfreeze_no']}")
            click.echo(f"  剩余冻结: {result.get('remain_frozen', 0):.2f} 元")
            click.echo(f"  新状态: {result.get('new_status', '')}")
    else:
        click.echo(click.style(f"✗ 操作失败: {result.get('error', '未知错误')}", fg="red"))


def _print_table(headers, rows, show_index=True):
    if not rows:
        click.echo("  暂无数据")
        return
    click.echo(tabulate(rows, headers=headers, tablefmt="simple", showindex=show_index))


@click.group()
@click.version_option(version="1.0.0", prog_name="电商货款冻结解冻系统")
def cli():
    """电商货款冻结解冻系统 - 处理商家资金冻结、申诉、解冻全流程"""
    pass


@cli.command()
def init():
    """初始化数据库"""
    init_db()
    click.echo(click.style("✓ 数据库初始化完成", fg="green"))


@cli.group()
def freeze():
    """资金冻结相关操作"""
    pass


@freeze.command("create")
@click.option("--merchant-code", required=True, help="商家编码")
@click.option("--order-no", required=True, help="订单号")
@click.option("--amount", required=True, type=float, help="冻结金额")
@click.option("--reason", required=True, help="冻结原因")
@click.option("--violation-no", help="关联违规单号")
@click.option("--operator", default="system", help="操作人")
def create_freeze(merchant_code, order_no, amount, reason, violation_no, operator):
    """创建资金冻结"""
    freeze, result = FreezeService.create_freeze(
        merchant_code=merchant_code,
        order_no=order_no,
        freeze_amount=amount,
        freeze_reason=reason,
        violation_no=violation_no,
        operator=operator,
    )
    _print_result(result)


@freeze.command("status")
@click.option("--freeze-no", required=True, help="冻结单号")
def freeze_status(freeze_no):
    """查询冻结状态和历史"""
    result = FreezeService.get_freeze_status(freeze_no)
    if not result["success"]:
        click.echo(click.style(f"✗ 查询失败: {result['error']}", fg="red"))
        return

    data = result["data"]
    click.echo("\n" + click.style("═══════ 冻结详情 ═══════", fg="cyan", bold=True))
    click.echo(f"冻结单号: {data['freeze_no']}")
    click.echo(f"商家: {data['merchant_code']} - {data['merchant_name']}")
    click.echo(f"订单: {data['order_no']}")
    click.echo(f"冻结金额: {data['freeze_amount']:.2f} 元")
    click.echo(f"已解冻: {data['unfreeze_amount']:.2f} 元")
    click.echo(f"剩余冻结: {data['remain_frozen']:.2f} 元")
    click.echo(f"当前状态: {data['status']}")
    click.echo(f"冻结原因: {data['freeze_reason']}")
    click.echo(f"冻结时间: {data['freeze_time']}")

    if data["unfreeze_history"]:
        click.echo("\n" + click.style("─────── 解冻历史 ───────", fg="yellow"))
        rows = [
            [uf["unfreeze_no"], uf["amount"], uf["time"], uf["operator"], uf["reason"]]
            for uf in data["unfreeze_history"]
        ]
        _print_table(["解冻单号", "金额", "时间", "操作人", "原因"], rows, show_index=False)


@cli.group()
def appeal():
    """申诉相关操作"""
    pass


@appeal.command("create")
@click.option("--violation-no", required=True, help="违规单号")
@click.option("--reason", required=True, help="申诉原因")
@click.option("--evidence", default="", help="申诉证据")
@click.option("--appellant", default="merchant", help="申诉人")
def create_appeal(violation_no, reason, evidence, appellant):
    """创建申诉"""
    appeal, result = FreezeService.create_appeal(
        violation_no=violation_no,
        appeal_reason=reason,
        appeal_evidence=evidence,
        appellant=appellant,
    )
    _print_result(result)


@appeal.command("audit")
@click.option("--appeal-no", required=True, help="申诉单号")
@click.option(
    "--result", "audit_result",
    required=True,
    type=click.Choice(["approved", "rejected", "partial_approved"]),
    help="审核结果",
)
@click.option("--opinion", default="", help="审核意见")
@click.option("--unfreeze-amount", type=float, default=0, help="建议解冻金额")
@click.option("--auditor", default="system", help="审核人")
def audit_appeal(appeal_no, audit_result, opinion, unfreeze_amount, auditor):
    """审核申诉"""
    result = FreezeService.audit_appeal(
        appeal_no=appeal_no,
        audit_result=audit_result,
        audit_opinion=opinion,
        unfreeze_suggestion=unfreeze_amount,
        auditor=auditor,
    )
    _print_result(result)


@cli.command()
@click.option("--freeze-no", required=True, help="冻结单号")
@click.option("--amount", required=True, type=float, help="解冻金额")
@click.option("--reason", required=True, help="解冻原因")
@click.option(
    "--type", "unfreeze_type",
    default="partial",
    type=click.Choice(["partial", "full"]),
    help="解冻类型",
)
@click.option("--appeal-no", help="关联申诉单号")
@click.option("--operator", default="system", help="操作人")
def unfreeze(freeze_no, amount, reason, unfreeze_type, appeal_no, operator):
    """执行解冻操作"""
    result = FreezeService.process_unfreeze(
        freeze_no=freeze_no,
        unfreeze_amount=amount,
        unfreeze_reason=reason,
        unfreeze_type=unfreeze_type,
        appeal_no=appeal_no,
        operator=operator,
    )
    _print_result(result)


@cli.group()
def import_data():
    """批量导入数据"""
    pass


@import_data.command("merchants")
@click.option("--file", required=True, help="商家数据文件路径 (CSV或Excel)")
@click.option("--operator", default="system", help="操作人")
def import_merchants(file, operator):
    """导入商家数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_merchants(file)
    _print_import_result(result)


@import_data.command("orders")
@click.option("--file", required=True, help="订单数据文件路径")
@click.option("--operator", default="system", help="操作人")
def import_orders(file, operator):
    """导入订单数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_orders(file)
    _print_import_result(result)


@import_data.command("violations")
@click.option("--file", required=True, help="违规数据文件路径")
@click.option("--operator", default="system", help="操作人")
def import_violations(file, operator):
    """导入违规数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_violations(file)
    _print_import_result(result)


@import_data.command("appeals")
@click.option("--file", required=True, help="申诉数据文件路径")
@click.option("--operator", default="system", help="操作人")
def import_appeals(file, operator):
    """导入申诉数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_appeals(file)
    _print_import_result(result)


@import_data.command("freezes")
@click.option("--file", required=True, help="冻结数据文件路径")
@click.option("--operator", default="system", help="操作人")
def import_freezes(file, operator):
    """导入冻结数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_freezes(file)
    _print_import_result(result)


@import_data.command("unfreezes")
@click.option("--file", required=True, help="解冻数据文件路径")
@click.option("--operator", default="system", help="操作人")
def import_unfreezes(file, operator):
    """导入解冻数据"""
    importer = DataImporter(operator=operator)
    result = importer.import_unfreezes(file)
    _print_import_result(result)


def _print_import_result(result):
    if not result["success"]:
        click.echo(click.style(f"✗ 导入失败: {result['error']}", fg="red"))
        return

    stats = result["stats"]
    click.echo(click.style(f"✓ 导入完成，批次号: {result['batch_no']}", fg="green"))
    click.echo(f"  总计: {stats['total']} 条")
    click.echo(f"  成功: {click.style(str(stats['success']), fg='green')} 条")
    click.echo(f"  失败: {click.style(str(stats['failed']), fg='red')} 条")
    click.echo(f"  脏数据: {click.style(str(stats['dirty']), fg='yellow')} 条")

    if stats["errors"]:
        click.echo("\n" + click.style("错误详情:", fg="red"))
        for err in stats["errors"][:10]:
            click.echo(f"  - {err}")
        if len(stats["errors"]) > 10:
            click.echo(f"  ... 还有 {len(stats['errors']) - 10} 条错误")


@cli.command("risk-check")
@click.option(
    "--type", "check_type",
    default="all",
    type=click.Choice(["all", "freeze_expansion", "balance_not_updated", "duplicate_unfreeze", "balance_mismatch"]),
    help="检查类型",
)
@click.option("--operator", default="system", help="操作人")
def risk_check(check_type, operator):
    """风险检测"""
    click.echo(click.style("正在执行风险检测...", fg="cyan"))

    if check_type == "all":
        result = RiskDetection.run_all_checks(operator)
    elif check_type == "freeze_expansion":
        risks = RiskDetection.detect_freeze_expansion()
        result = {"total_risks": len(risks), "high_risk_count": len(risks), "warning_count": 0, "details": {check_type: risks}}
    elif check_type == "balance_not_updated":
        risks = RiskDetection.detect_balance_not_updated()
        high = sum(1 for r in risks if r["risk_level"] == "high")
        warn = sum(1 for r in risks if r["risk_level"] == "warning")
        result = {"total_risks": len(risks), "high_risk_count": high, "warning_count": warn, "details": {check_type: risks}}
    elif check_type == "duplicate_unfreeze":
        risks = RiskDetection.detect_duplicate_unfreeze()
        result = {"total_risks": len(risks), "high_risk_count": len(risks), "warning_count": 0, "details": {check_type: risks}}
    elif check_type == "balance_mismatch":
        risks = RiskDetection.detect_balance_mismatch()
        result = {"total_risks": len(risks), "high_risk_count": len(risks), "warning_count": 0, "details": {check_type: risks}}

    click.echo("\n" + click.style("═══════ 风险检测结果 ═══════", fg="yellow", bold=True))
    if result["total_risks"] == 0:
        click.echo(click.style("✓ 未检测到风险", fg="green"))
    else:
        click.echo(f"发现 {click.style(str(result['total_risks']), fg='red')} 个风险：")
        click.echo(f"  高风险: {click.style(str(result['high_risk_count']), fg='red')}")
        click.echo(f"  警告: {click.style(str(result['warning_count']), fg='yellow')}")

        for risk_type, risks in result["details"].items():
            if risks:
                click.echo(f"\n{click.style(f'[{risk_type}]', fg='cyan')}:")
                for risk in risks:
                    color = "red" if risk["risk_level"] == "high" else "yellow"
                    click.echo(f"  {click.style('●', fg=color)} {risk['message']}")


@cli.command("audit")
@click.option("--operator", default="system", help="操作人")
def run_audit(operator):
    """执行全量余额审计"""
    click.echo(click.style("正在执行全量审计...", fg="cyan"))
    result = FreezeService.run_full_audit(operator)

    click.echo("\n" + click.style("═══════ 审计结果 ═══════", fg="green", bold=True))
    click.echo(f"已审计商家数: {result['merchants_audited']}")
    if result["risks_found"] > 0:
        click.echo(click.style(f"发现风险: {result['risks_found']} 个", fg="red"))
        click.echo(f"  高风险: {result['high_risks']}")
        click.echo(f"  警告: {result['warnings']}")
    else:
        click.echo(click.style("✓ 未发现风险", fg="green"))


@cli.group()
def export():
    """导出报告"""
    pass


@export.command("freeze")
@click.option("--start-date", help="开始日期 YYYY-MM-DD")
@click.option("--end-date", help="结束日期 YYYY-MM-DD")
@click.option("--status", help="冻结状态")
@click.option("--merchant-code", help="商家编码")
@click.option("--format", "fmt", default="xlsx", type=click.Choice(["xlsx", "csv"]), help="导出格式")
def export_freeze(start_date, end_date, status, merchant_code, fmt):
    """导出冻结汇总报告"""
    result = ReportService.export_freeze_summary(
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        status=status,
        merchant_code=merchant_code,
        format=fmt,
    )
    _print_export_result(result)


@export.command("unfreeze")
@click.option("--start-date", help="开始日期 YYYY-MM-DD")
@click.option("--end-date", help="结束日期 YYYY-MM-DD")
@click.option("--format", "fmt", default="xlsx", type=click.Choice(["xlsx", "csv"]), help="导出格式")
def export_unfreeze(start_date, end_date, fmt):
    """导出解冻明细报告"""
    result = ReportService.export_unfreeze_detail(
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        format=fmt,
    )
    _print_export_result(result)


@export.command("balance")
@click.option("--format", "fmt", default="xlsx", type=click.Choice(["xlsx", "csv"]), help="导出格式")
def export_balance(fmt):
    """导出商家余额报告"""
    result = ReportService.export_balance_report(format=fmt)
    _print_export_result(result)


@export.command("appeal")
@click.option("--start-date", help="开始日期 YYYY-MM-DD")
@click.option("--end-date", help="结束日期 YYYY-MM-DD")
@click.option("--status", help="申诉状态")
@click.option("--format", "fmt", default="xlsx", type=click.Choice(["xlsx", "csv"]), help="导出格式")
def export_appeal(start_date, end_date, status, fmt):
    """导出申诉报告"""
    result = ReportService.export_appeal_report(
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        status=status,
        format=fmt,
    )
    _print_export_result(result)


@export.command("audit-logs")
@click.option("--operation-type", help="操作类型")
@click.option("--risk-level", type=click.Choice(["normal", "warning", "high"]), help="风险等级")
@click.option("--start-date", help="开始日期 YYYY-MM-DD")
@click.option("--end-date", help="结束日期 YYYY-MM-DD")
@click.option("--limit", type=int, default=1000, help="导出条数")
@click.option("--format", "fmt", default="xlsx", type=click.Choice(["xlsx", "csv"]), help="导出格式")
def export_audit_logs(operation_type, risk_level, start_date, end_date, limit, fmt):
    """导出审计日志"""
    result = ReportService.export_audit_logs(
        operation_type=operation_type,
        risk_level=risk_level,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
        limit=limit,
        format=fmt,
    )
    _print_export_result(result)


@export.command("full")
@click.option("--start-date", help="开始日期 YYYY-MM-DD")
@click.option("--end-date", help="结束日期 YYYY-MM-DD")
def export_full(start_date, end_date):
    """导出完整报告（包含所有sheet）"""
    result = ReportService.export_full_report(
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )
    _print_export_result(result)


def _print_export_result(result):
    if not result["success"]:
        click.echo(click.style(f"✗ 导出失败: {result.get('error', '未知错误')}", fg="red"))
        return

    click.echo(click.style(f"✓ 导出成功", fg="green"))
    click.echo(f"  文件: {result['filename']}")
    click.echo(f"  路径: {result['filepath']}")
    if "count" in result:
        click.echo(f"  数据量: {result['count']} 条")


@cli.command("list")
@click.argument(
    "entity",
    type=click.Choice(["merchants", "orders", "freezes", "appeals", "violations"]),
)
@click.option("--limit", type=int, default=20, help="显示条数")
@click.option("--merchant-code", help="商家编码过滤")
def list_entities(entity, limit, merchant_code):
    """列出数据：merchants|orders|freezes|appeals|violations"""
    with get_db() as db:
        if entity == "merchants":
            query = db.query(Merchant)
            if merchant_code:
                query = query.filter(Merchant.merchant_code.contains(merchant_code))
            merchants = query.limit(limit).all()
            rows = [[m.merchant_code, m.merchant_name, m.shop_name, m.status] for m in merchants]
            _print_table(["商家编码", "商家名称", "店铺", "状态"], rows)

        elif entity == "orders":
            query = db.query(Order, Merchant).join(Merchant, Order.merchant_id == Merchant.id)
            if merchant_code:
                query = query.filter(Merchant.merchant_code.contains(merchant_code))
            records = query.limit(limit).all()
            rows = [[o.order_no, m.merchant_code, o.order_amount, o.order_status, o.order_time] for o, m in records]
            _print_table(["订单号", "商家", "金额", "状态", "时间"], rows)

        elif entity == "freezes":
            query = db.query(FreezeRecord, Merchant).join(Merchant, FreezeRecord.merchant_id == Merchant.id)
            if merchant_code:
                query = query.filter(Merchant.merchant_code.contains(merchant_code))
            records = query.order_by(FreezeRecord.freeze_time.desc()).limit(limit).all()
            rows = [
                [f.freeze_no, m.merchant_code, f.freeze_amount, f.unfreeze_amount, f.remain_frozen_amount, f.freeze_status]
                for f, m in records
            ]
            _print_table(["冻结单号", "商家", "冻结金额", "已解冻", "剩余", "状态"], rows)


@cli.command("logs")
@click.option("--limit", type=int, default=20, help="显示条数")
@click.option("--risk-level", type=click.Choice(["normal", "warning", "high"]), help="风险等级")
@click.option("--operation-type", help="操作类型")
def show_logs(limit, risk_level, operation_type):
    """查看审计日志"""
    logs = AuditService.get_logs(
        operation_type=operation_type,
        risk_level=risk_level,
        limit=limit,
    )

    rows = []
    for log in logs:
        risk_color = {
            "high": "red",
            "warning": "yellow",
            "normal": "green",
        }.get(log["risk_level"], "white")

        risk_str = click.style(log["risk_level"], fg=risk_color)
        rows.append([
            log["operate_time"].strftime("%Y-%m-%d %H:%M:%S") if log["operate_time"] else "",
            log["operation_type"],
            log["operation_subtype"],
            risk_str,
            log["operator"],
            log["remark"] or (log["risk_desc"][:30] if log["risk_desc"] else ""),
        ])

    click.echo("\n" + click.style("═══════ 审计日志 ═══════", fg="cyan", bold=True))
    if rows:
        _print_table(["时间", "操作类型", "子类型", "风险", "操作人", "备注"], rows, show_index=False)
    else:
        click.echo("  暂无日志")


@cli.command("dirs")
def show_dirs():
    """显示导入导出目录路径"""
    click.echo(f"导入目录: {IMPORT_DIR}")
    click.echo(f"导出目录: {EXPORT_DIR}")


@cli.command("demo")
def run_demo():
    """运行演示流程（自动创建测试数据并执行完整流程）"""
    from .scripts.demo_data import run_demo_flow
    run_demo_flow()


def main():
    cli()


if __name__ == "__main__":
    main()
