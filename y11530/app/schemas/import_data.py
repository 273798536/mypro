from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ScheduleImport(BaseModel):
    branch_id: str
    branch_name: str
    teller_id: str
    teller_name: str
    schedule_date: datetime
    shift_type: str
    window_number: str
    is_training: bool = False
    training_type: Optional[str] = None
    lunch_start: Optional[datetime] = None
    lunch_end: Optional[datetime] = None
    source_data: Optional[Dict[str, Any]] = None


class LeaveImport(BaseModel):
    branch_id: str
    teller_id: str
    teller_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    leave_days: float
    status: str
    approver: Optional[str] = None
    source_data: Optional[Dict[str, Any]] = None


class ForecastImport(BaseModel):
    branch_id: str
    forecast_date: datetime
    forecast_window: str
    expected_customers: int
    expected_transactions: int
    service_level: str
    source_data: Optional[Dict[str, Any]] = None


class RefundImport(BaseModel):
    branch_id: str
    transaction_id: str
    refund_amount: float
    refund_date: datetime
    teller_id: str
    refund_reason: str
    source_data: Optional[Dict[str, Any]] = None


class InventoryImport(BaseModel):
    branch_id: str
    inventory_date: datetime
    item_type: str
    expected_quantity: int
    actual_quantity: int
    difference: int
    difference_reason: Optional[str] = None
    source_data: Optional[Dict[str, Any]] = None


class ImportResponse(BaseModel):
    created: int
    updated: int
    errors: List[Dict[str, Any]]
