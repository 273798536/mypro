from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AccountBase(BaseModel):
    account_no: str
    customer_name: str
    total_assets: float = 0.0
    total_debt: float = 0.0
    available_cash: float = 0.0
    margin_line: float = 130.0
    warning_line: float = 150.0
    status: str = "active"
    remark: Optional[str] = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    total_assets: Optional[float] = None
    total_debt: Optional[float] = None
    available_cash: Optional[float] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class Account(AccountBase):
    id: str
    current_margin_ratio: Optional[float] = None
    risk_level: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PositionBase(BaseModel):
    account_id: str
    stock_code: str
    stock_name: str
    quantity: int
    market_value: float
    cost_price: float
    is_suspended: bool = False
    suspended_price: Optional[float] = None


class PositionCreate(PositionBase):
    pass


class PositionUpdate(BaseModel):
    quantity: Optional[int] = None
    market_value: Optional[float] = None
    cost_price: Optional[float] = None
    is_suspended: Optional[bool] = None
    suspended_price: Optional[float] = None


class Position(PositionBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuoteSnapshotBase(BaseModel):
    stock_code: str
    stock_name: str
    snapshot_date: str
    snapshot_time: str
    current_price: float
    pre_close_price: float
    high_price: float
    low_price: float
    is_suspended: bool = False


class QuoteSnapshotCreate(QuoteSnapshotBase):
    pass


class QuoteSnapshot(QuoteSnapshotBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class MarginRateBase(BaseModel):
    stock_code: str
    stock_name: str
    collateral_rate: float
    effective_date: str
    expiry_date: Optional[str] = None
    is_active: bool = True
    remark: Optional[str] = None


class MarginRateCreate(MarginRateBase):
    pass


class MarginRateUpdate(BaseModel):
    collateral_rate: Optional[float] = None
    expiry_date: Optional[str] = None
    is_active: Optional[bool] = None
    remark: Optional[str] = None


class MarginRate(MarginRateBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarginCallDetailBase(BaseModel):
    stock_code: str
    stock_name: str
    quantity: int
    market_value: float
    collateral_rate: float
    collateral_value: float
    is_suspended: bool = False
    is_rate_expired: bool = False
    original_collateral_rate: Optional[float] = None
    is_modified: bool = False
    modified_by: Optional[str] = None


class MarginCallDetailCreate(MarginCallDetailBase):
    pass


class MarginCallDetailUpdate(BaseModel):
    collateral_rate: Optional[float] = None
    collateral_value: Optional[float] = None
    is_modified: bool = False
    modified_by: Optional[str] = None


class MarginCallDetail(MarginCallDetailBase):
    id: str
    margin_call_id: str
    modified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MarginCallBase(BaseModel):
    account_id: str
    call_date: str
    margin_ratio: float
    required_deposit: float
    deadline: str
    status: str = "pending"
    risk_level: str = "warning"
    notification_status: str = "pending"
    is_duplicate: bool = False
    has_expired_rate: bool = False
    has_suspended_stock: bool = False
    next_action: Optional[str] = None
    remark: Optional[str] = None


class MarginCallCreate(MarginCallBase):
    details: List[MarginCallDetailCreate] = []


class MarginCallUpdate(BaseModel):
    status: Optional[str] = None
    notification_status: Optional[str] = None
    next_action: Optional[str] = None
    remark: Optional[str] = None


class MarginCall(MarginCallBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    details: List[MarginCallDetail] = []

    class Config:
        from_attributes = True


class MarginCallCalculationRequest(BaseModel):
    account_id: str
    call_date: str
    snapshot_date: Optional[str] = None


class BatchImportRequest(BaseModel):
    data_type: str
    data: List[dict]


class StatusChangeLog(BaseModel):
    margin_call_id: str
    old_status: str
    new_status: str
    changed_by: str
    changed_at: datetime
    remark: Optional[str] = None
