from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LeaseContractBase(BaseModel):
    contract_no: str
    tenant_name: str
    room_no: str
    monthly_rent: float
    deposit_amount: float
    rent_free_days: int = 0
    lease_start_date: datetime
    lease_end_date: datetime
    check_out_date: Optional[datetime] = None
    status: str = "active"


class LeaseContractCreate(LeaseContractBase):
    pass


class LeaseContract(LeaseContractBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepositFlowBase(BaseModel):
    flow_no: str
    contract_id: int
    flow_type: str
    amount: float
    occurred_at: datetime
    remark: Optional[str] = None
    operator: Optional[str] = None


class DepositFlowCreate(DepositFlowBase):
    pass


class DepositFlow(DepositFlowBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UtilityBillBase(BaseModel):
    bill_no: str
    contract_id: int
    bill_period: str
    water_fee: float = 0
    electricity_fee: float = 0
    gas_fee: float = 0
    other_fee: float = 0
    total_amount: float
    is_paid: bool = False
    billed_at: datetime
    remark: Optional[str] = None


class UtilityBillCreate(UtilityBillBase):
    pass


class UtilityBill(UtilityBillBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RepairOrderBase(BaseModel):
    order_no: str
    contract_id: int
    repair_type: str
    description: Optional[str] = None
    repair_cost: float = 0
    is_tenant_responsible: Optional[bool] = None
    status: str = "pending"
    reported_at: datetime
    completed_at: Optional[datetime] = None
    remark: Optional[str] = None


class RepairOrderCreate(RepairOrderBase):
    pass


class RepairOrder(RepairOrderBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DepositLedgerItemBase(BaseModel):
    item_type: str
    deduction_order: int
    amount: float
    description: str
    source_type: str
    source_id: Optional[int] = None
    deposit_flow_id: Optional[int] = None
    utility_bill_id: Optional[int] = None
    repair_order_id: Optional[int] = None


class DepositLedgerItemCreate(DepositLedgerItemBase):
    pass


class DepositLedgerItem(DepositLedgerItemBase):
    id: int
    created_at: datetime
    deposit_flow: Optional[DepositFlow] = None
    utility_bill: Optional[UtilityBill] = None
    repair_order: Optional[RepairOrder] = None

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    ledger_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: int
    changed_at: datetime

    class Config:
        from_attributes = True


class DisputeBase(BaseModel):
    ledger_id: int
    dispute_type: str
    description: str
    status: str = "pending"
    next_verifier: str
    raised_by: Optional[str] = None
    resolution: Optional[str] = None


class DisputeCreate(DisputeBase):
    pass


class DisputeUpdate(BaseModel):
    status: Optional[str] = None
    next_verifier: Optional[str] = None
    resolution: Optional[str] = None


class Dispute(DisputeBase):
    id: int
    raised_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepositLedgerBase(BaseModel):
    ledger_no: str
    contract_id: int
    total_deposit: float
    total_deduction: float = 0
    refund_amount: float = 0
    status: str = "calculating"
    disputed: bool = False
    dispute_status: Optional[str] = None
    next_verifier: Optional[str] = None
    rent_free_adjustment: float = 0
    is_rent_free_pending: bool = False
    calculated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    remark: Optional[str] = None


class DepositLedgerCreate(DepositLedgerBase):
    pass


class DepositLedgerUpdate(BaseModel):
    status: Optional[str] = None
    disputed: Optional[bool] = None
    dispute_status: Optional[str] = None
    next_verifier: Optional[str] = None
    rent_free_adjustment: Optional[float] = None
    is_rent_free_pending: Optional[bool] = None
    confirmed_at: Optional[datetime] = None
    remark: Optional[str] = None
    changed_by: Optional[str] = None
    change_reason: Optional[str] = None


class DepositLedgerCalculate(BaseModel):
    contract_id: int
    ledger_no: str
    changed_by: Optional[str] = "system"


class DepositLedger(DepositLedgerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    contract: Optional[LeaseContract] = None
    ledger_items: List[DepositLedgerItem] = []
    audit_logs: List[AuditLog] = []
    disputes: List[Dispute] = []

    class Config:
        from_attributes = True


class MonthlyExportItem(BaseModel):
    ledger_no: str
    contract_no: str
    tenant_name: str
    room_no: str
    total_deposit: float
    total_deduction: float
    refund_amount: float
    status: str
    disputed: bool
    dispute_count: int
    calculated_at: Optional[datetime]
    confirmed_at: Optional[datetime]


class TraceResult(BaseModel):
    ledger: DepositLedger
    related_flows: List[DepositFlow]
    related_bills: List[UtilityBill]
    related_repairs: List[RepairOrder]
