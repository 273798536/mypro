from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class DataDictionaryBase(BaseModel):
    table_name: str
    column_name: str
    data_type: Optional[str] = None
    expected_timezone: Optional[str] = None
    description: Optional[str] = None


class DataDictionaryCreate(DataDictionaryBase):
    pass


class DataDictionaryItem(DataDictionaryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceRecordBase(BaseModel):
    source_table: str
    source_row_number: Optional[int] = None
    source_file: Optional[str] = None
    source_remark: Optional[str] = None
    import_batch: Optional[str] = None
    column_name: Optional[str] = None
    column_value: Optional[str] = None
    detected_timezone: Optional[str] = None
    record_hash: Optional[str] = None
    is_supplement: bool = False


class SourceRecordCreate(SourceRecordBase):
    pass


class SourceRecordItem(SourceRecordBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessLogBase(BaseModel):
    source_record_id: int
    process_type: str
    process_batch: Optional[str] = None
    operator: Optional[str] = None
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    timezone_before: Optional[str] = None
    timezone_after: Optional[str] = None
    remark: Optional[str] = None


class ProcessLogCreate(ProcessLogBase):
    pass


class ProcessLogItem(ProcessLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AuditConclusionBase(BaseModel):
    source_record_id: int
    dictionary_id: Optional[int] = None
    audit_type: str
    status: str
    conclusion: Optional[str] = None
    index_valid: bool = True
    is_duplicate: bool = False
    duplicate_of_id: Optional[int] = None
    auditor: Optional[str] = None


class AuditConclusionCreate(AuditConclusionBase):
    pass


class AuditConclusionItem(AuditConclusionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TraceChain(BaseModel):
    conclusion: AuditConclusionItem
    source_record: SourceRecordItem
    dictionary: Optional[DataDictionaryItem] = None
    process_logs: List[ProcessLogItem] = []


class BackupCheckResult(BaseModel):
    total_records: int
    index_invalid_count: int
    timezone_mismatch_count: int
    duplicate_count: int
    supplement_count: int
    details: List[AuditConclusionItem] = []


class PermissionAuditResult(BaseModel):
    total_records: int
    unauthorized_batches: List[str] = []
    unverified_supplements: int
    auditor_coverage: dict = {}
    details: List[AuditConclusionItem] = []
