import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum


class AnnotationType(Enum):
    FIELD_STRENGTH = "field_strength"
    PARTICLE_VELOCITY = "particle_velocity"
    PARTICLE_POSITION = "particle_position"
    TRAJECTORY_POINT = "trajectory_point"
    MEASUREMENT = "measurement"
    REVIEW_NOTE = "review_note"
    CORRECTION = "correction"


class ConfidenceLevel(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SPECULATIVE = "speculative"


class AnnotationStatus(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


@dataclass
class Annotation:
    annotation_id: str
    version: int
    type: AnnotationType
    value: float
    unit: str
    position: List[float]
    description: str
    annotator: str
    timestamp: float
    confidence: ConfidenceLevel
    status: AnnotationStatus
    parent_annotation_id: Optional[str] = None
    simulation_step: Optional[int] = None
    particle_id: Optional[str] = None
    field_component: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "annotation_id": self.annotation_id,
            "version": self.version,
            "type": self.type.value,
            "value": self.value,
            "unit": self.unit,
            "position": self.position,
            "description": self.description,
            "annotator": self.annotator,
            "timestamp": self.timestamp,
            "confidence": self.confidence.value,
            "status": self.status.value,
            "parent_annotation_id": self.parent_annotation_id,
            "simulation_step": self.simulation_step,
            "particle_id": self.particle_id,
            "field_component": self.field_component,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Annotation':
        return cls(
            annotation_id=data["annotation_id"],
            version=data["version"],
            type=AnnotationType(data["type"]),
            value=data["value"],
            unit=data["unit"],
            position=data["position"],
            description=data["description"],
            annotator=data["annotator"],
            timestamp=data["timestamp"],
            confidence=ConfidenceLevel(data["confidence"]),
            status=AnnotationStatus(data["status"]),
            parent_annotation_id=data.get("parent_annotation_id"),
            simulation_step=data.get("simulation_step"),
            particle_id=data.get("particle_id"),
            field_component=data.get("field_component"),
            metadata=data.get("metadata", {}),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"])
        )


@dataclass
class AnnotationComparison:
    base_annotation: Annotation
    compare_annotation: Annotation
    value_diff: float
    value_diff_percent: float
    position_diff: List[float]
    has_conflict: bool
    conflict_type: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_annotation_id": self.base_annotation.annotation_id,
            "base_version": self.base_annotation.version,
            "compare_annotation_id": self.compare_annotation.annotation_id,
            "compare_version": self.compare_annotation.version,
            "value_diff": self.value_diff,
            "value_diff_percent": self.value_diff_percent,
            "position_diff": self.position_diff,
            "has_conflict": self.has_conflict,
            "conflict_type": self.conflict_type
        }


class AnnotationManager:
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.annotations: Dict[str, Dict[int, Annotation]] = {}
        self.annotation_order: List[str] = []
        self.current_version: Dict[str, int] = {}

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def create_annotation(self, annotation_type: AnnotationType, value: float, unit: str,
                          position: List[float], description: str, annotator: str,
                          timestamp: float = 0.0, confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM,
                          status: AnnotationStatus = AnnotationStatus.DRAFT,
                          simulation_step: Optional[int] = None,
                          particle_id: Optional[str] = None,
                          field_component: Optional[str] = None,
                          metadata: Optional[Dict[str, Any]] = None) -> Tuple[str, int]:
        annotation_id = self._generate_id()
        version = 1

        annotation = Annotation(
            annotation_id=annotation_id,
            version=version,
            type=annotation_type,
            value=value,
            unit=unit,
            position=position,
            description=description,
            annotator=annotator,
            timestamp=timestamp,
            confidence=confidence,
            status=status,
            simulation_step=simulation_step,
            particle_id=particle_id,
            field_component=field_component,
            metadata=metadata or {}
        )

        if annotation_id not in self.annotations:
            self.annotations[annotation_id] = {}
            self.annotation_order.append(annotation_id)

        self.annotations[annotation_id][version] = annotation
        self.current_version[annotation_id] = version

        return annotation_id, version

    def update_annotation(self, annotation_id: str, value: Optional[float] = None,
                          unit: Optional[str] = None, position: Optional[List[float]] = None,
                          description: Optional[str] = None,
                          confidence: Optional[ConfidenceLevel] = None,
                          status: Optional[AnnotationStatus] = None,
                          metadata: Optional[Dict[str, Any]] = None) -> Optional[Tuple[str, int]]:
        if annotation_id not in self.annotations:
            return None

        current_version = self.current_version[annotation_id]
        current = self.annotations[annotation_id][current_version]

        new_version = current_version + 1
        new_annotation = Annotation(
            annotation_id=annotation_id,
            version=new_version,
            type=current.type,
            value=value if value is not None else current.value,
            unit=unit if unit is not None else current.unit,
            position=position if position is not None else current.position,
            description=description if description is not None else current.description,
            annotator=current.annotator,
            timestamp=current.timestamp,
            confidence=confidence if confidence is not None else current.confidence,
            status=status if status is not None else current.status,
            parent_annotation_id=annotation_id,
            simulation_step=current.simulation_step,
            particle_id=current.particle_id,
            field_component=current.field_component,
            metadata=metadata if metadata is not None else current.metadata.copy(),
            updated_at=datetime.now()
        )

        self.annotations[annotation_id][new_version] = new_annotation
        self.current_version[annotation_id] = new_version

        return annotation_id, new_version

    def get_annotation(self, annotation_id: str, version: Optional[int] = None) -> Optional[Annotation]:
        if annotation_id not in self.annotations:
            return None

        if version is None:
            version = self.current_version[annotation_id]

        return self.annotations[annotation_id].get(version)

    def get_all_versions(self, annotation_id: str) -> List[Annotation]:
        if annotation_id not in self.annotations:
            return []

        versions = sorted(self.annotations[annotation_id].keys())
        return [self.annotations[annotation_id][v] for v in versions]

    def get_annotations_by_type(self, annotation_type: AnnotationType) -> List[Annotation]:
        results = []
        for annotation_id in self.annotation_order:
            if annotation_id in self.annotations:
                latest = self.get_annotation(annotation_id)
                if latest and latest.type == annotation_type:
                    results.append(latest)
        return results

    def get_annotations_by_particle(self, particle_id: str) -> List[Annotation]:
        results = []
        for annotation_id in self.annotation_order:
            if annotation_id in self.annotations:
                latest = self.get_annotation(annotation_id)
                if latest and latest.particle_id == particle_id:
                    results.append(latest)
        return results

    def get_annotations_by_step(self, step_index: int) -> List[Annotation]:
        results = []
        for annotation_id in self.annotation_order:
            if annotation_id in self.annotations:
                latest = self.get_annotation(annotation_id)
                if latest and latest.simulation_step == step_index:
                    results.append(latest)
        return results

    def get_annotations_by_status(self, status: AnnotationStatus) -> List[Annotation]:
        results = []
        for annotation_id in self.annotation_order:
            if annotation_id in self.annotations:
                latest = self.get_annotation(annotation_id)
                if latest and latest.status == status:
                    results.append(latest)
        return results

    def compare_annotations(self, annotation_id1: str, annotation_id2: str,
                            version1: Optional[int] = None,
                            version2: Optional[int] = None) -> Optional[AnnotationComparison]:
        ann1 = self.get_annotation(annotation_id1, version1)
        ann2 = self.get_annotation(annotation_id2, version2)

        if not ann1 or not ann2:
            return None

        value_diff = ann2.value - ann1.value
        value_diff_percent = (value_diff / ann1.value * 100) if ann1.value != 0 else float('inf')
        position_diff = [p2 - p1 for p1, p2 in zip(ann1.position, ann2.position)]

        has_conflict = False
        conflict_type = None

        if abs(value_diff_percent) > 10:
            has_conflict = True
            conflict_type = "large_value_difference"
        elif any(abs(pd) > 0.1 for pd in position_diff):
            has_conflict = True
            conflict_type = "position_mismatch"
        elif ann1.unit != ann2.unit:
            has_conflict = True
            conflict_type = "unit_mismatch"

        return AnnotationComparison(
            base_annotation=ann1,
            compare_annotation=ann2,
            value_diff=value_diff,
            value_diff_percent=value_diff_percent,
            position_diff=position_diff,
            has_conflict=has_conflict,
            conflict_type=conflict_type
        )

    def compare_versions(self, annotation_id: str, version1: int, version2: int) -> Optional[AnnotationComparison]:
        return self.compare_annotations(annotation_id, annotation_id, version1, version2)

    def get_version_history(self, annotation_id: str) -> List[Dict[str, Any]]:
        versions = self.get_all_versions(annotation_id)
        history = []

        for i, v in enumerate(versions):
            if i == 0:
                change = "created"
                diff = None
            else:
                prev = versions[i - 1]
                comp = self.compare_versions(annotation_id, prev.version, v.version)
                change = "updated"
                diff = comp.to_dict() if comp else None

            history.append({
                "version": v.version,
                "timestamp": v.timestamp,
                "updated_at": v.updated_at.isoformat(),
                "value": v.value,
                "status": v.status.value,
                "confidence": v.confidence.value,
                "change_type": change,
                "diff": diff
            })

        return history

    def delete_annotation(self, annotation_id: str) -> bool:
        if annotation_id in self.annotations:
            del self.annotations[annotation_id]
            if annotation_id in self.current_version:
                del self.current_version[annotation_id]
            if annotation_id in self.annotation_order:
                self.annotation_order.remove(annotation_id)
            return True
        return False

    def export_annotations(self, filepath: str) -> None:
        export_data = {
            "session_id": self.session_id,
            "exported_at": datetime.now().isoformat(),
            "annotations": [
                {
                    "annotation_id": aid,
                    "versions": [ann.to_dict() for ann in self.get_all_versions(aid)],
                    "current_version": self.current_version[aid]
                }
                for aid in self.annotation_order
                if aid in self.annotations
            ]
        }

        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

    @classmethod
    def load_annotations(cls, filepath: str) -> 'AnnotationManager':
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        manager = cls(session_id=data["session_id"])

        for ann_data in data["annotations"]:
            annotation_id = ann_data["annotation_id"]
            manager.annotations[annotation_id] = {}
            manager.annotation_order.append(annotation_id)

            for v_data in ann_data["versions"]:
                ann = Annotation.from_dict(v_data)
                manager.annotations[annotation_id][ann.version] = ann

            manager.current_version[annotation_id] = ann_data["current_version"]

        return manager

    def generate_comparison_report(self) -> Dict[str, Any]:
        all_annotations = [self.get_annotation(aid) for aid in self.annotation_order if aid in self.annotations]
        all_annotations = [a for a in all_annotations if a is not None]

        by_type = {}
        for ann in all_annotations:
            t = ann.type.value
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(ann.annotation_id)

        multi_version = [aid for aid, versions in self.annotations.items() if len(versions) > 1]
        conflicts = []

        for aid in multi_version:
            versions = sorted(self.annotations[aid].keys())
            for i in range(len(versions) - 1):
                comp = self.compare_versions(aid, versions[i], versions[i + 1])
                if comp and comp.has_conflict:
                    conflicts.append({
                        "annotation_id": aid,
                        "versions": (versions[i], versions[i + 1]),
                        "conflict_type": comp.conflict_type,
                        "value_diff_percent": comp.value_diff_percent
                    })

        return {
            "total_annotations": len(all_annotations),
            "total_versions": sum(len(v) for v in self.annotations.values()),
            "annotations_by_type": {k: len(v) for k, v in by_type.items()},
            "multi_version_annotations": len(multi_version),
            "conflicts": conflicts,
            "status_summary": {
                status.value: len(self.get_annotations_by_status(status))
                for status in AnnotationStatus
            }
        }
