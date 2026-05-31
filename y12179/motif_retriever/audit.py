from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .models import AnnotationRecord, AuditEntry, VariationEvidence, VariationType


class AuditLog:
    def __init__(self) -> None:
        self.entries: list[AuditEntry] = []
        self.annotations: list[AnnotationRecord] = []
        self._annotation_counter = 0

    def log(
        self,
        action: str,
        target_type: str = "",
        target_id: str = "",
        before: Any = None,
        after: Any = None,
        operator: str = "system",
        detail: str = "",
    ) -> AuditEntry:
        entry = AuditEntry(
            timestamp=datetime.now().isoformat(),
            action=action,
            target_type=target_type,
            target_id=target_id,
            before=before,
            after=after,
            operator=operator,
            detail=detail,
        )
        self.entries.append(entry)
        return entry

    def create_annotation(
        self,
        fragment_id: str,
        motif_id: str,
        variation_type: VariationType,
        evidence: VariationEvidence,
    ) -> AnnotationRecord:
        self._annotation_counter += 1
        ann_id = f"ann_{self._annotation_counter:04d}"

        record = AnnotationRecord(
            id=ann_id,
            fragment_id=fragment_id,
            motif_id=motif_id,
            variation_type=variation_type,
            evidence=evidence,
        )
        self.annotations.append(record)

        self.log(
            action="create_annotation",
            target_type="AnnotationRecord",
            target_id=ann_id,
            after={
                "fragment_id": fragment_id,
                "motif_id": motif_id,
                "variation_type": variation_type.value,
                "confidence": evidence.confidence,
                "detail": evidence.detail[:80],
            },
            detail=f"创建批注 {ann_id}：{variation_type.value}，置信度 {evidence.confidence:.2f}",
        )

        return record

    def supersede_annotation(
        self,
        old_annotation_id: str,
        new_variation_type: VariationType,
        new_evidence: VariationEvidence,
        operator: str = "system",
        reason: str = "",
    ) -> AnnotationRecord:
        old_ann = self._find_annotation(old_annotation_id)
        if old_ann is None:
            raise ValueError(f"批注不存在: {old_annotation_id}")

        old_ann.superseded_by = f"superseded"
        old_ann.superseded_at = datetime.now().isoformat()

        self.log(
            action="supersede_annotation",
            target_type="AnnotationRecord",
            target_id=old_annotation_id,
            before={
                "variation_type": old_ann.variation_type.value,
                "confidence": old_ann.evidence.confidence,
            },
            after={
                "variation_type": new_variation_type.value,
                "confidence": new_evidence.confidence,
            },
            operator=operator,
            detail=f"批注 {old_annotation_id} 被替代：{old_ann.variation_type.value} → {new_variation_type.value}。原因: {reason}",
        )

        new_ann = self.create_annotation(
            fragment_id=old_ann.fragment_id,
            motif_id=old_ann.motif_id,
            variation_type=new_variation_type,
            evidence=new_evidence,
        )

        self.log(
            action="annotation_updated_evidence",
            target_type="AnnotationRecord",
            target_id=new_ann.id,
            after={
                "supersedes": old_annotation_id,
                "new_variation_type": new_variation_type.value,
                "detail": new_evidence.detail[:80],
            },
            operator=operator,
            detail=f"新批注 {new_ann.id} 替代 {old_annotation_id}，变奏识别已更新，片段证据和批注历史已联动",
        )

        return new_ann

    def manual_correction(
        self,
        target_type: str,
        target_id: str,
        field_name: str,
        before: Any,
        after: Any,
        operator: str = "manual",
        reason: str = "",
    ) -> AuditEntry:
        return self.log(
            action=f"manual_correction:{field_name}",
            target_type=target_type,
            target_id=target_id,
            before=before,
            after=after,
            operator=operator,
            detail=f"人工修正 {target_type} {target_id} 的 {field_name}：{before} → {after}。原因: {reason or '未注明'}",
        )

    def get_annotations_for_fragment(self, fragment_id: str) -> list[AnnotationRecord]:
        return [
            a for a in self.annotations
            if a.fragment_id == fragment_id and a.superseded_by is None
        ]

    def get_annotation_history(self, fragment_id: str) -> list[AnnotationRecord]:
        return [a for a in self.annotations if a.fragment_id == fragment_id]

    def get_entries_for_target(self, target_type: str, target_id: str) -> list[AuditEntry]:
        return [
            e for e in self.entries
            if e.target_type == target_type and e.target_id == target_id
        ]

    def export_audit_trail(self) -> list[dict[str, Any]]:
        return [
            {
                "timestamp": e.timestamp,
                "action": e.action,
                "target_type": e.target_type,
                "target_id": e.target_id,
                "before": e.before,
                "after": e.after,
                "operator": e.operator,
                "detail": e.detail,
            }
            for e in self.entries
        ]

    def export_annotations(self) -> list[dict[str, Any]]:
        result = []
        for a in self.annotations:
            entry: dict[str, Any] = {
                "id": a.id,
                "fragment_id": a.fragment_id,
                "motif_id": a.motif_id,
                "variation_type": a.variation_type.value,
                "evidence": {
                    "variation_type": a.evidence.variation_type.value,
                    "confidence": a.evidence.confidence,
                    "detail": a.evidence.detail,
                    "transposition_semitones": a.evidence.transposition_semitones,
                    "stretch_ratio": a.evidence.stretch_ratio,
                    "misalign_beats": a.evidence.misalign_beats,
                    "misalign_measures": a.evidence.misalign_measures,
                },
                "created_at": a.created_at,
                "superseded_by": a.superseded_by,
                "superseded_at": a.superseded_at,
            }
            result.append(entry)
        return result

    def save_to_file(self, path: str) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "audit_trail": self.export_audit_trail(),
            "annotations": self.export_annotations(),
        }
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _find_annotation(self, annotation_id: str) -> Optional[AnnotationRecord]:
        for a in self.annotations:
            if a.id == annotation_id:
                return a
        return None
