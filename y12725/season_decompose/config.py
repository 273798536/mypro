from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class DecomposeConfig:
    date_col: str = "date"
    value_col: str = "value"
    seasonal_period: int = 7
    model: str = "additive"
    robust: bool = True
    seasonal: int = 7
    trend: Optional[int] = None
    low_pass: Optional[int] = None

    def validate(self) -> List[str]:
        errors = []
        if self.seasonal_period < 2:
            errors.append("seasonal_period 必须 >= 2")
        if self.seasonal < 7 or self.seasonal % 2 == 0:
            errors.append("seasonal 必须是 >= 7 的奇数")
        if self.model not in ("additive", "multiplicative"):
            errors.append("model 只能是 'additive' 或 'multiplicative'")
        return errors
