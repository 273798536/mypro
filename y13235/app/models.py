from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AudioFile(BaseModel):
    filename: str
    file_path: str
    duration_seconds: float
    student_name: str
    teacher_name: str
    lesson_date: str
    track_name: str
    is_master_tape: bool = False
    master_tape_version: Optional[str] = None
    raw_line: int


class AudioFolder(BaseModel):
    folder_path: str
    folder_name: str
    scan_time: datetime
    files: List[AudioFile]
    raw_content: List[str]


class ProgressMetrics(BaseModel):
    tempo_accuracy: float
    pitch_accuracy: float
    rhythm_stability: float
    expression_score: float
    overall_score: float


class StudentProgress(BaseModel):
    student_name: str
    teacher_name: str
    lesson_date: str
    folder_path: str
    metrics: ProgressMetrics
    track_name: str
    audio_file: str
    raw_line: int
    notes: Optional[str] = None


class CalculationRule(BaseModel):
    name: str
    version: str
    description: str
    formula: Dict[str, str]
    thresholds: Dict[str, float]


class Anomaly(BaseModel):
    anomaly_type: str
    severity: str
    message: str
    folder_path: str
    file_name: str
    raw_line: int
    field_name: Optional[str] = None
    expected: Optional[Any] = None
    actual: Optional[Any] = None


class ReviewResult(BaseModel):
    review_id: str
    review_time: datetime
    status: str
    total_files: int
    valid_files: int
    invalid_files: int
    anomalies: List[Anomaly]
    progress_records: List[StudentProgress]
    calculation_rule: CalculationRule
    folder_path: str
    annotation: Optional[str] = None
    delivery_list_version: Optional[str] = None
    previous_review_id: Optional[str] = None


class AnnotationRequest(BaseModel):
    review_id: str
    annotation: str
    delivery_list_version: Optional[str] = None


class ReviewResponse(BaseModel):
    review_id: str
    status: str
    review_time: datetime
    message: str
