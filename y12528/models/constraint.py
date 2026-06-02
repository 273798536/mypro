from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any, Dict, List
from datetime import datetime


class ConstraintType(Enum):
    """约束类型，按优先级排序"""
    STOCKOUT = "stockout"
    ALLERGEN = "allergen"
    COST = "cost"
    NUTRITION = "nutrition"
    PORTION = "portion"
    VARIETY = "variety"


class ConstraintStatus(Enum):
    SATISFIED = "satisfied"
    VIOLATED = "violated"
    RELAXED = "relaxed"
    CORRECTED = "corrected"


class ConflictSeverity(Enum):
    """冲突严重程度，影响排序"""
    BLOCKER = 1
    CRITICAL = 2
    WARNING = 3
    INFO = 4


@dataclass
class Constraint:
    """约束条件"""
    type: ConstraintType
    name: str
    description: str
    severity: ConflictSeverity = ConflictSeverity.WARNING
    status: ConstraintStatus = ConstraintStatus.SATISFIED
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    violation_amount: float = 0.0
    corrected_value: Optional[float] = None
    correction_note: str = ""
    affected_ingredients: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    detected_at: datetime = field(default_factory=datetime.now)

    def priority(self) -> int:
        """约束优先级，数值越小优先级越高"""
        priority_map = {
            ConstraintType.STOCKOUT: 0,
            ConstraintType.ALLERGEN: 1,
            ConstraintType.NUTRITION: 2,
            ConstraintType.COST: 3,
            ConstraintType.PORTION: 4,
            ConstraintType.VARIETY: 5,
        }
        return priority_map.get(self.type, 99)

    def __lt__(self, other: "Constraint") -> bool:
        """按优先级和严重程度排序"""
        if self.priority() != other.priority():
            return self.priority() < other.priority()
        return self.severity.value < other.severity.value


@dataclass
class ConflictChain:
    """约束冲突链，展示冲突的先后顺序"""
    conflicts: List[Constraint] = field(default_factory=list)
    resolution_order: List[str] = field(default_factory=list)

    def add_conflict(self, constraint: Constraint):
        self.conflicts.append(constraint)
        self.conflicts.sort()

    def sorted_conflicts(self) -> List[Constraint]:
        return sorted(self.conflicts)

    def to_dict(self) -> Dict:
        return {
            "total_conflicts": len(self.conflicts),
            "resolution_order": [c.type.value for c in self.sorted_conflicts()],
            "conflicts": [
                {
                    "type": c.type.value,
                    "name": c.name,
                    "severity": c.severity.name,
                    "status": c.status.value,
                    "violation": c.violation_amount,
                    "affected": c.affected_ingredients,
                    "correction": c.correction_note
                }
                for c in self.sorted_conflicts()
            ]
        }
