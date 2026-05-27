from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy import func, and_
from ..models import (
    FreezeRecord,
    UnfreezeRecord,
    AppealRecord,
    ViolationRecord,
    MerchantBalance,
)
from ..database import get_db
from ..config import RISK_THRESHOLDS
from .audit_service import AuditService


class RiskDetection:
    @staticmethod
    def detect_freeze_expansion(merchant_id: Optional[int] = None) -> List[Dict]:
        risks = []
        with get_db() as db:
            query = db.query(FreezeRecord).filter(
                FreezeRecord.freeze_status.in_(["frozen", "partially_unfrozen"])
            )
            if merchant_id:
                query = query.filter(FreezeRecord.merchant_id == merchant_id)

            freezes = query.order_by(FreezeRecord.merchant_id, FreezeRecord.freeze_time).all()

            merchant_freeze_map = {}
            for fr in freezes:
                if fr.merchant_id not in merchant_freeze_map:
                    merchant_freeze_map[fr.merchant_id] = []
                merchant_freeze_map[fr.merchant_id].append(fr)

            for mid, fr_list in merchant_freeze_map.items():
                if len(fr_list) < 2:
                    continue

                total_amount = sum(fr.freeze_amount for fr in fr_list)
                avg_amount = total_amount / len(fr_list)

                for i, fr in enumerate(fr_list[1:], 1):
                    prev_fr = fr_list[i - 1]
                    if fr.freeze_amount > 0 and prev_fr.freeze_amount > 0:
                        ratio = fr.freeze_amount / prev_fr.freeze_amount
                        if ratio >= RISK_THRESHOLDS["freeze_expansion_ratio"]:
                            risks.append(
                                {
                                    "risk_type": "freeze_expansion",
                                    "risk_level": "high",
                                    "merchant_id": mid,
                                    "freeze_no": fr.freeze_no,
                                    "current_amount": fr.freeze_amount,
                                    "previous_amount": prev_fr.freeze_amount,
                                    "ratio": round(ratio, 2),
                                    "message": f"冻结金额较上一次增长{round((ratio-1)*100, 1)}%，超过阈值{int((RISK_THRESHOLDS['freeze_expansion_ratio']-1)*100)}%",
                                }
                            )
        return risks

    @staticmethod
    def detect_balance_not_updated() -> List[Dict]:
        risks = []
        with get_db() as db:
            approved_appeals = (
                db.query(AppealRecord)
                .filter(AppealRecord.appeal_status.in_(["approved", "partial_approved"]))
                .filter(AppealRecord.audit_time >= datetime.now() - timedelta(days=30))
                .all()
            )

            for appeal in approved_appeals:
                violation = (
                    db.query(ViolationRecord).filter(ViolationRecord.id == appeal.violation_id).first()
                )
                if not violation:
                    continue

                related_freeze = (
                    db.query(FreezeRecord)
                    .filter(
                        and_(
                            FreezeRecord.violation_id == violation.id,
                            FreezeRecord.freeze_status == "frozen",
                        )
                    )
                    .first()
                )

                if related_freeze and appeal.unfreeze_suggestion > 0:
                    has_unfreeze = (
                        db.query(UnfreezeRecord)
                        .filter(
                            and_(
                                UnfreezeRecord.freeze_id == related_freeze.id,
                                UnfreezeRecord.operate_time >= appeal.audit_time,
                            )
                        )
                        .first()
                    )

                    if not has_unfreeze:
                        days_passed = (datetime.now() - appeal.audit_time).days
                        risks.append(
                            {
                                "risk_type": "balance_not_updated",
                                "risk_level": "high" if days_passed > 1 else "warning",
                                "merchant_id": related_freeze.merchant_id,
                                "appeal_no": appeal.appeal_no,
                                "freeze_no": related_freeze.freeze_no,
                                "suggested_amount": appeal.unfreeze_suggestion,
                                "frozen_amount": related_freeze.freeze_amount,
                                "days_passed": days_passed,
                                "message": f"申诉通过已{days_passed}天，建议解冻{appeal.unfreeze_suggestion}元但尚未执行",
                            }
                        )
        return risks

    @staticmethod
    def detect_duplicate_unfreeze() -> List[Dict]:
        risks = []
        with get_db() as db:
            recent_unfreezes = (
                db.query(UnfreezeRecord)
                .filter(
                    UnfreezeRecord.operate_time
                    >= datetime.now() - timedelta(days=RISK_THRESHOLDS["multiple_unfreeze_days"] * 2)
                )
                .order_by(UnfreezeRecord.freeze_id, UnfreezeRecord.operate_time)
                .all()
            )

            freeze_unfreeze_map = {}
            for uf in recent_unfreezes:
                if uf.freeze_id not in freeze_unfreeze_map:
                    freeze_unfreeze_map[uf.freeze_id] = []
                freeze_unfreeze_map[uf.freeze_id].append(uf)

            for freeze_id, uf_list in freeze_unfreeze_map.items():
                if len(uf_list) < 2:
                    continue

                for i in range(len(uf_list)):
                    for j in range(i + 1, len(uf_list)):
                        time_diff = abs(
                            (uf_list[i].operate_time - uf_list[j].operate_time).total_seconds()
                        )
                        if time_diff < RISK_THRESHOLDS["multiple_unfreeze_days"] * 86400:
                            amount_diff = abs(uf_list[i].unfreeze_amount - uf_list[j].unfreeze_amount)
                            risks.append(
                                {
                                    "risk_type": "duplicate_unfreeze",
                                    "risk_level": "high",
                                    "freeze_id": freeze_id,
                                    "unfreeze_no_1": uf_list[i].unfreeze_no,
                                    "unfreeze_no_2": uf_list[j].unfreeze_no,
                                    "amount_1": uf_list[i].unfreeze_amount,
                                    "amount_2": uf_list[j].unfreeze_amount,
                                    "time_diff_hours": round(time_diff / 3600, 1),
                                    "message": f"同一冻结记录{time_diff/3600:.1f}小时内两次解冻，金额分别为{uf_list[i].unfreeze_amount}和{uf_list[j].unfreeze_amount}",
                                }
                            )
        return risks

    @staticmethod
    def detect_balance_mismatch() -> List[Dict]:
        risks = []
        with get_db() as db:
            balances = db.query(MerchantBalance).all()
            for balance in balances:
                calc_frozen = (
                    db.query(func.coalesce(func.sum(FreezeRecord.remain_frozen_amount), 0))
                    .filter(
                        FreezeRecord.merchant_id == balance.merchant_id,
                        FreezeRecord.freeze_status != "unfrozen",
                    )
                    .scalar()
                )

                calc_unfrozen = (
                    db.query(func.coalesce(func.sum(UnfreezeRecord.unfreeze_amount), 0))
                    .select_from(UnfreezeRecord)
                    .join(FreezeRecord, UnfreezeRecord.freeze_id == FreezeRecord.id)
                    .filter(FreezeRecord.merchant_id == balance.merchant_id)
                    .scalar()
                )

                diff_frozen = abs(calc_frozen - balance.total_frozen)
                diff_unfrozen = abs(calc_unfrozen - balance.total_unfrozen)

                if (
                    diff_frozen > RISK_THRESHOLDS["balance_mismatch_threshold"]
                    or diff_unfrozen > RISK_THRESHOLDS["balance_mismatch_threshold"]
                ):
                    risks.append(
                        {
                            "risk_type": "balance_mismatch",
                            "risk_level": "high",
                            "merchant_id": balance.merchant_id,
                            "expected_frozen": calc_frozen,
                            "actual_frozen": balance.total_frozen,
                            "expected_unfrozen": calc_unfrozen,
                            "actual_unfrozen": balance.total_unfrozen,
                            "message": f"余额不匹配：冻结余额差{diff_frozen:.2f}元，解冻余额差{diff_unfrozen:.2f}元",
                        }
                    )
        return risks

    @staticmethod
    def run_all_checks(operator: str = "system") -> Dict:
        results = {
            "freeze_expansion": RiskDetection.detect_freeze_expansion(),
            "balance_not_updated": RiskDetection.detect_balance_not_updated(),
            "duplicate_unfreeze": RiskDetection.detect_duplicate_unfreeze(),
            "balance_mismatch": RiskDetection.detect_balance_mismatch(),
        }

        all_risks = []
        for risk_type, risks in results.items():
            for risk in risks:
                AuditService.log(
                    operation_type="risk_detection",
                    operation_subtype=risk_type,
                    target_type=risk.get("target_type", ""),
                    target_id=risk.get("merchant_id") or risk.get("freeze_id"),
                    after_value=risk,
                    operator=operator,
                    risk_level=risk["risk_level"],
                    risk_desc=risk["message"],
                )
                all_risks.append(risk)

        return {
            "total_risks": len(all_risks),
            "high_risk_count": sum(1 for r in all_risks if r["risk_level"] == "high"),
            "warning_count": sum(1 for r in all_risks if r["risk_level"] == "warning"),
            "details": results,
        }
