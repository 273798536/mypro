from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Tuple


@dataclass
class BracketRow:
    lower: float
    upper: Optional[float]
    rate: float
    quick_deduction: float
    label: str = ""
    source: str = ""

    @property
    def upper_repr(self) -> str:
        return "∞" if self.upper is None else f"{self.upper:,.2f}"

    def contains(self, taxable: float) -> bool:
        if taxable < self.lower:
            return False
        if self.upper is not None and taxable >= self.upper:
            return False
        return True

    def explain_boundary(self, taxable: float) -> str:
        if taxable < self.lower:
            return (
                f"应纳税所得额 {taxable:,.2f} < 本档下界 {self.lower:,.2f}，"
                f"未进入 {self.label or f'{self.lower:,.0f}~{self.upper_repr}'} 档"
            )
        if self.upper is not None and taxable >= self.upper:
            return (
                f"应纳税所得额 {taxable:,.2f} ≥ 本档上界 {self.upper:,.2f}，"
                f"已溢出 {self.label or f'{self.lower:,.0f}~{self.upper_repr}'} 档"
            )
        return (
            f"应纳税所得额 {taxable:,.2f} 落入 "
            f"{self.label or f'{self.lower:,.0f}~{self.upper_repr}'} 档 "
            f"(税率 {self.rate*100:.0f}%，速算扣除数 {self.quick_deduction:,.2f})"
        )


@dataclass
class TaxTable:
    id: str
    name: str
    brackets: List[BracketRow]
    valid_from: date
    valid_to: Optional[date]
    source: str = ""

    def is_expired(self, as_of: Optional[date] = None) -> bool:
        ref = as_of or date.today()
        if self.valid_to is not None and ref > self.valid_to:
            return True
        return False

    def expiry_detail(self, as_of: Optional[date] = None) -> Optional[str]:
        ref = as_of or date.today()
        if self.is_expired(as_of):
            return (
                f"税率表 [{self.id}] {self.name} 已过期："
                f"有效期 {self.valid_from} ~ {self.valid_to}，"
                f"当前日期 {ref}，来源={self.source or '未标注'}"
            )
        return None

    def find_bracket(self, taxable: float) -> Tuple[Optional[BracketRow], str]:
        for b in self.brackets:
            if b.contains(taxable):
                return b, b.explain_boundary(taxable)
        if self.brackets:
            last = self.brackets[-1]
            return last, (
                f"应纳税所得额 {taxable:,.2f} 超出最后档位上界 "
                f"{last.upper_repr}，按最高档 {last.label} 处理"
            )
        return None, "税率表为空，无法定位档位"

    def all_boundary_explanations(self, taxable: float) -> List[str]:
        results = []
        for b in self.brackets:
            results.append(b.explain_boundary(taxable))
        return results


def default_cn_annual_table(as_of: Optional[date] = None) -> TaxTable:
    ref = as_of or date.today()
    brackets = [
        BracketRow(0, 36000, 0.03, 0, label="第1档 0~36000"),
        BracketRow(36000, 144000, 0.10, 2520, label="第2档 36000~144000"),
        BracketRow(144000, 300000, 0.20, 16920, label="第3档 144000~300000"),
        BracketRow(300000, 420000, 0.25, 31920, label="第4档 300000~420000"),
        BracketRow(420000, 660000, 0.30, 52920, label="第5档 420000~660000"),
        BracketRow(660000, 960000, 0.35, 85920, label="第6档 660000~960000"),
        BracketRow(960000, None, 0.45, 181920, label="第7档 960000以上"),
    ]
    return TaxTable(
        id="CN-ANNUAL-2024",
        name="中国综合所得年度税率表",
        brackets=brackets,
        valid_from=date(2024, 1, 1),
        valid_to=date(2024, 12, 31),
        source="国家税务总局",
    )
