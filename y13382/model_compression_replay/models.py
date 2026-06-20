"""
核心数据模型
Core Data Models

设计原则：
- 每个数据点都保留溯源能力（原始日志行号、处理记录链）
- 指标必须携带公式、单位、边界值，避免"只吐最终数字"
- 边界样本与最终结论必须直接关联
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class LogSeverity(str, Enum):
    """日志严重级别"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class SampleVerdict(str, Enum):
    """样本判定结果"""
    NORMAL = "NORMAL"          # 正常，未触发压缩
    COMPRESSED = "COMPRESSED"  # 正常压缩
    ANOMALY = "ANOMALY"        # 异常（旧模型误判）
    BOUNDARY = "BOUNDARY"      # 边界样本
    CORRUPT = "CORRUPT"        # 坏数据


class ProcessingStage(str, Enum):
    """处理阶段"""
    LOG_IMPORT = "LOG_IMPORT"
    METRIC_CALCULATION = "METRIC_CALCULATION"
    BOUNDARY_CHECK = "BOUNDARY_CHECK"
    SAMPLE_VERDICT = "SAMPLE_VERDICT"
    REPLAY_EXECUTION = "REPLAY_EXECUTION"
    REPORT_GENERATION = "REPORT_GENERATION"
    BAD_DATA_FILTER = "BAD_DATA_FILTER"


@dataclass
class TrainingLogEntry:
    """
    训练日志条目

    保留原始行号和原始文本，确保任何处理结果都能追溯到日志原文。
    """
    line_number: int                    # 原始日志行号（从1开始）
    raw_text: str                       # 原始行文本，一字不改
    timestamp: Optional[datetime] = None
    severity: LogSeverity = LogSeverity.INFO
    stage: Optional[str] = None         # 训练阶段：forward/backward/quantize/prune等
    extracted_fields: Dict[str, Any] = field(default_factory=dict)
    parse_errors: List[str] = field(default_factory=list)
    is_corrupt: bool = False            # 是否为坏数据行
    corrupt_reason: Optional[str] = None

    def as_reference(self) -> str:
        """生成日志引用标识，用于报告中链接到原始行"""
        return f"[LOG:L{self.line_number}]"

    def excerpt(self, max_len: int = 120) -> str:
        """截断的原始文本，用于报告内联展示"""
        if len(self.raw_text) <= max_len:
            return self.raw_text
        return self.raw_text[:max_len] + "..."


@dataclass
class MetricWithFormula:
    """
    带公式的指标值

    核心要求：不能只给数字，必须把公式、单位、边界值摆出来。
    """
    name: str                           # 指标名，如 "KL散度"
    value: float                        # 计算出的数值
    unit: str = ""                      # 单位，如 "bits/dim"、"%"
    formula_latex: str = ""             # LaTeX公式
    formula_plain: str = ""             # 纯文本公式描述
    derivation: List[str] = field(default_factory=list)  # 推导步骤（中间值）
    used_log_refs: List[str] = field(default_factory=list)  # 用到的日志引用 [LOG:L42]
    boundary: Optional["BoundaryValue"] = None
    is_within_bounds: Optional[bool] = None

    def format_value(self) -> str:
        if self.unit == "%":
            return f"{self.value * 100:.2f}%"
        if self.unit:
            return f"{self.value:.6g} {self.unit}"
        return f"{self.value:.6g}"

    def status_tag(self) -> str:
        if self.is_within_bounds is None:
            return "[未校验边界]"
        if self.is_within_bounds:
            return "[边界内]"
        return "[越界!]"


@dataclass
class BoundaryValue:
    """
    边界值定义

    边界样本的核心：明确阈值、越界后果、关联的结论ID
    """
    metric_name: str
    lower: Optional[float] = None
    upper: Optional[float] = None
    inclusive_lower: bool = True
    inclusive_upper: bool = True
    expected_behavior: str = ""         # 越界时预期行为
    associated_conclusion_id: Optional[str] = None  # 关联到的结论

    def contains(self, value: float) -> bool:
        if self.lower is not None:
            if self.inclusive_lower:
                if value < self.lower:
                    return False
            else:
                if value <= self.lower:
                    return False
        if self.upper is not None:
            if self.inclusive_upper:
                if value > self.upper:
                    return False
            else:
                if value >= self.upper:
                    return False
        return True

    def describe(self) -> str:
        parts = []
        if self.lower is not None:
            op = "≥" if self.inclusive_lower else ">"
            parts.append(f"x {op} {self.lower}")
        if self.upper is not None:
            op = "≤" if self.inclusive_upper else "<"
            parts.append(f"x {op} {self.upper}")
        return " 且 ".join(parts) if parts else "无限制"


@dataclass
class ProcessingRecord:
    """
    处理记录

    记录每一步操作，形成可审计链条。
    推荐算法小许可以把这个链条甩给别人看。
    """
    record_id: str
    stage: ProcessingStage
    action: str                         # 做了什么
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    log_refs: List[str] = field(default_factory=list)  # 涉及的日志行引用
    operator: str = "replay_system"     # 谁执行的
    timestamp: datetime = field(default_factory=datetime.now)
    notes: List[str] = field(default_factory=list)
    is_rollback: bool = False           # 是否为回滚/修正记录


@dataclass
class CompressionSample:
    """
    压缩样本

    一次前向传播或压缩操作的完整记录。
    """
    sample_id: str
    input_ref: str                      # 原始输入标识（数据ID或文件）
    log_entries: List[TrainingLogEntry] = field(default_factory=list)
    metrics: Dict[str, MetricWithFormula] = field(default_factory=dict)
    verdict: SampleVerdict = SampleVerdict.NORMAL
    verdict_reason: str = ""
    prev_verdict: Optional[SampleVerdict] = None  # 旧模型判定，用于改判解释
    prev_reason: str = ""
    is_boundary_sample: bool = False
    boundary_violations: List[str] = field(default_factory=list)  # 触发的边界违规
    version_alias: Optional[str] = None  # 本次样本使用的版本别名
    linked_conclusion_ids: List[str] = field(default_factory=list)  # 关联到的结论

    def all_log_refs(self) -> List[str]:
        return [e.as_reference() for e in self.log_entries]


@dataclass
class VersionAlias:
    """
    版本别名

    允许用户用别名指向旧文件，测试系统在乱材料下是否露怯。
    """
    alias: str
    target_path: str                    # 实际指向的文件路径
    target_hash: Optional[str] = None   # 文件指纹，防止被偷偷替换
    description: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    is_frozen: bool = False             # 冻结后不能改指向

    def as_reference(self) -> str:
        return f"[VERSION:{self.alias}→{self.target_path}]"


@dataclass
class Conclusion:
    """
    最终结论条目

    每条结论都必须关联：边界样本 + 日志行 + 指标证据。
    """
    conclusion_id: str
    title: str
    body: str
    evidence_sample_ids: List[str] = field(default_factory=list)  # 证据样本
    evidence_log_refs: List[str] = field(default_factory=list)    # 证据日志行
    evidence_metric_names: List[str] = field(default_factory=list)  # 证据指标
    severity: str = "INFO"
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class ReplayResult:
    """
    回放完整结果

    汇总所有材料，交给推荐算法小许交付。
    """
    run_id: str
    samples: List[CompressionSample] = field(default_factory=list)
    processing_records: List[ProcessingRecord] = field(default_factory=list)
    conclusions: List[Conclusion] = field(default_factory=list)
    version_aliases_used: List[VersionAlias] = field(default_factory=list)
    bad_data_rows: List[TrainingLogEntry] = field(default_factory=list)
    boundary_samples: List[CompressionSample] = field(default_factory=list)
    verdict_changed_samples: List[CompressionSample] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    report_path: Optional[str] = None

    def summary(self) -> Dict[str, int]:
        return {
            "总样本数": len(self.samples),
            "边界样本数": len(self.boundary_samples),
            "改判样本数": len(self.verdict_changed_samples),
            "坏数据行数": len(self.bad_data_rows),
            "处理记录数": len(self.processing_records),
            "结论条数": len(self.conclusions),
        }
