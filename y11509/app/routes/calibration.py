from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g, current_app
from app.models import (
    db,
    CalibrationCertificate,
    RecordStatus,
    CertificateStatus,
    RecordType,
    ActionType,
    FrozenRecord,
)
from app.utils.audit import create_audit_trail
from app.utils.validators import (
    validate_record_no,
    validate_device_name,
    validate_department,
    validate_date,
    mask_sensitive_data,
    mask_record_list,
)

bp = Blueprint("calibration", __name__)


def get_calibration_by_id(record_id: int):
    return CalibrationCertificate.query.get(record_id)


def record_to_dict(record: CalibrationCertificate) -> dict:
    return {
        "id": record.id,
        "record_no": record.record_no,
        "device_name": record.device_name,
        "device_model": record.device_model,
        "device_sn": record.device_sn,
        "department": record.department,
        "status": record.status.value if record.status else None,
        "certificate_status": record.certificate_status.value if record.certificate_status else None,
        "certificate_no": record.certificate_no,
        "calibration_date": record.calibration_date.isoformat() if record.calibration_date else None,
        "valid_until": record.valid_until.isoformat() if record.valid_until else None,
        "calibration_agency": record.calibration_agency,
        "calibration_result": record.calibration_result,
        "calibration_items": record.calibration_items,
        "original_row_number": record.original_row_number,
        "import_source_id": record.import_source_id,
        "original_data": record.original_data,
        "parsed_data": record.parsed_data,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "rejection_reason": record.rejection_reason,
        "manual_judgment_note": record.manual_judgment_note,
        "is_manually_edited": record.is_manually_edited,
        "days_until_expiry": (record.valid_until - datetime.utcnow()).days if record.valid_until else None,
    }


def update_certificate_status(record: CalibrationCertificate):
    if not record.valid_until:
        return
    now = datetime.utcnow()
    warning_days = current_app.config.get("CERTIFICATE_WARNING_DAYS", 30)
    days_until = (record.valid_until - now).days
    if record.valid_until < now:
        record.certificate_status = CertificateStatus.EXPIRED
    elif days_until <= warning_days:
        record.certificate_status = CertificateStatus.ABOUT_TO_EXPIRE
    else:
        record.certificate_status = CertificateStatus.VALID


@bp.route("", methods=["POST"])
def create_calibration():
    data = request.get_json()

    valid, error = validate_record_no(data.get("record_no", ""))
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    valid, error = validate_device_name(data.get("device_name", ""))
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    valid, error = validate_department(data.get("department", ""))
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    if not data.get("certificate_no"):
        return jsonify({"error": "证书编号不能为空", "code": 400}), 400

    existing = CalibrationCertificate.query.filter_by(record_no=data["record_no"]).first()
    if existing:
        return jsonify({
            "error": "记录编号已存在，不允许重复提交",
            "existing_record": record_to_dict(existing),
            "code": 409
        }), 409

    valid, error, cal_date = validate_date(data.get("calibration_date"), "校准日期")
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    valid, error, valid_date = validate_date(data.get("valid_until"), "有效期至")
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    record = CalibrationCertificate(
        record_no=data["record_no"],
        device_name=data["device_name"],
        device_model=data.get("device_model"),
        device_sn=data.get("device_sn"),
        department=data["department"],
        status=RecordStatus.DRAFT,
        certificate_no=data["certificate_no"],
        calibration_date=cal_date,
        valid_until=valid_date,
        calibration_agency=data.get("calibration_agency"),
        calibration_result=data.get("calibration_result"),
        calibration_items=data.get("calibration_items"),
        original_data=data.get("original_data"),
        parsed_data=data.get("parsed_data"),
        created_by=getattr(g, "user_id", 1),
        updated_by=getattr(g, "user_id", 1),
    )

    update_certificate_status(record)

    db.session.add(record)
    db.session.flush()

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.CREATE,
        new_status=RecordStatus.DRAFT,
        new_values=record_to_dict(record),
        change_reason=data.get("change_reason", "新建校准证书"),
    )

    db.session.commit()

    return jsonify({
        "message": "校准证书创建成功",
        "data": record_to_dict(record),
        "code": 201
    }), 201


@bp.route("/<int:record_id>", methods=["GET"])
def get_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    role = getattr(g, "user_role", "admin")
    data = record_to_dict(record)
    if role != "admin" and role != "auditor":
        data = mask_sensitive_data(data, role)

    return jsonify({"data": data, "code": 200})


@bp.route("", methods=["GET"])
def list_calibrations():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department = request.args.get("department")
    status = request.args.get("status")
    cert_status = request.args.get("certificate_status")
    expiring_soon = request.args.get("expiring_soon", "false").lower() == "true"

    query = CalibrationCertificate.query

    if department:
        query = query.filter(CalibrationCertificate.department.like(f"%{department}%"))
    if status:
        try:
            query = query.filter(CalibrationCertificate.status == RecordStatus(status))
        except ValueError:
            pass
    if cert_status:
        try:
            query = query.filter(CalibrationCertificate.certificate_status == CertificateStatus(cert_status))
        except ValueError:
            pass
    if expiring_soon:
        warning_date = datetime.utcnow() + timedelta(days=current_app.config.get("CERTIFICATE_WARNING_DAYS", 30))
        query = query.filter(
            CalibrationCertificate.valid_until <= warning_date,
            CalibrationCertificate.valid_until >= datetime.utcnow()
        )

    pagination = query.order_by(CalibrationCertificate.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    role = getattr(g, "user_role", "admin")
    records = [record_to_dict(r) for r in pagination.items]
    if role != "admin" and role != "auditor":
        records = mask_record_list(records, role)

    return jsonify({
        "data": records,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
        "code": 200
    })


@bp.route("/<int:record_id>/submit", methods=["POST"])
def submit_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许提交", "code": 403}), 403

    allowed_statuses = [RecordStatus.DRAFT, RecordStatus.REJECTED, RecordStatus.WITHDRAWN]
    if record.status not in allowed_statuses:
        return jsonify({
            "error": f"当前状态{record.status.value}不允许提交",
            "current_status": record.status.value,
            "code": 400
        }), 400

    data = request.get_json() or {}
    old_status = record.status
    record.status = RecordStatus.SUBMITTED
    record.updated_by = getattr(g, "user_id", 1)

    update_certificate_status(record)

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.SUBMIT if old_status == RecordStatus.DRAFT else ActionType.RE_SUBMIT,
        old_status=old_status,
        new_status=RecordStatus.SUBMITTED,
        change_reason=data.get("reason", "提交审核"),
    )

    db.session.commit()

    return jsonify({
        "message": "提交成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>/reject", methods=["POST"])
def reject_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    if record.status != RecordStatus.SUBMITTED:
        return jsonify({
            "error": f"当前状态{record.status.value}不允许驳回",
            "current_status": record.status.value,
            "code": 400
        }), 400

    data = request.get_json() or {}
    reason = data.get("reason")
    if not reason:
        return jsonify({"error": "驳回原因不能为空", "code": 400}), 400

    old_status = record.status
    record.status = RecordStatus.REJECTED
    record.rejection_reason = reason
    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.REJECT,
        old_status=old_status,
        new_status=RecordStatus.REJECTED,
        change_reason=reason,
    )

    db.session.commit()

    return jsonify({
        "message": "驳回成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>/confirm", methods=["POST"])
def confirm_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    if record.status != RecordStatus.SUBMITTED:
        return jsonify({
            "error": f"当前状态{record.status.value}不允许确认",
            "current_status": record.status.value,
            "code": 400
        }), 400

    data = request.get_json() or {}
    old_status = record.status
    record.status = RecordStatus.CONFIRMED
    record.updated_by = getattr(g, "user_id", 1)

    update_certificate_status(record)

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.CONFIRM,
        old_status=old_status,
        new_status=RecordStatus.CONFIRMED,
        change_reason=data.get("reason", "二次确认通过"),
    )

    db.session.commit()

    return jsonify({
        "message": "确认成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>/withdraw", methods=["POST"])
def withdraw_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    if record.status not in [RecordStatus.SUBMITTED, RecordStatus.DRAFT]:
        return jsonify({
            "error": f"当前状态{record.status.value}不允许撤回",
            "current_status": record.status.value,
            "code": 400
        }), 400

    data = request.get_json() or {}
    old_status = record.status
    record.status = RecordStatus.WITHDRAWN
    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.WITHDRAW,
        old_status=old_status,
        new_status=RecordStatus.WITHDRAWN,
        change_reason=data.get("reason", "撤回记录"),
    )

    db.session.commit()

    return jsonify({
        "message": "撤回成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>/manual-edit", methods=["POST"])
def manual_edit_calibration(record_id: int):
    record = get_calibration_by_id(record_id)
    if not record:
        return jsonify({"error": "校准证书不存在", "code": 404}), 404

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许修改", "code": 403}), 403

    data = request.get_json() or {}
    note = data.get("judgment_note")
    if not note:
        return jsonify({"error": "人工改判说明不能为空", "code": 400}), 400

    old_values = record_to_dict(record)

    allowed_fields = [
        "device_name", "device_model", "device_sn", "department",
        "calibration_result", "certificate_status"
    ]
    for field in allowed_fields:
        if field in data:
            setattr(record, field, data[field])

    if "certificate_status" in data:
        try:
            record.certificate_status = CertificateStatus(data["certificate_status"])
        except ValueError:
            return jsonify({"error": "证书状态值无效", "code": 400}), 400

    record.is_manually_edited = True
    record.manual_judgment_note = note
    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.CALIBRATION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.MANUAL_EDIT,
        old_status=record.status,
        new_status=record.status,
        old_values=old_values,
        new_values=record_to_dict(record),
        change_reason=note,
    )

    db.session.commit()

    return jsonify({
        "message": "人工改判成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/expired", methods=["GET"])
def list_expired_certificates():
    records = CalibrationCertificate.query.filter_by(
        certificate_status=CertificateStatus.EXPIRED
    ).order_by(CalibrationCertificate.valid_until.asc()).all()

    role = getattr(g, "user_role", "admin")
    result = [record_to_dict(r) for r in records]
    if role != "admin" and role != "auditor":
        result = mask_record_list(result, role)

    return jsonify({
        "data": result,
        "total": len(result),
        "code": 200
    })
