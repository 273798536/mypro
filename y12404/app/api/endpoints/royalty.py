from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.api.deps import get_db
from app.schemas.royalty import (
    RoyaltyDetail, RoyaltyDetailCreate, RoyaltyDetailQuery,
    RoyaltyStatusUpdate, RoyaltyHistory, RoyaltyTrialCalculateRequest,
    RoyaltyTrialResult, RoyaltyAccrual, RoyaltyAccrualCreate, ApiResponse,
    ExportLogResponse
)
from app.services.royalty_service import RoyaltyService
from app.services.export_service import ExportService
from app.models.database import RoyaltyStatus, Platform

router = APIRouter(prefix="/royalty", tags=["版税管理"])


def handle_value_error(e: ValueError):
    raise HTTPException(status_code=400, detail={
        "error_code": "VALIDATION_ERROR",
        "error_message": str(e),
        "user_friendly_message": str(e)
    })


@router.post("/details", response_model=RoyaltyDetail, summary="创建版税明细")
def create_detail(
    detail_data: RoyaltyDetailCreate,
    db: Session = Depends(get_db)
):
    try:
        return RoyaltyService.create_royalty_detail(db, detail_data)
    except ValueError as e:
        handle_value_error(e)


@router.post("/details/query", response_model=ApiResponse, summary="查询版税明细列表")
def query_details(
    query: RoyaltyDetailQuery,
    db: Session = Depends(get_db)
):
    try:
        details, total = RoyaltyService.get_royalty_details(db, query)
        return ApiResponse(
            message="查询成功",
            data={
                "list": [RoyaltyDetail.model_validate(d).model_dump() for d in details],
                "total": total,
                "page": query.page,
                "page_size": query.page_size
            }
        )
    except ValueError as e:
        handle_value_error(e)


@router.get("/details/{detail_id}", response_model=RoyaltyDetail, summary="获取版税明细详情")
def get_detail(
    detail_id: int,
    db: Session = Depends(get_db)
):
    detail = RoyaltyService.get_royalty_detail(db, detail_id)
    if not detail:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "NOT_FOUND",
                "error_message": f"Royalty detail {detail_id} not found",
                "user_friendly_message": f"未找到ID为 {detail_id} 的版税明细记录"
            }
        )
    return detail


@router.put("/details/{detail_id}/status", response_model=RoyaltyDetail, summary="更新版税明细状态")
def update_detail_status(
    detail_id: int,
    update_data: RoyaltyStatusUpdate,
    db: Session = Depends(get_db)
):
    try:
        return RoyaltyService.update_status(db, detail_id, update_data)
    except ValueError as e:
        handle_value_error(e)


@router.get("/details/{detail_id}/history", response_model=list[RoyaltyHistory], summary="获取版税明细变更历史")
def get_detail_history(
    detail_id: int,
    db: Session = Depends(get_db)
):
    return RoyaltyService.get_history(db, detail_id)


@router.post("/trial-calculate", response_model=RoyaltyTrialResult, summary="预提试算")
def trial_calculate(
    request: RoyaltyTrialCalculateRequest,
    db: Session = Depends(get_db)
):
    try:
        result = RoyaltyService.trial_calculate(db, request)
        return RoyaltyTrialResult(**result)
    except ValueError as e:
        handle_value_error(e)


@router.post("/accruals", response_model=RoyaltyAccrual, summary="创建版税归集")
def create_accrual(
    request: RoyaltyAccrualCreate,
    db: Session = Depends(get_db)
):
    try:
        return RoyaltyService.create_accrual(db, request)
    except ValueError as e:
        handle_value_error(e)


@router.get("/accruals", response_model=ApiResponse, summary="获取归集记录列表")
def get_accruals(
    report_period: Optional[str] = None,
    platform: Optional[Platform] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    accruals, total = RoyaltyService.get_accruals(db, report_period, platform, page, page_size)
    return ApiResponse(
        message="查询成功",
        data={
            "list": [RoyaltyAccrual.model_validate(a).model_dump() for a in accruals],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    )


@router.get("/accruals/{accrual_id}/details", response_model=list[RoyaltyDetail], summary="获取归集明细")
def get_accrual_details(
    accrual_id: int,
    db: Session = Depends(get_db)
):
    try:
        return RoyaltyService.get_accrual_details(db, accrual_id)
    except ValueError as e:
        handle_value_error(e)


@router.post("/export/details", summary="导出版税明细")
def export_details(
    query: RoyaltyDetailQuery,
    exported_by: str = Query(..., description="操作人"),
    db: Session = Depends(get_db)
):
    try:
        output = ExportService.export_royalty_details(db, query, exported_by)
        file_name = f"版税明细_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"}
        )
    except ValueError as e:
        handle_value_error(e)


@router.get("/export/accrual/{accrual_id}", summary="导出归集报告")
def export_accrual(
    accrual_id: int,
    exported_by: str = Query(..., description="操作人"),
    db: Session = Depends(get_db)
):
    try:
        output = ExportService.export_accrual_report(db, accrual_id, exported_by)
        file_name = f"版税归集报告_{accrual_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"}
        )
    except ValueError as e:
        handle_value_error(e)


@router.get("/export/logs", response_model=ApiResponse, summary="获取导出日志")
def get_export_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    logs, total = ExportService.get_export_logs(db, page, page_size)
    return ApiResponse(
        message="查询成功",
        data={
            "list": [ExportLogResponse.model_validate(l).model_dump() for l in logs],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    )
