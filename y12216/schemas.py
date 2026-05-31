from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class RentalContractBase(BaseModel):
    contract_no: str
    lessee: str
    start_date: datetime
    end_date: datetime
    total_deposit: float
    status: str = "active"
    remark: Optional[str] = None

class RentalContractCreate(RentalContractBase):
    pass

class RentalContract(RentalContractBase):
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
    flow_date: datetime
    operator: str
    status: str = "confirmed"
    source: str = "manual"
    remark: Optional[str] = None

class DepositFlowCreate(DepositFlowBase):
    pass

class DepositFlow(DepositFlowBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DeviceLedgerBase(BaseModel):
    device_no: str
    contract_id: int
    device_name: str
    device_model: str
    deposit_amount: float
    device_status: str = "rented"
    rent_date: datetime
    return_date: Optional[datetime] = None
    remark: Optional[str] = None

class DeviceLedgerCreate(DeviceLedgerBase):
    pass

class DeviceLedger(DeviceLedgerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DepositOccupationBase(BaseModel):
    contract_id: int
    occupation_type: str
    occupation_reason: str
    amount: float
    deduction_order: int
    related_device_id: Optional[int] = None
    related_repair_order: Optional[str] = None
    is_transfer: bool = False
    transfer_to_contract: Optional[int] = None
    created_by: str

class DepositOccupationCreate(DepositOccupationBase):
    pass

class DepositOccupation(DepositOccupationBase):
    id: int
    occupation_no: str
    status: str
    has_conflict: bool
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[str] = None
    
    class Config:
        from_attributes = True

class OccupationStatusHistoryBase(BaseModel):
    occupation_id: int
    from_status: str
    to_status: str
    changed_by: str
    remark: Optional[str] = None

class OccupationStatusHistory(OccupationStatusHistoryBase):
    id: int
    changed_at: datetime
    
    class Config:
        from_attributes = True

class ConflictRecordBase(BaseModel):
    occupation_id: int
    conflict_type: str
    description: str
    contract_data: Optional[str] = None
    flow_data: Optional[str] = None
    device_data: Optional[str] = None

class ConflictRecord(ConflictRecordBase):
    id: int
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class OccupationDetailResponse(BaseModel):
    occupation: DepositOccupation
    contract: RentalContract
    device: Optional[DeviceLedger] = None
    status_history: List[OccupationStatusHistory]
    conflict_records: List[ConflictRecord]
    deposit_flows: List[DepositFlow]
