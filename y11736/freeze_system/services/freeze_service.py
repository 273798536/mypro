from datetime import datetime
from typing import Optional, Dict, Tuple, List
from sqlalchemy import and_
from ..models import (
    FreezeRecord,
    UnfreezeRecord,
    AppealRecord,
    ViolationRecord,
    MerchantBalance,
    Order,
    Merchant,
)
from ..database import get_db
from ..config import FREEZE_STATUS_FLOW, APPEAL_STATUS_FLOW
from .audit_service import AuditService
from .risk_service import RiskDetection


class FreezeService:
    @staticmethod
    def _can_transition(current_status: str, target_status: str, flow: Dict) -> bool:
        return target_status in flow.get(current_status, [])

    @staticmethod
    def _update_merchant_balance(db, merchant_id: int, operator: str = "system"):
        total_frozen = (
            db.query(FreezeRecord)
            .filter(
                FreezeRecord.merchant_id == merchant_id,
                FreezeRecord.freeze_status != "unfrozen",
            )
            .all()
        )
        total_frozen_amount = sum(fr.remain_frozen_amount or fr.freeze_amount for fr in total_frozen)

        total_unfrozen = (
            db.query(UnfreezeRecord)
            .join(FreezeRecord, UnfreezeRecord.freeze_id == FreezeRecord.id)
            .filter(FreezeRecord.merchant_id == merchant_id)
            .all()
        )
        total_unfrozen_amount = sum(uf.unfreeze_amount for uf in total_unfrozen)

        balance = db.query(MerchantBalance).filter(MerchantBalance.merchant_id == merchant_id).first()
        before_value = None
        if balance:
            before_value = {
                "total_frozen": balance.total_frozen,
                "total_unfrozen": balance.total_unfrozen,
                "available_balance": balance.available_balance,
            }
            balance.total_frozen = total_frozen_amount
            balance.total_unfrozen = total_unfrozen_amount
            balance.last_audit_time = datetime.now()
            balance.last_auditor = operator
        else:
            balance = MerchantBalance(
                merchant_id=merchant_id,
                total_frozen=total_frozen_amount,
                total_unfrozen=total_unfrozen_amount,
                last_audit_time=datetime.now(),
                last_auditor=operator,
            )
            db.add(balance)

        after_value = {
            "total_frozen": total_frozen_amount,
            "total_unfrozen": total_unfrozen_amount,
            "available_balance": balance.available_balance,
        }

        AuditService.log(
            operation_type="balance_update",
            target_type="merchant_balance",
            target_id=merchant_id,
            before_value=before_value,
            after_value=after_value,
            operator=operator,
            db=db,
        )

    @staticmethod
    def create_freeze(
        merchant_code: str,
        order_no: str,
        freeze_amount: float,
        freeze_reason: str,
        freeze_type: str = "violation",
        violation_no: Optional[str] = None,
        operator: str = "system",
        data_source: str = "manual",
    ) -> Tuple[Optional[FreezeRecord], Dict]:
        with get_db() as db:
            merchant = db.query(Merchant).filter(Merchant.merchant_code == merchant_code).first()
            if not merchant:
                return None, {"success": False, "error": f"商家{merchant_code}不存在"}

            order = db.query(Order).filter(Order.order_no == order_no).first()
            if not order:
                return None, {"success": False, "error": f"订单{order_no}不存在"}

            violation_id = None
            if violation_no:
                violation = (
                    db.query(ViolationRecord)
                    .filter(ViolationRecord.violation_no == violation_no)
                    .first()
                )
                if violation:
                    violation_id = violation.id

            existing = (
                db.query(FreezeRecord)
                .filter(
                    and_(
                        FreezeRecord.merchant_id == merchant.id,
                        FreezeRecord.order_id == order.id,
                        FreezeRecord.freeze_status != "unfrozen",
                    )
                )
                .first()
            )
            if existing:
                risk_msg = f"订单{order_no}已有冻结记录[{existing.freeze_no}]，重复冻结"
                AuditService.log(
                    operation_type="freeze_create",
                    operation_subtype="duplicate_freeze_warning",
                    target_type="freeze",
                    target_id=existing.id,
                    before_value={"existing_freeze_no": existing.freeze_no},
                    after_value={"new_freeze_amount": freeze_amount},
                    operator=operator,
                    data_source=data_source,
                    risk_level="warning",
                    risk_desc=risk_msg,
                    db=db,
                )

            freeze_no = f"FZ{datetime.now().strftime('%Y%m%d%H%M%S')}{merchant.id}"
            freeze = FreezeRecord(
                freeze_no=freeze_no,
                merchant_id=merchant.id,
                order_id=order.id,
                violation_id=violation_id,
                freeze_amount=freeze_amount,
                freeze_reason=freeze_reason,
                freeze_type=freeze_type,
                freeze_status="frozen",
                remain_frozen_amount=freeze_amount,
                operator=operator,
                data_source=data_source,
            )
            db.add(freeze)
            db.flush()

            FreezeService._update_merchant_balance(db, merchant.id, operator)

            AuditService.log(
                operation_type="freeze_create",
                target_type="freeze",
                target_id=freeze.id,
                after_value={
                    "freeze_no": freeze_no,
                    "merchant_code": merchant_code,
                    "order_no": order_no,
                    "freeze_amount": freeze_amount,
                },
                operator=operator,
                data_source=data_source,
                db=db,
            )

            return freeze, {"success": True, "freeze_no": freeze_no}

    @staticmethod
    def create_appeal(
        violation_no: str,
        appeal_reason: str,
        appeal_evidence: str = "",
        appellant: str = "merchant",
        data_source: str = "manual",
    ) -> Tuple[Optional[AppealRecord], Dict]:
        with get_db() as db:
            violation = (
                db.query(ViolationRecord)
                .filter(ViolationRecord.violation_no == violation_no)
                .first()
            )
            if not violation:
                return None, {"success": False, "error": f"违规记录{violation_no}不存在"}

            related_freeze = (
                db.query(FreezeRecord).filter(FreezeRecord.violation_id == violation.id).first()
            )
            if related_freeze:
                if not FreezeService._can_transition(
                    related_freeze.freeze_status, "appealing", FREEZE_STATUS_FLOW
                ):
                    return None, {
                        "success": False,
                        "error": f"冻结状态[{related_freeze.freeze_status}]不允许申诉",
                    }

            appeal_no = f"AP{datetime.now().strftime('%Y%m%d%H%M%S')}{violation.id}"
            appeal = AppealRecord(
                appeal_no=appeal_no,
                violation_id=violation.id,
                appeal_reason=appeal_reason,
                appeal_evidence=appeal_evidence,
                appeal_time=datetime.now(),
                appellant=appellant,
                appeal_status="pending",
                data_source=data_source,
            )
            db.add(appeal)

            if related_freeze:
                before_status = related_freeze.freeze_status
                related_freeze.freeze_status = "appealing"
                AuditService.log(
                    operation_type="freeze_status_change",
                    target_type="freeze",
                    target_id=related_freeze.id,
                    before_value={"status": before_status},
                    after_value={"status": "appealing"},
                    operator=appellant,
                    data_source=data_source,
                    remark=f"申诉[{appeal_no}]触发状态变更",
                    db=db,
                )

            AuditService.log(
                operation_type="appeal_create",
                target_type="appeal",
                target_id=appeal.id,
                after_value={
                    "appeal_no": appeal_no,
                    "violation_no": violation_no,
                    "appeal_reason": appeal_reason[:100],
                },
                operator=appellant,
                data_source=data_source,
                db=db,
            )

            return appeal, {"success": True, "appeal_no": appeal_no}

    @staticmethod
    def audit_appeal(
        appeal_no: str,
        audit_result: str,
        audit_opinion: str = "",
        unfreeze_suggestion: float = 0,
        auditor: str = "system",
    ) -> Dict:
        with get_db() as db:
            appeal = db.query(AppealRecord).filter(AppealRecord.appeal_no == appeal_no).first()
            if not appeal:
                return {"success": False, "error": f"申诉记录{appeal_no}不存在"}

            if not FreezeService._can_transition(appeal.appeal_status, audit_result, APPEAL_STATUS_FLOW):
                return {
                    "success": False,
                    "error": f"申诉状态[{appeal.appeal_status}]无法转换为[{audit_result}]",
                }

            before_value = {
                "status": appeal.appeal_status,
                "unfreeze_suggestion": appeal.unfreeze_suggestion,
            }

            appeal.appeal_status = audit_result
            appeal.audit_opinion = audit_opinion
            appeal.auditor = auditor
            appeal.audit_time = datetime.now()
            appeal.appeal_result = audit_result
            appeal.unfreeze_suggestion = unfreeze_suggestion

            violation = (
                db.query(ViolationRecord).filter(ViolationRecord.id == appeal.violation_id).first()
            )
            if violation:
                violation.violation_status = (
                    "appeal_approved" if audit_result == "approved" else "confirmed"
                )

            related_freeze = (
                db.query(FreezeRecord).filter(FreezeRecord.violation_id == appeal.violation_id).first()
            )
            if related_freeze:
                freeze_target_status = "appeal_approved" if audit_result == "approved" else "frozen"
                if audit_result == "partial_approved":
                    freeze_target_status = "appeal_approved"

                if FreezeService._can_transition(
                    related_freeze.freeze_status, freeze_target_status, FREEZE_STATUS_FLOW
                ):
                    related_freeze.freeze_status = freeze_target_status

            after_value = {
                "status": audit_result,
                "unfreeze_suggestion": unfreeze_suggestion,
                "audit_opinion": audit_opinion[:100],
            }

            AuditService.log(
                operation_type="appeal_audit",
                target_type="appeal",
                target_id=appeal.id,
                before_value=before_value,
                after_value=after_value,
                operator=auditor,
                remark=f"申诉[{appeal_no}]审核结果：{audit_result}",
                db=db,
            )

            return {"success": True}

    @staticmethod
    def process_unfreeze(
        freeze_no: str,
        unfreeze_amount: float,
        unfreeze_reason: str,
        unfreeze_type: str = "partial",
        operator: str = "system",
        appeal_no: Optional[str] = None,
        data_source: str = "manual",
    ) -> Dict:
        with get_db() as db:
            freeze = db.query(FreezeRecord).filter(FreezeRecord.freeze_no == freeze_no).first()
            if not freeze:
                return {"success": False, "error": f"冻结记录{freeze_no}不存在"}

            if freeze.freeze_status == "unfrozen":
                return {"success": False, "error": f"冻结记录{freeze_no}已全部解冻"}

            remain_amount = freeze.remain_frozen_amount or freeze.freeze_amount

            if unfreeze_amount > remain_amount:
                risk_msg = f"解冻金额{unfreeze_amount}超过剩余冻结金额{remain_amount}"
                AuditService.log(
                    operation_type="unfreeze_process",
                    operation_subtype="over_unfreeze_warning",
                    target_type="freeze",
                    target_id=freeze.id,
                    before_value={"remain_amount": remain_amount},
                    after_value={"request_amount": unfreeze_amount},
                    operator=operator,
                    data_source=data_source,
                    risk_level="high",
                    risk_desc=risk_msg,
                    db=db,
                )
                return {"success": False, "error": risk_msg}

            if unfreeze_amount <= 0:
                return {"success": False, "error": "解冻金额必须大于0"}

            appeal_id = None
            if appeal_no:
                appeal = db.query(AppealRecord).filter(AppealRecord.appeal_no == appeal_no).first()
                if appeal:
                    appeal_id = appeal.id

            recent_unfreeze = (
                db.query(UnfreezeRecord)
                .filter(
                    UnfreezeRecord.freeze_id == freeze.id,
                    UnfreezeRecord.operate_time
                    >= datetime.now().replace(hour=0, minute=0, second=0),
                )
                .first()
            )
            if recent_unfreeze:
                risk_msg = f"今日已对该冻结记录执行了解冻操作[{recent_unfreeze.unfreeze_no}]，请注意重复解冻风险"
                AuditService.log(
                    operation_type="unfreeze_process",
                    operation_subtype="duplicate_unfreeze_warning",
                    target_type="freeze",
                    target_id=freeze.id,
                    before_value={"last_unfreeze": recent_unfreeze.unfreeze_no},
                    after_value={"current_amount": unfreeze_amount},
                    operator=operator,
                    data_source=data_source,
                    risk_level="warning",
                    risk_desc=risk_msg,
                    db=db,
                )

            unfreeze_no = f"UF{datetime.now().strftime('%Y%m%d%H%M%S')}{freeze.id}"
            unfreeze_record = UnfreezeRecord(
                unfreeze_no=unfreeze_no,
                freeze_id=freeze.id,
                appeal_id=appeal_id,
                unfreeze_amount=unfreeze_amount,
                unfreeze_reason=unfreeze_reason,
                unfreeze_type=unfreeze_type,
                operator=operator,
                data_source=data_source,
            )
            db.add(unfreeze_record)

            before_status = freeze.freeze_status
            before_unfrozen = freeze.unfreeze_amount
            before_remain = freeze.remain_frozen_amount

            freeze.unfreeze_amount += unfreeze_amount
            freeze.remain_frozen_amount = remain_amount - unfreeze_amount
            freeze.last_unfreeze_time = datetime.now()

            if freeze.remain_frozen_amount <= 0.01:
                freeze.freeze_status = "unfrozen"
                freeze.remain_frozen_amount = 0
            else:
                if unfreeze_type == "partial":
                    freeze.freeze_status = "partially_unfrozen"
                elif unfreeze_type == "full":
                    freeze.freeze_status = "unfrozen"
                    freeze.remain_frozen_amount = 0

            FreezeService._update_merchant_balance(db, freeze.merchant_id, operator)

            after_value = {
                "unfreeze_no": unfreeze_no,
                "unfreeze_amount": unfreeze_amount,
                "total_unfrozen": freeze.unfreeze_amount,
                "remain_frozen": freeze.remain_frozen_amount,
                "new_status": freeze.freeze_status,
            }

            AuditService.log(
                operation_type="unfreeze_process",
                target_type="unfreeze",
                target_id=unfreeze_record.id,
                before_value={
                    "freeze_no": freeze_no,
                    "before_status": before_status,
                    "before_unfrozen": before_unfrozen,
                    "before_remain": before_remain,
                },
                after_value=after_value,
                operator=operator,
                data_source=data_source,
                db=db,
            )

            return {
                "success": True,
                "unfreeze_no": unfreeze_no,
                "remain_frozen": freeze.remain_frozen_amount,
                "new_status": freeze.freeze_status,
            }

    @staticmethod
    def get_freeze_status(freeze_no: str) -> Dict:
        with get_db() as db:
            freeze = db.query(FreezeRecord).filter(FreezeRecord.freeze_no == freeze_no).first()
            if not freeze:
                return {"success": False, "error": f"冻结记录{freeze_no}不存在"}

            merchant = db.query(Merchant).filter(Merchant.id == freeze.merchant_id).first()
            order = db.query(Order).filter(Order.id == freeze.order_id).first()
            unfreeze_history = (
                db.query(UnfreezeRecord)
                .filter(UnfreezeRecord.freeze_id == freeze.id)
                .order_by(UnfreezeRecord.operate_time)
                .all()
            )

            return {
                "success": True,
                "data": {
                    "freeze_no": freeze.freeze_no,
                    "merchant_code": merchant.merchant_code if merchant else "",
                    "merchant_name": merchant.merchant_name if merchant else "",
                    "order_no": order.order_no if order else "",
                    "freeze_amount": freeze.freeze_amount,
                    "unfreeze_amount": freeze.unfreeze_amount,
                    "remain_frozen": freeze.remain_frozen_amount,
                    "status": freeze.freeze_status,
                    "freeze_time": freeze.freeze_time,
                    "freeze_reason": freeze.freeze_reason,
                    "unfreeze_history": [
                        {
                            "unfreeze_no": uf.unfreeze_no,
                            "amount": uf.unfreeze_amount,
                            "time": uf.operate_time,
                            "operator": uf.operator,
                            "reason": uf.unfreeze_reason,
                        }
                        for uf in unfreeze_history
                    ],
                },
            }

    @staticmethod
    def run_full_audit(operator: str = "system") -> Dict:
        with get_db() as db:
            merchants = db.query(Merchant).all()
            updated_count = 0
            for merchant in merchants:
                FreezeService._update_merchant_balance(db, merchant.id, operator)
                updated_count += 1

        risk_result = RiskDetection.run_all_checks(operator)

        return {
            "success": True,
            "merchants_audited": updated_count,
            "risks_found": risk_result["total_risks"],
            "high_risks": risk_result["high_risk_count"],
            "warnings": risk_result["warning_count"],
        }
