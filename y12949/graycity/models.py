"""数据模型。

所有结构都是同一轮复核里一起出现的对象：训练样本、提示词版本、版本回滚丢记录、
人工备注、模型日志。人工备注 note 字段在加载与导出全链路保持原话，不做改写。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class TrainingSample:
    """训练样本（眼前这批具体材料，非旧流程通用样例）。"""

    id: str
    city: str
    text: str
    label: str
    prompt_version: str
    length: int
    truncated: bool = False
    group: str = "control"  # control | treatment，灰度分组


@dataclass(frozen=True)
class PromptVersion:
    """提示词版本。"""

    version: str
    content: str
    status: str  # active | rolled_back
    rolled_back_to: Optional[str] = None
    note: str = ""


@dataclass(frozen=True)
class RollbackLoss:
    """版本回滚丢记录：回滚时被丢掉的字段/记录。"""

    id: str
    sample_id: str
    from_version: str
    to_version: str
    lost_field: str
    recoverable: bool
    recovered: bool = False


@dataclass(frozen=True)
class Annotation:
    """人工标注记录。note 原话保留，工具不重写。"""

    sample_id: str
    note: str
    author: str
    ts: str


@dataclass(frozen=True)
class ModelLog:
    """模型推理日志。complete=False 表示需要补录。"""

    sample_id: str
    city: str
    version: str
    prediction: str
    score: float
    truncated: bool
    complete: bool = True
    backfilled: bool = False  # 是否为补录进来的日志


@dataclass(frozen=True)
class EvalResult:
    """单条评测回放结果。由模型日志回放得到，日志补录后可重算。"""

    sample_id: str
    city: str
    version: str
    prediction: str
    score: float
    correct: bool
    truncated: bool
    blocked: bool  # 因截断等被拦下
    reason: str = ""


@dataclass
class ExceptionItem:
    """异常分类条目：给出下一步是补材料还是改口径，而不是一个红色数字。"""

    sample_id: str
    city: str
    category: str  # 补材料 | 改口径 | 待补录日志 | 长文本截断
    detail: str
    next_step: str
    severity: str = "warn"  # warn | block


@dataclass
class CityDiff:
    """单城市灰度转化差异。"""

    city: str
    treatment_total: int = 0
    control_total: int = 0
    treatment_conv: int = 0
    control_conv: int = 0
    blocked: int = 0
    pending_backfill: int = 0
    delta_pp: float = 0.0  # 转化差异百分点
    exceptions: list = field(default_factory=list)

    @property
    def treatment_rate(self) -> float:
        return self.treatment_conv / self.treatment_total if self.treatment_total else 0.0

    @property
    def control_rate(self) -> float:
        return self.control_conv / self.control_total if self.control_total else 0.0
