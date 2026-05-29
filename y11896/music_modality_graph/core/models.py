from dataclasses import dataclass, field
from typing import List, Set, Dict, Optional, Tuple
from enum import Enum


class ModalityType(Enum):
    MAJOR = "major"
    MINOR = "minor"
    DORIAN = "dorian"
    PHRYGIAN = "phrygian"
    LYDIAN = "lydian"
    MIXOLYDIAN = "mixolydian"
    LOCRIAN = "locrian"
    HARMONIC_MINOR = "harmonic_minor"
    MELODIC_MINOR = "melodic_minor"


class IntervalQuality(Enum):
    PERFECT = "perfect"
    MAJOR = "major"
    MINOR = "minor"
    AUGMENTED = "augmented"
    DIMINISHED = "diminished"


@dataclass(frozen=True)
class Note:
    name: str
    pitch_class: int
    
    def __post_init__(self):
        object.__setattr__(self, 'pitch_class', self.pitch_class % 12)
    
    def __eq__(self, other):
        if isinstance(other, Note):
            return self.pitch_class == other.pitch_class
        return False
    
    def __hash__(self):
        return hash(self.pitch_class)
    
    def __repr__(self):
        return f"{self.name}({self.pitch_class})"


@dataclass
class Modality:
    key_note: Note
    modality_type: ModalityType
    notes: Set[Note]
    scale_degrees: Dict[int, Note] = field(default_factory=dict)
    
    @property
    def id(self) -> str:
        return f"{self.key_note.name}_{self.modality_type.value}"
    
    def __eq__(self, other):
        if isinstance(other, Modality):
            return self.id == other.id
        return False
    
    def __hash__(self):
        return hash(self.id)
    
    def __repr__(self):
        return f"{self.key_note.name} {self.modality_type.value}"


@dataclass
class ModulationEdge:
    source: Modality
    target: Modality
    common_tones: Set[Note]
    difficulty_score: float
    modulation_type: str
    is_enharmonic: bool = False
    needs_confirmation: bool = False
    
    @property
    def common_tone_count(self) -> int:
        return len(self.common_tones)
    
    def __repr__(self):
        return f"{self.source} -> {self.target} (common: {self.common_tone_count}, score: {self.difficulty_score:.2f})"


@dataclass
class ModulationPath:
    edges: List[ModulationEdge]
    total_difficulty: float = 0.0
    total_common_tones: int = 0
    
    def __post_init__(self):
        self.total_difficulty = sum(e.difficulty_score for e in self.edges)
        self.total_common_tones = sum(e.common_tone_count for e in self.edges)
    
    @property
    def length(self) -> int:
        return len(self.edges)
    
    @property
    def modalities(self) -> List[Modality]:
        if not self.edges:
            return []
        mods = [self.edges[0].source]
        for edge in self.edges:
            mods.append(edge.target)
        return mods
    
    def __repr__(self):
        path_str = " -> ".join(str(m) for m in self.modalities)
        return f"Path[{path_str}] (score: {self.total_difficulty:.2f})"


@dataclass
class AnalysisResult:
    start_modality: Modality
    target_modality: Modality
    paths: List[ModulationPath]
    all_edges: List[ModulationEdge]
    timestamp: str
    run_id: str


@dataclass
class ComparisonResult:
    run1_id: str
    run2_id: str
    new_paths: List[ModulationPath]
    removed_paths: List[ModulationPath]
    changed_edges: List[Tuple[ModulationEdge, ModulationEdge]]
    new_edges: List[ModulationEdge]
    removed_edges: List[ModulationEdge]


@dataclass
class Issue:
    issue_type: str
    severity: str
    description: str
    related_items: List[str]
    suggested_action: str
    
    def __repr__(self):
        return f"[{self.severity}] {self.issue_type}: {self.description}"
