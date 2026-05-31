from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


SKILL_ORDER = {
    SkillLevel.BEGINNER: 0,
    SkillLevel.INTERMEDIATE: 1,
    SkillLevel.ADVANCED: 2,
}

PART_ORDER = ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"]

PART_LABELS = {
    "S1": "女高1",
    "S2": "女高2",
    "A1": "女低1",
    "A2": "女低2",
    "T1": "男高1",
    "T2": "男高2",
    "B1": "男低1",
    "B2": "男低2",
}

PART_SECTION = {
    "S1": "soprano",
    "S2": "soprano",
    "A1": "alto",
    "A2": "alto",
    "T1": "tenor",
    "T2": "tenor",
    "B1": "bass",
    "B2": "bass",
}

SECTION_LABELS = {
    "soprano": "女高音",
    "alto": "女低音",
    "tenor": "男高音",
    "bass": "男低音",
}


@dataclass
class Member:
    id: str
    name: str
    voice_parts: list[str]
    skill_level: SkillLevel
    status: str = "active"

    def is_available(self) -> bool:
        return self.status == "active"


@dataclass
class PartRequirement:
    part: str
    count: int


@dataclass
class Song:
    id: str
    name: str
    required_parts: list[PartRequirement] = field(default_factory=list)


@dataclass
class LeaveRecord:
    member_id: str
    reason: str


@dataclass
class Assignment:
    seq: int
    member_id: str
    member_name: str
    song_id: str
    song_name: str
    voice_part: str
    skill_level: SkillLevel
    is_primary: bool = True


@dataclass
class PartBalance:
    part: str
    assigned_count: int
    required_count: int
    fill_rate: float
    skill_distribution: dict[str, int]
    avg_skill_score: float
    cluster_risk: str
    gap: bool


@dataclass
class SongBalance:
    song_id: str
    song_name: str
    overall_fill_rate: float
    overall_cluster_risk: str
    part_balances: list[PartBalance] = field(default_factory=list)


@dataclass
class AdjustmentRecord:
    step: int
    member_id: str
    member_name: str
    song_id: str
    song_name: str
    from_part: Optional[str]
    to_part: str
    reason: str


@dataclass
class SongAllocation:
    song_id: str
    song_name: str
    assignments: list[Assignment] = field(default_factory=list)
    balance: Optional[SongBalance] = None
    adjustments: list[AdjustmentRecord] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class AllocationResult:
    songs: list[SongAllocation] = field(default_factory=list)
    global_warnings: list[str] = field(default_factory=list)
