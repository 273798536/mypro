from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models import ReportExport
from services.report_service import generate_report

router = APIRouter(prefix="/reports", tags=["报告导出"])


@router.get("/export", response_model=ReportExport, summary="导出评测报告")
def export_report():
    report = generate_report()
    return report


@router.get("/export/json", summary="导出评测报告(纯JSON下载)")
def export_report_json():
    report = generate_report()
    return JSONResponse(
        content=report.model_dump(mode="json"),
        headers={"Content-Disposition": "attachment; filename=evaluation_report.json"},
    )
