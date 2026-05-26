import click
from pathlib import Path
from .data_loader import DataLoader
from .calculator import CommissionCalculator
from .processor import OrderProcessor
from .audit import AuditTrail
from .reporter import Reporter


@click.group()
@click.version_option()
def cli():
    """佣金阶梯复核CLI - 销售提成计算与复核工具"""
    pass


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
@click.option("--orders", help="订单文件路径")
@click.option("--region-rules", help="区域规则文件路径")
@click.option("--tier-rates", help="阶梯费率文件路径")
@click.option("--auto-fix/--no-auto-fix", default=False, help="是否自动修正可识别的错误")
@click.option("--quarter", help="目标季度 (如 2024Q1)")
def calculate(data_dir, orders, region_rules, tier_rates, auto_fix, quarter):
    """计算佣金并生成复核报告"""
    click.echo("加载数据中...")

    loader = DataLoader(data_dir=data_dir)
    sales_orders, region_rules_dict, tier_rates_list = loader.load_all(
        orders_file=orders,
        region_file=region_rules,
        rates_file=tier_rates,
    )

    if not sales_orders:
        click.echo("错误: 未找到订单数据")
        return

    click.echo(f"已加载 {len(sales_orders)} 条订单")
    click.echo(f"已加载 {len(region_rules_dict)} 条区域规则")
    click.echo(f"已加载 {len(tier_rates_list)} 条阶梯费率")

    if auto_fix:
        click.echo("\n执行自动修正...")
        audit = AuditTrail(audit_file=f"{data_dir}/audit_log.csv")
        product_lines = loader.load_product_lines()
        sales_orders = audit.apply_auto_corrections(
            sales_orders, region_rules_dict, product_lines
        )
        correction_summary = audit.get_correction_summary()
        if correction_summary:
            click.echo(f"自动修正完成: {correction_summary}")
        else:
            click.echo("没有需要自动修正的项")

    click.echo("\n计算佣金中...")
    calculator = CommissionCalculator(
        tier_rates=tier_rates_list,
        region_rules=region_rules_dict,
        target_quarter=quarter,
    )
    processor = OrderProcessor(calculator)
    results = processor.process_batch(sales_orders)

    summary = processor.summarize(results)
    reporter = Reporter(output_dir="./output")

    click.echo("\n" + reporter.generate_console_report(summary, results, sales_orders))

    report_path = reporter.generate_detailed_report(results, sales_orders)
    click.echo(f"\n详细报告已导出: {report_path}")

    summary_path = reporter.generate_summary_csv(summary)
    click.echo(f"汇总CSV已导出: {summary_path}")

    if summary.pending_review_count > 0:
        pending_path = reporter.generate_pending_review_report(results, sales_orders)
        click.echo(f"待确认清单已导出: {pending_path}")

    if auto_fix:
        corrections_path = f"./output/corrections.csv"
        audit.export_corrections(corrections_path)
        click.echo(f"修正记录已导出: {corrections_path}")


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
@click.option("--orders", help="订单文件路径")
@click.option("--region-rules", help="区域规则文件路径")
@click.option("--tier-rates", help="阶梯费率文件路径")
def validate(data_dir, orders, region_rules, tier_rates):
    """仅校验数据，不计算佣金"""
    click.echo("数据校验中...")

    loader = DataLoader(data_dir=data_dir)
    sales_orders, region_rules_dict, tier_rates_list = loader.load_all(
        orders_file=orders,
        region_file=region_rules,
        rates_file=tier_rates,
    )

    if not sales_orders:
        click.echo("错误: 未找到订单数据")
        return

    calculator = CommissionCalculator(
        tier_rates=tier_rates_list,
        region_rules=region_rules_dict,
    )
    processor = OrderProcessor(calculator)
    results = processor.process_batch(sales_orders)

    issues = []
    for r in results:
        if r.status != "normal":
            issues.append((r.order_id, r.status.value, "; ".join(r.messages)))

    if issues:
        click.echo(f"\n发现 {len(issues)} 个问题:")
        for order_id, status, msg in issues[:20]:
            click.echo(f"  [{status}] {order_id}: {msg}")
        if len(issues) > 20:
            click.echo(f"  ... 还有 {len(issues) - 20} 个问题")
    else:
        click.echo("所有数据校验通过！")


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
def summary(data_dir):
    """查看数据目录摘要"""
    data_path = Path(data_dir)
    if not data_path.exists():
        click.echo(f"数据目录不存在: {data_dir}")
        return

    click.echo(f"数据目录: {data_dir}")
    for file in sorted(data_path.iterdir()):
        if file.is_file():
            size = file.stat().st_size / 1024
            click.echo(f"  {file.name} ({size:.1f} KB)")


@cli.command()
@click.argument("order-id")
@click.argument("field")
@click.argument("new-value")
@click.option("--reason", required=True, help="修正原因")
@click.option("--corrected-by", default="manual", help="修正人")
@click.option("--data-dir", default="./data", help="数据目录")
def correct(order_id, field, new_value, reason, corrected_by, data_dir):
    """手动修正订单数据"""
    from .models import CorrectionType

    audit = AuditTrail(audit_file=f"{data_dir}/audit_log.csv")
    audit.load_existing()

    field_map = {
        "region": CorrectionType.REGION_FIX,
        "product_line": CorrectionType.REGION_FIX,
        "rate_version": CorrectionType.RATE_VERSION_FIX,
        "payment_status": CorrectionType.PAYMENT_STATUS_FIX,
        "payment_amount": CorrectionType.PAYMENT_STATUS_FIX,
        "amount": CorrectionType.AMOUNT_FIX,
    }

    corr_type = field_map.get(field, CorrectionType.MANUAL_OVERRIDE)

    loader = DataLoader(data_dir=data_dir)
    orders = loader.load_orders()
    old_order = next((o for o in orders if o.order_id == order_id), None)
    old_value = getattr(old_order, field, "未知") if old_order else "未知"

    audit.add_correction(
        order_id=order_id,
        correction_type=corr_type,
        field_name=field,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        corrected_by=corrected_by,
    )

    click.echo(f"已记录修正: {order_id}.{field} = {new_value}")
    click.echo(f"原因: {reason}")


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
@click.option("--output", default="./output/audit_log.csv", help="输出文件")
def export_audit(data_dir, output):
    """导出审计日志"""
    audit = AuditTrail(audit_file=f"{data_dir}/audit_log.csv")
    audit.load_existing()
    audit.export_corrections(output)
    click.echo(f"审计日志已导出到: {output}")


@cli.command()
@click.option("--data-dir", default="./data", help="数据目录")
def init(data_dir):
    """初始化数据目录结构和示例文件"""
    from .sample_data import create_sample_data

    create_sample_data(data_dir)
    click.echo(f"示例数据已创建在: {data_dir}/")
    click.echo("\n接下来你可以:")
    click.echo("  1. 查看数据: commission summary")
    click.echo("  2. 校验数据: commission validate")
    click.echo("  3. 计算佣金: commission calculate")
    click.echo("  4. 自动修正: commission calculate --auto-fix")


if __name__ == "__main__":
    cli()
