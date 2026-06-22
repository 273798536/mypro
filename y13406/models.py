from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class SampleStatus(str, Enum):
    VALID = "valid"
    MISSING_VALUE = "missing_value"
    UNIT_MISSING = "unit_missing"
    OLD_TERM = "old_term"
    SUPPLEMENT_REMARK = "supplement_remark"
    BOUNDARY_OUTLIER = "boundary_outlier"
    EXCLUDED = "excluded"


class SamplingMethod(str, Enum):
    SIMPLE_RANDOM = "simple_random"
    STRATIFIED = "stratified"
    SYSTEMATIC = "systematic"
    CLUSTER = "cluster"


class ErrorQuestionSample(BaseModel):
    sample_id: str = Field(..., description="样本唯一ID")
    raw_row_no: Optional[int] = Field(None, description="原始文件行号")
    student_id: Optional[str] = Field(None, description="学生ID")
    student_name: Optional[str] = Field(None, description="学生姓名")
    class_id: Optional[str] = Field(None, description="班级ID")
    error_question_count: Optional[float] = Field(None, description="错题数量")
    error_question_count_unit: Optional[str] = Field(None, description="错题数量单位")
    error_score: Optional[float] = Field(None, description="错题失分")
    error_score_unit: Optional[str] = Field(None, description="失分单位")
    remark: Optional[str] = Field(None, description="备注")
    remark_supplement: Optional[str] = Field(None, description="后补说明")
    screenshot_ref: Optional[str] = Field(None, description="截图引用")
    status: SampleStatus = Field(SampleStatus.VALID, description="样本状态")
    issues: List[Dict[str, Any]] = Field(default_factory=list, description="发现的问题清单")
    original_fields: Dict[str, Any] = Field(default_factory=dict, description="原始字段快照")

    def add_issue(self, issue_type: str, detail: str, field: Optional[str] = None):
        self.issues.append({
            "issue_type": issue_type,
            "field": field,
            "detail": detail,
            "detected_at": datetime.now().isoformat()
        })


class SamplingParams(BaseModel):
    method: SamplingMethod = Field(SamplingMethod.SIMPLE_RANDOM, description="抽样方法")
    sample_size: Optional[int] = Field(None, description="样本量（绝对数）")
    sample_ratio: Optional[float] = Field(None, description="抽样比例（0-1）")
    confidence_level: float = Field(0.95, ge=0.8, le=0.999, description="置信水平")
    margin_of_error: float = Field(0.05, ge=0.001, le=0.2, description="边际误差")
    stratify_by: Optional[str] = Field(None, description="分层字段（如 class_id）")
    random_seed: Optional[int] = Field(None, description="随机种子，用于复现")
    include_boundary: bool = Field(False, description="是否包含边界样本")
    exclude_status: List[SampleStatus] = Field(
        default_factory=lambda: [SampleStatus.UNIT_MISSING, SampleStatus.EXCLUDED],
        description="排除的样本状态列表"
    )

    @field_validator("sample_ratio")
    @classmethod
    def check_ratio_range(cls, v):
        if v is not None and (v <= 0 or v > 1):
            raise ValueError("sample_ratio 必须在 (0, 1] 区间内")
        return v

    @field_validator("sample_size")
    @classmethod
    def check_sample_size(cls, v):
        if v is not None and v <= 0:
            raise ValueError("sample_size 必须大于 0")
        return v


class CleanseResult(BaseModel):
    total_input: int = 0
    valid_count: int = 0
    excluded_count: int = 0
    missing_value_count: int = 0
    unit_missing_count: int = 0
    old_term_renamed: List[Dict[str, str]] = Field(default_factory=list)
    supplement_merged: int = 0
    boundary_outlier_count: int = 0
    excluded_unit_missing_ids: List[str] = Field(default_factory=list, description="因单位缺失被排除的样本ID")
    samples: List[ErrorQuestionSample] = Field(default_factory=list)
    cleanse_log: List[Dict[str, Any]] = Field(default_factory=list)


class SamplingIntermediate(BaseModel):
    step_name: str
    formula: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    unit_check: Dict[str, str] = Field(default_factory=dict)
    result_value: Optional[Any] = None


class SamplingResult(BaseModel):
    params: SamplingParams
    total_eligible: int = 0
    sample_size_used: int = 0
    sample_ratio_used: Optional[float] = None
    selected_ids: List[str] = Field(default_factory=list)
    selected_samples: List[Dict[str, Any]] = Field(default_factory=list)
    stratify_distribution: Dict[str, Dict[str, int]] = Field(default_factory=dict)
    excluded_from_sampling: List[Dict[str, Any]] = Field(default_factory=list, description="抽样阶段被排除的记录")
    intermediate_steps: List[SamplingIntermediate] = Field(default_factory=list, description="公式中间过程")
    summary: Dict[str, Any] = Field(default_factory=dict)
