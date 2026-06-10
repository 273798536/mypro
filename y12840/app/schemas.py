from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SampleBase(BaseModel):
    barcode: str
    sample_name: Optional[str] = None
    material_source: Optional[str] = None
    batch_id: Optional[str] = None
    culture_record: Optional[str] = None
    time_point: Optional[str] = None
    notes: Optional[str] = None


class SampleCreate(SampleBase):
    pass


class SampleOut(SampleBase):
    id: int
    quality_rating: str
    low_quality_reads: bool
    low_quality_detail: Optional[str] = None
    review_status: str
    can_use_directly: bool
    needs_teacher_review: bool
    unusable_reason: Optional[str] = None
    import_batch_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SampleImportRow(BaseModel):
    barcode: Optional[str] = None
    sample_name: Optional[str] = None
    material_source: Optional[str] = None
    culture_record: Optional[str] = None
    time_point: Optional[str] = None
    notes: Optional[str] = None


class ImportResult(BaseModel):
    batch_id: str
    total: int
    imported: int
    skipped: int
    duplicate_barcodes: List[str] = []
    empty_field_samples: List[Dict[str, Any]] = []
    mixed_notes_samples: List[Dict[str, Any]] = []
    warnings: List[str] = []


class QCRecordCreate(BaseModel):
    sample_id: int
    reviewer: str
    quality_score: Optional[float] = None
    low_quality_flag: bool = False
    contamination_check: Optional[str] = None
    read_count: Optional[int] = None
    mapping_rate: Optional[float] = None
    remarks: Optional[str] = None


class QCRecordOut(QCRecordCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRecordCreate(BaseModel):
    sample_id: int
    reviewer: str
    review_type: str
    review_opinion: str
    culture_record_check: Optional[str] = None
    time_point_check: Optional[str] = None
    barcode_duplicate: bool = False
    empty_field_found: bool = False
    mixed_notes_found: bool = False
    final_decision: str


class ReviewRecordOut(ReviewRecordCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    sample_id: int
    to_status: str
    operator: str
    reason: Optional[str] = None


class BatchStatusUpdate(BaseModel):
    sample_ids: List[int]
    to_status: str
    operator: str
    reason: Optional[str] = None


class ImageAnnotationCreate(BaseModel):
    sample_id: int
    pca_plot_path: Optional[str] = None
    cluster_label: Optional[str] = None
    outlier_flag: bool = False
    annotation_text: Optional[str] = None
    annotated_by: str


class ImageAnnotationOut(ImageAnnotationCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DifferentialAnalysisCreate(BaseModel):
    sample_id: int
    source_material: str
    comparison_group: Optional[str] = None
    significant_markers: Optional[Dict[str, Any]] = None
    conclusion: str
    trace_to_source: Optional[str] = None


class DifferentialAnalysisOut(DifferentialAnalysisCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExportRequest(BaseModel):
    batch_id: Optional[str] = None
    sample_ids: Optional[List[int]] = None
    exported_by: str
    include_all_valid: bool = False


class ExportReportOut(BaseModel):
    report_id: str
    batch_id: Optional[str] = None
    included_samples_count: int
    excluded_samples_count: int
    excluded_reasons: Dict[str, Any] = {}
    qc_summary: Dict[str, Any] = {}
    data_hash: str
    exported_by: str
    created_at: datetime
    samples: List[SampleOut] = []

    class Config:
        from_attributes = True


class SampleDetailOut(SampleOut):
    qc_records: List[QCRecordOut] = []
    reviews: List[ReviewRecordOut] = []
    annotations: List[ImageAnnotationOut] = []
    diff_analyses: List[DifferentialAnalysisOut] = []
    status_logs: List[Dict[str, Any]] = []


class ImportBatchOut(BaseModel):
    batch_id: str
    file_name: Optional[str] = None
    total_samples: int
    valid_samples: int
    duplicate_barcodes: List[str] = []
    empty_field_samples: List[Dict[str, Any]] = []
    mixed_notes_samples: List[Dict[str, Any]] = []
    imported_by: Optional[str] = None
    created_at: datetime


class QCSummary(BaseModel):
    total_samples: int
    qc_passed: int
    needs_teacher_review: int
    rejected: int
    pending: int
    low_quality_reads_count: int
    direct_usable_count: int
