from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


class EnterpriseIn(BaseModel):
    enterprise_code: str
    name: str
    credit_code: Optional[str] = None
    account_id: Optional[str] = None
    initial_balance: Decimal = Field(default=0, decimal_places=4)


class EnterpriseOut(BaseModel):
    id: int
    enterprise_code: str
    name: str
    credit_code: Optional[str]
    account_id: Optional[str]
    initial_balance: Decimal
    current_balance: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class EnergyReadingIn(BaseModel):
    enterprise_code: str
    reading_date: date
    energy_type: str
    value: Decimal
    unit: str = "kWh"
    source: Optional[str] = None


class CreditTransactionIn(BaseModel):
    enterprise_code: str
    transaction_no: str
    credit_type: Optional[str] = None
    amount: Decimal
    direction: str
    transaction_date: date
    source: Optional[str] = None


class InvoiceIn(BaseModel):
    enterprise_code: str
    invoice_no: str
    amount: Decimal
    issue_date: date
    is_red_flush: bool = False
    original_invoice_no: Optional[str] = None
    tax_amount: Decimal = 0
    source: Optional[str] = None


class ReceiptIn(BaseModel):
    enterprise_code: str
    receipt_no: str
    amount: Decimal
    receipt_date: date
    source: Optional[str] = None


class ClearingTableIn(BaseModel):
    enterprise_code: str
    period: str
    opening_balance: Decimal = 0
    total_in: Decimal = 0
    total_out: Decimal = 0
    closing_balance: Decimal = 0
    remark: Optional[str] = None


class ImportBatchOut(BaseModel):
    id: int
    batch_no: str
    source_type: str
    source_file: Optional[str]
    record_count: int
    operator: Optional[str]
    remark: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ImportResponse(BaseModel):
    batch_no: str
    source_type: str
    record_count: int
    message: str


class CorrectionLogOut(BaseModel):
    id: int
    enterprise_id: int
    target_table: str
    target_id: int
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    reason: Optional[str]
    operator: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyOut(BaseModel):
    id: int
    reconciliation_id: int
    enterprise_id: int
    anomaly_type: str
    severity: str
    description: str
    target_table: Optional[str]
    target_id: Optional[int]
    status: str
    resolution_note: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ReconciliationItemOut(BaseModel):
    id: int
    reconciliation_id: int
    enterprise_id: int
    opening_balance: Decimal
    period_in: Decimal
    period_out: Decimal
    red_flush_adjustment: Decimal
    calculated_closing: Decimal
    reported_closing: Decimal
    balance_diff: Decimal
    cross_month_readings: int
    duplicate_credits: int
    red_flush_unapplied: int
    receipts_unverified: int
    has_anomaly: bool
    remark: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReconciliationOut(BaseModel):
    id: int
    period: str
    status: str
    total_enterprises: int
    anomalies_found: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    operator: Optional[str]
    remark: Optional[str]
    created_at: datetime
    items: List[ReconciliationItemOut] = []
    anomalies: List[AnomalyOut] = []

    class Config:
        from_attributes = True


class ReconciliationRunRequest(BaseModel):
    period: str
    operator: Optional[str] = None
    auto_apply_red_flush: bool = True
    remark: Optional[str] = None


class AnomalyResolveRequest(BaseModel):
    status: str = "resolved"
    resolution_note: str


class AnomalyResolveResponse(BaseModel):
    id: int
    status: str
    resolution_note: str


class AuditReportOut(BaseModel):
    reconciliation_id: int
    period: str
    generated_at: datetime
    summary: dict
    items: List[ReconciliationItemOut]
    anomalies: List[AnomalyOut]


class EnterpriseHistoryOut(BaseModel):
    enterprise: EnterpriseOut
    corrections: List[CorrectionLogOut]
    reconciliations: List[ReconciliationItemOut]