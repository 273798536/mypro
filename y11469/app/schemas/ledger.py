from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.core.enums import RecordStatus, DataSourceType, RoleType, FabricStatus, ImportResult


class StatusHistoryBase(BaseModel):
    from_status: Optional[str] = None
    to_status: str
    transition_reason: str
    operator: str
    operator_role: str
    extra_info: Optional[Dict[str, Any]] = None


class StatusHistoryCreate(StatusHistoryBase):
    ledger_record_id: int


class StatusHistory(StatusHistoryBase):
    id: int
    operated_at: datetime

    class Config:
        from_attributes = True


class LedgerRecordBase(BaseModel):
    style_code: str
    style_name: Optional[str] = None
    version: int = 1
    parent_version_id: Optional[int] = None
    designer: Optional[str] = None
    pattern_maker: Optional[str] = None
    sample_maker: Optional[str] = None
    warehouse_keeper: Optional[str] = None
    fabric_code: Optional[str] = None
    fabric_name: Optional[str] = None
    fabric_quantity: Optional[float] = None
    fabric_unit: str = "米"
    remarks: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class LedgerRecordCreate(LedgerRecordBase):
    record_no: Optional[str] = None


class LedgerRecordUpdate(BaseModel):
    style_name: Optional[str] = None
    designer: Optional[str] = None
    pattern_maker: Optional[str] = None
    sample_maker: Optional[str] = None
    warehouse_keeper: Optional[str] = None
    fabric_code: Optional[str] = None
    fabric_name: Optional[str] = None
    fabric_quantity: Optional[float] = None
    remarks: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class LedgerRecord(LedgerRecordBase):
    id: int
    record_no: str
    status: str
    current_role: Optional[str] = None
    fabric_status: str
    is_frozen: bool
    frozen_at: Optional[datetime] = None
    frozen_by: Optional[str] = None
    freeze_reason: Optional[str] = None
    manual_adjusted: bool
    adjust_count: int
    last_adjusted_at: Optional[datetime] = None
    last_adjusted_by: Optional[str] = None
    adjust_reason: Optional[str] = None
    sensitive_fields_masked: bool
    export_count: int
    last_exported_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    status_history: List[StatusHistory] = []

    class Config:
        from_attributes = True


class StatusTransitionRequest(BaseModel):
    target_status: str
    transition_reason: str
    operator: str
    operator_role: str
    extra_info: Optional[Dict[str, Any]] = None


class FreezeRequest(BaseModel):
    freeze_reason: str
    operator: str
    operator_role: str


class ManualAdjustRequest(BaseModel):
    adjust_reason: str
    operator: str
    operator_role: str
    updates: Dict[str, Any]


class ImportSourceData(BaseModel):
    source_type: str
    source_file: str
    source_row_number: int
    original_raw_data: str
    parsed_data: Dict[str, Any]


class ImportResultResponse(BaseModel):
    batch_id: str
    total_count: int
    success_count: int
    failed_count: int
    import_result: str
    error_details: List[Dict[str, Any]] = []


class ProcessingChainNode(BaseModel):
    version: int
    ledger_id: int
    record_no: str
    status: str
    modification_reason: Optional[str] = None
    fabric_records: List[Dict[str, Any]] = []


class ProcessingChainResponse(BaseModel):
    id: int
    chain_no: str
    style_code: str
    root_ledger_id: int
    chain_nodes: List[ProcessingChainNode] = []
    version_path: str
    has_old_fabric_issue: bool
    old_fabric_records: List[Dict[str, Any]] = []
    responsibility_analysis: Optional[str] = None
    chain_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class RoleViewRequest(BaseModel):
    role: str
    style_code: Optional[str] = None
    status: Optional[str] = None


class ExportRequest(BaseModel):
    record_ids: List[int]
    export_format: str = "excel"
    mask_sensitive: bool = True
    operator: str
    operator_role: str


class DuplicateCheckRequest(BaseModel):
    style_code: str
    version: Optional[int] = None
    source_type: Optional[str] = None
    source_identifier: Optional[str] = None


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    existing_records: List[Dict[str, Any]] = []
    suggestion: str
