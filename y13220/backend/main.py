import json
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from database import init_db, get_conn
from field_mapper import normalize_record, ensure_required
from status_manager import update_track_status, add_authorization_note, row_to_dict, status_label
from report_generator import generate_markdown

app = FastAPI(title="鼓组节拍版本复核系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


class TrackImportItem(BaseModel):
    raw: Dict[str, Any]


class TrackImportRequest(BaseModel):
    records: List[Dict[str, Any]]


class StatusUpdateRequest(BaseModel):
    status: str
    operator: str = "system"
    remark: Optional[str] = None


class AuthNoteRequest(BaseModel):
    note: str
    impact_scope: Optional[str] = None
    operator: str = "复核人"


class FieldMappingRequest(BaseModel):
    incoming_field: str
    standard_field: str


@app.on_event("startup")
def on_startup():
    init_db()
    seed_demo_data()


def seed_demo_data():
    with get_conn() as conn:
        c = conn.execute("SELECT COUNT(*) FROM review_tracks").fetchone()[0]
        if c > 0:
            return
    demo_records = [
        {"文件名": "Drum_001_v2.wav", "曲目名称": "开场序曲", "鼓组版本": "v2", "数据来源": "林姐曲目表A", "行号": 2,
         "处理状态": "passed"},
        {"文件名": "Drum_002_v3.wav", "曲目名称": "主题旋律", "鼓组版本": "v3", "数据来源": "林姐曲目表A", "行号": 3,
         "处理状态": "reviewing"},
        {"fileName": "Drum_003_v1.wav", "trackName": "过渡段落", "beatVersion": "v1", "source": "复核人新提交B",
         "source_row": 5, "process_status": "mismatch"},
        {"曲目名": "高潮部分", "曲目编号": "T004", "节拍版本": "v2", "来源": "林姐曲目表A",
         "来源行号": 7, "状态": "pending", "授权到期日": "2026-05-30"},
        {"文件名": "Drum_005_v4.wav", "曲目名称": "尾声", "鼓组版本": "v4", "数据来源": "复核人新提交B",
         "行号": 11, "处理状态": "expired", "授权到期日": "2026-06-10"},
    ]
    for raw in demo_records:
        normalized = ensure_required(normalize_record(raw))
        with get_conn() as conn:
            conn.execute(
                """INSERT INTO review_tracks
                   (file_name, track_name, track_code, beat_version, source, source_row,
                    process_status, authorization_expire_date, authorization_note, impact_scope, raw_fields)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    normalized.get("file_name") or normalized.get("track_name") or "未命名文件",
                    normalized.get("track_name"),
                    normalized.get("track_code"),
                    normalized.get("beat_version"),
                    normalized["source"],
                    int(normalized["source_row"]) if normalized["source_row"] else 0,
                    normalized["process_status"],
                    normalized.get("authorization_expire_date"),
                    normalized.get("authorization_note"),
                    normalized.get("impact_scope"),
                    normalized["raw_fields"],
                )
            )
            track_id = conn.execute("SELECT last_insert_rowid() as id").fetchone()["id"]
            if normalized["process_status"] != "pending":
                conn.execute(
                    "INSERT INTO status_logs (track_id, old_status, new_status, operator, remark) VALUES (?, ?, ?, ?, ?)",
                    (track_id, None, normalized["process_status"], "seed", "演示数据初始化")
                )


@app.get("/")
def index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.get("/api/tracks")
def list_tracks(
    status: Optional[str] = Query(None, description="按状态过滤"),
    source: Optional[str] = Query(None, description="按来源过滤"),
    keyword: Optional[str] = Query(None, description="文件名/曲目名模糊搜索"),
):
    sql = "SELECT * FROM review_tracks WHERE 1=1"
    params = []
    if status:
        sql += " AND process_status = ?"
        params.append(status)
    if source:
        sql += " AND source LIKE ?"
        params.append(f"%{source}%")
    if keyword:
        sql += " AND (file_name LIKE ? OR track_name LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%"])
    sql += " ORDER BY id DESC"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {
        "total": len(rows),
        "items": [row_to_dict(r) for r in rows]
    }


@app.get("/api/tracks/{track_id}")
def get_track(track_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM review_tracks WHERE id = ?", (track_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
        logs = conn.execute(
            "SELECT * FROM status_logs WHERE track_id = ? ORDER BY id DESC", (track_id,)
        ).fetchall()
    result = row_to_dict(row)
    result["logs"] = [dict(l) for l in logs]
    raw_fields = result.get("raw_fields")
    if raw_fields:
        try:
            result["raw_fields_parsed"] = json.loads(raw_fields)
        except Exception:
            result["raw_fields_parsed"] = {}
    return result


@app.post("/api/tracks/import")
def import_tracks(req: TrackImportRequest):
    inserted = []
    errors = []
    for idx, raw in enumerate(req.records):
        try:
            normalized = ensure_required(normalize_record(raw))
            with get_conn() as conn:
                cur = conn.execute(
                    """INSERT INTO review_tracks
                       (file_name, track_name, track_code, beat_version, source, source_row,
                        process_status, authorization_expire_date, authorization_note, impact_scope, raw_fields)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        normalized.get("file_name") or normalized.get("track_name") or f"未命名_{idx+1}",
                        normalized.get("track_name"),
                        normalized.get("track_code"),
                        normalized.get("beat_version"),
                        normalized["source"],
                        int(normalized["source_row"]) if normalized["source_row"] else idx + 1,
                        normalized["process_status"],
                        normalized.get("authorization_expire_date"),
                        normalized.get("authorization_note"),
                        normalized.get("impact_scope"),
                        normalized["raw_fields"],
                    )
                )
                track_id = cur.lastrowid
                conn.execute(
                    "INSERT INTO status_logs (track_id, old_status, new_status, operator, remark) VALUES (?, ?, ?, ?, ?)",
                    (track_id, None, normalized["process_status"], "import", f"第{idx+1}条导入")
                )
                inserted.append({"index": idx + 1, "id": track_id, "source": normalized["source"]})
        except Exception as e:
            errors.append({"index": idx + 1, "error": str(e)})
    return {"inserted": len(inserted), "errors": errors, "items": inserted}


@app.patch("/api/tracks/{track_id}/status")
def change_status(track_id: int, req: StatusUpdateRequest):
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM review_tracks WHERE id = ?", (track_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
    update_track_status(track_id, req.status, req.operator, req.remark)
    return {"ok": True, "track_id": track_id, "new_status": req.status, "status_label": status_label(req.status)}


@app.post("/api/tracks/{track_id}/authorization-note")
def add_note(track_id: int, req: AuthNoteRequest):
    result = add_authorization_note(track_id, req.note, req.impact_scope, req.operator)
    if result is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM review_tracks WHERE id = ?", (track_id,)).fetchone()
    return {"ok": True, "track": row_to_dict(row)}


@app.get("/api/tracks/{track_id}/logs")
def get_logs(track_id: int):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM status_logs WHERE track_id = ? ORDER BY id DESC", (track_id,)
        ).fetchall()
    return {"track_id": track_id, "logs": [dict(r) for r in rows]}


@app.get("/api/stats")
def get_stats():
    with get_conn() as conn:
        by_status = conn.execute(
            "SELECT process_status, COUNT(*) as cnt FROM review_tracks GROUP BY process_status"
        ).fetchall()
        by_source = conn.execute(
            "SELECT source, COUNT(*) as cnt FROM review_tracks GROUP BY source"
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) as cnt FROM review_tracks").fetchone()["cnt"]
    return {
        "total": total,
        "by_status": [{"status": r["process_status"], "label": status_label(r["process_status"]), "count": r["cnt"]}
                      for r in by_status],
        "by_source": [dict(r) for r in by_source],
    }


@app.get("/api/report/markdown")
def export_markdown(status: Optional[str] = Query(None)):
    content = generate_markdown(status)
    return PlainTextResponse(content, media_type="text/markdown; charset=utf-8")


@app.get("/api/report/download")
def download_markdown(status: Optional[str] = Query(None)):
    content = generate_markdown(status)
    path = os.path.join(os.path.dirname(__file__), "tmp_report.md")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return FileResponse(path, filename="鼓组节拍版本复核报告.md", media_type="text/markdown")


@app.get("/api/field-mappings")
def list_mappings():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM field_mappings ORDER BY standard_field, incoming_field").fetchall()
    return {"items": [dict(r) for r in rows]}


@app.post("/api/field-mappings")
def add_mapping(req: FieldMappingRequest):
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO field_mappings (incoming_field, standard_field) VALUES (?, ?)",
                (req.incoming_field.strip(), req.standard_field.strip())
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"映射添加失败（可能已存在）：{e}")
    return {"ok": True, "incoming_field": req.incoming_field, "standard_field": req.standard_field}


@app.get("/api/status-options")
def status_options():
    from status_manager import STATUS_LABELS
    return [{"value": k, "label": v} for k, v in STATUS_LABELS.items()]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
