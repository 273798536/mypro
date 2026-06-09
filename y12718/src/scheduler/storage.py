from __future__ import annotations

import itertools
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from .models import ProjectState, Assignment, AuditRecord, CounterExample, RowStatus


STATE_FILENAME = "project_state.json"
AUDIT_FILENAME = "audit_log.jsonl"


def _as_dict(obj: Any) -> Any:
    if hasattr(obj, "__dataclass_fields__"):
        return {k: _as_dict(v) for k, v in obj.__dict__.items()}
    if isinstance(obj, dict):
        return {k: _as_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_as_dict(v) for v in obj]
    if isinstance(obj, RowStatus):
        return obj.value
    return obj


def _dict_to_assignment(d: dict) -> Assignment:
    return Assignment(
        assignment_id=d["assignment_id"],
        person=d["person"],
        date=d["date"],
        shift=d["shift"],
        hours=float(d["hours"]),
        status=RowStatus(d.get("status", "pending")),
        content_hash=d.get("content_hash", ""),
        source_rows=list(d.get("source_rows", [])),
        created_at=d.get("created_at", ""),
        updated_at=d.get("updated_at", ""),
    )


def _dict_to_audit(d: dict) -> AuditRecord:
    return AuditRecord(
        record_id=d["record_id"],
        timestamp=d["timestamp"],
        assignment_id=d["assignment_id"],
        before=d.get("before", {}),
        after=d.get("after", {}),
        operator=d.get("operator", "ta"),
        comment=d.get("comment", ""),
    )


def _dict_to_ce(d: dict) -> CounterExample:
    return CounterExample(
        ce_id=d["ce_id"],
        rule=d["rule"],
        description=d["description"],
        affected_assignments=list(d.get("affected_assignments", [])),
        severity=d.get("severity", "warning"),
        created_at=d.get("created_at", ""),
    )


def ensure_output_dir(output_dir: Path) -> Path:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "raw_drafts").mkdir(exist_ok=True)
    (output_dir / "charts").mkdir(exist_ok=True)
    (output_dir / "exports").mkdir(exist_ok=True)
    return output_dir


def load_state(output_dir: Path) -> ProjectState:
    path = Path(output_dir) / STATE_FILENAME
    if not path.exists():
        return ProjectState(output_dir=str(output_dir))
    data = json.loads(path.read_text(encoding="utf-8"))
    state = ProjectState(
        input_dir=data.get("input_dir", ""),
        output_dir=data.get("output_dir", str(output_dir)),
        source_file_hashes=data.get("source_file_hashes", {}),
        last_run=data.get("last_run", ""),
    )
    for aid, d in data.get("assignments", {}).items():
        state.assignments[aid] = _dict_to_assignment(d)
    for d in data.get("audit", []):
        state.audit.append(_dict_to_audit(d))
    for d in data.get("counter_examples", []):
        state.counter_examples.append(_dict_to_ce(d))
    return state


def save_state(output_dir: Path, state: ProjectState) -> None:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = _as_dict(state)
    (output_dir / STATE_FILENAME).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def append_audit(output_dir: Path, record: AuditRecord) -> None:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / AUDIT_FILENAME
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(_as_dict(record), ensure_ascii=False) + "\n")


_counter = itertools.count()


def next_id(prefix: str) -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    seq = next(_counter)
    short = uuid.uuid4().hex[:6]
    return f"{prefix}-{ts}-{seq}-{short}"
