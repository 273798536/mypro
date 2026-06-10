from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from enum import Enum

db = SQLAlchemy()

class SampleStatus(str, Enum):
    IMPORTED = '已导入'
    REVIEWING = '复核中'
    APPROVED = '已通过'
    REJECTED = '已驳回'
    DUPLICATE = '条码重复'

class QualityLevel(str, Enum):
    EXCELLENT = '优秀'
    GOOD = '良好'
    POOR = '较差'
    UNAVAILABLE = '不可用'

class Batch(db.Model):
    __tablename__ = 'batches'
    
    id = db.Column(db.Integer, primary_key=True)
    batch_no = db.Column(db.String(50), unique=True, nullable=False)
    import_time = db.Column(db.DateTime, default=datetime.now)
    operator = db.Column(db.String(50), default='系统导入')
    filename = db.Column(db.String(200))
    total_count = db.Column(db.Integer, default=0)
    duplicate_count = db.Column(db.Integer, default=0)
    remark = db.Column(db.Text)
    
    samples = db.relationship('Sample', backref='batch', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'batch_no': self.batch_no,
            'import_time': self.import_time.strftime('%Y-%m-%d %H:%M:%S') if self.import_time else None,
            'operator': self.operator,
            'filename': self.filename,
            'total_count': self.total_count,
            'duplicate_count': self.duplicate_count,
            'remark': self.remark
        }

class Sample(db.Model):
    __tablename__ = 'samples'
    
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id'), nullable=False)
    barcode = db.Column(db.String(100), nullable=False, index=True)
    sample_name = db.Column(db.String(200))
    species = db.Column(db.String(100))
    initial_count = db.Column(db.Integer, default=0)
    survival_count = db.Column(db.Integer, default=0)
    survival_rate = db.Column(db.Float, default=0.0)
    culture_temperature = db.Column(db.Float)
    culture_salinity = db.Column(db.Float)
    culture_days = db.Column(db.Integer)
    sample_time = db.Column(db.DateTime)
    collector = db.Column(db.String(50))
    
    status = db.Column(db.String(20), default=SampleStatus.IMPORTED.value)
    is_duplicate = db.Column(db.Boolean, default=False)
    duplicate_with = db.Column(db.String(200))
    duplicate_reason = db.Column(db.Text)
    is_available = db.Column(db.Boolean, default=True)
    unavailable_reason = db.Column(db.Text)
    
    review_comment = db.Column(db.Text)
    reviewer = db.Column(db.String(50))
    review_time = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    status_history = db.relationship('StatusHistory', backref='sample', lazy=True, cascade='all, delete-orphan')
    quality_control = db.relationship('QualityControl', backref='sample', lazy=True, cascade='all, delete-orphan', uselist=False)
    duplicate_records = db.relationship('DuplicateRecord', backref='sample', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_quality=False, include_history=False):
        data = {
            'id': self.id,
            'batch_id': self.batch_id,
            'batch_no': self.batch.batch_no if self.batch else None,
            'barcode': self.barcode,
            'sample_name': self.sample_name,
            'species': self.species,
            'initial_count': self.initial_count,
            'survival_count': self.survival_count,
            'survival_rate': round(self.survival_rate, 2) if self.survival_rate else 0,
            'culture_temperature': self.culture_temperature,
            'culture_salinity': self.culture_salinity,
            'culture_days': self.culture_days,
            'sample_time': self.sample_time.strftime('%Y-%m-%d %H:%M:%S') if self.sample_time else None,
            'collector': self.collector,
            'status': self.status,
            'is_duplicate': self.is_duplicate,
            'duplicate_with': self.duplicate_with,
            'duplicate_reason': self.duplicate_reason,
            'is_available': self.is_available,
            'unavailable_reason': self.unavailable_reason,
            'review_comment': self.review_comment,
            'reviewer': self.reviewer,
            'review_time': self.review_time.strftime('%Y-%m-%d %H:%M:%S') if self.review_time else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }
        if include_quality and self.quality_control:
            data['quality_control'] = self.quality_control.to_dict()
        if include_history:
            data['status_history'] = [h.to_dict() for h in self.status_history]
        return data

class StatusHistory(db.Model):
    __tablename__ = 'status_history'
    
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'), nullable=False)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20), nullable=False)
    operator = db.Column(db.String(50))
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sample_id': self.sample_id,
            'from_status': self.from_status,
            'to_status': self.to_status,
            'operator': self.operator,
            'comment': self.comment,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

class QualityControl(db.Model):
    __tablename__ = 'quality_control'
    
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'), nullable=False)
    
    micro_photo_path = db.Column(db.String(500))
    micro_photo_upload_time = db.Column(db.DateTime)
    micro_photo_uploader = db.Column(db.String(50))
    
    morphological_score = db.Column(db.Float)
    activity_score = db.Column(db.Float)
    uniformity_score = db.Column(db.Float)
    overall_score = db.Column(db.Float)
    quality_level = db.Column(db.String(20))
    
    size_mean = db.Column(db.Float)
    size_std = db.Column(db.Float)
    size_cv = db.Column(db.Float)
    
    abnormal_count = db.Column(db.Integer, default=0)
    abnormal_rate = db.Column(db.Float, default=0.0)
    abnormal_description = db.Column(db.Text)
    
    diff_analysis = db.Column(db.Text)
    diff_analysis_time = db.Column(db.DateTime)
    diff_analysis_update_count = db.Column(db.Integer, default=0)
    
    reviewer_comment = db.Column(db.Text)
    reviewer = db.Column(db.String(50))
    review_time = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sample_id': self.sample_id,
            'micro_photo_path': self.micro_photo_path,
            'micro_photo_upload_time': self.micro_photo_upload_time.strftime('%Y-%m-%d %H:%M:%S') if self.micro_photo_upload_time else None,
            'micro_photo_uploader': self.micro_photo_uploader,
            'morphological_score': self.morphological_score,
            'activity_score': self.activity_score,
            'uniformity_score': self.uniformity_score,
            'overall_score': self.overall_score,
            'quality_level': self.quality_level,
            'size_mean': self.size_mean,
            'size_std': self.size_std,
            'size_cv': self.size_cv,
            'abnormal_count': self.abnormal_count,
            'abnormal_rate': self.abnormal_rate,
            'abnormal_description': self.abnormal_description,
            'diff_analysis': self.diff_analysis,
            'diff_analysis_time': self.diff_analysis_time.strftime('%Y-%m-%d %H:%M:%S') if self.diff_analysis_time else None,
            'diff_analysis_update_count': self.diff_analysis_update_count,
            'reviewer_comment': self.reviewer_comment,
            'reviewer': self.reviewer,
            'review_time': self.review_time.strftime('%Y-%m-%d %H:%M:%S') if self.review_time else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class DuplicateRecord(db.Model):
    __tablename__ = 'duplicate_records'
    
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'), nullable=False)
    barcode = db.Column(db.String(100), nullable=False, index=True)
    duplicate_sample_ids = db.Column(db.String(500))
    duplicate_batch_nos = db.Column(db.String(500))
    first_seen_batch = db.Column(db.String(50))
    duplicate_count = db.Column(db.Integer, default=2)
    reason = db.Column(db.Text)
    detected_time = db.Column(db.DateTime, default=datetime.now)
    resolved = db.Column(db.Boolean, default=False)
    resolution = db.Column(db.Text)
    resolution_time = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sample_id': self.sample_id,
            'barcode': self.barcode,
            'duplicate_sample_ids': self.duplicate_sample_ids,
            'duplicate_batch_nos': self.duplicate_batch_nos,
            'first_seen_batch': self.first_seen_batch,
            'duplicate_count': self.duplicate_count,
            'reason': self.reason,
            'detected_time': self.detected_time.strftime('%Y-%m-%d %H:%M:%S') if self.detected_time else None,
            'resolved': self.resolved,
            'resolution': self.resolution,
            'resolution_time': self.resolution_time.strftime('%Y-%m-%d %H:%M:%S') if self.resolution_time else None
        }
