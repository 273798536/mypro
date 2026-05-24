from datetime import datetime
from enum import Enum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, Text

db = SQLAlchemy()


class RecordStatus(Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"
    FROZEN = "frozen"
    WITHDRAWN = "withdrawn"
    PARTIAL_FAILED = "partial_failed"


class CertificateStatus(Enum):
    VALID = "valid"
    EXPIRED = "expired"
    DEACTIVATED = "deactivated"
    ABOUT_TO_EXPIRE = "about_to_expire"


class RecordType(Enum):
    INSPECTION = "inspection"
    CALIBRATION = "calibration"
    REPAIR = "repair"
    SUPPLEMENTARY = "supplementary"


class ActionType(Enum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    REJECT = "reject"
    CONFIRM = "confirm"
    WITHDRAW = "withdraw"
    RE_SUBMIT = "resubmit"
    MANUAL_EDIT = "manual_edit"
    FREEZE = "freeze"
    UNFREEZE = "unfreeze"
    EXPORT = "export"
    IMPORT = "import"


class Role(Enum):
    ADMIN = "admin"
    NURSE = "nurse"
    TECHNICIAN = "technician"
    AUDITOR = "auditor"
    DEPARTMENT_HEAD = "department_head"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    real_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.Enum(Role), nullable=False)
    department = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    audit_trails = db.relationship("AuditTrail", back_populates="operator", lazy=True)


class ImportSource(db.Model):
    __tablename__ = "import_sources"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(64), nullable=False)
    record_type = db.Column(db.Enum(RecordType), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_rows = db.Column(db.Integer, default=0)
    success_rows = db.Column(db.Integer, default=0)
    failed_rows = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default="processing")


class BaseRecord(db.Model):
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    record_no = db.Column(db.String(100), unique=True, nullable=False)
    device_name = db.Column(db.String(200), nullable=False)
    device_model = db.Column(db.String(100))
    device_sn = db.Column(db.String(100))
    department = db.Column(db.String(100), nullable=False)
    status = db.Column(db.Enum(RecordStatus), default=RecordStatus.DRAFT)
    certificate_status = db.Column(db.Enum(CertificateStatus))

    original_row_number = db.Column(db.Integer)
    import_source_id = db.Column(db.Integer, db.ForeignKey("import_sources.id"))
    original_data = db.Column(JSON)
    parsed_data = db.Column(JSON)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    updated_by = db.Column(db.Integer, db.ForeignKey("users.id"))

    rejection_reason = db.Column(Text)
    manual_judgment_note = db.Column(Text)
    is_manually_edited = db.Column(db.Boolean, default=False)


class InspectionRecord(BaseRecord):
    __tablename__ = "inspection_records"

    inspection_date = db.Column(db.DateTime, nullable=False)
    inspector = db.Column(db.String(100))
    inspection_result = db.Column(db.String(50))
    next_inspection_date = db.Column(db.DateTime)
    issues_found = db.Column(Text)
    certificate_no = db.Column(db.String(100))


class CalibrationCertificate(BaseRecord):
    __tablename__ = "calibration_certificates"

    certificate_no = db.Column(db.String(100), nullable=False)
    calibration_date = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    calibration_agency = db.Column(db.String(200))
    calibration_result = db.Column(db.String(50))
    calibration_items = db.Column(JSON)


class RepairQuotation(BaseRecord):
    __tablename__ = "repair_quotations"

    quotation_no = db.Column(db.String(100), nullable=False)
    fault_description = db.Column(Text)
    repair_date = db.Column(db.DateTime)
    repair_vendor = db.Column(db.String(200))
    quotation_amount = db.Column(db.Numeric(10, 2))
    repair_status = db.Column(db.String(50))
    warranty_period = db.Column(db.String(50))


class SupplementaryRecord(BaseRecord):
    __tablename__ = "supplementary_records"

    supplementary_reason = db.Column(Text, nullable=False)
    supplementary_date = db.Column(db.DateTime, default=datetime.utcnow)
    supplementary_type = db.Column(db.String(50))
    original_record_no = db.Column(db.String(100))
    supplementary_note = db.Column(Text)


class AuditTrail(db.Model):
    __tablename__ = "audit_trails"

    id = db.Column(db.Integer, primary_key=True)
    record_type = db.Column(db.Enum(RecordType), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    record_no = db.Column(db.String(100))
    action = db.Column(db.Enum(ActionType), nullable=False)
    operator_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    operator_name = db.Column(db.String(100))
    operated_at = db.Column(db.DateTime, default=datetime.utcnow)

    old_status = db.Column(db.Enum(RecordStatus))
    new_status = db.Column(db.Enum(RecordStatus))
    old_values = db.Column(JSON)
    new_values = db.Column(JSON)
    change_reason = db.Column(Text)

    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))

    operator = db.relationship("User", back_populates="audit_trails")


class ExportLog(db.Model):
    __tablename__ = "export_logs"

    id = db.Column(db.Integer, primary_key=True)
    export_type = db.Column(db.String(50), nullable=False)
    exported_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    exported_at = db.Column(db.DateTime, default=datetime.utcnow)
    record_count = db.Column(db.Integer, default=0)
    is_masked = db.Column(db.Boolean, default=True)
    filters_applied = db.Column(JSON)
    filename = db.Column(db.String(255))
    file_hash = db.Column(db.String(64))


class FrozenRecord(db.Model):
    __tablename__ = "frozen_records"

    id = db.Column(db.Integer, primary_key=True)
    record_type = db.Column(db.Enum(RecordType), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    record_no = db.Column(db.String(100))
    frozen_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    frozen_at = db.Column(db.DateTime, default=datetime.utcnow)
    freeze_reason = db.Column(Text)
    is_frozen = db.Column(db.Boolean, default=True)
    unfrozen_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    unfrozen_at = db.Column(db.DateTime)
