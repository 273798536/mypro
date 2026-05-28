from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.models import RechargeRecord, RechargeAmendment, StudentCard
from app.services.refund_service import RefundRuleEngine, BalanceService


class AmendmentService:

    @staticmethod
    def amend_recharge(
        db: Session,
        recharge_id: int,
        new_amount: Optional[float] = None,
        new_subsidy_amount: Optional[float] = None,
        new_self_amount: Optional[float] = None,
        new_is_refundable: Optional[bool] = None,
        new_remark: Optional[str] = None,
        amend_reason: str = "",
        operator: str = "",
    ) -> Dict[str, Any]:
        """手动修正充值流水，并返回新旧结果并排对比"""
        recharge = db.query(RechargeRecord).filter(
            RechargeRecord.id == recharge_id
        ).first()

        if not recharge:
            raise ValueError(f"充值记录不存在: {recharge_id}")

        old_values = {
            "amount": recharge.amount,
            "subsidy_amount": recharge.subsidy_amount,
            "self_amount": recharge.self_amount,
            "is_refundable": recharge.is_refundable,
            "remark": recharge.remark,
        }

        old_refund_result = None
        try:
            old_calc = RefundRuleEngine.calculate_refund(db, recharge.card_no, operator)
            old_refund_result = {
                "total_refund": old_calc.total_refund,
                "subsidy_refund": old_calc.subsidy_refund,
                "recharge_refund": old_calc.recharge_refund,
                "revoke_refund": old_calc.revoke_refund,
                "blocked_subsidy": old_calc.blocked_subsidy,
                "status": old_calc.status,
                "has_blocked_subsidy": old_calc.has_blocked_subsidy,
            }
        except Exception:
            old_refund_result = {"error": "无法计算旧结果"}

        amendment_no = f"AM{datetime.now().strftime('%Y%m%d%H%M%S')}{recharge_id}"

        new_values = {}
        if new_amount is not None:
            recharge.amount = round(new_amount, 2)
            new_values["amount"] = round(new_amount, 2)
        if new_subsidy_amount is not None:
            recharge.subsidy_amount = round(new_subsidy_amount, 2)
            new_values["subsidy_amount"] = round(new_subsidy_amount, 2)
        if new_self_amount is not None:
            recharge.self_amount = round(new_self_amount, 2)
            new_values["self_amount"] = round(new_self_amount, 2)
        if new_is_refundable is not None:
            recharge.is_refundable = new_is_refundable
            new_values["is_refundable"] = new_is_refundable
        if new_remark is not None:
            recharge.remark = new_remark
            new_values["remark"] = new_remark

        recharge.is_amended = True
        recharge.amend_version += 1
        recharge.updated_at = datetime.now()

        amendment = RechargeAmendment(
            original_recharge_id=recharge_id,
            amendment_no=amendment_no,
            old_amount=old_values["amount"],
            new_amount=new_values.get("amount", old_values["amount"]),
            old_subsidy_amount=old_values["subsidy_amount"],
            new_subsidy_amount=new_values.get("subsidy_amount", old_values["subsidy_amount"]),
            old_self_amount=old_values["self_amount"],
            new_self_amount=new_values.get("self_amount", old_values["self_amount"]),
            old_is_refundable=old_values["is_refundable"],
            new_is_refundable=new_values.get("is_refundable", old_values["is_refundable"]),
            old_remark=old_values["remark"],
            new_remark=new_values.get("remark", old_values["remark"]),
            amend_reason=amend_reason,
            operator=operator,
        )
        db.add(amendment)
        db.flush()

        BalanceService.update_card_balance(db, recharge.card_no)

        new_refund_result = None
        try:
            new_calc = RefundRuleEngine.calculate_refund(db, recharge.card_no, operator)
            new_refund_result = {
                "total_refund": new_calc.total_refund,
                "subsidy_refund": new_calc.subsidy_refund,
                "recharge_refund": new_calc.recharge_refund,
                "revoke_refund": new_calc.revoke_refund,
                "blocked_subsidy": new_calc.blocked_subsidy,
                "status": new_calc.status,
                "has_blocked_subsidy": new_calc.has_blocked_subsidy,
            }
        except Exception:
            new_refund_result = {"error": "无法计算新结果"}

        db.commit()

        return {
            "recharge_id": recharge_id,
            "recharge_no": recharge.recharge_no,
            "old_values": old_values,
            "new_values": new_values,
            "old_refund_result": old_refund_result,
            "new_refund_result": new_refund_result,
            "amend_reason": amend_reason,
            "operator": operator,
            "created_at": datetime.now(),
        }

    @staticmethod
    def get_amendment_history(
        db: Session,
        recharge_id: Optional[int] = None,
        card_no: Optional[str] = None,
    ) -> list:
        """查询修正历史"""
        query = db.query(RechargeAmendment).join(
            RechargeRecord, RechargeAmendment.original_recharge_id == RechargeRecord.id
        )

        if recharge_id:
            query = query.filter(RechargeAmendment.original_recharge_id == recharge_id)
        if card_no:
            query = query.filter(RechargeRecord.card_no == card_no)

        amendments = query.order_by(RechargeAmendment.created_at.desc()).all()

        result = []
        for a in amendments:
            result.append({
                "amendment_no": a.amendment_no,
                "recharge_id": a.original_recharge_id,
                "old_values": {
                    "amount": a.old_amount,
                    "subsidy_amount": a.old_subsidy_amount,
                    "self_amount": a.old_self_amount,
                    "is_refundable": a.old_is_refundable,
                    "remark": a.old_remark,
                },
                "new_values": {
                    "amount": a.new_amount,
                    "subsidy_amount": a.new_subsidy_amount,
                    "self_amount": a.new_self_amount,
                    "is_refundable": a.new_is_refundable,
                    "remark": a.new_remark,
                },
                "amend_reason": a.amend_reason,
                "operator": a.operator,
                "created_at": a.created_at,
            })

        return result

    @staticmethod
    def compare_amendment(
        db: Session,
        amendment_no: str,
    ) -> Dict[str, Any]:
        """并排展示单次修正的新旧对比，包括修正前后对退费的影响"""
        amendment = db.query(RechargeAmendment).filter(
            RechargeAmendment.amendment_no == amendment_no
        ).first()

        if not amendment:
            raise ValueError(f"修正记录不存在: {amendment_no}")

        recharge = db.query(RechargeRecord).filter(
            RechargeRecord.id == amendment.original_recharge_id
        ).first()

        if not recharge:
            raise ValueError(f"充值记录已被删除")

        return {
            "recharge_id": recharge.id,
            "recharge_no": recharge.recharge_no,
            "card_no": recharge.card_no,
            "old_values": {
                "amount": amendment.old_amount,
                "subsidy_amount": amendment.old_subsidy_amount,
                "self_amount": amendment.old_self_amount,
                "is_refundable": amendment.old_is_refundable,
                "remark": amendment.old_remark,
            },
            "new_values": {
                "amount": amendment.new_amount,
                "subsidy_amount": amendment.new_subsidy_amount,
                "self_amount": amendment.new_self_amount,
                "is_refundable": amendment.new_is_refundable,
                "remark": amendment.new_remark,
            },
            "difference": {
                "amount": round((amendment.new_amount or 0) - (amendment.old_amount or 0), 2),
                "subsidy_amount": round((amendment.new_subsidy_amount or 0) - (amendment.old_subsidy_amount or 0), 2),
                "self_amount": round((amendment.new_self_amount or 0) - (amendment.old_self_amount or 0), 2),
            },
            "amend_reason": amendment.amend_reason,
            "operator": amendment.operator,
            "created_at": amendment.created_at,
        }
