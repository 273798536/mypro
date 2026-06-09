from typing import List, Tuple
from .models import TaxRecord, VerificationResult, ResultStatus, BoundaryFlag
from .ladder import TaxLadderEngine


class ConstraintChecker:
    def __init__(self, engine: TaxLadderEngine):
        self.engine = engine

    def check(self, record: TaxRecord, expected_tax: float) -> List[str]:
        violations = []
        if record.income_amount < 0:
            violations.append("收入金额为负数，超出合理范围")
        if record.claimed_tax < 0:
            violations.append("申报税额为负数，不合理")
        if record.income_amount > 0 and record.claimed_tax > record.income_amount:
            violations.append("申报税额大于收入金额，不合理")
        if record.income_amount == 0 and record.claimed_tax != 0:
            violations.append("收入为0但税额非0")
        if abs(record.claimed_tax - expected_tax) > 10000:
            violations.append("申报税额与理论税额差异超过10000元，需人工确认")
        return violations

    def determine_status(
        self,
        record: TaxRecord,
        tax_diff: float,
        violations: List[str],
        boundary_flag: BoundaryFlag,
    ) -> Tuple[ResultStatus, str]:
        if not violations:
            if abs(tax_diff) < 0.01:
                if boundary_flag in (BoundaryFlag.LOWER_BOUNDARY, BoundaryFlag.UPPER_BOUNDARY, BoundaryFlag.ACROSS_BOUNDARY):
                    return ResultStatus.USABLE, "税额准确，位于阶梯边界附近但计算无误，可直接使用"
                return ResultStatus.USABLE, "税额计算准确，可直接使用"
            elif abs(tax_diff) < 1.0:
                return ResultStatus.PENDING, f"税额偏差{tax_diff:.2f}元在允许舍入范围内，需确认是否四舍五入差异"
            else:
                return ResultStatus.NEED_REVIEW, f"税额偏差{tax_diff:.2f}元超出合理范围，需工程师复核"
        if any("超出合理范围" in v or "不合理" in v for v in violations):
            return ResultStatus.NEED_RECOLLECT, "数据存在明显异常，需重新采集"
        if any("差异超过" in v for v in violations):
            return ResultStatus.NEED_REVIEW, "税额差异过大，需工程师复核"
        return ResultStatus.PENDING, "存在约束问题，待进一步确认"
