from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class AttachmentResponse(BaseModel):
    id: str
    batch_id: str
    original_name: str
    file_name: str
    file_path: str
    file_size: Optional[str] = None
    file_type: Optional[str] = None
    attachment_type: str
    description: Optional[str] = None
    upload_operator: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AttachmentListResponse(BaseModel):
    total: int
    items: List[AttachmentResponse]


class ZipParseResponse(BaseModel):
    inspection_records: List[dict] = Field(default_factory=list)
    calibration_certificates: List[dict] = Field(default_factory=list)
    repair_quotes: List[dict] = Field(default_factory=list)
    price_adjustments: List[dict] = Field(default_factory=list)
    extracted_files: List[dict] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class ZipImportResponse(BaseModel):
    parsed_data: ZipParseResponse
    import_results: dict


class AttachmentType(str):
    INSPECTION_RECORD = "inspection_record"
    CALIBRATION_CERTIFICATE = "calibration_certificate"
    REPAIR_QUOTE = "repair_quote"
    PRICE_ADJUSTMENT = "price_adjustment"
    HISTORY_ARCHIVE = "history_archive"
    OTHER = "other"
