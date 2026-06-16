from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RecordCreate(BaseModel):
    source_material: str = Field(default="", description="来源材料标识")
    prompt_version: str = Field(default="", description="提示词版本")
    content: str = Field(default="", description="评测内容")
    feedback: str = Field(default="", description="人工反馈")
    notes: str = Field(default="", description="备注")


class RecordUpdate(BaseModel):
    source_material: Optional[str] = None
    prompt_version: Optional[str] = None
    content: Optional[str] = None
    feedback: Optional[str] = None
    notes: Optional[str] = None


class StatusTransition(BaseModel):
    status: str = Field(description="目标状态: pending_review / confirmed / rejected")
    changed_by: str = Field(default="evaluator", description="操作人")
    reason: str = Field(default="", description="状态变更原因")


class RecordResponse(BaseModel):
    id: int
    source_material: str
    prompt_version: str
    content: str
    content_hash: str
    status: str
    feedback: str
    notes: str
    created_at: str
    updated_at: str


class VersionLogResponse(BaseModel):
    id: int
    record_id: int
    field_name: str
    old_value: str
    new_value: str
    prompt_version: str
    changed_at: str
    changed_by: str


class SourceTraceResponse(BaseModel):
    id: int
    record_id: int
    source_type: str
    source_ref: str
    prompt_version: str
    snapshot: str
    created_at: str


class DedupResult(BaseModel):
    is_duplicate: bool
    existing_record_id: Optional[int] = None


class ReportItem(BaseModel):
    record: RecordResponse
    category: str = Field(description="ready / needs_review / rejected")
    version_count: int = Field(default=0, description="版本变更次数")
    source_trace_count: int = Field(default=0, description="来源追踪条数")


class ReportExport(BaseModel):
    exported_at: str
    total: int
    ready: List[ReportItem] = Field(description="可直接使用")
    needs_review: List[ReportItem] = Field(description="需评测负责人复核")
    rejected: List[ReportItem] = Field(description="已拒绝/坏数据")
