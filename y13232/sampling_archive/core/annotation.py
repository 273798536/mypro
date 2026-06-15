from datetime import datetime
from typing import List, Dict, Any, Optional
from ..models.material import Material, MaterialStatus


class AnnotationManager:
    def __init__(self):
        pass

    def add_annotation(self,
                       material: Material,
                       comment: str,
                       reviewer: str = "",
                       previous_status: Optional[MaterialStatus] = None,
                       new_status: Optional[MaterialStatus] = None,
                       affected_fields: Optional[List[str]] = None,
                       source_line: str = "") -> Material:
        annotation = {
            "id": f"ann_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
            "timestamp": datetime.now().isoformat(),
            "comment": comment,
            "reviewer": reviewer,
            "previous_status": previous_status.value if previous_status else material.status.value,
            "new_status": new_status.value if new_status else material.status.value,
            "affected_fields": affected_fields or [],
            "source_line": source_line,
            "material_snapshot": self._snapshot(material)
        }
        material.annotations.append(annotation)
        if new_status:
            material.status = new_status
        material.updated_at = datetime.now().isoformat()
        return material

    def _snapshot(self, material: Material) -> Dict[str, Any]:
        return {
            "name": material.name,
            "original_name": material.original_name,
            "status": material.status.value,
            "version": material.version,
            "source": material.source,
            "notes": material.notes,
            "file_path": material.file_path,
            "file_size": material.file_size,
        }

    def get_annotation_history(self, material: Material) -> List[Dict[str, Any]]:
        return sorted(material.annotations, key=lambda x: x["timestamp"], reverse=True)

    def find_annotations_by_reviewer(self, materials: List[Material], reviewer: str) -> List[Dict[str, Any]]:
        result = []
        for m in materials:
            for ann in m.annotations:
                if ann["reviewer"] == reviewer:
                    ann_copy = dict(ann)
                    ann_copy["material_id"] = m.id
                    ann_copy["material_name"] = m.name
                    result.append(ann_copy)
        result.sort(key=lambda x: x["timestamp"], reverse=True)
        return result

    def get_status_change_history(self, material: Material) -> List[Dict[str, Any]]:
        changes = []
        for ann in material.annotations:
            if ann.get("previous_status") != ann.get("new_status"):
                changes.append({
                    "timestamp": ann["timestamp"],
                    "reviewer": ann["reviewer"],
                    "from": ann["previous_status"],
                    "to": ann["new_status"],
                    "comment": ann["comment"],
                    "source_line": ann["source_line"]
                })
        return changes

    def mark_manual_review(self, material: Material, comment: str, reviewer: str, source_line: str = "") -> Material:
        prev_status = material.status
        return self.add_annotation(
            material=material,
            comment=comment,
            reviewer=reviewer,
            previous_status=prev_status,
            new_status=MaterialStatus.MANUAL_REVIEW,
            affected_fields=["status"],
            source_line=source_line
        )

    def mark_processed(self, material: Material, comment: str, reviewer: str, source_line: str = "") -> Material:
        prev_status = material.status
        return self.add_annotation(
            material=material,
            comment=comment,
            reviewer=reviewer,
            previous_status=prev_status,
            new_status=MaterialStatus.PROCESSED,
            affected_fields=["status"],
            source_line=source_line
        )

    def mark_pending(self, material: Material, comment: str, reviewer: str, source_line: str = "") -> Material:
        prev_status = material.status
        return self.add_annotation(
            material=material,
            comment=comment,
            reviewer=reviewer,
            previous_status=prev_status,
            new_status=MaterialStatus.PENDING,
            affected_fields=["status"],
            source_line=source_line
        )
