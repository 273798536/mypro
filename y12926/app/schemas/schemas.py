from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class BatchBase(BaseModel):
    batch_name: str = Field(..., description="批次名称")
    remark: Optional[str] = Field(None, description="备注")
    importer: Optional[str] = Field("system", description="导入人")


class BatchCreate(BatchBase):
    pass


class BatchInfo(BaseModel):
    id: int
    batch_no: str
    batch_name: str
    status: str
    total_count: int
    valid_count: int
    duplicate_count: int
    conflict_count: int
    rollback_count: int
    current_round: int
    importer: str
    remark: Optional[str]
    last_operation: Optional[str]
    last_operator: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatchDetail(BatchInfo):
    materials: List["MaterialSourceInfo"] = []

    class Config:
        from_attributes = True


class MaterialSourceBase(BaseModel):
    material_name: str
    material_type: Optional[str] = None
    sheet_name: Optional[str] = None
    source_row: Optional[int] = None
    import_order: int = 0
    remark: Optional[str] = None


class MaterialSourceInfo(MaterialSourceBase):
    id: int
    batch_id: int
    is_rollback_blocker: bool
    blocker_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionImportItem(BaseModel):
    question_no: Optional[str] = None
    title: str
    content: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = "medium"
    tags: Optional[List[str]] = None
    expected_model: Optional[str] = None
    remark: Optional[str] = None
    remark_append: Optional[str] = None
    unit: Optional[str] = None
    source_material: Optional[str] = None
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None


class QuestionDetail(BaseModel):
    id: int
    batch_id: int
    material_id: Optional[int]
    question_no: Optional[str]
    title: str
    content: Optional[str]
    answer: Optional[str]
    category: Optional[str]
    difficulty: Optional[str]
    tags: Optional[List[str]]
    expected_model: Optional[str]
    source_material: Optional[str]
    source_sheet: Optional[str]
    source_row: Optional[int]
    remark: Optional[str]
    remark_append: Optional[str]
    unit: Optional[str]
    is_old_format: bool
    has_missing_unit: bool
    has_append_remark: bool
    status: str
    duplicate_of_id: Optional[int]
    dedup_round: int
    routing_results: List["RoutingResultInfo"] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionListInfo(BaseModel):
    id: int
    batch_id: int
    question_no: Optional[str]
    title: str
    category: Optional[str]
    difficulty: Optional[str]
    source_material: Optional[str]
    status: str
    duplicate_of_id: Optional[int]
    dedup_round: int
    created_at: datetime

    class Config:
        from_attributes = True


class RoutingResultBase(BaseModel):
    model_name: str
    confidence: float = 0.0
    match_reason: Optional[str] = None
    match_tags: Optional[List[str]] = None
    routing_rule: Optional[str] = None
    is_primary: bool = False
    need_review: bool = False
    review_reason: Optional[str] = None


class RoutingResultInfo(RoutingResultBase):
    id: int
    question_id: int
    round_no: int
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChangeRecordInfo(BaseModel):
    id: int
    batch_id: int
    question_id: Optional[int]
    change_type: str
    field_name: Optional[str]
    before_value: Optional[Any]
    after_value: Optional[Any]
    before_status: Optional[str]
    after_status: Optional[str]
    operator: str
    operation_round: int
    reason: Optional[str]
    source_material: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRecordInfo(BaseModel):
    id: int
    batch_id: int
    question_id: Optional[int]
    reviewer: str
    review_type: Optional[str]
    review_action: str
    before_status: Optional[str]
    after_status: Optional[str]
    before_routing: Optional[Any]
    after_routing: Optional[Any]
    comment: Optional[str]
    manual_fix: bool
    change_diff: Optional[Any]
    operation_round: int
    created_at: datetime

    class Config:
        from_attributes = True


class RollbackLogInfo(BaseModel):
    id: int
    batch_id: int
    from_status: str
    to_status: str
    rollback_reason: Optional[str]
    blocker_material_id: Optional[int]
    blocker_material_name: Optional[str]
    blocker_question_ids: Optional[Any]
    blocker_detail: Optional[Any]
    operator: str
    round_no: int
    created_at: datetime

    class Config:
        from_attributes = True


class DedupResult(BaseModel):
    total: int
    duplicates_removed: int
    remaining: int
    affected_materials: List[str]


class StatusTransitionRequest(BaseModel):
    target_status: str
    operator: str = Field("reviewer", description="操作人")
    reason: Optional[str] = Field(None, description="状态变更原因")
    blocker_material_id: Optional[int] = Field(None, description="回滚时卡在哪份材料上")
    blocker_material_name: Optional[str] = Field(None, description="卡点材料名称")
    blocker_detail: Optional[Dict[str, Any]] = Field(None, description="卡点详细信息")


class ManualFixRequest(BaseModel):
    reviewer: str
    question_id: Optional[int] = None
    question_ids: Optional[List[int]] = Field(None, description="批量修正的题目ID列表")
    new_status: Optional[str] = None
    new_routing: Optional[RoutingResultBase] = None
    modify_fields: Optional[Dict[str, Any]] = Field(None, description="修正的字段值")
    comment: Optional[str] = None


class BatchImportResponse(BaseModel):
    success: bool
    batch_id: Optional[int] = None
    batch_no: Optional[str] = None
    total_imported: int = 0
    materials_created: int = 0
    warnings: List[str] = []


class ReportSummary(BaseModel):
    batch_id: int
    batch_no: str
    batch_name: str
    status: str
    total_questions: int
    valid_questions: int
    duplicate_questions: int
    conflict_questions: int
    rollback_count: int
    current_round: int
    routing_summary: Dict[str, int] = {}
    rollback_blockers: List[Dict[str, Any]] = []
    reviewed_by: List[str] = []


MaterialSourceInfo.model_rebuild()
