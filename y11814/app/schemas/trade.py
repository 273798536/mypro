from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.trade import TradeStatus


class TradeBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trade_date: date
    trade_code: str
    stock_code: str
    stock_name: str
    quantity: int
    price: float
    amount: float
    buyer_account: str
    buyer_seat_code: str
    buyer_branch: Optional[str] = None
    seller_account: str
    seller_seat_code: str
    seller_branch: Optional[str] = None
    remarks: Optional[str] = None


class TradeCreate(TradeBase):
    agreement_id: Optional[int] = None
    seat_info_id: Optional[int] = None
    restriction_rule_id: Optional[int] = None


class TradeUpdate(BaseModel):
    status: Optional[str] = None
    is_locked: Optional[bool] = None
    remarks: Optional[str] = None


class TradeResponse(TradeBase):
    id: int
    status: str
    is_locked: bool
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None
    agreement_id: Optional[int] = None
    seat_info_id: Optional[int] = None
    restriction_rule_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class TradeListResponse(BaseModel):
    total: int
    items: List[TradeResponse]


class TradeAgreementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agreement_no: str
    agreement_date: date
    trade_date: date
    stock_code: str
    stock_name: str
    quantity: int
    price: float
    amount: float
    buyer_account: str
    buyer_seat_code: str
    buyer_contact: Optional[str] = None
    seller_account: str
    seller_seat_code: str
    seller_contact: Optional[str] = None
    settlement_method: str = "净额结算"
    payment_deadline: date


class TradeAgreementCreate(TradeAgreementBase):
    pass


class TradeAgreementResponse(TradeAgreementBase):
    id: int
    created_at: datetime
    updated_at: datetime


class SeatInfoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    seat_code: str
    seat_name: str
    branch_name: str
    account_number: str
    account_name: str
    is_active: bool = True
    valid_from: date
    valid_to: Optional[date] = None


class SeatInfoCreate(SeatInfoBase):
    pass


class SeatInfoResponse(SeatInfoBase):
    id: int
    created_at: datetime
    updated_at: datetime


class RestrictionRuleBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_code: str
    rule_name: str
    stock_code: str
    restricted_account: str
    restriction_type: str
    restriction_quantity: int
    released_quantity: int = 0
    remaining_quantity: int
    restriction_start_date: date
    restriction_end_date: date
    is_active: bool = True


class RestrictionRuleCreate(RestrictionRuleBase):
    pass


class RestrictionRuleResponse(RestrictionRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime


class FundRecordBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trade_id: int
    record_no: str
    received_amount: float
    received_date: date
    received_time: datetime
    payer_account: Optional[str] = None
    payer_bank: Optional[str] = None
    settlement_status: str = "已到账"


class FundRecordCreate(FundRecordBase):
    pass


class FundRecordResponse(FundRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime


class VerificationRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trade_id: int
    verification_type: str
    verification_result: str
    conclusion: str
    detail: Optional[str] = None
    suggested_action: Optional[str] = None
    verified_by: str
    verified_at: datetime


class TraceLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trade_id: int
    verification_record_id: int
    material_source: str
    material_id: int
    material_field: Optional[str] = None
    material_value: Optional[str] = None
    description: str


class StatusTransitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trade_id: int
    from_status: str
    to_status: str
    transition_reason: str
    operator: str
    transition_at: datetime


class TradeDetailResponse(BaseModel):
    trade: TradeResponse
    agreement: Optional[TradeAgreementResponse] = None
    seat_info: Optional[SeatInfoResponse] = None
    restriction_rule: Optional[RestrictionRuleResponse] = None
    fund_records: List[FundRecordResponse]
    verification_records: List[VerificationRecordResponse]
    trace_logs: List[TraceLogResponse]
    status_transitions: List[StatusTransitionResponse]


class VerificationRequest(BaseModel):
    trade_id: int
    operator: str = "system"


class VerificationConclusionResponse(BaseModel):
    trade_id: int
    final_status: str
    verification_records: List[VerificationRecordResponse]
    suggested_next_action: Optional[str] = None


class LockRequest(BaseModel):
    trade_id: int
    operator: str
    lock: bool = True


class ExportRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    stock_code: Optional[str] = None


class ExportResponse(BaseModel):
    total: int
    export_time: datetime
    data: List[TradeDetailResponse]
