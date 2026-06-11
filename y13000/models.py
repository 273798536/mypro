from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class ReinsuranceBatch(db.Model):
    __tablename__ = 'reinsurance_batches'

    id = db.Column(db.Integer, primary_key=True)
    batch_no = db.Column(db.String(100), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='CNY')
    caliber = db.Column(db.String(100))
    policy_no = db.Column(db.String(200))
    business_type = db.Column(db.String(100))
    occur_date = db.Column(db.String(20))
    status = db.Column(db.String(50), default='pending')
    operator = db.Column(db.String(100), default='当前用户')
    remark = db.Column(db.Text)
    raw_data = db.Column(db.Text)
    source_file = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    emails = db.relationship('ApprovalEmail', backref='batch', lazy=True, cascade='all, delete-orphan')
    histories = db.relationship('OperationHistory', backref='batch', lazy=True, cascade='all, delete-orphan')
    anomalies = db.relationship('AnomalyRecord', backref='batch', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'batch_no': self.batch_no, 'amount': self.amount,
            'currency': self.currency, 'caliber': self.caliber, 'policy_no': self.policy_no,
            'business_type': self.business_type, 'occur_date': self.occur_date,
            'status': self.status, 'operator': self.operator, 'remark': self.remark,
            'raw_data': self.raw_data, 'source_file': self.source_file,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }


class ApprovalEmail(db.Model):
    __tablename__ = 'approval_emails'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reinsurance_batches.id'), nullable=True)
    email_subject = db.Column(db.String(500))
    email_from = db.Column(db.String(200))
    email_to = db.Column(db.String(500))
    email_date = db.Column(db.String(50))
    email_body = db.Column(db.Text)
    raw_content = db.Column(db.Text)
    source_file = db.Column(db.String(500))
    related_batch_no = db.Column(db.String(100))
    related_amount = db.Column(db.Float)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id, 'batch_id': self.batch_id,
            'email_subject': self.email_subject, 'email_from': self.email_from,
            'email_to': self.email_to, 'email_date': self.email_date,
            'email_body': self.email_body, 'raw_content': self.raw_content,
            'source_file': self.source_file, 'related_batch_no': self.related_batch_no,
            'related_amount': self.related_amount, 'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }


class OperationHistory(db.Model):
    __tablename__ = 'operation_histories'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reinsurance_batches.id'), nullable=False)
    operation_type = db.Column(db.String(50), nullable=False)
    operator = db.Column(db.String(100), default='当前用户')
    operation_time = db.Column(db.DateTime, default=datetime.now)
    old_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50))
    old_remark = db.Column(db.Text)
    new_remark = db.Column(db.Text)
    change_reason = db.Column(db.Text)
    next_step = db.Column(db.Text)
    raw_snapshot = db.Column(db.Text)
    is_manual_override = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id, 'batch_id': self.batch_id,
            'operation_type': self.operation_type, 'operator': self.operator,
            'operation_time': self.operation_time.strftime('%Y-%m-%d %H:%M:%S') if self.operation_time else None,
            'old_status': self.old_status, 'new_status': self.new_status,
            'old_remark': self.old_remark, 'new_remark': self.new_remark,
            'change_reason': self.change_reason, 'next_step': self.next_step,
            'raw_snapshot': self.raw_snapshot, 'is_manual_override': self.is_manual_override
        }


class AnomalyRecord(db.Model):
    __tablename__ = 'anomaly_records'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('reinsurance_batches.id'), nullable=False)
    anomaly_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    related_batch_ids = db.Column(db.String(500))
    status = db.Column(db.String(50), default='pending')
    handler = db.Column(db.String(100))
    handle_remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    handled_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id, 'batch_id': self.batch_id,
            'anomaly_type': self.anomaly_type, 'description': self.description,
            'related_batch_ids': self.related_batch_ids, 'status': self.status,
            'handler': self.handler, 'handle_remark': self.handle_remark,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'handled_at': self.handled_at.strftime('%Y-%m-%d %H:%M:%S') if self.handled_at else None
        }


class SystemSetting(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    description = db.Column(db.String(500))
