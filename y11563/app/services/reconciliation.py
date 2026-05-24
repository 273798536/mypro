import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.checkin import CheckinRecord
from app.models.deposit import DepositRecord
from app.models.room_change import RoomChangeRecord
from app.models.reconciliation import ReconciliationResult
from app.services.audit import AuditService


class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)

    def generate_reconciliation_no(self) -> str:
        return f"REC-{uuid.uuid4().hex[:16].upper()}"

    def calculate_expected_room_fee(self, checkin: CheckinRecord) -> Tuple[float, Dict[str, Any]]:
        details = {}
        if not checkin.checkin_date or not checkin.checkout_date:
            return 0, details

        days = (checkin.checkout_date - checkin.checkin_date).days
        if days <= 0:
            days = 1

        base_fee = days * checkin.room_rate
        details["base_days"] = days
        details["base_rate"] = checkin.room_rate
        details["base_fee"] = base_fee

        extended_fee = 0
        if checkin.is_extended and checkin.extended_days > 0:
            extended_fee = checkin.extended_days * checkin.room_rate
            details["extended_days"] = checkin.extended_days
            details["extended_fee"] = extended_fee

        total = base_fee + extended_fee
        details["total_expected"] = total
        return total, details

    def calculate_actual_deposit(self, checkin_no: str) -> Tuple[float, List[Dict[str, Any]]]:
        deposits = (
            self.db.query(DepositRecord)
            .filter(
                DepositRecord.checkin_no == checkin_no,
                DepositRecord.status == "success",
            )
            .all()
        )

        total = 0.0
        details = []
        for dep in deposits:
            amount = dep.amount if dep.transaction_type == "charge" else -dep.amount
            total += amount
            details.append({
                "deposit_no": dep.deposit_no,
                "type": dep.transaction_type,
                "amount": amount,
                "time": dep.transaction_time.isoformat() if dep.transaction_time else None,
            })

        return total, details

    def calculate_room_change_impact(
        self, checkin_no: str
    ) -> Tuple[float, List[Dict[str, Any]]]:
        changes = (
            self.db.query(RoomChangeRecord)
            .filter(
                RoomChangeRecord.checkin_no == checkin_no,
                RoomChangeRecord.status == "completed",
            )
            .order_by(RoomChangeRecord.change_time)
            .all()
        )

        total_diff = 0.0
        details = []
        for change in changes:
            total_diff += change.rate_diff
            details.append({
                "change_no": change.change_no,
                "old_room": change.old_room_no,
                "new_room": change.new_room_no,
                "rate_diff": change.rate_diff,
                "change_time": change.change_time.isoformat() if change.change_time else None,
            })

        return total_diff, details

    def reconcile_checkin(
        self,
        checkin: CheckinRecord,
        batch_no: Optional[str] = None,
        operator: str = "system",
    ) -> ReconciliationResult:
        issues = []

        expected_room_fee, room_fee_details = self.calculate_expected_room_fee(checkin)
        actual_deposit, deposit_details = self.calculate_actual_deposit(checkin.checkin_no)
        room_change_diff, change_details = self.calculate_room_change_impact(checkin.checkin_no)

        expected_amount = expected_room_fee + room_change_diff
        actual_amount = actual_deposit + checkin.paid_amount
        diff_amount = expected_amount - actual_amount

        diff_details = {
            "room_fee_calculation": room_fee_details,
            "deposit_transactions": deposit_details,
            "room_change_impact": change_details,
        }

        is_matched = abs(diff_amount) < 0.01

        if not is_matched:
            if diff_amount > 0:
                issues.append(f"房费缺口: {diff_amount:.2f}元")
            else:
                issues.append(f"押金超额: {abs(diff_amount):.2f}元")

        if checkin.status == "checked_out" and not checkin.actual_checkout:
            issues.append("已退房但无实际退房时间")

        if checkin.is_extended and checkin.extended_days == 0:
            issues.append("标记为延住但延住天数为0")

        result = ReconciliationResult(
            reconciliation_no=self.generate_reconciliation_no(),
            batch_no=batch_no,
            checkin_no=checkin.checkin_no,
            reconciliation_type="room_fee",
            status="completed",
            is_matched=is_matched,
            expected_amount=expected_amount,
            actual_amount=actual_amount,
            diff_amount=diff_amount,
            diff_details=diff_details,
            issues=issues,
            operator=operator,
            reconciliation_time=datetime.utcnow(),
        )

        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)

        return result

    def reconcile_batch(
        self,
        batch_no: Optional[str] = None,
        checkin_nos: Optional[List[str]] = None,
        operator: str = "system",
    ) -> Dict[str, Any]:
        query = self.db.query(CheckinRecord)

        if batch_no:
            query = query.filter(CheckinRecord.batch_no == batch_no)
        elif checkin_nos:
            query = query.filter(CheckinRecord.checkin_no.in_(checkin_nos))

        checkins = query.all()
        results = []
        matched = 0
        unmatched = 0

        for checkin in checkins:
            result = self.reconcile_checkin(checkin, batch_no=batch_no, operator=operator)
            results.append(result)
            if result.is_matched:
                matched += 1
            else:
                unmatched += 1

        return {
            "total": len(results),
            "matched": matched,
            "unmatched": unmatched,
            "results": results,
        }

    def manual_adjust(
        self,
        reconciliation_no: str,
        is_matched: bool,
        adjust_reason: str,
        adjusted_by: str,
        remarks: Optional[str] = None,
    ) -> Optional[ReconciliationResult]:
        result = (
            self.db.query(ReconciliationResult)
            .filter(ReconciliationResult.reconciliation_no == reconciliation_no)
            .first()
        )

        if not result:
            return None

        before_data = {
            "is_matched": result.is_matched,
            "is_manually_adjusted": result.is_manually_adjusted,
        }

        result.is_matched = is_matched
        result.is_manually_adjusted = True
        result.adjust_reason = adjust_reason
        result.adjusted_by = adjusted_by
        result.adjustment_time = datetime.utcnow()
        result.remarks = remarks

        after_data = {
            "is_matched": result.is_matched,
            "is_manually_adjusted": result.is_manually_adjusted,
            "adjust_reason": adjust_reason,
        }

        self.db.commit()
        self.db.refresh(result)

        self.audit_service.log_operation(
            record_type="reconciliation",
            record_id=reconciliation_no,
            operation="manual_adjust",
            operator=adjusted_by,
            before_data=before_data,
            after_data=after_data,
            change_reason=adjust_reason,
            batch_no=result.batch_no,
        )

        return result

    def get_unmatched_records(
        self, batch_no: Optional[str] = None, include_manual: bool = False
    ) -> List[ReconciliationResult]:
        query = self.db.query(ReconciliationResult).filter(
            ReconciliationResult.is_matched == False
        )

        if batch_no:
            query = query.filter(ReconciliationResult.batch_no == batch_no)

        if not include_manual:
            query = query.filter(ReconciliationResult.is_manually_adjusted == False)

        return query.order_by(ReconciliationResult.reconciliation_time.desc()).all()
