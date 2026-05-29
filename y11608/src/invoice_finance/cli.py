"""命令行入口"""
import click
import sys
import os
from datetime import datetime

from .engine import InvoiceFinanceEngine
from .data_loader import DataLoader
from .reporters import ReportGenerator
from .persister import DataPersister
from .models import ProcessingStatus


def _build_engine(data_dir):
    """从数据目录构建引擎"""
    loader = DataLoader()
    data = loader.load_all(data_dir)

    engine = InvoiceFinanceEngine()
    for invoice in data['invoices']:
        engine.add_invoice(invoice)
    for conf in data['confirmations']:
        engine.add_confirmation(conf)
    for pool in data['credit_pools']:
        engine.add_credit_pool(pool)
    for rep in data['repayments']:
        engine.add_repayment(rep)
    for wo in data['write_offs']:
        engine.add_write_off(wo)
    for occ in data['occupations']:
        engine.add_occupation(occ)

    return engine, data


@click.group()
@click.version_option(version="1.0.0", prog_name="invoice-finance")
def cli():
    """供应链金融发票融资额度占用工具"""
    pass


@cli.command()
@click.option('--data-dir', '-d', required=True, type=click.Path(exists=True, file_okay=False),
              help='数据目录，包含invoices.json等文件')
@click.option('--pool-id', '-p', required=True, help='额度池ID')
@click.option('--output', '-o', type=click.Path(), help='输出文件路径（JSON格式）')
@click.option('--format', '-f', 'fmt', type=click.Choice(['terminal', 'json', 'both']), default='terminal',
              help='输出格式')
@click.option('--audit-export', type=click.Path(), help='审计导出CSV文件路径')
@click.option('--show-details', is_flag=True, help='显示详细报告')
@click.option('--filter-status', type=click.Choice(['unprocessed', 'corrected', 'need_manual', 'normal']),
              help='按状态过滤详细报告')
def process(data_dir, pool_id, output, fmt, audit_export, show_details, filter_status):
    """处理发票融资额度占用"""
    click.echo(click.style("正在加载数据...", fg="blue"))

    engine, data = _build_engine(data_dir)

    click.echo(f"  发票: {len(data['invoices'])} 张")
    click.echo(f"  买方确认: {len(data['confirmations'])} 条")
    click.echo(f"  额度池: {len(data['credit_pools'])} 个")
    click.echo(f"  回款流水: {len(data['repayments'])} 条")
    click.echo(f"  核销申请: {len(data['write_offs'])} 条")
    click.echo(f"  占用记录: {len(data['occupations'])} 条")

    click.echo(click.style("\n正在处理...", fg="blue"))
    summary = engine.process_all(pool_id)

    persister = DataPersister()
    persister.persist_occupations(engine, data_dir)

    reporter = ReportGenerator(engine)

    if fmt in ['terminal', 'both']:
        click.echo(reporter.generate_terminal_summary(summary))

        if show_details:
            status_filter = ProcessingStatus(filter_status) if filter_status else None
            click.echo(reporter.generate_detail_report(status_filter))

    if fmt in ['json', 'both'] or output:
        json_output = reporter.generate_json_output(summary)
        if output:
            with open(output, 'w', encoding='utf-8') as f:
                f.write(json_output)
            click.echo(click.style(f"JSON报告已写入: {output}", fg="green"))
        elif fmt == 'json':
            click.echo(json_output)

    if audit_export:
        reporter.generate_audit_export(audit_export)
        click.echo(click.style(f"审计导出已写入: {audit_export}", fg="green"))

    if summary.need_manual_count > 0:
        sys.exit(2)


@cli.command()
@click.option('--data-dir', '-d', required=True, type=click.Path(exists=True, file_okay=False),
              help='数据目录')
@click.option('--invoice-id', '-i', required=True, help='发票ID')
@click.option('--verifier', '-v', required=True, help='验真操作人')
@click.option('--note', '-n', default='', help='验真备注')
def verify(data_dir, invoice_id, verifier, note):
    """验真发票"""
    engine, _ = _build_engine(data_dir)

    success, alert = engine.verify_invoice(invoice_id, verifier, note)
    if success:
        click.echo(click.style(f"发票 {invoice_id} 验真成功", fg="green"))
    else:
        click.echo(click.style(f"发票 {invoice_id} 验真失败", fg="red"))
        sys.exit(1)


@cli.command()
@click.option('--data-dir', '-d', required=True, type=click.Path(exists=True, file_okay=False),
              help='数据目录')
@click.option('--write-off-id', '-w', required=True, help='核销申请ID')
@click.option('--approver', '-a', required=True, help='审批人')
@click.option('--amount', type=float, help='审批金额（不指定则全额审批）')
def approve_write_off(data_dir, write_off_id, approver, amount):
    """审批核销申请"""
    engine, _ = _build_engine(data_dir)

    success, alerts = engine.approve_write_off(write_off_id, approver, amount)
    if success:
        persister = DataPersister()
        persister.persist_write_offs(engine, data_dir)
        persister.persist_occupations(engine, data_dir)

        click.echo(click.style(f"核销申请 {write_off_id} 审批成功", fg="green"))
        click.echo(click.style(f"状态已回写到 {data_dir}", fg="green"))
        for alert in alerts:
            click.echo(click.style(f"  警告: {alert.message}", fg="yellow"))
    else:
        click.echo(click.style(f"核销申请 {write_off_id} 审批失败", fg="red"))
        sys.exit(1)


@cli.command()
@click.option('--data-dir', '-d', required=True, type=click.Path(exists=True, file_okay=False),
              help='数据目录')
@click.option('--write-off-id', '-w', required=True, help='核销申请ID')
@click.option('--operator', '-o', required=True, help='操作人')
@click.option('--reason', '-r', required=True, help='回滚原因')
def rollback_write_off(data_dir, write_off_id, operator, reason):
    """回滚核销"""
    engine, _ = _build_engine(data_dir)

    success = engine.rollback_write_off(write_off_id, operator, reason)
    if success:
        persister = DataPersister()
        persister.persist_write_offs(engine, data_dir)
        persister.persist_occupations(engine, data_dir)

        click.echo(click.style(f"核销申请 {write_off_id} 已回滚", fg="green"))
        click.echo(click.style(f"状态已回写到 {data_dir}", fg="green"))
    else:
        click.echo(click.style(f"核销申请 {write_off_id} 回滚失败", fg="red"))
        sys.exit(1)


@cli.command()
def demo():
    """生成示例数据目录"""
    demo_dir = os.path.join(os.getcwd(), 'demo_data')
    os.makedirs(demo_dir, exist_ok=True)

    from datetime import date, timedelta

    today = date.today()

    invoices = [
        {
            "id": "inv_001",
            "source": "invoice_system",
            "invoice_no": "INV202605001",
            "invoice_code": "001100100111",
            "amount": 100000.00,
            "invoice_date": (today - timedelta(days=30)).isoformat(),
            "buyer_name": "甲公司",
            "seller_name": "乙公司",
            "status": "verified",
            "verified_at": datetime.now().isoformat(),
            "verified_by": "zhang_san",
            "created_by": "system"
        },
        {
            "id": "inv_002",
            "source": "invoice_system",
            "invoice_no": "INV202605002",
            "invoice_code": "001100100111",
            "amount": 250000.00,
            "invoice_date": (today - timedelta(days=25)).isoformat(),
            "buyer_name": "甲公司",
            "seller_name": "乙公司",
            "status": "verified",
            "verified_at": datetime.now().isoformat(),
            "verified_by": "zhang_san",
            "created_by": "system"
        },
        {
            "id": "inv_003",
            "source": "invoice_system",
            "invoice_no": "INV202605001",
            "invoice_code": "001100100111",
            "amount": 100000.00,
            "invoice_date": (today - timedelta(days=30)).isoformat(),
            "buyer_name": "甲公司",
            "seller_name": "乙公司",
            "status": "verified",
            "verified_at": datetime.now().isoformat(),
            "verified_by": "li_si",
            "created_by": "system"
        },
        {
            "id": "inv_004",
            "source": "invoice_system",
            "invoice_no": "INV202605003",
            "invoice_code": "001100100111",
            "amount": 80000.00,
            "invoice_date": (today - timedelta(days=20)).isoformat(),
            "buyer_name": "丙公司",
            "seller_name": "乙公司",
            "status": "pending",
            "created_by": "system"
        },
        {
            "id": "inv_005",
            "source": "invoice_system",
            "invoice_no": "INV202605004",
            "invoice_code": "001100100111",
            "amount": 150000.00,
            "invoice_date": (today - timedelta(days=15)).isoformat(),
            "buyer_name": "丁公司",
            "seller_name": "乙公司",
            "status": "verified",
            "verified_at": datetime.now().isoformat(),
            "verified_by": "zhang_san",
            "created_by": "system",
            "corrections": [
                {
                    "trace_id": "trace_001",
                    "field_name": "amount",
                    "old_value": 160000.00,
                    "new_value": 150000.00,
                    "operator": "wang_wu",
                    "operated_at": datetime.now().isoformat(),
                    "reason": "发票金额录入错误，实际为15万",
                    "source": "manual_correction"
                }
            ]
        }
    ]

    confirmations = [
        {
            "id": "conf_001",
            "source": "buyer_confirm",
            "invoice_id": "inv_001",
            "buyer_name": "甲公司",
            "confirmed_amount": 100000.00,
            "status": "confirmed",
            "confirmed_at": datetime.now().isoformat(),
            "created_by": "buyer_api"
        },
        {
            "id": "conf_002",
            "source": "buyer_confirm",
            "invoice_id": "inv_002",
            "buyer_name": "甲公司",
            "confirmed_amount": 250000.00,
            "status": "revoked",
            "confirmed_at": datetime.fromtimestamp(datetime.now().timestamp() - 86400).isoformat(),
            "revoked_at": datetime.now().isoformat(),
            "revoker": "jia_manager",
            "revocation_reason": "货物存在质量争议",
            "created_by": "buyer_api"
        },
        {
            "id": "conf_003",
            "source": "buyer_confirm",
            "invoice_id": "inv_004",
            "buyer_name": "丙公司",
            "confirmed_amount": 80000.00,
            "status": "confirmed",
            "confirmed_at": datetime.now().isoformat(),
            "created_by": "buyer_api"
        },
        {
            "id": "conf_004",
            "source": "buyer_confirm",
            "invoice_id": "inv_005",
            "buyer_name": "丁公司",
            "confirmed_amount": 150000.00,
            "status": "confirmed",
            "confirmed_at": datetime.now().isoformat(),
            "created_by": "buyer_api"
        }
    ]

    credit_pools = [
        {
            "id": "pool_001",
            "source": "credit_pool",
            "pool_id": "POOL001",
            "pool_name": "2026年度供应链金融额度池",
            "total_credit": 500000.00,
            "used_credit": 0,
            "frozen_credit": 0,
            "effective_date": today.isoformat(),
            "expire_date": (today.replace(year=today.year + 1)).isoformat(),
            "created_by": "credit_admin"
        }
    ]

    repayments = [
        {
            "id": "rep_001",
            "source": "repayment_flow",
            "flow_no": "FLOW202605001",
            "invoice_id": "inv_001",
            "amount": 50000.00,
            "repayment_date": (today - timedelta(days=5)).isoformat(),
            "payer_account": "6222****1234",
            "payer_name": "甲公司",
            "created_by": "bank_api"
        }
    ]

    write_offs = [
        {
            "id": "wo_001",
            "source": "write_off_apply",
            "apply_no": "WO202605001",
            "invoice_id": "inv_001",
            "amount": 30000.00,
            "apply_date": (today - timedelta(days=3)).isoformat(),
            "status": "pending",
            "created_by": "officer_zhang"
        }
    ]

    import json

    with open(os.path.join(demo_dir, 'invoices.json'), 'w', encoding='utf-8') as f:
        json.dump(invoices, f, ensure_ascii=False, indent=2)
    with open(os.path.join(demo_dir, 'confirmations.json'), 'w', encoding='utf-8') as f:
        json.dump(confirmations, f, ensure_ascii=False, indent=2)
    with open(os.path.join(demo_dir, 'credit_pools.json'), 'w', encoding='utf-8') as f:
        json.dump(credit_pools, f, ensure_ascii=False, indent=2)
    with open(os.path.join(demo_dir, 'repayments.json'), 'w', encoding='utf-8') as f:
        json.dump(repayments, f, ensure_ascii=False, indent=2)
    with open(os.path.join(demo_dir, 'write_offs.json'), 'w', encoding='utf-8') as f:
        json.dump(write_offs, f, ensure_ascii=False, indent=2)

    click.echo(click.style(f"示例数据已生成到: {demo_dir}", fg="green"))
    click.echo("\n运行以下命令查看效果:")
    click.echo(click.style(f"  invoice-finance process -d {demo_dir} -p pool_001 --show-details", fg="cyan"))


if __name__ == "__main__":
    cli()
