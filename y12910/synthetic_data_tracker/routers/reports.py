from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from services.report_service import (
    generate_report,
    write_report_to_file,
    list_report_files,
    get_report_filepath,
)

router = APIRouter(prefix="/reports", tags=["报告导出"])


def _handle_failure(result: Dict[str, Any]):
    raise HTTPException(
        status_code=500,
        detail={
            "message": result.get("error", "报告生成失败"),
            "traceback": result.get("traceback", ""),
        },
    )


@router.get("/export", summary="导出评测报告（JSON 响应，带统计摘要与异常警告）")
def export_report():
    result = generate_report()
    if not result.get("ok"):
        _handle_failure(result)
    return JSONResponse(
        content=result,
        headers={
            "X-Report-Total": str(result["summary"]["total"]),
            "X-Report-Ready": str(result["summary"]["ready"]),
            "X-Report-NeedsReview": str(result["summary"]["needs_review"]),
            "X-Report-Rejected": str(result["summary"]["rejected"]),
        },
    )


@router.post("/export", summary="【按钮触发】导出评测报告（等价于 GET /reports/export，支持前端按钮 POST）")
def export_report_post():
    result = generate_report()
    if not result.get("ok"):
        _handle_failure(result)
    return result


@router.get("/export/json", summary="导出评测报告（浏览器触发 JSON 文件下载）")
def export_report_json_download():
    result = generate_report()
    if not result.get("ok"):
        _handle_failure(result)
    from datetime import datetime
    filename = f"evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return JSONResponse(
        content=result,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/export/file", summary="【按钮触发】落盘导出评测报告到 data/reports/，返回下载链接")
def export_report_to_file():
    result = write_report_to_file()
    if not result.get("ok"):
        _handle_failure(result)
    return result


@router.get("/files", summary="查看已导出的历史报告文件列表")
def list_files():
    return {"files": list_report_files()}


@router.get("/files/{filename}", summary="下载已落盘的历史报告文件")
def download_file(filename: str):
    fp = get_report_filepath(filename)
    if fp is None:
        raise HTTPException(status_code=404, detail=f"报告文件不存在: {filename}")
    return FileResponse(
        path=fp,
        filename=filename,
        media_type="application/json",
    )
