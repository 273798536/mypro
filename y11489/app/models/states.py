import enum
from typing import Dict, Set, Tuple, Optional


class RecordStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    RECONFIRMED = "reconfirmed"
    FROZEN = "frozen"
    EXPORTED = "exported"
    CANCELLED = "cancelled"


class StatusTransition:
    _transitions: Dict[RecordStatus, Set[RecordStatus]] = {
        RecordStatus.DRAFT: {RecordStatus.SUBMITTED, RecordStatus.CANCELLED},
        RecordStatus.SUBMITTED: {RecordStatus.REJECTED, RecordStatus.RECONFIRMED, RecordStatus.FROZEN},
        RecordStatus.REJECTED: {RecordStatus.DRAFT, RecordStatus.SUBMITTED, RecordStatus.RECONFIRMED, RecordStatus.CANCELLED},
        RecordStatus.RECONFIRMED: {RecordStatus.FROZEN, RecordStatus.REJECTED},
        RecordStatus.FROZEN: {RecordStatus.EXPORTED},
        RecordStatus.EXPORTED: set(),
        RecordStatus.CANCELLED: set(),
    }

    _required_roles: Dict[Tuple[RecordStatus, RecordStatus], str] = {
        (RecordStatus.DRAFT, RecordStatus.SUBMITTED): "operator",
        (RecordStatus.DRAFT, RecordStatus.CANCELLED): "operator",
        (RecordStatus.SUBMITTED, RecordStatus.REJECTED): "qc_inspector",
        (RecordStatus.SUBMITTED, RecordStatus.RECONFIRMED): "team_leader",
        (RecordStatus.SUBMITTED, RecordStatus.FROZEN): "team_leader",
        (RecordStatus.REJECTED, RecordStatus.DRAFT): "operator",
        (RecordStatus.REJECTED, RecordStatus.SUBMITTED): "operator",
        (RecordStatus.REJECTED, RecordStatus.RECONFIRMED): "team_leader",
        (RecordStatus.REJECTED, RecordStatus.CANCELLED): "team_leader",
        (RecordStatus.RECONFIRMED, RecordStatus.FROZEN): "production_manager",
        (RecordStatus.RECONFIRMED, RecordStatus.REJECTED): "production_manager",
        (RecordStatus.FROZEN, RecordStatus.EXPORTED): "auditor",
    }

    @classmethod
    def can_transition(cls, from_status: RecordStatus, to_status: RecordStatus) -> bool:
        return to_status in cls._transitions.get(from_status, set())

    @classmethod
    def get_allowed_transitions(cls, current_status: RecordStatus) -> Set[RecordStatus]:
        return cls._transitions.get(current_status, set())

    @classmethod
    def get_required_role(cls, from_status: RecordStatus, to_status: RecordStatus) -> Optional[str]:
        return cls._required_roles.get((from_status, to_status))

    @classmethod
    def is_readonly(cls, status: RecordStatus) -> bool:
        return status in {RecordStatus.FROZEN, RecordStatus.EXPORTED}

    @classmethod
    def is_editable(cls, status: RecordStatus) -> bool:
        return status in {RecordStatus.DRAFT, RecordStatus.REJECTED}
