from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from enum import Enum


class AuditStatus(str, Enum):
    PASS = "通过"
    FAIL = "未通过"
    PENDING = "待确认"
    GRAY = "灰度观察"


class ReviewCategory(str, Enum):
    DIRECT_USE = "直接可用"
    NEED_REVIEW = "需平台工程师复核"


class RiskTag(str, Enum):
    MISSING_REQUIRED = "必填缺失"
    TYPE_MISMATCH = "类型不匹配"
    ENUM_INVALID = "枚举值非法"
    DUPLICATE_RECORD = "重复标注"
    REMARK_MIXED = "备注混写"
    NULL_VALUE = "空值异常"
    CONFLICT_CONCLUSION = "结论冲突"
    SOURCE_UNTRACED = "来源不可追溯"


class SchemaParam(BaseModel):
    param_name: str
    param_type: Literal["string", "integer", "number", "boolean", "array", "object"]
    required: Any = True
    description: Optional[str] = None
    enum: Optional[List[Any]] = None
    default: Optional[Any] = None
    annotation_remark: Optional[str] = None


class ToolSchemaRecord(BaseModel):
    record_id: str
    tool_name: str
    tool_category: str
    params: List[SchemaParam]
    source_material_ids: List[str] = Field(default_factory=list)
    annotator: str
    annotated_at: str
    original_audit_status: AuditStatus
    original_audit_summary: str
    gray_flag: bool = False
    gray_batch: Optional[str] = None
    review_category: Optional[ReviewCategory] = None
    risk_tags: List[RiskTag] = Field(default_factory=list)
    correction_history: List[Dict[str, Any]] = Field(default_factory=list)


class ReplayResult(BaseModel):
    record_id: str
    replay_status: AuditStatus
    replay_details: List[Dict[str, Any]]
    diff_vs_original: Dict[str, Any]
    replay_time: str


class CorrectionEntry(BaseModel):
    correction_id: str
    record_id: str
    field_name: str
    old_value: Any
    new_value: Any
    corrector: str
    corrected_at: str
    reason: str
    is_cleaned: bool = False


class SourceMaterial(BaseModel):
    material_id: str
    title: str
    url: str
    content_snippet: str
    linked_record_ids: List[str]
