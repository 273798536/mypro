from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class DeductionItem:
    name: str
    amount: float
    source: str
    category: str = "other"
    row_index: Optional[int] = None
    note: str = ""

    @property
    def location(self) -> str:
        if self.row_index is not None:
            return f"[来源={self.source}, 行号={self.row_index}]"
        return f"[来源={self.source}]"


@dataclass
class MergeConflict:
    name: str
    items: List[DeductionItem]

    def describe(self) -> str:
        parts = [f"扣除项「{self.name}」存在冲突："]
        for it in self.items:
            parts.append(f"  - 金额={it.amount:,.2f} {it.location}")
        return "\n".join(parts)


@dataclass
class MergeResult:
    merged: Dict[str, DeductionItem]
    conflicts: List[MergeConflict]
    negative_warnings: List[str]

    @property
    def total_deduction(self) -> float:
        return sum(it.amount for it in self.merged.values())

    @property
    def has_conflict(self) -> bool:
        return len(self.conflicts) > 0

    @property
    def has_negative(self) -> bool:
        return len(self.negative_warnings) > 0


def merge_deductions(
    sources: Dict[str, List[DeductionItem]],
) -> MergeResult:
    merged: Dict[str, DeductionItem] = {}
    conflicts: List[MergeConflict] = []
    negative_warnings: List[str] = []
    bucket: Dict[str, List[DeductionItem]] = {}

    for source_name, items in sources.items():
        for item in items:
            key = item.name
            if key not in bucket:
                bucket[key] = []
            bucket[key].append(item)

    for name, items in bucket.items():
        if len(items) == 1:
            it = items[0]
            merged[name] = it
        else:
            amounts = {round(it.amount, 2) for it in items}
            if len(amounts) == 1:
                merged[name] = items[0]
            else:
                conflicts.append(MergeConflict(name=name, items=items))

        for it in items:
            if it.amount < 0:
                negative_warnings.append(
                    f"扣除项「{it.name}」金额为负 ({it.amount:,.2f})，"
                    f"记录位置 {it.location}，"
                    f"分类={it.category}"
                )

    return MergeResult(
        merged=merged,
        conflicts=conflicts,
        negative_warnings=negative_warnings,
    )
