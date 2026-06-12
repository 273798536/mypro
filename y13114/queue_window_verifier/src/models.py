from datetime import datetime
from enum import Enum
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, Field


class Unit(str, Enum):
    PERSON = "person"
    HOUR = "hour"
    MINUTE = "minute"
    WINDOW = "window"
    RATIO = "ratio"
    SCORE = "score"


class JudgmentOutcome(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"
    NEUTRAL = "NEUTRAL"


class EvidenceStatus(str, Enum):
    PROVIDED = "PROVIDED"
    PENDING = "PENDING"
    WAIVED = "WAIVED"


class ProcessingStatus(str, Enum):
    HANDLED = "HANDLED"
    NEED_EVIDENCE = "NEED_EVIDENCE"
    TODO = "TODO"


class ParamRow(BaseModel):
    row_id: str
    row_number: int
    param_name: str
    param_value: float
    unit: Unit
    weight: float = 1.0
    description: str = ""
    source_line: str = ""
    valid_range: Optional[Dict[str, float]] = None


class WeightChange(BaseModel):
    row_id: str
    param_name: str
    old_weight: float
    new_weight: float
    changed_by: str
    changed_at: datetime
    reason: str = ""


class Note(BaseModel):
    note_id: str
    target_type: str
    target_id: str
    content: str
    author: str
    created_at: datetime
    is_temporary: bool = False


class UnitConversion(BaseModel):
    from_unit: Unit
    to_unit: Unit
    from_value: float
    to_value: float
    conversion_formula: str


class IntermediateStep(BaseModel):
    step_id: str
    step_name: str
    description: str
    inputs: Dict[str, Any] = {}
    conversions: List[UnitConversion] = []
    calculation: str = ""
    result_value: float
    result_unit: Unit
    source_row_ids: List[str] = []


class JudgmentChange(BaseModel):
    judgment_id: str
    rule_name: str
    old_outcome: JudgmentOutcome
    new_outcome: JudgmentOutcome
    affected_window_ids: List[str] = []
    explanation: str = ""
    related_param_changes: List[str] = []
    related_steps: List[str] = []


class ExtrapolationIssue(BaseModel):
    issue_id: str
    window_id: str
    param_name: str
    row_id: str
    source_line: str
    extrapolated_value: float
    valid_min: Optional[float] = None
    valid_max: Optional[float] = None
    direction: str
    impact_scope: List[str] = []
    impact_description: str = ""


class Evidence(BaseModel):
    evidence_id: str
    ref_type: str
    ref_id: str
    title: str
    description: str = ""
    status: EvidenceStatus
    provided_by: str = ""
    provided_at: Optional[datetime] = None
    attachment_ref: str = ""


class TimelineEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: datetime
    actor: str
    summary: str
    details: Dict[str, Any] = {}


class WindowVerdict(BaseModel):
    window_id: str
    window_name: str
    final_score: float
    outcome: JudgmentOutcome
    handling_status: ProcessingStatus
    steps: List[IntermediateStep] = []
    issues: List[str] = []
    evidence_ids: List[str] = []


class VerificationReport(BaseModel):
    report_id: str
    generated_at: datetime
    param_table_version_a: str
    param_table_version_b: str
    param_rows: List[ParamRow] = []
    weight_changes: List[WeightChange] = []
    notes: List[Note] = []
    judgments: List[JudgmentChange] = []
    extrapolation_issues: List[ExtrapolationIssue] = []
    evidences: List[Evidence] = []
    timeline: List[TimelineEvent] = []
    window_verdicts: List[WindowVerdict] = []

    def summary_counts(self) -> Dict[str, int]:
        return {
            "param_rows": len(self.param_rows),
            "weight_changes": len(self.weight_changes),
            "judgments": len(self.judgments),
            "judgment_changes": sum(1 for j in self.judgments if j.old_outcome != j.new_outcome),
            "extrapolation_issues": len(self.extrapolation_issues),
            "evidences_pending": sum(1 for e in self.evidences if e.status == EvidenceStatus.PENDING),
            "evidences_provided": sum(1 for e in self.evidences if e.status == EvidenceStatus.PROVIDED),
            "windows_handled": sum(1 for w in self.window_verdicts if w.handling_status == ProcessingStatus.HANDLED),
            "windows_need_evidence": sum(1 for w in self.window_verdicts if w.handling_status == ProcessingStatus.NEED_EVIDENCE),
            "windows_todo": sum(1 for w in self.window_verdicts if w.handling_status == ProcessingStatus.TODO),
        }
