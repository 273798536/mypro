from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SourceRef(BaseModel):
    source_file: str
    sheet_name: Optional[str] = None
    row_number: int
    raw_content: Dict[str, Any]


class ChargeRecord(BaseModel):
    id: str
    record_no: Optional[str] = None
    community_name: str
    street_name: Optional[str] = None
    intersection: Optional[str] = None
    address: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    time_period: Optional[str] = None
    peak_type: Optional[str] = None
    scenario_label: Optional[str] = None
    side_note: Optional[str] = None
    screenshot_note: Optional[str] = None
    complaint_content: Optional[str] = None
    complaint_count: int = 1
    unified_note_id: Optional[str] = None
    coord_status: str = "pending"
    coord_verified_address: Optional[str] = None
    coord_deviation_meters: Optional[float] = None
    status: str = "draft"
    conflict_with: Optional[List[str]] = None
    merge_candidate_ids: Optional[List[str]] = None
    merge_status: str = "none"
    merged_into_id: Optional[str] = None
    source_refs: List[SourceRef] = []
    bad_data_flags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    version: int = 1
    import_batch_id: Optional[str] = None


class UnifiedNote(BaseModel):
    id: str
    scenario_label: str
    side_note: str
    screenshot_note: str
    referenced_record_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)


class ImportBatch(BaseModel):
    id: str
    file_name: str
    file_size: int
    uploaded_at: datetime
    total_rows: int
    imported_rows: int
    new_records: int
    updated_records: int
