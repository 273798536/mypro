import enum
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from .base import BaseModel


class TradeStatus(str, enum.Enum):
    PENDING_VERIFICATION = "待核对"
    VERIFIED = "核对通过"
    SEAT_MISMATCH_PENDING = "席位错配待确认"
    FUND_DELAYED = "资金晚到待补缴"
    RESTRICTION_PENDING = "限售未过待解禁"
    LOCKED = "已锁定"
    COMPLETED = "已完成"
    REJECTED = "已驳回"


class VerificationType(str, enum.Enum):
    AGREEMENT = "协议核对"
    SEAT = "席位核对"
    FUND = "资金核对"
    RESTRICTION = "限售规则核对"


class VerificationResult(str, enum.Enum):
    PASS = "通过"
    FAIL = "不通过"
    PENDING = "待确认"
    WARNING = "提示"


class MaterialSource(str, enum.Enum):
    AGREEMENT = "交易协议"
    SEAT_INFO = "席位信息"
    RESTRICTION_RULE = "限售规则"
    FUND_RECORD = "资金记录"
    TRADE_REPORT = "成交回报"


class Trade(BaseModel):
    __tablename__ = "trades"

    trade_date = Column(Date, nullable=False, index=True)
    trade_code = Column(String(32), unique=True, nullable=False, index=True)
    stock_code = Column(String(16), nullable=False, index=True)
    stock_name = Column(String(64), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)

    buyer_account = Column(String(64), nullable=False)
    buyer_seat_code = Column(String(16), nullable=False)
    buyer_branch = Column(String(128))

    seller_account = Column(String(64), nullable=False)
    seller_seat_code = Column(String(16), nullable=False)
    seller_branch = Column(String(128))

    status = Column(String(32), default=TradeStatus.PENDING_VERIFICATION.value, nullable=False, index=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    locked_at = Column(DateTime)
    locked_by = Column(String(64))

    agreement_id = Column(Integer, ForeignKey("trade_agreements.id"))
    seat_info_id = Column(Integer, ForeignKey("seat_infos.id"))
    restriction_rule_id = Column(Integer, ForeignKey("restriction_rules.id"))

    agreement = relationship("TradeAgreement", back_populates="trades")
    seat_info = relationship("SeatInfo", back_populates="trades")
    restriction_rule = relationship("RestrictionRule", back_populates="trades")
    fund_records = relationship("FundRecord", back_populates="trade", cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="trade", cascade="all, delete-orphan")
    status_transitions = relationship("StatusTransition", back_populates="trade", cascade="all, delete-orphan")
    trace_logs = relationship("TraceLog", back_populates="trade", cascade="all, delete-orphan")

    remarks = Column(Text)


class TradeAgreement(BaseModel):
    __tablename__ = "trade_agreements"

    agreement_no = Column(String(64), unique=True, nullable=False, index=True)
    agreement_date = Column(Date, nullable=False)
    trade_date = Column(Date, nullable=False)

    stock_code = Column(String(16), nullable=False)
    stock_name = Column(String(64), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)

    buyer_account = Column(String(64), nullable=False)
    buyer_seat_code = Column(String(16), nullable=False)
    buyer_contact = Column(String(64))

    seller_account = Column(String(64), nullable=False)
    seller_seat_code = Column(String(16), nullable=False)
    seller_contact = Column(String(64))

    settlement_method = Column(String(32), default="净额结算")
    payment_deadline = Column(Date, nullable=False)

    trades = relationship("Trade", back_populates="agreement")


class SeatInfo(BaseModel):
    __tablename__ = "seat_infos"

    seat_code = Column(String(16), unique=True, nullable=False, index=True)
    seat_name = Column(String(128), nullable=False)
    branch_name = Column(String(128), nullable=False)
    account_number = Column(String(64), nullable=False, index=True)
    account_name = Column(String(128), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)

    trades = relationship("Trade", back_populates="seat_info")


class RestrictionRule(BaseModel):
    __tablename__ = "restriction_rules"

    rule_code = Column(String(32), unique=True, nullable=False, index=True)
    rule_name = Column(String(128), nullable=False)
    stock_code = Column(String(16), nullable=False, index=True)
    restricted_account = Column(String(64), nullable=False, index=True)

    restriction_type = Column(String(32), nullable=False)
    restriction_quantity = Column(Integer, nullable=False)
    released_quantity = Column(Integer, default=0)
    remaining_quantity = Column(Integer, nullable=False)

    restriction_start_date = Column(Date, nullable=False)
    restriction_end_date = Column(Date, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    trades = relationship("Trade", back_populates="restriction_rule")


class FundRecord(BaseModel):
    __tablename__ = "fund_records"

    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    record_no = Column(String(64), unique=True, nullable=False, index=True)
    received_amount = Column(Float, nullable=False)
    received_date = Column(Date, nullable=False)
    received_time = Column(DateTime, nullable=False)

    payer_account = Column(String(64))
    payer_bank = Column(String(128))
    settlement_status = Column(String(32), default="已到账")

    trade = relationship("Trade", back_populates="fund_records")


class VerificationRecord(BaseModel):
    __tablename__ = "verification_records"

    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    verification_type = Column(String(32), nullable=False)
    verification_result = Column(String(32), nullable=False)

    conclusion = Column(Text, nullable=False)
    detail = Column(Text)
    suggested_action = Column(String(256))

    verified_by = Column(String(64), default="system")
    verified_at = Column(DateTime, nullable=False)

    trade = relationship("Trade", back_populates="verification_records")
    trace_logs = relationship("TraceLog", back_populates="verification_record", cascade="all, delete-orphan")


class TraceLog(BaseModel):
    __tablename__ = "trace_logs"

    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    verification_record_id = Column(Integer, ForeignKey("verification_records.id"), nullable=False, index=True)

    material_source = Column(String(32), nullable=False)
    material_id = Column(Integer, nullable=False)
    material_field = Column(String(64))
    material_value = Column(Text)

    description = Column(Text, nullable=False)

    trade = relationship("Trade", back_populates="trace_logs")
    verification_record = relationship("VerificationRecord", back_populates="trace_logs")


class StatusTransition(BaseModel):
    __tablename__ = "status_transitions"

    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False, index=True)
    from_status = Column(String(32), nullable=False)
    to_status = Column(String(32), nullable=False)
    transition_reason = Column(Text, nullable=False)
    operator = Column(String(64), default="system")
    transition_at = Column(DateTime, nullable=False)

    trade = relationship("Trade", back_populates="status_transitions")
