from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
import json
import uuid


class MaterialType(str, Enum):
    SCREENSHOT = "screenshot"
    ATTACHMENT = "attachment"
    AUTH_DOC = "auth_doc"
    CONCLUSION = "conclusion"
    NOTE = "note"


class ProcessingState(str, Enum):
    PENDING = "pending"
    SCANNED = "scanned"
    ANALYZED = "analyzed"
    REVIEWED = "reviewed"
    CONCLUDED = "concluded"
    EXPORTED = "exported"


class NoteType(str, Enum):
    REHEARSAL = "rehearsal"
    AUTHORIZATION = "authorization"
    GENERAL = "general"


class AuthStatus(str, Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    UNKNOWN = "unknown"


@dataclass
class AuthorizationInfo:
    status: AuthStatus = AuthStatus.UNKNOWN
    expire_date: Optional[str] = None
    days_remaining: Optional[int] = None
    marked: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "expire_date": self.expire_date,
            "days_remaining": self.days_remaining,
            "marked": self.marked
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AuthorizationInfo":
        return cls(
            status=AuthStatus(data.get("status", "unknown")),
            expire_date=data.get("expire_date"),
            days_remaining=data.get("days_remaining"),
            marked=data.get("marked", False)
        )


@dataclass
class StudentProgress:
    student_name: str
    improvements: List[str] = field(default_factory=list)
    previous_level: Optional[str] = None
    current_level: Optional[str] = None
    evidence_material_ids: List[str] = field(default_factory=list)
    evidence_snippets: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_name": self.student_name,
            "improvements": self.improvements,
            "previous_level": self.previous_level,
            "current_level": self.current_level,
            "evidence_material_ids": self.evidence_material_ids,
            "evidence_snippets": self.evidence_snippets,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StudentProgress":
        return cls(
            student_name=data["student_name"],
            improvements=data.get("improvements", []),
            previous_level=data.get("previous_level"),
            current_level=data.get("current_level"),
            evidence_material_ids=data.get("evidence_material_ids", []),
            evidence_snippets=data.get("evidence_snippets", []),
        )


@dataclass
class MaterialVersion:
    version: int
    timestamp: str
    content_hash: str
    note_ids: List[str] = field(default_factory=list)
    changes_summary: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "content_hash": self.content_hash,
            "note_ids": self.note_ids,
            "changes_summary": self.changes_summary
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MaterialVersion":
        return cls(
            version=data["version"],
            timestamp=data["timestamp"],
            content_hash=data["content_hash"],
            note_ids=data.get("note_ids", []),
            changes_summary=data.get("changes_summary")
        )


@dataclass
class Note:
    id: str
    content: str
    note_type: NoteType
    timestamp: str
    author: str = "system"
    material_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "note_type": self.note_type.value,
            "timestamp": self.timestamp,
            "author": self.author,
            "material_ids": self.material_ids
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Note":
        return cls(
            id=data["id"],
            content=data["content"],
            note_type=NoteType(data.get("note_type", "general")),
            timestamp=data["timestamp"],
            author=data.get("author", "system"),
            material_ids=data.get("material_ids", [])
        )

    @classmethod
    def create(cls, content: str, note_type: NoteType = NoteType.GENERAL,
               author: str = "user", material_ids: Optional[List[str]] = None) -> "Note":
        return cls(
            id=str(uuid.uuid4()),
            content=content,
            note_type=note_type,
            timestamp=datetime.now().isoformat(),
            author=author,
            material_ids=material_ids or []
        )


@dataclass
class Material:
    id: str
    file_path: str
    file_name: str
    material_type: MaterialType
    received_at: str
    content: str = ""
    processing_state: ProcessingState = ProcessingState.PENDING
    versions: List[MaterialVersion] = field(default_factory=list)
    note_ids: List[str] = field(default_factory=list)
    linked_material_ids: List[str] = field(default_factory=list)
    authorization: AuthorizationInfo = field(default_factory=AuthorizationInfo)
    student_progress: List[StudentProgress] = field(default_factory=list)
    is_late_attachment: bool = False
    is_conclusion: bool = False
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "file_path": self.file_path,
            "file_name": self.file_name,
            "material_type": self.material_type.value,
            "received_at": self.received_at,
            "content": self.content,
            "processing_state": self.processing_state.value,
            "versions": [v.to_dict() for v in self.versions],
            "note_ids": self.note_ids,
            "linked_material_ids": self.linked_material_ids,
            "authorization": self.authorization.to_dict(),
            "student_progress": [sp.to_dict() for sp in self.student_progress],
            "is_late_attachment": self.is_late_attachment,
            "is_conclusion": self.is_conclusion,
            "tags": self.tags
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Material":
        return cls(
            id=data["id"],
            file_path=data["file_path"],
            file_name=data["file_name"],
            material_type=MaterialType(data.get("material_type", "attachment")),
            received_at=data["received_at"],
            content=data.get("content", ""),
            processing_state=ProcessingState(data.get("processing_state", "pending")),
            versions=[MaterialVersion.from_dict(v) for v in data.get("versions", [])],
            note_ids=data.get("note_ids", []),
            linked_material_ids=data.get("linked_material_ids", []),
            authorization=AuthorizationInfo.from_dict(data.get("authorization", {})),
            student_progress=[StudentProgress.from_dict(sp) for sp in data.get("student_progress", [])],
            is_late_attachment=data.get("is_late_attachment", False),
            is_conclusion=data.get("is_conclusion", False),
            tags=data.get("tags", [])
        )

    @classmethod
    def from_file(cls, file_path: str, received_at: Optional[str] = None) -> "Material":
        import os
        import hashlib

        file_name = os.path.basename(file_path)
        material_type = cls._detect_type(file_name)

        content = ""
        if os.path.exists(file_path) and file_path.endswith(('.txt', '.md', '.json')):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

        content_hash = hashlib.md5(content.encode('utf-8')).hexdigest()
        received_time = received_at or datetime.now().isoformat()

        mat = cls(
            id=str(uuid.uuid4()),
            file_path=file_path,
            file_name=file_name,
            material_type=material_type,
            received_at=received_time,
            content=content
        )

        mat.versions.append(MaterialVersion(
            version=1,
            timestamp=received_time,
            content_hash=content_hash
        ))

        return mat

    @staticmethod
    def _detect_type(file_name: str) -> MaterialType:
        lower_name = file_name.lower()
        if "授权" in file_name or "auth" in lower_name or "license" in lower_name:
            return MaterialType.AUTH_DOC
        if "截图" in file_name or "screenshot" in lower_name or "screen" in lower_name:
            return MaterialType.SCREENSHOT
        if "结论" in file_name or "conclusion" in lower_name or "总结" in file_name:
            return MaterialType.CONCLUSION
        if "备注" in file_name or "note" in lower_name:
            return MaterialType.NOTE
        return MaterialType.ATTACHMENT

    def has_auth_mark(self) -> bool:
        return self.authorization.marked

    def get_display_name(self) -> str:
        name = self.file_name
        if self.authorization.marked:
            name = "⚠️ " + name
        if self.is_late_attachment:
            name += " [晚到]"
        if self.is_conclusion:
            name += " [结论]"
        return name


@dataclass
class ProcessingSession:
    session_id: str
    started_at: str
    finished_at: Optional[str] = None
    material_ids: List[str] = field(default_factory=list)
    note_ids: List[str] = field(default_factory=list)
    final_conclusion_material_id: Optional[str] = None
    late_attachment_ids: List[str] = field(default_factory=list)
    reports_generated: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "material_ids": self.material_ids,
            "note_ids": self.note_ids,
            "final_conclusion_material_id": self.final_conclusion_material_id,
            "late_attachment_ids": self.late_attachment_ids,
            "reports_generated": self.reports_generated
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProcessingSession":
        return cls(
            session_id=data["session_id"],
            started_at=data["started_at"],
            finished_at=data.get("finished_at"),
            material_ids=data.get("material_ids", []),
            note_ids=data.get("note_ids", []),
            final_conclusion_material_id=data.get("final_conclusion_material_id"),
            late_attachment_ids=data.get("late_attachment_ids", []),
            reports_generated=data.get("reports_generated", [])
        )

    @classmethod
    def create(cls) -> "ProcessingSession":
        return cls(
            session_id=str(uuid.uuid4()),
            started_at=datetime.now().isoformat()
        )
