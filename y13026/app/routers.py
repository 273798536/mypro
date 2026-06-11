from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import quote
from app.database import get_db
from app.schemas import (
    BatchCreate, BatchDetail, DetailCreate, SourceMaterialUpload,
    SourceMaterialDetail, DetailRemarkCreate, DetailRemarkDetail,
    ManualOverride, PlaybackDetailFull
)
from app.services import PlaybackService, ReportService

router = APIRouter(prefix="/api/v1", tags=["券商适当性异常回放"])


def _get_service(db: Session = Depends(get_db)) -> PlaybackService:
    return PlaybackService(db)


@router.post("/batches", response_model=BatchDetail, status_code=status.HTTP_201_CREATED)
def create_batch(data: BatchCreate, service: PlaybackService = Depends(_get_service)):
    """创建回放批次，同一批次号跑多次时自动递增run_index"""
    batch = service.create_batch(data)
    service.commit()
    return batch


@router.get("/batches/{batch_id}", response_model=BatchDetail)
def get_batch(batch_id: int, service: PlaybackService = Depends(_get_service)):
    batch = service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次不存在: {batch_id}")
    return batch


@router.get("/batches/no/{batch_no}", response_model=List[BatchDetail])
def get_batch_history(batch_no: str, service: PlaybackService = Depends(_get_service)):
    """按批次号查询所有历史运行（同一批跑两遍时的对照）"""
    return service.get_batch_by_no(batch_no)


@router.post("/batches/{batch_id}/details", response_model=PlaybackDetailFull, status_code=status.HTTP_201_CREATED)
def add_detail(batch_id: int, data: DetailCreate, service: PlaybackService = Depends(_get_service)):
    """添加回放明细，接口查询状态与导出报告一致"""
    batch = service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次不存在: {batch_id}")
    detail = service.add_detail(batch_id, data)
    service.commit()
    service.db.refresh(detail)
    return detail


@router.get("/details/{detail_id}", response_model=PlaybackDetailFull)
def get_detail(detail_id: int, service: PlaybackService = Depends(_get_service)):
    """查询单条明细，状态与导出Markdown报告保持一致"""
    detail = service.get_detail(detail_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"明细不存在: {detail_id}")
    return detail


@router.get("/batches/{batch_id}/details", response_model=List[PlaybackDetailFull])
def list_batch_details(batch_id: int, service: PlaybackService = Depends(_get_service)):
    batch = service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次不存在: {batch_id}")
    return service.list_details(batch_id)


@router.post(
    "/details/{detail_id}/sources",
    response_model=SourceMaterialDetail,
    status_code=status.HTTP_201_CREATED,
)
def upload_source_material(
    detail_id: int,
    data: SourceMaterialUpload,
    service: PlaybackService = Depends(_get_service),
):
    """
    上传原始来源材料（审批邮件/后补凭证）。
    保留原始内容原貌，不做清洗修脏。
    """
    detail = service.get_detail(detail_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"明细不存在: {detail_id}")
    material = service.upload_source_material(detail_id, data)
    service.commit()
    service.db.refresh(material)
    return material


@router.get("/details/{detail_id}/sources", response_model=List[SourceMaterialDetail])
def list_source_materials(detail_id: int, service: PlaybackService = Depends(_get_service)):
    detail = service.get_detail(detail_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"明细不存在: {detail_id}")
    return detail.sources


@router.post(
    "/details/{detail_id}/manual-override",
    response_model=PlaybackDetailFull,
)
def manual_override(
    detail_id: int,
    data: ManualOverride,
    service: PlaybackService = Depends(_get_service),
):
    """人工改判，追加结论历史链并标记状态为人工改判"""
    try:
        detail = service.manual_override(detail_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    service.commit()
    service.db.refresh(detail)
    return detail


@router.post(
    "/details/{detail_id}/remarks",
    response_model=DetailRemarkDetail,
    status_code=status.HTTP_201_CREATED,
)
def add_remark(
    detail_id: int,
    data: DetailRemarkCreate,
    service: PlaybackService = Depends(_get_service),
):
    """补充备注，同一批材料跑第二遍时使用"""
    detail = service.get_detail(detail_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"明细不存在: {detail_id}")
    remark = service.add_remark(detail_id, data)
    service.commit()
    service.db.refresh(remark)
    return remark


@router.get("/batches/{batch_id}/report", response_class=PlainTextResponse)
def download_report(batch_id: int, service: PlaybackService = Depends(_get_service)):
    """
    导出可直接拿去沟通的Markdown报告。
    报告中已处理、待补材料、人工改判明确分区，
    状态与接口查询结果完全一致。
    """
    batch = service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail=f"批次不存在: {batch_id}")
    details = service.list_details(batch_id)
    md = ReportService.generate_batch_report(batch, details)
    filename = f"playback_{batch.batch_no}_run{batch.run_index}.md"
    encoded_filename = quote(f"适当性异常回放_{batch.batch_no}_run{batch.run_index}.md")
    return PlainTextResponse(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded_filename}"},
    )
