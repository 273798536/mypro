import io
import csv
from datetime import datetime
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from models import PaymentStatus, ChangeSource
from service import (
    store,
    import_from_rows,
    replay_batch,
    change_status,
    add_remark,
    update_voucher,
    generate_sample_data,
)
from report import generate_markdown_report

app = FastAPI(title="供应链预付款异常回放")


def _enum_to_name(val):
    if isinstance(val, PaymentStatus):
        return val.name
    if isinstance(val, ChangeSource):
        return val.name
    return val


def _serialize_payment(p):
    d = p.model_dump(mode="json")
    d["current_status"] = p.current_status.name
    d["status_label"] = p.current_status.value
    d["history"] = [_serialize_history(h) for h in p.history]
    return d


def _serialize_history(h):
    d = h.model_dump(mode="json")
    d["source"] = h.source.name
    d["source_label"] = h.source.value
    d["old_status"] = h.old_status.name if h.old_status else None
    d["old_status_label"] = h.old_status.value if h.old_status else None
    d["new_status"] = h.new_status.name
    d["new_status_label"] = h.new_status.value
    return d


def _serialize_replay_result(r):
    d = r.model_dump(mode="json")
    d["previous_status"] = r.previous_status.name
    d["previous_status_label"] = r.previous_status.value
    d["new_status"] = r.new_status.name
    d["new_status_label"] = r.new_status.value
    return d


@app.get("/", response_class=HTMLResponse)
def index():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.post("/api/sample")
def load_sample():
    batch_id = generate_sample_data()
    return {"batch_id": batch_id, "message": "示例数据已加载"}


@app.get("/api/batches")
def list_batches():
    return {"batches": store.list_batches()}


@app.post("/api/import")
async def import_file(file: UploadFile = File(...), batch_id: Optional[str] = Query(None)):
    if not batch_id:
        batch_id = f"BATCH_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        rows = df.to_dict("records")
        ids = import_from_rows(rows, batch_id)
        return {"batch_id": batch_id, "count": len(ids), "message": f"成功导入 {len(ids)} 条记录"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"导入失败：{str(e)}")


@app.get("/api/payments")
def list_payments(batch_id: Optional[str] = None):
    payments = store.list_payments(batch_id)
    return {"payments": [_serialize_payment(p) for p in payments]}


@app.get("/api/payments/{payment_id}")
def get_payment(payment_id: str):
    p = store.get_payment(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="记录不存在")
    return _serialize_payment(p)


@app.get("/api/payments/{payment_id}/history")
def get_history(payment_id: str):
    p = store.get_payment(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"history": [_serialize_history(h) for h in p.history]}


@app.post("/api/replay")
def replay(batch_id: str):
    results, summary = replay_batch(batch_id)
    return {
        "summary": summary.model_dump(mode="json"),
        "results": [_serialize_replay_result(r) for r in results],
    }


@app.post("/api/payments/{payment_id}/status")
def manual_change_status(
    payment_id: str,
    new_status: str,
    operator: str = "老许",
    remark: Optional[str] = None,
    screenshot_ref: Optional[str] = None,
):
    try:
        status_enum = PaymentStatus[new_status]
    except KeyError:
        try:
            status_enum = PaymentStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"无效状态: {new_status}，可用: {list(PaymentStatus.__members__.keys())}")
    result = change_status(
        payment_id,
        status_enum,
        ChangeSource.MANUAL_ADJUST,
        operator=operator,
        remark=remark,
        screenshot_ref=screenshot_ref,
        detail="人工改判",
    )
    if not result:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "状态已更新", "payment": _serialize_payment(result)}


@app.post("/api/payments/{payment_id}/remark")
def add_payment_remark(
    payment_id: str,
    remark: str,
    operator: str = "老许",
    screenshot_ref: Optional[str] = None,
):
    result = add_remark(payment_id, remark, operator=operator, screenshot_ref=screenshot_ref)
    if not result:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "备注已添加", "payment": _serialize_payment(result)}


@app.post("/api/payments/{payment_id}/voucher")
def set_voucher(
    payment_id: str,
    voucher_no: str,
    operator: str = "老许",
):
    result = update_voucher(payment_id, voucher_no, operator=operator)
    if not result:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "凭证已录入", "payment": _serialize_payment(result)}


@app.get("/api/report/{batch_id}", response_class=PlainTextResponse)
def export_report(batch_id: str):
    payments = store.list_payments(batch_id)
    if not payments:
        raise HTTPException(status_code=404, detail="批次不存在")
    results, summary = replay_batch(batch_id)
    md = generate_markdown_report(batch_id, results, summary)
    return md


@app.get("/api/status-options")
def status_options():
    return {s.name: s.value for s in PaymentStatus}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
