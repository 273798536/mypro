from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class QuestionBase(BaseModel):
    question_no: str = Field(..., max_length=100)
    title: str = Field(..., max_length=500)
    formula: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    formula: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class QuestionResponse(QuestionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ParameterVersionBase(BaseModel):
    question_id: int
    version_no: str = Field(..., max_length=50)
    param_name: str = Field(..., max_length=200)
    param_value: Optional[str] = None
    unit: Optional[str] = None
    boundary_condition: Optional[str] = None
    description: Optional[str] = None
    data_type: str = "string"
    remark: Optional[str] = None


class ParameterVersionCreate(ParameterVersionBase):
    created_by: Optional[str] = None


class ParameterVersionUpdate(BaseModel):
    param_value: Optional[str] = None
    unit: Optional[str] = None
    boundary_condition: Optional[str] = None
    description: Optional[str] = None
    remark: Optional[str] = None


class ParameterVersionResponse(ParameterVersionBase):
    id: int
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class SupplementRecordBase(BaseModel):
    question_id: int
    batch_no: Optional[str] = None
    supplement_type: str = Field(..., max_length=100)
    content: Optional[str] = None
    source: Optional[str] = None
    remark: Optional[str] = None


class SupplementRecordCreate(SupplementRecordBase):
    recorded_by: Optional[str] = None


class SupplementRecordResponse(SupplementRecordBase):
    id: int
    recorded_by: Optional[str] = None
    recorded_at: datetime

    class Config:
        from_attributes = True


class ImportItemResponse(BaseModel):
    id: int
    row_no: Optional[int] = None
    item_key: Optional[str] = None
    status: str
    detail: Optional[Dict[str, Any]] = None
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class ImportRecordResponse(BaseModel):
    id: int
    batch_no: str
    file_name: str
    file_hash: str
    file_size: Optional[int] = None
    import_type: str
    total_count: int
    new_count: int
    skipped_count: int
    updated_count: int
    error_count: int
    sort_stable: bool
    status: str
    error_message: Optional[str] = None
    missing_materials: Optional[str] = None
    imported_by: Optional[str] = None
    imported_at: datetime
    detail: Optional[Dict[str, Any]] = None
    items: List[ImportItemResponse] = []

    class Config:
        from_attributes = True


class ChangeLogResponse(BaseModel):
    id: int
    parameter_id: Optional[int] = None
    target_type: str
    target_id: int
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime
    batch_no: Optional[str] = None
    remark: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewEntryResponse(BaseModel):
    question: QuestionResponse
    parameters: List[ParameterVersionResponse]
    supplements: List[SupplementRecordResponse]
    change_logs: List[ChangeLogResponse]


class ImportSummary(BaseModel):
    batch_no: str
    total: int
    new: int
    skipped: int
    updated: int
    errors: int
    is_duplicate_batch: bool
    duplicate_reason: Optional[str] = None
    new_items: List[Dict[str, Any]] = []
    skipped_items: List[Dict[str, Any]] = []
