from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SymbolType(str, Enum):
    NOTE = "note"
    REST = "rest"
    ACCIDENTAL = "accidental"
    CLEF = "clef"
    TIME_SIGNATURE = "time_signature"
    KEY_SIGNATURE = "key_signature"
    BAR_LINE = "bar_line"
    SLUR = "slur"
    TIE = "tie"
    DYNAMIC = "dynamic"
    ARTICULATION = "articulation"


class AccidentalType(str, Enum):
    SHARP = "sharp"
    FLAT = "flat"
    NATURAL = "natural"
    DOUBLE_SHARP = "double_sharp"
    DOUBLE_FLAT = "double_flat"


class NotePitch(str, Enum):
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    A = "A"
    B = "B"


class IssueSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class IssueStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class IssueCategory(str, Enum):
    ACCIDENTAL_MISSING = "accidental_missing"
    ACCIDENTAL_MISREAD = "accidental_misread"
    SLUR_BROKEN = "slur_broken"
    BARLINE_MISALIGNED = "barline_misaligned"
    NOTE_MISREAD = "note_misread"
    RHYTHM_ERROR = "rhythm_error"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: Optional[float] = None


class MusicSymbol(BaseModel):
    id: str
    symbol_type: SymbolType
    position: BoundingBox
    raw_text: Optional[str] = None
    confidence: float = 1.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Note(MusicSymbol):
    symbol_type: SymbolType = SymbolType.NOTE
    pitch: NotePitch
    octave: int
    duration: float
    accidental: Optional[AccidentalType] = None
    dots: int = 0


class Accidental(MusicSymbol):
    symbol_type: SymbolType = SymbolType.ACCIDENTAL
    accidental_type: AccidentalType


class Slur(MusicSymbol):
    symbol_type: SymbolType = SymbolType.SLUR
    start_note_id: Optional[str] = None
    end_note_id: Optional[str] = None
    is_complete: bool = True


class Measure(BaseModel):
    id: str
    measure_number: int
    symbols: List[MusicSymbol] = Field(default_factory=list)
    time_signature: Optional[str] = None
    key_signature: Optional[str] = None
    position: Optional[BoundingBox] = None
    is_complete: bool = True


class IssueEvidence(BaseModel):
    source: str
    description: str
    data: Dict[str, Any] = Field(default_factory=dict)


class Correction(BaseModel):
    id: str
    issue_id: str
    corrected_by: str
    corrected_at: datetime = Field(default_factory=datetime.now)
    original_value: str
    corrected_value: str
    description: str
    affects_other_issues: List[str] = Field(default_factory=list)


class Issue(BaseModel):
    id: str
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus = IssueStatus.PENDING
    description: str
    location: Optional[BoundingBox] = None
    measure_id: Optional[str] = None
    measure_number: Optional[int] = None
    symbol_ids: List[str] = Field(default_factory=list)
    evidence: List[IssueEvidence] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    corrections: List[Correction] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ImportSource(BaseModel):
    source_type: str
    file_path: Optional[str] = None
    import_time: datetime = Field(default_factory=datetime.now)
    version: int = 1
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VersionHistory(BaseModel):
    version: int
    timestamp: datetime
    description: str
    changed_by: str
    changes: List[str] = Field(default_factory=list)


class ScoreProject(BaseModel):
    id: str
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    import_sources: List[ImportSource] = Field(default_factory=list)
    measures: List[Measure] = Field(default_factory=list)
    issues: List[Issue] = Field(default_factory=list)
    version_history: List[VersionHistory] = Field(default_factory=list)
    current_version: int = 1
    metadata: Dict[str, Any] = Field(default_factory=dict)
