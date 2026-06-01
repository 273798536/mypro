from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class BarrierStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SCHEDULED = "scheduled"
    REMOVED = "removed"


@dataclass
class Barrier:
    barrier_id: str
    edge_id: str
    reason: str
    start_date: datetime
    end_date: datetime
    status: BarrierStatus = BarrierStatus.ACTIVE
    affected_direction: Optional[str] = None
    description: Optional[str] = None
    contact_person: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    source_file: Optional[str] = None
    source_line: Optional[int] = None

    def is_expired(self, check_date: Optional[datetime] = None) -> bool:
        check_date = check_date or datetime.now()
        return check_date > self.end_date

    def is_active(self, check_date: Optional[datetime] = None) -> bool:
        check_date = check_date or datetime.now()
        return self.start_date <= check_date <= self.end_date and self.status == BarrierStatus.ACTIVE

    def get_current_status(self, check_date: Optional[datetime] = None) -> BarrierStatus:
        check_date = check_date or datetime.now()
        if self.status == BarrierStatus.REMOVED:
            return BarrierStatus.REMOVED
        if check_date < self.start_date:
            return BarrierStatus.SCHEDULED
        if check_date > self.end_date:
            return BarrierStatus.EXPIRED
        return BarrierStatus.ACTIVE

    def to_dict(self) -> Dict[str, Any]:
        return {
            "barrier_id": self.barrier_id,
            "edge_id": self.edge_id,
            "reason": self.reason,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "status": self.status.value,
            "affected_direction": self.affected_direction,
            "description": self.description,
            "contact_person": self.contact_person,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source_file": self.source_file,
            "source_line": self.source_line,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], source_file: Optional[str] = None, source_line: Optional[int] = None) -> "Barrier":
        status = BarrierStatus(data.get("status", "active"))
        return cls(
            barrier_id=data["barrier_id"],
            edge_id=data["edge_id"],
            reason=data["reason"],
            start_date=datetime.fromisoformat(data["start_date"]),
            end_date=datetime.fromisoformat(data["end_date"]),
            status=status,
            affected_direction=data.get("affected_direction"),
            description=data.get("description"),
            contact_person=data.get("contact_person"),
            metadata=data.get("metadata", {}),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            source_file=source_file or data.get("source_file"),
            source_line=source_line or data.get("source_line"),
        )

    def __hash__(self):
        return hash(self.barrier_id)
