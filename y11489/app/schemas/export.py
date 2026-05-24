from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class ExportRequest(BaseModel):
    export_type: str = Field(..., description="inspection|rework|shift|price|all")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status_filter: Optional[List[str]] = None
    batch_no: Optional[str] = None
    machine_id: Optional[str] = None
    include_raw_data: bool = False
    include_change_history: bool = False
    mask_sensitive_fields: bool = True
    format: str = Field("xlsx", description="xlsx|csv|json")


class ExportResponse(BaseModel):
    id: int
    export_no: str
    export_type: str
    record_count: int
    is_sensitive_masked: int
    include_raw_data: int
    include_change_history: int
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    exported_by: Optional[int] = None
    exporter_name: Optional[str] = None
    exported_at: datetime
    frozen_at: Optional[datetime] = None
    status: str
    download_url: Optional[str] = None

    class Config:
        from_attributes = True
