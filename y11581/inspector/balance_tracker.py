from typing import Dict, List, Tuple, Any
from datetime import datetime
from sqlalchemy.orm import Session
from .database import MemberBalanceHistory, BalanceGap, RechargeRecord, RefundRecord
from .dirty_checker import parse_datetime


class TransactionType:
    RECHARGE = "recharge"
    REFUND = "refund"
    CONSUME = "consume"
    REVOKE = "revoke"
    CROSS_STORE_CONSUME = "cross_store_consume"
    MANUAL_ADJUST = "manual_adjust"


def get_member_balance_history(db: Session, member_id: str) -> List[MemberBalanceHistory]:
    return (
        db.query(MemberBalanceHistory)
        .filter(MemberBalanceHistory.member_id == member_id)
        .order_by(MemberBalanceHistory.transaction_time)
        .all()
    )


def calculate_expected_balance(records: List[MemberBalanceHistory]) -> Tuple[float, List[Dict]]:
    if not records:
        return 0.0, []

    gaps = []
    current_balance = 0.0
    prev_record = None

    for record in records:
        if prev_record is not None:
            expected_balance = prev_record.balance_after
            actual_balance_before = record.balance_before

            if abs(expected_balance - actual_balance_before) > 0.01:
                gaps.append({
                    "member_id": record.member_id,
                    "gap_type": "balance_break",
                    "expected_balance": expected_balance,
                    "actual_balance": actual_balance_before,
                    "difference": actual_balance_before - expected_balance,
                    "before_transaction_id": prev_record.transaction_id,
                    "after_transaction_id": record.transaction_id,
                    "notes": f"在交易[{prev_record.transaction_id}]和[{record.transaction_id}]之间余额断裂",
                })

        prev_record = record

    if records:
        current_balance = records[-1].balance_after

    return current_balance, gaps


def detect_balance_gaps(db: Session, member_id: str = None) -> List[BalanceGap]:
    query = db.query(MemberBalanceHistory.member_id).distinct()
    if member_id:
        query = query.filter(MemberBalanceHistory.member_id == member_id)

    member_ids = [row[0] for row in query.all()]
    all_gaps = []

    for mid in member_ids:
        records = get_member_balance_history(db, mid)
        _, gaps = calculate_expected_balance(records)

        for gap in gaps:
            existing = (
                db.query(BalanceGap)
                .filter(
                    BalanceGap.member_id == gap["member_id"],
                    BalanceGap.before_transaction_id == gap["before_transaction_id"],
                    BalanceGap.after_transaction_id == gap["after_transaction_id"],
                )
                .first()
            )

            if not existing:
                gap_obj = BalanceGap(
                    member_id=gap["member_id"],
                    gap_type=gap["gap_type"],
                    expected_balance=gap["expected_balance"],
                    actual_balance=gap["actual_balance"],
                    difference=gap["difference"],
                    before_transaction_id=gap["before_transaction_id"],
                    after_transaction_id=gap["after_transaction_id"],
                    notes=gap["notes"],
                )
                db.add(gap_obj)
                all_gaps.append(gap_obj)

    db.commit()
    return all_gaps


def check_cross_store_consistency(db: Session) -> List[Dict]:
    cross_store_records = (
        db.query(MemberBalanceHistory)
        .filter(MemberBalanceHistory.is_cross_store == True)
        .order_by(MemberBalanceHistory.member_id, MemberBalanceHistory.transaction_time)
        .all()
    )

    issues = []
    for record in cross_store_records:
        if abs(record.balance_after - (record.balance_before + record.amount)) > 0.01:
            issues.append({
                "member_id": record.member_id,
                "transaction_id": record.transaction_id,
                "store_id": record.store_id,
                "issue": "跨店消费余额计算错误",
                "expected": record.balance_before + record.amount,
                "actual": record.balance_after,
            })

    return issues


def check_revoke_consistency(db: Session) -> List[Dict]:
    revoked_records = (
        db.query(MemberBalanceHistory)
        .filter(MemberBalanceHistory.is_revoked == True)
        .order_by(MemberBalanceHistory.member_id, MemberBalanceHistory.transaction_time)
        .all()
    )

    issues = []
    seen_refs = set()

    for record in revoked_records:
        ref_id = record.reference_id
        if ref_id:
            if ref_id in seen_refs:
                issues.append({
                    "member_id": record.member_id,
                    "transaction_id": record.transaction_id,
                    "reference_id": ref_id,
                    "issue": "重复撤销交易",
                })
            seen_refs.add(ref_id)

            original = (
                db.query(MemberBalanceHistory)
                .filter(MemberBalanceHistory.transaction_id == ref_id)
                .first()
            )

            if original:
                if record.amount != -original.amount:
                    issues.append({
                        "member_id": record.member_id,
                        "transaction_id": record.transaction_id,
                        "reference_id": ref_id,
                        "issue": "撤销金额与原交易不匹配",
                        "original_amount": original.amount,
                        "revoke_amount": record.amount,
                    })

    return issues


def build_balance_history_from_records(db: Session, batch_id: int = None) -> List[MemberBalanceHistory]:
    recharges = db.query(RechargeRecord)
    refunds = db.query(RefundRecord)

    if batch_id:
        recharges = recharges.filter(RechargeRecord.batch_id == batch_id)
        refunds = refunds.filter(RefundRecord.batch_id == batch_id)

    recharges = recharges.filter(RechargeRecord.is_dirty == False).all()
    refunds = refunds.filter(RefundRecord.is_dirty == False).all()

    transactions = []

    for r in recharges:
        tx_time = parse_datetime(r.transaction_time) or datetime.utcnow()
        transactions.append({
            "member_id": r.member_id,
            "member_name": r.member_name,
            "store_id": r.store_id,
            "store_name": r.store_name,
            "transaction_type": TransactionType.RECHARGE,
            "transaction_id": f"R{r.id}",
            "amount": r.recharge_amount + (r.bonus_amount or 0),
            "transaction_time": tx_time,
            "is_cross_store": False,
            "is_revoked": False,
            "source_batch_id": r.batch_id,
        })

    for r in refunds:
        tx_time = parse_datetime(r.transaction_time) or datetime.utcnow()
        transactions.append({
            "member_id": r.member_id,
            "member_name": r.member_name,
            "store_id": r.store_id,
            "store_name": r.store_name,
            "transaction_type": TransactionType.REFUND,
            "transaction_id": f"F{r.id}",
            "amount": -r.refund_amount,
            "transaction_time": tx_time,
            "is_cross_store": False,
            "is_revoked": False,
            "source_batch_id": r.batch_id,
        })

    transactions.sort(key=lambda x: x["transaction_time"])

    member_balances = {}
    history_records = []

    for tx in transactions:
        mid = tx["member_id"]
        balance_before = member_balances.get(mid, 0.0)
        amount = tx["amount"]
        balance_after = balance_before + amount

        history = MemberBalanceHistory(
            member_id=mid,
            member_name=tx["member_name"],
            store_id=tx["store_id"],
            store_name=tx["store_name"],
            transaction_type=tx["transaction_type"],
            transaction_id=tx["transaction_id"],
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            transaction_time=tx["transaction_time"],
            is_cross_store=tx["is_cross_store"],
            is_revoked=tx["is_revoked"],
            source_batch_id=tx["source_batch_id"],
        )
        history_records.append(history)
        member_balances[mid] = balance_after

    return history_records
