import json
from flask import Flask, request, jsonify
from drum_beat_align import models
from drum_beat_align.engine import run_alignment

app = Flask(__name__)


@app.route("/api/align/start", methods=["POST"])
def start_alignment():
    data = request.get_json(force=True)
    if not data or "screenshots" not in data:
        return jsonify({"error": "请求体需包含 screenshots 字段"}), 400
    batch_id = run_alignment(data["screenshots"])
    return jsonify({"batch_id": batch_id, "message": "对齐任务已启动"}), 201


@app.route("/api/align/rerun", methods=["POST"])
def rerun_alignment():
    data = request.get_json(force=True)
    if not data or "screenshots" not in data:
        return jsonify({"error": "请求体需包含 screenshots 字段"}), 400
    batch_id = run_alignment(data["screenshots"])
    return jsonify({"batch_id": batch_id, "message": "对齐任务已重跑"}), 201


@app.route("/api/align/exceptions", methods=["GET"])
def list_exceptions():
    batch_id = request.args.get("batch_id")
    status = request.args.get("status")
    exceptions = models.query_exceptions(batch_id=batch_id, status=status)
    return jsonify({"exceptions": exceptions, "count": len(exceptions)})


@app.route("/api/align/exceptions/<exception_id>", methods=["GET"])
def get_exception_details(exception_id):
    detail = models.query_exception_details(exception_id)
    if not detail:
        return jsonify({"error": "异常条目不存在"}), 404
    history = models.query_confirmation_history(exception_id)
    detail["confirmation_history"] = history
    return jsonify(detail)


@app.route("/api/align/confirm/<exception_id>", methods=["POST"])
def confirm_exception(exception_id):
    data = request.get_json(force=True)
    operator = data.get("operator")
    new_status = data.get("new_status", "confirmed")
    note = data.get("note")
    if not operator:
        return jsonify({"error": "operator 字段必填"}), 400
    result = models.confirm_exception(exception_id, operator, new_status, note)
    if not result:
        return jsonify({"error": "异常条目不存在"}), 404
    return jsonify({"message": "确认成功", "changes": result})


@app.route("/api/align/export", methods=["GET"])
def export_exceptions():
    batch_id = request.args.get("batch_id")
    status = request.args.get("status")
    exceptions = models.query_exceptions(batch_id=batch_id, status=status)
    export_data = []
    for exc in exceptions:
        detail = models.query_exception_details(exc["id"])
        if detail:
            history = models.query_confirmation_history(exc["id"])
            detail["confirmation_history"] = history
            export_data.append(detail)
        else:
            export_data.append(exc)
    return jsonify({"exceptions": export_data, "count": len(export_data)})


@app.route("/api/align/details/<alignment_result_id>", methods=["GET"])
def get_alignment_details(alignment_result_id):
    detail = models.query_alignment_details(alignment_result_id)
    if not detail:
        return jsonify({"error": "对齐结果不存在"}), 404
    exceptions = models.query_exceptions()
    matched = [e for e in exceptions if e["alignment_result_id"] == alignment_result_id]
    detail["related_exceptions"] = matched
    return jsonify(detail)


@app.route("/api/align/batch/latest", methods=["GET"])
def get_latest_batch():
    batch = models.query_latest_batch()
    if not batch:
        return jsonify({"error": "尚无对齐批次"}), 404
    return jsonify(batch)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})
