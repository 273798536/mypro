from datetime import datetime
import hashlib
import json
from enum import Enum as PyEnum
from sqlalchemy import Enum
from app import db


SAMPLE_STATUS = PyEnum('SAMPLE_STATUS', ['PENDING', 'CLEAN', 'DIRTY', 'LEAKAGE', 'CORRECTED'])
DIAGNOSIS_STATUS = PyEnum('DIAGNOSIS_STATUS', ['PENDING', 'PASS', 'FAIL', 'TO_BE_CONFIRMED', 'ERROR'])
DIAGNOSIS_TYPE = PyEnum('DIAGNOSIS_TYPE', ['FORGET', 'LEAKAGE', 'QUALITY', 'DUPLICATE'])
SEVERITY_LEVEL = PyEnum('SEVERITY_LEVEL', ['low', 'medium', 'high', 'critical'])


def generate_content_hash(content: dict) -> str:
    content_str = json.dumps(content, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(content_str.encode('utf-8')).hexdigest()


def generate_batch_id(batch_name: str, import_time: datetime = None) -> str:
    if import_time is None:
        import_time = datetime.now()
    batch_base = f"{batch_name}_{import_time.strftime('%Y%m%d')}"
    return hashlib.md5(batch_base.encode('utf-8')).hexdigest()[:16]


class Sample(db.Model):
    __tablename__ = 'sample'

    id = db.Column(db.Integer, primary_key=True)
    content_hash = db.Column(db.String(64), index=True, nullable=False)
    batch_id = db.Column(db.String(32), index=True, nullable=False)
    batch_name = db.Column(db.String(128), nullable=False)
    conversation_id = db.Column(db.String(64), index=True)
    user_id = db.Column(db.String(64), index=True)
    turn_count = db.Column(db.Integer, default=0)
    content = db.Column(db.Text, nullable=False)
    source_dataset = db.Column(db.String(64))
    split_type = db.Column(db.String(16))
    status = db.Column(Enum(SAMPLE_STATUS), default=SAMPLE_STATUS.PENDING)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = db.Column(db.String(64))

    versions = db.relationship('SampleVersion', backref='sample', lazy='dynamic',
                              cascade='all, delete-orphan')
    diagnosis_results = db.relationship('DiagnosisResult', backref='sample',
                                       lazy='dynamic', cascade='all, delete-orphan')
    manual_corrections = db.relationship('ManualCorrection', backref='sample',
                                        lazy='dynamic', cascade='all, delete-orphan')

    __table_args__ = (
        db.Index('_content_batch_idx', 'content_hash', 'batch_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'content_hash': self.content_hash,
            'batch_id': self.batch_id,
            'batch_name': self.batch_name,
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'turn_count': self.turn_count,
            'content': json.loads(self.content) if self.content else {},
            'source_dataset': self.source_dataset,
            'split_type': self.split_type,
            'status': self.status.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class SampleVersion(db.Model):
    __tablename__ = 'sample_version'

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    content_hash = db.Column(db.String(64), nullable=False)
    change_reason = db.Column(db.String(256))
    changed_by = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('sample_id', 'version_number', name='_sample_version_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'sample_id': self.sample_id,
            'version_number': self.version_number,
            'content': json.loads(self.content) if self.content else {},
            'content_hash': self.content_hash,
            'change_reason': self.change_reason,
            'changed_by': self.changed_by,
            'created_at': self.created_at.isoformat(),
        }


class EvaluationBank(db.Model):
    __tablename__ = 'evaluation_bank'

    id = db.Column(db.Integer, primary_key=True)
    bank_hash = db.Column(db.String(64), index=True, nullable=False)
    import_batch_id = db.Column(db.String(32), index=True, nullable=False)
    bank_name = db.Column(db.String(128), nullable=False)
    question_id = db.Column(db.String(64), index=True)
    content = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.now)
    imported_by = db.Column(db.String(64))

    diagnosis_results = db.relationship('DiagnosisResult', backref='evaluation_bank',
                                       lazy='dynamic', cascade='all, delete-orphan')

    __table_args__ = (
        db.UniqueConstraint('bank_hash', 'import_batch_id', name='_bank_import_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'bank_hash': self.bank_hash,
            'import_batch_id': self.import_batch_id,
            'bank_name': self.bank_name,
            'question_id': self.question_id,
            'content': json.loads(self.content) if self.content else {},
            'source': self.source,
            'created_at': self.created_at.isoformat(),
        }


class DiagnosisResult(db.Model):
    __tablename__ = 'diagnosis_result'

    id = db.Column(db.Integer, primary_key=True)
    result_key = db.Column(db.String(128), index=True, unique=True, nullable=False)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'))
    evaluation_bank_id = db.Column(db.Integer, db.ForeignKey('evaluation_bank.id'))
    diagnosis_type = db.Column(Enum(DIAGNOSIS_TYPE), nullable=False)
    status = db.Column(Enum(DIAGNOSIS_STATUS), default=DIAGNOSIS_STATUS.PENDING)
    summary = db.Column(db.String(512))
    details = db.Column(db.Text)
    severity = db.Column(Enum(SEVERITY_LEVEL))
    matched_rules = db.Column(db.String(256))
    missing_rules = db.Column(db.String(256))
    confidence = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    diagnosed_by = db.Column(db.String(64), default='system')
    is_latest = db.Column(db.Boolean, default=True)

    __table_args__ = (
        db.Index('idx_target_latest', 'sample_id', 'evaluation_bank_id', 'is_latest'),
    )

    def to_dict(self, include_details: bool = True):
        data = {
            'id': self.id,
            'result_key': self.result_key,
            'sample_id': self.sample_id,
            'evaluation_bank_id': self.evaluation_bank_id,
            'diagnosis_type': self.diagnosis_type.name,
            'status': self.status.name,
            'summary': self.summary,
            'severity': self.severity.name if self.severity else None,
            'matched_rules': self.matched_rules.split(',') if self.matched_rules else [],
            'missing_rules': self.missing_rules.split(',') if self.missing_rules else [],
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'diagnosed_by': self.diagnosed_by,
            'is_latest': self.is_latest,
        }
        if include_details and self.details:
            data['details'] = json.loads(self.details)
        return data


class ManualCorrection(db.Model):
    __tablename__ = 'manual_correction'

    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False)
    diagnosis_result_id = db.Column(db.Integer, db.ForeignKey('diagnosis_result.id'))
    correction_type = db.Column(db.String(32))
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    correction_reason = db.Column(db.String(256))
    corrected_by = db.Column(db.String(64))
    version_number = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'sample_id': self.sample_id,
            'diagnosis_result_id': self.diagnosis_result_id,
            'correction_type': self.correction_type,
            'old_value': json.loads(self.old_value) if self.old_value else None,
            'new_value': json.loads(self.new_value) if self.new_value else None,
            'correction_reason': self.correction_reason,
            'corrected_by': self.corrected_by,
            'version_number': self.version_number,
            'created_at': self.created_at.isoformat(),
        }


class SecurityRule(db.Model):
    __tablename__ = 'security_rule'

    id = db.Column(db.Integer, primary_key=True)
    rule_code = db.Column(db.String(32), unique=True, nullable=False)
    rule_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512))
    is_active = db.Column(db.Boolean, default=True)
    severity = db.Column(Enum(SEVERITY_LEVEL), default=SEVERITY_LEVEL.medium)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'rule_code': self.rule_code,
            'rule_name': self.rule_name,
            'description': self.description,
            'is_active': self.is_active,
            'severity': self.severity.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class GroupMetric(db.Model):
    __tablename__ = 'group_metric'

    id = db.Column(db.Integer, primary_key=True)
    metric_key = db.Column(db.String(64), index=True, nullable=False)
    group_key = db.Column(db.String(64), index=True, nullable=False)
    batch_id = db.Column(db.String(32), index=True)
    metric_name = db.Column(db.String(64), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    sample_count = db.Column(db.Integer, default=0)
    metric_period = db.Column(db.String(16))
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('metric_key', 'group_key', 'batch_id', 'metric_period',
                           name='_metric_group_batch_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'metric_key': self.metric_key,
            'group_key': self.group_key,
            'batch_id': self.batch_id,
            'metric_name': self.metric_name,
            'metric_value': self.metric_value,
            'sample_count': self.sample_count,
            'metric_period': self.metric_period,
            'created_at': self.created_at.isoformat(),
        }


class GrayComparison(db.Model):
    __tablename__ = 'gray_comparison'

    id = db.Column(db.Integer, primary_key=True)
    comparison_key = db.Column(db.String(128), index=True, unique=True, nullable=False)
    batch_a_id = db.Column(db.String(32), index=True, nullable=False)
    batch_b_id = db.Column(db.String(32), index=True, nullable=False)
    batch_a_name = db.Column(db.String(128))
    batch_b_name = db.Column(db.String(128))
    metric_name = db.Column(db.String(64))
    value_a = db.Column(db.Float)
    value_b = db.Column(db.Float)
    diff_value = db.Column(db.Float)
    diff_percent = db.Column(db.Float)
    is_significant = db.Column(db.Boolean, default=False)
    analysis_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    created_by = db.Column(db.String(64))

    def to_dict(self):
        return {
            'id': self.id,
            'comparison_key': self.comparison_key,
            'batch_a_id': self.batch_a_id,
            'batch_b_id': self.batch_b_id,
            'batch_a_name': self.batch_a_name,
            'batch_b_name': self.batch_b_name,
            'metric_name': self.metric_name,
            'value_a': self.value_a,
            'value_b': self.value_b,
            'diff_value': self.diff_value,
            'diff_percent': self.diff_percent,
            'is_significant': self.is_significant,
            'analysis_notes': self.analysis_notes,
            'created_at': self.created_at.isoformat(),
        }
