import os
import io
import hashlib
import csv
import tempfile
import shutil
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import (
    AnomalyStatus, AnomalyType, MatchStatus,
    ImportBatch, TracklistItem, RecordingFile,
    RemarkHistory, StatusChange, Judgment, TimecodeAnomaly
)
from storage import Storage
from anomaly_engine import AnomalyEngine
from report import ReportGenerator
from schemas import (
    TracklistRow, RecordingFileRow,
    ImportTracklistRequest, ImportFilesRequest,
    DetectionRequest, DetectionResultResponse,
    RemarkAppendRequest, JudgmentRequest, LicenseWaiveRequest,
    StatusChangeResponse, AnomalyResponse, AlignmentStatusResponse,
    ReportGenerateRequest, ReportInfoResponse,
    BatchSummary, ApiResponse, ApiError
)

DB_PATH = os.environ.get("TIMECODE_DB", "timecode_anomaly_api.db")
UPLOAD_DIR = os.environ.get("TIMECODE_UPLOAD_DIR", "uploads")
REPORT_DIR = os.environ.get("TIMECODE_REPORT_DIR", "reports")
STATIC_DIR = os.environ.get("TIMECODE_STATIC_DIR", "static")

for d in [UPLOAD_DIR, REPORT_DIR, STATIC_DIR]:
    os.makedirs(d, exist_ok=True)

app = FastAPI(
    title="录音棚时码异常提醒 API",
    description="Python FastAPI + SQLite 后端，支持导入、检测、改判、补备注、授权豁免、报告生成下载",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_storage() -> Storage:
    return Storage(DB_PATH)


def get_engine(storage: Storage = Depends(get_storage)) -> AnomalyEngine:
    return AnomalyEngine(storage)


def get_reporter(storage: Storage = Depends(get_storage),
                 engine: AnomalyEngine = Depends(get_engine)) -> ReportGenerator:
    return ReportGenerator(storage, engine)


# ======================= 首页 =======================
@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def index_page():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse(content="""
    <h1>录音棚时码异常提醒 API</h1>
    <p><a href='/docs'>API 文档</a> | <a href='/redoc'>ReDoc</a></p>
    <p>请在 /static/index.html 部署前端页面</p>
    """)


# ======================= 导入 API =======================
@app.post("/api/import/tracklist", response_model=ApiResponse[BatchSummary])
def api_import_tracklist(req: ImportTracklistRequest,
                         engine: AnomalyEngine = Depends(get_engine)):
    try:
        rows = []
        for idx, r in enumerate(req.rows):
            rows.append({
                "track_no": r.track_no,
                "track_title": r.track_title,
                "expected_filename": r.expected_filename,
                "duration": r.duration,
                "source_line_no": r.source_line_no or (idx + 2),
                "notes": r.notes or "",
                "version_screenshot_path": r.version_screenshot_path or ""
            })
        batch = engine.import_tracklist(
            rows, source_ref=req.source_ref,
            operator=req.operator, note=req.note or ""
        )
        return ApiResponse(
            data=BatchSummary(
                batch_id=batch.batch_id,
                source_type=batch.source_type,
                source_ref=batch.source_ref,
                count=batch.track_count,
                operator=batch.operator,
                created_at=batch.created_at
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/import/files", response_model=ApiResponse[BatchSummary])
def api_import_files(req: ImportFilesRequest,
                     engine: AnomalyEngine = Depends(get_engine)):
    try:
        rows = []
        for r in req.rows:
            file_path = r.file_path or os.path.join(UPLOAD_DIR, r.filename)
            file_hash = r.file_hash or hashlib.md5(r.filename.encode()).hexdigest()
            rows.append({
                "filename": r.filename,
                "file_path": file_path,
                "file_hash": file_hash,
                "timecode": r.timecode,
                "duration": r.duration
            })
        batch = engine.import_recording_files(
            rows, source_ref=req.source_ref,
            operator=req.operator, note=req.note or ""
        )
        return ApiResponse(
            data=BatchSummary(
                batch_id=batch.batch_id,
                source_type=batch.source_type,
                source_ref=batch.source_ref,
                count=batch.file_count,
                operator=batch.operator,
                created_at=batch.created_at
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================= CSV 批量导入 =======================
@app.post("/api/import/tracklist/csv", response_model=ApiResponse[BatchSummary])
async def api_import_tracklist_csv(
    file: UploadFile = File(...),
    source_ref: str = Query(..., description="来源引用（如 Excel 文件名+行范围）"),
    operator: str = Query(..., description="操作人"),
    note: Optional[str] = Query("", description="备注"),
    engine: AnomalyEngine = Depends(get_engine)
):
    try:
        content = await file.read()
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for idx, row in enumerate(reader, start=1):
            rows.append({
                "track_no": int(row.get("track_no", row.get("曲目号", idx))),
                "track_title": str(row.get("track_title", row.get("曲目名", ""))).strip(),
                "expected_filename": str(row.get("expected_filename", row.get("期望文件名", ""))).strip(),
                "duration": str(row.get("duration", row.get("时长", ""))).strip(),
                "source_line_no": int(row.get("source_line_no", idx + 1)),
                "notes": str(row.get("notes", row.get("备注", ""))).strip(),
                "version_screenshot_path": str(row.get("version_screenshot_path", row.get("截图路径", ""))).strip()
            })
        batch = engine.import_tracklist(
            rows, source_ref=f"{source_ref} · 文件:{file.filename}",
            operator=operator, note=note
        )
        return ApiResponse(
            message=f"成功导入 {len(rows)} 条曲目表（来自 CSV {file.filename}）",
            data=BatchSummary(
                batch_id=batch.batch_id, source_type=batch.source_type,
                source_ref=batch.source_ref, count=batch.track_count,
                operator=batch.operator, created_at=batch.created_at
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 解析失败: {e}")


@app.post("/api/import/files/csv", response_model=ApiResponse[BatchSummary])
async def api_import_files_csv(
    file: UploadFile = File(...),
    source_ref: str = Query(..., description="来源引用"),
    operator: str = Query(..., description="操作人"),
    note: Optional[str] = Query("", description="备注"),
    engine: AnomalyEngine = Depends(get_engine)
):
    try:
        content = await file.read()
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for row in reader:
            fname = str(row.get("filename", row.get("文件名", ""))).strip()
            file_hash = str(row.get("file_hash", row.get("hash", row.get("哈希", "")))).strip()
            if not file_hash:
                file_hash = hashlib.md5(fname.encode()).hexdigest()
            rows.append({
                "filename": fname,
                "file_path": str(row.get("file_path", row.get("路径", fname))).strip(),
                "file_hash": file_hash,
                "timecode": str(row.get("timecode", row.get("时码", ""))).strip(),
                "duration": str(row.get("duration", row.get("时长", ""))).strip()
            })
        batch = engine.import_recording_files(
            rows, source_ref=f"{source_ref} · 文件:{file.filename}",
            operator=operator, note=note
        )
        return ApiResponse(
            message=f"成功导入 {len(rows)} 条录音文件（来自 CSV {file.filename}）",
            data=BatchSummary(
                batch_id=batch.batch_id, source_type=batch.source_type,
                source_ref=batch.source_ref, count=batch.file_count,
                operator=batch.operator, created_at=batch.created_at
            )
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 解析失败: {e}")


# ======================= 检测与匹配 =======================
@app.post("/api/detect", response_model=ApiResponse[DetectionResultResponse])
def api_run_detection(req: DetectionRequest,
                      engine: AnomalyEngine = Depends(get_engine)):
    try:
        result = engine.run_matching_and_detection(
            track_batch_id=req.track_batch_id,
            file_batch_id=req.file_batch_id,
            operator=req.operator or "api-user"
        )
        return ApiResponse(
            message=f"检测完成：新增 {result.anomalies_created} 条异常",
            data=DetectionResultResponse(
                batch_id=result.batch_id,
                tracks_imported=result.tracks_imported,
                files_imported=result.files_imported,
                anomalies_created=result.anomalies_created,
                unmatched_files=result.unmatched_files,
                unmatched_tracks=result.unmatched_tracks,
                warning_messages=result.warning_messages
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================= 查询 API =======================
@app.get("/api/anomalies", response_model=ApiResponse[List[AnomalyResponse]])
def api_list_anomalies(
    status: Optional[str] = Query(None, description="按状态过滤：待处理/已确认/已解决/已驳回/已授权豁免"),
    storage: Storage = Depends(get_storage)
):
    try:
        status_enum = None
        if status:
            for s in AnomalyStatus:
                if s.value == status:
                    status_enum = s
                    break
            if not status_enum:
                raise ValueError(f"无效状态: {status}")
        anomalies = storage.list_anomalies(status_enum)
        result = []
        for a in anomalies:
            result.append(AnomalyResponse(
                id=a.id, anomaly_type=a.anomaly_type.value,
                title=a.title, description=a.description,
                status=a.status.value, track_id=a.track_id, file_id=a.file_id,
                source_file_line=a.source_file_line, impact_scope=a.impact_scope,
                matched_track_title=a.matched_track_title,
                matched_filename=a.matched_filename,
                current_judgment=a.current_judgment,
                current_snapshot=a.current_snapshot,
                latest_remark=a.latest_remark,
                latest_remark_at=a.latest_remark_at,
                created_at=a.created_at, updated_at=a.updated_at,
                remarks=[
                    RemarkResponse(
                        id=r.id, anomaly_id=r.anomaly_id, remark_type=r.remark_type,
                        content=r.content, source=r.source, operator=r.operator,
                        attachment_path=r.attachment_path, created_at=r.created_at
                    ) for r in a.remarks
                ],
                status_history=[
                    StatusChangeItem(
                        id=sc.id, anomaly_id=sc.anomaly_id,
                        from_status=sc.from_status.value, to_status=sc.to_status.value,
                        reason=sc.reason, operator=sc.operator, created_at=sc.created_at
                    ) for sc in a.status_history
                ],
                judgments=[
                    JudgmentItem(
                        id=j.id, anomaly_id=j.anomaly_id,
                        judgment_text=j.judgment_text, source_ref=j.source_ref,
                        impact_scope=j.impact_scope, is_favorable=j.is_favorable,
                        operator=j.operator, created_at=j.created_at
                    ) for j in a.judgments
                ]
            ))
        return ApiResponse(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/anomalies/{anomaly_id}", response_model=ApiResponse[AnomalyResponse])
def api_get_anomaly(anomaly_id: int, storage: Storage = Depends(get_storage)):
    a = storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    return ApiResponse(data=AnomalyResponse(
        id=a.id, anomaly_type=a.anomaly_type.value,
        title=a.title, description=a.description,
        status=a.status.value, track_id=a.track_id, file_id=a.file_id,
        source_file_line=a.source_file_line, impact_scope=a.impact_scope,
        matched_track_title=a.matched_track_title,
        matched_filename=a.matched_filename,
        current_judgment=a.current_judgment,
        current_snapshot=a.current_snapshot,
        latest_remark=a.latest_remark,
        latest_remark_at=a.latest_remark_at,
        created_at=a.created_at, updated_at=a.updated_at,
        remarks=[
            RemarkResponse(
                id=r.id, anomaly_id=r.anomaly_id, remark_type=r.remark_type,
                content=r.content, source=r.source, operator=r.operator,
                attachment_path=r.attachment_path, created_at=r.created_at
            ) for r in a.remarks
        ],
        status_history=[
            StatusChangeItem(
                id=sc.id, anomaly_id=sc.anomaly_id,
                from_status=sc.from_status.value, to_status=sc.to_status.value,
                reason=sc.reason, operator=sc.operator, created_at=sc.created_at
            ) for sc in a.status_history
        ],
        judgments=[
            JudgmentItem(
                id=j.id, anomaly_id=j.anomaly_id,
                judgment_text=j.judgment_text, source_ref=j.source_ref,
                impact_scope=j.impact_scope, is_favorable=j.is_favorable,
                operator=j.operator, created_at=j.created_at
            ) for j in a.judgments
        ]
    ))


@app.get("/api/alignment", response_model=ApiResponse[AlignmentStatusResponse])
def api_get_alignment(engine: AnomalyEngine = Depends(get_engine)):
    align = engine.get_alignment_status()
    return ApiResponse(data=AlignmentStatusResponse(**align))


@app.get("/api/batches", response_model=ApiResponse[List[BatchSummary]])
def api_list_batches(storage: Storage = Depends(get_storage)):
    batches = storage.list_batches()
    return ApiResponse(data=[
        BatchSummary(
            batch_id=b.batch_id, source_type=b.source_type,
            source_ref=b.source_ref,
            count=b.track_count if b.source_type == "tracklist" else b.file_count,
            operator=b.operator, created_at=b.created_at
        ) for b in batches
    ])


# ======================= 改判 API =======================
@app.post("/api/anomalies/{anomaly_id}/confirm",
          response_model=ApiResponse[StatusChangeResponse])
def api_confirm_anomaly(anomaly_id: int, req: JudgmentRequest,
                        engine: AnomalyEngine = Depends(get_engine)):
    if anomaly_id != req.anomaly_id:
        raise HTTPException(status_code=400, detail="anomaly_id 不一致")
    a = engine.storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    result = engine.confirm_anomaly(
        anomaly_id, operator=req.operator,
        judgment_text=req.judgment_text, source_ref=req.source_ref,
        impact_scope=req.impact_scope or ""
    )
    return ApiResponse(
        message=result.message,
        data=StatusChangeResponse(
            success=result.success, anomaly_id=result.anomaly_id,
            from_status=result.from_status.value,
            to_status=result.to_status.value,
            message=result.message
        )
    )


@app.post("/api/anomalies/{anomaly_id}/resolve",
          response_model=ApiResponse[StatusChangeResponse])
def api_resolve_anomaly(anomaly_id: int, req: JudgmentRequest,
                        engine: AnomalyEngine = Depends(get_engine)):
    if anomaly_id != req.anomaly_id:
        raise HTTPException(status_code=400, detail="anomaly_id 不一致")
    a = engine.storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    result = engine.resolve_anomaly(
        anomaly_id, operator=req.operator,
        judgment_text=req.judgment_text, source_ref=req.source_ref,
        impact_scope=req.impact_scope or ""
    )
    return ApiResponse(
        message=result.message,
        data=StatusChangeResponse(
            success=result.success, anomaly_id=result.anomaly_id,
            from_status=result.from_status.value,
            to_status=result.to_status.value,
            message=result.message
        )
    )


@app.post("/api/anomalies/{anomaly_id}/dismiss",
          response_model=ApiResponse[StatusChangeResponse])
def api_dismiss_anomaly(anomaly_id: int, req: JudgmentRequest,
                        engine: AnomalyEngine = Depends(get_engine)):
    if anomaly_id != req.anomaly_id:
        raise HTTPException(status_code=400, detail="anomaly_id 不一致")
    a = engine.storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    result = engine.dismiss_anomaly(
        anomaly_id, operator=req.operator,
        judgment_text=req.judgment_text, source_ref=req.source_ref
    )
    return ApiResponse(
        message=result.message,
        data=StatusChangeResponse(
            success=result.success, anomaly_id=result.anomaly_id,
            from_status=result.from_status.value,
            to_status=result.to_status.value,
            message=result.message
        )
    )


@app.post("/api/anomalies/{anomaly_id}/waive",
          response_model=ApiResponse[StatusChangeResponse])
def api_waive_anomaly(anomaly_id: int, req: LicenseWaiveRequest,
                      engine: AnomalyEngine = Depends(get_engine)):
    if anomaly_id != req.anomaly_id:
        raise HTTPException(status_code=400, detail="anomaly_id 不一致")
    a = engine.storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    result = engine.waive_anomaly_by_license(
        anomaly_id, operator=req.operator,
        license_remark=req.license_remark,
        source_ref=req.source_ref or "演出统筹授权"
    )
    return ApiResponse(
        message=result.message,
        data=StatusChangeResponse(
            success=result.success, anomaly_id=result.anomaly_id,
            from_status=result.from_status.value,
            to_status=result.to_status.value,
            message=result.message
        )
    )


# ======================= 追加备注 =======================
@app.post("/api/anomalies/{anomaly_id}/remarks",
          response_model=ApiResponse[RemarkResponse])
def api_append_remark(anomaly_id: int, req: RemarkAppendRequest,
                      engine: AnomalyEngine = Depends(get_engine)):
    if anomaly_id != req.anomaly_id:
        raise HTTPException(status_code=400, detail="anomaly_id 不一致")
    a = engine.storage.get_anomaly(anomaly_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"异常 #{anomaly_id} 不存在")
    rid = engine.append_supplementary_remark(
        anomaly_id, content=req.content, source=req.source,
        operator=req.operator, attachment_path=req.attachment_path or ""
    )
    a2 = engine.storage.get_anomaly(anomaly_id)
    remark = next((r for r in a2.remarks if r.id == rid), None)
    if not remark:
        raise HTTPException(status_code=500, detail="备注追加失败")
    return ApiResponse(
        message=f"后补备注成功（ID={rid}），此异常累计 {len(a2.remarks)} 条备注",
        data=RemarkResponse(
            id=remark.id, anomaly_id=remark.anomaly_id,
            remark_type=remark.remark_type, content=remark.content,
            source=remark.source, operator=remark.operator,
            attachment_path=remark.attachment_path,
            created_at=remark.created_at
        )
    )


# ======================= 报告 API =======================
@app.post("/api/report/generate", response_model=ApiResponse[ReportInfoResponse])
def api_generate_report(req: ReportGenerateRequest,
                        reporter: ReportGenerator = Depends(get_reporter)):
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"timecode_anomaly_report_{ts}.md"
        fpath = os.path.join(REPORT_DIR, fname)
        output_path = reporter.save_report(
            fpath,
            report_title=req.report_title,
            include_resolved=req.include_resolved,
            operator_context=req.operator_context
        )
        with open(output_path, "r", encoding="utf-8") as f:
            word_count = len(f.read())
        return ApiResponse(
            message=f"报告已生成：{fname}",
            data=ReportInfoResponse(
                report_path=output_path,
                download_url=f"/api/report/download/{fname}",
                word_count=word_count,
                generated_at=datetime.now()
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/report/download/{filename}")
async def api_download_report(filename: str):
    fpath = os.path.join(REPORT_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail=f"报告文件不存在: {filename}")
    return FileResponse(
        fpath,
        media_type="text/markdown; charset=utf-8",
        filename=filename
    )


@app.get("/api/reports", response_model=ApiResponse[List[ReportInfoResponse]])
def api_list_reports():
    try:
        reports = []
        for fname in sorted(os.listdir(REPORT_DIR), reverse=True):
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(REPORT_DIR, fname)
            mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
            with open(fpath, "r", encoding="utf-8") as f:
                wc = len(f.read())
            reports.append(ReportInfoResponse(
                report_path=fpath,
                download_url=f"/api/report/download/{fname}",
                word_count=wc,
                generated_at=mtime
            ))
        return ApiResponse(data=reports)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================= 文件上传 =======================
@app.post("/api/upload/screenshot", response_model=ApiResponse[dict])
async def api_upload_screenshot(file: UploadFile = File(...),
                                anomaly_id: Optional[int] = Query(None),
                                operator: str = Query("api-user")):
    try:
        allowed = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式：{ext}，仅支持 {sorted(allowed)}"
            )
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = f"{ts}_{anomaly_id or 'na'}_{file.filename.replace('/', '_')}"
        save_path = os.path.join(UPLOAD_DIR, safe_name)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="文件超过 10MB 限制")
        with open(save_path, "wb") as f:
            f.write(content)
        return ApiResponse(
            message=f"上传成功：{file.filename} ({len(content)} 字节)",
            data={
                "original_name": file.filename,
                "saved_path": save_path,
                "size_bytes": len(content),
                "download_url": f"/api/download/{safe_name}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {e}")


@app.get("/api/download/{filename}")
async def api_download_file(filename: str):
    fpath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail=f"文件不存在: {filename}")
    return FileResponse(fpath, filename=filename)


# ======================= 健康检查 / 诊断 =======================
@app.get("/api/health")
def api_health(storage: Storage = Depends(get_storage),
               engine: AnomalyEngine = Depends(get_engine)):
    snap = storage.export_state_snapshot()
    align = engine.get_alignment_status()
    return {
        "status": "ok",
        "db_path": DB_PATH,
        "uptime_snapshot": snap["exported_at"],
        "counts": snap["counts"],
        "alignment": align
    }


@app.get("/api/state", response_model=ApiResponse[dict])
def api_state_snapshot(storage: Storage = Depends(get_storage)):
    return ApiResponse(data=storage.export_state_snapshot())


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.status_code,
            "message": exc.detail,
            "detail": str(exc)
        }
    )
