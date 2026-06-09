from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum


class MaterialType(Enum):
    SOLVENT = "溶剂"
    SALT = "锂盐"
    ADDITIVE = "添加剂"
    UNKNOWN = "未知"


class PeakStatus(Enum):
    NORMAL = "正常"
    OVERLAP = "重叠"
    SUSPICIOUS = "存疑"
    NOISE = "噪声"


@dataclass
class SpectrumPeak:
    position: float
    intensity: float
    material: str = ""
    status: PeakStatus = PeakStatus.NORMAL
    overlap_with: List[str] = field(default_factory=list)
    note: str = ""
    original_interpretation: str = ""
    rechecked_interpretation: str = ""


@dataclass
class SpectrumRecord:
    sample_id: str
    peaks: List[SpectrumPeak] = field(default_factory=list)
    raw_data_path: str = ""
    manual_notes: str = ""


@dataclass
class ExperimentRecord:
    sample_id: str
    date: str = ""
    operator: str = ""
    temperature: Optional[float] = None
    temperature_unit: str = "°C"
    humidity: Optional[float] = None
    formulation: Dict[str, float] = field(default_factory=dict)
    formulation_notes: str = ""
    spectrum: Optional[SpectrumRecord] = None
    result_original: str = ""
    result_rechecked: str = ""
    retest_suggestion: str = ""
    problems: List[str] = field(default_factory=list)


@dataclass
class OverlapCase:
    case_id: str
    description: str
    peaks_original: List[SpectrumPeak]
    peaks_rechecked: List[SpectrumPeak]
    material_involved: List[str]
    result_changed: bool
    before_conclusion: str
    after_conclusion: str
