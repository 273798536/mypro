from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from ..database import get_db


def json_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def safe_dumps(data, **kwargs):
    return json.dumps(data, default=json_serializer, ensure_ascii=False, **kwargs)
from ..models import (
    AuditBatch, User,
    CheckinRecord as CheckinRecordModel,
    DepositRecord as DepositRecordModel,
    RoomChangeRecord as RoomChangeRecordModel,
    SupervisorComment as SupervisorCommentModel,
    DirtyRecord as DirtyRecordModel
)
from ..schemas import (
    CheckinRecordCreate, DepositRecordCreate, RoomChangeRecordCreate,
    CheckinRecord, DepositRecord, RoomChangeRecord,
    SupervisorCommentCreate, SupervisorComment,
    BatchRecordsCreate, DirtyRecordResolve
)
from ..permissions import get_current_user_with_permission, Permission
from ..dirty_records import resolve_dirty_record, get_batch_dirty_records

router = APIRouter(prefix="/records", tags=["records"])


@router.post("/batch/{batch_id}/checkins", response_model=List[CheckinRecord])
def add_checkin_records(
    batch_id: int,
    records: List[CheckinRecordCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EDIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    created = []
    for rec in records:
        existing = db.query(CheckinRecordModel).filter(
            CheckinRecordModel.batch_id == batch_id,
            CheckinRecordModel.record_no == rec.record_no
        ).first()
        if existing:
            continue
        
        db_rec = CheckinRecordModel(
            batch_id=batch_id,
            **rec.model_dump(),
            raw_data=safe_dumps(rec.model_dump())
        )
        db.add(db_rec)
        created.append(db_rec)
    
    db.commit()
    for rec in created:
        db.refresh(rec)
    return created


@router.post("/batch/{batch_id}/deposits", response_model=List[DepositRecord])
def add_deposit_records(
    batch_id: int,
    records: List[DepositRecordCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EDIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    created = []
    for rec in records:
        existing = db.query(DepositRecordModel).filter(
            DepositRecordModel.batch_id == batch_id,
            DepositRecordModel.record_no == rec.record_no
        ).first()
        if existing:
            continue
        
        db_rec = DepositRecordModel(
            batch_id=batch_id,
            **rec.model_dump(),
            raw_data=safe_dumps(rec.model_dump())
        )
        db.add(db_rec)
        created.append(db_rec)
    
    db.commit()
    for rec in created:
        db.refresh(rec)
    return created


@router.post("/batch/{batch_id}/room-changes", response_model=List[RoomChangeRecord])
def add_room_change_records(
    batch_id: int,
    records: List[RoomChangeRecordCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EDIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    created = []
    for rec in records:
        existing = db.query(RoomChangeRecordModel).filter(
            RoomChangeRecordModel.batch_id == batch_id,
            RoomChangeRecordModel.record_no == rec.record_no
        ).first()
        if existing:
            continue
        
        db_rec = RoomChangeRecordModel(
            batch_id=batch_id,
            **rec.model_dump(),
            raw_data=safe_dumps(rec.model_dump())
        )
        db.add(db_rec)
        created.append(db_rec)
    
    db.commit()
    for rec in created:
        db.refresh(rec)
    return created


@router.post("/batch/{batch_id}/bulk", response_model=dict)
def add_records_bulk(
    batch_id: int,
    data: BatchRecordsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EDIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    checkins_added = 0
    for rec in data.checkins:
        existing = db.query(CheckinRecordModel).filter(
            CheckinRecordModel.batch_id == batch_id,
            CheckinRecordModel.record_no == rec.record_no
        ).first()
        if not existing:
            db_rec = CheckinRecordModel(
                batch_id=batch_id,
                **rec.model_dump(),
                raw_data=safe_dumps(rec.model_dump())
            )
            db.add(db_rec)
            checkins_added += 1
    
    deposits_added = 0
    for rec in data.deposits:
        existing = db.query(DepositRecordModel).filter(
            DepositRecordModel.batch_id == batch_id,
            DepositRecordModel.record_no == rec.record_no
        ).first()
        if not existing:
            db_rec = DepositRecordModel(
                batch_id=batch_id,
                **rec.model_dump(),
                raw_data=safe_dumps(rec.model_dump())
            )
            db.add(db_rec)
            deposits_added += 1
    
    room_changes_added = 0
    for rec in data.room_changes:
        existing = db.query(RoomChangeRecordModel).filter(
            RoomChangeRecordModel.batch_id == batch_id,
            RoomChangeRecordModel.record_no == rec.record_no
        ).first()
        if not existing:
            db_rec = RoomChangeRecordModel(
                batch_id=batch_id,
                **rec.model_dump(),
                raw_data=safe_dumps(rec.model_dump())
            )
            db.add(db_rec)
            room_changes_added += 1
    
    db.commit()
    
    return {
        "checkins_added": checkins_added,
        "deposits_added": deposits_added,
        "room_changes_added": room_changes_added,
    }


@router.post("/batch/{batch_id}/comments", response_model=SupervisorComment)
def add_comment(
    batch_id: int,
    comment: SupervisorCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.ADD_COMMENT))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    db_comment = SupervisorCommentModel(
        batch_id=batch_id,
        created_by=current_user.id,
        **comment.model_dump()
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@router.get("/batch/{batch_id}/dirty-records")
def list_dirty_records(
    batch_id: int,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return get_batch_dirty_records(db, batch_id, resolved)


@router.post("/dirty-records/{dirty_id}/resolve")
def resolve_dirty(
    dirty_id: int,
    data: DirtyRecordResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.RESOLVE_DIRTY))
):
    dirty = resolve_dirty_record(db, dirty_id, current_user, data.corrected_value, data.resolution_note)
    if not dirty:
        raise HTTPException(status_code=404, detail="Dirty record not found")
    return dirty


@router.post("/batch/{batch_id}/attachments")
async def upload_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.UPLOAD_ATTACHMENT))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    import os
    os.makedirs("attachments", exist_ok=True)
    file_path = f"attachments/{batch_id}_{file.filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    from ..models import Attachment
    attachment = Attachment(
        batch_id=batch_id,
        file_name=file.filename,
        file_type=file.content_type,
        file_path=file_path,
        uploaded_by=current_user.id,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return {"id": attachment.id, "file_name": file.filename, "uploaded_at": attachment.uploaded_at}
