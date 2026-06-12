from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class DataStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    PARTIAL = "partial"
    FAILED = "failed"
    REVIEWED = "reviewed"


class ExceptionType(str, Enum):
    MISSING_PHOTO = "missing_photo"
    NO_SAIL_ZONE_VIOLATION = "no_sail_zone_violation"
    ABNORMAL_THICKNESS = "abnormal_thickness"
    TIDE_ANOMALY = "tide_anomaly"
    DATA_GAP = "data_gap"


class BuoyData(BaseModel):
    buoy_id: str
    timestamp: datetime
    latitude: float
    longitude: float
    ice_thickness: float
    ice_temperature: Optional[float] = None
    water_temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    raw_source: str

    @field_validator("latitude")
    def validate_latitude(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError(f"纬度必须在-90到90之间: {v}")
        return v

    @field_validator("longitude")
    def validate_longitude(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError(f"经度必须在-180到180之间: {v}")
        return v


class InspectionPhoto(BaseModel):
    photo_id: str
    buoy_id: str
    timestamp: datetime
    file_path: str
    uploader: str
    annotation: Optional[str] = None


class ReviewNote(BaseModel):
    note_id: str
    processing_record_id: str
    reviewer: str
    review_time: datetime
    content: str
    is_exception: bool = False
    exception_type: Optional[ExceptionType] = None
    resolution: Optional[str] = None


class TideCalculation(BaseModel):
    tide_id: str
    processing_record_id: str
    buoy_id: str
    calculation_time: datetime
    high_tide: float
    low_tide: float
    current_tide: float
    tide_corrected_thickness: float
    algorithm_version: str = "v1.0"


class DataGap(BaseModel):
    gap_id: str
    processing_record_id: str
    buoy_id: str
    gap_type: ExceptionType
    description: str
    reported_to: str
    reported_time: datetime
    resolved: bool = False
    resolved_time: Optional[datetime] = None


class ExceptionTrace(BaseModel):
    trace_id: str
    processing_record_id: str
    exception_type: ExceptionType
    detected_time: datetime
    description: str
    original_buoy_data_ref: str
    processing_opinion: str
    reviewed: bool = False
    reviewer_note: Optional[str] = None


class ProcessingRecord(BaseModel):
    record_id: str
    buoy_id: str
    buoy_data: BuoyData
    status: DataStatus = DataStatus.PENDING
    inspection_photo: Optional[InspectionPhoto] = None
    tide_calculation: Optional[TideCalculation] = None
    review_notes: List[ReviewNote] = Field(default_factory=list)
    exception_traces: List[ExceptionTrace] = Field(default_factory=list)
    data_gaps: List[DataGap] = Field(default_factory=list)
    processing_time: Optional[datetime] = None
    processor: str = "system"
    final_ice_thickness: Optional[float] = None
    is_no_sail_violation: bool = False
    no_sail_zone: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "buoy_id": self.buoy_id,
            "status": self.status.value,
            "latitude": self.buoy_data.latitude,
            "longitude": self.buoy_data.longitude,
            "timestamp": self.buoy_data.timestamp.isoformat(),
            "raw_thickness": self.buoy_data.ice_thickness,
            "final_thickness": self.final_ice_thickness,
            "tide_corrected": self.tide_calculation.tide_corrected_thickness if self.tide_calculation else None,
            "has_photo": self.inspection_photo is not None,
            "is_exception": len(self.exception_traces) > 0,
            "is_reviewed": any(note.is_exception for note in self.review_notes),
            "is_no_sail_violation": self.is_no_sail_violation,
            "no_sail_zone": self.no_sail_zone,
            "processing_time": self.processing_time.isoformat() if self.processing_time else None,
        }


class ProcessingBatch(BaseModel):
    batch_id: str
    created_at: datetime
    records: List[ProcessingRecord] = Field(default_factory=list)
    total_count: int = 0
    processed_count: int = 0
    failed_count: int = 0
    partial_count: int = 0
    gaps_count: int = 0

    def update_stats(self):
        self.total_count = len(self.records)
        self.processed_count = sum(1 for r in self.records if r.status == DataStatus.PROCESSED)
        self.failed_count = sum(1 for r in self.records if r.status == DataStatus.FAILED)
        self.partial_count = sum(1 for r in self.records if r.status == DataStatus.PARTIAL)
        self.gaps_count = sum(len(r.data_gaps) for r in self.records)
