from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal
import io
import pandas as pd

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker,
    get_user_role_context
)
from app.models.auth import User
from app.models.business import (
    SettlementSummary,
    OutsourceDelivery,
    RepairRecord,
    DeductionDetail,
    ChangeHistory
)
from app.schemas.business import SettlementSummaryItem, ChangeHistoryItem
from app.schemas.common import DataResponse, ListResponse

router = APIRouter()
allow_view = RoleChecker(["readonly", "data_entry", "reviewer", "supervisor"])
allow_supervisor = RoleChecker(["supervisor"])


@router.get("/settlement-summary", response_model=ListResponse[SettlementSummaryItem])
async def get_settlement_summary(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    supplier_code: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_view)
) -> Any:
    query = db.query(SettlementSummary)
    
    if supplier_code:
        query = query.filter(SettlementSummary.supplier_code == supplier_code)
    if start_date:
        query = query.filter(SettlementSummary.summary_date >= start_date)
    if end_date:
        query = query.filter(SettlementSummary.summary_date <= end_date)
    
    total = query.count()
    summaries = query.order_by(SettlementSummary.summary_date.desc(), SettlementSummary.supplier_code)\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return ListResponse(
        success=True,
        data=summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/settlement-summary/{summary_id}/source-records")
async def get_source_records(
    summary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_view)
) -> Any:
    summary = db.query(SettlementSummary).filter(SettlementSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="汇总记录不存在")
    
    source_ids = summary.source_ids or {}
    
    deliveries = []
    if "delivery" in source_ids and source_ids["delivery"]:
        deliveries = db.query(OutsourceDelivery).filter(
            OutsourceDelivery.id.in_(source_ids["delivery"])
        ).all()
    
    repairs = []
    if "repair" in source_ids and source_ids["repair"]:
        repairs = db.query(RepairRecord).filter(
            RepairRecord.id.in_(source_ids["repair"])
        ).all()
    
    deductions = []
    if "deduction" in source_ids and source_ids["deduction"]:
        deductions = db.query(DeductionDetail).filter(
            DeductionDetail.id.in_(source_ids["deduction"])
        ).all()
    
    return DataResponse(
        success=True,
        data={
            "summary": {
                "id": summary.id,
                "supplier_code": summary.supplier_code,
                "supplier_name": summary.supplier_name,
                "summary_date": summary.summary_date,
                "delivery_amount": summary.delivery_amount,
                "repair_amount": summary.repair_amount,
                "deduction_amount": summary.deduction_amount,
                "final_amount": summary.final_amount
            },
            "deliveries": [
                {"id": d.id, "delivery_no": d.delivery_no, "total_amount": d.total_amount, "status": d.status}
                for d in deliveries
            ],
            "repairs": [
                {"id": r.id, "repair_no": r.repair_no, "repair_cost": r.repair_cost, "status": r.status}
                for r in repairs
            ],
            "deductions": [
                {"id": d.id, "deduction_no": d.deduction_no, "deduction_amount": d.deduction_amount, "status": d.status}
                for d in deductions
            ]
        }
    )


@router.get("/change-history")
async def get_change_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_type: Optional[str] = Query(None),
    business_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    query = db.query(ChangeHistory)
    
    if business_type:
        query = query.filter(ChangeHistory.business_type == business_type)
    if business_id:
        query = query.filter(ChangeHistory.business_id == business_id)
    
    total = query.count()
    records = query.order_by(ChangeHistory.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return ListResponse(
        success=True,
        data=records,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/compare/before-after")
async def compare_before_after(
    business_type: str = Query(...),
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    changes = db.query(ChangeHistory).filter(
        ChangeHistory.business_type == business_type,
        ChangeHistory.business_id == business_id
    ).order_by(ChangeHistory.created_at).all()
    
    if not changes:
        raise HTTPException(status_code=404, detail="未找到变更记录")
    
    field_changes = {}
    for change in changes:
        if change.field_name not in field_changes:
            field_changes[change.field_name] = []
        field_changes[change.field_name].append({
            "old_value": change.old_value,
            "new_value": change.new_value,
            "change_reason": change.change_reason,
            "operator_name": change.operator_name,
            "created_at": change.created_at.isoformat()
        })
    
    return DataResponse(
        success=True,
        data={
            "business_type": business_type,
            "business_id": business_id,
            "change_count": len(changes),
            "field_changes": field_changes,
            "first_change_at": changes[0].created_at.isoformat() if changes else None,
            "last_change_at": changes[-1].created_at.isoformat() if changes else None
        }
    )


@router.get("/export/settlement-summary")
async def export_settlement_summary(
    supplier_code: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    format: str = Query("excel", enum=["excel", "csv"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_view)
) -> Any:
    query = db.query(SettlementSummary)
    
    if supplier_code:
        query = query.filter(SettlementSummary.supplier_code == supplier_code)
    if start_date:
        query = query.filter(SettlementSummary.summary_date >= start_date)
    if end_date:
        query = query.filter(SettlementSummary.summary_date <= end_date)
    
    summaries = query.order_by(SettlementSummary.summary_date.desc()).all()
    
    data = []
    for s in summaries:
        source_info = s.source_ids or {}
        delivery_count = len(source_info.get("delivery", []))
        repair_count = len(source_info.get("repair", []))
        deduction_count = len(source_info.get("deduction", []))
        
        data.append({
            "日期": s.summary_date.strftime("%Y-%m-%d"),
            "供应商编码": s.supplier_code,
            "供应商名称": s.supplier_name,
            "产品编码": s.product_code,
            "产品名称": s.product_name,
            "送货金额": float(s.delivery_amount),
            "返修金额": float(s.repair_amount),
            "扣款金额": float(s.deduction_amount),
            "最终金额": float(s.final_amount),
            "送货单数": delivery_count,
            "返修单数": repair_count,
            "扣款单数": deduction_count,
            "版本号": s.version
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    if format == "excel":
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="结算汇总")
        output.seek(0)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"settlement_summary_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    else:
        df.to_csv(output, index=False, encoding="utf-8-sig")
        output.seek(0)
        media_type = "text/csv"
        filename = f"settlement_summary_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/dashboard/overview")
async def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    from app.models.business import CompensationQueue
    from app.services.queue_service import QueueStatus
    
    total_delivery = db.query(OutsourceDelivery).count()
    total_repair = db.query(RepairRecord).count()
    total_deduction = db.query(DeductionDetail).count()
    
    pending_delivery = db.query(OutsourceDelivery).filter(OutsourceDelivery.status == "pending").count()
    pending_repair = db.query(RepairRecord).filter(RepairRecord.status == "pending").count()
    pending_deduction = db.query(DeductionDetail).filter(DeductionDetail.status == "pending").count()
    
    queue_stats = {
        "pending": db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.PENDING).count(),
        "processing": db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.PROCESSING).count(),
        "success": db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.SUCCESS).count(),
        "failed": db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.FAILED).count(),
        "dead_letter": db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.DEAD_LETTER).count(),
    }
    
    error_groups = db.query(
        CompensationQueue.error_code,
        CompensationQueue.status,
        db.func.count(CompensationQueue.id)
    ).filter(
        CompensationQueue.status.in_([QueueStatus.FAILED, QueueStatus.DEAD_LETTER])
    ).group_by(
        CompensationQueue.error_code,
        CompensationQueue.status
    ).all()
    
    error_breakdown = []
    for error_code, status, count in error_groups:
        if error_code:
            error_breakdown.append({
                "error_code": error_code,
                "status": status,
                "count": count,
                "can_retry": status == QueueStatus.FAILED
            })
    
    return DataResponse(
        success=True,
        data={
            "business_overview": {
                "total_delivery": total_delivery,
                "total_repair": total_repair,
                "total_deduction": total_deduction,
                "pending_delivery": pending_delivery,
                "pending_repair": pending_repair,
                "pending_deduction": pending_deduction
            },
            "queue_status": queue_stats,
            "error_breakdown": error_breakdown,
            "retryable_count": queue_stats["failed"],
            "dead_letter_count": queue_stats["dead_letter"]
        }
    )


@router.get("/trace/record")
async def trace_record(
    business_type: str = Query(...),
    business_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_view)
) -> Any:
    record = None
    if business_type == "delivery":
        record = db.query(OutsourceDelivery).filter(OutsourceDelivery.id == business_id).first()
    elif business_type == "repair":
        record = db.query(RepairRecord).filter(RepairRecord.id == business_id).first()
    elif business_type == "deduction":
        record = db.query(DeductionDetail).filter(DeductionDetail.id == business_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    from app.models.business import CompensationQueue
    
    queue_items = db.query(CompensationQueue).filter(
        CompensationQueue.business_type == business_type,
        CompensationQueue.business_id == business_id
    ).order_by(CompensationQueue.created_at.desc()).all()
    
    changes = db.query(ChangeHistory).filter(
        ChangeHistory.business_type == business_type,
        ChangeHistory.business_id == business_id
    ).order_by(ChangeHistory.created_at.desc()).all()
    
    return DataResponse(
        success=True,
        data={
            "record": {
                "id": record.id,
                "type": business_type,
                "status": record.status,
                "idempotent_key": record.idempotent_key,
                "created_at": record.created_at,
                "created_by": record.created_by
            },
            "queue_history": [
                {
                    "id": q.id,
                    "status": q.status,
                    "retry_count": q.retry_count,
                    "last_error": q.last_error,
                    "error_code": q.error_code,
                    "process_logs": q.process_logs,
                    "created_at": q.created_at
                }
                for q in queue_items
            ],
            "change_history": [
                {
                    "field": c.field_name,
                    "old_value": c.old_value,
                    "new_value": c.new_value,
                    "reason": c.change_reason,
                    "operator": c.operator_name,
                    "time": c.created_at
                }
                for c in changes
            ]
        }
    )
