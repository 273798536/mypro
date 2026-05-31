from dataclasses import dataclass, field
import pandas as pd
from typing import Optional


@dataclass
class AuditFinding:
    check_key: str
    check_label: str
    severity: str
    finding_count: int
    total_affected_amount: float
    finding_df: pd.DataFrame
    summary: str
    reason_template: str
    evidence_columns: list[str]

    def as_dict(self) -> dict:
        return {
            "check_key": self.check_key,
            "check_label": self.check_label,
            "severity": self.severity,
            "finding_count": self.finding_count,
            "total_affected_amount": self.total_affected_amount,
            "summary": self.summary,
            "reason_template": self.reason_template,
            "evidence_columns": self.evidence_columns,
        }


@dataclass
class AuditResult:
    findings: list[AuditFinding] = field(default_factory=list)
    raw_audit_detail: pd.DataFrame = field(default_factory=pd.DataFrame)

    def add(self, finding: AuditFinding) -> None:
        self.findings.append(finding)

    def total_issues(self) -> int:
        return sum(f.finding_count for f in self.findings)

    def total_amount(self) -> float:
        return sum(f.total_affected_amount for f in self.findings)
