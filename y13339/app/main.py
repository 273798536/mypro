"""Flask主应用 - 稳定的API接口"""
from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from .models import RunRecord, RecallResult
from . import errors
from . import storage
from .material_manager import register_material, find_material_by_name
from .metrics import compute_metrics
from .leak_detector import detect_sample_leak

app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.config["JSON_AS_ASCII"] = False


def _api_response(data=None, error_code=errors.ERR_OK, error_msg=errors.ERR_OK_MSG, **extra):
    resp = {"error_code": error_code, "error_msg": error_msg}
    if data is not None:
        resp["data"] = data
    resp.update(extra)
    return jsonify(resp)


def _validate_required(payload: dict, fields: list):
    for f in fields:
        if f not in payload or payload[f] is None or (isinstance(payload[f], str) and not payload[f].strip()):
            return errors.ERR_PARAM_MISSING, errors.ERR_PARAM_MISSING_MSG.format(field=f)
    return None, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/run/<run_id>")
def run_page(run_id):
    return render_template("run_detail.html", run_id=run_id)


# ==================== 稳定的对外API ====================

@app.route("/api/runs", methods=["POST"])
def api_create_run():
    """
    创建新的看板运行 - 参数名稳定。

    Body:
        run_name: str                运行名称（必填）
    """
    payload = request.get_json(silent=True) or {}
    ec, em = _validate_required(payload, ["run_name"])
    if ec:
        return _api_response(error_code=ec, error_msg=em), 400

    record = RunRecord(run_name=payload["run_name"])
    storage.save_record(record)
    return _api_response({"run_id": record.run_id, "created_at": record.created_at})


@app.route("/api/runs", methods=["GET"])
def api_list_runs():
    """列出所有历史运行"""
    runs = storage.list_runs()
    return _api_response({"runs": runs})


@app.route("/api/runs/<run_id>", methods=["GET"])
def api_get_run(run_id):
    """获取运行详情 - 稳定的输出结构"""
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404
    return _api_response(record.to_dict())


@app.route("/api/runs/<run_id>/materials", methods=["POST"])
def api_add_material(run_id):
    """
    注册/更新材料 - 自动处理名称不一致和口径变更。

    Body:
        material_name: str           材料名称（必填）
        material_content: str        材料内容
        source_type: str             model/manual/oral，默认model
        aliases: list[str]           别名列表（用于名称不一致匹配）
        change_note: str             本次变更说明
        is_manual_override: bool     是否为人工修正（默认false）
        override_note: str           人工修正说明
        existing_material_id: str    指定要覆盖的材料id
    """
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404

    payload = request.get_json(silent=True) or {}
    ec, em = _validate_required(payload, ["material_name"])
    if ec:
        return _api_response(error_code=ec, error_msg=em), 400

    mat, ec2, em2 = register_material(
        materials=record.materials,
        material_name=payload["material_name"],
        material_content=payload.get("material_content", ""),
        source_type=payload.get("source_type", "model"),
        aliases=payload.get("aliases", []),
        change_note=payload.get("change_note", ""),
        is_manual_override=payload.get("is_manual_override", False),
        override_note=payload.get("override_note", ""),
        existing_material_id=payload.get("existing_material_id"),
    )

    if ec2 == errors.ERR_VERSION_CONFLICT:
        if mat.material_id not in record.changed_materials:
            record.changed_materials.append(mat.material_id)
        if mat.material_id not in record.pending_evidences:
            record.pending_evidences.append(f"material:{mat.material_id}")

    if ec2 == errors.ERR_MANUAL_OVERRIDE_EXISTS:
        if mat.material_id not in record.pending_evidences:
            record.pending_evidences.append(f"override_check:{mat.material_id}")

    storage.save_record(record)
    data = {
        "material": mat.to_dict(),
        "version_changed": ec2 == errors.ERR_VERSION_CONFLICT,
        "manual_conflict": ec2 == errors.ERR_MANUAL_OVERRIDE_EXISTS,
    }
    return _api_response(data, error_code=ec2 or errors.ERR_OK, error_msg=em2 or errors.ERR_OK_MSG)


@app.route("/api/runs/<run_id>/recalls", methods=["POST"])
def api_upload_recalls(run_id):
    """
    上传召回结果 - 参数名稳定。

    Body:
        recalls: list[dict]          召回结果列表（必填）
            - sample_id: str
            - query: str
            - recalled_material_ids: list[str]
            - recalled_scores: list[float]
            - expected_material_id: str (可选)
            - expected_material_name: str (可选，自动匹配id)
    """
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404

    payload = request.get_json(silent=True) or {}
    ec, em = _validate_required(payload, ["recalls"])
    if ec:
        return _api_response(error_code=ec, error_msg=em), 400
    if not isinstance(payload["recalls"], list):
        return _api_response(
            error_code=errors.ERR_PARAM_INVALID,
            error_msg=errors.ERR_PARAM_INVALID_MSG.format(field="recalls", expected="list"),
        ), 400

    added = 0
    warnings = []
    for item in payload["recalls"]:
        for f in ["sample_id", "query", "recalled_material_ids", "recalled_scores"]:
            if f not in item:
                warnings.append(f"样本缺少字段{f}, 已跳过")
                continue

        expected_name = item.get("expected_material_name")
        expected_id = item.get("expected_material_id")
        if expected_name and not expected_id:
            found = find_material_by_name(record.materials, expected_name)
            if found:
                expected_id = found.material_id
            else:
                warnings.append(f"样本{item['sample_id']}: 无法匹配材料名[{expected_name}], 已留空expected_id")

        rec = RecallResult(
            sample_id=item["sample_id"],
            query=item["query"],
            recalled_material_ids=list(item["recalled_material_ids"]),
            recalled_scores=list(item["recalled_scores"]),
            expected_material_id=expected_id,
            expected_material_name=expected_name,
            tags=list(item.get("tags", [])),
        )
        record.recall_results.append(rec)
        added += 1

    storage.save_record(record)
    return _api_response({"added": added, "total": len(record.recall_results), "warnings": warnings})


@app.route("/api/runs/<run_id>/compute", methods=["POST"])
def api_compute(run_id):
    """
    执行指标计算 - 如发现样本泄漏会暂停并返回原因。

    Body:
        confirm_leak: bool           确认泄漏后继续计算（默认false）
        leak_note: str               人工确认说明
    """
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404

    payload = request.get_json(silent=True) or {}
    confirm_leak = payload.get("confirm_leak", False)
    leak_note = payload.get("leak_note", "")

    record.status = "processing"
    storage.save_record(record)

    leak_info, leak_warns = detect_sample_leak(record.recall_results, record.materials)
    record.leak_info = leak_info

    if leak_info.detected and not confirm_leak:
        record.status = "paused_leak"
        record.status_note = "; ".join(leak_info.reasons[:3])
        storage.save_record(record)
        return _api_response(
            {
                "leak_info": leak_info.__dict__,
                "warnings": leak_warns,
            },
            error_code=errors.ERR_SAMPLE_LEAK_DETECTED,
            error_msg=errors.ERR_SAMPLE_LEAK_DETECTED_MSG,
        ), 200

    if confirm_leak and leak_info.detected:
        record.leak_info.confirmed = True
        record.leak_info.confirmed_note = leak_note
        for sid in leak_info.suspected_samples:
            if f"leak:{sid}" not in record.pending_evidences:
                record.pending_evidences.append(f"leak:{sid}")

    try:
        metrics, outliers = compute_metrics(record.recall_results)
        record.total_samples = metrics["total_samples"]
        record.recall_at_1 = metrics["recall_at_1"]
        record.recall_at_3 = metrics["recall_at_3"]
        record.recall_at_5 = metrics["recall_at_5"]
        record.mrr = metrics["mrr"]
        record.outlier_samples = outliers
        for oid in outliers:
            pe = f"outlier:{oid}"
            if pe not in record.pending_evidences:
                record.pending_evidences.append(pe)

        for mid in record.changed_materials:
            pe = f"changed:{mid}"
            if pe not in record.pending_evidences:
                record.pending_evidences.append(pe)

        record.status = "done"
        record.status_note = errors.ERR_OK_MSG
        storage.save_record(record)
        return _api_response({"metrics": metrics, "outlier_samples": outliers})
    except Exception as e:
        record.status = "error"
        record.status_note = str(e)
        storage.save_record(record)
        return _api_response(
            error_code=errors.ERR_CALCULATION_FAILED,
            error_msg=errors.ERR_CALCULATION_FAILED_MSG.format(detail=str(e)),
        ), 500


@app.route("/api/runs/<run_id>/status", methods=["POST"])
def api_update_status(run_id):
    """
    更新条目处理状态 - 标记已处理/待补证据。

    Body:
        item_key: str                待处理项key (格式: type:id)
        action: str                  mark_processed / unmark_processed / add_evidence_note
        note: str                    补证据说明
    """
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404

    payload = request.get_json(silent=True) or {}
    ec, em = _validate_required(payload, ["item_key", "action"])
    if ec:
        return _api_response(error_code=ec, error_msg=em), 400

    item_key = payload["item_key"]
    action = payload["action"]
    note = payload.get("note", "")

    if action == "mark_processed":
        if item_key in record.pending_evidences:
            record.pending_evidences.remove(item_key)
        if item_key not in record.processed_items:
            record.processed_items.append(item_key + (f"|{note}" if note else ""))
    elif action == "unmark_processed":
        record.processed_items = [p for p in record.processed_items if not p.startswith(item_key)]
        if item_key not in record.pending_evidences:
            record.pending_evidences.append(item_key)
    elif action == "add_evidence_note":
        found = False
        new_items = []
        for p in record.processed_items:
            if p.startswith(item_key):
                new_items.append(item_key + (f"|{note}" if note else ""))
                found = True
            else:
                new_items.append(p)
        if not found:
            new_items.append(item_key + (f"|{note}" if note else ""))
        record.processed_items = new_items
    else:
        return _api_response(
            error_code=errors.ERR_PARAM_INVALID,
            error_msg=errors.ERR_PARAM_INVALID_MSG.format(
                field="action", expected="mark_processed / unmark_processed / add_evidence_note"
            ),
        ), 400

    storage.save_record(record)
    return _api_response({
        "pending_evidences": record.pending_evidences,
        "processed_items": record.processed_items,
    })


@app.route("/api/runs/<run_id>/samples/<sample_id>", methods=["GET"])
def api_get_sample(run_id, sample_id):
    """获取单条样本详情（下钻分析）"""
    record = storage.load_record(run_id)
    if not record:
        return _api_response(
            error_code=errors.ERR_RUN_ID_NOT_FOUND,
            error_msg=errors.ERR_RUN_ID_NOT_FOUND_MSG.format(run_id=run_id),
        ), 404

    for r in record.recall_results:
        if r.sample_id == sample_id:
            recalled_materials = []
            for mid in r.recalled_material_ids:
                m = record.materials.get(mid)
                recalled_materials.append(m.to_dict() if m else {"material_id": mid, "material_name": "(未知材料)"})
            expected_m = None
            if r.expected_material_id:
                m = record.materials.get(r.expected_material_id)
                expected_m = m.to_dict() if m else None
            return _api_response({
                "sample": {
                    "sample_id": r.sample_id,
                    "query": r.query,
                    "matched": r.matched,
                    "match_details": r.match_details,
                    "tags": r.tags,
                    "recalled_material_ids": r.recalled_material_ids,
                    "recalled_scores": r.recalled_scores,
                    "expected_material_id": r.expected_material_id,
                    "expected_material_name": r.expected_material_name,
                },
                "recalled_materials": recalled_materials,
                "expected_material": expected_m,
            })

    return _api_response(
        error_code=errors.ERR_PARAM_INVALID,
        error_msg=errors.ERR_PARAM_INVALID_MSG.format(field="sample_id", expected="存在的样本ID"),
    ), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
