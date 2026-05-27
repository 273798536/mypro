from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


class WarningLevel(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class WarningCategory(Enum):
    MISSING_ANCHOR = "锚题缺失"
    EXTREME_SCORE = "极端分数"
    ABSENCE_INCLUDED = "缺考计入"
    DUPLICATE_RECORD = "重复记录"
    OUTLIER = "异常样本"
    LOW_SAMPLE = "样本量不足"
    ANCHOR_MISMATCH = "锚题参数异常"
    IMPORT_CONFLICT = "导入冲突"


@dataclass
class WarningItem:
    category: WarningCategory
    level: WarningLevel
    message: str
    details: Dict = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    acknowledged: bool = False

    def format(self) -> str:
        icon = {"INFO": "ℹ", "WARNING": "⚠", "CRITICAL": "✖"}.get(self.level.value, "?")
        return f"[{icon}] {self.category.value} | {self.message}"

    def to_row(self) -> Dict[str, str]:
        return {
            "级别": self.level.value,
            "类别": self.category.value,
            "消息": self.message,
            "详情": str(self.details),
            "时间": self.timestamp,
            "已确认": "是" if self.acknowledged else "否",
        }


class WarningCollector:
    def __init__(self):
        self._items: List[WarningItem] = []

    def add(self, category: WarningCategory, level: WarningLevel,
            message: str, details: Optional[Dict] = None) -> WarningItem:
        item = WarningItem(
            category=category,
            level=level,
            message=message,
            details=details or {},
        )
        self._items.append(item)
        return item

    def critical_count(self) -> int:
        return sum(1 for w in self._items if w.level == WarningLevel.CRITICAL)

    def warning_count(self) -> int:
        return sum(1 for w in self._items if w.level == WarningLevel.WARNING)

    def info_count(self) -> int:
        return sum(1 for w in self._items if w.level == WarningLevel.INFO)

    def all(self) -> List[WarningItem]:
        return list(self._items)

    def by_category(self, category: WarningCategory) -> List[WarningItem]:
        return [w for w in self._items if w.category == category]

    def summary(self) -> Dict[str, int]:
        return {
            "CRITICAL": self.critical_count(),
            "WARNING": self.warning_count(),
            "INFO": self.info_count(),
            "TOTAL": len(self._items),
        }

    def print_all(self):
        for item in self._items:
            print(item.format())

    def to_rows(self) -> List[Dict[str, str]]:
        return [w.to_row() for w in self._items]