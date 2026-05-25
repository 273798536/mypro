from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.models import (
    db,
    RepairQuotation,
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
from app.utils.permissions import (
    can_edit_record,
    can_freeze,
    can_manual_edit,
    can_submit,
    can_approve,
    apply_department_filter,
    can_view_department,
)

bp = Blueprint("repair", __name__)


def get_repair_by_id(record_id: int):
    return RepairQuotation.query.get(record_id)


def record_to_dict(record: RepairQuotation) -> dict:
    return {
        "id": record.id,
        "record_no": record.record_no,
        "device_name": record.device_name,
        "device_model": record.device_model,
        "device_sn": record.device_sn,
        "department": record.department,
        "status": record.status.value if record.status else None,
        "certificate_status": record.certificate_status.value if record.certificate_status else None,
        "quotation_no": record.quotation_no,
        "fault_description": record.fault_description,
        "repair_date": record.repair_date.isoformat() if record.repair_date else None,
        "repair_vendor": record.repair_vendor,
        "quotation_amount": float(record.quotation_amount) if record.quotation_amount else None,
        "repair_status": record.repair_status,
        "warranty_period": record.warranty_period,
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
def create_repair():
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

    if not data.get("quotation_no"):
        return jsonify({"error": "报价单号不能为空", "code": 400}), 400

    existing = RepairQuotation.query.filter_by(record_no=data["record_no"]).first()
    if existing:
        return jsonify({
            "error": "记录编号已存在，不允许重复提交",
            "existing_record": record_to_dict(existing),
            "code": 409
        }), 409

    valid, error, repair_date = validate_date(data.get("repair_date"), "维修日期")
    if not valid:
        return jsonify({"error": error, "code": 400}), 400

    record = RepairQuotation(
        record_no=data["record_no"],
        device_name=data["device_name"],
        device_model=data.get("device_model"),
        device_sn=data.get("device_sn"),
        department=data["department"],
        status=RecordStatus.DRAFT,
        quotation_no=data["quotation_no"],
        fault_description=data.get("fault_description"),
        repair_date=repair_date,
        repair_vendor=data.get("repair_vendor"),
        quotation_amount=data.get("quotation_amount"),
        repair_status=data.get("repair_status"),
        warranty_period=data.get("warranty_period"),
        original_data=data.get("original_data"),
        parsed_data=data.get("parsed_data"),
        created_by=getattr(g, "user_id", 1),
        updated_by=getattr(g, "user_id", 1),
    )

    db.session.add(record)
    db.session.flush()

    create_audit_trail(
        record_type=RecordType.REPAIR,
        record_id=record.id,
        record_no=record.record_no,
        action=ActionType.CREATE,
        new_status=RecordStatus.DRAFT,
        new_values=record_to_dict(record),
        change_reason=data.get("change_reason", "新建维修报价"),
    )

    db.session.commit()

    return jsonify({
        "message": "维修报价创建成功",
        "data": record_to_dict(record),
        "code": 201
    }), 201


@bp.route("/<int:record_id>", methods=["GET"])
def get_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_view_department(record.department):
        return jsonify({"error": "权限不足，无法查看该部门的记录", "code": 403}), 403

    role = getattr(g, "user_role", "admin")
    data = record_to_dict(record)
    if role != "admin" and role != "auditor":
        data = mask_sensitive_data(data, role)

    return jsonify({"data": data, "code": 200})


@bp.route("", methods=["GET"])
def list_repairs():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department = request.args.get("department")
    status = request.args.get("status")
    repair_status = request.args.get("repair_status")

    query = RepairQuotation.query
    query = apply_department_filter(query, RepairQuotation)

    if department:
        query = query.filter(RepairQuotation.department.like(f"%{department}%"))
    if status:
        try:
            query = query.filter(RepairQuotation.status == RecordStatus(status))
        except ValueError:
            pass
    if repair_status:
        query = query.filter(RepairQuotation.repair_status.like(f"%{repair_status}%"))

    pagination = query.order_by(RepairQuotation.created_at.desc()).paginate(
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
def submit_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_edit_record(record):
        return jsonify({"error": "权限不足，无法编辑该记录", "code": 403}), 403

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
        record_type=RecordType.REPAIR,
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
def reject_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_approve(record):
        return jsonify({"error": "权限不足，无法审批该记录", "code": 403}), 403

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
        record_type=RecordType.REPAIR,
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
def confirm_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_approve(record):
        return jsonify({"error": "权限不足，无法审批该记录", "code": 403}), 403

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
        record_type=RecordType.REPAIR,
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
def withdraw_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_edit_record(record):
        return jsonify({"error": "权限不足，无法编辑该记录", "code": 403}), 403

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
        record_type=RecordType.REPAIR,
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
def manual_edit_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_manual_edit():
        return jsonify({"error": "权限不足，无法进行人工改判", "code": 403}), 403

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许修改", "code": 403}), 403

    data = request.get_json() or {}
    note = data.get("judgment_note")
    if not note:
        return jsonify({"error": "人工改判说明不能为空", "code": 400}), 400

    old_values = record_to_dict(record)

    allowed_fields = [
        "device_name", "device_model", "device_sn", "department",
        "fault_description", "repair_status", "certificate_status"
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
        record_type=RecordType.REPAIR,
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
def freeze_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_freeze():
        return jsonify({"error": "权限不足，无法冻结记录", "code": 403}), 403

    data = request.get_json() or {}
    reason = data.get("reason", "导出前冻结")

    frozen = FrozenRecord.query.filter_by(
        record_type=RecordType.REPAIR,
        record_id=record_id,
        is_frozen=True
    ).first()

    if frozen:
        return jsonify({"error": "记录已处于冻结状态", "code": 400}), 400

    old_status = record.status
    record.status = RecordStatus.FROZEN

    frozen_record = FrozenRecord(
        record_type=RecordType.REPAIR,
        record_id=record_id,
        record_no=record.record_no,
        frozen_by=getattr(g, "user_id", 1),
        freeze_reason=reason,
    )
    db.session.add(frozen_record)

    create_audit_trail(
        record_type=RecordType.REPAIR,
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
def unfreeze_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_freeze():
        return jsonify({"error": "权限不足，无法解冻记录", "code": 403}), 403

    if record.status != RecordStatus.FROZEN:
        return jsonify({"error": "记录未处于冻结状态", "code": 400}), 400

    frozen = FrozenRecord.query.filter_by(
        record_type=RecordType.REPAIR,
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
        record_type=RecordType.REPAIR,
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
def update_repair(record_id: int):
    record = get_repair_by_id(record_id)
    if not record:
        return jsonify({"error": "维修报价不存在", "code": 404}), 404

    if not can_edit_record(record):
        return jsonify({"error": "权限不足，无法编辑该记录", "code": 403}), 403

    if record.status == RecordStatus.FROZEN:
        return jsonify({"error": "记录已冻结，不允许修改", "code": 403}), 403

    if record.status == RecordStatus.CONFIRMED:
        return jsonify({"error": "已确认记录不允许直接修改，请使用人工改判接口", "code": 403}), 403

    data = request.get_json()
    old_values = record_to_dict(record)

    if "record_no" in data and data["record_no"] != record.record_no:
        existing = RepairQuotation.query.filter_by(record_no=data["record_no"]).first()
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

    if "repair_date" in data:
        valid, error, dt = validate_date(data["repair_date"], "维修日期")
        if not valid:
            return jsonify({"error": error, "code": 400}), 400
        record.repair_date = dt

    for field in ["device_model", "device_sn", "quotation_no", "fault_description", "repair_vendor", "quotation_amount", "repair_status", "warranty_period"]:
        if field in data:
            setattr(record, field, data[field])

    record.updated_by = getattr(g, "user_id", 1)

    create_audit_trail(
        record_type=RecordType.REPAIR,
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
