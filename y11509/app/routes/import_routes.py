import os
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from app.models import db, ImportSource, RecordType
from app.utils.import_utils import allowed_file, import_records_from_file
from app.utils.permissions import can_import

bp = Blueprint("import", __name__)


def import_source_to_dict(source: ImportSource) -> dict:
    return {
        "id": source.id,
        "filename": source.filename,
        "file_hash": source.file_hash,
        "record_type": source.record_type.value if source.record_type else None,
        "uploaded_by": source.uploaded_by,
        "uploaded_at": source.uploaded_at.isoformat() if source.uploaded_at else None,
        "total_rows": source.total_rows,
        "success_rows": source.success_rows,
        "failed_rows": source.failed_rows,
        "status": source.status,
    }


@bp.route("", methods=["POST"])
def upload_file():
    if not can_import():
        return jsonify({"error": "无权限导入数据，仅管理员、部门负责人或技术人员可操作", "code": 403}), 403

    if "file" not in request.files:
        return jsonify({"error": "没有上传文件", "code": 400}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "没有选择文件", "code": 400}), 400

    record_type_str = request.form.get("record_type")
    if not record_type_str:
        return jsonify({"error": "请指定记录类型", "code": 400}), 400

    try:
        record_type = RecordType(record_type_str)
    except ValueError:
        return jsonify({"error": "无效的记录类型", "code": 400}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = str(int(os.times()[4]))
        filename = f"{timestamp}_{filename}"
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        try:
            result, import_source, error = import_records_from_file(
                file_path,
                record_type,
                user_id=getattr(g, "user_id", 1),
                user_name=getattr(g, "user_name", "系统管理员"),
            )

            if error:
                return jsonify({"error": error, "code": 400}), 400

            return jsonify({
                "message": "导入完成",
                "data": result,
                "code": 200
            })
        except Exception as e:
            return jsonify({"error": f"导入失败: {str(e)}", "code": 500}), 500

    return jsonify({"error": "不支持的文件格式", "code": 400}), 400


@bp.route("/sources", methods=["GET"])
def list_import_sources():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    record_type = request.args.get("record_type")
    status = request.args.get("status")

    query = ImportSource.query

    if record_type:
        try:
            query = query.filter(ImportSource.record_type == RecordType(record_type))
        except ValueError:
            pass
    if status:
        query = query.filter(ImportSource.status.like(f"%{status}%"))

    pagination = query.order_by(ImportSource.uploaded_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "data": [import_source_to_dict(s) for s in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
        "code": 200
    })


@bp.route("/sources/<int:source_id>", methods=["GET"])
def get_import_source(source_id: int):
    source = ImportSource.query.get(source_id)
    if not source:
        return jsonify({"error": "导入记录不存在", "code": 404}), 404

    return jsonify({
        "data": import_source_to_dict(source),
        "code": 200
    })
