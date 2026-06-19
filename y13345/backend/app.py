from flask import Flask, request, jsonify, send_from_directory
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from field_mapper import load_sample_table, SampleRecord
from review_engine import (
    generate_review_result,
    FilterConditions,
    categorize_status,
    get_conflict_detail,
    explain_label_change,
    QUEUE_DISPLAY_NAMES,
)
from demo_data import generate_demo_samples

app = Flask(__name__, static_folder="../frontend", static_url_path="")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


_current_records = []
_current_mapping = None
_old_records = []


def record_to_dict(record):
    return {
        "sample_id": record.sample_id,
        "source": record.source,
        "status": record.status,
        "status_category": categorize_status(record.status),
        "label": record.label,
        "original_label": record.original_label,
        "new_label": record.new_label,
        "content": record.content,
        "risk_level": record.risk_level,
        "reason": record.reason,
        "reviewer": record.reviewer,
        "review_time": record.review_time,
        "conflict_flag": record.conflict_flag,
        "conflict_detail": record.conflict_detail,
        "evidence_ref": record.evidence_ref,
        "remark": record.remark,
        "raw_fields": record.raw_fields,
    }


def init_demo_data():
    global _current_records, _current_mapping, _old_records
    paths = generate_demo_samples(DATA_DIR)
    _current_records, _current_mapping = load_sample_table(paths["new_model"])
    _old_records, _ = load_sample_table(paths["old_model"])


@app.route("/")
def index():
    return send_from_directory("../frontend", "index.html")


@app.route("/api/samples", methods=["GET"])
def get_samples():
    source = request.args.get("source")
    status_category = request.args.get("status_category")
    has_conflict = request.args.get("has_conflict")
    risk_level = request.args.get("risk_level")
    label = request.args.get("label")
    keyword = request.args.get("keyword")

    conditions = FilterConditions(
        source=source if source else None,
        status_category=status_category if status_category else None,
        has_conflict=(has_conflict == "true") if has_conflict else None,
        risk_level=risk_level if risk_level else None,
        label=label if label else None,
        keyword=keyword if keyword else None,
    )

    result = generate_review_result(_current_records, _current_mapping, conditions)

    return jsonify({
        "statistics": {
            "total_count": result.statistics.total_count,
            "processed_count": result.statistics.processed_count,
            "pending_material_count": result.statistics.pending_material_count,
            "manual_review_count": result.statistics.manual_review_count,
            "conflict_count": result.statistics.conflict_count,
            "source_distribution": result.statistics.source_distribution,
            "label_distribution": result.statistics.label_distribution,
            "risk_distribution": result.statistics.risk_distribution,
        },
        "records": [record_to_dict(r) for r in result.records],
        "queues": {
            key: [record_to_dict(r) for r in records]
            for key, records in result.queues.items()
        },
        "queue_display_names": QUEUE_DISPLAY_NAMES,
        "field_mapping": result.field_mapping,
        "unmapped_columns": result.unmapped_columns,
        "ambiguous_fields": result.ambiguous_fields,
    })


@app.route("/api/sample/<sample_id>", methods=["GET"])
def get_sample_detail(sample_id):
    for r in _current_records:
        if r.sample_id == sample_id:
            detail = get_conflict_detail(r)
            return jsonify(detail)
    return jsonify({"error": "样本不存在"}), 404


@app.route("/api/explain-change/<sample_id>", methods=["GET"])
def explain_change(sample_id):
    old_record = None
    for r in _old_records:
        if r.sample_id == sample_id:
            old_record = r
            break

    if not old_record:
        return jsonify({"error": "旧模型中未找到该样本"}), 404

    explanation = explain_label_change(old_record, _current_records)
    return jsonify(explanation)


@app.route("/api/upload", methods=["POST"])
def upload_file():
    global _current_records, _current_mapping
    if "file" not in request.files:
        return jsonify({"error": "未上传文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "未选择文件"}), 400

    filepath = os.path.join(UPLOAD_DIR, file.filename)
    file.save(filepath)

    try:
        _current_records, _current_mapping = load_sample_table(filepath)
        result = generate_review_result(_current_records, _current_mapping)
        return jsonify({
            "success": True,
            "filename": file.filename,
            "total_count": result.statistics.total_count,
            "field_mapping": result.field_mapping,
            "missing_required": _current_mapping.missing_required,
            "unmapped_columns": result.unmapped_columns,
            "ambiguous_fields": result.ambiguous_fields,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/load-demo", methods=["POST"])
def load_demo():
    demo_type = request.json.get("type", "new_model") if request.is_json else "new_model"
    global _current_records, _current_mapping

    paths = generate_demo_samples(DATA_DIR)
    path_map = {
        "new_model": paths["new_model"],
        "old_model": paths["old_model"],
        "alt_fields": paths["alt_fields"],
    }

    if demo_type not in path_map:
        return jsonify({"error": "未知的演示类型"}), 400

    _current_records, _current_mapping = load_sample_table(path_map[demo_type])
    result = generate_review_result(_current_records, _current_mapping)

    return jsonify({
        "success": True,
        "demo_type": demo_type,
        "total_count": result.statistics.total_count,
        "field_mapping": result.field_mapping,
        "unmapped_columns": result.unmapped_columns,
        "ambiguous_fields": result.ambiguous_fields,
    })


@app.route("/api/queue-stats", methods=["GET"])
def queue_stats():
    result = generate_review_result(_current_records, _current_mapping)
    queues = {}
    for key, records in result.queues.items():
        queues[key] = {
            "count": len(records),
            "display_name": QUEUE_DISPLAY_NAMES.get(key, key),
        }
    return jsonify(queues)


if __name__ == "__main__":
    init_demo_data()
    app.run(debug=True, port=5000)
