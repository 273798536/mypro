from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import datetime


class IssueCategory(Enum):
    MODE_MISJUDGE = "调式误判"
    MEASURE_MISALIGN = "小节错位"
    MODEL_MIX = "模型混用"


class IssueStatus(Enum):
    PENDING_CONFIRM = "待确认"
    CONFIRMED = "已确认"
    RESOLVED = "已解决"


@dataclass
class Note:
    beat: float
    pitch: str
    duration: float


@dataclass
class Measure:
    measure_num: int
    notes: list[Note] = field(default_factory=list)


@dataclass
class MelodyInput:
    case_id: str
    title: str
    key_signature: str
    mode: str
    time_signature: str
    tempo: int
    measures: list[Measure] = field(default_factory=list)


@dataclass
class ChordEntry:
    measure_num: int
    chord: str
    confidence: float


@dataclass
class ChordResult:
    case_id: str
    model_version: str
    timestamp: str
    chords: list[ChordEntry] = field(default_factory=list)


@dataclass
class ModelVersion:
    model_id: str
    release_date: str
    trainer: str
    training_data_version: str
    known_issues: list[str] = field(default_factory=list)


@dataclass
class AmendmentChange:
    measure_num: int
    original_chord: str
    corrected_chord: str
    reason: str


@dataclass
class Amendment:
    amendment_id: str
    timestamp: str
    operator: str
    changes: list[AmendmentChange] = field(default_factory=list)


@dataclass
class Correction:
    case_id: str
    amendments: list[Amendment] = field(default_factory=list)


@dataclass
class Issue:
    case_id: str
    category: IssueCategory
    status: IssueStatus
    measure_num: Optional[int]
    detail: str
    next_step: str
    confidence: Optional[float] = None


@dataclass
class ReviewResult:
    case_id: str
    melody: MelodyInput
    chord: ChordResult
    issues: list[Issue] = field(default_factory=list)
    corrections_applied: list[AmendmentChange] = field(default_factory=list)
    model_version_info: Optional[ModelVersion] = None
    review_timestamp: str = ""

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "melody_key": f"{self.melody.key_signature} {self.melody.mode}",
            "chord_model": self.chord.model_version,
            "issue_count": len(self.issues),
            "issues": [
                {
                    "category": i.category.value,
                    "status": i.status.value,
                    "measure": i.measure_num,
                    "detail": i.detail,
                    "next_step": i.next_step,
                }
                for i in self.issues
            ],
            "corrections_applied": [
                {
                    "measure": c.measure_num,
                    "original": c.original_chord,
                    "corrected": c.corrected_chord,
                    "reason": c.reason,
                }
                for c in self.corrections_applied
            ],
            "review_timestamp": self.review_timestamp,
        }
