from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.models import (
    db,
    SupplementaryRecord,
    RecordStatus,
    RecordType,
    ActionType,
)
from app.utils.audit import create_audit_trail
from app.utils.validators import (
    validate_record_no,
    validate_device_name,
    validate_department,
    mask_sensitive_data,
    mask_record_list,
)

bp = Blueprint("supplementary", __name__)


def get_supplementary_by_id(record_id: int):
    return SupplementaryRecord.query.get(record_id)


def record_to_dict(record: SupplementaryRecord) -> dict:
    return {
        "id": record.id,
        "record_no": record.record_no,
        "device_name": record.device_name,
        "device_model": record.device_model,
        "device_sn": record.device_sn,
        "department": record.department,
        "status": record.status.value if record.status else None,
        "certificate_status": record.certificate_status.value if record.certificate_status else None,
        "supplementary_reason": record.supplementary_reason,
        "supplementary_date": record.supplementary_date.isoformat() if record.supplementary_date else None,
        "supplementary_type": record.supplementary_type,
        "original_record_no": record.original_record_no,
        "supplementary_note": record.supplementary_note,
        "original_row_number": record.original_row_number,
        "import_source_id": record.import_source_id,
        "original_data": record.original_data,
        "parsed_data": record.parsed_data,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        "rejection_reason": record.rejection_reason,
        "manual_judgment_note": record.manual_judgment_note,
        "is_manually_edited": record.is_manually_edited,
    }


@bp.route("", methods=["POST"])
def create_supplementary():
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

    if not data.get("supplementary_reason"):
        return jsonify({"error": "补录原因不能为空", "code": 400}), 400

    existing = SupplementaryRecord.query.filter_by(record_no=data["record_no"]).first()
    if existing:
        return jsonify({
            "error": "记录编号已存在，不允许重复提交",
            "existing_record": record_to_dict(existing),
            "code": 409
        }), 409

    record = SupplementaryRecord(
        record_no=data["record_no"],
        device_name=data["device_name"],
        device_model=data.get("device_model"),
        device_sn=data.get("device_sn"),
        department=data["department"],
        status=RecordStatus.DRAFT,
        supplementary_reason=data["supplementary_reason"],
        supplementary_type=data.get("supplementary_type"),
        original_record_no=data.get("original_record_no"),
        supplementary_note=data.get("supplementary_note"),
        original_data=data.get("original_data"),
        parsed_data=data.get("parsed_data"),
        created_by=getattr(g, "user_id", 1),
        updated_by=getattr(g, "user_id", 1),
    )

    db.session.add(record)
    db.session.flush()

    create_audit_trail(
        record_type=RecordType.SUPPLEMENTARY,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.CREATE,
        new_status=RecordStatus.DRAFT,
        new_values=record_to_dict(record),
        change_reason=data.get("change_reason", "新建临时补录单"),
    )

    db.session.commit()

    return jsonify({
        "message": "临时补录单创建成功",
        "data": record_to_dict(record),
        "code": 201
    }), 201


@bp.route("/<int:record_id>", methods=["GET"])
def get_supplementary(record_id: int):
    record = get_supplementary_by_id(record_id)
    if not record:
        return jsonify({"error": "临时补录单不存在", "code": 404}), 404

    role = getattr(g, "user_role", "admin")
    data = record_to_dict(record)
    if role != "admin" and role != "auditor":
        data = mask_sensitive_data(data, role)

    return jsonify({"data": data, "code": 200})


@bp.route("", methods=["GET"])
def list_supplementary():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department = request.args.get("department")
    status = request.args.get("status")
    supplementary_type = request.args.get("supplementary_type")

    query = SupplementaryRecord.query

    if department:
        query = query.filter(SupplementaryRecord.department.like(f"%{department}%"))
    if status:
        try:
            query = query.filter(SupplementaryRecord.status == RecordStatus(status))
        except ValueError:
            pass
    if supplementary_type:
        query = query.filter(SupplementaryRecord.supplementary_type.like(f"%{supplementary_type}%"))

    pagination = query.order_by(SupplementaryRecord.created_at.desc()).paginate(
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
def submit_supplementary(record_id: int):
    record = get_supplementary_by_id(record_id)
    if not record:
        return jsonify({"error": "临时补录单不存在", "code": 404}), 404

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

    create_audit_trail(
        record_type=RecordType.SUPPLEMENTARY,
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
def reject_supplementary(record_id: int):
    record = get_supplementary_by_id(record_id)
    if not record:
        return jsonify({"error": "临时补录单不存在", "code": 404}), 404

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
        record_type=RecordType.SUPPLEMENTARY,
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
def confirm_supplementary(record_id: int):
    record = get_supplementary_by_id(record_id)
    if not record:
        return jsonify({"error": "临时补录单不存在", "code": 404}), 404

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

    create_audit_trail(
        record_type=RecordType.SUPPLEMENTARY,
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
def withdraw_supplementary(record_id: int):
    record = get_supplementary_by_id(record_id)
    if not record:
        return jsonify({"error": "临时补录单不存在", "code": 404}), 404

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
        record_type=RecordType.SUPPLEMENTARY,
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
