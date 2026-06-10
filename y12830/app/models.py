from datetime import datetime
from .database import db
from enum import Enum

class ValidationStatus(str, Enum):
    PASS = 'pass'
    FAIL = 'fail'
    REVIEW = 'review'
    PENDING = 'pending'

class ConflictType(str, Enum):
    SAMPLE_MISMATCH = 'sample_mismatch'
    GENDER_MISMATCH = 'gender_mismatch'
    RELATIONSHIP_ERROR = 'relationship_error'
    BATCH_CONFLICT = 'batch_conflict'
    DUPLICATE_IMPORT = 'duplicate_import'
    DATA_INCONSISTENCY = 'data_inconsistency'

class ReagentBatch(db.Model):
    __tablename__ = 'reagent_batches'
    id = db.Column(db.Integer, primary_key=True)
    batch_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))
    source_file = db.Column(db.String(500))
    import_record_id = db.Column(db.Integer, db.ForeignKey('import_records.id'))
    samples = db.relationship('Sample', backref='reagent_batch', lazy=True, cascade='all, delete-orphan')
    validation_results = db.relationship('ValidationResult', backref='reagent_batch', lazy=True)
    conflicts = db.relationship('ConflictRecord', backref='reagent_batch', lazy=True)

class Sample(db.Model):
    __tablename__ = 'samples'
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.String(100), nullable=False, index=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reagent_batches.id'), nullable=False)
    original_row_number = db.Column(db.Integer)
    source_file = db.Column(db.String(500))
    source_sheet = db.Column(db.String(200))
    import_record_id = db.Column(db.Integer, db.ForeignKey('import_records.id'))
    name = db.Column(db.String(200))
    gender = db.Column(db.String(10))
    sample_type = db.Column(db.String(50))
    collection_date = db.Column(db.DateTime)
    received_date = db.Column(db.DateTime)
    status = db.Column(db.String(50))
    notes = db.Column(db.Text)
    raw_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sequencing_results = db.relationship('SequencingResult', backref='sample', lazy=True, cascade='all, delete-orphan')
    pedigree_members = db.relationship('PedigreeMember', backref='sample', lazy=True)
    conflicts = db.relationship('ConflictRecord', backref='sample', lazy=True, foreign_keys='ConflictRecord.sample_id')

class SequencingResult(db.Model):
    __tablename__ = 'sequencing_results'
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'), nullable=False)
    original_row_number = db.Column(db.Integer)
    source_file = db.Column(db.String(500))
    source_sheet = db.Column(db.String(200))
    import_record_id = db.Column(db.Integer, db.ForeignKey('import_records.id'))
    sequencing_id = db.Column(db.String(100), index=True)
    run_id = db.Column(db.String(100))
    panel = db.Column(db.String(100))
    gene = db.Column(db.String(100))
    variant = db.Column(db.String(200))
    genotype = db.Column(db.String(50))
    chromosome = db.Column(db.String(10))
    position = db.Column(db.BigInteger)
    reference = db.Column(db.String(100))
    alternate = db.Column(db.String(100))
    quality_score = db.Column(db.Float)
    depth = db.Column(db.Integer)
    zygosity = db.Column(db.String(20))
    interpretation = db.Column(db.String(100))
    raw_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    conflicts = db.relationship('ConflictRecord', backref='sequencing_result', lazy=True, foreign_keys='ConflictRecord.sequencing_result_id')

class PedigreeMember(db.Model):
    __tablename__ = 'pedigree_members'
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'))
    family_id = db.Column(db.String(100), index=True)
    individual_id = db.Column(db.String(100), index=True)
    father_id = db.Column(db.String(100))
    mother_id = db.Column(db.String(100))
    spouse_id = db.Column(db.String(100))
    gender = db.Column(db.String(10))
    affection_status = db.Column(db.String(20))
    relationship = db.Column(db.String(50))
    generation = db.Column(db.Integer)
    original_row_number = db.Column(db.Integer)
    source_file = db.Column(db.String(500))
    import_record_id = db.Column(db.Integer, db.ForeignKey('import_records.id'))
    raw_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ImportRecord(db.Model):
    __tablename__ = 'import_records'
    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(500), nullable=False)
    file_hash = db.Column(db.String(64), index=True)
    sheet_name = db.Column(db.String(200))
    import_type = db.Column(db.String(50))
    batch_number = db.Column(db.String(100))
    total_rows = db.Column(db.Integer)
    imported_rows = db.Column(db.Integer)
    skipped_rows = db.Column(db.Integer)
    duplicate_rows = db.Column(db.Integer)
    user = db.Column(db.String(100))
    import_time = db.Column(db.DateTime, default=datetime.utcnow)
    source_notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='completed')
    error_message = db.Column(db.Text)

class ValidationResult(db.Model):
    __tablename__ = 'validation_results'
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reagent_batches.id'))
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'))
    validation_type = db.Column(db.String(50))
    status = db.Column(db.String(20), default=ValidationStatus.PENDING)
    severity = db.Column(db.String(20))
    message = db.Column(db.Text)
    expected_value = db.Column(db.String(500))
    actual_value = db.Column(db.String(500))
    source_records = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_by = db.Column(db.String(100))
    reviewed_at = db.Column(db.DateTime)
    review_notes = db.Column(db.Text)
    resolved = db.Column(db.Boolean, default=False)

class ImageAnnotation(db.Model):
    __tablename__ = 'image_annotations'
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reagent_batches.id'))
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'))
    image_file = db.Column(db.String(500), nullable=False)
    annotation_type = db.Column(db.String(50))
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    width = db.Column(db.Float)
    height = db.Column(db.Float)
    label = db.Column(db.String(200))
    notes = db.Column(db.Text)
    color = db.Column(db.String(20))
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ConflictRecord(db.Model):
    __tablename__ = 'conflict_records'
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reagent_batches.id'))
    sample_id = db.Column(db.Integer, db.ForeignKey('samples.id'))
    sequencing_result_id = db.Column(db.Integer, db.ForeignKey('sequencing_results.id'))
    conflict_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), default='warning')
    status = db.Column(db.String(20), default='open')
    message = db.Column(db.Text)
    source_records = db.Column(db.JSON)
    expected_value = db.Column(db.String(500))
    actual_value = db.Column(db.String(500))
    resolution_notes = db.Column(db.Text)
    resolved_by = db.Column(db.String(100))
    resolved_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    priority = db.Column(db.Integer, default=1)

    @property
    def is_critical(self):
        return self.severity == 'critical' or self.priority >= 3
