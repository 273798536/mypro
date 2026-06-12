from __future__ import annotations

from typing import Iterator, Optional

from .config import BoundaryConfig
from .models import (
    DivisionZeroTrace,
    IssueSeverity,
    IssueType,
    ParseOutcome,
    ParsedRecord,
    RunSummary,
    ValidationIssue,
)


class BayesianPriorValidator:
    def __init__(self, config: BoundaryConfig):
        self.config = config
        self._summary = RunSummary()

    @property
    def summary(self) -> RunSummary:
        return self._summary

    def _detect_prior_type(self, record: ParsedRecord) -> Optional[str]:
        raw = record.raw_record.raw_values
        pt = raw.get("prior_type") or raw.get("PriorType") or raw.get("prior")
        if pt:
            return str(pt).strip().lower()

        field_names = [k.lower() for k in record.parsed_values.keys()]
        if "alpha" in field_names and "beta" in field_names and not any(
            x in field_names for x in ["mu", "nu", "shape", "rate"]
        ):
            return "beta"
        if "alpha" in field_names and not any(
            x in field_names for x in ["beta", "mu", "nu", "shape", "rate"]
        ):
            return "dirichlet"
        if "shape" in field_names and "rate" in field_names:
            return "gamma"
        if all(x in field_names for x in ["mu", "nu", "alpha", "beta"]):
            return "normal_inverse_gamma"
        return None

    def _is_probability_field(self, field_name: str, raw_values: dict) -> bool:
        lower = field_name.lower()
        if any(k in lower for k in ["prob", "probability", "p_"]):
            return True
        pt = (raw_values.get("prior_type") or "").lower()
        if pt in ("probability", "prob") and "value" in lower:
            return True
        return False

    def _check_probability(
        self, field_name: str, value: float, raw_values: dict
    ) -> Optional[ValidationIssue]:
        ok, msg = self.config.probability.check(value)
        if ok:
            return None
        return ValidationIssue(
            field_name=field_name,
            issue_type=IssueType.PROBABILITY_OUT_OF_RANGE,
            severity=IssueSeverity.ERROR,
            message=f"概率值越界：{msg}",
            raw_value=raw_values.get(field_name),
            boundary_rule=self.config.probability.description,
            evidence={
                "field": field_name,
                "raw_value": raw_values.get(field_name),
                "parsed_value": value,
                "boundary": {
                    "min": self.config.probability.min,
                    "max": self.config.probability.max,
                    "min_inclusive": self.config.probability.min_inclusive,
                    "max_inclusive": self.config.probability.max_inclusive,
                },
            },
        )

    def _check_conjugate_prior(
        self,
        prior_type: str,
        field_name: str,
        value: float,
        raw_values: dict,
    ) -> Optional[ValidationIssue]:
        dist_rules = self.config.conjugate_priors.get(prior_type, {})
        param_name = field_name.lower()
        if param_name not in dist_rules:
            return None
        rule = dist_rules[param_name]
        ok, msg = rule.check(value)
        if ok:
            return None
        return ValidationIssue(
            field_name=field_name,
            issue_type=IssueType.CONJUGATE_PRIOR_INVALID,
            severity=IssueSeverity.ERROR,
            message=f"共轭先验参数越界 [{prior_type}/{param_name}]：{msg}",
            raw_value=raw_values.get(field_name),
            boundary_rule=rule.description,
            evidence={
                "distribution": prior_type,
                "parameter": param_name,
                "field": field_name,
                "raw_value": raw_values.get(field_name),
                "parsed_value": value,
                "boundary": {
                    "min": rule.min,
                    "max": rule.max,
                    "min_inclusive": rule.min_inclusive,
                    "max_inclusive": rule.max_inclusive,
                },
            },
        )

    def _check_division_zero(
        self, record: ParsedRecord, raw_values: dict
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        if not self.config.division_zero_tracking.get("enabled", True):
            return issues

        calc_field = None
        for k in raw_values:
            if any(tag in k.lower() for tag in ["calc", "formula", "expr", "计算", "公式", "表达式"]):
                calc_field = k
                break

        formula_desc = raw_values.get(calc_field) if calc_field else None

        denominator_fields = []
        numerator_fields = []
        for k in raw_values:
            lower = k.lower()
            if any(tag in lower for tag in ["denominator", "分母", "divisor"]):
                denominator_fields.append(k)
            if any(tag in lower for tag in ["numerator", "分子", "dividend"]):
                numerator_fields.append(k)

        if not denominator_fields and not numerator_fields:
            return issues

        for denom_field in denominator_fields:
            denom_raw = raw_values.get(denom_field)
            denom_val = None
            if denom_field in record.parsed_values:
                denom_val = record.parsed_values[denom_field]
            else:
                try:
                    denom_val = float(str(denom_raw).strip()) if denom_raw not in (None, "") else None
                except (ValueError, TypeError):
                    pass

            if denom_val is not None and denom_val == 0.0:
                matched_num_field = numerator_fields[0] if numerator_fields else "numerator"
                num_raw = raw_values.get(matched_num_field)
                expression = (
                    str(formula_desc)
                    if formula_desc
                    else f"{matched_num_field} / {denom_field}"
                )
                trace = DivisionZeroTrace(
                    numerator_field=matched_num_field,
                    numerator_value=num_raw,
                    denominator_field=denom_field,
                    denominator_value=denom_raw,
                    expression=expression,
                )
                issues.append(
                    ValidationIssue(
                        field_name=denom_field,
                        issue_type=IssueType.DIVISION_BY_ZERO,
                        severity=IssueSeverity.ERROR,
                        message=(
                            f"除零边界：分母 '{denom_field}' 为零。"
                            f"原始计算草稿描述：'{expression}'。"
                            f"分子='{num_raw}'，分母='{denom_raw}'"
                        ),
                        raw_value=denom_raw,
                        division_zero_trace=trace,
                        evidence={
                            "expression": expression,
                            "numerator_field": matched_num_field,
                            "numerator_raw": num_raw,
                            "denominator_field": denom_field,
                            "denominator_raw": denom_raw,
                            "denominator_parsed": denom_val,
                            "row_number": record.row_number,
                            "source_file": record.raw_record.source_file,
                        },
                    )
                )
        return issues

    def validate_record(self, record: ParsedRecord) -> ParsedRecord:
        self._summary.total_rows += 1

        if record.outcome == ParseOutcome.SKIPPED:
            self._summary.skipped_rows += 1
            return record
        if record.outcome == ParseOutcome.BAD:
            self._summary.bad_rows += 1
            for issue in record.issues:
                self._add_issue_to_summary(issue)
            return record

        self._summary.processed_rows += 1

        prior_type = self._detect_prior_type(record)
        raw_values = record.raw_record.raw_values

        for field_name, value in record.parsed_values.items():
            if self._is_probability_field(field_name, raw_values):
                issue = self._check_probability(field_name, value, raw_values)
                if issue:
                    record.issues.append(issue)
                    self._add_issue_to_summary(issue)

            if prior_type:
                issue = self._check_conjugate_prior(prior_type, field_name, value, raw_values)
                if issue:
                    record.issues.append(issue)
                    self._add_issue_to_summary(issue)

        div_issues = self._check_division_zero(record, raw_values)
        for issue in div_issues:
            record.issues.append(issue)
            self._add_issue_to_summary(issue)

        return record

    def _add_issue_to_summary(self, issue: ValidationIssue) -> None:
        self._summary.total_issues += 1
        self._summary.issues_by_type[issue.issue_type.value] = (
            self._summary.issues_by_type.get(issue.issue_type.value, 0) + 1
        )
        self._summary.issues_by_severity[issue.severity.value] = (
            self._summary.issues_by_severity.get(issue.severity.value, 0) + 1
        )

    def validate(self, records: Iterator[ParsedRecord]) -> Iterator[ParsedRecord]:
        for record in records:
            yield self.validate_record(record)

    def reset(self) -> None:
        self._summary = RunSummary()
