from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.models import ReviewRecord
from app.services import (
    ExcelParseError,
    InvalidTransitionError,
    ReviewNotFoundError,
    ReviewService,
    export_fit_chart,
    export_review_to_excel,
    read_excel_draft,
)

from .schemas import (
    ApproveRequest,
    ErrorResponse,
    OverrideClassificationRequest,
    RejectRequest,
    ResetRequest,
)

router = APIRouter(prefix="/api/reviews", tags=["复核"])


def _get_service() -> ReviewService:
    from app.main import review_service  # noqa: WPS433

    return review_service


@router.post(
    "/upload",
    response_model=ReviewRecord,
    responses={400: {"model": ErrorResponse}},
    summary="上传计算草稿并创建复核记录",
)
async def upload_draft(
    file: UploadFile = File(..., description="Excel 计算草稿 (.xlsx)"),
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "仅支持 .xlsx 格式的计算草稿",
                "suggestion": "请将文件另存为 .xlsx 后再上传；若计算草稿有多页，请确认所有 Sheet 均已包含。",
            },
        )
    try:
        raw = await file.read()
        parsed = read_excel_draft(raw, file.filename)
    except ExcelParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(exc)},
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": f"读取 Excel 失败：{exc}",
                "suggestion": "请确认文件未损坏，若计算草稿缺页请补全后再上传。",
            },
        ) from exc

    record = service.create_review_from_data(
        title=parsed.title,
        source_file=file.filename,
        source_sheets=parsed.sheet_names,
        data_points=parsed.data_points,
        constraints=parsed.constraints,
        bounds=parsed.bounds,
    )
    try:
        return service.run_analysis(record.record_id)
    except InvalidTransitionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": str(exc)},
        ) from exc


@router.get("", response_model=list[ReviewRecord], summary="列出所有复核记录")
def list_reviews(service: ReviewService = Depends(_get_service)) -> list[ReviewRecord]:
    return service.list_records()


@router.get(
    "/{record_id}",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}},
    summary="获取单条复核记录详情",
)
def get_review(
    record_id: str,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.get_record(record_id)
    except ReviewNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": str(exc)},
        ) from exc


@router.post(
    "/{record_id}/reanalyze",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="重新执行拟合与异常点分析",
)
def reanalyze(
    record_id: str,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.run_analysis(record_id)
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=422, detail={"error": str(exc)}) from exc


@router.post(
    "/{record_id}/approve",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="教研编辑标记通过（可附带人工修正）",
)
def approve_review(
    record_id: str,
    payload: ApproveRequest,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.approve(
            record_id=record_id,
            reviewer=payload.reviewer,
            role=payload.role,
            note=payload.note,
            corrections=payload.corrections or None,
        )
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc


@router.post(
    "/{record_id}/reject",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="教研编辑驳回（需注明原因，可附带修正）",
)
def reject_review(
    record_id: str,
    payload: RejectRequest,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.reject(
            record_id=record_id,
            reviewer=payload.reviewer,
            role=payload.role,
            reason=payload.reason,
            corrections=payload.corrections or None,
        )
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc


@router.post(
    "/{record_id}/reset",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="驳回后补充数据，重新提交为待确认",
)
def reset_review(
    record_id: str,
    payload: ResetRequest,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.reset_to_pending(
            record_id=record_id,
            reviewer=payload.reviewer,
            role=payload.role,
            note=payload.note,
        )
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc


@router.post(
    "/{record_id}/override-classification",
    response_model=ReviewRecord,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="投委会或高级编辑覆盖结果分类（必须说明原因）",
)
def override_classification(
    record_id: str,
    payload: OverrideClassificationRequest,
    service: ReviewService = Depends(_get_service),
) -> ReviewRecord:
    try:
        return service.override_classification(
            record_id=record_id,
            reviewer=payload.reviewer,
            role=payload.role,
            new_classification=payload.new_classification,
            reason=payload.reason,
        )
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc


@router.get(
    "/{record_id}/export/excel",
    responses={404: {"model": ErrorResponse}},
    summary="导出复核报告 Excel（含结论、状态、审计、来源）",
)
def export_excel(
    record_id: str,
    service: ReviewService = Depends(_get_service),
):
    try:
        record = service.get_record(record_id)
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    data = export_review_to_excel(record)
    filename = f"review_{record.record_id}.xlsx"
    return StreamingResponse(
        iter([data]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{record_id}/export/chart",
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="导出拟合图 PNG（含结论标注和来源信息）",
)
def export_chart(
    record_id: str,
    service: ReviewService = Depends(_get_service),
):
    try:
        record = service.get_record(record_id)
    except ReviewNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"error": str(exc)}) from exc
    try:
        data = export_fit_chart(record)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(exc),
                "suggestion": "请先调用 /reanalyze 生成拟合结果后再导出图表。",
            },
        ) from exc
    filename = f"review_{record.record_id}_chart.png"
    return StreamingResponse(
        iter([data]),
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
