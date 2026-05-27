from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class FuelRecord(db.Model):
    __tablename__ = 'fuel_records'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50), nullable=False)
    source_file = db.Column(db.String(255))
    transaction_date = db.Column(db.DateTime, nullable=False)
    card_number = db.Column(db.String(50))
    plate_number = db.Column(db.String(20), index=True)
    driver_name = db.Column(db.String(50), index=True)
    fuel_type = db.Column(db.String(30))
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    station_name = db.Column(db.String(100))
    remark = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')  # pending, normal, anomaly, confirmed, allocated
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    anomalies = db.relationship('Anomaly', backref='fuel_record', cascade='all, delete-orphan')
    allocations = db.relationship('Allocation', backref='fuel_record', cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='fuel_record', cascade='all, delete-orphan')


class Vehicle(db.Model):
    __tablename__ = 'vehicles'

    id = db.Column(db.Integer, primary_key=True)
    plate_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    vehicle_type = db.Column(db.String(50))
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'))
    default_project_id = db.Column(db.Integer, db.ForeignKey('projects.id'))
    allowed_fuel_types = db.Column(db.String(200))  # JSON string of allowed fuel types
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Driver(db.Model):
    __tablename__ = 'drivers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    employee_id = db.Column(db.String(50), unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vehicles = db.relationship('Vehicle', backref='driver')
    confirmations = db.relationship('DriverConfirmation', backref='driver')


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    project_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    project_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    budget = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class FuelType(db.Model):
    __tablename__ = 'fuel_types'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    standard_price = db.Column(db.Float)
    is_authorized = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Anomaly(db.Model):
    __tablename__ = 'anomalies'

    id = db.Column(db.Integer, primary_key=True)
    fuel_record_id = db.Column(db.Integer, db.ForeignKey('fuel_records.id'), nullable=False)
    anomaly_type = db.Column(db.String(30), nullable=False)  # plate_error, cross_month, unauthorized_fuel, amount_abnormal, etc.
    severity = db.Column(db.String(20), default='warning')  # info, warning, error
    description = db.Column(db.Text, nullable=False)
    suggestion = db.Column(db.Text)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.String(50))
    resolved_at = db.Column(db.DateTime)
    resolution_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Allocation(db.Model):
    __tablename__ = 'allocations'

    id = db.Column(db.Integer, primary_key=True)
    fuel_record_id = db.Column(db.Integer, db.ForeignKey('fuel_records.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    allocated_amount = db.Column(db.Float, nullable=False)
    allocation_ratio = db.Column(db.Float, default=1.0)
    allocation_method = db.Column(db.String(30))  # auto, manual, driver_confirmed
    period = db.Column(db.String(7), nullable=False)  # YYYY-MM
    confirmed = db.Column(db.Boolean, default=False)
    confirmed_at = db.Column(db.DateTime)
    confirmed_by = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    project = db.relationship('Project')


class DriverConfirmation(db.Model):
    __tablename__ = 'driver_confirmations'

    id = db.Column(db.Integer, primary_key=True)
    fuel_record_id = db.Column(db.Integer, db.ForeignKey('fuel_records.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, disputed
    driver_remark = db.Column(db.Text)
    corrected_plate = db.Column(db.String(20))
    corrected_project_id = db.Column(db.Integer, db.ForeignKey('projects.id'))
    confirmed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    fuel_record = db.relationship('FuelRecord')


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    fuel_record_id = db.Column(db.Integer, db.ForeignKey('fuel_records.id'))
    action = db.Column(db.String(50), nullable=False)
    field_name = db.Column(db.String(50))
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    operator = db.Column(db.String(50))
    operator_role = db.Column(db.String(20))
    remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
