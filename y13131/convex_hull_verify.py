import csv
import hashlib
import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List


class ItemStatus(Enum):
    CONFIRMED = "已处理"
    PENDING_EVIDENCE = "待补证据"
    UNIT_MISSING = "单位缺失-待确认"


class JumpCause(Enum):
    THRESHOLD = "阈值调整"
    UNIT = "单位不一致"
    MANUAL_OVERRIDE = "人工改判"
    COORDINATE_CHANGE = "坐标数据变化"
    VALUE_CHANGE = "题目数值变化"
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

    def content_hash(self) -> str:
        raw = f"{self.item_id}|{self.value}|{self.unit}|{self.coordinates}|{self.threshold}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]


@dataclass
class ManualOverride:
    override_id: str
    item_id: str
    original_value: float
    revised_value: float
    reason: str
    operator: str
    timestamp: str

    def content_hash(self) -> str:
        raw = f"{self.override_id}|{self.item_id}|{self.original_value}|{self.revised_value}|{self.reason}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()[:8]


@dataclass
class SupplementaryNote:
    note_id: str
    item_id: str
    content: str
    author: str
    timestamp: str


@dataclass
class RunParameters:
    threshold: float
    skip_unit_check: bool
    question_file: str
    override_file: str
    notes_file: str
    question_file_hash: str
    override_file_hash: str
    notes_file_hash: str


@dataclass
class RunMeta:
    run_id: str
    timestamp: str
    parameters: RunParameters
    label: str = ""
    is_baseline: bool = False


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
class CrossRunDiff:
    item_id: str
    baseline_area: float
    current_area: float
    absolute_delta: float
    relative_delta: float
    parameter_diffs: List[str]
    override_diffs: List[str]
    data_diffs: List[str]
    final_causes: List[JumpCause]


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
    baseline_comparison: Optional[CrossRunDiff] = None
    content_hash: str = ""


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


def file_hash(path: str) -> str:
    if not os.path.exists(path):
        return "N/A"
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:16]


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


def detect_jump_cause_single_run(item, overrides):
    causes = []
    for ov in overrides:
        if ov.item_id == item.item_id:
            causes.append(JumpCause.MANUAL_OVERRIDE)
            break
    if not item.unit_confirmed or not item.unit or item.unit.strip() == "":
        causes.append(JumpCause.UNIT)
    return causes


def compare_run_parameters(current: RunParameters, baseline: RunParameters) -> List[str]:
    diffs = []
    if current.threshold != baseline.threshold:
        diffs.append(f"阈值: {baseline.threshold} → {current.threshold}")
    if current.skip_unit_check != baseline.skip_unit_check:
        diffs.append(f"跳过单位检测: {baseline.skip_unit_check} → {current.skip_unit_check}")
    if current.question_file_hash != baseline.question_file_hash:
        diffs.append("题目清单文件内容已变化")
    if current.override_file_hash != baseline.override_file_hash:
        diffs.append("人工改判文件内容已变化")
    if current.notes_file_hash != baseline.notes_file_hash:
        diffs.append("后补说明文件内容已变化")
    return diffs


def compare_overrides_for_item(
    item_id: str,
    current_overrides: List[ManualOverride],
    baseline_overrides: List[ManualOverride],
) -> List[str]:
    curr = [o for o in current_overrides if o.item_id == item_id]
    base = [o for o in baseline_overrides if o.item_id == item_id]
    diffs = []

    curr_ids = {o.override_id: o for o in curr}
    base_ids = {o.override_id: o for o in base}

    for oid in set(curr_ids.keys()) | set(base_ids.keys()):
        if oid in curr_ids and oid not in base_ids:
            diffs.append(f"新增改判 {oid}: {curr_ids[oid].original_value} → {curr_ids[oid].revised_value}")
        elif oid in base_ids and oid not in curr_ids:
            diffs.append(f"移除改判 {oid}")
        elif curr_ids[oid].content_hash() != base_ids[oid].content_hash():
            diffs.append(f"改判 {oid} 内容变更")
    return diffs


def compare_items(
    current_item: QuestionItem,
    baseline_item_map: Dict[str, QuestionItem],
) -> List[str]:
    diffs = []
    if current_item.item_id not in baseline_item_map:
        diffs.append("新增题目")
        return diffs
    base = baseline_item_map[current_item.item_id]
    if current_item.value != base.value:
        diffs.append(f"数值: {base.value} → {current_item.value}")
    if current_item.unit != base.unit:
        diffs.append(f"单位: {base.unit} → {current_item.unit}")
    if current_item.coordinates != base.coordinates:
        diffs.append("坐标点数据已变化")
    if current_item.threshold != base.threshold:
        diffs.append(f"题目级阈值: {base.threshold} → {current_item.threshold}")
    return diffs


def cross_run_compare(
    current_result: VerificationResult,
    current_item: QuestionItem,
    current_params: RunParameters,
    current_overrides: List[ManualOverride],
    baseline_run: dict,
    baseline_item_map: Dict[str, QuestionItem],
    baseline_overrides: List[ManualOverride],
) -> Optional[CrossRunDiff]:
    if not baseline_run:
        return None
    item_id = current_result.item_id
    baseline_results = baseline_run.get("results", [])
    baseline_result = next((r for r in baseline_results if r["item_id"] == item_id), None)
    if not baseline_result:
        return None

    baseline_area = baseline_result.get("convex_hull_area", 0.0)
    curr_area = current_result.convex_hull_area
    abs_delta = abs(curr_area - baseline_area)
    rel_delta = abs_delta / baseline_area if baseline_area != 0 else 0

    param_diffs = compare_run_parameters(current_params, RunParameters(**baseline_run["meta"]["parameters"]))
    override_diffs = compare_overrides_for_item(item_id, current_overrides, baseline_overrides)
    data_diffs = []
    if current_item.item_id in baseline_item_map:
        data_diffs = compare_items(current_item, baseline_item_map)

    final_causes: List[JumpCause] = []

    effective_threshold = current_item.threshold if current_item.threshold else current_params.threshold
    if rel_delta <= effective_threshold:
        return CrossRunDiff(
            item_id=item_id,
            baseline_area=baseline_area,
            current_area=curr_area,
            absolute_delta=abs_delta,
            relative_delta=rel_delta,
            parameter_diffs=param_diffs,
            override_diffs=override_diffs,
            data_diffs=data_diffs,
            final_causes=[],
        )

    if override_diffs:
        final_causes.append(JumpCause.MANUAL_OVERRIDE)
    if any("单位" in d for d in data_diffs) or (not current_item.unit or not current_item.unit_confirmed):
        final_causes.append(JumpCause.UNIT)
    if any("阈值" in d for d in param_diffs) or any("题目级阈值" in d for d in data_diffs):
        final_causes.append(JumpCause.THRESHOLD)
    if any("坐标" in d for d in data_diffs):
        final_causes.append(JumpCause.COORDINATE_CHANGE)
    if any("数值" in d for d in data_diffs) and JumpCause.MANUAL_OVERRIDE not in final_causes:
        final_causes.append(JumpCause.VALUE_CHANGE)

    if not final_causes:
        final_causes.append(JumpCause.UNKNOWN)

    return CrossRunDiff(
        item_id=item_id,
        baseline_area=baseline_area,
        current_area=curr_area,
        absolute_delta=abs_delta,
        relative_delta=rel_delta,
        parameter_diffs=param_diffs,
        override_diffs=override_diffs,
        data_diffs=data_diffs,
        final_causes=final_causes,
    )


def verify_item(
    item,
    overrides,
    supplementary_notes,
    threshold=0.05,
    baseline_comparison: Optional[CrossRunDiff] = None,
):
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
            baseline_comparison=baseline_comparison,
            content_hash=item.content_hash(),
        )

    step_idx += 1
    original_value = item.value
    applied_for_item = [o for o in overrides if o.item_id == item.item_id]
    steps.append(VerificationStep(
        step_index=step_idx,
        step_name="应用人工改判",
        input_snapshot={"value": original_value},
        output_snapshot={"value": item.value, "applied_overrides": [
            {"override_id": o.override_id, "revised": o.revised_value, "reason": o.reason}
            for o in applied_for_item
        ]},
        cause=JumpCause.MANUAL_OVERRIDE if applied_for_item else None,
        delta=item.value - original_value if applied_for_item else 0.0,
        timestamp=datetime.now().isoformat(),
    ))

    apply_manual_overrides([item], overrides)

    step_idx += 1
    hull = convex_hull(item.coordinates)
    area = polygon_area(hull)
    steps.append(VerificationStep(
        step_index=step_idx,
        step_name="凸包面积计算",
        input_snapshot={"coordinates_count": len(item.coordinates), "coordinates": item.coordinates},
        output_snapshot={"hull_vertices": len(hull), "area": area, "boundary": hull},
        timestamp=datetime.now().isoformat(),
    ))

    jump_causes: List[JumpCause] = []
    if baseline_comparison and baseline_comparison.final_causes:
        jump_causes = baseline_comparison.final_causes
    else:
        jump_causes = detect_jump_cause_single_run(item, overrides)

    if baseline_comparison and baseline_comparison.final_causes:
        step_idx += 1
        steps.append(VerificationStep(
            step_index=step_idx,
            step_name="跨运行跳变检测",
            input_snapshot={
                "baseline_area": baseline_comparison.baseline_area,
                "current_area": area,
                "parameter_diffs": baseline_comparison.parameter_diffs,
                "override_diffs": baseline_comparison.override_diffs,
                "data_diffs": baseline_comparison.data_diffs,
            },
            output_snapshot={
                "relative_delta": baseline_comparison.relative_delta,
                "threshold": item.threshold if item.threshold else threshold,
                "final_causes": [c.value for c in baseline_comparison.final_causes],
            },
            cause=baseline_comparison.final_causes[0] if baseline_comparison.final_causes else None,
            delta=baseline_comparison.relative_delta,
            timestamp=datetime.now().isoformat(),
        ))
    elif jump_causes:
        step_idx += 1
        steps.append(VerificationStep(
            step_index=step_idx,
            step_name="单次运行跳变检测",
            input_snapshot={"value": item.value, "unit": item.unit},
            output_snapshot={"causes": [c.value for c in jump_causes]},
            cause=jump_causes[0],
            timestamp=datetime.now().isoformat(),
        ))

    has_jump = bool(jump_causes) or (baseline_comparison and baseline_comparison.final_causes)
    status = ItemStatus.CONFIRMED if not has_jump else ItemStatus.PENDING_EVIDENCE

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
        baseline_comparison=baseline_comparison,
        content_hash=item.content_hash(),
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
    if not os.path.exists(csv_path):
        return overrides
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
    if not os.path.exists(csv_path):
        return notes
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


def result_to_dict(result: VerificationResult) -> dict:
    d = {
        "item_id": result.item_id,
        "convex_hull_area": result.convex_hull_area,
        "boundary_points": result.boundary_points,
        "status": result.status.value,
        "unit_missing": result.unit_missing,
        "jump_causes": [c.value for c in result.jump_causes],
        "content_hash": result.content_hash,
        "notes": result.notes,
        "steps": [],
    }
    for s in result.steps:
        d["steps"].append({
            "step_index": s.step_index,
            "step_name": s.step_name,
            "input": s.input_snapshot,
            "output": s.output_snapshot,
            "cause": s.cause.value if s.cause else None,
            "delta": s.delta,
            "timestamp": s.timestamp,
        })
    if result.baseline_comparison:
        bc = result.baseline_comparison
        d["baseline_comparison"] = {
            "item_id": bc.item_id,
            "baseline_area": bc.baseline_area,
            "current_area": bc.current_area,
            "absolute_delta": bc.absolute_delta,
            "relative_delta": bc.relative_delta,
            "parameter_diffs": bc.parameter_diffs,
            "override_diffs": bc.override_diffs,
            "data_diffs": bc.data_diffs,
            "final_causes": [c.value for c in bc.final_causes],
        }
    return d


def generate_trace_report(result: VerificationResult) -> dict:
    return result_to_dict(result)


def write_results_csv(results, output_path):
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "item_id", "convex_hull_area", "baseline_area", "relative_delta",
            "status", "unit_missing", "jump_causes", "boundary_points_count",
            "steps_count", "notes",
        ])
        for r in results:
            baseline_area = ""
            rel_delta = ""
            if r.baseline_comparison:
                baseline_area = f"{r.baseline_comparison.baseline_area:.4f}"
                rel_delta = f"{r.baseline_comparison.relative_delta:.4f}"
            writer.writerow([
                r.item_id,
                f"{r.convex_hull_area:.4f}",
                baseline_area,
                rel_delta,
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


def get_runs_dir(base_output_dir: str) -> str:
    runs_dir = os.path.join(base_output_dir, "runs")
    os.makedirs(runs_dir, exist_ok=True)
    return runs_dir


def list_runs(base_output_dir: str) -> List[dict]:
    runs_dir = get_runs_dir(base_output_dir)
    runs = []
    for fname in os.listdir(runs_dir):
        if fname.startswith("run_") and fname.endswith(".json"):
            fpath = os.path.join(runs_dir, fname)
            try:
                with open(fpath, encoding="utf-8") as f:
                    data = json.load(f)
                meta = data.get("meta", {})
                runs.append({
                    "run_id": meta.get("run_id", ""),
                    "timestamp": meta.get("timestamp", ""),
                    "label": meta.get("label", ""),
                    "is_baseline": meta.get("is_baseline", False),
                    "file": fname,
                })
            except Exception:
                pass
    runs.sort(key=lambda x: x["timestamp"])
    return runs


def get_baseline_run(base_output_dir: str) -> Optional[dict]:
    runs = list_runs(base_output_dir)
    for r in runs:
        if r["is_baseline"]:
            fpath = os.path.join(get_runs_dir(base_output_dir), r["file"])
            with open(fpath, encoding="utf-8") as f:
                return json.load(f)
    return None


def save_run_artifact(
    base_output_dir: str,
    run_meta: RunMeta,
    results: List[VerificationResult],
    summary: dict,
) -> str:
    runs_dir = get_runs_dir(base_output_dir)
    artifact = {
        "meta": asdict(run_meta),
        "timestamp": run_meta.timestamp,
        "results": [result_to_dict(r) for r in results],
        "summary": summary,
    }
    fname = f"run_{run_meta.run_id}.json"
    fpath = os.path.join(runs_dir, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(artifact, f, ensure_ascii=False, indent=2)
    return fpath


def set_baseline(base_output_dir: str, run_id: str) -> bool:
    runs_dir = get_runs_dir(base_output_dir)
    updated = False
    for fname in os.listdir(runs_dir):
        if not fname.startswith("run_") or not fname.endswith(".json"):
            continue
        fpath = os.path.join(runs_dir, fname)
        with open(fpath, encoding="utf-8") as f:
            data = json.load(f)
        is_target = data.get("meta", {}).get("run_id", "") == run_id
        data["meta"]["is_baseline"] = is_target
        if is_target:
            updated = True
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    return updated


def clear_runs(base_output_dir: str) -> int:
    runs_dir = get_runs_dir(base_output_dir)
    count = 0
    for fname in os.listdir(runs_dir):
        if fname.startswith("run_") and fname.endswith(".json"):
            os.remove(os.path.join(runs_dir, fname))
            count += 1
    return count


def generate_run_id() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def generate_html_report(
    results: List[VerificationResult],
    summary: dict,
    run_meta: RunMeta,
    baseline_run: Optional[dict],
    output_path: str,
) -> None:
    def status_style(status):
        if status == ItemStatus.CONFIRMED:
            return "background:#d4edda;color:#155724;"
        elif status == ItemStatus.PENDING_EVIDENCE:
            return "background:#fff3cd;color:#856404;"
        else:
            return "background:#f8d7da;color:#721c24;"

    def cause_badge(cause_str):
        colors = {
            "阈值调整": "badge-blue",
            "单位不一致": "badge-red",
            "人工改判": "badge-purple",
            "坐标数据变化": "badge-orange",
            "题目数值变化": "badge-teal",
            "原因未明": "badge-gray",
        }
        cls = colors.get(cause_str, "badge-gray")
        return f'<span class="badge {cls}">{cause_str}</span>'

    baseline_label = baseline_run["meta"].get("label") or baseline_run["meta"]["run_id"] if baseline_run else "无"

    rows_html = ""
    for r in results:
        causes_html = "".join(cause_badge(c.value) for c in r.jump_causes) if r.jump_causes else "-"
        baseline_area = "-"
        rel_delta = "-"
        if r.baseline_comparison:
            baseline_area = f"{r.baseline_comparison.baseline_area:.4f}"
            rel_delta = f"{r.baseline_comparison.relative_delta*100:.2f}%"
        rows_html += f"""
        <tr>
            <td><strong>{r.item_id}</strong></td>
            <td style="{status_style(r.status)}">{r.status.value}</td>
            <td>{baseline_area}</td>
            <td><strong>{r.convex_hull_area:.4f}</strong></td>
            <td>{rel_delta}</td>
            <td>{causes_html}</td>
            <td>{len(r.steps)}</td>
        </tr>
        """

    detail_html = ""
    for r in results:
        steps_html = ""
        for s in r.steps:
            cause_tag = cause_badge(s.cause.value) if s.cause else ""
            steps_html += f"""
            <div class="step-card">
                <div class="step-header">
                    <span class="step-index">步骤 {s.step_index}</span>
                    <span class="step-name">{s.step_name}</span>
                    {cause_tag}
                </div>
                <div class="step-body">
                    <div class="step-snapshot">
                        <div class="snapshot-label">输入</div>
                        <pre class="snapshot-content">{json.dumps(s.input_snapshot, ensure_ascii=False, indent=2)}</pre>
                    </div>
                    <div class="step-arrow">→</div>
                    <div class="step-snapshot">
                        <div class="snapshot-label">输出</div>
                        <pre class="snapshot-content">{json.dumps(s.output_snapshot, ensure_ascii=False, indent=2)}</pre>
                    </div>
                </div>
                {s.delta != 0 and f'<div class="step-delta">变化量: {s.delta:.4f}</div>' or ''}
            </div>
            """

        comparison_html = ""
        if r.baseline_comparison and r.baseline_comparison.final_causes:
            bc = r.baseline_comparison
            all_diffs = bc.parameter_diffs + bc.override_diffs + bc.data_diffs
            diffs_html = "".join(f"<li>{d}</li>" for d in all_diffs) if all_diffs else "<li>无差异</li>"
            causes_list = "".join(cause_badge(c.value) for c in bc.final_causes)
            comparison_html = f"""
            <div class="comparison-block">
                <h4>跨运行对比（vs 基准 {baseline_label}）</h4>
                <div class="comparison-metrics">
                    <div class="metric">
                        <div class="metric-label">基准面积</div>
                        <div class="metric-value">{bc.baseline_area:.4f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">本次面积</div>
                        <div class="metric-value">{bc.current_area:.4f}</div>
                    </div>
                    <div class="metric highlight">
                        <div class="metric-label">相对变化</div>
                        <div class="metric-value">{bc.relative_delta*100:.2f}%</div>
                    </div>
                </div>
                <div class="comparison-diffs">
                    <h5>检测到的差异</h5>
                    <ul>{diffs_html}</ul>
                </div>
                <div class="comparison-causes">
                    <h5>最终归因</h5>
                    <div>{causes_list}</div>
                </div>
            </div>
            """

        detail_html += f"""
        <div class="detail-section" id="detail-{r.item_id}">
            <h3>{r.item_id}: {r.status.value} <span style="font-weight:normal;font-size:14px;">面积={r.convex_hull_area:.4f}</span></h3>
            {comparison_html}
            <h4>步骤追溯</h4>
            <div class="steps-container">{steps_html}</div>
            {r.notes and f'<div class="notes-block"><strong>备注:</strong> {r.notes}</div>' or ''}
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>凸包面积边界校验报告</title>
<style>
    * {{ box-sizing: border-box; }}
    body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 20px; background: #f5f7fa; color: #303133; }}
    h1 {{ color: #303133; border-bottom: 3px solid #409eff; padding-bottom: 10px; }}
    h2 {{ color: #409eff; margin-top: 30px; }}
    h3 {{ color: #606266; margin-top: 25px; border-left: 4px solid #409eff; padding-left: 10px; }}
    h4 {{ color: #909399; margin: 20px 0 10px 0; }}
    h5 {{ color: #909399; margin: 15px 0 8px 0; }}
    .meta-box {{ background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; gap: 30px; flex-wrap: wrap; }}
    .meta-item span {{ font-weight: bold; color: #409eff; }}
    .status-cards {{ display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }}
    .status-card {{ flex: 1; min-width: 140px; padding: 20px; border-radius: 8px; text-align: center; }}
    .status-card.confirmed {{ background: #f0f9eb; border: 1px solid #e1f3d8; }}
    .status-card.pending {{ background: #fdf6ec; border: 1px solid #faecd8; }}
    .status-card.unit-missing {{ background: #fef0f0; border: 1px solid #fde2e2; }}
    .status-card .num {{ font-size: 32px; font-weight: bold; }}
    .status-card.confirmed .num {{ color: #67c23a; }}
    .status-card.pending .num {{ color: #e6a23c; }}
    .status-card.unit-missing .num {{ color: #f56c6c; }}
    .status-card .label {{ color: #909399; font-size: 14px; }}
    table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1); }}
    th, td {{ padding: 12px 15px; text-align: left; border-bottom: 1px solid #ebeef5; }}
    th {{ background: #fafafa; color: #909399; font-weight: 600; }}
    tr:hover {{ background: #f5f7fa; }}
    .badge {{ display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; margin-right: 4px; color: white; }}
    .badge-blue {{ background: #409eff; }}
    .badge-red {{ background: #f56c6c; }}
    .badge-purple {{ background: #9c27b0; }}
    .badge-orange {{ background: #ff9800; }}
    .badge-teal {{ background: #009688; }}
    .badge-gray {{ background: #909399; }}
    .detail-section {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1); }}
    .steps-container {{ display: flex; flex-direction: column; gap: 12px; }}
    .step-card {{ border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden; }}
    .step-header {{ background: #fafafa; padding: 10px 15px; display: flex; align-items: center; gap: 12px; }}
    .step-index {{ background: #409eff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }}
    .step-name {{ font-weight: 600; }}
    .step-body {{ display: flex; padding: 15px; gap: 15px; align-items: stretch; }}
    .step-snapshot {{ flex: 1; background: #f5f7fa; padding: 10px; border-radius: 4px; }}
    .snapshot-label {{ font-size: 12px; color: #909399; margin-bottom: 5px; }}
    .snapshot-content {{ margin: 0; background: white; padding: 10px; border-radius: 4px; font-size: 12px; max-height: 200px; overflow: auto; }}
    .step-arrow {{ align-self: center; font-size: 20px; color: #909399; }}
    .step-delta {{ padding: 8px 15px; background: #fff3cd; color: #856404; font-weight: bold; border-top: 1px solid #ffeeba; }}
    .comparison-block {{ background: #ecf5ff; border: 1px solid #d9ecff; border-radius: 6px; padding: 15px; margin-bottom: 20px; }}
    .comparison-metrics {{ display: flex; gap: 20px; margin: 15px 0; }}
    .metric {{ flex: 1; text-align: center; padding: 10px; background: white; border-radius: 4px; }}
    .metric.highlight {{ background: #fff3cd; }}
    .metric-label {{ font-size: 12px; color: #909399; }}
    .metric-value {{ font-size: 20px; font-weight: bold; margin-top: 5px; }}
    .comparison-diffs ul {{ margin: 5px 0; padding-left: 20px; }}
    .comparison-diffs li {{ margin: 3px 0; }}
    .notes-block {{ margin-top: 15px; padding: 10px; background: #fffbe6; border: 1px solid #faecd8; border-radius: 4px; }}
    .toc {{ background: white; padding: 15px 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1); }}
    .toc ul {{ list-style: none; padding: 0; margin: 0; columns: 2; }}
    .toc li {{ padding: 4px 0; }}
    .toc a {{ color: #409eff; text-decoration: none; }}
    .toc a:hover {{ text-decoration: underline; }}
</style>
</head>
<body>
    <h1>凸包面积边界校验报告</h1>

    <div class="meta-box">
        <div class="meta-item">运行ID: <span>{run_meta.run_id}</span></div>
        <div class="meta-item">时间: <span>{run_meta.timestamp}</span></div>
        <div class="meta-item">标签: <span>{run_meta.label or '未设置'}</span></div>
        <div class="meta-item">基准运行: <span>{baseline_label}</span></div>
        <div class="meta-item">阈值: <span>{run_meta.parameters.threshold}</span></div>
        <div class="meta-item">跳过单位检测: <span>{run_meta.parameters.skip_unit_check}</span></div>
    </div>

    <h2>状态总览</h2>
    <div class="status-cards">
        <div class="status-card confirmed">
            <div class="num">{summary['confirmed']}</div>
            <div class="label">已处理</div>
        </div>
        <div class="status-card pending">
            <div class="num">{summary['pending_evidence']}</div>
            <div class="label">待补证据</div>
        </div>
        <div class="status-card unit-missing">
            <div class="num">{summary['unit_missing']}</div>
            <div class="label">单位缺失-待确认</div>
        </div>
    </div>

    <h2>结果一览</h2>
    <table>
        <thead>
            <tr>
                <th>题目ID</th>
                <th>状态</th>
                <th>基准面积</th>
                <th>本次面积</th>
                <th>相对变化</th>
                <th>跳变归因</th>
                <th>步骤数</th>
            </tr>
        </thead>
        <tbody>{rows_html}</tbody>
    </table>

    <h2>明细追溯</h2>
    <div class="toc">
        <h4 style="margin-top:0;">目录</h4>
        <ul>
            {"".join(f'<li><a href="#detail-{r.item_id}">{r.item_id} — {r.status.value}</a></li>' for r in results)}
        </ul>
    </div>
    {detail_html}
</body>
</html>
    """

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
