from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from .rules import DiscountRule, MutualExclusionDetector, MutExDetail, RuleValidationError


@dataclass
class PruningResult:
    pruned_rule_ids: list[str]
    reason: MutExDetail
    original_explanation: str
    current_explanation: str
    manually_modified: bool = False


@dataclass
class CountResult:
    total_rules: int
    valid_combinations: int
    pruned_branches: list[PruningResult] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)
    combination_samples: list[list[str]] = field(default_factory=list)
    capped: bool = False
    cap_limit: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_rules": self.total_rules,
            "valid_combinations": self.valid_combinations,
            "pruned_branches": [
                {
                    "pruned_rule_ids": p.pruned_rule_ids,
                    "reason": {
                        "rule_a": p.reason.rule_a,
                        "rule_b": p.reason.rule_b,
                        "reason_type": p.reason.reason.value,
                        "description": p.reason.description,
                        "suggestion": p.reason.suggestion,
                    },
                    "original_explanation": p.original_explanation,
                    "current_explanation": p.current_explanation,
                    "manually_modified": p.manually_modified,
                }
                for p in self.pruned_branches
            ],
            "errors": self.errors,
            "combination_samples": self.combination_samples,
            "capped": self.capped,
            "cap_limit": self.cap_limit,
        }


class CombinationCounter:
    DEFAULT_CAP = 100_000

    def __init__(
        self,
        rules: list[DiscountRule],
        max_combinations: int = DEFAULT_CAP,
        history_tracker: Any = None,
    ):
        self.all_rules = rules
        self.enabled_rules = [r for r in rules if r.enabled]
        self.max_combinations = max_combinations
        self.history = history_tracker

        self._validation_errors: list[dict[str, Any]] = []
        self._pruned: list[PruningResult] = []
        self.detector: Optional[MutualExclusionDetector] = None

    def _validate_rules(self) -> list[dict[str, Any]]:
        errors = []
        for r in self.enabled_rules:
            missing = r.validate()
            if missing:
                errors.append(
                    {
                        "rule_id": r.rule_id,
                        "missing_fields": missing,
                        "message": f"Rule '{r.rule_id}' is missing required fields: {missing}",
                        "action": "skip" if ("rule_id" in missing or len(missing) >= 2) else "warn",
                    }
                )
        return errors

    def count(self) -> CountResult:
        self._pruned = []
        self._validation_errors = self._validate_rules()

        valid_rules = []
        for r in self.enabled_rules:
            missing = r.validate()
            if "rule_id" in missing or len(missing) >= 2:
                continue
            valid_rules.append(r)

        self.detector = MutualExclusionDetector(valid_rules)

        rule_ids = [r.rule_id for r in valid_rules]
        all_mutex = self.detector.find_all_exclusions()

        for detail in all_mutex:
            pruning = PruningResult(
                pruned_rule_ids=[detail.rule_a, detail.rule_b],
                reason=detail,
                original_explanation=detail.description,
                current_explanation=detail.description,
                manually_modified=False,
            )
            self._pruned.append(pruning)

        valid_count, samples, capped = self._enumerate(rule_ids)

        return CountResult(
            total_rules=len(valid_rules),
            valid_combinations=valid_count,
            pruned_branches=self._pruned,
            errors=self._validation_errors,
            combination_samples=samples,
            capped=capped,
            cap_limit=self.max_combinations if capped else 0,
        )

    def _enumerate(self, rule_ids: list[str]) -> tuple[int, list[list[str]], bool]:
        if not rule_ids:
            return 0, [], False

        compatible_sets: list[list[str]] = []
        capped = False

        def backtrack(start: int, current: list[str]):
            nonlocal capped
            if capped:
                return

            if current:
                is_ok, detail = self.detector.is_compatible_set(current)
                if not is_ok and detail is not None:
                    explanation = detail.description
                    pruning = PruningResult(
                        pruned_rule_ids=list(current),
                        reason=detail,
                        original_explanation=explanation,
                        current_explanation=explanation,
                        manually_modified=False,
                    )
                    already_seen = any(
                        p.reason.rule_a == detail.rule_a
                        and p.reason.rule_b == detail.rule_b
                        for p in self._pruned
                    )
                    if not already_seen:
                        self._pruned.append(pruning)
                    return

            if current:
                compatible_sets.append(list(current))
                if len(compatible_sets) > self.max_combinations:
                    capped = True
                    return

            for i in range(start, len(rule_ids)):
                current.append(rule_ids[i])
                backtrack(i + 1, current)
                current.pop()
                if capped:
                    return

        backtrack(0, [])

        if capped:
            return -1, compatible_sets[:10], True

        return len(compatible_sets), compatible_sets[:20], False

    def update_pruning_explanation(
        self,
        rule_a: str,
        rule_b: str,
        new_explanation: str,
        operator: str = "system",
    ) -> Optional[PruningResult]:
        target = None
        for p in self._pruned:
            if p.reason.rule_a == rule_a and p.reason.rule_b == rule_b:
                target = p
                break

        if target is None:
            return None

        old_explanation = target.current_explanation
        target.current_explanation = new_explanation
        target.manually_modified = True

        if self.history is not None:
            self.history.record(
                rule_a=rule_a,
                rule_b=rule_b,
                field="current_explanation",
                old_value=old_explanation,
                new_value=new_explanation,
                operator=operator,
                note=f"Pruning explanation changed: '{old_explanation[:50]}...' -> '{new_explanation[:50]}...'",
            )

        return target


@dataclass
class ReportSpec:
    report_id: str
    scenario: str
    rule_ids: list[str]
    run_at: str = ""
    notes: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    REQUIRED_FIELDS = ("report_id", "rule_ids")

    def validate(self) -> list[str]:
        missing = []
        for f in self.REQUIRED_FIELDS:
            val = getattr(self, f, None)
            if val is None or (isinstance(val, str) and not val) or (isinstance(val, list) and not val):
                missing.append(f)
        return missing

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ReportSpec:
        return cls(
            report_id=data.get("report_id", ""),
            scenario=data.get("scenario", ""),
            rule_ids=data.get("rule_ids", []),
            run_at=data.get("run_at", ""),
            notes=data.get("notes", ""),
            metadata={k: v for k, v in data.items() if k not in ("report_id", "scenario", "rule_ids", "run_at", "notes")},
        )


@dataclass
class BatchReportResult:
    report: ReportSpec
    status: str
    result: Optional[CountResult] = None
    skip_reason: str = ""
    missing_rules: list[str] = field(default_factory=list)
    counter: Optional[CombinationCounter] = None
    uncalculable_reasons: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "report_id": self.report.report_id,
            "scenario": self.report.scenario,
            "status": self.status,
        }
        if self.report.run_at:
            payload["run_at"] = self.report.run_at
        if self.report.notes:
            payload["notes"] = self.report.notes
        if self.missing_rules:
            payload["missing_rules"] = self.missing_rules
        if self.skip_reason:
            payload["skip_reason"] = self.skip_reason
        if self.uncalculable_reasons:
            payload["uncalculable_reasons"] = self.uncalculable_reasons
        if self.result is not None:
            payload["result"] = self.result.to_dict()
        return payload


class BatchCounter:
    def __init__(
        self,
        all_rules: list[DiscountRule],
        max_combinations: int = CombinationCounter.DEFAULT_CAP,
        history_tracker: Any = None,
    ):
        self.rule_index: dict[str, DiscountRule] = {r.rule_id: r for r in all_rules if r.rule_id}
        self.max_combinations = max_combinations
        self.history = history_tracker

    def _collect_uncalculable(self, report: ReportSpec, result: CountResult, missing_rules: list[str]) -> list[dict[str, Any]]:
        reasons: list[dict[str, Any]] = []
        if missing_rules:
            reasons.append({
                "type": "missing_rules",
                "rules": missing_rules,
                "reason": f"Report '{report.report_id} references rules that do not exist: {missing_rules}",
                "impact": "Missing rules were excluded from the count; the result may be incomplete.",
            })
        if not report.scenario.strip():
            reasons.append({
                "type": "missing_metadata",
                "field": "scenario",
                "reason": f"Report '{report.report_id}' has empty scenario name",
                "impact": "Report metadata is incomplete for traceability; review before using it as-is or add scenario name.",
            })
        if result.capped:
            reasons.append({
                "type": "combination_cap_exceeded",
                "reason": f"Combination count exceeded cap of {result.cap_limit}",
                "impact": "Exact count unavailable; add more exclusion rules or reduce rule set.",
            })
        for err in result.errors:
            reasons.append({
                "type": "validation_error",
                "rule_id": err.get("rule_id"),
                "missing_fields": err.get("missing_fields", []),
                "reason": err.get("message"),
                "impact": f"Rule had missing fields and was {'skipped' if err.get('action') == 'skip' else 'flagged'}.",
            })
        for p in result.pruned_branches:
            if p.manually_modified:
                reasons.append({
                    "type": "manual_override",
                    "rules": p.pruned_rule_ids,
                    "reason": f"Pruning explanation manually modified for pair ({p.reason.rule_a}, {p.reason.rule_b})",
                    "original": p.original_explanation,
                    "current": p.current_explanation,
                    "impact": "Displayed reason may not match actual rule conflict; review history for details.",
                })
        return reasons

    def run_report(self, report: ReportSpec) -> BatchReportResult:
        missing = report.validate()
        if missing:
            return BatchReportResult(
                report=report,
                status="SKIP",
                skip_reason=f"Report missing required fields: {missing}",
                uncalculable_reasons=[{
                    "type": "report_invalid",
                    "reason": f"Missing fields: {missing}",
                    "impact": "Report cannot be processed.",
                }],
            )

        rules_for_report: list[DiscountRule] = []
        missing_rules: list[str] = []
        for rid in report.rule_ids:
            if rid in self.rule_index:
                rules_for_report.append(self.rule_index[rid])
            else:
                missing_rules.append(rid)

        if not rules_for_report:
            return BatchReportResult(
                report=report,
                status="SKIP",
                skip_reason="No valid rules found for this report",
                missing_rules=missing_rules,
                uncalculable_reasons=[{
                    "type": "no_rules",
                    "reason": "None of the referenced rules exist",
                    "impact": "Cannot count combinations with zero rules.",
                }],
            )

        counter = CombinationCounter(
            rules_for_report,
            max_combinations=self.max_combinations,
            history_tracker=self.history,
        )
        result = counter.count()

        uncalculable = self._collect_uncalculable(report, result, missing_rules)

        status = "OK"
        if uncalculable:
            status = "WARN"
        if missing_rules or result.errors or result.capped:
            pass

        return BatchReportResult(
            report=report,
            result=result,
            status=status,
            missing_rules=missing_rules,
            counter=counter,
            uncalculable_reasons=uncalculable,
        )

    def run_reports(self, reports: list[ReportSpec]) -> list[BatchReportResult]:
        return [self.run_report(r) for r in reports]

    @classmethod
    def load_reports_from_json(cls, path: str) -> list[ReportSpec]:
        import json
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        return [ReportSpec.from_dict(item) for item in raw]

