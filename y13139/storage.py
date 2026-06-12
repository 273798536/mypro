import json
import os
from typing import List, Optional
from models import BatchState


STATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
STATE_FILE = os.path.join(STATE_DIR, "state.jsonl")
META_FILE = os.path.join(STATE_DIR, "meta.json")


def _ensure_dir() -> None:
    if not os.path.isdir(STATE_DIR):
        os.makedirs(STATE_DIR, exist_ok=True)


def _read_lines() -> List[str]:
    _ensure_dir()
    if not os.path.isfile(STATE_FILE):
        return []
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip()]


def save_snapshot(batch: BatchState) -> None:
    _ensure_dir()
    lines = _read_lines()
    current_ids = {}
    for i, ln in enumerate(lines):
        try:
            d = json.loads(ln)
            current_ids[d["batch_id"]] = i
        except Exception:
            pass
    payload = json.dumps(batch.to_dict(), ensure_ascii=False)
    if batch.batch_id in current_ids:
        lines[current_ids[batch.batch_id]] = payload
    else:
        lines.append(payload)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    _write_meta({"last_updated": batch.updated_at, "last_batch_id": batch.batch_id})


def _write_meta(d: dict) -> None:
    _ensure_dir()
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


def read_meta() -> dict:
    _ensure_dir()
    if not os.path.isfile(META_FILE):
        return {}
    with open(META_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return {}


def load_all() -> List[BatchState]:
    result = []
    for ln in _read_lines():
        try:
            result.append(BatchState.from_dict(json.loads(ln)))
        except Exception:
            continue
    result.sort(key=lambda b: b.created_at, reverse=True)
    return result


def load_batch(batch_id: str) -> Optional[BatchState]:
    for b in load_all():
        if b.batch_id == batch_id:
            return b
    return None


def load_last() -> Optional[BatchState]:
    meta = read_meta()
    bid = meta.get("last_batch_id")
    if bid:
        b = load_batch(bid)
        if b:
            return b
    all_b = load_all()
    return all_b[0] if all_b else None


def delete_batch(batch_id: str) -> bool:
    lines = _read_lines()
    kept = []
    found = False
    for ln in lines:
        try:
            d = json.loads(ln)
            if d.get("batch_id") == batch_id:
                found = True
                continue
        except Exception:
            pass
        kept.append(ln)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(kept) + ("\n" if kept else ""))
    return found
