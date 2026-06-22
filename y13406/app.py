import io
import json
import os
from typing import Any

import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pydantic import ValidationError

from config import Config
from data_cleanse import cleanse_samples, load_from_dataframe
from exceptions import build_exception_dashboard, export_cleanse_log_lines
from models import (
    SamplingParams,
    SamplingMethod,
    SampleStatus,
)
from sampling import run_sampling

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)


def _error_response(message: str, code: str, status: int, details: Any = None):
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return jsonify(body), status


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "service": "probability-sampling-sandbox",
        "status": "ok",
        "allowed_methods": [m.value for m in SamplingMethod],
        "allowed_statuses": [s.value for s in SampleStatus],
    })


@app.route("/openapi", methods=["GET"])
def openapi_spec():
    spec_path = os.path.join(os.path.dirname(__file__), "openapi.yaml")
    if os.path.exists(spec_path):
        return send_file(spec_path, mimetype="application/x-yaml")
    return _error_response("spec file not found", "SPEC_MISSING", 404)


@app.route("/api/v1/cleanse", methods=["POST"])
def api_cleanse():
    content_type = request.content_type or ""

    if "multipart/form-data" in content_type:
        file = request.files.get("file")
        if not file:
            return _error_response(
                "缺少 file 字段", "MISSING_FILE", 400
            )
        fname = file.filename or ""
        ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
        if ext not in app.config["ALLOWED_EXTENSIONS"]:
            return _error_response(
                f"不支持的扩展名 {ext}", "UNSUPPORTED_FORMAT", 400,
                {"allowed": list(app.config["ALLOWED_EXTENSIONS"])},
            )
        try:
            if ext in ("xlsx", "xls"):
                df = pd.read_excel(file)
            elif ext == "csv":
                df = pd.read_csv(file)
            elif ext == "json":
                df = pd.read_json(file)
            else:
                return _error_response(f"无法解析 {ext}", "PARSE_ERROR", 400)
            records = load_from_dataframe(df)
        except Exception as e:
            return _error_response(f"文件解析失败: {e}", "PARSE_ERROR", 400)

    elif "application/json" in content_type:
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or "records" not in data:
            return _error_response(
                "JSON 需包含 records 数组", "INVALID_BODY", 400
            )
        records = data["records"]
        if not isinstance(records, list):
            return _error_response("records 必须是数组", "INVALID_BODY", 400)
    else:
        return _error_response(
            f"不支持的 Content-Type: {content_type}",
            "UNSUPPORTED_CONTENT_TYPE",
            415,
        )

    try:
        result = cleanse_samples(records)
    except Exception as e:
        return _error_response(f"清洗失败: {e}", "CLEANSE_ERROR", 500)

    return jsonify({
        "summary": {
            "total_input": result.total_input,
            "valid_count": result.valid_count,
            "excluded_count": result.excluded_count,
            "missing_value_count": result.missing_value_count,
            "unit_missing_count": result.unit_missing_count,
            "boundary_outlier_count": result.boundary_outlier_count,
            "supplement_merged": result.supplement_merged,
            "old_term_renamed": len(result.old_term_renamed),
        },
        "excluded_unit_missing_ids": result.excluded_unit_missing_ids,
        "cleanse_log": result.cleanse_log,
        "samples": [s.model_dump() for s in result.samples],
    })


@app.route("/api/v1/sample", methods=["POST"])
def api_sample():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _error_response("请求体必须是 JSON 对象", "INVALID_BODY", 400)

    if "samples" not in data or not isinstance(data["samples"], list):
        return _error_response("缺少 samples 数组", "MISSING_SAMPLES", 400)

    try:
        params = SamplingParams(**(data.get("params") or {}))
    except ValidationError as e:
        return _error_response(
            "抽样参数校验失败", "INVALID_PARAMS", 400,
            details=e.errors(),
        )
    except Exception as e:
        return _error_response(f"参数解析失败: {e}", "INVALID_PARAMS", 400)

    from models import ErrorQuestionSample

    parsed_samples = []
    for idx, s in enumerate(data["samples"]):
        try:
            parsed_samples.append(ErrorQuestionSample(**s))
        except ValidationError as e:
            return _error_response(
                f"samples[{idx}] 解析失败", "INVALID_SAMPLE", 400,
                details=e.errors(),
            )

    try:
        result = run_sampling(parsed_samples, params)
    except Exception as e:
        return _error_response(f"抽样失败: {e}", "SAMPLING_ERROR", 500)

    return jsonify({
        "summary": result.summary,
        "total_eligible": result.total_eligible,
        "sample_size_used": result.sample_size_used,
        "sample_ratio_used": result.sample_ratio_used,
        "selected_ids": result.selected_ids,
        "selected_samples": result.selected_samples,
        "stratify_distribution": result.stratify_distribution,
        "excluded_from_sampling": result.excluded_from_sampling,
        "intermediate_steps": [step.model_dump() for step in result.intermediate_steps],
    })


@app.route("/api/v1/pipeline", methods=["POST"])
def api_pipeline():
    content_type = request.content_type or ""

    if "multipart/form-data" in content_type:
        file = request.files.get("file")
        params_raw = request.form.get("params")
        if not file:
            return _error_response("缺少 file 字段", "MISSING_FILE", 400)
        fname = file.filename or ""
        ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""
        if ext not in app.config["ALLOWED_EXTENSIONS"]:
            return _error_response(
                f"不支持的扩展名 {ext}", "UNSUPPORTED_FORMAT", 400,
                {"allowed": list(app.config["ALLOWED_EXTENSIONS"])},
            )
        try:
            if ext in ("xlsx", "xls"):
                df = pd.read_excel(file)
            elif ext == "csv":
                df = pd.read_csv(file)
            elif ext == "json":
                df = pd.read_json(file)
            else:
                return _error_response(f"无法解析 {ext}", "PARSE_ERROR", 400)
            records = load_from_dataframe(df)
        except Exception as e:
            return _error_response(f"文件解析失败: {e}", "PARSE_ERROR", 400)

        try:
            params = SamplingParams(**(json.loads(params_raw) if params_raw else {}))
        except (json.JSONDecodeError, ValidationError) as e:
            return _error_response(
                f"params 解析失败: {e}", "INVALID_PARAMS", 400,
            )

    elif "application/json" in content_type:
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return _error_response("请求体必须是 JSON 对象", "INVALID_BODY", 400)
        records = body.get("records") or []
        if not isinstance(records, list):
            return _error_response("records 必须是数组", "INVALID_BODY", 400)
        try:
            params = SamplingParams(**(body.get("params") or {}))
        except ValidationError as e:
            return _error_response(
                "抽样参数校验失败", "INVALID_PARAMS", 400,
                details=e.errors(),
            )
    else:
        return _error_response(
            f"不支持的 Content-Type: {content_type}",
            "UNSUPPORTED_CONTENT_TYPE",
            415,
        )

    try:
        cleanse_result = cleanse_samples(records)
        sampling_result = run_sampling(cleanse_result.samples, params)
        dashboard = build_exception_dashboard(cleanse_result, sampling_result)
    except Exception as e:
        return _error_response(f"流水线执行失败: {e}", "PIPELINE_ERROR", 500)

    return jsonify({
        "cleanse_summary": {
            "total_input": cleanse_result.total_input,
            "valid_count": cleanse_result.valid_count,
            "excluded_count": cleanse_result.excluded_count,
            "missing_value_count": cleanse_result.missing_value_count,
            "unit_missing_count": cleanse_result.unit_missing_count,
            "boundary_outlier_count": cleanse_result.boundary_outlier_count,
            "supplement_merged": cleanse_result.supplement_merged,
        },
        "sampling_summary": sampling_result.summary,
        "sample_size_used": sampling_result.sample_size_used,
        "sample_ratio_used": sampling_result.sample_ratio_used,
        "selected_ids": sampling_result.selected_ids,
        "selected_samples": sampling_result.selected_samples,
        "stratify_distribution": sampling_result.stratify_distribution,
        "intermediate_steps": [step.model_dump() for step in sampling_result.intermediate_steps],
        "excluded_from_sampling": sampling_result.excluded_from_sampling,
        "exception_dashboard": dashboard,
        "cleanse_log_lines": export_cleanse_log_lines(cleanse_result),
    })


@app.route("/api/v1/exceptions", methods=["POST"])
def api_exceptions():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _error_response("请求体必须是 JSON 对象", "INVALID_BODY", 400)

    from models import CleanseResult

    try:
        cleanse_result = CleanseResult(**(body.get("cleanse") or {}))
    except ValidationError as e:
        return _error_response(
            "cleanse 数据解析失败", "INVALID_CLEANSE", 400,
            details=e.errors(),
        )

    sampling_result = None
    if body.get("sampling"):
        from models import SamplingResult
        try:
            sampling_result = SamplingResult(**body["sampling"])
        except ValidationError as e:
            return _error_response(
                "sampling 数据解析失败", "INVALID_SAMPLING", 400,
                details=e.errors(),
            )

    dashboard = build_exception_dashboard(cleanse_result, sampling_result)
    return jsonify(dashboard)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=app.config["FLASK_PORT"], debug=True)
