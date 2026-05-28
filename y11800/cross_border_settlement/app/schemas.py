from __future__ import annotations
from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class ClientOrderCreate(BaseModel):
    order_no: str
    client_name: str
    currency: str
    amount: float
    order_date: date
    due_date: Optional[date] = None


class ClientOrderOut(BaseModel):
    id: int
    order_no: str
    client_name: str
    currency: str
    amount: float
    order_date: date
    due_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BankSlipCreate(BaseModel):
    slip_no: str
    order_no: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    slip_date: Optional[date] = None
    bank_ref: Optional[str] = None
    is_split: bool = False
    split_group_id: Optional[str] = None
    fee_deducted: bool = False
    fee_amount: Optional[float] = None


class BankSlipOut(BaseModel):
    id: int
    slip_no: str
    order_no: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    slip_date: Optional[date] = None
    bank_ref: Optional[str] = None
    is_split: bool
    split_group_id: Optional[str] = None
    fee_deducted: bool
    fee_amount: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PlatformBillCreate(BaseModel):
    bill_no: str
    order_no: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    bill_date: Optional[date] = None
    platform_ref: Optional[str] = None


class PlatformBillOut(BaseModel):
    id: int
    bill_no: str
    order_no: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[float] = None
    bill_date: Optional[date] = None
    platform_ref: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettlementOut(BaseModel):
    id: int
    order_id: int
    match_status: str
    original_amount: float
    settled_amount: Optional[float] = None
    currency: str
    exchange_rate: Optional[float] = None
    rate_date: Optional[date] = None
    rate_date_mismatch: bool
    fee_handling: Optional[str] = None
    fee_amount: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    slip_nos: List[str] = []
    bill_nos: List[str] = []

    model_config = {"from_attributes": True}


class SettlementDetailOut(SettlementOut):
    order: ClientOrderOut
    slips: List[BankSlipOut] = []
    bills: List[PlatformBillOut] = []
    logs: List["SettlementLogOut"] = []

    model_config = {"from_attributes": True}


class SettlementLogOut(BaseModel):
    id: int
    settlement_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    operator: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StatusAdvanceRequest(BaseModel):
    to_status: str
    operator: str = "system"
    notes: Optional[str] = None
    exchange_rate: Optional[float] = None
    rate_date: Optional[date] = None
    fee_handling: Optional[str] = None
    fee_amount: Optional[float] = None


class ImportResult(BaseModel):
    imported: int = 0
    skipped_duplicates: int = 0
    warnings: List[str] = []
    corrections: List[str] = []


class BatchImportResult(BaseModel):
    orders: ImportResult = ImportResult()
    bank_slips: ImportResult = ImportResult()
    platform_bills: ImportResult = ImportResult()
