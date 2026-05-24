from flask import Blueprint, request, jsonify, g
from app.models import db, AuditTrail, RecordType, ActionType
from app.utils.validators import mask_sensitive_data

bp = Blueprint("audit", __name__)


def audit_to_dict(audit: AuditTrail) -> dict:
    return {
        "id": audit.id,
        "record_type": audit.record_type.value if audit.record_type else None,
        "record_id": audit.record_id,
        "record_no": audit.record_no,
        "action": audit.action.value if audit.action else None,
        "operator_id": audit.operator_id,
        "operator_name": audit.operator_name,
        "operated_at": audit.operated_at.isoformat() if audit.operated_at else None,
        "old_status": audit.old_status.value if audit.old_status else None,
        "new_status": audit.new_status.value if audit.new_status else None,
        "change_reason": audit.change_reason,
        "ip_address": audit.ip_address,
    }


@bp.route("", methods=["GET"])
def list_audits():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    record_type = request.args.get("record_type")
    record_id = request.args.get("record_id", type=int)
    record_no = request.args.get("record_no")
    action = request.args.get("action")
    operator_id = request.args.get("operator_id", type=int)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = AuditTrail.query

    if record_type:
        try:
            query = query.filter(AuditTrail.record_type == RecordType(record_type))
        except ValueError:
            pass
    if record_id:
        query = query.filter(AuditTrail.record_id == record_id)
    if record_no:
        query = query.filter(AuditTrail.record_no.like(f"%{record_no}%"))
    if action:
        try:
            query = query.filter(AuditTrail.action == ActionType(action))
        except ValueError:
            pass
    if operator_id:
        query = query.filter(AuditTrail.operator_id == operator_id)

    pagination = query.order_by(AuditTrail.operated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    role = getattr(g, "user_role", "admin")
    audits = [audit_to_dict(a) for a in pagination.items]

    return jsonify({
        "data": audits,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
        "code": 200
    })


@bp.route("/<int:audit_id>", methods=["GET"])
def get_audit(audit_id: int):
    audit = AuditTrail.query.get(audit_id)
    if not audit:
        return jsonify({"error": "审计记录不存在", "code": 404}), 404

    data = audit_to_dict(audit)

    role = getattr(g, "user_role", "admin")
    if role != "admin" and role != "auditor":
        if data.get("old_values"):
            data["old_values"] = mask_sensitive_data(data["old_values"], role)
        if data.get("new_values"):
            data["new_values"] = mask_sensitive_data(data["new_values"], role)

    return jsonify({"data": data, "code": 200})


@bp.route("/record/<string:record_type>/<int:record_id>", methods=["GET"])
def get_record_audits(record_type: str, record_id: int):
    try:
        rt = RecordType(record_type)
    except ValueError:
        return jsonify({"error": "无效的记录类型", "code": 400}), 400

    audits = AuditTrail.query.filter_by(
        record_type=rt,
        record_id=record_id
    ).order_by(AuditTrail.operated_at.desc()).all()

    return jsonify({
        "data": [audit_to_dict(a) for a in audits],
        "total": len(audits),
        "code": 200
    })


@bp.route("/statistics", methods=["GET"])
def get_audit_statistics():
    from sqlalchemy import func

    action_stats = db.session.query(
        AuditTrail.action,
        func.count(AuditTrail.id)
    ).group_by(AuditTrail.action).all()

    type_stats = db.session.query(
        AuditTrail.record_type,
        func.count(AuditTrail.id)
    ).group_by(AuditTrail.record_type).all()

    return jsonify({
        "data": {
            "action_statistics": {
                a[0].value if a[0] else None: a[1] for a in action_stats
            },
            "type_statistics": {
                t[0].value if t[0] else None: t[1] for t in type_stats
            }
        },
        "code": 200
    })
