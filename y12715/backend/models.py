from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()


class WrongQuestion(db.Model):
    __tablename__ = 'wrong_questions'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), nullable=False)
    student_name = db.Column(db.String(100))
    question_content = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(500))
    student_answer = db.Column(db.String(500))

    source_type = db.Column(db.String(20))
    source_ref = db.Column(db.String(500))
    source_note = db.Column(db.String(500))

    attribution_reason = db.Column(db.Text)
    attribution_category = db.Column(db.String(100))

    status = db.Column(db.String(20), default='pending')
    data_quality = db.Column(db.String(20), default='available')

    version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = db.relationship('AuditLog', backref='question', lazy=True, cascade='all, delete-orphan')
    constraint_checks = db.relationship('ConstraintCheck', backref='question', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_detail=False):
        data = {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student_name,
            'question_content': self.question_content,
            'correct_answer': self.correct_answer,
            'student_answer': self.student_answer,
            'source_type': self.source_type,
            'source_ref': self.source_ref,
            'source_note': self.source_note,
            'attribution_reason': self.attribution_reason,
            'attribution_category': self.attribution_category,
            'status': self.status,
            'status_label': self._status_label(),
            'data_quality': self.data_quality,
            'data_quality_label': self._data_quality_label(),
            'version': self.version,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None,
        }
        if include_detail:
            data['audit_logs'] = [log.to_dict() for log in self.audit_logs]
            data['constraint_checks'] = [c.to_dict() for c in self.constraint_checks]
        return data

    def _status_label(self):
        labels = {
            'pending': '待确认',
            'approved': '已通过',
            'rejected': '需重新采集',
            'delayed': '暂缓处理'
        }
        return labels.get(self.status, self.status)

    def _data_quality_label(self):
        labels = {
            'available': '数据可用',
            'delayed': '数据暂缓',
            'recollect': '需重新采集'
        }
        return labels.get(self.data_quality, self.data_quality)


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('wrong_questions.id'), nullable=False)
    analyst_name = db.Column(db.String(100), nullable=False)
    from_status = db.Column(db.String(20))
    to_status = db.Column(db.String(20))
    change_reason = db.Column(db.Text)
    old_values = db.Column(db.Text)
    new_values = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        labels = {'pending': '待确认', 'approved': '已通过', 'rejected': '需重新采集', 'delayed': '暂缓处理'}
        return {
            'id': self.id,
            'question_id': self.question_id,
            'analyst_name': self.analyst_name,
            'from_status': self.from_status,
            'from_status_label': labels.get(self.from_status, self.from_status) if self.from_status else None,
            'to_status': self.to_status,
            'to_status_label': labels.get(self.to_status, self.to_status),
            'change_reason': self.change_reason,
            'old_values': json.loads(self.old_values) if self.old_values else None,
            'new_values': json.loads(self.new_values) if self.new_values else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
        }


class ConstraintCheck(db.Model):
    __tablename__ = 'constraint_checks'

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('wrong_questions.id'), nullable=False)
    check_type = db.Column(db.String(50))
    check_result = db.Column(db.String(20))
    check_detail = db.Column(db.Text)
    source_material_ref = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'question_id': self.question_id,
            'check_type': self.check_type,
            'check_result': self.check_result,
            'check_detail': self.check_detail,
            'source_material_ref': self.source_material_ref,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
        }
