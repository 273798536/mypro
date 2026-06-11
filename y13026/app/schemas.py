from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import PlaybackStatus, SourceType
import enum


class BatchCreate(BaseModel):
    batch_no: str = Field(..., description="批次号，同一批材料跑两遍用同一个批次号")
    operator: Optional[str] = Field(None, description="操作人")
    remark: Optional[str] = Field(None, description="批次备注")


class BatchDetail(BaseModel):
    id: int
    batch_no: str
    run_index: int
    operator: Optional[str]
    remark: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DetailCreate(BaseModel):
    detail_no: str
    broker_name: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    risk_level: Optional[str] = None
    transaction_amount: Optional[str] = None
    previous_conclusion: Optional[str] = None
    current_conclusion: Optional[str] = None


class SourceMaterialUpload(BaseModel):
    source_type: SourceType
    raw_content: str
    filename: Optional[str] = None
    uploaded_by: Optional[str] = None


class SourceMaterialDetail(BaseModel):
    id: int
    source_type: str
    raw_content: str
    parsed_data: Optional[dict] = None
    parse_status: str
    parse_error: Optional[str] = None
    filename: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConclusionHistoryEntry(BaseModel):
    id: int
    conclusion: str
    change_reason: Optional[str]
    changed_by: Optional[str]
    source_material_id: Optional[int]
    sequence: int
    created_at: datetime

    class Config:
        from_attributes = True


class DetailRemarkCreate(BaseModel):
    content: str
    remarked_by: Optional[str] = None


class DetailRemarkDetail(BaseModel):
    id: int
    content: str
    remarked_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ManualOverride(BaseModel):
    new_conclusion: str
    reason: str
    operator: Optional[str] = None


class PlaybackDetailFull(BaseModel):
    id: int
    batch_id: int
    detail_no: str
    broker_name: Optional[str]
    customer_name: Optional[str]
    product_name: Optional[str]
    risk_level: Optional[str]
    transaction_amount: Optional[str]
    previous_conclusion: Optional[str]
    current_conclusion: Optional[str]
    status: str
    is_split_repayment: bool
    repayment_split_hint: Optional[str]
    created_at: datetime
    updated_at: datetime
    sources: List[SourceMaterialDetail] = []
    conclusion_history: List[ConclusionHistoryEntry] = []
    remarks: List[DetailRemarkDetail] = []

    class Config:
        from_attributes = True
