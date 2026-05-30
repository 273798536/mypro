import os
from dataclasses import dataclass, field
from typing import List, Set


@dataclass
class Config:
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    OUTPUT_DIR: str = os.path.join(BASE_DIR, "output")

    REQUIRED_COLUMNS: Set[str] = field(default_factory=lambda: {
        "student_id", "name", "grade", "class"
    })

    OPTIONAL_COLUMNS: Set[str] = field(default_factory=lambda: {
        "interest_tags", "leave_records", "conflict_with", "notes",
        "gender", "seat_preference", "special_needs"
    })

    MAX_CLASSES_PER_GRADE: int = 8
    DEFAULT_SEATS_PER_CLASS: int = 45
    MIN_STUDENTS_PER_CLASS: int = 20

    CONFLICT_WEIGHTS: dict = field(default_factory=lambda: {
        "explicit": 1.0,
        "interest_opposite": 0.7,
        "leave_overlap": 0.5,
        "historical": 0.8,
        "special_needs": 0.9
    })

    COLORING_ALGORITHM: str = "welsh_powell"
    ALLOW_COLOR_BACKTRACK: bool = True
    MAX_BACKTRACK_DEPTH: int = 100

    DETECT_CYCLES: bool = True
    ISOLATE_CYCLE_CASES: bool = True

    ENABLE_TRACE: bool = True
    TRACE_MAX_HISTORY: int = 1000

    EXPORT_FORMATS: List[str] = field(default_factory=lambda: ["xlsx", "csv", "json"])
    INCLUDE_TRACE_IN_EXPORT: bool = True

    COMMENT_PREFIXES: List[str] = field(default_factory=lambda: ["#", "//", ";", "备注"])
    BLANK_THRESHOLD: float = 0.5

    BAD_ROW_MARKERS: List[str] = field(default_factory=lambda: [
        "invalid", "error", "缺失", "异常", "test", "测试"
    ])
