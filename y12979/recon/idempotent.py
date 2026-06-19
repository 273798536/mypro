from __future__ import annotations

import hashlib
import json
import os
from typing import List


def compute_fingerprint(file_paths: List[str]) -> str:
    h = hashlib.sha256()
    for fpath in sorted(file_paths):
        if not os.path.isfile(fpath):
            continue
        h.update(os.path.basename(fpath).encode("utf-8"))
        with open(fpath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
    return h.hexdigest()


def list_all_files(directory: str) -> List[str]:
    result: List[str] = []
    if not os.path.isdir(directory):
        return result
    for fname in sorted(os.listdir(directory)):
        fpath = os.path.join(directory, fname)
        if os.path.isfile(fpath) and not fname.startswith("."):
            result.append(fpath)
    return result


def load_state(output_dir: str) -> dict:
    state_path = os.path.join(output_dir, ".recon_state.json")
    if os.path.isfile(state_path):
        with open(state_path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_state(output_dir: str, state: dict) -> None:
    os.makedirs(output_dir, exist_ok=True)
    state_path = os.path.join(output_dir, ".recon_state.json")
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def check_idempotent(output_dir: str, new_fingerprint: str) -> dict:
    state = load_state(output_dir)
    prev_fp = state.get("input_fingerprint", "")
    if prev_fp == new_fingerprint:
        return {
            "is_rerun": True,
            "previous_session": state.get("session_id", ""),
            "previous_time": state.get("started_at", ""),
            "run_count": state.get("run_count", 1),
            "action": "increment",
        }
    return {"is_rerun": False, "action": "fresh", "run_count": 0}


def update_state(output_dir: str, session_id: str, fingerprint: str, started_at: str, run_count: int) -> None:
    state = load_state(output_dir)
    state.update(
        {
            "session_id": session_id,
            "input_fingerprint": fingerprint,
            "started_at": started_at,
            "run_count": run_count,
        }
    )
    save_state(output_dir, state)
