"""数据模型定义"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from replay.constants import MARK_DUPLICATE, MARK_OUTLIER


@dataclass
class ProcessStats:
    """处理统计数据"""
    total: int = 0
    processed: int = 0
    skipped: int = 0
    bad: int = 0
    correct: int = 0
    wrong: int = 0
    uncertain: int = 0
    duplicates: int = 0
    outliers: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "总数": self.total,
            "已处理": self.processed,
            "已跳过": self.skipped,
            "坏行": self.bad,
            "正确": self.correct,
            "误判": self.wrong,
            "不确定": self.uncertain,
            "重复评测数": self.duplicates,
            "拉偏结论样本": self.outliers
        }


@dataclass
class Record:
    """单条评测记录"""
    record_id: str
    source: str
    status: str
    question: Optional[str] = None
    answer: Optional[str] = None
    label: Optional[str] = None
    prediction: Optional[str] = None
    score: Optional[float] = None
    is_duplicate: bool = False
    is_outlier: bool = False
    eval_result: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "样本ID": self.record_id,
            "来源": self.source,
            "处理状态": self.status,
            "问题": self.question,
            "回答": self.answer,
            "金标准": self.label,
            "预测结果": self.prediction,
            "置信度": self.score,
            "重复评测标记": MARK_DUPLICATE if self.is_duplicate else "",
            "拉偏结论标记": MARK_OUTLIER if self.is_outlier else "",
            "评测结论": self.eval_result,
            "备注": "; ".join(self.notes)
        }
