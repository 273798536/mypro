"""核心数据模型定义

包含置信区间口径、答题记录、评分记录、快照版本、异常记录等所有数据结构。
所有模型使用 dataclass 定义，便于序列化和与 pandas DataFrame 互转。
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
import uuid


# ---------- 枚举定义 ----------

class CI_METHOD(str, Enum):
    """置信区间计算口径枚举

    建模社常用的三种主流口径，也是本工具对比的核心对象：
    - WILSON: Wilson 得分区间（推荐，适合小样本）
    - CLOPPER_PEARSON: Clopper-Pearson 精确区间（保守）
    - NORMAL_APPROX: 正态近似区间（最简，大样本可用）
    """
    WILSON = "wilson"
    CLOPPER_PEARSON = "clopper_pearson"
    NORMAL_APPROX = "normal_approx"

    @property
    def display_name(self) -> str:
        return _CI_METHOD_NAMES[self]


_CI_METHOD_NAMES = {
    CI_METHOD.WILSON: "Wilson 得分区间",
    CI_METHOD.CLOPPER_PEARSON: "Clopper-Pearson 精确区间",
    CI_METHOD.NORMAL_APPROX: "正态近似区间",
}


class ANOMALY_TYPE(str, Enum):
    """异常类型枚举

    按建模社助教处理习惯分为两大类，直接指导下一步操作：
    - NEED_MATERIAL: 需要补充材料（学生数据缺失、评分未录入等）
    - NEED_METHOD: 需要调整口径（方法不适用、近似误差过大等）
    """
    NEED_MATERIAL = "need_material"
    NEED_METHOD = "need_method"

    @property
    def display_name(self) -> str:
        return _ANOMALY_TYPE_NAMES[self]

    @property
    def action_hint(self) -> str:
        return _ANOMALY_ACTION_HINTS[self]


_ANOMALY_TYPE_NAMES = {
    ANOMALY_TYPE.NEED_MATERIAL: "需补材料",
    ANOMALY_TYPE.NEED_METHOD: "需改口径",
}

_ANOMALY_ACTION_HINTS = {
    ANOMALY_TYPE.NEED_MATERIAL: "请检查学生答题数据或评分记录是否完整，补充后重新导入",
    ANOMALY_TYPE.NEED_METHOD: "请评估当前置信区间口径是否适用，考虑切换口径或调整阈值",
}


class ANOMALY_SEVERITY(str, Enum):
    """异常严重程度"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


# ---------- 核心业务数据模型 ----------

@dataclass
class StudentAnswer:
    """学生答题记录

    Attributes:
        student_id: 学生唯一标识
        question_id: 题目唯一标识
        is_correct: 是否答对（True/False），None 表示未评分
        score: 得分（支持部分得分，0~1 之间的连续值或整数）
        answer_time: 答题提交时间，用于识别晚到错题
        tags: 标签列表，用于分组分析（如知识点、难度等）
    """
    student_id: str
    question_id: str
    is_correct: Optional[bool] = None
    score: Optional[float] = None
    answer_time: Optional[datetime] = None
    tags: List[str] = field(default_factory=list)
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.answer_time:
            d["answer_time"] = self.answer_time.isoformat()
        return d


@dataclass
class ScoreRecord:
    """评分记录（用于评分补录场景）

    Attributes:
        record_id: 对应答题记录的 record_id
        scorer: 评分人
        scored_at: 评分时间
        is_correct: 判分结果
        score: 具体得分
        comment: 评分备注
    """
    record_id: str
    is_correct: bool
    score: Optional[float] = None
    scorer: Optional[str] = None
    scored_at: Optional[datetime] = None
    comment: str = ""


@dataclass
class CIResult:
    """单口径置信区间计算结果

    Attributes:
        group_key: 分组键（如题目ID、知识点标签等）
        method: 使用的口径
        n: 样本量
        k: 正确数
        p: 正确率（点估计）
        ci_lower: 置信区间下限
        ci_upper: 置信区间上限
        ci_width: 区间宽度
        confidence_level: 置信水平（如 0.95）
    """
    group_key: str
    method: CI_METHOD
    n: int
    k: int
    p: float
    ci_lower: float
    ci_upper: float
    ci_width: float
    confidence_level: float = 0.95

    @property
    def se_approx(self) -> float:
        """正态近似标准误（用于误差分析）"""
        if self.n == 0:
            return 0.0
        return (self.p * (1 - self.p) / self.n) ** 0.5


@dataclass
class AnomalyRecord:
    """异常记录

    Attributes:
        anomaly_id: 异常ID
        group_key: 关联的分组键
        anomaly_type: 异常类型（需补材料 / 需改口径）
        severity: 严重程度
        title: 简短标题
        description: 详细说明（给助教看的排查指引）
        affected_methods: 受影响的口径列表
        values: 相关数值（用于展示和导出）
    """
    anomaly_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    group_key: Optional[str] = None
    anomaly_type: ANOMALY_TYPE = ANOMALY_TYPE.NEED_MATERIAL
    severity: ANOMALY_SEVERITY = ANOMALY_SEVERITY.WARNING
    title: str = ""
    description: str = ""
    affected_methods: List[CI_METHOD] = field(default_factory=list)
    values: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ErrorAnalysis:
    """误差分析结果

    对比不同口径之间的差异，识别近似误差过大的情况。

    Attributes:
        group_key: 分组键
        reference_method: 参考口径（通常是最保守的精确方法）
        approx_method: 近似口径
        lower_diff: 下限差异（近似 - 参考）
        upper_diff: 上限差异（近似 - 参考）
        width_diff: 宽度差异
        is_approx_error_too_large: 近似误差是否超过阈值
        threshold: 判断阈值
    """
    group_key: str
    reference_method: CI_METHOD
    approx_method: CI_METHOD
    lower_diff: float
    upper_diff: float
    width_diff: float
    is_approx_error_too_large: bool
    threshold: float = 0.05


@dataclass
class CounterExample:
    """反例记录

    识别出的口径对比反例：在该分组上，不同口径结论不一致。

    Attributes:
        group_key: 分组键
        description: 反例描述
        method_results: 各口径结果摘要
        impact_level: 影响级别（高/中/低）
    """
    group_key: str
    description: str
    method_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    impact_level: str = "medium"


# ---------- 版本 / 快照相关 ----------

@dataclass
class SnapshotDiff:
    """两个快照之间的差异

    Attributes:
        added_records: 新增的答题记录 ID
        removed_records: 移除的答题记录 ID
        updated_records: 更新的答题记录 ID（含评分补录）
        affected_groups: 受影响的分组键（置信区间结论可能变化）
    """
    added_records: List[str] = field(default_factory=list)
    removed_records: List[str] = field(default_factory=list)
    updated_records: List[str] = field(default_factory=list)
    affected_groups: List[str] = field(default_factory=list)

    @property
    def has_changes(self) -> bool:
        return bool(self.added_records or self.removed_records or self.updated_records)


@dataclass
class DatasetSnapshot:
    """数据集快照

    每次导入数据都生成一个快照，用于版本对比和回溯。

    Attributes:
        snapshot_id: 快照 ID
        created_at: 创建时间
        source_name: 数据来源文件名
        record_count: 记录数
        description: 备注说明
    """
    snapshot_id: str = field(default_factory=lambda: uuid.uuid4().hex[:10])
    created_at: datetime = field(default_factory=datetime.now)
    source_name: str = ""
    record_count: int = 0
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["created_at"] = self.created_at.isoformat()
        return d


# ---------- 汇总结果 ----------

@dataclass
class ComparisonSummary:
    """口径对比汇总结果

    图表、明细表、导出报告均基于此对象生成，确保数据源唯一。
    """
    answers: List[StudentAnswer]
    ci_results: List[CIResult]
    anomalies: List[AnomalyRecord]
    error_analyses: List[ErrorAnalysis]
    counter_examples: List[CounterExample]
    snapshot: DatasetSnapshot
    previous_snapshot: Optional[DatasetSnapshot] = None
    diff: Optional[SnapshotDiff] = None
    generated_at: datetime = field(default_factory=datetime.now)
