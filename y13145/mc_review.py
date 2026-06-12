from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional


class TimelineStatus(str, Enum):
    PROCESSED = "已处理"
    PENDING = "待补材料"
    MANUAL_OVERRIDE = "人工改判"


class WeightChangeReason(str, Enum):
    DATA_CORRECTION = "数据纠正"
    CALIBRATION = "标定调整"
    MANUAL_JUDGMENT = "人工改判"
    OTHER = "其他"


@dataclass
class RawSource:
    student_id: str
    original_statement: str
    submitted_at: str
    raw_data: dict[str, Any] = field(default_factory=dict)
    is_dirty: bool = False
    dirt_description: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> RawSource:
        return cls(**d)


@dataclass
class WrongAnswer:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    question_id: str = ""
    student_answer: Any = None
    correct_answer: Any = None
    error_type: str = ""
    unit: str = ""
    raw_source: Optional[RawSource] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        if self.raw_source is not None:
            d["raw_source"] = self.raw_source.to_dict()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> WrongAnswer:
        rs = d.pop("raw_source", None)
        obj = cls(**d)
        if rs:
            obj.raw_source = RawSource.from_dict(rs)
        return obj


@dataclass
class WeightChange:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    wrong_answer_id: str = ""
    param_name: str = ""
    old_value: Any = None
    new_value: Any = None
    unit: str = ""
    reason: str = ""
    reason_detail: str = ""
    changed_by: str = ""
    changed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> WeightChange:
        return cls(**d)


@dataclass
class ExtrapolationBreach:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    wrong_answer_id: str = ""
    param_name: str = ""
    extrapolated_value: Any = None
    boundary_low: Any = None
    boundary_high: Any = None
    unit: str = ""
    original_statement: str = ""
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolution: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> ExtrapolationBreach:
        return cls(**d)


@dataclass
class CalculationStep:
    step_index: int
    description: str
    formula: str = ""
    input_values: dict[str, Any] = field(default_factory=dict)
    output_value: Any = None
    unit_before: str = ""
    unit_after: str = ""
    conversion_factor: Any = None
    boundary_low: Any = None
    boundary_high: Any = None
    note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> CalculationStep:
        return cls(**d)


@dataclass
class TimelineEntry:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event_type: str = ""
    description: str = ""
    status: str = TimelineStatus.PROCESSED.value
    related_wrong_answer_id: str = ""
    related_weight_change_id: str = ""
    related_breach_id: str = ""
    operator: str = ""
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> TimelineEntry:
        return cls(**d)


class MonteCarloReview:
    def __init__(self) -> None:
        self.wrong_answers: dict[str, WrongAnswer] = {}
        self.weight_changes: dict[str, WeightChange] = {}
        self.breaches: dict[str, ExtrapolationBreach] = {}
        self.calculation_steps: list[CalculationStep] = []
        self.timeline: list[TimelineEntry] = []

    def add_wrong_answer(
        self,
        question_id: str,
        student_answer: Any,
        correct_answer: Any,
        error_type: str,
        unit: str = "",
        student_id: str = "",
        original_statement: str = "",
        submitted_at: str = "",
        raw_data: dict[str, Any] | None = None,
        is_dirty: bool = False,
        dirt_description: str = "",
        tags: list[str] | None = None,
    ) -> WrongAnswer:
        raw_source = None
        if student_id or original_statement:
            raw_source = RawSource(
                student_id=student_id,
                original_statement=original_statement,
                submitted_at=submitted_at or datetime.now(timezone.utc).isoformat(),
                raw_data=raw_data or {},
                is_dirty=is_dirty,
                dirt_description=dirt_description,
            )
        wa = WrongAnswer(
            question_id=question_id,
            student_answer=student_answer,
            correct_answer=correct_answer,
            error_type=error_type,
            unit=unit,
            raw_source=raw_source,
            tags=tags or [],
        )
        self.wrong_answers[wa.id] = wa
        self._add_timeline(
            event_type="录入错题",
            description=f"录入错题 {question_id}，学生答案={student_answer}，正确答案={correct_answer}",
            status=TimelineStatus.PROCESSED.value,
            related_wrong_answer_id=wa.id,
        )
        return wa

    def change_weight(
        self,
        wrong_answer_id: str,
        param_name: str,
        old_value: Any,
        new_value: Any,
        unit: str = "",
        reason: str = "",
        reason_detail: str = "",
        changed_by: str = "",
    ) -> WeightChange:
        if wrong_answer_id not in self.wrong_answers:
            raise ValueError(f"错题 {wrong_answer_id} 不存在")
        wc = WeightChange(
            wrong_answer_id=wrong_answer_id,
            param_name=param_name,
            old_value=old_value,
            new_value=new_value,
            unit=unit,
            reason=reason,
            reason_detail=reason_detail,
            changed_by=changed_by,
        )
        self.weight_changes[wc.id] = wc
        status = TimelineStatus.MANUAL_OVERRIDE.value if reason == WeightChangeReason.MANUAL_JUDGMENT.value else TimelineStatus.PROCESSED.value
        self._add_timeline(
            event_type="权重修改",
            description=f"参数 {param_name} 从 {old_value} 改为 {new_value}（{unit}），原因：{reason}",
            status=status,
            related_wrong_answer_id=wrong_answer_id,
            related_weight_change_id=wc.id,
            operator=changed_by,
        )
        return wc

    def add_calculation_step(
        self,
        description: str,
        formula: str = "",
        input_values: dict[str, Any] | None = None,
        output_value: Any = None,
        unit_before: str = "",
        unit_after: str = "",
        conversion_factor: Any = None,
        boundary_low: Any = None,
        boundary_high: Any = None,
        note: str = "",
    ) -> CalculationStep:
        step = CalculationStep(
            step_index=len(self.calculation_steps),
            description=description,
            formula=formula,
            input_values=input_values or {},
            output_value=output_value,
            unit_before=unit_before,
            unit_after=unit_after,
            conversion_factor=conversion_factor,
            boundary_low=boundary_low,
            boundary_high=boundary_high,
            note=note,
        )
        self.calculation_steps.append(step)
        self._add_timeline(
            event_type="计算步骤",
            description=f"步骤 {step.step_index}: {description}",
            status=TimelineStatus.PROCESSED.value,
        )
        return step

    def check_extrapolation(
        self,
        wrong_answer_id: str,
        param_name: str,
        extrapolated_value: Any,
        boundary_low: Any,
        boundary_high: Any,
        unit: str = "",
    ) -> Optional[ExtrapolationBreach]:
        if extrapolated_value < boundary_low or extrapolated_value > boundary_high:
            wa = self.wrong_answers.get(wrong_answer_id)
            original_statement = ""
            if wa and wa.raw_source:
                original_statement = wa.raw_source.original_statement
            breach = ExtrapolationBreach(
                wrong_answer_id=wrong_answer_id,
                param_name=param_name,
                extrapolated_value=extrapolated_value,
                boundary_low=boundary_low,
                boundary_high=boundary_high,
                unit=unit,
                original_statement=original_statement,
            )
            self.breaches[breach.id] = breach
            self._add_timeline(
                event_type="外推越界",
                description=f"参数 {param_name} 外推值 {extrapolated_value}{unit} 越界 [{boundary_low}, {boundary_high}]，"
                            f"原始说法：{original_statement or '无'}",
                status=TimelineStatus.PENDING.value,
                related_wrong_answer_id=wrong_answer_id,
                related_breach_id=breach.id,
            )
            return breach
        return None

    def trace_wrong_answer(self, wrong_answer_id: str) -> dict[str, Any]:
        wa = self.wrong_answers.get(wrong_answer_id)
        if not wa:
            raise ValueError(f"错题 {wrong_answer_id} 不存在")
        related_weights = [
            wc for wc in self.weight_changes.values()
            if wc.wrong_answer_id == wrong_answer_id
        ]
        related_breaches = [
            b for b in self.breaches.values()
            if b.wrong_answer_id == wrong_answer_id
        ]
        related_timeline = [
            t for t in self.timeline
            if t.related_wrong_answer_id == wrong_answer_id
        ]
        return {
            "wrong_answer": wa.to_dict(),
            "weight_changes": [wc.to_dict() for wc in related_weights],
            "breaches": [b.to_dict() for b in related_breaches],
            "timeline": [t.to_dict() for t in related_timeline],
        }

    def trace_from_original_statement(self, original_statement: str) -> list[dict[str, Any]]:
        results = []
        for wa in self.wrong_answers.values():
            if wa.raw_source and original_statement in wa.raw_source.original_statement:
                results.append(self.trace_wrong_answer(wa.id))
        return results

    def get_timeline_by_status(self, status: str) -> list[TimelineEntry]:
        return [t for t in self.timeline if t.status == status]

    def get_timeline_grouped(self) -> dict[str, list[dict]]:
        grouped: dict[str, list[dict]] = {
            TimelineStatus.PROCESSED.value: [],
            TimelineStatus.PENDING.value: [],
            TimelineStatus.MANUAL_OVERRIDE.value: [],
        }
        for t in self.timeline:
            grouped.setdefault(t.status, []).append(t.to_dict())
        return grouped

    def resolve_breach(self, breach_id: str, resolution: str, operator: str = "") -> None:
        breach = self.breaches.get(breach_id)
        if not breach:
            raise ValueError(f"越界记录 {breach_id} 不存在")
        breach.resolution = resolution
        for t in self.timeline:
            if t.related_breach_id == breach_id:
                t.status = TimelineStatus.PROCESSED.value
                t.detail = {"resolution": resolution, "resolved_by": operator}
        self._add_timeline(
            event_type="越界处理",
            description=f"越界 {breach.param_name} 已处理：{resolution}",
            status=TimelineStatus.PROCESSED.value,
            related_wrong_answer_id=breach.wrong_answer_id,
            related_breach_id=breach_id,
            operator=operator,
        )

    def get_calculation_report(self) -> list[dict]:
        return [s.to_dict() for s in self.calculation_steps]

    def get_comparison_view(self) -> dict[str, Any]:
        weight_by_param: dict[str, list[dict]] = {}
        for wc in self.weight_changes.values():
            weight_by_param.setdefault(wc.param_name, []).append(wc.to_dict())
        return {
            "weight_changes_by_param": weight_by_param,
            "calculation_steps": self.get_calculation_report(),
        }

    def _add_timeline(
        self,
        event_type: str,
        description: str,
        status: str = TimelineStatus.PROCESSED.value,
        related_wrong_answer_id: str = "",
        related_weight_change_id: str = "",
        related_breach_id: str = "",
        operator: str = "",
        detail: dict[str, Any] | None = None,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            event_type=event_type,
            description=description,
            status=status,
            related_wrong_answer_id=related_wrong_answer_id,
            related_weight_change_id=related_weight_change_id,
            related_breach_id=related_breach_id,
            operator=operator,
            detail=detail or {},
        )
        self.timeline.append(entry)
        return entry

    def save(self, filepath: str) -> None:
        data = {
            "wrong_answers": {k: v.to_dict() for k, v in self.wrong_answers.items()},
            "weight_changes": {k: v.to_dict() for k, v in self.weight_changes.items()},
            "breaches": {k: v.to_dict() for k, v in self.breaches.items()},
            "calculation_steps": [s.to_dict() for s in self.calculation_steps],
            "timeline": [t.to_dict() for t in self.timeline],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, filepath: str) -> MonteCarloReview:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        review = cls()
        for k, v in data.get("wrong_answers", {}).items():
            review.wrong_answers[k] = WrongAnswer.from_dict(v)
        for k, v in data.get("weight_changes", {}).items():
            review.weight_changes[k] = WeightChange.from_dict(v)
        for k, v in data.get("breaches", {}).items():
            review.breaches[k] = ExtrapolationBreach.from_dict(v)
        for s in data.get("calculation_steps", []):
            review.calculation_steps.append(CalculationStep.from_dict(s))
        for t in data.get("timeline", []):
            review.timeline.append(TimelineEntry.from_dict(t))
        return review
