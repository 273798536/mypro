from typing import List, Tuple, Dict, Optional
from datetime import datetime
from models import (
    CaseMaterial, MaterialVersion, MaterialStatus,
    ManualCorrection, WithdrawRecord, VerbalNote, TimelineEvent, DecisionStatus, ERROR_MESSAGES
)
import uuid


class MaterialTracker:
    def __init__(self):
        self._event_seq = 0

    def _next_event_id(self) -> str:
        self._event_seq += 1
        return f"evt_{self._event_seq:06d}"

    def assemble_material_chain(
        self,
        case_id: str,
        raw_materials: List[CaseMaterial],
        corrections: List[ManualCorrection],
        withdrawals: List[WithdrawRecord],
        verbal_notes: List[VerbalNote]
    ) -> Tuple[List[CaseMaterial], List[TimelineEvent], List[str], List[str]]:
        events: List[TimelineEvent] = []
        warnings: List[str] = []
        errors: List[str] = []

        material_by_id: Dict[str, CaseMaterial] = {}
        for mat in raw_materials:
            if mat.case_id != case_id:
                continue
            material_by_id[mat.material_id] = mat

        self._apply_withdrawals(material_by_id, withdrawals, case_id, events, warnings)
        self._apply_correction_links(material_by_id, corrections, case_id, events)
        self._apply_verbal_notes(material_by_id, verbal_notes, case_id, events)

        revised_materials = self._detect_revisions(material_by_id, events, warnings, errors)
        self._detect_reference_gaps(material_by_id, events, warnings)

        final_materials = sorted(
            list(material_by_id.values()),
            key=lambda m: (m.get_earliest().timestamp if m.get_earliest() else datetime.min)
        )

        missing_refs = [
            m.material_id for m in final_materials
            if m.has_reference_gaps() and m.status != MaterialStatus.WITHDRAWN
        ]

        return final_materials, events, warnings, errors

    def _apply_withdrawals(
        self,
        material_by_id: Dict[str, CaseMaterial],
        withdrawals: List[WithdrawRecord],
        case_id: str,
        events: List[TimelineEvent],
        warnings: List[str]
    ):
        for w in withdrawals:
            if w.case_id != case_id:
                continue
            mat = material_by_id.get(w.withdrawn_material_id)
            if mat:
                mat.status = MaterialStatus.WITHDRAWN
                events.append(TimelineEvent(
                    event_id=self._next_event_id(),
                    case_id=case_id,
                    timestamp=w.timestamp,
                    event_type="材料撤回",
                    description=f"材料[{mat.material_type}]已被撤回：{w.reason}",
                    status=DecisionStatus.NEEDS_MATERIAL,
                    operator=w.operator,
                    details={"withdraw_id": w.withdraw_id, "material_id": mat.material_id}
                ))
            else:
                warnings.append(f"撤回记录{w.withdraw_id}指向不存在的材料{w.withdrawn_material_id}")

    def _apply_correction_links(
        self,
        material_by_id: Dict[str, CaseMaterial],
        corrections: List[ManualCorrection],
        case_id: str,
        events: List[TimelineEvent]
    ):
        for corr in corrections:
            if corr.case_id != case_id:
                continue
            for mid in corr.related_material_ids:
                mat = material_by_id.get(mid)
                if mat and mid not in mat.references:
                    mat.references.append(f"correction:{corr.correction_id}")

    def _apply_verbal_notes(
        self,
        material_by_id: Dict[str, CaseMaterial],
        verbal_notes: List[VerbalNote],
        case_id: str,
        events: List[TimelineEvent]
    ):
        for vn in verbal_notes:
            if vn.case_id != case_id:
                continue
            events.append(TimelineEvent(
                event_id=self._next_event_id(),
                case_id=case_id,
                timestamp=vn.timestamp,
                event_type="口头说明",
                description=f"临时口头说明：{vn.content[:50]}{'...' if len(vn.content) > 50 else ''}",
                status=DecisionStatus.MANUAL_CHANGED,
                operator=vn.operator,
                details={"note_id": vn.note_id}
            ))
            for mid in vn.related_material_ids:
                mat = material_by_id.get(mid)
                if mat and mid not in mat.references:
                    mat.references.append(f"verbal:{vn.note_id}")

    def _detect_revisions(
        self,
        material_by_id: Dict[str, CaseMaterial],
        events: List[TimelineEvent],
        warnings: List[str],
        errors: List[str]
    ) -> List[str]:
        revised_ids: List[str] = []
        for mid, mat in material_by_id.items():
            if len(mat.versions) < 2:
                continue
            versions_sorted = sorted(mat.versions, key=lambda v: v.timestamp)
            content_changed = False
            for i in range(1, len(versions_sorted)):
                prev = versions_sorted[i - 1]
                curr = versions_sorted[i]
                if prev.content != curr.content:
                    content_changed = True
                    mat.is_revised = True
                    revised_ids.append(mid)
                    mat.status = MaterialStatus.REVISED
                    events.append(TimelineEvent(
                        event_id=self._next_event_id(),
                        case_id=mat.case_id,
                        timestamp=curr.timestamp,
                        event_type="口径变更",
                        description=f"材料[{mat.material_type}]口径已变更，版本从{prev.version_id}→{curr.version_id}",
                        status=DecisionStatus.MANUAL_CHANGED,
                        operator=curr.source,
                        details={
                            "material_id": mid,
                            "old_version": prev.version_id,
                            "new_version": curr.version_id,
                            "change_note": curr.note
                        }
                    ))
                    break
            if content_changed and len(versions_sorted) > 2:
                warnings.append(f"材料{mid}存在{len(versions_sorted)}个版本，确认最终口径为最新版本")
        return revised_ids

    def _detect_reference_gaps(
        self,
        material_by_id: Dict[str, CaseMaterial],
        events: List[TimelineEvent],
        warnings: List[str]
    ):
        for mid, mat in material_by_id.items():
            if mat.status == MaterialStatus.WITHDRAWN:
                continue
            if mat.has_reference_gaps():
                warnings.append(f"材料{mid}({mat.material_type})缺少引用依据，相关结论可信度降低")

    def mark_pending_materials(
        self,
        materials: List[CaseMaterial],
        expected_types: List[str]
    ) -> Tuple[List[CaseMaterial], List[str]]:
        pending_hint: List[str] = []
        existing_types = {m.material_type for m in materials if m.status != MaterialStatus.WITHDRAWN}
        for et in expected_types:
            if et not in existing_types:
                pending_hint.append(et)
        return materials, pending_hint

    def check_conflicting_versions(
        self,
        materials: List[CaseMaterial]
    ) -> List[Tuple[str, List[MaterialVersion]]]:
        conflicts = []
        for mat in materials:
            if mat.status == MaterialStatus.WITHDRAWN:
                continue
            if len(mat.versions) < 2:
                continue
            by_source: Dict[str, List[MaterialVersion]] = {}
            for v in mat.versions:
                by_source.setdefault(v.source, []).append(v)
            if len(by_source) > 1:
                conflicts.append((mat.material_id, mat.versions))
        return conflicts

    def get_material_revision_timeline(
        self,
        materials: List[CaseMaterial]
    ) -> List[Dict]:
        timeline = []
        for mat in materials:
            for v in mat.versions:
                timeline.append({
                    "material_id": mat.material_id,
                    "material_type": mat.material_type,
                    "version_id": v.version_id,
                    "timestamp": v.timestamp,
                    "source": v.source,
                    "is_latest": (mat.get_latest() == v if mat.get_latest() else False),
                    "status": mat.status.value,
                    "note": v.note
                })
        timeline.sort(key=lambda x: x["timestamp"])
        return timeline
