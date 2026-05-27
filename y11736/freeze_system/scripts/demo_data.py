import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from tabulate import tabulate
import click

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from freeze_system.database import init_db, get_db
from freeze_system.models import Merchant, Order, ViolationRecord, AppealRecord
from freeze_system.services.freeze_service import FreezeService
from freeze_system.services.risk_service import RiskDetection
from freeze_system.config import IMPORT_DIR


def create_demo_data():
    init_db()
    click.echo(click.style("正在创建演示数据...", fg="cyan"))

    with get_db() as db:
        merchants = [
            {"merchant_code": "M001", "merchant_name": "深圳市科技有限公司", "shop_name": "科技旗舰店", "category": "3C数码"},
            {"merchant_code": "M002", "merchant_name": "杭州市服饰有限公司", "shop_name": "时尚服饰店", "category": "服装鞋帽"},
            {"merchant_code": "M003", "merchant_name": "广州市食品有限公司", "shop_name": "美食专营店", "category": "食品生鲜"},
            {"merchant_code": "M004", "merchant_name": "北京市家居有限公司", "shop_name": "家居生活馆", "category": "家居用品"},
            {"merchant_code": "M005", "merchant_name": "成都市美妆有限公司", "shop_name": "美妆护肤店", "category": "美妆个护"},
        ]

        for m_data in merchants:
            existing = db.query(Merchant).filter(Merchant.merchant_code == m_data["merchant_code"]).first()
            if not existing:
                merchant = Merchant(**m_data)
                db.add(merchant)

        db.flush()

        merchant_map = {m.merchant_code: m.id for m in db.query(Merchant).all()}

        base_time = datetime.now() - timedelta(days=30)
        orders = []
        for i in range(1, 21):
            merchant_code = f"M{(i % 5) + 1:03d}"
            order_time = base_time + timedelta(days=i, hours=i % 24)
            orders.append({
                "order_no": f"ORD{base_time.strftime('%Y%m%d')}{i:04d}",
                "merchant_id": merchant_map[merchant_code],
                "order_amount": 100 + i * 50.5,
                "goods_amount": 90 + i * 48,
                "shipping_fee": 10,
                "order_status": "completed",
                "payment_method": "alipay",
                "buyer_account": f"buyer{i:03d}@example.com",
                "order_time": order_time,
                "receipt_time": order_time + timedelta(days=3),
                "settlement_amount": 100 + i * 50.5,
                "settlement_time": order_time + timedelta(days=10),
                "data_source": "demo",
            })

        for o_data in orders:
            existing = db.query(Order).filter(Order.order_no == o_data["order_no"]).first()
            if not existing:
                order = Order(**o_data)
                db.add(order)

        db.flush()

        order_map = {o.order_no: o.id for o in db.query(Order).all()}

        violations = [
            {
                "violation_no": "V2024001",
                "merchant_id": merchant_map["M001"],
                "order_id": order_map.get(f"ORD{base_time.strftime('%Y%m%d')}0001"),
                "violation_type": "虚假发货",
                "violation_desc": "订单实际未发货但点击发货",
                "violation_time": base_time + timedelta(days=5),
                "report_source": "平台检测",
                "violation_status": "pending",
                "penalty_amount": 500,
            },
            {
                "violation_no": "V2024002",
                "merchant_id": merchant_map["M002"],
                "order_id": order_map.get(f"ORD{base_time.strftime('%Y%m%d')}0006"),
                "violation_type": "售假",
                "violation_desc": "销售假冒品牌商品",
                "violation_time": base_time + timedelta(days=8),
                "report_source": "用户投诉",
                "violation_status": "confirmed",
                "penalty_amount": 2000,
            },
            {
                "violation_no": "V2024003",
                "merchant_id": merchant_map["M003"],
                "order_id": order_map.get(f"ORD{base_time.strftime('%Y%m%d')}0011"),
                "violation_type": "质量问题",
                "violation_desc": "食品过期仍在销售",
                "violation_time": base_time + timedelta(days=12),
                "report_source": "质检部门",
                "violation_status": "pending",
                "penalty_amount": 1000,
            },
            {
                "violation_no": "V2024004",
                "merchant_id": merchant_map["M004"],
                "order_id": order_map.get(f"ORD{base_time.strftime('%Y%m%d')}0016"),
                "violation_type": "描述不符",
                "violation_desc": "商品描述与实际严重不符",
                "violation_time": base_time + timedelta(days=15),
                "report_source": "用户投诉",
                "violation_status": "pending",
                "penalty_amount": 300,
            },
        ]

        for v_data in violations:
            existing = db.query(ViolationRecord).filter(ViolationRecord.violation_no == v_data["violation_no"]).first()
            if not existing:
                violation = ViolationRecord(**v_data)
                db.add(violation)

        db.flush()

        violation_map = {v.violation_no: v.id for v in db.query(ViolationRecord).all()}

        appeals = [
            {
                "appeal_no": "AP2024001",
                "violation_id": violation_map["V2024001"],
                "appeal_reason": "已发货，物流单号XXX，可能是系统延迟更新",
                "appeal_evidence": "物流截图、发货凭证",
                "appeal_time": base_time + timedelta(days=6),
                "appellant": "M001",
                "appeal_status": "pending",
            },
            {
                "appeal_no": "AP2024002",
                "violation_id": violation_map["V2024003"],
                "appeal_reason": "商品日期标注正确，买家误解",
                "appeal_evidence": "生产日期照片、批次证明",
                "appeal_time": base_time + timedelta(days=13),
                "appellant": "M003",
                "appeal_status": "processing",
            },
        ]

        for a_data in appeals:
            existing = db.query(AppealRecord).filter(AppealRecord.appeal_no == a_data["appeal_no"]).first()
            if not existing:
                appeal = AppealRecord(**a_data)
                db.add(appeal)

    click.echo(click.style("✓ 基础数据创建完成", fg="green"))
    click.echo(f"  商家: {len(merchants)} 家")
    click.echo(f"  订单: {len(orders)} 笔")
    click.echo(f"  违规: {len(violations)} 条")
    click.echo(f"  申诉: {len(appeals)} 条")


def run_demo_flow():
    create_demo_data()

    click.echo("\n" + click.style("═══════ 演示流程开始 ═══════", fg="cyan", bold=True))

    click.echo("\n" + click.style("步骤1: 创建资金冻结", fg="yellow"))
    freeze1, result1 = FreezeService.create_freeze(
        merchant_code="M001",
        order_no=f"ORD{(datetime.now()-timedelta(days=30)).strftime('%Y%m%d')}0001",
        freeze_amount=500,
        freeze_reason="违规冻结-虚假发货",
        violation_no="V2024001",
        operator="demo_admin",
        data_source="demo",
    )
    click.echo(f"  结果: {'成功' if result1['success'] else '失败'} - {result1.get('freeze_no', result1.get('error', ''))}")

    freeze2, result2 = FreezeService.create_freeze(
        merchant_code="M002",
        order_no=f"ORD{(datetime.now()-timedelta(days=30)).strftime('%Y%m%d')}0006",
        freeze_amount=2000,
        freeze_reason="违规冻结-售假",
        violation_no="V2024002",
        operator="demo_admin",
        data_source="demo",
    )
    click.echo(f"  结果: {'成功' if result2['success'] else '失败'} - {result2.get('freeze_no', result2.get('error', ''))}")

    freeze3, result3 = FreezeService.create_freeze(
        merchant_code="M003",
        order_no=f"ORD{(datetime.now()-timedelta(days=30)).strftime('%Y%m%d')}0011",
        freeze_amount=1000,
        freeze_reason="违规冻结-质量问题",
        violation_no="V2024003",
        operator="demo_admin",
        data_source="demo",
    )
    click.echo(f"  结果: {'成功' if result3['success'] else '失败'} - {result3.get('freeze_no', result3.get('error', ''))}")

    click.echo("\n" + click.style("步骤2: 审核申诉", fg="yellow"))
    if result1.get("freeze_no"):
        appeal_result = FreezeService.audit_appeal(
            appeal_no="AP2024001",
            audit_result="partial_approved",
            audit_opinion="申诉部分成立，建议解冻部分金额",
            unfreeze_suggestion=300,
            auditor="demo_auditor",
        )
        click.echo(f"  申诉AP2024001审核: {'通过' if appeal_result['success'] else '失败'}")

    if result3.get("freeze_no"):
        appeal_result2 = FreezeService.audit_appeal(
            appeal_no="AP2024002",
            audit_result="approved",
            audit_opinion="申诉成立，建议全额解冻",
            unfreeze_suggestion=1000,
            auditor="demo_auditor",
        )
        click.echo(f"  申诉AP2024002审核: {'通过' if appeal_result2['success'] else '失败'}")

    click.echo("\n" + click.style("步骤3: 执行部分解冻", fg="yellow"))
    if result1.get("freeze_no"):
        unfreeze_result = FreezeService.process_unfreeze(
            freeze_no=result1["freeze_no"],
            unfreeze_amount=300,
            unfreeze_reason="申诉通过部分解冻",
            unfreeze_type="partial",
            appeal_no="AP2024001",
            operator="demo_operator",
            data_source="demo",
        )
        click.echo(
            f"  冻结{result1['freeze_no']}解冻300元: {'成功' if unfreeze_result['success'] else '失败'}"
            + (f" - 剩余{unfreeze_result['remain_frozen']:.2f}元" if unfreeze_result['success'] else f" - {unfreeze_result.get('error', '')}")
        )

    click.echo("\n" + click.style("步骤4: 执行全额解冻", fg="yellow"))
    if result3.get("freeze_no"):
        unfreeze_result2 = FreezeService.process_unfreeze(
            freeze_no=result3["freeze_no"],
            unfreeze_amount=1000,
            unfreeze_reason="申诉通过全额解冻",
            unfreeze_type="full",
            appeal_no="AP2024002",
            operator="demo_operator",
            data_source="demo",
        )
        click.echo(
            f"  冻结{result3['freeze_no']}解冻1000元: {'成功' if unfreeze_result2['success'] else '失败'}"
            + (f" - 状态{unfreeze_result2['new_status']}" if unfreeze_result2['success'] else f" - {unfreeze_result2.get('error', '')}")
        )

    click.echo("\n" + click.style("步骤5: 风险检测", fg="yellow"))
    risks = RiskDetection.run_all_checks(operator="demo")
    click.echo(f"  检测到风险: {risks['total_risks']} 个")
    click.echo(f"  高风险: {risks['high_risk_count']} 个")
    click.echo(f"  警告: {risks['warning_count']} 个")

    click.echo("\n" + click.style("═══════ 演示完成 ═══════", fg="green", bold=True))
    click.echo("\n" + click.style("后续可执行命令:", fg="cyan"))
    click.echo("  查看冻结列表: python -m freeze_system.cli list freezes")
    click.echo("  查看冻结详情: python -m freeze_system.cli freeze status --freeze-no <冻结单号>")
    click.echo("  查看审计日志: python -m freeze_system.cli logs")
    click.echo("  导出完整报告: python -m freeze_system.cli export full")

    return True


if __name__ == "__main__":
    run_demo_flow()
