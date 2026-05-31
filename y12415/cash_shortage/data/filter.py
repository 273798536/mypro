from dataclasses import dataclass, field
from datetime import date
from typing import Any, Optional
import pandas as pd

from cash_shortage.config import FILTER_SPECS


@dataclass
class FilterContext:
    filters: dict[str, Any] = field(default_factory=dict)
    date_range: Optional[tuple[date, date]] = None

    def set(self, key: str, value: Any) -> None:
        self.filters[key] = value

    def get(self, key: str) -> Any:
        return self.filters.get(key)


class FilterEngine:
    def __init__(self, filter_specs=None):
        self.specs = filter_specs or FILTER_SPECS

    def apply(self, df: pd.DataFrame, ctx: FilterContext) -> pd.DataFrame:
        result = df.copy()
        for spec in self.specs:
            value = ctx.get(spec.key)
            if value is None or value == []:
                continue
            result = self._apply_one(result, spec, value)
        return result

    def _apply_one(self, df: pd.DataFrame, spec, value: Any) -> pd.DataFrame:
        field = spec.field
        if spec.filter_type == "date_range":
            start, end = value
            return df[(df[field] >= start) & (df[field] <= end)]
        elif spec.filter_type == "multi_select":
            return df[df[field].isin(value)]
        elif spec.filter_type == "exact":
            return df[df[field] == value]
        return df
