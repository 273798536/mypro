from flask import Blueprint, request, jsonify, g, send_from_directory, current_app
from app.models import RecordType, ExportLog
from app.utils.export_utils import export_records_to_excel, export_summary_report
from app.utils.permissions import can_export
import os

bp = Blueprint("export", __name__)


def export_log_to_dict(log: ExportLog) -> dict:
    return {
        "id": log.id,
        "export_type": log.export_type,
        "exported_by": log.exported_by,
        "exported_at": log.exported_at.isoformat() if log.exported_at else None,
        "record_count": log.record_count,
        "is_masked": log.is_masked,
        "filters_applied": log.filters_applied,
        "filename": log.filename,
        "file_hash": log.file_hash,
    }


@bp.route("/records", methods=["POST"])
def export_records():
    if not can_export():
        return jsonify({"error": "无权限导出数据，仅管理员、部门负责人或审计人员可操作", "code": 403}), 403

    data = request.get_json() or {}
    record_type_str = data.get("record_type")

    if not record_type_str:
        return jsonify({"error": "请指定记录类型", "code": 400}), 400

    try:
        record_type = RecordType(record_type_str)
    except ValueError:
        return jsonify({"error": "无效的记录类型", "code": 400}), 400

    filters = {
        "department": data.get("department"),
        "status": data.get("status"),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
    }

    result, error = export_records_to_excel(
        record_type,
        filters=filters,
        user_role=getattr(g, "user_role", "admin"),
        user_id=getattr(g, "user_id", 1),
    )

    if error:
        return jsonify({"error": error, "code": 400}), 400

    return jsonify({
        "message": "导出成功",
        "data": result,
        "code": 200
    })


@bp.route("/summary", methods=["POST"])
def export_summary():
    if not can_export():
        return jsonify({"error": "无权限导出数据，仅管理员、部门负责人或审计人员可操作", "code": 403}), 403

    data = request.get_json() or {}

    result, error = export_summary_report(
        department=data.get("department"),
        user_role=getattr(g, "user_role", "admin"),
        user_id=getattr(g, "user_id", 1),
    )

    if error:
        return jsonify({"error": error, "code": 400}), 400

    return jsonify({
        "message": "汇总报告导出成功",
        "data": result,
        "code": 200
    })


@bp.route("/download/<filename>", methods=["GET"])
def download_export(filename):
    try:
        return send_from_directory(
            current_app.config["EXPORT_FOLDER"],
            filename,
            as_attachment=True
        )
    except FileNotFoundError:
        return jsonify({"error": "文件不存在", "code": 404}), 404


@bp.route("/logs", methods=["GET"])
def list_export_logs():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    export_type = request.args.get("export_type")
    is_masked = request.args.get("is_masked")

    query = ExportLog.query

    if export_type:
        query = query.filter(ExportLog.export_type.like(f"%{export_type}%"))
    if is_masked is not None:
        query = query.filter(ExportLog.is_masked == (is_masked.lower() == "true"))

    pagination = query.order_by(ExportLog.exported_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "data": [export_log_to_dict(l) for l in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
        "code": 200
    })


@bp.route("/logs/<int:log_id>", methods=["GET"])
def get_export_log(log_id: int):
    log = ExportLog.query.get(log_id)
    if not log:
        return jsonify({"error": "导出日志不存在", "code": 404}), 404

    return jsonify({
        "data": export_log_to_dict(log),
        "code": 200
    })
