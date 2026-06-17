from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, ConfigDict, Field


class SampleStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    BLOCKED = "blocked"
    NEEDS_REVIEW = "needs_review"
    CORRECTED = "corrected"


class InterceptReason(str, Enum):
    TRAIN_TEST_LEAKAGE = "train_test_leakage"
    DUPLICATE_SAMPLE = "duplicate_sample"
    BOUNDARY_VALUE = "boundary_value"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    MANUAL_FLAG = "manual_flag"
    SAFETY_RULE_VIOLATION = "safety_rule_violation"
    INVALID_FORMAT = "invalid_format"


class DataSource(str, Enum):
    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"
    PRODUCTION = "production"


class Sample(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    sample_id: str = Field(..., description="样本唯一标识")
    prompt: str = Field(..., description="提示词原文")
    response: Optional[str] = Field(None, description="模型响应内容")
    data_source: DataSource = Field(..., description="数据来源")
    group_id: str = Field(..., description="分组标识")
    prompt_version: str = Field(..., description="提示词版本号")
    model_version: Optional[str] = Field(None, description="模型版本号")
    features: Dict[str, Any] = Field(default_factory=dict, description="特征字典")
    labels: Optional[Dict[str, Any]] = Field(None, description="标签字典")
    created_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def content_hash(self) -> str:
        import hashlib
        content = f"{self.prompt}|{self.response or ''}|{self.group_id}"
        return hashlib.md5(content.encode("utf-8")).hexdigest()


class SampleVersion(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    version_id: str = Field(..., description="版本唯一标识")
    sample_id: str = Field(..., description="关联的样本ID")
    prompt: str = Field(..., description="此版本的提示词")
    response: Optional[str] = Field(None, description="此版本的模型响应")
    prompt_version: str = Field(..., description="提示词版本号")
    model_version: Optional[str] = Field(None, description="模型版本号")
    created_by: str = Field(..., description="创建人")
    created_at: datetime = Field(default_factory=datetime.now)
    change_reason: str = Field(..., description="变更原因")
    previous_version_id: Optional[str] = Field(None, description="前一版本ID")
    tool_call_params: Optional[Dict[str, Any]] = Field(None, description="工具调用参数")
    model_logs: Optional[Dict[str, Any]] = Field(None, description="模型运行日志")


class ManualCorrection(BaseModel):
    correction_id: str = Field(..., description="修正记录ID")
    sample_id: str = Field(..., description="关联的样本ID")
    version_id: Optional[str] = Field(None, description="关联的版本ID")
    original_prompt: str = Field(..., description="原始提示词")
    corrected_prompt: Optional[str] = Field(None, description="修正后的提示词")
    original_response: Optional[str] = Field(None, description="原始响应")
    corrected_response: Optional[str] = Field(None, description="修正后的响应")
    correction_note: str = Field(..., description="人工备注原文（保留原话）")
    corrected_by: str = Field(..., description="修正人")
    corrected_at: datetime = Field(default_factory=datetime.now)
    is_approved: bool = Field(False, description="是否已审核通过")
    approved_by: Optional[str] = Field(None, description="审核人")
    approved_at: Optional[datetime] = Field(None, description="审核时间")


class GroupMetrics(BaseModel):
    group_id: str = Field(..., description="分组ID")
    group_name: str = Field(..., description="分组名称")
    total_samples: int = Field(0, description="总样本数")
    passed_samples: int = Field(0, description="通过样本数")
    blocked_samples: int = Field(0, description="拦截样本数")
    needs_review_samples: int = Field(0, description="待复核样本数")
    duplicate_count: int = Field(0, description="重复样本数")
    leakage_count: int = Field(0, description="训练验证泄漏数")
    pass_rate: float = Field(0.0, description="通过率")
    block_rate: float = Field(0.0, description="拦截率")
    avg_latency_ms: Optional[float] = Field(None, description="平均延迟(ms)")
    error_rate: Optional[float] = Field(None, description="错误率")
    intercept_reasons: Dict[str, int] = Field(default_factory=dict, description="拦截原因分布")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def compute_rates(self) -> None:
        if self.total_samples > 0:
            self.pass_rate = self.passed_samples / self.total_samples
            self.block_rate = self.blocked_samples / self.total_samples


class SafetyRule(BaseModel):
    rule_id: str = Field(..., description="规则ID")
    rule_name: str = Field(..., description="规则名称")
    rule_description: str = Field(..., description="规则描述")
    rule_pattern: Optional[str] = Field(None, description="匹配模式（正则）")
    severity: int = Field(1, ge=1, le=5, description="严重程度1-5")
    is_enabled: bool = Field(True, description="是否启用")
    created_by: str = Field(..., description="创建人")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(None)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class InterceptResult(BaseModel):
    sample_id: str = Field(..., description="样本ID")
    is_blocked: bool = Field(..., description="是否被拦截")
    intercept_reasons: List[InterceptReason] = Field(default_factory=list)
    intercept_details: List[str] = Field(default_factory=list)
    matched_rules: List[str] = Field(default_factory=list)
    check_timestamp: datetime = Field(default_factory=datetime.now)
    check_round: int = Field(1, description="第几轮检查")
    content_hash: Optional[str] = Field(None)
    suggestions: List[str] = Field(default_factory=list)


class ReviewRecord(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    review_id: str = Field(..., description="复核记录ID")
    sample_id: str = Field(..., description="样本ID")
    version_id: Optional[str] = Field(None, description="版本ID")
    review_round: int = Field(1, description="第几轮复核")
    reviewer: str = Field(..., description="复核人")
    review_type: str = Field(..., description="复核类型：模型日志/安全规则/工具调用参数")
    review_notes: str = Field(..., description="复核意见（保留原话）")
    is_approved: bool = Field(..., description="是否通过")
    reviewed_at: datetime = Field(default_factory=datetime.now)
    model_logs: Optional[Dict[str, Any]] = Field(None, description="本轮复核的模型日志")
    safety_rules_checked: Optional[List[str]] = Field(None, description="本轮复核的安全规则")
    tool_call_params: Optional[Dict[str, Any]] = Field(None, description="本轮复核的工具调用参数")
    previous_review_id: Optional[str] = Field(None, description="上一轮复核ID")


class SimulatorConfig(BaseModel):
    config_id: str = Field(default="default_config")
    name: str = Field(default="模型服务限流模拟")
    rate_limit_per_minute: int = Field(default=100, ge=1)
    max_concurrent: int = Field(default=10, ge=1)
    enable_duplicate_check: bool = Field(default=True)
    enable_leakage_check: bool = Field(default=True)
    enable_safety_rules: bool = Field(default=True)
    duplicate_dedup_keys: List[str] = Field(
        default_factory=lambda: ["prompt", "response", "group_id"]
    )
    train_test_split_list: Set[str] = Field(default_factory=set)
    safety_rules: List[SafetyRule] = Field(default_factory=list)
    boundary_values: Dict[str, Any] = Field(default_factory=dict)

    def add_split_entry(self, entry: str) -> None:
        self.train_test_split_list.add(entry)

    def remove_split_entry(self, entry: str) -> None:
        self.train_test_split_list.discard(entry)
