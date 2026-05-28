import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime
from app.database import SessionLocal, create_tables
from app.schemas.trade import (
    TradeCreate, TradeAgreementCreate, SeatInfoCreate, FundRecordCreate
)
from app.crud.trade import crud_trade, crud_agreement, crud_seat, crud_restriction, crud_fund
from app.services.verification_engine import verification_engine


def seed():
    create_tables()
    db = SessionLocal()

    try:
        existing = crud_trade.get_by_trade_code(db, "DZ20260528001")
        if existing:
            print("种子数据已存在，跳过初始化")
            return

        print("=== 初始化基础材料 ===")

        agreement_smooth = crud_agreement.create(db, obj_in=TradeAgreementCreate(
            agreement_no="XY2026052801",
            agreement_date=date(2026, 5, 28),
            trade_date=date(2026, 5, 28),
            stock_code="600036",
            stock_name="招商银行",
            quantity=500000,
            price=35.20,
            amount=17600000.0,
            buyer_account="B88123456",
            buyer_seat_code="S6001",
            buyer_contact="张明",
            seller_account="S88765432",
            seller_seat_code="S7001",
            seller_contact="李红",
            settlement_method="净额结算",
            payment_deadline=date(2026, 5, 30)
        ))

        agreement_mismatch = crud_agreement.create(db, obj_in=TradeAgreementCreate(
            agreement_no="XY2026052802",
            agreement_date=date(2026, 5, 28),
            trade_date=date(2026, 5, 28),
            stock_code="000001",
            stock_name="平安银行",
            quantity=300000,
            price=12.50,
            amount=3750000.0,
            buyer_account="B99111111",
            buyer_seat_code="S6001",
            buyer_contact="王刚",
            seller_account="S88555555",
            seller_seat_code="S7002",
            seller_contact="赵丽",
            settlement_method="净额结算",
            payment_deadline=date(2026, 5, 30)
        ))

        seat_s6001 = crud_seat.create(db, obj_in=SeatInfoCreate(
            seat_code="S6001",
            seat_name="中信证券总部席位",
            branch_name="中信证券股份有限公司",
            account_number="B88123456",
            account_name="中信证券-客户信用交易担保证券账户",
            is_active=True,
            valid_from=date(2024, 1, 1),
        ))

        seat_s7001 = crud_seat.create(db, obj_in=SeatInfoCreate(
            seat_code="S7001",
            seat_name="国泰君安总部席位",
            branch_name="国泰君安证券股份有限公司",
            account_number="S88765432",
            account_name="国泰君安-自营账户",
            is_active=True,
            valid_from=date(2024, 1, 1),
        ))

        seat_s7002 = crud_seat.create(db, obj_in=SeatInfoCreate(
            seat_code="S7002",
            seat_name="华泰证券总部席位",
            branch_name="华泰证券股份有限公司",
            account_number="S88444444",
            account_name="华泰证券-自营账户",
            is_active=True,
            valid_from=date(2024, 1, 1),
        ))

        print("=== 录入交易台账 ===")

        trade_smooth = crud_trade.create(db, obj_in=TradeCreate(
            trade_date=date(2026, 5, 28),
            trade_code="DZ20260528001",
            stock_code="600036",
            stock_name="招商银行",
            quantity=500000,
            price=35.20,
            amount=17600000.0,
            buyer_account="B88123456",
            buyer_seat_code="S6001",
            buyer_branch="中信证券",
            seller_account="S88765432",
            seller_seat_code="S7001",
            seller_branch="国泰君安",
            agreement_id=agreement_smooth.id,
            seat_info_id=seat_s6001.id,
            restriction_rule_id=None,
            remarks="顺利样例: 协议/席位/资金全匹配"
        ))

        trade_mismatch = crud_trade.create(db, obj_in=TradeCreate(
            trade_date=date(2026, 5, 28),
            trade_code="DZ20260528002",
            stock_code="000001",
            stock_name="平安银行",
            quantity=300000,
            price=12.50,
            amount=3750000.0,
            buyer_account="B99111111",
            buyer_seat_code="S6001",
            buyer_branch="中信证券",
            seller_account="S88555555",
            seller_seat_code="S7002",
            seller_branch="华泰证券",
            agreement_id=agreement_mismatch.id,
            seat_info_id=seat_s7002.id,
            restriction_rule_id=None,
            remarks="席位错配样例: 卖方席位S7002绑定账户S88444444, 但交易卖方账户为S88555555"
        ))

        print("=== 录入资金到账 ===")

        crud_fund.create(db, obj_in=FundRecordCreate(
            trade_id=trade_smooth.id,
            record_no="FUND20260528001",
            received_amount=17600000.0,
            received_date=date(2026, 5, 28),
            received_time=datetime(2026, 5, 28, 14, 30, 0),
            payer_account="B88123456",
            payer_bank="中信银行",
            settlement_status="已到账"
        ))

        crud_fund.create(db, obj_in=FundRecordCreate(
            trade_id=trade_mismatch.id,
            record_no="FUND20260528002",
            received_amount=3750000.0,
            received_date=date(2026, 5, 28),
            received_time=datetime(2026, 5, 28, 14, 35, 0),
            payer_account="B99111111",
            payer_bank="中信银行",
            settlement_status="已到账"
        ))

        print("=== 执行核对 ===")

        print("\n--- 样例1: 顺利交易 DZ20260528001 ---")
        result1 = verification_engine.verify_trade(db, trade_id=trade_smooth.id, operator="seed_script")
        print(f"  最终状态: {result1['final_status']}")
        print(f"  建议动作: {result1.get('suggested_next_action', '无')}")
        for vr in result1['verification_records']:
            print(f"  [{vr['verification_type']}] {vr['verification_result']}: {vr['conclusion']}")

        print("\n--- 样例2: 席位错配交易 DZ20260528002 ---")
        result2 = verification_engine.verify_trade(db, trade_id=trade_mismatch.id, operator="seed_script")
        print(f"  最终状态: {result2['final_status']}")
        print(f"  建议动作: {result2.get('suggested_next_action', '无')}")
        for vr in result2['verification_records']:
            print(f"  [{vr['verification_type']}] {vr['verification_result']}: {vr['conclusion']}")
            if vr.get('suggested_action'):
                print(f"    -> 后续动作: {vr['suggested_action']}")

        print("\n=== 种子数据初始化完成 ===")
        print(f"  顺利样例: trade_id={trade_smooth.id}, trade_code=DZ20260528001")
        print(f"  错配样例: trade_id={trade_mismatch.id}, trade_code=DZ20260528002")

    except Exception as e:
        print(f"种子数据初始化失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
