from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, ConfigDict


class IssueSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class IssueType(str, Enum):
    PROBABILITY_OUT_OF_RANGE = "probability_out_of_range"
    CONJUGATE_PRIOR_INVALID = "conjugate_prior_invalid"
    DIVISION_BY_ZERO = "division_by_zero"
    PARSE_ERROR = "parse_error"
    MISSING_FIELD = "missing_field"
    INVALID_VALUE = "invalid_value"


class ParseOutcome(str, Enum):
    PARSED = "parsed"
    SKIPPED = "skipped"
    BAD = "bad"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DivisionZeroTrace(BaseModel):
    model_config = ConfigDict(frozen=True)

    numerator_field: str = Field(..., description="分子字段名")
    numerator_value: Optional[Any] = Field(None, description="分子原始值")
    denominator_field: str = Field(..., description="分母字段名")
    denominator_value: Optional[Any] = Field(None, description="分母原始值")
    expression: str = Field(..., description="计算表达式的原始描述")


class RawRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    row_number: int = Field(..., ge=1, description="原始CSV/Excel中的行号（从1开始，含表头）")
    source_file: str = Field(..., description="来源文件名")
    raw_line: str = Field(..., description="原始行文本，保留脏数据痕迹")
    raw_values: dict[str, Any] = Field(default_factory=dict, description="原始字段值，不做任何清洗")


class ValidationIssue(BaseModel):
    field_name: Optional[str] = Field(None, description="出现问题的字段名")
    issue_type: IssueType = Field(..., description="问题类型")
    severity: IssueSeverity = Field(..., description="严重程度")
    message: str = Field(..., description="人可读的问题描述")
    raw_value: Optional[Any] = Field(None, description="字段的原始值，不清洗")
    boundary_rule: Optional[str] = Field(None, description="触发的边界规则描述")
    division_zero_trace: Optional[DivisionZeroTrace] = Field(None, description="除零操作的来源追踪")
    evidence: dict[str, Any] = Field(default_factory=dict, description="数字从哪来的线索证据")


class ParsedRecord(BaseModel):
    raw_record: RawRecord = Field(..., description="原始记录引用，用于追溯")
    outcome: ParseOutcome = Field(..., description="解析结果：已处理/跳过/坏行")
    parsed_values: dict[str, Any] = Field(default_factory=dict, description="解析后的值（如数值类型转换）")
    parse_errors: list[str] = Field(default_factory=list, description="解析过程中遇到的错误信息")
    issues: list[ValidationIssue] = Field(default_factory=list, description="校验问题列表")

    @property
    def is_valid(self) -> bool:
        return not any(i.severity == IssueSeverity.ERROR for i in self.issues)

    @property
    def row_number(self) -> int:
        return self.raw_record.row_number


class RunSummary(BaseModel):
    total_rows: int = 0
    processed_rows: int = 0
    skipped_rows: int = 0
    bad_rows: int = 0
    total_issues: int = 0
    issues_by_type: dict[str, int] = Field(default_factory=dict)
    issues_by_severity: dict[str, int] = Field(default_factory=dict)


class RunRecord(BaseModel):
    run_id: str = Field(..., description="唯一运行ID，用于追踪")
    status: RunStatus = Field(..., description="当前运行状态")
    started_at: datetime = Field(default_factory=datetime.now)
    finished_at: Optional[datetime] = Field(None)
    source_file: str = Field(
        ...,
        description="原始来源展示名（用户上传文件名/CLI输入路径），用于对用户展示、报告、接口返回",
    )
    stored_file_path: Optional[str] = Field(
        None,
        description="服务端实际可读取的文件路径（内部使用，API可选择是否暴露）",
    )
    config_file: Optional[str] = Field(None, description="使用的边界配置文件路径")
    note: Optional[str] = Field(None, description="用户备注，评审会说明用")
    summary: RunSummary = Field(default_factory=RunSummary)
    error_message: Optional[str] = Field(None)
