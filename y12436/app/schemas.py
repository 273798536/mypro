from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models import AllocationStatus, AuditType


class BunkeringSlipCreate(BaseModel):
    slip_no: str
    vessel_name: str
    port: str
    fuel_type: str
    quantity_mt: float
    unit_price_usd: float
    total_usd: float
    bunkering_date: date
    exchange_rate: Optional[float] = None
    exchange_rate_date: Optional[date] = None
    voyage_id: Optional[int] = None


class BunkeringSlipOut(BunkeringSlipCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoyagePlanCreate(BaseModel):
    voyage_no: str
    vessel_name: str
    departure_port: str
    arrival_port: str
    departure_date: date
    arrival_date: date
    is_supplementary: bool = False


class VoyagePlanOut(VoyagePlanCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HedgeContractCreate(BaseModel):
    contract_no: str
    version: int = 1
    fuel_type: str
    hedge_quantity_mt: float
    hedge_price_usd: float
    start_date: date
    end_date: date
    is_extended: bool = False
    replaced_by_id: Optional[int] = None


class HedgeContractOut(HedgeContractCreate):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PnLAllocationCreate(BaseModel):
    bunkering_slip_id: int
    voyage_id: Optional[int] = None
    hedge_contract_id: Optional[int] = None
    spot_pnl: float = 0.0
    hedge_pnl: float = 0.0
    net_pnl: float = 0.0
    voyage_allocation_amount: float = 0.0
    exchange_rate_used: Optional[float] = None
    exchange_rate_date_used: Optional[date] = None


class PnLAllocationOut(PnLAllocationCreate):
    id: int
    status: AllocationStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AllocationStatusTransition(BaseModel):
    action: str
    operator: str


class AuditTrailOut(BaseModel):
    id: int
    allocation_id: int
    audit_type: AuditType
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ImpactItem(BaseModel):
    allocation_id: int
    bunkering_slip_no: str
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None


class VoyageImpactReport(BaseModel):
    voyage_id: int
    voyage_no: str
    impacted_items: list[ImpactItem]
