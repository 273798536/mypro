from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, send_file

from models import (
    ProcessingBatch,
    SourceData,
    RecordStatus,
    store,
    new_batch_id,
    new_source_id,
)
from calculator import process_batch, FORMULA_LIBRARY
from services import TraceEngine, DownloadService, ReviewService


app = Flask(__name__)


STATUS_CLASS_MAP = {
    RecordStatus.PENDING: "status-pending",
    RecordStatus.CALCULATED: "status-ok",
    RecordStatus.CONSTRAINT_FAILED: "status-fail",
    RecordStatus.UNIT_MISSING: "status-unit",
    RecordStatus.REVIEWED: "status-review",
}


def _fmt_batch_view(batch: ProcessingBatch) -> dict:
    d = batch.to_dict()
    d["status_class"] = STATUS_CLASS_MAP.get(batch.status, "status-pending")
    return d


def seed_demo_data():
    now = datetime.now()

    demo_cases = [
        {
            "offset": timedelta(minutes=30),
            "formula": "density",
            "sources": [
                {"name": "m", "value": 156.0, "unit": "g", "description": "铁块质量，天平测量"},
                {"name": "V", "value": 20.0, "unit": "cm³", "description": "铁块体积，排水法测量"},
            ],
            "review": None,
        },
        {
            "offset": timedelta(minutes=20),
            "formula": "density",
            "sources": [
                {"name": "m", "value": 250.0, "unit": "g", "description": "木块质量"},
                {"name": "V", "value": -5.0, "unit": "cm³", "description": "体积录入时符号错误"},
            ],
            "review": None,
        },
        {
            "offset": timedelta(minutes=10),
            "formula": "density",
            "sources": [
                {"name": "m", "value": 78.0, "unit": None, "description": "学生忘记填写单位"},
                {"name": "V", "value": 10.0, "unit": None, "description": "学生忘记填写单位"},
            ],
            "review": None,
        },
        {
            "offset": timedelta(minutes=5),
            "formula": "period",
            "sources": [
                {"name": "L", "value": 0.05, "unit": "m", "description": "摆长过短，超出单摆适用范围"},
            ],
            "review": {
                "reviewer": "数学老师",
                "score": 72.0,
                "comment": "思路正确，但摆长选择不符合单摆公式适用条件",
                "handling_opinion": "建议改用 0.5m 以上摆长重新实验",
            },
        },
    ]

    for case in demo_cases:
        ts = now - case["offset"]
        sources = [
            SourceData(
                source_id=new_source_id(),
                name=s["name"],
                value=s["value"],
                unit=s["unit"],
                description=s.get("description", ""),
            )
            for s in case["sources"]
        ]
        batch = ProcessingBatch(
            batch_id=new_batch_id(),
            run_timestamp=ts,
            sources=sources,
        )
        process_batch(batch, case["formula"])

        if case["review"]:
            ReviewService.submit_review(
                batch.batch_id,
                reviewer=case["review"]["reviewer"],
                score=case["review"]["score"],
                comment=case["review"]["comment"],
                handling_opinion=case["review"]["handling_opinion"],
            )
        else:
            store.save(batch)

    print(f"[seed] 已载入 {len(demo_cases)} 条演示数据")


@app.route("/")
def dashboard():
    batches = store.list_all()
    view_batches = [_fmt_batch_view(b) for b in batches]
    stats = {
        "calculated": sum(1 for b in batches if b.status == RecordStatus.CALCULATED),
        "failed": sum(1 for b in batches if b.status == RecordStatus.CONSTRAINT_FAILED),
        "unit_missing": sum(1 for b in batches if b.status == RecordStatus.UNIT_MISSING),
        "reviewed": sum(1 for b in batches if b.status == RecordStatus.REVIEWED),
    }
    return render_template(
        "dashboard.html",
        batches=view_batches,
        total=len(batches),
        stats=stats,
    )


@app.route("/review")
def review_page():
    pending = ReviewService.list_pending_review()
    all_batches = store.list_all()
    view_batches = [_fmt_batch_view(b) for b in all_batches]
    return render_template("review.html", batches=view_batches)


@app.route("/api/trace/batch/<batch_id>")
def api_trace_batch(batch_id: str):
    chain = TraceEngine.trace_from_batch(batch_id)
    return jsonify(chain)


@app.route("/api/trace/result/<result_id>")
def api_trace_result(result_id: str):
    chain = TraceEngine.trace_from_result(result_id)
    return jsonify(chain)


@app.route("/api/download/<batch_id>")
def api_download(batch_id: str):
    batch = store.get(batch_id)
    if batch is None:
        return jsonify({"error": "批次不存在"}), 404
    buf = DownloadService.get_file_bytes(batch)
    filename = DownloadService.make_filename(batch)
    return send_file(
        buf,
        as_attachment=True,
        download_name=filename,
        mimetype="text/plain; charset=utf-8",
    )


@app.route("/api/review", methods=["POST"])
def api_submit_review():
    data = request.get_json(silent=True) or {}
    batch_id = data.get("batch_id")
    reviewer = data.get("reviewer")
    if not batch_id or not reviewer:
        return jsonify({"ok": False, "error": "缺少 batch_id 或 reviewer"}), 400
    result = ReviewService.submit_review(
        batch_id=batch_id,
        reviewer=reviewer,
        score=data.get("score"),
        comment=data.get("comment", ""),
        handling_opinion=data.get("handling_opinion", ""),
        corrections=data.get("corrections"),
    )
    if result is None:
        return jsonify({"ok": False, "error": "批次不存在"}), 404
    return jsonify({"ok": True, "batch_id": result.batch_id})


@app.route("/api/formulas")
def api_formulas():
    return jsonify({
        k: {
            "expression": v.expression,
            "latex": v.latex,
            "description": v.description,
            "applicable_range": v.applicable_range,
            "units": v.units,
        }
        for k, v in FORMULA_LIBRARY.items()
    })


@app.route("/api/batches")
def api_list_batches():
    batches = store.list_all()
    return jsonify([b.to_dict() for b in batches])


if __name__ == "__main__":
    seed_demo_data()
    print("=" * 50)
    print("蒙特卡洛误差看板已启动")
    print("学生看板: http://127.0.0.1:5000/")
    print("教师复核: http://127.0.0.1:5000/review")
    print("=" * 50)
    print()
    print("[终端复核入口] 提示:")
    print("  可直接访问 /review 页进行复核，无需重新导入数据")
    print("  追溯: 点击任意批次的「追溯链路」按钮可查看完整链路")
    print("  下载: 点击「下载报告」，文件名含 batch_id + 状态 + 时间戳")
    print()
    app.run(host="127.0.0.1", port=5000, debug=False)
