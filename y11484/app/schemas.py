from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class SampleLabelBase(BaseModel):
    batch_no: str
    product_name: str
    production_time: datetime
    sample_time: datetime
    sampler: str
    storage_location: str


class SampleLabelCreate(SampleLabelBase):
    pass


class SampleLabelUpdate(BaseModel):
    product_name: Optional[str] = None
    production_time: Optional[datetime] = None
    sample_time: Optional[datetime] = None
    sampler: Optional[str] = None
    storage_location: Optional[str] = None


class SampleLabel(SampleLabelBase):
    id: int
    status: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class TemperatureRecordBase(BaseModel):
    sample_label_id: int
    record_time: datetime
    temperature: float
    recorder: str


class TemperatureRecordCreate(TemperatureRecordBase):
    pass


class TemperatureRecord(TemperatureRecordBase):
    id: int
    status: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StoreComplaintBase(BaseModel):
    sample_label_id: Optional[int] = None
    store_id: str
    store_name: str
    complaint_type: str
    complaint_desc: str
    complaint_time: datetime
    handler: str


class StoreComplaintCreate(StoreComplaintBase):
    pass


class StoreComplaint(StoreComplaintBase):
    id: int
    status: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScanRecordBase(BaseModel):
    sample_label_id: Optional[int] = None
    store_id: str
    store_name: str
    scan_time: datetime
    scanner: str
    quantity: int


class ScanRecordCreate(ScanRecordBase):
    pass


class ScanRecord(ScanRecordBase):
    id: int
    status: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuditLogBase(BaseModel):
    sample_label_id: int
    action_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    change_reason: Optional[str] = None
    operator: str
    operator_role: str
    sensitive_fields_changed: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLog(AuditLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FailedRecordBase(BaseModel):
    source_type: str
    source_data: str
    error_message: str


class FailedRecord(FailedRecordBase):
    id: int
    failed_at: datetime
    processed: bool

    class Config:
        from_attributes = True


class StatusChangeRequest(BaseModel):
    new_status: str
    change_reason: str
    operator: str
    operator_role: str
    ip_address: Optional[str] = None


class BatchTraceResult(BaseModel):
    batch_no: str
    product_name: str
    stores: List[dict]
    temperature_records: List[dict]
    complaints: List[dict]
    scan_records: List[dict]
    audit_logs: List[dict]


class ReportSummary(BaseModel):
    total_samples: int
    draft_count: int
    submitted_count: int
    confirmed_count: int
    rejected_count: int
    abnormal_temp_count: int
    complaint_count: int
    total_store_scans: int


class DataImportResponse(BaseModel):
    success_count: int
    failed_count: int
    failed_records: List[FailedRecord]
