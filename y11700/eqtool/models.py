from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import uuid
from datetime import datetime


class DataSource(Enum):
    STUDENT_SCORE = "student_score"
    TEST_FORM = "test_form"
    ANCHOR_ITEM = "anchor_item"
    DIFFICULTY_PARAM = "difficulty_param"
    ABSENCE_MARK = "absence_mark"
    CONVERSION_REPORT = "conversion_report"


class AbsenceStatus(Enum):
    PRESENT = "present"
    ABSENT = "absent"
    INVALID = "invalid"


class ImportStrategy(Enum):
    IGNORE = "ignore"
    OVERWRITE = "overwrite"
    APPEND = "append"


class CorrectionType(Enum):
    MISSING_ANCHOR_IMPUTED = "missing_anchor_imputed"
    EXTREME_SCORE_CAPPED = "extreme_score_capped"
    ABSENCE_EXCLUDED = "absence_excluded"
    DUPLICATE_REMOVED = "duplicate_removed"
    OUTLIER_FLAGGED = "outlier_flagged"


@dataclass
class CorrectionRecord:
    correction_id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    correction_type: CorrectionType = CorrectionType.OUTLIER_FLAGGED
    student_id: str = ""
    test_form: str = ""
    original_value: str = ""
    corrected_value: str = ""
    reason: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def to_row(self) -> Dict[str, str]:
        return {
            "修正ID": self.correction_id,
            "修正类型": self.correction_type.value,
            "学生ID": self.student_id,
            "试卷版本": self.test_form,
            "原始值": self.original_value,
            "修正值": self.corrected_value,
            "原因": self.reason,
            "时间戳": self.timestamp,
        }


@dataclass
class AnchorItem:
    item_id: str
    test_form: str
    difficulty: float = 0.0
    discrimination: float = 1.0
    is_anchor: bool = True
    score_mean: float = 0.0
    score_sd: float = 1.0
    sample_size: int = 0


@dataclass
class TestForm:
    form_id: str
    subject: str = ""
    total_items: int = 0
    anchor_items: List[str] = field(default_factory=list)
    difficulty_mean: float = 0.0
    difficulty_sd: float = 1.0
    raw_mean: float = 0.0
    raw_sd: float = 1.0
    sample_size: int = 0


@dataclass
class DifficultyParam:
    item_id: str
    test_form: str
    b_parameter: float = 0.0
    a_parameter: float = 1.0
    source: str = ""


@dataclass
class AbsenceMark:
    student_id: str
    test_form: str
    status: AbsenceStatus = AbsenceStatus.PRESENT
    reason: str = ""


@dataclass
class StudentScore:
    student_id: str
    test_form: str
    raw_score: float = 0.0
    total_possible: float = 100.0
    anchor_score: Optional[float] = None
    ability_estimate: float = 0.0
    equated_score: float = 0.0
    is_valid: bool = True
    exclusion_reason: str = ""
    corrections: List[CorrectionRecord] = field(default_factory=list)


@dataclass
class EquatingResult:
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    reference_form: str = ""
    target_form: str = ""
    method: str = "mean_sigma"
    slope: float = 1.0
    intercept: float = 0.0
    standard_error: float = 0.0
    anchor_count: int = 0
    anchor_r: float = 0.0
    sample_size_ref: int = 0
    sample_size_tgt: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def transform(self, raw: float) -> float:
        return self.slope * raw + self.intercept


@dataclass
class Session:
    session_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = ""
    source_files: Dict[str, str] = field(default_factory=dict)
    test_forms: Dict[str, TestForm] = field(default_factory=dict)
    anchor_items: Dict[str, AnchorItem] = field(default_factory=dict)
    difficulty_params: Dict[str, DifficultyParam] = field(default_factory=dict)
    absence_marks: Dict[str, List[AbsenceMark]] = field(default_factory=dict)
    student_scores: Dict[str, List[StudentScore]] = field(default_factory=dict)
    corrections: List[CorrectionRecord] = field(default_factory=list)
    equating_results: Dict[str, EquatingResult] = field(default_factory=dict)
    warnings: List[Dict] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def summary(self) -> Dict:
        return {
            "会话ID": self.session_id,
            "名称": self.name,
            "试卷数": len(self.test_forms),
            "锚题数": len(self.anchor_items),
            "学生记录数": sum(len(v) for v in self.student_scores.values()),
            "缺考标记数": sum(len(v) for v in self.absence_marks.values()),
            "修正条数": len(self.corrections),
            "警告数": len(self.warnings),
            "等值结果数": len(self.equating_results),
            "创建时间": self.created_at,
        }


@dataclass
class ConversionReport:
    report_id: str
    session_id: str
    test_form: str
    raw_to_equated: Dict[float, float] = field(default_factory=dict)
    summary_stats: Dict = field(default_factory=dict)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))