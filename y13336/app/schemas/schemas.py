from datetime import datetime
from pydantic import BaseModel
from app.models.models import BatchStatus, RecallSide, OverrideStatus, MaterialType, LeakStatus


class GrayBatchCreate(BaseModel):
    name: str
    old_model_version: str
    new_model_version: str


class GrayBatchOut(BaseModel):
    id: str
    name: str
    old_model_version: str
    new_model_version: str
    status: BatchStatus
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class RecallResultCreate(BaseModel):
    batch_id: str
    side: RecallSide
    query_id: str
    query_text: str
    doc_id: str
    doc_title: str
    rank: int
    score: float | None = None
    meta: dict | None = None


class RecallResultOut(RecallResultCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OverrideCreate(BaseModel):
    batch_id: str
    query_id: str
    doc_id: str
    original_side: RecallSide
    original_judgment: str
    override_judgment: str
    reason: str = ""
    source: str
    operator: str


class OverrideOut(OverrideCreate):
    id: str
    status: OverrideStatus
    superseded_by: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaterialCreate(BaseModel):
    batch_id: str
    material_type: MaterialType
    title: str
    content: str = ""
    linked_query_id: str | None = None
    linked_doc_id: str | None = None
    operator: str


class MaterialOut(MaterialCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LeakMarkCreate(BaseModel):
    batch_id: str
    query_id: str
    doc_id: str
    impact_scope: str = ""
    source_line: str = ""
    operator: str


class LeakMarkOut(LeakMarkCreate):
    id: str
    status: LeakStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiffItem(BaseModel):
    query_id: str
    query_text: str
    old_docs: list[RecallResultOut]
    new_docs: list[RecallResultOut]


class BatchDiffResponse(BaseModel):
    batch_id: str
    only_in_old: list[DiffItem]
    only_in_new: list[DiffItem]
    rank_changed: list[DiffItem]


class OverrideTraceItem(BaseModel):
    override_id: str
    query_id: str
    doc_id: str
    original_judgment: str
    override_judgment: str
    source: str
    status: OverrideStatus
    superseded_by: str | None = None
    created_at: datetime
    updated_at: datetime


class OverrideTraceResponse(BaseModel):
    query_id: str
    doc_id: str
    current_override: OverrideTraceItem | None
    history: list[OverrideTraceItem]


class DashboardStatus(BaseModel):
    batch_id: str
    batch_name: str
    total_queries: int
    overrides_total: int
    overrides_accepted: int
    overrides_pending: int
    leaks_suspected: int
    leaks_confirmed: int
    materials_count: int


class BatchComparison(BaseModel):
    batch_a_id: str
    batch_b_id: str
    queries_in_both: int
    overrides_only_in_a: int
    overrides_only_in_b: int
    shared_override_diff: int
