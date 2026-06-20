from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import hashlib
import json


class SampleSource(str, Enum):
    CURRENT = "current"
    OLD_QUEUE = "old_queue"
    BOUNDARY = "boundary"
    MISJUDGE = "misjudge"


class NoteType(str, Enum):
    VERBAL = "verbal"
    FORMAL = "formal"


class GateDecision(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"


def _generate_id() -> str:
    return uuid.uuid4().hex[:12]


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class Sample:
    sample_id: str
    content: str
    expected_label: str
    predicted_label: Optional[str] = None
    score: Optional[float] = None
    source: SampleSource = SampleSource.CURRENT
    version: str = "current"
    is_boundary: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_correct(self) -> Optional[bool]:
        if self.predicted_label is None:
            return None
        return self.predicted_label == self.expected_label


@dataclass
class GateParams:
    gray_ratio: float = 1.0
    pass_threshold: float = 0.8
    fail_threshold: float = 0.6
    max_old_queue_ratio: float = 0.3
    max_boundary_ratio: float = 0.1
    min_total_samples: int = 10
    version: str = "v1"

    def validate(self) -> List[str]:
        errors = []
        if not (0 < self.gray_ratio <= 1):
            errors.append(
                f"gray_ratio 必须在 (0, 1] 之间，当前值 {self.gray_ratio}。"
                f"下一步：请检查 config.json 中 gray_ratio 字段，改为 0 到 1 之间的小数，例如 0.5 表示 50% 灰度。"
            )
        if not (0 <= self.pass_threshold <= 1):
            errors.append(
                f"pass_threshold 必须在 [0, 1] 之间，当前值 {self.pass_threshold}。"
                f"下一步：请检查 config.json 中 pass_threshold 字段，设置为通过率阈值，例如 0.8 表示 80% 正确才通过。"
            )
        if not (0 <= self.fail_threshold <= 1):
            errors.append(
                f"fail_threshold 必须在 [0, 1] 之间，当前值 {self.fail_threshold}。"
                f"下一步：请检查 config.json 中 fail_threshold 字段，设置为失败率阈值，例如 0.6 表示低于 60% 直接失败。"
            )
        if self.pass_threshold < self.fail_threshold:
            errors.append(
                f"pass_threshold ({self.pass_threshold}) 不能小于 fail_threshold ({self.fail_threshold})。"
                f"下一步：请交换两个阈值的数值，或重新设定合理的通过/失败标准。"
            )
        if self.min_total_samples < 1:
            errors.append(
                f"min_total_samples 必须 >= 1，当前值 {self.min_total_samples}。"
                f"下一步：请检查 config.json 中 min_total_samples 字段，设置最少评测样本数。"
            )
        if not (0 <= self.max_old_queue_ratio <= 1):
            errors.append(
                f"max_old_queue_ratio 必须在 [0, 1] 之间，当前值 {self.max_old_queue_ratio}。"
                f"下一步：请检查 config.json 中 max_old_queue_ratio 字段，限制旧版队列混入比例。"
            )
        if not (0 <= self.max_boundary_ratio <= 1):
            errors.append(
                f"max_boundary_ratio 必须在 [0, 1] 之间，当前值 {self.max_boundary_ratio}。"
                f"下一步：请检查 config.json 中 max_boundary_ratio 字段，限制边界样本混入比例。"
            )
        return errors

    def fingerprint(self) -> str:
        data = asdict(self)
        raw = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


@dataclass
class ParamSnapshot:
    snapshot_id: str = field(default_factory=_generate_id)
    params: GateParams = field(default_factory=GateParams)
    created_at: str = field(default_factory=_now_iso)
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "params": asdict(self.params),
            "created_at": self.created_at,
            "reason": self.reason,
            "fingerprint": self.params.fingerprint(),
        }


@dataclass
class Note:
    note_id: str = field(default_factory=_generate_id)
    content: str = ""
    note_type: NoteType = NoteType.VERBAL
    author: str = "anonymous"
    created_at: str = field(default_factory=_now_iso)
    related_sample_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "note_id": self.note_id,
            "content": self.content,
            "note_type": self.note_type.value,
            "author": self.author,
            "created_at": self.created_at,
            "related_sample_ids": self.related_sample_ids,
        }


@dataclass
class AttributionResult:
    factor: str
    impact_decision: bool
    impact_accuracy: float
    description: str
    affected_samples: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "factor": self.factor,
            "impact_decision": self.impact_decision,
            "impact_accuracy": round(self.impact_accuracy, 4),
            "description": self.description,
            "affected_samples": self.affected_samples,
        }


@dataclass
class MisjudgeExplain:
    sample_id: str
    old_predicted: str
    new_predicted: str
    expected: str
    changed_correct: bool
    reason: str
    score_change: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_id": self.sample_id,
            "old_predicted": self.old_predicted,
            "new_predicted": self.new_predicted,
            "expected": self.expected,
            "changed_correct": self.changed_correct,
            "reason": self.reason,
            "score_change": round(self.score_change, 4) if self.score_change is not None else None,
        }


@dataclass
class EvalResult:
    run_id: str = field(default_factory=_generate_id)
    decision: GateDecision = GateDecision.FAIL
    total_samples: int = 0
    correct_samples: int = 0
    accuracy: float = 0.0
    fail_samples: List[str] = field(default_factory=list)
    boundary_samples: List[str] = field(default_factory=list)
    old_queue_samples: List[str] = field(default_factory=list)
    misjudge_samples: List[str] = field(default_factory=list)
    attributions: List[AttributionResult] = field(default_factory=list)
    misjudge_explanations: List[MisjudgeExplain] = field(default_factory=list)
    param_errors: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    param_snapshot_id: str = ""
    created_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "decision": self.decision.value,
            "total_samples": self.total_samples,
            "correct_samples": self.correct_samples,
            "accuracy": round(self.accuracy, 4),
            "fail_samples": self.fail_samples,
            "boundary_samples": self.boundary_samples,
            "old_queue_samples": self.old_queue_samples,
            "misjudge_samples": self.misjudge_samples,
            "attributions": [a.to_dict() for a in self.attributions],
            "misjudge_explanations": [m.to_dict() for m in self.misjudge_explanations],
            "param_errors": self.param_errors,
            "next_steps": self.next_steps,
            "param_snapshot_id": self.param_snapshot_id,
            "created_at": self.created_at,
        }


@dataclass
class GateState:
    state_id: str = field(default_factory=_generate_id)
    current_params: GateParams = field(default_factory=GateParams)
    current_result: Optional[EvalResult] = None
    param_history: List[ParamSnapshot] = field(default_factory=list)
    notes: List[Note] = field(default_factory=list)
    last_updated: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "state_id": self.state_id,
            "current_params": asdict(self.current_params),
            "current_result": self.current_result.to_dict() if self.current_result else None,
            "param_history": [p.to_dict() for p in self.param_history],
            "notes": [n.to_dict() for n in self.notes],
            "last_updated": self.last_updated,
        }
