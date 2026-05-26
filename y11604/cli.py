#!/usr/bin/env python3
import os
import sys
import json
from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

from auto_finance.database import init_db, SessionLocal
from auto_finance.models import Contract, Vehicle, AuditLog
from auto_finance.services import (
    create_contract_version, record_down_payment, create_balance_plan,
    create_gps_order, create_delivery, create_refund,
    lock_delivery, get_contract_by_no, get_contract_versions,
    cancel_gps_orders_for_contract, update_balance_settlement,
    update_gps_order_status, fix_cancelled_contract_gps_orders
)
from auto_finance.validation import (
    validate_contract, validate_all_contracts,
    group_issues_by_severity, summarize_issues
)
from auto_finance.importer import (
    import_contracts_from_excel, import_contracts_from_json,
    batch_process_actions, parse_date, parse_float
)
from auto_finance.exporter import (
    export_contracts_to_excel, export_issues_to_excel,
    export_audit_log_to_excel, export_full_report,
    get_statistics, get_contract_summary
)
from auto_finance.audit import get_entity_history

console = Console()


def get_db_session():
    return SessionLocal()


@click.group()
@click.version_option(version="1.0.0", prog_name="二手车金融尾款")
def cli():
    """二手车金融尾款管理系统 - 专注合同、交车、退款、工单联动"""
    init_db()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("contract_no")
@click.argument("vin")
@click.argument("customer_name")
@click.argument("total_amount", type=float)
@click.argument("down_payment", type=float)
@click.argument("balance_amount", type=float)
@click.option("--status", default="active", help="合同状态")
@click.option("--signed-at", help="签约日期 (YYYY-MM-DD)")
@click.option("--remark", help="备注")
def contract(contract_no, vin, customer_name, total_amount, down_payment,
             balance_amount, status, source, operator, signed_at, remark):
    """创建或更新合同版本"""
    db = get_db_session()
    try:
        contract_data = {
            "contract_no": contract_no,
            "vin": vin,
            "customer_name": customer_name,
            "total_amount": total_amount,
            "down_payment_amount": down_payment,
            "balance_amount": balance_amount,
            "status": status,
            "signed_at": parse_date(signed_at) if signed_at else None,
            "remark": remark,
        }
        contract = create_contract_version(db, contract_data, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 合同已保存:[/green] {contract_no} (版本 {contract.version})")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("contract_no")
@click.argument("amount", type=float)
@click.option("--transaction-no", help="交易流水号")
@click.option("--paid-at", help="到账日期 (YYYY-MM-DD)")
@click.option("--payer", help="付款人")
@click.option("--method", help="付款方式")
def down_payment(contract_no, amount, source, operator, transaction_no, paid_at, payer, method):
    """登记首付款"""
    db = get_db_session()
    try:
        payment_data = {
            "contract_no": contract_no,
            "transaction_no": transaction_no,
            "amount": amount,
            "paid_at": parse_date(paid_at) if paid_at else None,
            "payer": payer,
            "payment_method": method,
        }
        payment = record_down_payment(db, payment_data, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 首付款已登记:[/green] {amount:.2f} 元")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("contract_no")
@click.argument("total_balance", type=float)
@click.option("--plan-no", help="尾款计划编号")
@click.option("--installments", type=int, default=1, help="分期期数")
@click.option("--first-payment", help="首次还款日 (YYYY-MM-DD)")
@click.option("--monthly", type=float, help="月供金额")
def balance_plan(contract_no, total_balance, source, operator, plan_no,
                 installments, first_payment, monthly):
    """创建尾款计划"""
    db = get_db_session()
    try:
        plan_data = {
            "contract_no": contract_no,
            "plan_no": plan_no,
            "total_balance": total_balance,
            "installment_count": installments,
            "first_payment_date": parse_date(first_payment) if first_payment else None,
            "monthly_amount": monthly,
        }
        plan = create_balance_plan(db, plan_data, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 尾款计划已创建:[/green] ID={plan.id}")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("plan_id", type=int)
@click.argument("amount", type=float)
@click.argument("settled_at")
def settle_balance(plan_id, amount, settled_at, source, operator):
    """确认尾款到账"""
    db = get_db_session()
    try:
        plan = update_balance_settlement(
            db, plan_id, parse_date(settled_at), amount,
            source=source, operator=operator
        )
        db.commit()
        console.print(f"[green]✓ 尾款已到账:[/green] {amount:.2f} 元")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("order_no")
@click.argument("vin")
@click.option("--contract-no", help="关联合同编号")
@click.option("--type", "order_type", default="install", help="工单类型")
@click.option("--status", default="pending", help="状态")
@click.option("--scheduled-at", help="预约时间")
@click.option("--completed-at", help="完成时间")
@click.option("--technician", help="技师")
@click.option("--device-no", help="设备号")
def gps_order(order_no, vin, source, operator, contract_no, order_type, status,
              scheduled_at, completed_at, technician, device_no):
    """创建GPS工单"""
    db = get_db_session()
    try:
        gps_data = {
            "order_no": order_no,
            "vin": vin,
            "contract_no": contract_no,
            "type": order_type,
            "status": status,
            "scheduled_at": parse_date(scheduled_at) if scheduled_at else None,
            "completed_at": parse_date(completed_at) if completed_at else None,
            "technician": technician,
            "device_no": device_no,
        }
        order = create_gps_order(db, gps_data, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ GPS工单已创建:[/green] {order_no}")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("order_id", type=int)
@click.argument("status")
@click.option("--completed-at", help="完成时间")
@click.option("--device-no", help="设备号")
def update_gps(order_id, status, source, operator, completed_at, device_no):
    """更新GPS工单状态"""
    db = get_db_session()
    try:
        order = update_gps_order_status(
            db, order_id, status,
            parse_date(completed_at) if completed_at else None,
            device_no, source=source, operator=operator
        )
        db.commit()
        console.print(f"[green]✓ GPS工单状态已更新:[/green] {status}")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("delivery_no")
@click.argument("contract_no")
@click.option("--vin", help="车辆VIN")
@click.option("--delivered-at", help="交车日期")
@click.option("--down-ok", is_flag=True, help="首付已核实")
@click.option("--gps-ok", is_flag=True, help="GPS已安装")
@click.option("--balance-ok", is_flag=True, help="尾款已核实")
@click.option("--delivered-by", help="交车人")
@click.option("--received-by", help="接车人")
def delivery(delivery_no, contract_no, source, operator, vin, delivered_at,
             down_ok, gps_ok, balance_ok, delivered_by, received_by):
    """登记交车"""
    db = get_db_session()
    try:
        delivery_data = {
            "contract_no": contract_no,
            "delivery_no": delivery_no,
            "vin": vin,
            "delivered_at": parse_date(delivered_at) if delivered_at else None,
            "down_payment_verified": down_ok,
            "gps_installed": gps_ok,
            "balance_verified": balance_ok,
            "delivered_by": delivered_by,
            "received_by": received_by,
        }
        delivery_obj = create_delivery(db, delivery_data, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 交车已登记:[/green] {delivery_no}")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("delivery_id", type=int)
def lock_delivery_cmd(delivery_id, source, operator):
    """锁定交车记录（锁定后不可修改）"""
    db = get_db_session()
    try:
        delivery_obj = lock_delivery(db, delivery_id, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 交车已锁定:[/green] ID={delivery_id}")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.option("--source", default="cli", help="数据来源")
@click.option("--operator", help="操作人")
@click.argument("refund_no")
@click.argument("contract_no")
@click.argument("amount", type=float)
@click.argument("refund_type")
@click.option("--reason", help="退款原因")
@click.option("--status", default="pending", help="状态")
@click.option("--refunded-at", help="退款日期")
@click.option("--recipient", help="收款人")
def refund(refund_no, contract_no, amount, refund_type, source, operator,
           reason, status, refunded_at, recipient):
    """登记退款（自动取消合同和GPS工单）"""
    db = get_db_session()
    try:
        refund_data = {
            "contract_no": contract_no,
            "refund_no": refund_no,
            "amount": amount,
            "refund_type": refund_type,
            "reason": reason,
            "status": status,
            "refunded_at": parse_date(refunded_at) if refunded_at else None,
            "recipient": recipient,
        }
        refund_obj = create_refund(db, refund_data, source=source, operator=operator)
        cancel_gps_orders_for_contract(db, refund_obj.contract_id, source=source, operator=operator)
        db.commit()
        console.print(f"[green]✓ 退款已登记，合同已取消，GPS工单已联动取消:[/green] {amount:.2f} 元")
    except Exception as e:
        db.rollback()
        console.print(f"[red]✗ 错误:[/red] {str(e)}")
        sys.exit(1)
    finally:
        db.close()


@cli.command()
@click.argument("contract_no", required=False)
@click.option("--all", "show_all", is_flag=True, help="校验所有合同")
@click.option("--export", "export_path", help="导出异常到Excel")
def check(contract_no, show_all, export_path):
    """数据校验，检测异常"""
    db = get_db_session()
    try:
        if contract_no:
            contract = get_contract_by_no(db, contract_no)
            if not contract:
                console.print(f"[red]✗ 合同不存在:[/red] {contract_no}")
                sys.exit(1)
            issues = validate_contract(db, contract)
        elif show_all:
            issues = validate_all_contracts(db)
        else:
            console.print("[yellow]请指定合同编号或使用 --all 校验全部[/yellow]")
            sys.exit(1)

        if not issues:
            console.print("[green]✓ 未发现异常[/green]")
            return

        grouped = group_issues_by_severity(issues)
        summary = summarize_issues(issues)

        console.print(Panel.fit(
            f"共发现 [bold]{summary['total']}[/bold] 个异常: "
            f"[red]{summary['high_count']}[/red] 高优, "
            f"[yellow]{summary['medium_count']}[/yellow] 中优, "
            f"[blue]{summary['low_count']}[/blue] 低优",
            title="校验结果"
        ))

        for severity in ["high", "medium", "low"]:
            severity_issues = grouped[severity]
            if not severity_issues:
                continue

            color = {"high": "red", "medium": "yellow", "low": "blue"}[severity]
            table = Table(title=f"[{color}]{severity.upper()} 优先级异常[/]", show_lines=True)
            table.add_column("合同")
            table.add_column("类型")
            table.add_column("说明")

            for issue in severity_issues[:20]:
                table.add_row(
                    issue.contract_no or "-",
                    issue.issue_type,
                    issue.message
                )

            console.print(table)
            if len(severity_issues) > 20:
                console.print(f"[dim]... 还有 {len(severity_issues) - 20} 条未显示[/]")

        if export_path:
            path = export_issues_to_excel(db, export_path, contract_no)
            console.print(f"[green]✓ 异常清单已导出:[/green] {path}")

    finally:
        db.close()


@cli.command()
@click.argument("contract_no")
@click.option("--versions", is_flag=True, help="显示所有历史版本")
@click.option("--history", is_flag=True, help="显示审计历史")
def show(contract_no, versions, history):
    """查看合同详情"""
    db = get_db_session()
    try:
        contract = get_contract_by_no(db, contract_no)
        if not contract:
            console.print(f"[red]✗ 合同不存在:[/red] {contract_no}")
            sys.exit(1)

        summary = get_contract_summary(db, contract)

        table = Table(title=f"合同详情 - {contract_no}")
        table.add_column("项目")
        table.add_column("值")

        for key, value in summary.items():
            table.add_row(str(key), str(value))

        console.print(table)

        if versions:
            all_versions = get_contract_versions(db, contract_no)
            vtable = Table(title="历史版本")
            vtable.add_column("版本")
            vtable.add_column("VIN")
            vtable.add_column("金额")
            vtable.add_column("状态")
            vtable.add_column("创建时间")
            for v in all_versions:
                vtable.add_row(
                    str(v.version),
                    v.vin,
                    f"{v.total_amount:.2f}",
                    v.status,
                    v.created_at.strftime("%Y-%m-%d %H:%M")
                )
            console.print(vtable)

        if history:
            from auto_finance.audit import get_contract_full_history
            from auto_finance.models import GpsWorkOrder

            all_versions = get_contract_versions(db, contract_no)
            contract_ids = [v.id for v in all_versions]

            gps_orders = db.query(GpsWorkOrder).filter(
                GpsWorkOrder.vin.in_([v.vin for v in all_versions])
            ).all()
            gps_ids = [o.id for o in gps_orders]

            logs = get_contract_full_history(db, contract_ids, gps_ids)

            if logs:
                htable = Table(title="变更历史（含所有版本和GPS工单联动）")
                htable.add_column("时间")
                htable.add_column("实体")
                htable.add_column("操作")
                htable.add_column("字段")
                htable.add_column("原值")
                htable.add_column("新值")
                htable.add_column("来源")
                htable.add_column("备注")
                for log in logs:
                    htable.add_row(
                        log.created_at.strftime("%Y-%m-%d %H:%M"),
                        log.entity_type,
                        log.action,
                        log.field_name or "-",
                        log.old_value or "-",
                        log.new_value or "-",
                        log.source or "-",
                        (log.remark or "")[:30]
                    )
                console.print(htable)
            else:
                console.print("[yellow]暂无变更历史记录[/yellow]")

    finally:
        db.close()


@cli.command()
@click.argument("file_path")
@click.option("--format", "fmt", default="excel", type=click.Choice(["excel", "json"]))
@click.option("--source", default="import", help="数据来源")
@click.option("--operator", help="操作人")
def import_data(file_path, fmt, source, operator):
    """批量导入数据（Excel或JSON）"""
    db = get_db_session()
    try:
        if not os.path.exists(file_path):
            console.print(f"[red]✗ 文件不存在:[/red] {file_path}")
            sys.exit(1)

        with console.status(f"正在导入 {fmt.upper()} 数据..."):
            if fmt == "excel":
                result = import_contracts_from_excel(db, file_path, source=source, operator=operator)
            else:
                result = import_contracts_from_json(db, file_path, source=source, operator=operator)

        console.print(Panel.fit(
            f"成功: [green]{result.success_count}[/green] | "
            f"失败: [red]{result.failure_count}[/red]",
            title="导入完成"
        ))

        if result.errors:
            console.print(f"\n[yellow]失败详情（前10条）:[/yellow]")
            for err in result.errors[:10]:
                console.print(f"  第{err['row']}行: {err['error']}")

    finally:
        db.close()


@cli.command()
@click.argument("output_path")
@click.option("--type", "report_type", default="all",
              type=click.Choice(["all", "contracts", "issues", "audit"]))
@click.option("--status", help="按合同状态过滤")
def export(output_path, report_type, status):
    """导出报表"""
    db = get_db_session()
    try:
        with console.status("正在生成报表..."):
            if report_type == "all":
                paths = export_full_report(db, output_path)
                console.print("[green]✓ 完整报表已导出:[/green]")
                for name, path in paths.items():
                    console.print(f"  - {name}: {path}")
            elif report_type == "contracts":
                path = export_contracts_to_excel(db, output_path, status_filter=status)
                console.print(f"[green]✓ 合同台账已导出:[/green] {path}")
            elif report_type == "issues":
                path = export_issues_to_excel(db, output_path)
                console.print(f"[green]✓ 异常清单已导出:[/green] {path}")
            elif report_type == "audit":
                path = export_audit_log_to_excel(db, output_path)
                console.print(f"[green]✓ 操作日志已导出:[/green] {path}")
    finally:
        db.close()


@cli.command()
def stats():
    """查看统计概览"""
    db = get_db_session()
    try:
        stats_data = get_statistics(db)

        table = Table(title="统计概览")
        table.add_column("项目")
        table.add_column("数值")

        for key in ["合同总数", "合同总金额", "应收首付总额", "应收尾款总额",
                    "已收首付总额", "已收尾款总额", "待收首付", "待收尾款",
                    "已交车数量", "已锁定交车数量", "已退款合同数", "退款总金额"]:
            value = stats_data.get(key, 0)
            if isinstance(value, float):
                table.add_row(key, f"{value:,.2f}")
            else:
                table.add_row(key, str(value))

        console.print(table)

        if stats_data["合同状态分布"]:
            status_table = Table(title="合同状态分布")
            status_table.add_column("状态")
            status_table.add_column("数量")
            for status, count in stats_data["合同状态分布"].items():
                status_table.add_row(status, str(count))
            console.print(status_table)

        issue_stats = stats_data.get("异常统计", {})
        if issue_stats.get("total", 0) > 0:
            issue_table = Table(title="异常统计")
            issue_table.add_column("类型")
            issue_table.add_column("数量")
            issue_table.add_row("高优先级", f"[red]{issue_stats.get('high_count', 0)}[/red]")
            issue_table.add_row("中优先级", f"[yellow]{issue_stats.get('medium_count', 0)}[/yellow]")
            issue_table.add_row("低优先级", f"[blue]{issue_stats.get('low_count', 0)}[/blue]")
            console.print(issue_table)

    finally:
        db.close()


@cli.command()
@click.argument("file_path")
@click.option("--source", default="batch", help="数据来源")
@click.option("--operator", help="操作人")
def batch(file_path, source, operator):
    """批量执行操作（JSON格式的操作列表）"""
    db = get_db_session()
    try:
        if not os.path.exists(file_path):
            console.print(f"[red]✗ 文件不存在:[/red] {file_path}")
            sys.exit(1)

        with open(file_path, "r", encoding="utf-8") as f:
            actions = json.load(f)

        with console.status(f"正在执行 {len(actions)} 个操作..."):
            result = batch_process_actions(db, actions, source=source, operator=operator)

        console.print(Panel.fit(
            f"成功: [green]{result.success_count}[/green] | "
            f"失败: [red]{result.failure_count}[/red]",
            title="批量执行完成"
        ))

        if result.errors:
            console.print(f"\n[yellow]失败详情:[/yellow]")
            for err in result.errors:
                console.print(f"  第{err['row']}个操作: {err['error']}")

    finally:
        db.close()


@cli.command()
@click.option("--source", default="fix_script", help="数据来源")
@click.option("--operator", help="操作人")
@click.option("--dry-run", is_flag=True, help="仅预览，不实际修改")
def fix_gps(source, operator, dry_run):
    """修复历史数据：已取消合同的GPS工单未取消问题"""
    db = get_db_session()
    try:
        from auto_finance.validation import validate_all_contracts
        issues_before = validate_all_contracts(db)
        gps_issues = [i for i in issues_before if i.issue_type == "gps_not_cancelled"]

        if not gps_issues:
            console.print("[green]✓ 没有需要修复的GPS工单问题[/green]")
            return

        console.print(f"发现 {len(gps_issues)} 个合同存在GPS工单未取消问题:")
        for issue in gps_issues:
            console.print(f"  - {issue.contract_no}: {issue.message}")

        if dry_run:
            console.print("[yellow]预览模式，未执行修复[/yellow]")
            return

        fixed = fix_cancelled_contract_gps_orders(db, source=source, operator=operator)
        console.print(f"[green]✓ 已修复 {len(fixed)} 个GPS工单[/green]")

        issues_after = validate_all_contracts(db)
        remaining = [i for i in issues_after if i.issue_type == "gps_not_cancelled"]
        if remaining:
            console.print(f"[yellow]仍有 {len(remaining)} 个问题未修复[/yellow]")
        else:
            console.print("[green]✓ 所有GPS工单问题已修复[/green]")

    finally:
        db.close()


if __name__ == "__main__":
    cli()
