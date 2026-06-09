from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
import json
import os
from datetime import datetime
import pandas as pd
from .data_processor import StudentRecord


HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "history_data")


@dataclass
class HistoryEntry:
    question_id: str
    student_id: str
    run_id: str
    run_timestamp: str
    params: Dict[str, Any]
    result_summary: Dict[str, Any]
    editor_note: str = ""
    resolution: str = ""
    warnings: List[str] = field(default_factory=list)
    extrapolation_warning: str = ""
    error_msg: str = ""


def ensure_history_dir() -> str:
    os.makedirs(HISTORY_DIR, exist_ok=True)
    return HISTORY_DIR


def _history_file(run_label: str) -> str:
    ensure_history_dir()
    return os.path.join(HISTORY_DIR, f"run_{run_label}.json")


def save_run_history(run_label: str, records: List[StudentRecord]) -> str:
    entries = []
    for r in records:
        result_summary = {}
        if r.result:
            result_summary = {
                "effect_size": r.result.effect_size,
                "alpha": r.result.alpha,
                "power": r.result.power,
                "n1": r.result.n1,
                "n2": r.result.n2,
                "sample_size": r.result.sample_size,
                "alternative": r.result.alternative,
                "notes": r.result.notes,
            }
        entries.append(HistoryEntry(
            question_id=r.question_id,
            student_id=r.student_id,
            run_id=run_label,
            run_timestamp=datetime.now().isoformat(),
            params=dict(r.params),
            result_summary=result_summary,
            editor_note=r.editor_note,
            resolution=r.status,
            warnings=list(r.warnings),
            extrapolation_warning=r.extrapolation_warning,
            error_msg=r.error_msg,
        ))
    path = _history_file(run_label)
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(e) for e in entries], f, ensure_ascii=False, indent=2)
    return path


def load_run_history(run_label: str) -> List[HistoryEntry]:
    path = _history_file(run_label)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [HistoryEntry(**d) for d in data]


def list_run_history_labels() -> List[str]:
    ensure_history_dir()
    files = [f for f in os.listdir(HISTORY_DIR) if f.startswith("run_") and f.endswith(".json")]
    labels = [f[4:-5] for f in files]
    return sorted(labels, reverse=True)


def find_history_for_question(question_id: str, student_id: Optional[str] = None) -> List[HistoryEntry]:
    all_entries: List[HistoryEntry] = []
    for label in list_run_history_labels():
        all_entries.extend(load_run_history(label))
    result = [e for e in all_entries if e.question_id == question_id]
    if student_id:
        result = [e for e in result if e.student_id == student_id]
    return result


def build_history_trace_dataframe(question_id: str, student_id: Optional[str] = None) -> pd.DataFrame:
    entries = find_history_for_question(question_id, student_id)
    rows = []
    for e in entries:
        row = {
            "run_id": e.run_id,
            "run_timestamp": e.run_timestamp,
            "student_id": e.student_id,
            "question_id": e.question_id,
            "resolution": e.resolution,
            "editor_note": e.editor_note,
            "extrapolation_warning": e.extrapolation_warning,
            "error_msg": e.error_msg,
            "params": json.dumps(e.params, ensure_ascii=False),
            "result_summary": json.dumps(e.result_summary, ensure_ascii=False),
        }
        rows.append(row)
    return pd.DataFrame(rows)


def attach_history_refs(records: List[StudentRecord]) -> List[StudentRecord]:
    for r in records:
        hist = find_history_for_question(r.question_id, r.student_id)
        if hist:
            latest = hist[0]
            r.history_ref = f"最近运行 {latest.run_id}，状态 {latest.resolution}"
            if not r.editor_note and latest.editor_note:
                r.editor_note = f"[历史意见] {latest.editor_note}"
    return records


def update_editor_note(run_label: str, record_id: str, new_note: str, new_resolution: str = "") -> bool:
    path = _history_file(run_label)
    if not os.path.exists(path):
        return False
    entries = load_run_history(run_label)
    changed = False
    for e in entries:
        qid = f"{e.question_id}_{e.student_id}"
        if record_id in (qid, e.question_id, e.student_id):
            e.editor_note = new_note
            if new_resolution:
                e.resolution = new_resolution
            changed = True
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump([asdict(e) for e in entries], f, ensure_ascii=False, indent=2)
    return changed
