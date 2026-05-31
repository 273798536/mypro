import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date
from decimal import Decimal
from app.models.database import SessionLocal, RoyaltyDetail, RoyaltyStatus, Currency, Platform, Track, Producer
from app.schemas.royalty import RoyaltyDetailCreate, RoyaltyStatusUpdate, RoyaltyTrialCalculateRequest, RoyaltyAccrualCreate
from app.services.royalty_service import RoyaltyService

def demo_flow():
    print("=" * 60)
    print("跨境音乐版税预提系统 - 完整流程演示")
    print("=" * 60)

    db = SessionLocal()
    try:
        print("\n1. 创建版税明细")
        print("-" * 40)

        track = db.query(Track).first()
        producer = db.query(Producer).first()

        if not track or not producer:
            print("请先运行 init_data.py 初始化基础数据")
            return

        detail_data = RoyaltyDetailCreate(
            track_id=track.id,
            producer_id=producer.id,
            platform=Platform.SPOTIFY,
            report_period="2024Q2",
            streams=125000,
            original_currency=Currency.USD,
            original_amount=Decimal("1250.50"),
            tax_rate=0.07
        )

        detail = RoyaltyService.create_royalty_detail(db, detail_data)
        print(f"创建成功! ID: {detail.id}")
        print(f"  原始金额: {detail.original_currency.value} {detail.original_amount}")
        print(f"  汇率: {detail.exchange_rate}")
        print(f"  人民币金额: {detail.cny_amount}")
        print(f"  预提税(7%): {detail.withholding_tax}")
        print(f"  净额: {detail.net_amount}")
        print(f"  状态: {detail.status.value}")

        print("\n2. 验证版税明细（状态变更）")
        print("-" * 40)
        update_data = RoyaltyStatusUpdate(
            status=RoyaltyStatus.VERIFIED,
            change_reason="曲目核对完成，金额确认无误",
            operator="版权财务-小李"
        )
        detail = RoyaltyService.update_status(db, detail.id, update_data)
        print(f"状态已更新为: {detail.status.value}")

        print("\n3. 查看变更历史")
        print("-" * 40)
        history = RoyaltyService.get_history(db, detail.id)
        for h in history:
            print(f"  [{h.created_at.strftime('%Y-%m-%d %H:%M')}] {h.event_type.value}: "
                  f"{h.old_status.value} -> {h.new_status.value}")
            print(f"    原因: {h.change_reason}")
            print(f"    操作人: {h.operator}")

        print("\n4. 预提试算")
        print("-" * 40)
        trial_req = RoyaltyTrialCalculateRequest(
            report_period="2024Q2",
            platform=Platform.SPOTIFY
        )
        result = RoyaltyService.trial_calculate(db, trial_req)
        print(f"试算记录数: {result['total_records']}")
        print(f"原始金额合计: {result['total_original_amount']}")
        print(f"人民币合计: {result['total_cny_amount']}")
        print(f"预提税合计: {result['total_withholding_tax']}")
        print(f"净额合计: {result['total_net_amount']}")
        print(f"\n币种换算口径说明:")
        print(result['conversion_note'])

        print("\n5. 版税归集")
        print("-" * 40)
        accrual_req = RoyaltyAccrualCreate(
            report_period="2024Q2",
            platform=Platform.SPOTIFY,
            detail_ids=[detail.id],
            created_by="版权财务-小李"
        )
        accrual = RoyaltyService.create_accrual(db, accrual_req)
        print(f"归集成功! 归集单号: {accrual.accrual_reference}")
        print(f"  原始金额合计: {accrual.total_original_amount}")
        print(f"  人民币合计: {accrual.total_cny_amount}")
        print(f"  预提税合计: {accrual.total_withholding_tax}")
        print(f"  净额合计: {accrual.total_net_amount}")

        print("\n6. 验证归集后明细状态")
        print("-" * 40)
        detail_after = RoyaltyService.get_royalty_detail(db, detail.id)
        print(f"明细ID {detail.id} 状态: {detail_after.status.value}")

        print("\n" + "=" * 60)
        print("演示完成!")
        print("=" * 60)

    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    demo_flow()
