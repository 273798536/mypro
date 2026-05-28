from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime
from app.models.models import StudentCard, RechargeRecord, ConsumeRevoke, SubsidyRule, RefundRecord, RefundDetail
from app.models.schemas import RefundResult, RefundDetailItem


class BalanceService:

    @staticmethod
    def calculate_balance_layers(db: Session, card_no: str) -> Dict[str, float]:
        """计算余额分层：补贴、充值、消费撤销"""
        subsidy_total = 0.0
        recharge_total = 0.0
        revoke_total = 0.0

        recharges = db.query(RechargeRecord).filter(
            RechargeRecord.card_no == card_no
        ).all()

        for r in recharges:
            if r.is_subsidy:
                subsidy_total += round(r.amount or 0.0, 2)
            else:
                recharge_total += round(r.amount or 0.0, 2)

        revokes = db.query(ConsumeRevoke).filter(
            ConsumeRevoke.card_no == card_no
        ).all()

        for rv in revokes:
            revoke_total += round(rv.amount or 0.0, 2)

        total = round(subsidy_total + recharge_total + revoke_total, 2)

        return {
            "total_balance": total,
            "subsidy_balance": round(subsidy_total, 2),
            "recharge_balance": round(recharge_total, 2),
            "revoke_balance": round(revoke_total, 2)
        }

    @staticmethod
    def update_card_balance(db: Session, card_no: str) -> Optional[StudentCard]:
        """更新卡余额分层"""
        card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
        if not card:
            return None

        layers = BalanceService.calculate_balance_layers(db, card_no)
        card.total_balance = layers["total_balance"]
        card.subsidy_balance = layers["subsidy_balance"]
        card.recharge_balance = layers["recharge_balance"]
        card.revoke_balance = layers["revoke_balance"]
        card.updated_at = datetime.now()

        db.commit()
        db.refresh(card)
        return card


class RefundRuleEngine:

    @staticmethod
    def check_subsidy_refundable(db: Session, recharge: RechargeRecord) -> Tuple[bool, Optional[str]]:
        """检查补贴是否可退"""
        if not recharge.is_subsidy:
            return True, None

        if not recharge.is_refundable:
            return False, "补贴规则标记为不可退"

        if recharge.subsidy_rule_code:
            rule = db.query(SubsidyRule).filter(
                SubsidyRule.rule_code == recharge.subsidy_rule_code
            ).first()
            if rule and not rule.is_refundable:
                return False, f"补贴规则[{rule.rule_name}]不可退"

        return True, None

    @staticmethod
    def check_cross_day_revoke(revoke: ConsumeRevoke) -> Tuple[bool, Optional[str]]:
        """检查是否跨日撤销"""
        if revoke.consume_time and revoke.revoke_time:
            if revoke.consume_time.date() != revoke.revoke_time.date():
                return True, "消费撤销跨日"
        return False, None

    @staticmethod
    def check_merged_card(card: StudentCard) -> Tuple[bool, Optional[str]]:
        """检查是否卡号合并"""
        if card.is_merged:
            return True, f"卡号已合并，来源:{card.merged_from or '未知'}"
        return False, None

    @staticmethod
    def calculate_refund(db: Session, card_no: str, operator: str) -> RefundResult:
        """计算单卡退费，返回分层结果"""
        from app.models.models import RefundRecord as RR

        card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
        if not card:
            raise ValueError(f"卡号不存在: {card_no}")

        existing_refund = db.query(RR).filter(
            and_(RR.card_no == card_no, RR.status == "pending")
        ).first()

        if existing_refund:
            refund_no = existing_refund.refund_no
        else:
            refund_no = f"RF{datetime.now().strftime('%Y%m%d%H%M%S')}{card_no[-4:]}"

        layers = BalanceService.calculate_balance_layers(db, card_no)

        subsidy_refund = 0.0
        recharge_refund = 0.0
        revoke_refund = 0.0
        blocked_subsidy = 0.0
        has_blocked = False
        has_cross_day = False
        has_merged = False
        details: List[RefundDetailItem] = []
        block_reasons: List[str] = []

        recharges = db.query(RechargeRecord).filter(
            RechargeRecord.card_no == card_no
        ).order_by(RechargeRecord.recharge_time.desc()).all()

        for r in recharges:
            is_refundable, block_reason = RefundRuleEngine.check_subsidy_refundable(db, r)
            if is_refundable:
                if r.is_subsidy:
                    subsidy_refund += round(r.amount or 0.0, 2)
                else:
                    recharge_refund += round(r.amount or 0.0, 2)
                details.append(RefundDetailItem(
                    item_type="subsidy" if r.is_subsidy else "recharge",
                    item_no=r.recharge_no,
                    amount=round(r.amount or 0.0, 2),
                    is_blocked=False
                ))
            else:
                has_blocked = True
                blocked_subsidy += round(r.amount or 0.0, 2)
                block_reasons.append(block_reason or "补贴不可退")
                details.append(RefundDetailItem(
                    item_type="subsidy" if r.is_subsidy else "recharge",
                    item_no=r.recharge_no,
                    amount=round(r.amount or 0.0, 2),
                    is_blocked=True,
                    block_reason=block_reason
                ))

        revokes = db.query(ConsumeRevoke).filter(
            ConsumeRevoke.card_no == card_no
        ).order_by(ConsumeRevoke.revoke_time.desc()).all()

        for rv in revokes:
            revoke_refund += round(rv.amount or 0.0, 2)
            is_cross, cross_reason = RefundRuleEngine.check_cross_day_revoke(rv)
            if is_cross:
                has_cross_day = True
            details.append(RefundDetailItem(
                item_type="revoke",
                item_no=rv.revoke_no,
                amount=round(rv.amount or 0.0, 2),
                is_blocked=False,
                block_reason=cross_reason if is_cross else None
            ))

        is_merged, merge_reason = RefundRuleEngine.check_merged_card(card)
        if is_merged:
            has_merged = True

        total_refund = round(subsidy_refund + recharge_refund + revoke_refund, 2)

        status = "blocked" if has_blocked else "pending"

        return RefundResult(
            card_no=card_no,
            student_name=card.student_name,
            total_refund=total_refund,
            subsidy_refund=round(subsidy_refund, 2),
            recharge_refund=round(recharge_refund, 2),
            revoke_refund=round(revoke_refund, 2),
            blocked_subsidy=round(blocked_subsidy, 2),
            has_blocked_subsidy=has_blocked,
            has_cross_day_revoke=has_cross_day,
            has_merged_card=has_merged,
            status=status,
            details=details,
            refund_no=refund_no
        )

    @staticmethod
    def match_refund_rules(db: Session, card_no: str) -> Dict[str, Any]:
        """匹配退费规则，返回规则详情"""
        card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
        if not card:
            raise ValueError(f"卡号不存在: {card_no}")

        block_reasons: List[str] = []
        warnings: List[str] = []
        applicable_rules: List[Dict[str, Any]] = []
        refundable = 0.0
        blocked = 0.0

        recharges = db.query(RechargeRecord).filter(
            RechargeRecord.card_no == card_no
        ).all()

        for r in recharges:
            rule_info = None
            if r.subsidy_rule_code:
                rule = db.query(SubsidyRule).filter(
                    SubsidyRule.rule_code == r.subsidy_rule_code
                ).first()
                if rule:
                    rule_info = {
                        "rule_code": rule.rule_code,
                        "rule_name": rule.rule_name,
                        "is_refundable": rule.is_refundable
                    }

            is_refundable, block_reason = RefundRuleEngine.check_subsidy_refundable(db, r)
            if is_refundable:
                refundable += round(r.amount or 0.0, 2)
            else:
                blocked += round(r.amount or 0.0, 2)
                if block_reason and block_reason not in block_reasons:
                    block_reasons.append(block_reason)

            applicable_rules.append({
                "recharge_no": r.recharge_no,
                "amount": r.amount,
                "is_subsidy": r.is_subsidy,
                "is_refundable": is_refundable,
                "rule": rule_info,
                "block_reason": block_reason
            })

        revokes = db.query(ConsumeRevoke).filter(
            ConsumeRevoke.card_no == card_no
        ).all()

        for rv in revokes:
            refundable += round(rv.amount or 0.0, 2)
            is_cross, cross_reason = RefundRuleEngine.check_cross_day_revoke(rv)
            if is_cross and cross_reason and cross_reason not in warnings:
                warnings.append(cross_reason)

        is_merged, merge_reason = RefundRuleEngine.check_merged_card(card)
        if is_merged and merge_reason and merge_reason not in warnings:
            warnings.append(merge_reason)

        return {
            "card_no": card_no,
            "student_name": card.student_name,
            "refundable_amount": round(refundable, 2),
            "blocked_amount": round(blocked, 2),
            "block_reasons": block_reasons,
            "warnings": warnings,
            "applicable_rules": applicable_rules
        }
