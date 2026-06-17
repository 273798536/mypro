from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class BatchBase(BaseModel):
    name: str
    description: str = ""


class BatchCreate(BatchBase):
    pass


class Batch(BatchBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    total: int
    items: List[Batch]


class MaterialBase(BaseModel):
    material_type: str
    title: str
    content: str
    answer: str = ""
    source: str = ""
    difficulty: str = "medium"
    knowledge_point: str = ""
    is_old_table: bool = False
    has_supplement_note: bool = False
    missing_unit: bool = False
    is_bias_sample: bool = False
    supplement_note: str = ""
    old_table_version: str = ""


class MaterialCreate(MaterialBase):
    pass


class Material(MaterialBase):
    id: int
    batch_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaterialUpdate(BaseModel):
    title: str = None
    content: str = None
    answer: str = None
    status: str = None
    is_old_table: bool = None
    has_supplement_note: bool = None
    missing_unit: bool = None
    is_bias_sample: bool = None
    supplement_note: str = None
    old_table_version: str = None
    difficulty: str = None
    knowledge_point: str = None


class MaterialImportItem(BaseModel):
    title: str
    content: str
    answer: str = ""
    source: str = ""
    difficulty: str = "medium"
    knowledge_point: str = ""


class BatchImportRequest(BaseModel):
    batch_id: int
    material_type: str
    items: List[MaterialImportItem]


class AgentTraceBase(BaseModel):
    agent_name: str
    agent_role: str = ""
    step_order: int = 0
    input_text: str = ""
    output_text: str = ""
    thought_process: str = ""
    status: str = "completed"
    judgment_before: str = ""
    judgment_after: str = ""
    is_intercepted: bool = False
    interception_reason: str = ""
    cost_time_ms: int = 0
    tokens_used: int = 0


class AgentTraceCreate(AgentTraceBase):
    material_id: int


class AgentTrace(AgentTraceBase):
    id: int
    batch_id: Optional[int] = None
    material_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRecordBase(BaseModel):
    material_id: int
    reviewer: str = ""
    review_type: str = "manual"
    feedback: str = ""
    label: str = ""
    score: float = 0.0
    annotation_source: str = "human"
    has_label_conflict: bool = False
    conflict_with: str = ""
    status: str = "pending"
    review_round: int = 1


class ReviewRecordCreate(ReviewRecordBase):
    pass


class ReviewRecord(ReviewRecordBase):
    id: int
    batch_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LabelConflictBase(BaseModel):
    material_id: int
    original_label: str = ""
    original_source: str = ""
    new_label: str = ""
    new_source: str = ""
    conflict_reason: str = ""


class LabelConflictCreate(LabelConflictBase):
    pass


class LabelConflict(LabelConflictBase):
    id: int
    is_resolved: bool
    final_label: str
    resolved_by: str
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SafetyInterceptionBase(BaseModel):
    material_id: int
    original_judgment: str = ""
    original_score: float = 0.0
    intercepted_judgment: str = ""
    intercepted_score: float = 0.0
    interception_type: str = ""
    interception_level: str = ""
    interception_detail: str = ""


class SafetyInterceptionCreate(SafetyInterceptionBase):
    pass


class SafetyInterception(SafetyInterceptionBase):
    id: int
    trace_id: int
    is_rollback_applied: bool
    rollback_judgment: str
    created_at: datetime

    class Config:
        from_attributes = True


class RollbackRecordBase(BaseModel):
    batch_id: int
    rollback_from_version: str = ""
    rollback_to_version: str = ""
    reason: str = ""
    lost_material_ids: List[int] = []
    lost_material_titles: List[str] = []
    stuck_material_id: Optional[int] = None
    stuck_material_title: str = ""
    stuck_reason: str = ""
    operator: str = ""


class RollbackRecordCreate(RollbackRecordBase):
    pass


class RollbackRecord(RollbackRecordBase):
    id: int
    total_materials_before: int
    total_materials_after: int
    lost_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionReportBase(BaseModel):
    batch_id: int
    title: str = ""
    summary: str = ""


class InspectionReportCreate(InspectionReportBase):
    pass


class InspectionReport(InspectionReportBase):
    id: int
    total_materials: int
    training_count: int
    eval_count: int
    pass_count: int
    fail_count: int
    pending_count: int
    pass_rate: float
    issue_count: int
    interception_count: int
    rollback_affected_count: int
    label_conflict_count: int
    distribution_before: Dict[str, Any] = {}
    distribution_after: Dict[str, Any] = {}
    rollback_stuck_details: Dict[str, Any] = {}
    detail_data: Dict[str, Any] = {}
    export_time: datetime
    exported_by: str

    class Config:
        from_attributes = True


class StatusUpdateRequest(BaseModel):
    status: str
    operator: str = ""


class BatchDetailResponse(BaseModel):
    batch: Batch
    materials: List[Material]
    stats: Dict[str, Any]


class DistributionStats(BaseModel):
    before: Dict[str, int] = {}
    after: Dict[str, int] = {}
    changed_count: int = 0


class ReviewSubmitRequest(BaseModel):
    material_id: int
    reviewer: str
    feedback: str = ""
    label: str = ""
    score: float = 0.0
    has_label_conflict: bool = False
    conflict_with: str = ""
    original_label: str = ""
    review_round: int = 1


class ReportGenerateRequest(BaseModel):
    batch_id: int
    title: str = ""
    exported_by: str = "知识库运营"
