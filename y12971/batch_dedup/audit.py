from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from .models import AuditEntry, load_json, save_json


AUDIT_LOG_FILE = "audit_log.json"


def _audit_path(state_dir: str) -> str:
    return os.path.join(state_dir, AUDIT_LOG_FILE)


def load_audit_log(state_dir: str) -> list[AuditEntry]:
    path = _audit_path(state_dir)
    if not os.path.exists(path):
        return []
    raw = load_json(path)
    return [AuditEntry.from_dict(d) for d in raw]


def save_audit_log(state_dir: str, entries: list[AuditEntry]) -> None:
    os.makedirs(state_dir, exist_ok=True)
    path = _audit_path(state_dir)
    save_json([e.to_dict() for e in entries], path)


def append_audit(
    state_dir: str,
    work_order_fingerprint: str,
    operator: str,
    action: str,
    reason: str,
    old_verdict: str,
    new_verdict: str,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> AuditEntry:
    entries = load_audit_log(state_dir)
    entry = AuditEntry(
        work_order_fingerprint=work_order_fingerprint,
        operator=operator,
        action=action,
        reason=reason,
        old_verdict=old_verdict,
        new_verdict=new_verdict,
        old_values=old_values or {},
        new_values=new_values or {},
        timestamp=datetime.now().isoformat(),
    )
    entries.append(entry)
    save_audit_log(state_dir, entries)
    return entry


def get_audit_for_fingerprint(state_dir: str, fingerprint: str) -> list[AuditEntry]:
    entries = load_audit_log(state_dir)
    return [e for e in entries if e.work_order_fingerprint == fingerprint]


def get_recent_audits(state_dir: str, limit: int = 50) -> list[AuditEntry]:
    entries = load_audit_log(state_dir)
    entries.sort(key=lambda e: e.timestamp, reverse=True)
    return entries[:limit]
