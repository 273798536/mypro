from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional

from tax_bracket import TaxTable
from deduction_merger import MergeResult


@dataclass
class ValidationIssue:
    level: str
    message: str
    source_ref: str

    LEVEL_ERROR = "ERROR"
    LEVEL_WARN = "WARN"

    def __str__(self) -> str:
        return f"[{self.level}] {self.message}  ← {self.source_ref}"


@dataclass
class ValidationResult:
    issues: List[ValidationIssue]

    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.level == ValidationIssue.LEVEL_ERROR]

    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.level == ValidationIssue.LEVEL_WARN]

    @property
    def has_error(self) -> bool:
        return len(self.errors) > 0

    def summary(self) -> str:
        lines = [f"校验结果: {len(self.errors)} 错误, {len(self.warnings)} 警告"]
        for i in self.issues:
            lines.append(str(i))
        return "\n".join(lines)


def validate(
    tables: List[TaxTable],
    merge_result: MergeResult,
    as_of: Optional[date] = None,
) -> ValidationResult:
    issues: List[ValidationIssue] = []
    ref = as_of or date.today()

    for table in tables:
        expiry = table.expiry_detail(as_of)
        if expiry:
            issues.append(ValidationIssue(
                level=ValidationIssue.LEVEL_ERROR,
                message=expiry,
                source_ref=f"税率表ID={table.id}, 来源={table.source or '未标注'}",
            ))

    for conflict in merge_result.conflicts:
        detail = conflict.describe()
        for it in conflict.items:
            issues.append(ValidationIssue(
                level=ValidationIssue.LEVEL_ERROR,
                message=detail,
                source_ref=it.location,
            ))

    for warn in merge_result.negative_warnings:
        issues.append(ValidationIssue(
            level=ValidationIssue.LEVEL_WARN,
            message=warn,
            source_ref="扣除项合并检查",
        ))

    return ValidationResult(issues=issues)
