from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def fingerprint_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fingerprint_obj(obj: Any) -> str:
    return hashlib.sha256(canonical_json(obj)).hexdigest()


def material_key(kind: str, source_path: str) -> str:
    raw = f"{kind}\x00{source_path}".encode("utf-8")
    return "mat_" + hashlib.sha256(raw).hexdigest()[:16]


def finding_id(kind: str, prompt_version: str, eval_run_id: str, sample_key: str) -> str:
    raw = "\x00".join([kind or "", prompt_version or "", eval_run_id or "", sample_key or ""]).encode("utf-8")
    return "fnd_" + hashlib.sha256(raw).hexdigest()[:16]


def run_id() -> str:
    import time

    return "run_" + format(int(time.time() * 1000), "x")


def short(text: str, limit: int = 12) -> str:
    return text[:limit]
