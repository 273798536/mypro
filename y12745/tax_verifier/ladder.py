from typing import Optional, Tuple
from .models import TaxRecord, LadderConfig, LadderStep, BoundaryFlag


class TaxLadderEngine:
    def __init__(self, config: Optional[LadderConfig] = None):
        self.config = config or LadderConfig.default_china_pit()

    def find_step(self, income: float) -> Optional[LadderStep]:
        for step in self.config.steps:
            if step.contains(income):
                return step
        return None

    def calc_tax(self, income: float) -> Tuple[float, Optional[LadderStep]]:
        step = self.find_step(income)
        if step is None:
            return 0.0, None
        tax = income * step.tax_rate - step.quick_deduction
        return round(max(0.0, tax), 2), step

    def check_boundary(self, income: float, step: Optional[LadderStep]) -> BoundaryFlag:
        if step is None:
            return BoundaryFlag.OUT_OF_RANGE
        if income < 0:
            return BoundaryFlag.OUT_OF_RANGE
        tol = self.config.boundary_tolerance_pct / 100.0
        step_width = step.upper_bound - step.lower_bound
        if step_width == float("inf"):
            step_width = step.lower_bound * 0.5
        near_threshold = step_width * tol
        if step.distance_to_lower(income) <= near_threshold and step.lower_bound > 0:
            return BoundaryFlag.LOWER_BOUNDARY
        if step.upper_bound != float("inf") and step.distance_to_upper(income) <= near_threshold:
            return BoundaryFlag.UPPER_BOUNDARY
        for s in self.config.steps:
            if s.lower_bound > 0 and abs(income - s.lower_bound) <= max(1.0, s.lower_bound * tol * 0.5):
                return BoundaryFlag.ACROSS_BOUNDARY
        return BoundaryFlag.NORMAL

    def verify_record(self, record: TaxRecord) -> Tuple[float, Optional[LadderStep], BoundaryFlag]:
        expected_tax, step = self.calc_tax(record.income_amount)
        boundary = self.check_boundary(record.income_amount, step)
        return expected_tax, step, boundary
