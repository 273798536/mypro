from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON

db = SQLAlchemy()


class SeaweedSample(db.Model):
    __tablename__ = 'seaweed_samples'

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    collection_site = db.Column(db.String(100))
    collection_date = db.Column(db.Date)
    species = db.Column(db.String(100))
    initial_growth_stage = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reviews = db.relationship('ReviewOpinion', backref='sample', lazy=True)
    annotations = db.relationship('ImageAnnotation', backref='sample', lazy=True)


class ReviewBatch(db.Model):
    __tablename__ = 'review_batches'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    reagent_lot = db.Column(db.String(100), nullable=False)
    microscope_batch = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.Text)

    reviews = db.relationship('ReviewOpinion', backref='batch', lazy=True)
    annotations = db.relationship('ImageAnnotation', backref='batch', lazy=True)
    statistics = db.relationship('BatchStatistics', backref='batch', uselist=False)
    low_quality_reads = db.relationship('LowQualityRead', backref='batch', lazy=True)


class ReviewOpinion(db.Model):
    __tablename__ = 'review_opinions'

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.String(50), db.ForeignKey('seaweed_samples.sample_id'), nullable=False, index=True)
    batch_id = db.Column(db.String(50), db.ForeignKey('review_batches.batch_id'), nullable=False, index=True)
    reviewer = db.Column(db.String(50), nullable=False)
    opinion = db.Column(db.Text, nullable=False)
    conclusion = db.Column(db.String(20), nullable=False)
    is_negative_control = db.Column(db.Boolean, default=False)
    negative_control_abnormal = db.Column(db.Boolean)
    low_quality_reads_passed = db.Column(db.Boolean)
    change_reason = db.Column(db.Text)
    previous_version_id = db.Column(db.Integer, db.ForeignKey('review_opinions.id'))
    version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    previous_version = db.relationship('ReviewOpinion', remote_side=[id], backref='next_versions')
    low_quality_reads = db.relationship('LowQualityRead', backref='review', lazy=True)
    audit_trail = db.relationship('AuditTrail', backref='review', lazy=True)


class ImageAnnotation(db.Model):
    __tablename__ = 'image_annotations'

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.String(50), db.ForeignKey('seaweed_samples.sample_id'), nullable=False, index=True)
    batch_id = db.Column(db.String(50), db.ForeignKey('review_batches.batch_id'), nullable=False, index=True)
    image_path = db.Column(db.String(255), nullable=False)
    annotation_data = db.Column(JSON, nullable=False)
    annotated_by = db.Column(db.String(50), nullable=False)
    boundary_confidence = db.Column(db.Float)
    boundary_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BatchStatistics(db.Model):
    __tablename__ = 'batch_statistics'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50), db.ForeignKey('review_batches.batch_id'), nullable=False, unique=True, index=True)
    total_samples = db.Column(db.Integer, default=0)
    normal_count = db.Column(db.Integer, default=0)
    abnormal_count = db.Column(db.Integer, default=0)
    low_quality_count = db.Column(db.Integer, default=0)
    negative_control_count = db.Column(db.Integer, default=0)
    negative_control_abnormal_count = db.Column(db.Integer, default=0)
    species_distribution = db.Column(JSON)
    growth_stage_distribution = db.Column(JSON)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    calculated_by = db.Column(db.String(50), nullable=False)


class LowQualityRead(db.Model):
    __tablename__ = 'low_quality_reads'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50), db.ForeignKey('review_batches.batch_id'), nullable=False, index=True)
    sample_id = db.Column(db.String(50), db.ForeignKey('seaweed_samples.sample_id'), nullable=False, index=True)
    review_id = db.Column(db.Integer, db.ForeignKey('review_opinions.id'))
    read_id = db.Column(db.String(100), nullable=False)
    quality_score = db.Column(db.Float)
    reason = db.Column(db.Text)
    passed_review = db.Column(db.Boolean)
    reviewed_by = db.Column(db.String(50))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AuditTrail(db.Model):
    __tablename__ = 'audit_trail'

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('review_opinions.id'), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    old_value = db.Column(JSON)
    new_value = db.Column(JSON)
    changed_by = db.Column(db.String(50), nullable=False)
    change_reason = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
