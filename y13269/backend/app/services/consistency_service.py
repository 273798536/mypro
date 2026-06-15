from typing import List, Optional, Dict, Tuple
from datetime import datetime
import uuid
from collections import defaultdict

from app.models.store import db
from app.schemas.charge import ChargeRecord, UnifiedNote
from app.core.config import settings


def _extract_group_key(record: ChargeRecord) -> tuple:
    community = record.community_name.strip() if record.community_name else ""
    location = record.intersection or record.address or ""
    location = location.strip() if location else ""
    return (community, location)


def _has_field_difference(a: Optional[str], b: Optional[str]) -> bool:
    a_clean = (a or "").strip()
    b_clean = (b or "").strip()
    if not a_clean and not b_clean:
        return False
    if a_clean == b_clean:
        return False
    return True


def detect_peak_conflict(records: List[ChargeRecord]) -> None:
    if not records:
        return

    all_records = db.list_records()
    record_ids_in_batch = {r.id for r in records}
    combined_records = list(records)
    for r in all_records:
        if r.id not in record_ids_in_batch:
            combined_records.append(r)

    groups: Dict[tuple, List[ChargeRecord]] = defaultdict(list)
    for rec in combined_records:
        key = _extract_group_key(rec)
        if not key[0]:
            continue
        groups[key].append(rec)

    for key, group_records in groups.items():
        morning_records: List[ChargeRecord] = []
        evening_records: List[ChargeRecord] = []
        for rec in group_records:
            if not rec.peak_type:
                continue
            pt = rec.peak_type.strip()
            if "早" in pt:
                morning_records.append(rec)
            elif "晚" in pt:
                evening_records.append(rec)

        if not morning_records or not evening_records:
            continue

        for m_rec in morning_records:
            for e_rec in evening_records:
                if m_rec.id == e_rec.id:
                    continue

                has_conflict = False
                if _has_field_difference(m_rec.scenario_label, e_rec.scenario_label):
                    has_conflict = True
                if not has_conflict and _has_field_difference(m_rec.side_note, e_rec.side_note):
                    has_conflict = True
                if not has_conflict and _has_field_difference(m_rec.screenshot_note, e_rec.screenshot_note):
                    has_conflict = True

                if has_conflict:
                    m_conflicts = m_rec.conflict_with or []
                    if e_rec.id not in m_conflicts:
                        m_conflicts.append(e_rec.id)
                    db.update_record(
                        m_rec.id,
                        conflict_with=m_conflicts,
                        status="conflict",
                    )

                    e_conflicts = e_rec.conflict_with or []
                    if m_rec.id not in e_conflicts:
                        e_conflicts.append(m_rec.id)
                    db.update_record(
                        e_rec.id,
                        conflict_with=e_conflicts,
                        status="conflict",
                    )

    db.save_to_disk()


def resolve_conflict(
    record_id_a: str,
    record_id_b: str,
    chosen_fields: Dict[str, str],
) -> Tuple[Optional[ChargeRecord], Optional[ChargeRecord]]:
    rec_a = db.get_record(record_id_a)
    rec_b = db.get_record(record_id_b)

    if not rec_a or not rec_b:
        return rec_a, rec_b

    allowed_fields = ["scenario_label", "side_note", "screenshot_note"]
    update_a = {}
    update_b = {}

    for field in allowed_fields:
        if field in chosen_fields:
            val = chosen_fields[field]
            update_a[field] = val
            update_b[field] = val

    unified_note_id = uuid.uuid4().hex[:12]
    unified_note = UnifiedNote(
        id=unified_note_id,
        scenario_label=chosen_fields.get("scenario_label", ""),
        side_note=chosen_fields.get("side_note", ""),
        screenshot_note=chosen_fields.get("screenshot_note", ""),
        referenced_record_ids=[record_id_a, record_id_b],
        created_at=datetime.now(),
    )
    db.add_unified_note(unified_note)

    update_a["unified_note_id"] = unified_note_id
    update_b["unified_note_id"] = unified_note_id

    a_conflicts = rec_a.conflict_with or []
    if record_id_b in a_conflicts:
        a_conflicts.remove(record_id_b)
    update_a["conflict_with"] = a_conflicts
    if not a_conflicts:
        update_a["status"] = "normal"

    b_conflicts = rec_b.conflict_with or []
    if record_id_a in b_conflicts:
        b_conflicts.remove(record_id_a)
    update_b["conflict_with"] = b_conflicts
    if not b_conflicts:
        update_b["status"] = "normal"

    updated_a = db.update_record(record_id_a, **update_a)
    updated_b = db.update_record(record_id_b, **update_b)

    db.save_to_disk()

    return updated_a, updated_b
