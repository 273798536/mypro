from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class ImportSourceResponse(BaseModel):
    id: int
    source_filename: str
    file_hash: Optional[str] = None
    import_type: str
    uploaded_by: Optional[int] = None
    uploader_name: Optional[str] = None
    total_rows: int
    success_count: int
    failed_count: int
    error_log: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportRowError(BaseModel):
    row_number: int
    error: str
    data: dict


class ImportResult(BaseModel):
    import_source_id: int
    total_rows: int
    success_count: int
    failed_count: int
    errors: List[ImportRowError] = []
    warnings: List[str] = []
