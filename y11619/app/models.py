from datetime import datetime
from app import db

class DataSource(db.Model):
    __tablename__ = 'data_sources'
    
    id = db.Column(db.Integer, primary_key=True)
    source_name = db.Column(db.String(100), nullable=False)
    source_type = db.Column(db.String(50), nullable=False)
    file_name = db.Column(db.String(255))
    import_date = db.Column(db.DateTime, default=datetime.now)
    record_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    points_ledgers = db.relationship('PointsLedger', backref='source', lazy=True)
    point_transactions = db.relationship('PointTransaction', backref='source', lazy=True)
    refunds = db.relationship('OrderRefund', backref='source', lazy=True)
    coupons = db.relationship('Coupon', backref='source', lazy=True)

class PointsLedger(db.Model):
    __tablename__ = 'points_ledger'
    
    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.String(64), nullable=False, index=True)
    member_name = db.Column(db.String(100))
    total_points = db.Column(db.Integer, nullable=False, default=0)
    available_points = db.Column(db.Integer, nullable=False, default=0)
    frozen_points = db.Column(db.Integer, nullable=False, default=0)
    expired_points = db.Column(db.Integer, nullable=False, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'))
    source_line = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    transactions = db.relationship('PointTransaction', backref='ledger', lazy=True)

class PointTransaction(db.Model):
    __tablename__ = 'point_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    ledger_id = db.Column(db.Integer, db.ForeignKey('points_ledger.id'), nullable=False)
    member_id = db.Column(db.String(64), nullable=False, index=True)
    transaction_type = db.Column(db.String(32), nullable=False)
    points = db.Column(db.Integer, nullable=False)
    balance_after = db.Column(db.Integer)
    expire_date = db.Column(db.DateTime)
    order_no = db.Column(db.String(64))
    coupon_code = db.Column(db.String(64))
    remark = db.Column(db.String(500))
    is_refund = db.Column(db.Boolean, default=False)
    refund_from_id = db.Column(db.Integer)
    transaction_time = db.Column(db.DateTime, default=datetime.now)
    source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'))
    source_line = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ExpiryRule(db.Model):
    __tablename__ = 'expiry_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_name = db.Column(db.String(100), nullable=False)
    rule_type = db.Column(db.String(32), nullable=False)
    effective_date = db.Column(db.DateTime, nullable=False)
    expire_date = db.Column(db.DateTime)
    validity_days = db.Column(db.Integer)
    expire_month = db.Column(db.String(7))
    description = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class OrderRefund(db.Model):
    __tablename__ = 'order_refunds'
    
    id = db.Column(db.Integer, primary_key=True)
    order_no = db.Column(db.String(64), nullable=False, index=True)
    member_id = db.Column(db.String(64), nullable=False)
    refund_time = db.Column(db.DateTime, nullable=False)
    original_points = db.Column(db.Integer, nullable=False)
    return_points = db.Column(db.Integer, nullable=False)
    return_status = db.Column(db.String(32), default='pending')
    points_returned = db.Column(db.Boolean, default=False)
    is_cross_month = db.Column(db.Boolean, default=False)
    remark = db.Column(db.String(500))
    source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'))
    source_line = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

class Coupon(db.Model):
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    coupon_code = db.Column(db.String(64), nullable=False, unique=True)
    coupon_name = db.Column(db.String(200), nullable=False)
    coupon_type = db.Column(db.String(32), nullable=False)
    points_cost = db.Column(db.Integer, nullable=False)
    face_value = db.Column(db.Float, nullable=False)
    total_quantity = db.Column(db.Integer, nullable=False)
    used_quantity = db.Column(db.Integer, default=0)
    expire_date = db.Column(db.DateTime, nullable=False)
    verify_fail_count = db.Column(db.Integer, default=0)
    last_verify_fail_time = db.Column(db.DateTime)
    verify_fail_reason = db.Column(db.String(500))
    source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'))
    source_line = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

class CouponRedemption(db.Model):
    __tablename__ = 'coupon_redemptions'
    
    id = db.Column(db.Integer, primary_key=True)
    coupon_code = db.Column(db.String(64), nullable=False)
    member_id = db.Column(db.String(64), nullable=False)
    points_used = db.Column(db.Integer, nullable=False)
    redeem_time = db.Column(db.DateTime, default=datetime.now)
    verify_status = db.Column(db.String(32), default='pending')
    verify_time = db.Column(db.DateTime)
    verify_fail_reason = db.Column(db.String(500))
    is_rollback = db.Column(db.Boolean, default=False)
    rollback_reason = db.Column(db.String(500))
    source_id = db.Column(db.Integer, db.ForeignKey('data_sources.id'))
    source_line = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ActivityPlan(db.Model):
    __tablename__ = 'activity_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_name = db.Column(db.String(200), nullable=False)
    activity_type = db.Column(db.String(32), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    expected_points_issued = db.Column(db.Integer, default=0)
    expected_redemption_rate = db.Column(db.Float, default=0.3)
    expected_coupon_cost = db.Column(db.Float, default=0)
    status = db.Column(db.String(32), default='planned')
    remark = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.now)

class LiabilityForecast(db.Model):
    __tablename__ = 'liability_forecasts'
    
    id = db.Column(db.Integer, primary_key=True)
    forecast_name = db.Column(db.String(200), nullable=False)
    forecast_date = db.Column(db.DateTime, default=datetime.now)
    forecast_period = db.Column(db.String(32), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    
    total_points_balance = db.Column(db.Integer, default=0)
    expected_expired_points = db.Column(db.Integer, default=0)
    cross_month_expired_points = db.Column(db.Integer, default=0)
    expected_refund_points = db.Column(db.Integer, default=0)
    expected_redemption_points = db.Column(db.Integer, default=0)
    expected_coupon_cost = db.Column(db.Float, default=0)
    total_estimated_liability = db.Column(db.Float, default=0)
    
    points_per_yuan = db.Column(db.Float, default=0.01)
    status = db.Column(db.String(32), default='draft')
    status_updated_at = db.Column(db.DateTime, default=datetime.now)
    
    created_by = db.Column(db.String(100))
    remark = db.Column(db.String(1000))
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    warnings = db.relationship('ForecastWarning', backref='forecast', lazy=True, cascade='all, delete-orphan')
    corrections = db.relationship('ForecastCorrection', backref='forecast', lazy=True, cascade='all, delete-orphan')
    curve_data = db.relationship('ForecastCurve', backref='forecast', lazy=True, cascade='all, delete-orphan')

class ForecastWarning(db.Model):
    __tablename__ = 'forecast_warnings'
    
    id = db.Column(db.Integer, primary_key=True)
    forecast_id = db.Column(db.Integer, db.ForeignKey('liability_forecasts.id'), nullable=False)
    warning_type = db.Column(db.String(32), nullable=False)
    warning_level = db.Column(db.String(16), default='warning')
    message = db.Column(db.String(1000), nullable=False)
    source_reference = db.Column(db.String(200))
    related_data = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ForecastCorrection(db.Model):
    __tablename__ = 'forecast_corrections'
    
    id = db.Column(db.Integer, primary_key=True)
    forecast_id = db.Column(db.Integer, db.ForeignKey('liability_forecasts.id'), nullable=False)
    field_name = db.Column(db.String(100), nullable=False)
    old_value = db.Column(db.String(500))
    new_value = db.Column(db.String(500))
    correction_reason = db.Column(db.String(1000), nullable=False)
    corrected_by = db.Column(db.String(100))
    source_reference = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.now)

class ForecastCurve(db.Model):
    __tablename__ = 'forecast_curves'
    
    id = db.Column(db.Integer, primary_key=True)
    forecast_id = db.Column(db.Integer, db.ForeignKey('liability_forecasts.id'), nullable=False)
    date_point = db.Column(db.DateTime, nullable=False)
    cumulative_liability = db.Column(db.Float, default=0)
    expired_points = db.Column(db.Integer, default=0)
    redemption_points = db.Column(db.Integer, default=0)
    refund_points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)
