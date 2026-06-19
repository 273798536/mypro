from __future__ import annotations

import json
import os
from typing import Dict, List, Optional

from .models import PermAuditAction, PermAuditEntry


PERMAUDIT_FILE = "permission_audit.json"


def _permaudit_path(output_dir: str) -> str:
    return os.path.join(output_dir, PERMAUDIT_FILE)


def load_perm_audit(output_dir: str) -> List[PermAuditEntry]:
    fpath = _permaudit_path(output_dir)
    if not os.path.isfile(fpath):
        return []
    with open(fpath, encoding="utf-8") as f:
        data = json.load(f)
    entries = []
    for item in data:
        entry = PermAuditEntry(
            audit_id=item.get("audit_id", ""),
            data_dict_field=item.get("data_dict_field", ""),
            change_type=item.get("change_type", ""),
            permission_impact=item.get("permission_impact", ""),
            action=PermAuditAction(item.get("action", "review")),
            timestamp=item.get("timestamp", ""),
            status=item.get("status", "pending"),
        )
        entries.append(entry)
    return entries


def save_perm_audit(output_dir: str, entries: List[PermAuditEntry]) -> None:
    os.makedirs(output_dir, exist_ok=True)
    fpath = _permaudit_path(output_dir)
    data = []
    for entry in entries:
        data.append(
            {
                "audit_id": entry.audit_id,
                "data_dict_field": entry.data_dict_field,
                "change_type": entry.change_type,
                "permission_impact": entry.permission_impact,
                "action": entry.action.value,
                "timestamp": entry.timestamp,
                "status": entry.status,
            }
        )
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def audit_data_dict_changes(
    output_dir: str,
    new_fields: List,
) -> List[PermAuditEntry]:
    existing = load_perm_audit(output_dir)
    new_audits: List[PermAuditEntry] = []
    for field_entry in new_fields:
        field_name = field_entry.field_name if hasattr(field_entry, "field_name") else str(field_entry)
        audit = PermAuditEntry(
            data_dict_field=field_name,
            change_type="new_field_registered",
            permission_impact=(
                f"新增字段「{field_name}」已录入数据字典。"
                "若该字段涉及敏感信息（如金额、账户、身份证号等），"
                "需评估是否调整相关角色的访问权限。当前状态为待审核。"
            ),
            action=PermAuditAction.REVIEW,
            status="pending",
        )
        new_audits.append(audit)
    if new_audits:
        save_perm_audit(output_dir, existing + new_audits)
    return new_audits


def audit_data_dict_supplement(
    output_dir: str,
    field_name: str,
) -> Optional[PermAuditEntry]:
    existing = load_perm_audit(output_dir)
    audit = PermAuditEntry(
        data_dict_field=field_name,
        change_type="field_supplemented",
        permission_impact=(
            f"字段「{field_name}」已补录描述信息。"
            "补录后数据字典信息更完整，审计人员可据此评估该字段是否需要权限管控。"
            "如补录内容表明该字段含敏感信息，建议将相关角色权限收窄。"
        ),
        action=PermAuditAction.REVIEW,
        status="pending",
    )
    existing.append(audit)
    save_perm_audit(output_dir, existing)
    return audit


def get_pending_audits(output_dir: str) -> List[PermAuditEntry]:
    entries = load_perm_audit(output_dir)
    return [e for e in entries if e.status == "pending"]


def resolve_audit(output_dir: str, audit_id: str, action: PermAuditAction) -> Optional[PermAuditEntry]:
    entries = load_perm_audit(output_dir)
    for e in entries:
        if e.audit_id == audit_id:
            e.status = "resolved"
            e.action = action
            save_perm_audit(output_dir, entries)
            return e
    return None
