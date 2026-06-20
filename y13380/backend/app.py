#!/usr/bin/env python3
import json
import os
from datetime import datetime
from flask import Flask, jsonify, request, render_template, abort

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def _load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_runs():
    return _load_json("runs.json")


def _load_snapshots():
    return _load_json("feature_snapshots.json")


def _load_adjustments():
    return _load_json("manual_adjustments.json")


@app.route("/")
def index():
    runs = _load_runs()
    run_list = sorted(runs.values(), key=lambda r: r["started_at"], reverse=True)
    return render_template("index.html", runs=run_list)


@app.route("/run/<run_id>")
def run_detail(run_id):
    runs = _load_runs()
    snapshots = _load_snapshots()
    adjustments = _load_adjustments()
    if run_id not in runs:
        abort(404)
    run = runs[run_id]
    snapshot = snapshots.get(run.get("snapshot_id"), snapshots.get(run_id, {}))
    run_adjustments = [adj for adj in adjustments.values() if adj.get("run_id") == run_id]
    return render_template("run_detail.html", run=run, snapshot=snapshot, adjustments=run_adjustments)


@app.route("/api/runs", methods=["GET"])
def api_runs():
    runs = _load_runs()
    run_list = sorted(runs.values(), key=lambda r: r["started_at"], reverse=True)
    return jsonify({"code": 0, "msg": "ok", "data": run_list})


@app.route("/api/run/<run_id>", methods=["GET"])
def api_run_detail(run_id):
    runs = _load_runs()
    snapshots = _load_snapshots()
    adjustments = _load_adjustments()
    if run_id not in runs:
        return jsonify({"code": 404, "msg": "run not found", "data": None}), 404
    run = runs[run_id]
    snapshot = snapshots.get(run.get("snapshot_id"), snapshots.get(run_id, {}))
    run_adjustments = [adj for adj in adjustments.values() if adj.get("run_id") == run_id]
    return jsonify({
        "code": 0,
        "msg": "ok",
        "data": {
            "run": run,
            "snapshot": snapshot,
            "adjustments": run_adjustments
        }
    })


@app.route("/api/run/<run_id>/suspicious", methods=["GET"])
def api_run_suspicious(run_id):
    snapshots = _load_snapshots()
    snapshot = snapshots.get(run_id, {})
    if not snapshot:
        return jsonify({"code": 404, "msg": "snapshot not found", "data": None}), 404
    suspicious_ids = snapshot.get("suspicious_samples", [])
    suspicious = [s for s in snapshot.get("samples", []) if s.get("row_id") in suspicious_ids]
    small_buckets = snapshot.get("small_sample_buckets", [])
    return jsonify({
        "code": 0,
        "msg": "ok",
        "data": {
            "suspicious_samples": suspicious,
            "small_sample_buckets": small_buckets
        }
    })


@app.route("/api/adjustments", methods=["GET"])
def api_adjustments():
    adj_run_id = request.args.get("run_id")
    adjustments = _load_adjustments()
    adj_list = list(adjustments.values())
    if adj_run_id:
        adj_list = [a for a in adj_list if a.get("run_id") == adj_run_id]
    adj_list.sort(key=lambda a: a["created_at"], reverse=True)
    return jsonify({"code": 0, "msg": "ok", "data": adj_list})


@app.route("/api/adjustment", methods=["POST"])
def api_create_adjustment():
    payload = request.get_json(force=True)
    run_id = payload.get("run_id")
    if not run_id:
        return jsonify({"code": 400, "msg": "run_id required", "data": None}), 400
    runs = _load_runs()
    if run_id not in runs:
        return jsonify({"code": 404, "msg": "run not found", "data": None}), 404

    now = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    adj_id = f"adj_{now}"
    adjustments = _load_adjustments()
    new_adj = {
        "adjustment_id": adj_id,
        "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "created_by": payload.get("created_by", "acen"),
        "created_by_name": payload.get("created_by_name", "阿岑"),
        "run_id": run_id,
        "snapshot_id": runs[run_id].get("snapshot_id", run_id),
        "adjustment_type": payload.get("adjustment_type", "conclusion_overrule"),
        "original_conclusion": runs[run_id].get("auto_conclusion", "UNKNOWN"),
        "original_reason": payload.get("original_reason", ""),
        "new_conclusion": payload.get("new_conclusion", "NEEDS_REVIEW"),
        "new_reason": payload.get("new_reason", ""),
        "status": payload.get("status", "PENDING_CONFIRMATION"),
        "status_updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "next_action": payload.get("next_action", ""),
        "evidence_refs": payload.get("evidence_refs", []),
        "followup_comments": []
    }
    adjustments[adj_id] = new_adj
    _save_json("manual_adjustments.json", adjustments)

    runs[run_id]["has_adjustment"] = True
    if adj_id not in runs[run_id].get("adjustment_ids", []):
        runs[run_id].setdefault("adjustment_ids", []).append(adj_id)
    runs[run_id]["final_conclusion"] = new_adj["new_conclusion"]
    runs[run_id]["final_conclusion_source"] = f"manual_adjustment:{adj_id}"
    runs[run_id]["status"] = "SUCCESS_WITH_ADJUSTMENT"
    _save_json("runs.json", runs)

    return jsonify({"code": 0, "msg": "adjustment created", "data": {"adjustment_id": adj_id}})


@app.route("/api/adjustment/<adj_id>/status", methods=["POST"])
def api_update_adjustment_status(adj_id):
    payload = request.get_json(force=True)
    adjustments = _load_adjustments()
    if adj_id not in adjustments:
        return jsonify({"code": 404, "msg": "adjustment not found", "data": None}), 404
    adjustments[adj_id]["status"] = payload.get("status", adjustments[adj_id]["status"])
    adjustments[adj_id]["status_updated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    if payload.get("confirmed_by"):
        adjustments[adj_id]["confirmed_by"] = payload["confirmed_by"]
    if payload.get("next_action"):
        adjustments[adj_id]["next_action"] = payload["next_action"]
    if payload.get("comment"):
        adjustments[adj_id].setdefault("followup_comments", []).append({
            "comment_id": f"c_{len(adjustments[adj_id].get('followup_comments', [])) + 1:03d}",
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "created_by": payload.get("comment_by", "acen"),
            "content": payload["comment"]
        })
    _save_json("manual_adjustments.json", adjustments)
    return jsonify({"code": 0, "msg": "status updated", "data": adjustments[adj_id]})


@app.route("/api/compare", methods=["GET"])
def api_compare():
    base_run_id = request.args.get("base")
    target_run_id = request.args.get("target")
    runs = _load_runs()
    snapshots = _load_snapshots()
    if base_run_id not in runs or target_run_id not in runs:
        return jsonify({"code": 404, "msg": "run not found", "data": None}), 404
    base_snap = snapshots.get(runs[base_run_id].get("snapshot_id"), snapshots.get(base_run_id, {}))
    target_snap = snapshots.get(runs[target_run_id].get("snapshot_id"), snapshots.get(target_run_id, {}))
    base_metrics = base_snap.get("aggregate_metrics", {})
    target_metrics = target_snap.get("aggregate_metrics", {})
    return jsonify({
        "code": 0,
        "msg": "ok",
        "data": {
            "base": {"run": runs[base_run_id], "metrics": base_metrics},
            "target": {"run": runs[target_run_id], "metrics": target_metrics}
        }
    })


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({"code": 0, "msg": "ok", "data": {"service": "model_compression_tracker", "status": "running"}})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9527, debug=True)
