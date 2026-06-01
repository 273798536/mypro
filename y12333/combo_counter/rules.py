from __future__ import annotations

import copy
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class RuleType(Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    FREE_SHIPPING = "free_shipping"
    BUY_X_GET_Y = "buy_x_get_y"
    MEMBERSHIP = "membership"


class Scope(Enum):
    GLOBAL = "global"
    CATEGORY = "category"
    PRODUCT = "product"


class MutExReason(Enum):
    SAME_TIER = "same_tier"
    EXPLICIT_EXCLUSIVE = "explicit_exclusive"
    SCOPE_CONFLICT = "scope_conflict"
    OVERLAP_FORBIDDEN = "overlap_forbidden"
    PRIORITY_CONFLICT = "priority_conflict"


@dataclass
class MutExDetail:
    rule_a: str
    rule_b: str
    reason: MutExReason
    description: str
    suggestion: str


class RuleValidationError(Exception):
    def __init__(self, rule_id: str, missing_fields: list[str], message: str = ""):
        self.rule_id = rule_id
        self.missing_fields = missing_fields
        self.message = message or f"Rule '{rule_id}' missing fields: {missing_fields}"
        super().__init__(self.message)


@dataclass
class DiscountRule:
    rule_id: str
    name: str
    rule_type: RuleType
    scope: Scope
    applicable_categories: list[str] = field(default_factory=list)
    stackable_with: list[str] = field(default_factory=list)
    exclusive_with: list[str] = field(default_factory=list)
    priority: int = 0
    value: float = 0.0
    enabled: bool = True
    remark: str = ""
    late_supplement: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    REQUIRED_FIELDS = ("rule_id", "name", "rule_type", "scope")

    def validate(self) -> list[str]:
        missing = []
        for f in self.REQUIRED_FIELDS:
            val = getattr(self, f, None)
            if val is None or (isinstance(val, str) and val.strip() == ""):
                missing.append(f)
        return missing

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "rule_type": self.rule_type.value,
            "scope": self.scope.value,
            "applicable_categories": self.applicable_categories,
            "stackable_with": self.stackable_with,
            "exclusive_with": self.exclusive_with,
            "priority": self.priority,
            "value": self.value,
            "enabled": self.enabled,
            "remark": self.remark,
            "late_supplement": self.late_supplement,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> DiscountRule:
        d = copy.deepcopy(data)
        if "rule_type" in d and isinstance(d["rule_type"], str):
            d["rule_type"] = RuleType(d["rule_type"])
        if "scope" in d and isinstance(d["scope"], str):
            d["scope"] = Scope(d["scope"])
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class MutualExclusionDetector:
    def __init__(self, rules: list[DiscountRule]):
        self.rules = {r.rule_id: r for r in rules}
        self._mutex_cache: dict[frozenset[str], Optional[MutExDetail]] = {}

    def check_pair(self, a_id: str, b_id: str) -> Optional[MutExDetail]:
        key = frozenset([a_id, b_id])
        if key in self._mutex_cache:
            return self._mutex_cache[key]

        ra = self.rules.get(a_id)
        rb = self.rules.get(b_id)
        if ra is None or rb is None:
            detail = MutExDetail(
                rule_a=a_id,
                rule_b=b_id,
                reason=MutExReason.SCOPE_CONFLICT,
                description=f"Rule not found: {a_id if ra is None else b_id}",
                suggestion="Check rule registry for missing or deleted rules.",
            )
            self._mutex_cache[key] = detail
            return detail

        result = self._evaluate(ra, rb)
        self._mutex_cache[key] = result
        return result

    def _evaluate(self, ra: DiscountRule, rb: DiscountRule) -> Optional[MutExDetail]:
        if rb.rule_id in ra.exclusive_with or ra.rule_id in rb.exclusive_with:
            return MutExDetail(
                rule_a=ra.rule_id,
                rule_b=rb.rule_id,
                reason=MutExReason.EXPLICIT_EXCLUSIVE,
                description=f"'{ra.name}' and '{rb.name}' are explicitly marked as mutually exclusive.",
                suggestion="Remove one of the two rules from the combination, or update exclusive_with lists if the constraint is outdated.",
            )

        if ra.rule_type == rb.rule_type and ra.scope == rb.scope and ra.scope == Scope.GLOBAL:
            return MutExDetail(
                rule_a=ra.rule_id,
                rule_b=rb.rule_id,
                reason=MutExReason.SAME_TIER,
                description=f"'{ra.name}' and '{rb.name}' are same-type global rules and cannot stack.",
                suggestion="Keep only the higher-priority rule, or change one to a different scope/tier.",
            )

        if ra.scope == Scope.CATEGORY and rb.scope == Scope.CATEGORY:
            overlap = set(ra.applicable_categories) & set(rb.applicable_categories)
            if overlap and ra.rule_type == rb.rule_type:
                return MutExDetail(
                    rule_a=ra.rule_id,
                    rule_b=rb.rule_id,
                    reason=MutExReason.OVERLAP_FORBIDDEN,
                    description=f"'{ra.name}' and '{rb.name}' overlap on categories {overlap} with same type.",
                    suggestion="Narrow category scopes to avoid overlap, or change rule types.",
                )

        if ra.priority == rb.priority and ra.rule_type != rb.rule_type:
            return MutExDetail(
                rule_a=ra.rule_id,
                rule_b=rb.rule_id,
                reason=MutExReason.PRIORITY_CONFLICT,
                description=f"'{ra.name}' and '{rb.name}' share priority {ra.priority} — resolution order is ambiguous.",
                suggestion="Assign distinct priority values to define a clear resolution order.",
            )

        if ra.stackable_with and rb.rule_id not in ra.stackable_with:
            return MutExDetail(
                rule_a=ra.rule_id,
                rule_b=rb.rule_id,
                reason=MutExReason.EXPLICIT_EXCLUSIVE,
                description=f"'{ra.name}' does not list '{rb.name}' in stackable_with.",
                suggestion=f"Add '{rb.rule_id}' to stackable_with of '{ra.rule_id}' if stacking is intended.",
            )

        if rb.stackable_with and ra.rule_id not in rb.stackable_with:
            return MutExDetail(
                rule_a=ra.rule_id,
                rule_b=rb.rule_id,
                reason=MutExReason.EXPLICIT_EXCLUSIVE,
                description=f"'{rb.name}' does not list '{ra.name}' in stackable_with.",
                suggestion=f"Add '{ra.rule_id}' to stackable_with of '{rb.rule_id}' if stacking is intended.",
            )

        return None

    def find_all_exclusions(self) -> list[MutExDetail]:
        results: list[MutExDetail] = []
        ids = list(self.rules.keys())
        for i, a in enumerate(ids):
            for b in ids[i + 1 :]:
                detail = self.check_pair(a, b)
                if detail is not None:
                    results.append(detail)
        return results

    def is_compatible_set(self, rule_ids: list[str]) -> tuple[bool, Optional[MutExDetail]]:
        for i, a in enumerate(rule_ids):
            for b in rule_ids[i + 1 :]:
                detail = self.check_pair(a, b)
                if detail is not None:
                    return False, detail
        return True, None
