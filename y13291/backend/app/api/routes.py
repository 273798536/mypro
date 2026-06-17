from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from io import BytesIO
from datetime import datetime
from urllib.parse import quote

from app.database import get_db
from app.models import Feedback
from app.schemas import (
    FeedbackCreate, FeedbackUpdate, FeedbackRead, FeedbackListResponse,
    MergeRelationCreate, MergeRelationRead,
    EvidenceCreate, EvidenceRead,
    OperationLogRead, DashboardStats, StatusTransition
)
from app.services import feedback_service as svc
from app.utils import exporter

router = APIRouter(prefix="/api/feedbacks", tags=["feedbacks"])


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    return svc.get_dashboard_stats(db)


@router.get("", response_model=FeedbackListResponse)
def list_feedbacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    bridge_name: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    total, items = svc.list_feedbacks(db, skip=skip, limit=limit, status=status,
                                       keyword=keyword, bridge_name=bridge_name, source=source)
    return FeedbackListResponse(total=total, items=items)


@router.post("", response_model=FeedbackRead)
def create_feedback(data: FeedbackCreate, db: Session = Depends(get_db)):
    existing = svc.get_feedback_by_no(db, data.feedback_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"编号 {data.feedback_no} 已存在")
    obj = svc.create_feedback(db, data)
    return obj


@router.get("/{feedback_id}", response_model=FeedbackRead)
def get_feedback(feedback_id: int, db: Session = Depends(get_db)):
    obj = svc.get_feedback(db, feedback_id)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    return obj


@router.put("/{feedback_id}", response_model=FeedbackRead)
def update_feedback(feedback_id: int, data: FeedbackUpdate, db: Session = Depends(get_db)):
    obj = svc.update_feedback(db, feedback_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    return obj


@router.patch("/{feedback_id}/status", response_model=FeedbackRead)
def transition_status(feedback_id: int, data: StatusTransition, db: Session = Depends(get_db)):
    valid_statuses = {"pending", "reviewing", "need_evidence", "approved", "merged", "closed"}
    if data.target_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态: {data.target_status}")
    obj = svc.transition_status(db, feedback_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    return obj


@router.delete("/{feedback_id}")
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    ok = svc.delete_feedback(db, feedback_id)
    if not ok:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "已删除"}


@router.get("/{feedback_id}/logs", response_model=List[OperationLogRead])
def get_operation_logs(feedback_id: int, db: Session = Depends(get_db)):
    obj = svc.get_feedback(db, feedback_id)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    return svc.list_operation_logs(db, feedback_id)


@router.get("/{feedback_id}/merges", response_model=List[MergeRelationRead])
def get_merge_relations(feedback_id: int, db: Session = Depends(get_db)):
    return svc.list_merge_relations(db, feedback_id)


@router.post("/merges", response_model=MergeRelationRead)
def create_merge(data: MergeRelationCreate, db: Session = Depends(get_db)):
    rel = svc.create_merge_relation(db, data)
    if not rel:
        raise HTTPException(status_code=400, detail="归并失败：记录不存在或不能归并自身")
    result = svc.list_merge_relations(db)
    for r in result:
        if r["id"] == rel.id:
            return r
    raise HTTPException(status_code=500, detail="归并后查询失败")


@router.get("/duplicates/suggest")
def suggest_duplicates(db: Session = Depends(get_db)):
    return svc.find_potential_duplicates(db)


@router.post("/{feedback_id}/evidences", response_model=EvidenceRead)
def add_evidence(feedback_id: int, data: EvidenceCreate, db: Session = Depends(get_db)):
    obj = svc.get_feedback(db, feedback_id)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    data.feedback_id = feedback_id
    return svc.add_evidence(db, data)


@router.get("/{feedback_id}/evidences", response_model=List[EvidenceRead])
def list_evidences(feedback_id: int, db: Session = Depends(get_db)):
    obj = svc.get_feedback(db, feedback_id)
    if not obj:
        raise HTTPException(status_code=404, detail="记录不存在")
    return svc.list_evidences(db, feedback_id)


@router.post("/import")
def import_excel(file: UploadFile = File(...), operator: Optional[str] = Query("system")):
    if not file.filename or not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="请上传 Excel 文件 (.xlsx 或 .xls)")
    content = file.file.read()
    result = exporter.import_excel_to_db(content, operator=operator)
    return result


@router.get("/export/excel")
def export_excel(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    bridge_name: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    _, items = svc.list_feedbacks(db, skip=0, limit=5000, status=status, keyword=keyword,
                                   bridge_name=bridge_name, source=source)
    data = exporter.export_feedbacks_to_excel(items)
    filename = f"慢行桥坡道容量复核_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={quote(filename)}; filename*=UTF-8''{quote(filename)}"}
    )


@router.get("/export/pdf")
def export_pdf(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    bridge_name: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    _, items = svc.list_feedbacks(db, skip=0, limit=5000, status=status, keyword=keyword,
                                   bridge_name=bridge_name, source=source)
    data = exporter.export_feedbacks_to_pdf(items)
    filename = f"慢行桥坡道容量复核报告_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return StreamingResponse(
        BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={quote(filename)}; filename*=UTF-8''{quote(filename)}"}
    )


@router.get("/meta/status-info")
def get_status_info():
    return {
        "status_labels": svc.STATUS_LABEL_MAP,
        "status_hints": svc.STATUS_ACTION_HINTS
    }
