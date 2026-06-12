from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import hashlib
import uuid

from app.core.db import get_db
from app.schemas import (
    TideRecordCreate, TideRecord,
    WaterQualityCreate, WaterQualityRecord,
    BatchImportRequest, PaginatedResponse,
)
from app.services.crud_service import (
    get_or_create_batch, mark_batch_completed,
    upsert_tide_records, upsert_water_records,
)
from app.models import TideRecord as TideModel, WaterQualityRecord as WaterModel, ImportBatch

router = APIRouter(prefix="/import", tags=["数据导入/补录"])


@router.post("/tide/batch", summary="批量导入潮汐（去重+幂等，补录不会产生两份结论）")
def import_tide_batch(
    records: List[TideRecordCreate],
    batch_id: Optional[str] = Query(None, description="批次号，不传自动生成"),
    source_file: Optional[str] = Query(None, description="来源文件名"),
    is_reimport: bool = Query(False, description="是否为补录/重新导入"),
    superseded_batch_id: Optional[str] = Query(None, description="被替代的老批次号"),
    operator: Optional[str] = Query(None),
    remark: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    导入潮汐数据。
    - 同 batch_id 二次导入：仅更新差异字段，不会新增记录
    - 同 source_hash（文件级）：自动检测重复，默认跳过
    - 补录模式：设置 is_reimport=true + superseded_batch_id，会自动替换旧批次结论
    """
    if not batch_id:
        batch_id = f"tide-{uuid.uuid4().hex}"
    source_hash = None
    if records:
        raw = "|".join(
            f"{r.port_code}{r.record_time.isoformat()}{r.tide_height}" for r in records
        )
        source_hash = hashlib.md5(raw.encode()).hexdigest()

    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="tide",
        source_file=source_file, source_hash=source_hash,
        operator=operator, remark=remark,
        is_reimport=is_reimport, superseded_batch_id=superseded_batch_id,
    ))
    if is_dup and not is_reimport:
        return {
            "skipped": True,
            "message": "检测到重复批次，已跳过（如需强制重导请设置 is_reimport=true）",
            "batch_id": batch.batch_id,
            "total": batch.total_records or 0,
            "inserted": batch.inserted_count or 0,
            "updated": batch.updated_count or 0,
            "skipped_duplicates": batch.skipped_count or 0,
            "is_reimport": False,
        }

    inserted, updated, skipped = upsert_tide_records(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()

    return {
        "batch_id": batch_id,
        "is_reimport": is_reimport,
        "superseded": superseded_batch_id,
        "total": len(records),
        "inserted": inserted,
        "updated": updated,
        "skipped_duplicates": skipped,
        "message": "导入完成，去重幂等已生效；潮窗结果如受影响请调用 /tide-window/calculate 重算"
                 + ("（补录模式，已标记替代老批次）" if is_reimport else ""),
    }


@router.post("/water/batch", summary="批量导入水质（去重+幂等）")
def import_water_batch(
    records: List[WaterQualityCreate],
    batch_id: Optional[str] = Query(None),
    source_file: Optional[str] = Query(None),
    is_reimport: bool = Query(False),
    superseded_batch_id: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    remark: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if not batch_id:
        batch_id = f"water-{uuid.uuid4().hex}"
    source_hash = None
    if records:
        raw = "|".join(
            f"{r.port_code}{r.station_code or ''}{r.record_time.isoformat()}{r.water_depth}"
            for r in records
        )
        source_hash = hashlib.md5(raw.encode()).hexdigest()

    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="water",
        source_file=source_file, source_hash=source_hash,
        operator=operator, remark=remark,
        is_reimport=is_reimport, superseded_batch_id=superseded_batch_id,
    ))
    if is_dup and not is_reimport:
        return {
            "skipped": True,
            "message": "检测到重复批次，已跳过（如需强制重导请设置 is_reimport=true）",
            "batch_id": batch.batch_id,
            "total": batch.total_records or 0,
            "inserted": batch.inserted_count or 0,
            "updated": batch.updated_count or 0,
            "skipped_duplicates": batch.skipped_count or 0,
            "is_reimport": False,
        }

    inserted, updated, skipped = upsert_water_records(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()
    return {
        "batch_id": batch_id,
        "total": len(records),
        "inserted": inserted,
        "updated": updated,
        "skipped_duplicates": skipped,
    }


@router.get("/batches", summary="导入批次列表（含补录关系，防双份结论）")
def list_batches(
    batch_type: Optional[str] = Query(None),
    page: int = 1, page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(ImportBatch)
    if batch_type:
        q = q.filter(ImportBatch.batch_type == batch_type)
    total = q.count()
    items = (q.order_by(ImportBatch.created_at.desc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        total_pages=(total + page_size - 1) // page_size, items=items,
    )


@router.get("/tide/records", summary="潮汐记录查询（分页）")
def list_tide(
    port_code: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = 1, page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(TideModel)
    if port_code:
        q = q.filter(TideModel.port_code == port_code)
    if date_from:
        q = q.filter(TideModel.record_date >= date_from)
    if date_to:
        q = q.filter(TideModel.record_date <= date_to)
    total = q.count()
    items = (q.order_by(TideModel.record_time.asc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        total_pages=(total + page_size - 1) // page_size, items=items,
    )


@router.get("/water/records", summary="水质记录查询（分页，含负深度标识）")
def list_water(
    port_code: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    only_negative: bool = Query(False, description="只看负深度样点"),
    page: int = 1, page_size: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(WaterModel)
    if port_code:
        q = q.filter(WaterModel.port_code == port_code)
    if date_from:
        q = q.filter(WaterModel.record_date >= date_from)
    if date_to:
        q = q.filter(WaterModel.record_date <= date_to)
    if only_negative:
        q = q.filter(WaterModel.water_depth <= 0)
    total = q.count()
    items = (q.order_by(WaterModel.record_time.asc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        total_pages=(total + page_size - 1) // page_size, items=items,
    )
