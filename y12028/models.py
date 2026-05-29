from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class DM(db.Model):
    __tablename__ = 'dms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    base_fee = db.Column(db.Float, default=0.0)
    split_ratio = db.Column(db.Float, default=0.3)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'base_fee': self.base_fee,
            'split_ratio': self.split_ratio,
            'is_active': self.is_active
        }


class Script(db.Model):
    __tablename__ = 'scripts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100))
    difficulty = db.Column(db.String(20))
    player_count = db.Column(db.Integer)
    duration_hours = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'author': self.author,
            'difficulty': self.difficulty,
            'player_count': self.player_count,
            'duration_hours': self.duration_hours
        }


class ScriptAuthorization(db.Model):
    __tablename__ = 'script_authorizations'
    id = db.Column(db.Integer, primary_key=True)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False)
    authorized_dm_id = db.Column(db.Integer, db.ForeignKey('dms.id'), nullable=False)
    authorization_fee = db.Column(db.Float, default=0.0)
    fee_type = db.Column(db.String(20), default='per_session')
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date)
    maintained_by = db.Column(db.String(100), nullable=False)
    maintainer_note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    script = db.relationship('Script', backref='authorizations')
    authorized_dm = db.relationship('DM', backref='authorizations')

    def to_dict(self):
        return {
            'id': self.id,
            'script_id': self.script_id,
            'script_name': self.script.name if self.script else '',
            'authorized_dm_id': self.authorized_dm_id,
            'authorized_dm_name': self.authorized_dm.name if self.authorized_dm else '',
            'authorization_fee': self.authorization_fee,
            'fee_type': self.fee_type,
            'valid_from': self.valid_from.strftime('%Y-%m-%d') if self.valid_from else '',
            'valid_to': self.valid_to.strftime('%Y-%m-%d') if self.valid_to else '',
            'maintained_by': self.maintained_by,
            'maintainer_note': self.maintainer_note
        }


class GameSession(db.Model):
    __tablename__ = 'game_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_no = db.Column(db.String(50), unique=True, nullable=False)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False)
    scheduled_dm_id = db.Column(db.Integer, db.ForeignKey('dms.id'), nullable=False)
    actual_dm_id = db.Column(db.Integer, db.ForeignKey('dms.id'))
    session_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time)
    player_count = db.Column(db.Integer, default=0)
    room_no = db.Column(db.String(20))
    status = db.Column(db.String(20), default='scheduled')
    maintained_by = db.Column(db.String(100), nullable=False)
    maintainer_note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    script = db.relationship('Script', backref='sessions', foreign_keys=[script_id])
    scheduled_dm = db.relationship('DM', backref='scheduled_sessions', foreign_keys=[scheduled_dm_id])
    actual_dm = db.relationship('DM', backref='actual_sessions', foreign_keys=[actual_dm_id])
    orders = db.relationship('Order', backref='session', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'session_no': self.session_no,
            'script_id': self.script_id,
            'script_name': self.script.name if self.script else '',
            'scheduled_dm_id': self.scheduled_dm_id,
            'scheduled_dm_name': self.scheduled_dm.name if self.scheduled_dm else '',
            'actual_dm_id': self.actual_dm_id,
            'actual_dm_name': self.actual_dm.name if self.actual_dm else '',
            'session_date': self.session_date.strftime('%Y-%m-%d') if self.session_date else '',
            'start_time': str(self.start_time) if self.start_time else '',
            'end_time': str(self.end_time) if self.end_time else '',
            'player_count': self.player_count,
            'room_no': self.room_no,
            'status': self.status,
            'maintained_by': self.maintained_by,
            'maintainer_note': self.maintainer_note,
            'is_dm_substitute': self.actual_dm_id and self.actual_dm_id != self.scheduled_dm_id
        }


class Coupon(db.Model):
    __tablename__ = 'coupons'
    id = db.Column(db.Integer, primary_key=True)
    coupon_code = db.Column(db.String(50), unique=True, nullable=False)
    coupon_type = db.Column(db.String(20), default='discount')
    face_value = db.Column(db.Float, default=0.0)
    min_spend = db.Column(db.Float, default=0.0)
    valid_from = db.Column(db.Date, nullable=False)
    valid_to = db.Column(db.Date, nullable=False)
    total_usage_limit = db.Column(db.Integer, default=1)
    used_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'coupon_code': self.coupon_code,
            'coupon_type': self.coupon_type,
            'face_value': self.face_value,
            'min_spend': self.min_spend,
            'valid_from': self.valid_from.strftime('%Y-%m-%d') if self.valid_from else '',
            'valid_to': self.valid_to.strftime('%Y-%m-%d') if self.valid_to else '',
            'total_usage_limit': self.total_usage_limit,
            'used_count': self.used_count,
            'is_active': self.is_active
        }


class CouponVerification(db.Model):
    __tablename__ = 'coupon_verifications'
    id = db.Column(db.Integer, primary_key=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    verified_by = db.Column(db.String(100), nullable=False)
    verified_at = db.Column(db.DateTime, default=datetime.now)
    verification_note = db.Column(db.String(500))

    coupon = db.relationship('Coupon', backref='verifications')

    def to_dict(self):
        return {
            'id': self.id,
            'coupon_id': self.coupon_id,
            'coupon_code': self.coupon.coupon_code if self.coupon else '',
            'order_id': self.order_id,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.strftime('%Y-%m-%d %H:%M:%S') if self.verified_at else '',
            'verification_note': self.verification_note
        }


class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(50), unique=True, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('game_sessions.id'), nullable=False)
    customer_name = db.Column(db.String(100))
    customer_phone = db.Column(db.String(20))
    player_count = db.Column(db.Integer, default=1)
    original_amount = db.Column(db.Float, default=0.0)
    coupon_discount = db.Column(db.Float, default=0.0)
    other_discount = db.Column(db.Float, default=0.0)
    actual_amount = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(20))
    order_status = db.Column(db.String(20), default='completed')
    maintained_by = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    coupon_verifications = db.relationship('CouponVerification', backref='order', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'order_no': self.order_no,
            'session_id': self.session_id,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'player_count': self.player_count,
            'original_amount': self.original_amount,
            'coupon_discount': self.coupon_discount,
            'other_discount': self.other_discount,
            'actual_amount': self.actual_amount,
            'payment_method': self.payment_method,
            'order_status': self.order_status,
            'maintained_by': self.maintained_by,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else ''
        }


class SessionSplit(db.Model):
    __tablename__ = 'session_splits'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('game_sessions.id'), nullable=False)
    total_revenue = db.Column(db.Float, default=0.0)
    total_coupon_discount = db.Column(db.Float, default=0.0)
    store_share = db.Column(db.Float, default=0.0)
    dm_fee = db.Column(db.Float, default=0.0)
    authorization_fee = db.Column(db.Float, default=0.0)
    net_profit = db.Column(db.Float, default=0.0)
    split_date = db.Column(db.Date, nullable=False)
    calculated_at = db.Column(db.DateTime, default=datetime.now)
    remark = db.Column(db.String(500))

    session = db.relationship('GameSession', backref='split')
    details = db.relationship('SplitDetail', backref='session_split', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'session_no': self.session.session_no if self.session else '',
            'total_revenue': self.total_revenue,
            'total_coupon_discount': self.total_coupon_discount,
            'store_share': self.store_share,
            'dm_fee': self.dm_fee,
            'authorization_fee': self.authorization_fee,
            'net_profit': self.net_profit,
            'split_date': self.split_date.strftime('%Y-%m-%d') if self.split_date else '',
            'remark': self.remark
        }


class SplitDetail(db.Model):
    __tablename__ = 'split_details'
    __mapper_args__ = {'confirm_deleted_rows': False}
    id = db.Column(db.Integer, primary_key=True)
    split_id = db.Column(db.Integer, db.ForeignKey('session_splits.id'), nullable=False)
    recipient_type = db.Column(db.String(20), nullable=False)
    recipient_id = db.Column(db.Integer)
    recipient_name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, default=0.0)
    split_type = db.Column(db.String(20), nullable=False)
    related_record_id = db.Column(db.Integer)
    related_record_type = db.Column(db.String(50))
    remark = db.Column(db.String(500))

    def to_dict(self):
        return {
            'id': self.id,
            'split_id': self.split_id,
            'recipient_type': self.recipient_type,
            'recipient_id': self.recipient_id,
            'recipient_name': self.recipient_name,
            'amount': self.amount,
            'split_type': self.split_type,
            'related_record_id': self.related_record_id,
            'related_record_type': self.related_record_type,
            'remark': self.remark
        }


class DataConflict(db.Model):
    __tablename__ = 'data_conflicts'
    id = db.Column(db.Integer, primary_key=True)
    conflict_type = db.Column(db.String(50), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('game_sessions.id'))
    record_a_id = db.Column(db.Integer)
    record_a_type = db.Column(db.String(50))
    record_a_maintainer = db.Column(db.String(100))
    record_a_value = db.Column(db.String(500))
    record_b_id = db.Column(db.Integer)
    record_b_type = db.Column(db.String(50))
    record_b_maintainer = db.Column(db.String(100))
    record_b_value = db.Column(db.String(500))
    field_name = db.Column(db.String(100))
    status = db.Column(db.String(20), default='pending')
    resolution_note = db.Column(db.String(500))
    detected_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'conflict_type': self.conflict_type,
            'session_id': self.session_id,
            'record_a_id': self.record_a_id,
            'record_a_type': self.record_a_type,
            'record_a_maintainer': self.record_a_maintainer,
            'record_a_value': self.record_a_value,
            'record_b_id': self.record_b_id,
            'record_b_type': self.record_b_type,
            'record_b_maintainer': self.record_b_maintainer,
            'record_b_value': self.record_b_value,
            'field_name': self.field_name,
            'status': self.status,
            'resolution_note': self.resolution_note,
            'detected_at': self.detected_at.strftime('%Y-%m-%d %H:%M:%S') if self.detected_at else ''
        }


class AnomalyRecord(db.Model):
    __tablename__ = 'anomaly_records'
    id = db.Column(db.Integer, primary_key=True)
    anomaly_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(20), default='warning')
    session_id = db.Column(db.Integer, db.ForeignKey('game_sessions.id'))
    related_record_id = db.Column(db.Integer)
    related_record_type = db.Column(db.String(50))
    description = db.Column(db.String(1000), nullable=False)
    plain_explanation = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(20), default='open')
    handled_by = db.Column(db.String(100))
    handled_at = db.Column(db.DateTime)
    handling_note = db.Column(db.String(500))
    detected_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'anomaly_type': self.anomaly_type,
            'severity': self.severity,
            'session_id': self.session_id,
            'related_record_id': self.related_record_id,
            'related_record_type': self.related_record_type,
            'description': self.description,
            'plain_explanation': self.plain_explanation,
            'status': self.status,
            'handled_by': self.handled_by,
            'handled_at': self.handled_at.strftime('%Y-%m-%d %H:%M:%S') if self.handled_at else '',
            'handling_note': self.handling_note,
            'detected_at': self.detected_at.strftime('%Y-%m-%d %H:%M:%S') if self.detected_at else ''
        }
