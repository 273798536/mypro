from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from .models import Currency, OrderStatus, ContractStatus, ExposureStatus, AlertType


class ForeignOrderBase(BaseModel):
    order_no: str
    currency: Currency
    amount: float
    order_date: datetime
    expected_settle_date: datetime
    source: str
    created_by: Optional[str] = "system"


class ForeignOrderCreate(ForeignOrderBase):
    pass


class ForeignOrderUpdate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[Currency] = None
    expected_settle_date: Optional[datetime] = None
    status: Optional[OrderStatus] = None
    change_reason: Optional[str] = None
    updated_by: Optional[str] = "system"


class ForeignOrder(ForeignOrderBase):
    id: int
    status: OrderStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ForwardContractBase(BaseModel):
    contract_no: str
    order_id: Optional[int] = None
    currency: Currency
    amount: float
    forward_rate: float
    trade_date: datetime
    settle_date: datetime
    source: str
    created_by: Optional[str] = "system"


class ForwardContractCreate(ForwardContractBase):
    pass


class ForwardContractUpdate(BaseModel):
    status: Optional[ContractStatus] = None
    updated_by: Optional[str] = "system"


class ForwardContract(ForwardContractBase):
    id: int
    status: ContractStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SpotRateBase(BaseModel):
    currency: Currency
    rate: float
    rate_date: datetime
    source: str
    created_by: Optional[str] = "system"


class SpotRateCreate(SpotRateBase):
    pass


class SpotRate(SpotRateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class LimitRuleBase(BaseModel):
    currency: Currency
    single_order_limit: float
    total_exposure_limit: float
    warning_threshold: float = 0.8
    effective_date: datetime
    expiry_date: Optional[datetime] = None
    source: str
    created_by: Optional[str] = "system"


class LimitRuleCreate(LimitRuleBase):
    pass


class LimitRuleUpdate(BaseModel):
    single_order_limit: Optional[float] = None
    total_exposure_limit: Optional[float] = None
    warning_threshold: Optional[float] = None
    is_active: Optional[bool] = None
    updated_by: Optional[str] = "system"


class LimitRule(LimitRuleBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OrderChangeBase(BaseModel):
    order_id: int
    change_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: Optional[str] = None
    changed_by: Optional[str] = "system"


class OrderChangeCreate(OrderChangeBase):
    pass


class OrderChange(OrderChangeBase):
    id: int
    change_date: datetime
    rollback_id: Optional[int] = None

    class Config:
        from_attributes = True


class AlertBase(BaseModel):
    alert_type: AlertType
    severity: str = "warning"
    message: str
    related_order_id: Optional[int] = None
    related_contract_id: Optional[int] = None


class AlertCreate(AlertBase):
    exposure_record_id: Optional[int] = None


class Alert(AlertBase):
    id: int
    is_resolved: bool
    resolution_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertResolve(BaseModel):
    resolution_note: str
    resolved_by: Optional[str] = "system"


class ExposureRecordBase(BaseModel):
    record_date: datetime
    currency: Currency
    total_order_amount: float = 0
    total_contract_amount: float = 0
    net_exposure: float = 0
    net_exposure_cny: float = 0
    coverage_ratio: float = 0
    status: ExposureStatus = ExposureStatus.NORMAL
    calculation_details: Optional[str] = None


class ExposureRecordCreate(ExposureRecordBase):
    spot_rate_id: Optional[int] = None


class ExposureRecord(ExposureRecordBase):
    id: int
    spot_rate_id: Optional[int] = None
    created_at: datetime
    alerts: List[Alert] = []

    class Config:
        from_attributes = True


class ExposureCalculationResult(BaseModel):
    currency: Currency
    total_orders: float
    total_contracts: float
    net_exposure: float
    net_exposure_cny: float
    coverage_ratio: float
    spot_rate: float
    status: ExposureStatus
    limit_usage: float
    alerts: List[Dict[str, Any]] = []
    calculation_details: Dict[str, Any] = {}


class OrderRollbackRequest(BaseModel):
    change_id: int
    rollback_reason: str
    rolled_back_by: Optional[str] = "system"


class ExposureStatusUpdate(BaseModel):
    status: ExposureStatus
    updated_by: Optional[str] = "system"
    note: Optional[str] = None


class AuditLogBase(BaseModel):
    entity_type: str
    entity_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    source: Optional[str] = None
    operator: Optional[str] = "system"


class AuditLog(AuditLogBase):
    id: int
    operation_time: datetime

    class Config:
        from_attributes = True
