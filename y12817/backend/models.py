from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class SequencingResult(BaseModel):
    species_name: str
    read_count: int
    relative_abundance: float
    gc_content: Optional[float] = None
    quality_score: Optional[float] = None


class SampleMetadata(BaseModel):
    sample_id: str
    quadrat_id: str
    location: str
    collection_date: str
    collector: str
    habitat_type: str
    area_m2: float = 1.0


class ProcessingRecord(BaseModel):
    record_id: str
    timestamp: str
    operator: str
    action_type: str
    details: Dict[str, Any]
    reason: Optional[str] = None


class QCFlag(BaseModel):
    flag_id: str
    sample_id: str
    flag_type: str
    description: str
    severity: str
    status: str
    raised_by: str
    raised_at: str
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None


class CoverageEstimate(BaseModel):
    sample_id: str
    total_coverage: float
    species_coverage: Dict[str, float]
    species_richness: int
    shannon_index: float
    simpson_index: float
    evenness: float
    dominant_species: str
    estimation_method: str
    confidence_interval: List[float]


class CoverageReport(BaseModel):
    report_id: str
    sample_id: str
    generated_at: str
    generated_by: str
    estimate: CoverageEstimate
    plain_language_summary: str
    copyable_text: str
    version: int = 1
    parent_version: Optional[int] = None


class Sample(BaseModel):
    metadata: SampleMetadata
    sequencing_results: List[SequencingResult]
    processing_records: List[ProcessingRecord] = []
    qc_flags: List[QCFlag] = []
    reports: List[CoverageReport] = []
    current_report_version: int = 0
    is_contaminated: bool = False
    contamination_resolved: bool = False
