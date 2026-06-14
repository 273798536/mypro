from __future__ import annotations

import csv
import html
import io
import json
import os
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

    def list_wrong_answers(self) -> list[dict]:
        return [wa.to_dict() for wa in self.wrong_answers.values()]

    def list_weight_changes(self, param_name: Optional[str] = None) -> list[dict]:
        changes = list(self.weight_changes.values())
        if param_name:
            changes = [c for c in changes if c.param_name == param_name]
        return [c.to_dict() for c in changes]

    def list_breaches(self, resolved: Optional[bool] = None) -> list[dict]:
        breaches = list(self.breaches.values())
        if resolved is True:
            breaches = [b for b in breaches if b.resolution]
        elif resolved is False:
            breaches = [b for b in breaches if not b.resolution]
        return [b.to_dict() for b in breaches]

    def summary(self) -> dict:
        grouped = self.get_timeline_grouped()
        return {
            "wrong_answer_count": len(self.wrong_answers),
            "weight_change_count": len(self.weight_changes),
            "breach_count": len(self.breaches),
            "resolved_breach_count": len([b for b in self.breaches.values() if b.resolution]),
            "calculation_step_count": len(self.calculation_steps),
            "timeline_total": len(self.timeline),
            "timeline_processed": len(grouped.get(TimelineStatus.PROCESSED.value, [])),
            "timeline_pending": len(grouped.get(TimelineStatus.PENDING.value, [])),
            "timeline_manual_override": len(grouped.get(TimelineStatus.MANUAL_OVERRIDE.value, [])),
        }

    def export_json(self, filepath: str) -> None:
        self.save(filepath)

    def export_csv(self, output_dir: str) -> dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        paths = {}

        wa_path = os.path.join(output_dir, "wrong_answers.csv")
        with open(wa_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "id", "question_id", "student_answer", "correct_answer",
                "error_type", "unit", "student_id", "original_statement",
                "is_dirty", "dirt_description", "created_at",
            ])
            for wa in self.wrong_answers.values():
                sid = ""
                stmt = ""
                dirty = False
                dirty_desc = ""
                if wa.raw_source:
                    sid = wa.raw_source.student_id
                    stmt = wa.raw_source.original_statement
                    dirty = wa.raw_source.is_dirty
                    dirty_desc = wa.raw_source.dirt_description
                writer.writerow([
                    wa.id, wa.question_id, wa.student_answer, wa.correct_answer,
                    wa.error_type, wa.unit, sid, stmt, dirty, dirty_desc, wa.created_at,
                ])
        paths["wrong_answers"] = wa_path

        wc_path = os.path.join(output_dir, "weight_changes.csv")
        with open(wc_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "id", "wrong_answer_id", "param_name", "old_value", "new_value",
                "unit", "reason", "reason_detail", "changed_by", "changed_at",
            ])
            for wc in self.weight_changes.values():
                writer.writerow([
                    wc.id, wc.wrong_answer_id, wc.param_name, wc.old_value, wc.new_value,
                    wc.unit, wc.reason, wc.reason_detail, wc.changed_by, wc.changed_at,
                ])
        paths["weight_changes"] = wc_path

        b_path = os.path.join(output_dir, "breaches.csv")
        with open(b_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "id", "wrong_answer_id", "param_name", "extrapolated_value",
                "boundary_low", "boundary_high", "unit", "original_statement",
                "detected_at", "resolution",
            ])
            for b in self.breaches.values():
                writer.writerow([
                    b.id, b.wrong_answer_id, b.param_name, b.extrapolated_value,
                    b.boundary_low, b.boundary_high, b.unit, b.original_statement,
                    b.detected_at, b.resolution,
                ])
        paths["breaches"] = b_path

        cs_path = os.path.join(output_dir, "calculation_steps.csv")
        with open(cs_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "step_index", "description", "formula", "input_values",
                "output_value", "unit_before", "unit_after",
                "conversion_factor", "boundary_low", "boundary_high", "note",
            ])
            for s in self.calculation_steps:
                writer.writerow([
                    s.step_index, s.description, s.formula,
                    json.dumps(s.input_values, ensure_ascii=False),
                    s.output_value, s.unit_before, s.unit_after,
                    s.conversion_factor, s.boundary_low, s.boundary_high, s.note,
                ])
        paths["calculation_steps"] = cs_path

        tl_path = os.path.join(output_dir, "timeline.csv")
        with open(tl_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "id", "timestamp", "event_type", "description", "status",
                "related_wrong_answer_id", "related_weight_change_id",
                "related_breach_id", "operator", "detail",
            ])
            for t in self.timeline:
                writer.writerow([
                    t.id, t.timestamp, t.event_type, t.description, t.status,
                    t.related_wrong_answer_id, t.related_weight_change_id,
                    t.related_breach_id, t.operator,
                    json.dumps(t.detail, ensure_ascii=False),
                ])
        paths["timeline"] = tl_path

        return paths

    def export_html_report(self, filepath: str, title: str = "蒙特卡洛误差错题复盘报告") -> str:
        s = self.summary()
        grouped = self.get_timeline_grouped()

        def _h(text: Any) -> str:
            return html.escape(str(text)) if text is not None else ""

        def _wa_rows() -> str:
            rows = []
            for wa in self.wrong_answers.values():
                sid = ""
                stmt = ""
                dirty = ""
                if wa.raw_source:
                    sid = wa.raw_source.student_id
                    stmt = wa.raw_source.original_statement
                    dirty = "是" if wa.raw_source.is_dirty else "否"
                rows.append(
                    "<tr>"
                    f"<td>{_h(wa.question_id)}</td>"
                    f"<td>{_h(wa.student_answer)}</td>"
                    f"<td>{_h(wa.correct_answer)}</td>"
                    f"<td>{_h(wa.error_type)}</td>"
                    f"<td>{_h(wa.unit)}</td>"
                    f"<td>{_h(sid)}</td>"
                    f"<td>{_h(stmt)}</td>"
                    f"<td>{_h(dirty)}</td>"
                    f"<td>{_h(wa.created_at)}</td>"
                    "</tr>"
                )
            return "\n".join(rows)

        def _wc_rows() -> str:
            rows = []
            for wc in sorted(self.weight_changes.values(), key=lambda x: x.changed_at):
                rows.append(
                    "<tr>"
                    f"<td>{_h(wc.param_name)}</td>"
                    f"<td>{_h(wc.old_value)}</td>"
                    f"<td>{_h(wc.new_value)}</td>"
                    f"<td>{_h(wc.unit)}</td>"
                    f"<td>{_h(wc.reason)}</td>"
                    f"<td>{_h(wc.reason_detail)}</td>"
                    f"<td>{_h(wc.changed_by)}</td>"
                    f"<td>{_h(wc.changed_at)}</td>"
                    "</tr>"
                )
            return "\n".join(rows)

        def _breach_rows() -> str:
            rows = []
            for b in sorted(self.breaches.values(), key=lambda x: x.detected_at):
                status = "已处理" if b.resolution else "待补材料"
                rows.append(
                    "<tr>"
                    f"<td>{_h(b.param_name)}</td>"
                    f"<td>{_h(b.extrapolated_value)}</td>"
                    f"<td>[{_h(b.boundary_low)}, {_h(b.boundary_high)}]</td>"
                    f"<td>{_h(b.unit)}</td>"
                    f"<td>{_h(b.original_statement)}</td>"
                    f"<td>{_h(status)}</td>"
                    f"<td>{_h(b.resolution)}</td>"
                    f"<td>{_h(b.detected_at)}</td>"
                    "</tr>"
                )
            return "\n".join(rows)

        def _cs_rows() -> str:
            rows = []
            for st in self.calculation_steps:
                rows.append(
                    "<tr>"
                    f"<td>{st.step_index}</td>"
                    f"<td>{_h(st.description)}</td>"
                    f"<td><code>{_h(st.formula)}</code></td>"
                    f"<td>{_h(json.dumps(st.input_values, ensure_ascii=False))}</td>"
                    f"<td>{_h(st.output_value)}</td>"
                    f"<td>{_h(st.unit_before)} → {_h(st.unit_after)}</td>"
                    f"<td>{_h(st.conversion_factor)}</td>"
                    f"<td>[{_h(st.boundary_low)}, {_h(st.boundary_high)}]</td>"
                    f"<td>{_h(st.note)}</td>"
                    "</tr>"
                )
            return "\n".join(rows)

        def _tl_rows(entries: list[dict]) -> str:
            rows = []
            for t in sorted(entries, key=lambda x: x["timestamp"]):
                rows.append(
                    "<tr>"
                    f"<td>{_h(t['timestamp'])}</td>"
                    f"<td>{_h(t['event_type'])}</td>"
                    f"<td>{_h(t['description'])}</td>"
                    f"<td>{_h(t['operator'])}</td>"
                    "</tr>"
                )
            return "\n".join(rows)

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{_h(title)}</title>
<style>
  body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 24px; color: #222; }}
  h1 {{ border-bottom: 2px solid #333; padding-bottom: 8px; }}
  h2 {{ margin-top: 32px; border-left: 4px solid #4b8bbe; padding-left: 10px; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 14px; }}
  th, td {{ border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }}
  th {{ background: #f0f0f0; }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }}
  .summary-card {{ border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fafafa; }}
  .summary-card .label {{ color: #666; font-size: 12px; }}
  .summary-card .value {{ font-size: 22px; font-weight: bold; margin-top: 4px; }}
  code {{ background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 13px; }}
  .status-pending {{ color: #b35900; font-weight: bold; }}
  .status-manual {{ color: #8b008b; font-weight: bold; }}
  .status-done {{ color: #006400; }}
  .footer {{ margin-top: 40px; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 8px; }}
</style>
</head>
<body>
<h1>{_h(title)}</h1>
<div class="footer">生成时间：{now_str}</div>

<h2>概览</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="label">错题总数</div><div class="value">{s['wrong_answer_count']}</div></div>
  <div class="summary-card"><div class="label">权重修改次数</div><div class="value">{s['weight_change_count']}</div></div>
  <div class="summary-card"><div class="label">外推越界次数</div><div class="value">{s['breach_count']}（已处理 {s['resolved_breach_count']}）</div></div>
  <div class="summary-card"><div class="label">计算步骤数</div><div class="value">{s['calculation_step_count']}</div></div>
  <div class="summary-card"><div class="label">已处理事件</div><div class="value status-done">{s['timeline_processed']}</div></div>
  <div class="summary-card"><div class="label">待补材料</div><div class="value status-pending">{s['timeline_pending']}</div></div>
  <div class="summary-card"><div class="label">人工改判</div><div class="value status-manual">{s['timeline_manual_override']}</div></div>
  <div class="summary-card"><div class="label">时间线总计</div><div class="value">{s['timeline_total']}</div></div>
</div>

<h2>错题记录（含原始来源与脏数据标记）</h2>
<table>
  <tr>
    <th>题目</th><th>学生答案</th><th>正确答案</th><th>错误类型</th><th>单位</th>
    <th>学生</th><th>原始说法</th><th>脏数据</th><th>创建时间</th>
  </tr>
  {_wa_rows()}
</table>

<h2>权重修改历史（可对照两组参数）</h2>
<table>
  <tr>
    <th>参数名</th><th>旧值</th><th>新值</th><th>单位</th>
    <th>原因</th><th>详情</th><th>修改人</th><th>修改时间</th>
  </tr>
  {_wc_rows()}
</table>

<h2>外推越界（追到原始说法）</h2>
<table>
  <tr>
    <th>参数</th><th>外推值</th><th>合法边界</th><th>单位</th>
    <th>学生原始说法</th><th>状态</th><th>处理结果</th><th>检测时间</th>
  </tr>
  {_breach_rows()}
</table>

<h2>中间计算过程与单位换算</h2>
<table>
  <tr>
    <th>#</th><th>描述</th><th>公式</th><th>输入</th>
    <th>输出</th><th>单位换算</th><th>换算因子</th><th>边界</th><th>备注</th>
  </tr>
  {_cs_rows()}
</table>

<h2>历史时间线 — 已处理</h2>
<table>
  <tr><th>时间</th><th>事件</th><th>描述</th><th>操作人</th></tr>
  {_tl_rows(grouped.get(TimelineStatus.PROCESSED.value, []))}
</table>

<h2>历史时间线 — 待补材料</h2>
<table>
  <tr><th>时间</th><th>事件</th><th>描述</th><th>操作人</th></tr>
  {_tl_rows(grouped.get(TimelineStatus.PENDING.value, []))}
</table>

<h2>历史时间线 — 人工改判</h2>
<table>
  <tr><th>时间</th><th>事件</th><th>描述</th><th>操作人</th></tr>
  {_tl_rows(grouped.get(TimelineStatus.MANUAL_OVERRIDE.value, []))}
</table>

<div class="footer">
  本报告由蒙特卡洛误差错题复盘系统自动生成。所有数据均可通过 JSON / CSV 导出获取原始数据。
</div>
</body>
</html>
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        return filepath

    def export_all(self, output_dir: str, title: str = "蒙特卡洛误差错题复盘报告") -> dict[str, Any]:
        os.makedirs(output_dir, exist_ok=True)
        json_path = os.path.join(output_dir, "review_data.json")
        self.export_json(json_path)
        csv_paths = self.export_csv(output_dir)
        html_path = os.path.join(output_dir, "report.html")
        self.export_html_report(html_path, title=title)
        return {
            "json": json_path,
            "csv": csv_paths,
            "html": html_path,
        }
