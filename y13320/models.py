from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewStatus(str, Enum):
    PROCESSED = "processed"
    PENDING_MATERIAL = "pending_material"
    HUMAN_OVERRIDDEN = "human_overridden"
    SUSPENDED = "suspended"
    BAD_LINE = "bad_line"
    SKIPPED = "skipped"


class CitationStatus(str, Enum):
    PRESENT = "present"
    MISSING = "missing"
    WEAK = "weak"


class ModelOutput(BaseModel):
    essay_id: str
    model_version: str
    score: float
    feedback: str
    citations: List[str] = Field(default_factory=list)
    evidence_points: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)
    is_human_override: bool = False
    override_reason: Optional[str] = None
    raw_line: Optional[str] = None
    line_number: Optional[int] = None


class ReviewResult(BaseModel):
    essay_id: str
    status: ReviewStatus
    model_output: ModelOutput
    citation_status: CitationStatus
    missing_citations: List[str] = Field(default_factory=list)
    duplicate_of: Optional[str] = None
    review_notes: Optional[str] = None
    is_old_misjudgment: bool = False
    misjudgment_explanation: Optional[str] = None
    reviewed_at: datetime = Field(default_factory=datetime.now)


class ReviewStats(BaseModel):
    total: int = 0
    processed: int = 0
    bad_lines: int = 0
    skipped: int = 0
    pending_material: int = 0
    human_overridden: int = 0
    suspended: int = 0
    citations_missing: int = 0
    old_misjudgments: int = 0


class ReviewSummary(BaseModel):
    stats: ReviewStats
    processed: List[ReviewResult] = Field(default_factory=list)
    pending_material: List[ReviewResult] = Field(default_factory=list)
    human_overridden: List[ReviewResult] = Field(default_factory=list)
    bad_lines: List[Dict[str, Any]] = Field(default_factory=list)
    suspended: List[ReviewResult] = Field(default_factory=list)
