from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.models import (
    db,
    InspectionRecord,
    RecordStatus,
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

bp = Blueprint("inspection", __name__)


def get_inspection_by_id(record_id: int):
    return InspectionRecord.query.get(record_id)


def record_to_dict(record: InspectionRecord) -> dict:
    return {
        "id": record.id,
        "record_no": record.record_no,
        "device_name": record.device_name,
        "device_model": record.device_model,
        "device_sn": record.device_sn,
        "department": record.department,
        "status": record.status.value if record.status else None,
        "certificate_status": record.certificate_status.value if record.certificate_status else None,
        "inspection_date": record.inspection_date.isoformat() if record.inspection_date else None,
        "inspector": record.inspector,
        "inspection_result": record.inspection_result,
        "next_inspection_date": record.next_inspection_date.isoformat() if record.next_inspection_date else None,
        "issues_found": record.issues_found,
        "certificate_no": record.certificate_no,
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
def create_inspection():
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

    valid, error, inspection_date = validate_date(data.get("inspection_date"), "巡检日期")
    if not valid:
        return jsonify({"error": error, "code": 400}), 400
    if not inspection_date:
        return jsonify({"error": "巡检日期不能为空", "code": 400}), 400

    existing = InspectionRecord.query.filter_by(record_no=data["record_no"]).first()
    if existing:
        return jsonify({
            "error": "记录编号已存在，不允许重复提交",
            "existing_record": record_to_dict(existing),
            "code": 409
        }), 409

    valid, error, next_date = validate_date(data.get("next_inspection_date"), "下次巡检日期")
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    record = InspectionRecord(
        record_no=data["record_no"],
        device_name=data["device_name"],
        device_model=data.get("device_model"),
        device_sn=data.get("device_sn"),
        department=data["department"],
        status=RecordStatus.DRAFT,
        inspection_date=inspection_date,
        inspector=data.get("inspector"),
        inspection_result=data.get("inspection_result"),
        next_inspection_date=next_date,
        issues_found=data.get("issues_found"),
        certificate_no=data.get("certificate_no"),
        original_data=data.get("original_data"),
        parsed_data=data.get("parsed_data"),
        created_by=getattr(g, "user_id", 1),
        updated_by=getattr(g, "user_id", 1),
    )

    db.session.add(record)
    db.session.flush()

    create_audit_trail(
        record_type=RecordType.INSPECTION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.CREATE,
        new_status=RecordStatus.DRAFT,
        new_values=record_to_dict(record),
        change_reason=data.get("change_reason", "新建巡检记录"),
    )

    db.session.commit()

    return jsonify({
        "message": "巡检记录创建成功",
        "data": record_to_dict(record),
        "code": 201
    }), 201


@bp.route("/<int:record_id>", methods=["GET"])
def get_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

    role = getattr(g, "user_role", "admin")
    data = record_to_dict(record)
    if role != "admin" and role != "auditor":
        data = mask_sensitive_data(data, role)

    return jsonify({"data": data, "code": 200})


@bp.route("", methods=["GET"])
def list_inspections():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department = request.args.get("department")
    status = request.args.get("status")
    device_name = request.args.get("device_name")

    query = InspectionRecord.query

    if department:
        query = query.filter(InspectionRecord.department.like(f"%{department}%"))
    if status:
        try:
            query = query.filter(InspectionRecord.status == RecordStatus(status))
        except ValueError:
            pass
    if device_name:
        query = query.filter(InspectionRecord.device_name.like(f"%{device_name}%"))

    pagination = query.order_by(InspectionRecord.created_at.desc()).paginate(
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
def submit_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

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
        record_type=RecordType.INSPECTION,
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
def reject_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

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
        record_type=RecordType.INSPECTION,
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
def confirm_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

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
        record_type=RecordType.INSPECTION,
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
def withdraw_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

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
        record_type=RecordType.INSPECTION,
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
def manual_edit_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许修改", "code": 403}), 403

    data = request.get_json() or {}
    note = data.get("judgment_note")
    if not note:
        return jsonify({"error": "人工改判说明不能为空", "code": 400}), 400

    old_values = record_to_dict(record)

    allowed_fields = [
        "device_name", "device_model", "device_sn", "department",
        "inspection_result", "issues_found", "certificate_status"
    ]
    for field in allowed_fields:
        if field in data:
            setattr(record, field, data[field])

    if "certificate_status" in data:
        try:
            from app.models import CertificateStatus
            record.certificate_status = CertificateStatus(data["certificate_status"])
        except ValueError:
            return jsonify({"error": "证书状态值无效", "code": 400}), 400

    record.is_manually_edited = True
    record.manual_judgment_note = note
    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.INSPECTION,
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


@bp.route("/<int:record_id>/freeze", methods=["POST"])
def freeze_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "导出前冻结")

    frozen = FrozenRecord.query.filter_by(
        record_type=RecordType.INSPECTION,
        record_id=record_id,
        is_frozen=True
    ).first()

    if frozen:
        return jsonify({"error": "记录已处于冻结状态", "code": 400}), 400

    old_status = record.status
    record.status = RecordStatus.FROZEN

    frozen_record = FrozenRecord(
        record_type=RecordType.INSPECTION,
        record_id=record_id,
        record_no=record.record_no,
        frozen_by=getattr(g, "user_id", 1),
        freeze_reason=reason,
    )
    db.session.add(frozen_record)

    create_audit_trail(
        record_type=RecordType.INSPECTION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.FREEZE,
        old_status=old_status,
        new_status=RecordStatus.FROZEN,
        change_reason=reason,
    )

    db.session.commit()

    return jsonify({
        "message": "冻结成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>/unfreeze", methods=["POST"])
def unfreeze_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

    if record.status != RecordStatus.FROZEN:
        return jsonify({"error": "记录未处于冻结状态", "code": 400}), 400

    frozen = FrozenRecord.query.filter_by(
        record_type=RecordType.INSPECTION,
        record_id=record_id,
        is_frozen=True
    ).first()

    if frozen:
        frozen.is_frozen = False
        frozen.unfrozen_by = getattr(g, "user_id", 1)
        frozen.unfrozen_at = datetime.utcnow()

    record.status = RecordStatus.CONFIRMED

    data = request.get_json() or {}
    create_audit_trail(
        record_type=RecordType.INSPECTION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.UNFREEZE,
        old_status=RecordStatus.FROZEN,
        new_status=RecordStatus.CONFIRMED,
        change_reason=data.get("reason", "解除冻结"),
    )

    db.session.commit()

    return jsonify({
        "message": "解冻成功",
        "data": record_to_dict(record),
        "code": 200
    })


@bp.route("/<int:record_id>", methods=["PUT"])
def update_inspection(record_id: int):
    record = get_inspection_by_id(record_id)
    if not record:
        return jsonify({"error": "巡检记录不存在", "code": 404}), 404

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许修改", "code": 403}), 403

    if record.status == RecordStatus.CONFIRMED:
        return jsonify({"error": "已确认记录不允许直接修改，请使用人工改判接口", "code": 403}), 403

    data = request.get_json()
    old_values = record_to_dict(record)

    if "record_no" in data and data["record_no"] != record.record_no:
        existing = InspectionRecord.query.filter_by(record_no=data["record_no"]).first()
        if existing:
            return jsonify({"error": "记录编号已存在", "code": 409}), 409
        valid, error = validate_record_no(data["record_no"])
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.record_no = data["record_no"]

    if "device_name" in data:
        valid, error = validate_device_name(data["device_name"])
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.device_name = data["device_name"]

    if "department" in data:
        valid, error = validate_department(data["department"])
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.department = data["department"]

    if "inspection_date" in data:
        valid, error, dt = validate_date(data["inspection_date"], "巡检日期")
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.inspection_date = dt

    if "next_inspection_date" in data:
        valid, error, dt = validate_date(data["next_inspection_date"], "下次巡检日期")
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.next_inspection_date = dt

    for field in ["device_model", "device_sn", "inspector", "inspection_result", "issues_found", "certificate_no"]:
        if field in data:
            setattr(record, field, data[field])

    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.INSPECTION,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.UPDATE,
        old_status=record.status,
        new_status=record.status,
        old_values=old_values,
        new_values=record_to_dict(record),
        change_reason=data.get("change_reason", "更新记录"),
    )

    db.session.commit()

    return jsonify({
        "message": "更新成功",
        "data": record_to_dict(record),
        "code": 200
    })
