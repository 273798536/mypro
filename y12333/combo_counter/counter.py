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
