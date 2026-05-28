from typing import List, Optional, Dict, Any
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.trade import (
    Trade, TradeAgreement, SeatInfo, RestrictionRule,
    FundRecord, VerificationRecord, TraceLog, StatusTransition,
    TradeStatus, VerificationType, VerificationResult, MaterialSource
)
from app.schemas.trade import (
    TradeCreate, TradeUpdate,
    TradeAgreementCreate, SeatInfoCreate, RestrictionRuleCreate, FundRecordCreate
)


class CRUDTrade(CRUDBase[Trade, TradeCreate, TradeUpdate]):
    def get_by_trade_code(self, db: Session, trade_code: str) -> Optional[Trade]:
        return db.query(Trade).filter(Trade.trade_code == trade_code).first()

    def get_multi_filters(
        self, db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        stock_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[int, List[Trade]]:
        query = db.query(Trade)
        if start_date:
            query = query.filter(Trade.trade_date >= start_date)
        if end_date:
            query = query.filter(Trade.trade_date <= end_date)
        if status:
            query = query.filter(Trade.status == status)
        if stock_code:
            query = query.filter(Trade.stock_code == stock_code)

        total = query.count()
        items = query.order_by(Trade.trade_date.desc(), Trade.created_at.desc()).offset(skip).limit(limit).all()
        return total, items

    def update_status(
        self, db: Session, *, db_obj: Trade, new_status: str,
        reason: str, operator: str = "system"
    ) -> Trade:
        old_status = db_obj.status
        db_obj.status = new_status

        transition = StatusTransition(
            trade_id=db_obj.id,
            from_status=old_status,
            to_status=new_status,
            transition_reason=reason,
            operator=operator,
            transition_at=datetime.now()
        )
        db.add(transition)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def set_lock(
        self, db: Session, *, db_obj: Trade, locked: bool, operator: str
    ) -> Trade:
        db_obj.is_locked = locked
        if locked:
            db_obj.locked_at = datetime.now()
            db_obj.locked_by = operator
        else:
            db_obj.locked_at = None
            db_obj.locked_by = None
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_verification_record(
        self, db: Session, *, trade_id: int,
        verification_type: str, verification_result: str,
        conclusion: str, detail: Optional[str] = None,
        suggested_action: Optional[str] = None,
        verified_by: str = "system",
        trace_logs: Optional[List[Dict[str, Any]]] = None
    ) -> VerificationRecord:
        record = VerificationRecord(
            trade_id=trade_id,
            verification_type=verification_type,
            verification_result=verification_result,
            conclusion=conclusion,
            detail=detail,
            suggested_action=suggested_action,
            verified_by=verified_by,
            verified_at=datetime.now()
        )
        db.add(record)
        db.flush()

        if trace_logs:
            for trace_data in trace_logs:
                trace = TraceLog(
                    trade_id=trade_id,
                    verification_record_id=record.id,
                    material_source=trace_data["material_source"],
                    material_id=trace_data["material_id"],
                    material_field=trace_data.get("material_field"),
                    material_value=trace_data.get("material_value"),
                    description=trace_data["description"]
                )
                db.add(trace)

        db.commit()
        db.refresh(record)
        return record

    def get_detail(self, db: Session, trade_id: int) -> Optional[Dict[str, Any]]:
        trade = self.get(db, id=trade_id)
        if not trade:
            return None

        return {
            "trade": trade,
            "agreement": trade.agreement,
            "seat_info": trade.seat_info,
            "restriction_rule": trade.restriction_rule,
            "fund_records": trade.fund_records,
            "verification_records": sorted(trade.verification_records, key=lambda x: x.verified_at),
            "trace_logs": sorted(trade.trace_logs, key=lambda x: x.id),
            "status_transitions": sorted(trade.status_transitions, key=lambda x: x.transition_at)
        }


class CRUDTradeAgreement(CRUDBase[TradeAgreement, TradeAgreementCreate, Any]):
    def get_by_agreement_no(self, db: Session, agreement_no: str) -> Optional[TradeAgreement]:
        return db.query(TradeAgreement).filter(TradeAgreement.agreement_no == agreement_no).first()


class CRUDSeatInfo(CRUDBase[SeatInfo, SeatInfoCreate, Any]):
    def get_by_seat_code(self, db: Session, seat_code: str) -> Optional[SeatInfo]:
        return db.query(SeatInfo).filter(SeatInfo.seat_code == seat_code).first()

    def get_by_account(self, db: Session, account_number: str) -> Optional[SeatInfo]:
        return db.query(SeatInfo).filter(SeatInfo.account_number == account_number).first()


class CRUDRestrictionRule(CRUDBase[RestrictionRule, RestrictionRuleCreate, Any]):
    def get_by_rule_code(self, db: Session, rule_code: str) -> Optional[RestrictionRule]:
        return db.query(RestrictionRule).filter(RestrictionRule.rule_code == rule_code).first()

    def get_active_rules(
        self, db: Session, stock_code: str, account: str, trade_date: date
    ) -> List[RestrictionRule]:
        return db.query(RestrictionRule).filter(
            RestrictionRule.stock_code == stock_code,
            RestrictionRule.restricted_account == account,
            RestrictionRule.is_active == True,
            RestrictionRule.restriction_start_date <= trade_date,
            RestrictionRule.restriction_end_date >= trade_date,
            RestrictionRule.remaining_quantity > 0
        ).all()


class CRUDFundRecord(CRUDBase[FundRecord, FundRecordCreate, Any]):
    def get_by_trade_id(self, db: Session, trade_id: int) -> List[FundRecord]:
        return db.query(FundRecord).filter(FundRecord.trade_id == trade_id).all()

    def get_total_received(self, db: Session, trade_id: int) -> float:
        records = self.get_by_trade_id(db, trade_id)
        return sum(r.received_amount for r in records)


crud_trade = CRUDTrade(Trade)
crud_agreement = CRUDTradeAgreement(TradeAgreement)
crud_seat = CRUDSeatInfo(SeatInfo)
crud_restriction = CRUDRestrictionRule(RestrictionRule)
crud_fund = CRUDFundRecord(FundRecord)
