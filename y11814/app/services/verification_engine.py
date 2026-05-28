from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.models.trade import (
    Trade, TradeAgreement, SeatInfo, RestrictionRule,
    FundRecord, VerificationRecord, TraceLog, StatusTransition,
    TradeStatus, VerificationType, VerificationResult, MaterialSource
)
from app.crud.trade import crud_trade, crud_agreement, crud_seat, crud_restriction, crud_fund


class VerificationEngine:
    def verify_trade(self, db: Session, trade_id: int, operator: str = "system") -> Dict[str, Any]:
        trade = crud_trade.get(db, id=trade_id)
        if not trade:
            return {"error": f"交易不存在: trade_id={trade_id}"}

        if trade.is_locked:
            return {"error": f"交易已锁定，无法重新核对: trade_code={trade.trade_code}"}

        verification_records = []

        agreement_result = self._verify_agreement(db, trade, operator)
        verification_records.append(agreement_result)

        seat_result = self._verify_seat(db, trade, operator)
        verification_records.append(seat_result)

        fund_result = self._verify_fund(db, trade, operator)
        verification_records.append(fund_result)

        restriction_result = self._verify_restriction(db, trade, operator)
        verification_records.append(restriction_result)

        final_status, suggested_action = self._determine_final_status(
            trade, agreement_result, seat_result, fund_result, restriction_result
        )

        crud_trade.update_status(
            db, db_obj=trade,
            new_status=final_status,
            reason=self._build_transition_reason(verification_records, final_status),
            operator=operator
        )

        return {
            "trade_id": trade.id,
            "trade_code": trade.trade_code,
            "final_status": final_status,
            "verification_records": verification_records,
            "suggested_next_action": suggested_action
        }

    def _verify_agreement(self, db: Session, trade: Trade, operator: str) -> Dict[str, Any]:
        traces: List[Dict[str, Any]] = []
        details: List[str] = []

        if not trade.agreement_id:
            record = crud_trade.add_verification_record(
                db, trade_id=trade.id,
                verification_type=VerificationType.AGREEMENT.value,
                verification_result=VerificationResult.PENDING.value,
                conclusion="未关联交易协议，无法完成协议核对",
                detail="交易台账未绑定协议ID，需手动关联协议后重新核对",
                suggested_action="请关联交易协议后重新执行核对",
                verified_by=operator,
                trace_logs=[{
                    "material_source": MaterialSource.AGREEMENT.value,
                    "material_id": 0,
                    "material_field": "agreement_id",
                    "material_value": "空",
                    "description": "交易未关联协议，无法取协议数据比对"
                }]
            )
            return self._format_record(record)

        agreement = trade.agreement
        is_pass = True

        fields_to_check = [
            ("stock_code", "证券代码"),
            ("quantity", "成交数量"),
            ("price", "成交价格"),
            ("amount", "成交金额"),
            ("buyer_account", "买方账户"),
            ("seller_account", "卖方账户"),
        ]

        for field_name, field_label in fields_to_check:
            trade_val = getattr(trade, field_name)
            agreement_val = getattr(agreement, field_name)
            match = trade_val == agreement_val

            traces.append({
                "material_source": MaterialSource.AGREEMENT.value,
                "material_id": agreement.id,
                "material_field": field_name,
                "material_value": str(agreement_val),
                "description": f"协议{field_label}={agreement_val}, 交易{field_label}={trade_val}, {'一致' if match else '不一致'}"
            })

            if not match:
                is_pass = False
                details.append(f"{field_label}不一致: 协议值={agreement_val}, 交易值={trade_val}")

        buyer_seat_match = trade.buyer_seat_code == agreement.buyer_seat_code
        seller_seat_match = trade.seller_seat_code == agreement.seller_seat_code

        traces.append({
            "material_source": MaterialSource.AGREEMENT.value,
            "material_id": agreement.id,
            "material_field": "buyer_seat_code",
            "material_value": agreement.buyer_seat_code,
            "description": f"协议买方席位={agreement.buyer_seat_code}, 交易买方席位={trade.buyer_seat_code}, {'一致' if buyer_seat_match else '不一致'}"
        })
        traces.append({
            "material_source": MaterialSource.AGREEMENT.value,
            "material_id": agreement.id,
            "material_field": "seller_seat_code",
            "material_value": agreement.seller_seat_code,
            "description": f"协议卖方席位={agreement.seller_seat_code}, 交易卖方席位={trade.seller_seat_code}, {'一致' if seller_seat_match else '不一致'}"
        })

        if not buyer_seat_match:
            is_pass = False
            details.append(f"买方席位不一致: 协议值={agreement.buyer_seat_code}, 交易值={trade.buyer_seat_code}")
        if not seller_seat_match:
            is_pass = False
            details.append(f"卖方席位不一致: 协议值={agreement.seller_seat_code}, 交易值={trade.seller_seat_code}")

        if is_pass:
            conclusion = "协议核对通过，交易信息与协议完全一致"
            result = VerificationResult.PASS.value
            suggested = None
        else:
            conclusion = f"协议核对不通过，共{len(details)}项不一致"
            result = VerificationResult.FAIL.value
            suggested = "请核实交易信息与协议的差异，修正后重新核对"

        record = crud_trade.add_verification_record(
            db, trade_id=trade.id,
            verification_type=VerificationType.AGREEMENT.value,
            verification_result=result,
            conclusion=conclusion,
            detail="; ".join(details) if details else "全部一致",
            suggested_action=suggested,
            verified_by=operator,
            trace_logs=traces
        )
        return self._format_record(record)

    def _verify_seat(self, db: Session, trade: Trade, operator: str) -> Dict[str, Any]:
        traces: List[Dict[str, Any]] = []
        details: List[str] = []
        seat_issues: List[str] = []

        buyer_seat = crud_seat.get_by_seat_code(db, trade.buyer_seat_code)
        if buyer_seat:
            buyer_account_match = buyer_seat.account_number == trade.buyer_account
            traces.append({
                "material_source": MaterialSource.SEAT_INFO.value,
                "material_id": buyer_seat.id,
                "material_field": "account_number",
                "material_value": buyer_seat.account_number,
                "description": f"买方席位{trade.buyer_seat_code}对应账户={buyer_seat.account_number}, 交易买方账户={trade.buyer_account}, {'一致' if buyer_account_match else '错配'}"
            })
            if not buyer_account_match:
                is_buyer_active = buyer_seat.is_active
                traces.append({
                    "material_source": MaterialSource.SEAT_INFO.value,
                    "material_id": buyer_seat.id,
                    "material_field": "is_active",
                    "material_value": str(buyer_seat.is_active),
                    "description": f"买方席位状态={'有效' if is_buyer_active else '无效'}"
                })
                seat_issues.append("买方席位错配")
                details.append(
                    f"买方席位{trade.buyer_seat_code}绑定账户为{buyer_seat.account_number}({buyer_seat.account_name}), "
                    f"与交易买方账户{trade.buyer_account}不匹配"
                )
        else:
            seat_issues.append("买方席位未登记")
            details.append(f"买方席位{trade.buyer_seat_code}在席位信息中无记录")
            traces.append({
                "material_source": MaterialSource.SEAT_INFO.value,
                "material_id": 0,
                "material_field": "seat_code",
                "material_value": trade.buyer_seat_code,
                "description": f"买方席位{trade.buyer_seat_code}未在席位信息表中登记"
            })

        seller_seat = crud_seat.get_by_seat_code(db, trade.seller_seat_code)
        if seller_seat:
            seller_account_match = seller_seat.account_number == trade.seller_account
            traces.append({
                "material_source": MaterialSource.SEAT_INFO.value,
                "material_id": seller_seat.id,
                "material_field": "account_number",
                "material_value": seller_seat.account_number,
                "description": f"卖方席位{trade.seller_seat_code}对应账户={seller_seat.account_number}, 交易卖方账户={trade.seller_account}, {'一致' if seller_account_match else '错配'}"
            })
            if not seller_account_match:
                is_seller_active = seller_seat.is_active
                traces.append({
                    "material_source": MaterialSource.SEAT_INFO.value,
                    "material_id": seller_seat.id,
                    "material_field": "is_active",
                    "material_value": str(seller_seat.is_active),
                    "description": f"卖方席位状态={'有效' if is_seller_active else '无效'}"
                })
                seat_issues.append("卖方席位错配")
                details.append(
                    f"卖方席位{trade.seller_seat_code}绑定账户为{seller_seat.account_number}({seller_seat.account_name}), "
                    f"与交易卖方账户{trade.seller_account}不匹配"
                )
        else:
            seat_issues.append("卖方席位未登记")
            details.append(f"卖方席位{trade.seller_seat_code}在席位信息中无记录")
            traces.append({
                "material_source": MaterialSource.SEAT_INFO.value,
                "material_id": 0,
                "material_field": "seat_code",
                "material_value": trade.seller_seat_code,
                "description": f"卖方席位{trade.seller_seat_code}未在席位信息表中登记"
            })

        if seat_issues:
            conclusion = f"席位核对不通过: {', '.join(seat_issues)}"
            result = VerificationResult.FAIL.value
            suggested = "请确认席位与账户的对应关系，修正错配后走待确认流程"
        else:
            conclusion = "席位核对通过，买卖双方席位与账户对应一致"
            result = VerificationResult.PASS.value
            suggested = None

        record = crud_trade.add_verification_record(
            db, trade_id=trade.id,
            verification_type=VerificationType.SEAT.value,
            verification_result=result,
            conclusion=conclusion,
            detail="; ".join(details) if details else "买卖双方席位均匹配",
            suggested_action=suggested,
            verified_by=operator,
            trace_logs=traces
        )
        return self._format_record(record)

    def _verify_fund(self, db: Session, trade: Trade, operator: str) -> Dict[str, Any]:
        traces: List[Dict[str, Any]] = []
        details: List[str] = []

        fund_records = crud_fund.get_by_trade_id(db, trade.id)
        total_received = crud_fund.get_total_received(db, trade.id)

        if not fund_records:
            traces.append({
                "material_source": MaterialSource.FUND_RECORD.value,
                "material_id": 0,
                "material_field": "received_amount",
                "material_value": "0",
                "description": f"交易金额={trade.amount}, 已到账=0, 无资金到账记录"
            })
            record = crud_trade.add_verification_record(
                db, trade_id=trade.id,
                verification_type=VerificationType.FUND.value,
                verification_result=VerificationResult.FAIL.value,
                conclusion="资金核对不通过: 无资金到账记录",
                detail=f"交易金额{trade.amount}元，尚未收到任何资金",
                suggested_action="请确认资金划拨进度，资金到账后重新核对",
                verified_by=operator,
                trace_logs=traces
            )
            return self._format_record(record)

        for fr in fund_records:
            traces.append({
                "material_source": MaterialSource.FUND_RECORD.value,
                "material_id": fr.id,
                "material_field": "received_amount",
                "material_value": str(fr.received_amount),
                "description": f"资金记录{fr.record_no}: 到账金额={fr.received_amount}, 到账时间={fr.received_time}, 状态={fr.settlement_status}"
            })

        shortfall = trade.amount - total_received
        traces.append({
            "material_source": MaterialSource.FUND_RECORD.value,
            "material_id": fund_records[0].id if fund_records else 0,
            "material_field": "total_received",
            "material_value": str(total_received),
            "description": f"交易金额={trade.amount}, 已到账合计={total_received}, 差额={shortfall}"
        })

        if total_received >= trade.amount:
            conclusion = f"资金核对通过: 已到账{total_received}元, 满足交易金额{trade.amount}元"
            result = VerificationResult.PASS.value
            suggested = None
        elif total_received > 0:
            conclusion = f"资金核对不通过: 已到账{total_received}元, 不足交易金额{trade.amount}元, 差额{shortfall}元"
            result = VerificationResult.FAIL.value
            suggested = f"尚有{shortfall}元未到账，请催促资金划拨或确认补缴计划"
            details.append(f"资金缺口{shortfall}元")
        else:
            conclusion = f"资金核对不通过: 已到账0元, 交易金额{trade.amount}元全部未到"
            result = VerificationResult.FAIL.value
            suggested = "资金尚未到账，请确认划拨安排"
            details.append("资金全额未到")

        record = crud_trade.add_verification_record(
            db, trade_id=trade.id,
            verification_type=VerificationType.FUND.value,
            verification_result=result,
            conclusion=conclusion,
            detail="; ".join(details) if details else "资金已足额到账",
            suggested_action=suggested,
            verified_by=operator,
            trace_logs=traces
        )
        return self._format_record(record)

    def _verify_restriction(self, db: Session, trade: Trade, operator: str) -> Dict[str, Any]:
        traces: List[Dict[str, Any]] = []
        details: List[str] = []
        restriction_issues: List[str] = []

        seller_rules = crud_restriction.get_active_rules(
            db, stock_code=trade.stock_code,
            account=trade.seller_account, trade_date=trade.trade_date
        )

        for rule in seller_rules:
            traces.append({
                "material_source": MaterialSource.RESTRICTION_RULE.value,
                "material_id": rule.id,
                "material_field": "remaining_quantity",
                "material_value": str(rule.remaining_quantity),
                "description": f"限售规则{rule.rule_code}({rule.rule_name}): 卖方账户{trade.seller_account}持有{trade.stock_code}限售余量={rule.remaining_quantity}, 限售类型={rule.restriction_type}"
            })

            restricted = min(trade.quantity, rule.remaining_quantity)
            restriction_issues.append(
                f"卖方账户{trade.seller_account}受{rule.rule_name}约束, "
                f"本次卖出{trade.quantity}股中有{restricted}股处于限售期"
            )
            details.append(
                f"限售规则{rule.rule_code}: 限售余量{rule.remaining_quantity}, 卖出数量{trade.quantity}, 受限{restricted}股"
            )

        buyer_rules = crud_restriction.get_active_rules(
            db, stock_code=trade.stock_code,
            account=trade.buyer_account, trade_date=trade.trade_date
        )

        for rule in buyer_rules:
            traces.append({
                "material_source": MaterialSource.RESTRICTION_RULE.value,
                "material_id": rule.id,
                "material_field": "remaining_quantity",
                "material_value": str(rule.remaining_quantity),
                "description": f"限售规则{rule.rule_code}({rule.rule_name}): 买方账户{trade.buyer_account}持有{trade.stock_code}限售余量={rule.remaining_quantity}, 限售类型={rule.restriction_type}"
            })
            details.append(
                f"注意: 买方账户{trade.buyer_account}存在限售规则{rule.rule_code}({rule.rule_name}), "
                f"买入后相关股份将受限售约束"
            )

        if not seller_rules and not buyer_rules:
            traces.append({
                "material_source": MaterialSource.RESTRICTION_RULE.value,
                "material_id": 0,
                "material_field": "search_result",
                "material_value": "无匹配规则",
                "description": f"交易日期{trade.trade_date}, 证券{trade.stock_code}, 买卖双方均无生效限售规则"
            })

        if restriction_issues:
            conclusion = f"限售规则核对不通过: {', '.join(restriction_issues)}"
            result = VerificationResult.FAIL.value
            suggested = "卖方存在限售约束，请确认限售解禁时间或调整交易数量"
        elif buyer_rules:
            conclusion = "限售规则核对提示: 买方存在限售规则，买入股份将受限"
            result = VerificationResult.WARNING.value
            suggested = "买方买入后相关股份将受限售约束，请关注后续限售到期安排"
        else:
            conclusion = "限售规则核对通过: 买卖双方均无生效限售约束"
            result = VerificationResult.PASS.value
            suggested = None

        record = crud_trade.add_verification_record(
            db, trade_id=trade.id,
            verification_type=VerificationType.RESTRICTION.value,
            verification_result=result,
            conclusion=conclusion,
            detail="; ".join(details) if details else "无限售规则约束",
            suggested_action=suggested,
            verified_by=operator,
            trace_logs=traces
        )
        return self._format_record(record)

    def _determine_final_status(
        self,
        trade: Trade,
        agreement_result: Dict,
        seat_result: Dict,
        fund_result: Dict,
        restriction_result: Dict
    ) -> tuple:
        if seat_result["verification_result"] == VerificationResult.FAIL.value:
            return (
                TradeStatus.SEAT_MISMATCH_PENDING.value,
                "席位存在错配，请确认席位与账户对应关系后走待确认流程"
            )

        if fund_result["verification_result"] == VerificationResult.FAIL.value:
            return (
                TradeStatus.FUND_DELAYED.value,
                "资金未足额到账，请催促划拨或确认补缴计划"
            )

        if restriction_result["verification_result"] == VerificationResult.FAIL.value:
            return (
                TradeStatus.RESTRICTION_PENDING.value,
                "存在限售约束未解除，请确认解禁时间或调整交易"
            )

        all_pass = all(
            r["verification_result"] in (VerificationResult.PASS.value, VerificationResult.WARNING.value)
            for r in [agreement_result, seat_result, fund_result, restriction_result]
        )

        if all_pass:
            return (TradeStatus.VERIFIED.value, None)

        return (
            TradeStatus.PENDING_VERIFICATION.value,
            "存在待确认项，请核实后重新核对"
        )

    def _build_transition_reason(self, records: List[Dict], final_status: str) -> str:
        parts = []
        for r in records:
            parts.append(f"{r['verification_type']}: {r['verification_result']}")
        return f"核对完成 -> {final_status}, 明细: {'; '.join(parts)}"

    def _format_record(self, record: VerificationRecord) -> Dict[str, Any]:
        return {
            "id": record.id,
            "trade_id": record.trade_id,
            "verification_type": record.verification_type,
            "verification_result": record.verification_result,
            "conclusion": record.conclusion,
            "detail": record.detail,
            "suggested_action": record.suggested_action,
            "verified_by": record.verified_by,
            "verified_at": record.verified_at.isoformat() if record.verified_at else None,
            "trace_logs": [
                {
                    "id": t.id,
                    "material_source": t.material_source,
                    "material_id": t.material_id,
                    "material_field": t.material_field,
                    "material_value": t.material_value,
                    "description": t.description
                }
                for t in record.trace_logs
            ]
        }


verification_engine = VerificationEngine()
