from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from .models import ReviewResult, AnnotationRequest, ReviewResponse
from .review_engine import run_review, InvalidFolderPathError
from .storage import review_store, folder_store
from .rules import DEFAULT_CALCULATION_RULE
from .parser import parse_audio_folder, InvalidFolderPathError as ParserPathError
from .chart_builder import build_chart_data, compare_versions
from .exporter import (
    export_review_json, export_progress_csv, export_anomalies_csv, save_exports_to_disk
)

app = FastAPI(title="琴房课时版本复核", version="1.0.0")


def _build_export_info(result: ReviewResult) -> Dict:
    try:
        saved = save_exports_to_disk(result)
    except Exception:
        saved = {}
    return {
        "saved_files": saved,
        "download": {
            "json": f"/api/review/{result.review_id}/export/json",
            "progress_csv": f"/api/review/{result.review_id}/export/progress.csv",
            "anomalies_csv": f"/api/review/{result.review_id}/export/anomalies.csv"
        }
    }


@app.post("/api/review/start")
def start_review(
    folder_path: str = Query(..., description="音频文件夹记录文件路径"),
    folder_name: str = Query(..., description="文件夹名称标识")
):
    try:
        existing = review_store.list_by_folder(folder_path)
        previous_id = existing[0]["review_id"] if existing else None

        result = run_review(
            folder_path=folder_path,
            folder_name=folder_name,
            previous_review_id=previous_id
        )
    except (InvalidFolderPathError, ParserPathError) as e:
        raise HTTPException(status_code=400, detail={
            "code": "INVALID_FOLDER_PATH",
            "message": str(e),
            "hint": "请核对 folder_path 路径是否正确、文件是否存在且可读取，路径必须指向记录.txt文件"
        })

    review_store.save(result)
    export_info = _build_export_info(result)

    return {
        "review_id": result.review_id,
        "status": result.status,
        "review_time": result.review_time,
        "folder_path": result.folder_path,
        "total_files": result.total_files,
        "valid_files": result.valid_files,
        "invalid_files": result.invalid_files,
        "anomalies_count": len(result.anomalies),
        "message": f"复核完成，状态: {result.status}，异常数: {len(result.anomalies)}",
        "exports": export_info
    }


@app.post("/api/review/rerun")
def rerun_review(
    review_id: str = Query(..., description="要重跑的复核ID"),
    annotation: Optional[str] = Query(None, description="排练或授权备注"),
    delivery_list_version: Optional[str] = Query(None, description="交付清单版本")
):
    existing = review_store.get(review_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")

    folder_name = existing.folder_path.split('/')[-1].replace('.txt', '')
    try:
        result = run_review(
            folder_path=existing.folder_path,
            folder_name=folder_name,
            previous_review_id=review_id,
            annotation=annotation,
            delivery_list_version=delivery_list_version
        )
    except (InvalidFolderPathError, ParserPathError) as e:
        raise HTTPException(status_code=400, detail={
            "code": "INVALID_FOLDER_PATH",
            "message": str(e),
            "hint": "旧版本的 folder_path 已失效，请重新通过 /api/review/start 启动复核"
        })

    review_store.save(result)
    export_info = _build_export_info(result)

    return {
        "review_id": result.review_id,
        "status": result.status,
        "review_time": result.review_time,
        "previous_review_id": result.previous_review_id,
        "folder_path": result.folder_path,
        "annotation": result.annotation,
        "delivery_list_version": result.delivery_list_version,
        "anomalies_count": len(result.anomalies),
        "message": f"重跑完成，状态: {result.status}，基于旧版本: {review_id}",
        "exports": export_info
    }



@app.get("/api/review/{review_id}")
def get_review(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    return result


@app.get("/api/review/{review_id}/chart")
def get_review_chart(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")

    chart_data = build_chart_data(result)
    chart_data["version_tracking"] = {
        "current_review_id": result.review_id,
        "previous_review_id": result.previous_review_id,
        "annotation": result.annotation,
        "delivery_list_version": result.delivery_list_version,
        "all_history": review_store.list_by_folder(result.folder_path)
    }

    if result.previous_review_id:
        prev_result = review_store.get(result.previous_review_id)
        chart_data["version_comparison"] = compare_versions(result, prev_result)

    return JSONResponse(content=chart_data)


@app.get("/api/review/{review_id}/compare/{previous_id}")
def compare_two_reviews(review_id: str, previous_id: str):
    current = review_store.get(review_id)
    previous = review_store.get(previous_id)

    if not current:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    if not previous:
        raise HTTPException(status_code=404, detail=f"复核记录 {previous_id} 不存在")

    return compare_versions(current, previous)


@app.get("/api/review/{review_id}/anomaly/{raw_line}")
def get_anomaly_context(review_id: str, raw_line: int):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")

    anomalies = [a for a in result.anomalies if a.raw_line == raw_line]
    records = [r for r in result.progress_records if r.raw_line == raw_line]

    context = {
        "review_id": review_id,
        "folder_path": result.folder_path,
        "raw_line": raw_line,
        "calculation_rule": {
            "name": result.calculation_rule.name,
            "version": result.calculation_rule.version,
            "formula": result.calculation_rule.formula
        },
        "anomalies": anomalies,
        "progress_record": records[0] if records else None,
        "click_back": {
            "folder_path": result.folder_path,
            "raw_line": raw_line,
            "file_uri": f"file://{result.folder_path}#L{raw_line}"
        }
    }
    return context


@app.post("/api/review/{review_id}/annotate")
def add_annotation(review_id: str, request: AnnotationRequest):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")

    result.annotation = request.annotation
    result.delivery_list_version = request.delivery_list_version
    review_store.save(result)

    return {"status": "success", "review_id": review_id, "message": "批注已保存"}


@app.get("/api/review/folder/{folder_path:path}")
def list_reviews_by_folder(folder_path: str):
    history = review_store.list_by_folder(folder_path)
    if not history:
        return {"folder_path": folder_path, "history": [], "message": "该文件夹暂无复核记录"}
    return {"folder_path": folder_path, "history": history}


@app.get("/api/folder/scan")
def scan_folder(
    folder_path: str = Query(..., description="音频文件夹记录文件路径"),
    folder_name: str = Query(..., description="文件夹名称标识")
):
    try:
        folder, anomalies = parse_audio_folder(folder_path, folder_name)
    except ParserPathError as e:
        raise HTTPException(status_code=400, detail={
            "code": "INVALID_FOLDER_PATH",
            "message": str(e),
            "hint": "请核对 folder_path 路径是否正确、文件是否存在且可读取"
        })
    folder_store.save(folder)
    return {
        "folder_name": folder.folder_name,
        "folder_path": folder.folder_path,
        "total_files": len(folder.files),
        "scan_time": folder.scan_time,
        "parse_anomalies": anomalies,
        "files": [
            {
                "filename": f.filename,
                "student_name": f.student_name,
                "teacher_name": f.teacher_name,
                "raw_line": f.raw_line,
                "is_master_tape": f.is_master_tape
            }
            for f in folder.files
        ]
    }


@app.get("/api/calculation-rule")
def get_calculation_rule():
    return DEFAULT_CALCULATION_RULE


@app.get("/api/review/{review_id}/export/json")
def download_json(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    filename, content = export_review_json(result)
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@app.get("/api/review/{review_id}/export/progress.csv")
def download_progress_csv(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    filename, content = export_progress_csv(result)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@app.get("/api/review/{review_id}/export/anomalies.csv")
def download_anomalies_csv(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    filename, content = export_anomalies_csv(result)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@app.get("/api/review/{review_id}/export")
def list_exports(review_id: str):
    result = review_store.get(review_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"复核记录 {review_id} 不存在")
    saved = save_exports_to_disk(result)
    return {
        "review_id": review_id,
        "status": result.status,
        "saved_files": saved,
        "download_urls": {
            "json": f"/api/review/{review_id}/export/json",
            "progress_csv": f"/api/review/{review_id}/export/progress.csv",
            "anomalies_csv": f"/api/review/{review_id}/export/anomalies.csv",
        }
    }
