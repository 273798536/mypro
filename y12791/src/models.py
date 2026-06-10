from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


@dataclass
class Reagent:
    reagent_id: str
    name: str
    formula: Optional[str] = None
    purity: Optional[float] = None
    purity_unit: Optional[str] = None
    ph_range_min: Optional[float] = None
    ph_range_max: Optional[float] = None
    supplier: Optional[str] = None
    batch_no: Optional[str] = None
    received_date: Optional[str] = None
    expiry_date: Optional[str] = None
    storage_condition: Optional[str] = None
    remark: Optional[str] = None
    is_obsolete: bool = False


@dataclass
class WeighingRecord:
    record_id: str
    batch_id: str
    reagent_id: str
    reagent_name: str
    weighed_amount: Optional[float] = None
    amount_unit: Optional[str] = None
    theoretical_amount: Optional[float] = None
    theoretical_unit: Optional[str] = None
    weigh_time: Optional[str] = None
    operator: Optional[str] = None
    balance_id: Optional[str] = None
    remark: Optional[str] = None
    has_unit_issue: bool = False


@dataclass
class FeedingStep:
    step_no: int
    batch_id: str
    reagent_id: str
    reagent_name: str
    planned_time: Optional[str] = None
    actual_time: Optional[str] = None
    operator: Optional[str] = None
    temperature: Optional[float] = None
    ph_value: Optional[float] = None
    is_blank_control: bool = False
    remark: Optional[str] = None
    safety_note_before: Optional[str] = None
    safety_note_after: Optional[str] = None


@dataclass
class ExperimentRecord:
    experiment_id: str
    batch_id: str
    experiment_date: Optional[str] = None
    reactor_id: Optional[str] = None
    reaction_name: Optional[str] = None
    planned_start_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    planned_end_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    reaction_duration_min: Optional[float] = None
    operator: Optional[str] = None
    reviewer: Optional[str] = None
    old_remark: Optional[str] = None
    current_remark: Optional[str] = None
    feeding_steps: List[FeedingStep] = field(default_factory=list)
    chromatogram_before: Optional[Dict[str, Any]] = None
    chromatogram_after: Optional[Dict[str, Any]] = None


@dataclass
class SafetyNote:
    note_id: str
    batch_id: Optional[str] = None
    reagent_id: Optional[str] = None
    note_type: str = "general"
    content: str = ""
    created_at: Optional[str] = None
    created_by: Optional[str] = None
    affects_judgment: bool = False
    judgment_change_reason: Optional[str] = None


@dataclass
class ValidationIssue:
    issue_id: str
    issue_type: str
    severity: str
    batch_id: str
    description: str
    readable_description: str
    affected_material: Optional[str] = None
    affected_step: Optional[int] = None
    raw_fields: List[str] = field(default_factory=list)
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    safety_related: bool = False
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    batch_id: str
    is_pass: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    blank_control_ok: bool = True
    ph_all_ok: bool = True
    feeding_order_ok: bool = True
    reaction_time_ok: bool = True
    weighing_complete: bool = True
    generated_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
