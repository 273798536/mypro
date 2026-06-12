import csv
import json
import math
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class ItemStatus(Enum):
    CONFIRMED = "已处理"
    PENDING_EVIDENCE = "待补证据"
    UNIT_MISSING = "单位缺失-待确认"


class JumpCause(Enum):
    THRESHOLD = "阈值调整"
    UNIT = "单位不一致"
    MANUAL_OVERRIDE = "人工改判"
    UNKNOWN = "原因未明"


@dataclass
class QuestionItem:
    item_id: str
    description: str
    value: float
    unit: Optional[str]
    coordinates: list
    threshold: float = 0.05
    status: ItemStatus = ItemStatus.PENDING_EVIDENCE
    unit_confirmed: bool = True
    notes: str = ""


@dataclass
class ManualOverride:
    override_id: str
    item_id: str
    original_value: float
    revised_value: float
    reason: str
    operator: str
    timestamp: str


@dataclass
class SupplementaryNote:
    note_id: str
    item_id: str
    content: str
    author: str
    timestamp: str


@dataclass
class VerificationStep:
    step_index: int
    step_name: str
    input_snapshot: dict
    output_snapshot: dict
    cause: Optional[JumpCause] = None
    delta: float = 0.0
    timestamp: str = ""


@dataclass
class VerificationResult:
    item_id: str
    convex_hull_area: float
    boundary_points: list
    status: ItemStatus
    unit_missing: bool
    jump_causes: list = field(default_factory=list)
    steps: list = field(default_factory=list)
    notes: str = ""


def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def convex_hull(points):
    points = sorted(set(points))
    if len(points) <= 1:
        return points
    lower = []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def polygon_area(vertices):
    n = len(vertices)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i][0] * vertices[j][1]
        area -= vertices[j][0] * vertices[i][1]
    return abs(area) / 2.0


def check_unit_missing(items):
    missing = []
    for item in items:
        if not item.unit or item.unit.strip() == "":
            item.unit_confirmed = False
            item.status = ItemStatus.UNIT_MISSING
            missing.append(item)
    return missing


def build_unit_missing_report(missing_items):
    if not missing_items:
        return None
    report = {
        "title": "单位缺失待确认报告",
        "timestamp": datetime.now().isoformat(),
        "summary": f"共发现 {len(missing_items)} 条单位缺失，暂停计算，等待确认",
        "affected_items": [],
    }
    for item in missing_items:
        report["affected_items"].append({
            "item_id": item.item_id,
            "description": item.description,
            "value": item.value,
            "impact": "无法确定面积单位，凸包面积计算结果可能无意义",
            "suggestion": "请确认该条目应使用的度量单位后重新运行",
        })
    return report


def apply_manual_overrides(items, overrides):
    override_map = {}
    for o in overrides:
        override_map[o.item_id] = o
    applied = []
    for item in items:
        if item.item_id in override_map:
            ov = override_map[item.item_id]
            old_val = item.value
            item.value = ov.revised_value
            item.notes = f"人工改判: {old_val} -> {ov.revised_value}, 原因: {ov.reason}"
            applied.append((item.item_id, old_val, ov.revised_value, ov.reason))
    return applied


def detect_jump_cause(prev_area, curr_area, item, overrides, threshold):
    delta = abs(curr_area - prev_area) if prev_area != 0 else 0
    relative_delta = delta / prev_area if prev_area != 0 else 0
    causes = []

    if relative_delta > threshold:
        for ov in overrides:
            if ov.item_id == item.item_id:
                causes.append(JumpCause.MANUAL_OVERRIDE)
                break
        if not item.unit_confirmed or not item.unit or item.unit.strip() == "":
            causes.append(JumpCause.UNIT)
        if relative_delta > threshold and JumpCause.MANUAL_OVERRIDE not in causes and JumpCause.UNIT not in causes:
            causes.append(JumpCause.THRESHOLD)
        if not causes:
            causes.append(JumpCause.UNKNOWN)

    return causes, relative_delta


def verify_item(item, overrides, supplementary_notes, prev_area=0.0, threshold=0.05):
    steps = []
    step_idx = 0

    step_idx += 1
    steps.append(VerificationStep(
        step_index=step_idx,
        step_name="加载原始数据",
        input_snapshot={"item_id": item.item_id, "value": item.value, "unit": item.unit},
        output_snapshot={"item_id": item.item_id, "value": item.value, "unit": item.unit},
        timestamp=datetime.now().isoformat(),
    ))

    if not item.unit or item.unit.strip() == "":
        step_idx += 1
        steps.append(VerificationStep(
            step_index=step_idx,
            step_name="单位缺失检测",
            input_snapshot={"unit": item.unit},
            output_snapshot={"status": "暂停", "reason": "单位缺失"},
            cause=JumpCause.UNIT,
            timestamp=datetime.now().isoformat(),
        ))
        return VerificationResult(
            item_id=item.item_id,
            convex_hull_area=0.0,
            boundary_points=[],
            status=ItemStatus.UNIT_MISSING,
            unit_missing=True,
            steps=steps,
            notes="单位缺失，暂停计算，待确认",
        )

    step_idx += 1
    original_value = item.value
    steps.append(VerificationStep(
        step_index=step_idx,
        step_name="应用人工改判",
        input_snapshot={"value": original_value},
        output_snapshot={"value": item.value, "applied_overrides": [
            {"override_id": o.override_id, "revised": o.revised_value}
            for o in overrides if o.item_id == item.item_id
        ]},
        cause=JumpCause.MANUAL_OVERRIDE if any(o.item_id == item.item_id for o in overrides) else None,
        delta=item.value - original_value if any(o.item_id == item.item_id for o in overrides) else 0.0,
        timestamp=datetime.now().isoformat(),
    ))

    applied = apply_manual_overrides([item], overrides)

    step_idx += 1
    hull = convex_hull(item.coordinates)
    area = polygon_area(hull)
    steps.append(VerificationStep(
        step_index=step_idx,
        step_name="凸包面积计算",
        input_snapshot={"coordinates_count": len(item.coordinates)},
        output_snapshot={"hull_vertices": len(hull), "area": area},
        timestamp=datetime.now().isoformat(),
    ))

    jump_causes, relative_delta = detect_jump_cause(prev_area, area, item, overrides, threshold)

    if jump_causes:
        step_idx += 1
        steps.append(VerificationStep(
            step_index=step_idx,
            step_name="跳变检测",
            input_snapshot={"prev_area": prev_area, "curr_area": area},
            output_snapshot={"relative_delta": relative_delta, "causes": [c.value for c in jump_causes]},
            cause=jump_causes[0],
            delta=relative_delta,
            timestamp=datetime.now().isoformat(),
        ))

    status = ItemStatus.CONFIRMED if not jump_causes else ItemStatus.PENDING_EVIDENCE

    note_texts = []
    for sn in supplementary_notes:
        if sn.item_id == item.item_id:
            note_texts.append(f"[后补说明-{sn.note_id}] {sn.content} ({sn.author})")

    return VerificationResult(
        item_id=item.item_id,
        convex_hull_area=area,
        boundary_points=hull,
        status=status,
        unit_missing=False,
        jump_causes=jump_causes,
        steps=steps,
        notes="; ".join(note_texts) if note_texts else item.notes,
    )


def load_question_items(csv_path):
    items = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            coords_raw = row.get("coordinates", "")
            coords = []
            if coords_raw:
                for pair in coords_raw.split(";"):
                    parts = pair.strip().split(",")
                    if len(parts) == 2:
                        coords.append((float(parts[0]), float(parts[1])))
            items.append(QuestionItem(
                item_id=row["item_id"],
                description=row.get("description", ""),
                value=float(row.get("value", 0)),
                unit=row.get("unit", "") or None,
                coordinates=coords,
                threshold=float(row.get("threshold", 0.05)),
            ))
    return items


def load_manual_overrides(csv_path):
    overrides = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            overrides.append(ManualOverride(
                override_id=row["override_id"],
                item_id=row["item_id"],
                original_value=float(row["original_value"]),
                revised_value=float(row["revised_value"]),
                reason=row.get("reason", ""),
                operator=row.get("operator", ""),
                timestamp=row.get("timestamp", ""),
            ))
    return overrides


def load_supplementary_notes(csv_path):
    notes = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            notes.append(SupplementaryNote(
                note_id=row["note_id"],
                item_id=row["item_id"],
                content=row.get("content", ""),
                author=row.get("author", ""),
                timestamp=row.get("timestamp", ""),
            ))
    return notes


def generate_status_summary(results):
    confirmed = [r for r in results if r.status == ItemStatus.CONFIRMED]
    pending = [r for r in results if r.status == ItemStatus.PENDING_EVIDENCE]
    unit_missing = [r for r in results if r.status == ItemStatus.UNIT_MISSING]
    return {
        "total": len(results),
        "confirmed": len(confirmed),
        "pending_evidence": len(pending),
        "unit_missing": len(unit_missing),
        "confirmed_ids": [r.item_id for r in confirmed],
        "pending_ids": [r.item_id for r in pending],
        "unit_missing_ids": [r.item_id for r in unit_missing],
    }


def generate_trace_report(result):
    trace = {
        "item_id": result.item_id,
        "status": result.status.value,
        "convex_hull_area": result.convex_hull_area,
        "unit_missing": result.unit_missing,
        "jump_causes": [c.value for c in result.jump_causes],
        "notes": result.notes,
        "steps": [],
    }
    for s in result.steps:
        step_info = {
            "step_index": s.step_index,
            "step_name": s.step_name,
            "input": s.input_snapshot,
            "output": s.output_snapshot,
            "cause": s.cause.value if s.cause else None,
            "delta": s.delta,
            "timestamp": s.timestamp,
        }
        trace["steps"].append(step_info)
    return trace


def write_results_csv(results, output_path):
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "item_id", "convex_hull_area", "status", "unit_missing",
            "jump_causes", "boundary_points_count", "steps_count", "notes",
        ])
        for r in results:
            writer.writerow([
                r.item_id,
                r.convex_hull_area,
                r.status.value,
                r.unit_missing,
                "|".join(c.value for c in r.jump_causes),
                len(r.boundary_points),
                len(r.steps),
                r.notes,
            ])


def write_trace_json(results, output_path):
    traces = [generate_trace_report(r) for r in results]
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(traces, f, ensure_ascii=False, indent=2)


def write_status_csv(summary, output_path):
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["category", "count", "item_ids"])
        writer.writerow(["已处理", summary["confirmed"], "|".join(summary["confirmed_ids"])])
        writer.writerow(["待补证据", summary["pending_evidence"], "|".join(summary["pending_ids"])])
        writer.writerow(["单位缺失-待确认", summary["unit_missing"], "|".join(summary["unit_missing_ids"])])
        writer.writerow(["总计", summary["total"], ""])
