from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class QCStatus(str, Enum):
    CLEAN = "clean"
    NEED_RECHECK = "need_recheck"
    FLAGGED = "flagged"


class ViralLoadSample(BaseModel):
    sample_id: str
    lineage_id: str
    collection_date: date
    viral_load: Optional[float] = None
    original_raw_value: str = ""
    notes: str = ""
    qc_status: QCStatus = QCStatus.CLEAN
    explanation: str = ""
    is_duplicate: bool = False
    import_batch_id: str = ""
    created_at: datetime = Field(default_factory=datetime.now)


class ViralLoadSampleResponse(BaseModel):
    sample_id: str
    lineage_id: str
    collection_date: date
    viral_load: Optional[float] = None
    original_raw_value: str
    notes: str
    qc_status: QCStatus
    explanation: str
    is_duplicate: bool
    import_batch_id: str
    created_at: datetime


class LineageSummary(BaseModel):
    lineage_id: str
    name: str
    sample_count: int
    avg_viral_load: Optional[float] = None
    latest_collection_date: Optional[date] = None
    trend: str = ""


class LineageDetail(BaseModel):
    lineage_id: str
    name: str
    sample_count: int
    avg_viral_load: Optional[float] = None
    latest_collection_date: Optional[date] = None
    trend: str = ""
    samples: list[ViralLoadSampleResponse] = []


class AnomalyItem(BaseModel):
    sample_id: str
    lineage_id: str
    collection_date: date
    viral_load: Optional[float]
    expected_range_low: float
    expected_range_high: float
    deviation_ratio: float
    anomaly_type: str
    explanation: str


class CorrectionRequest(BaseModel):
    sample_id: str
    corrected_viral_load: Optional[float] = None
    corrected_notes: str = ""
    reason: str


class CorrectionRecord(BaseModel):
    id: str
    sample_id: str
    lineage_id: str = ""
    original_viral_load: Optional[float]
    corrected_viral_load: Optional[float]
    original_notes: str
    corrected_notes: str
    reason: str
    created_at: datetime


class ImportBatch(BaseModel):
    batch_id: str
    filename: str
    imported_at: datetime
    total_rows: int
    clean_rows: int
    duplicate_rows: int
    warnings: list[str] = []
    duplicate_sample_ids: list[str] = []


class ImportResponse(BaseModel):
    batch_id: str
    total_rows: int
    clean_rows: int
    duplicate_rows: int
    warnings: list[str]
    duplicate_sample_ids: list[str] = []
    samples: list[ViralLoadSampleResponse]


class QCSummary(BaseModel):
    total: int
    clean: int
    need_recheck: int
    flagged: int
    duplicate: int
    anomaly_count: int


class RawSampleRow(BaseModel):
    sample_id: str = ""
    lineage_id: str = ""
    collection_date: str = ""
    viral_load: str = ""
    notes: str = ""
