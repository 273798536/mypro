from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import uuid

from app.core.db import get_db
from app.schemas import TrajectoryCreate, PaginatedResponse
from app.services.crud_service import upsert_trajectories, get_or_create_batch, mark_batch_completed
from app.models import VesselTrajectory, ImportBatch
from app.schemas import BatchImportRequest

router = APIRouter(prefix="/trajectory-cleaning", tags=["轨迹清洗（日常入口）"])


@router.get("/stats", summary="日常入口概览（今日待清洗、已核验等）")
def trajectory_stats(db: Session = Depends(get_db)):
    """
    【日常入口】海事安全员打开系统时的第一屏：显示今日待处理量、已核验量等。
    日常操作：从这里导入清洗数据 → 再到 /tide-window/calculate 计算潮窗。
    月底或课前：到 /tide-window/dashboard 和 /tide-window/formulas 复核潮汐计算逻辑。
    """
    from datetime import datetime
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    total = db.query(VesselTrajectory).count()
    today_total = db.query(VesselTrajectory).filter(VesselTrajectory.created_at >= today_start).count()
    today_pending = db.query(VesselTrajectory).filter(
        VesselTrajectory.created_at >= today_start,
        VesselTrajectory.is_cleaned != True,
    ).count()
    cleaned = db.query(VesselTrajectory).filter(VesselTrajectory.is_cleaned == True).count()
    verified = db.query(VesselTrajectory).filter(VesselTrajectory.status == "verified").count()
    batches = db.query(ImportBatch).filter(ImportBatch.batch_type == "trajectory").count()
    return {
        "message": "【日常入口】海事安全员请从这里开始：先导入清洗/核验轨迹 → 再计算潮窗。月底/课前到仪表盘+公式库复核。",
        "total_trajectory": total,
        "today_new": today_total,
        "today_pending_clean": today_pending,
        "cleaned": cleaned,
        "verified": verified,
        "total_batches": batches,
        "next_step": [
            "1. 调用 POST /api/v1/trajectory-cleaning/import 导入轨迹",
            "2. 调用 POST /api/v1/trajectory-cleaning/clean/batch 批量清洗",
            "3. 调用 POST /api/v1/trajectory-cleaning/verify/batch 批量核验",
            "4. 调用 POST /api/v1/tide-window/calculate 计算潮窗",
        ],
        "monthly_review": [
            "A. 调用 GET /api/v1/tide-window/dashboard 查看月度统计",
            "B. 调用 GET /api/v1/tide-window/formulas 复核公式参数",
            "C. 调用 GET /api/v1/tide-window/results 批量复核待确认记录",
        ],
    }


@router.post("/import", summary="导入船舶轨迹（日常入口，供清洗使用）")
def import_trajectory(
    records: List[TrajectoryCreate],
    batch_id: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    【日常入口】轨迹清洗。海事安全员日常从这里进入处理轨迹数据，
    清洗完成后可调用下方 /tide-window/calculate 生成潮窗。
    """
    if not batch_id:
        batch_id = f"traj-{uuid.uuid4().hex}"
    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="trajectory",
        operator=operator, remark="轨迹清洗-日常导入",
    ))
    inserted, updated, skipped = upsert_trajectories(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()
    return {
        "batch_id": batch_id,
        "total": len(records),
        "inserted": inserted,
        "updated": updated,
        "skipped_duplicates": skipped,
        "next_step": "清洗完成后，调用 POST /api/v1/tide-window/calculate 生成潮窗",
    }


@router.get("/records", summary="轨迹列表（含清洗状态）")
def list_trajectory(
    mmsi: Optional[str] = Query(None),
    port_code: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    is_cleaned: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    page: int = 1, page_size: int = 100,
    db: Session = Depends(get_db),
):
    from sqlalchemy import and_
    q = db.query(VesselTrajectory)
    if mmsi:
        q = q.filter(VesselTrajectory.mmsi == mmsi)
    if port_code:
        q = q.filter(VesselTrajectory.port_code == port_code)
    if date_from:
        start = datetime.combine(date_from, datetime.min.time())
        q = q.filter(VesselTrajectory.record_time >= start)
    if date_to:
        end = datetime.combine(date_to, datetime.max.time())
        q = q.filter(VesselTrajectory.record_time <= end)
    if is_cleaned is not None:
        q = q.filter(VesselTrajectory.is_cleaned == is_cleaned)
    if status:
        q = q.filter(VesselTrajectory.status == status)
    total = q.count()
    items = (q.order_by(VesselTrajectory.record_time.asc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        total_pages=(total + page_size - 1) // page_size, items=items,
    )


@router.post("/clean/batch", summary="批量标记轨迹为已清洗")
def mark_cleaned(
    trajectory_ids: List[int],
    operator: str = Query(...),
    remark: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    rows = db.query(VesselTrajectory).filter(VesselTrajectory.id.in_(trajectory_ids)).all()
    for r in rows:
        r.is_cleaned = True
        r.status = "cleaned"
        if remark:
            r.remark = remark
    db.commit()
    return {"updated": len(rows), "ids": [r.id for r in rows]}


@router.post("/verify/batch", summary="批量标记轨迹为已核验")
def mark_verified(
    trajectory_ids: List[int],
    operator: str = Query(...),
    remark: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    rows = db.query(VesselTrajectory).filter(VesselTrajectory.id.in_(trajectory_ids)).all()
    for r in rows:
        r.status = "verified"
        r.is_cleaned = True
        if remark:
            r.remark = (r.remark or "") + f" | verified: {remark}"
    db.commit()
    return {"verified": len(rows)}
