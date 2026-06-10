from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from .database import Base


class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String, index=True, nullable=False)
    sample_name = Column(String)
    material_source = Column(String)
    batch_id = Column(String, index=True)
    culture_record = Column(Text)
    time_point = Column(String)
    notes = Column(Text)
    raw_notes = Column(Text)

    quality_rating = Column(String, default="pending")
    low_quality_reads = Column(Boolean, default=False)
    low_quality_detail = Column(Text)

    review_status = Column(String, default="imported")
    # imported -> reviewing -> qc_passed / needs_bio_review / rejected -> exported

    can_use_directly = Column(Boolean, default=False)
    needs_teacher_review = Column(Boolean, default=False)
    unusable_reason = Column(Text)

    import_batch_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    qc_records = relationship("QCRecord", back_populates="sample")
    reviews = relationship("ReviewRecord", back_populates="sample")
    annotations = relationship("ImageAnnotation", back_populates="sample")
    diff_analyses = relationship("DifferentialAnalysis", back_populates="sample")
    status_logs = relationship("StatusLog", back_populates="sample")


class QCRecord(Base):
    __tablename__ = "qc_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"))
    reviewer = Column(String)
    quality_score = Column(Float)
    low_quality_flag = Column(Boolean, default=False)
    contamination_check = Column(String)
    read_count = Column(Integer)
    mapping_rate = Column(Float)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="qc_records")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"))
    reviewer = Column(String)
    review_type = Column(String)
    review_opinion = Column(Text)
    culture_record_check = Column(String)
    time_point_check = Column(String)
    barcode_duplicate = Column(Boolean, default=False)
    empty_field_found = Column(Boolean, default=False)
    mixed_notes_found = Column(Boolean, default=False)
    final_decision = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="reviews")


class ImageAnnotation(Base):
    __tablename__ = "image_annotations"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"))
    pca_plot_path = Column(String)
    cluster_label = Column(String)
    outlier_flag = Column(Boolean, default=False)
    annotation_text = Column(Text)
    annotated_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="annotations")


class DifferentialAnalysis(Base):
    __tablename__ = "differential_analyses"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"))
    source_material = Column(String)
    comparison_group = Column(String)
    significant_markers = Column(JSON)
    conclusion = Column(Text)
    trace_to_source = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="diff_analyses")


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"))
    from_status = Column(String)
    to_status = Column(String)
    operator = Column(String)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="status_logs")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, unique=True, index=True)
    file_name = Column(String)
    total_samples = Column(Integer, default=0)
    valid_samples = Column(Integer, default=0)
    duplicate_barcodes = Column(JSON, default=list)
    empty_field_samples = Column(JSON, default=list)
    mixed_notes_samples = Column(JSON, default=list)
    imported_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExportReport(Base):
    __tablename__ = "export_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True)
    batch_id = Column(String)
    included_samples = Column(JSON, default=list)
    excluded_samples = Column(JSON, default=list)
    excluded_reasons = Column(JSON, default=dict)
    qc_summary = Column(JSON)
    data_hash = Column(String)
    exported_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
