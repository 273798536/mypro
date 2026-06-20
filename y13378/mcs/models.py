"""数据模型定义"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid
import json


def _now_ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@dataclass
class Sample:
    """单条预测样本 - 保留原始来源，不做清洗"""
    sample_id: str
    raw_source: str = ""           # 原始来源文件/日志名
    raw_content: str = ""          # 原始内容（完整保留，不修改）
    model_version: str = ""        # 模型版本
    input_text: str = ""           # 输入文本（从原始内容解析）
    predicted_label: str = ""      # 预测标签
    true_label: str = ""           # 真实标签（如果有）
    confidence: float = 0.0        # 置信度
    gray_ratio: Optional[float] = None   # 灰度比例（如果相关）
    features: Dict[str, Any] = field(default_factory=dict)
    imported_at: str = field(default_factory=_now_ts)
    is_misjudged: bool = False     # 是否误判样本
    note: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Correction:
    """人工修正记录"""
    correction_id: str
    sample_id: str
    operator: str = ""             # 操作人（如"小林"）
    before_label: str = ""
    after_label: str = ""
    before_note: str = ""
    after_note: str = ""
    reason: str = ""               # 修正理由
    corrected_at: str = field(default_factory=_now_ts)

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class VersionSnapshot:
    """版本快照 - 某个模型版本在某个时间点的完整快照"""
    snapshot_id: str
    snapshot_name: str
    model_version: str
    created_at: str = field(default_factory=_now_ts)
    created_by: str = ""
    sample_ids: List[str] = field(default_factory=list)
    correction_ids: List[str] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    description: str = ""
    parent_snapshot_id: Optional[str] = None  # 基于哪个快照增量

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class GrayIssue:
    """灰度比例异常记录"""
    issue_id: str
    snapshot_id: str
    sample_id: str
    gray_ratio_value: Optional[float]
    issue_type: str = ""           # "missing" / "invalid" / "out_of_range"
    detail: str = ""
    next_step: str = ""            # 人能照着处理的下一步

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Report:
    """Markdown 报告"""
    report_id: str
    snapshot_id: str
    report_type: str = "full"      # full / diff
    compare_snapshot_id: Optional[str] = None
    generated_at: str = field(default_factory=_now_ts)
    content: str = ""
    file_path: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)
