from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import PageSnapshot, ReviewSession, User
from ..schemas import PageSnapshotCreate, PageSnapshotResponse
from ..auth import get_current_any_role, get_current_reviewer

router = APIRouter()


@router.get("/session/{session_id}", response_model=list[PageSnapshotResponse])
def list_snapshots(
    session_id: int,
    snapshot_type: str = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(PageSnapshot).filter(PageSnapshot.session_id == session_id)
    if snapshot_type:
        query = query.filter(PageSnapshot.snapshot_type == snapshot_type)
    
    snapshots = query.order_by(PageSnapshot.created_at.desc()).limit(limit).all()
    return [PageSnapshotResponse.model_validate(s) for s in snapshots]


@router.get("/session/{session_id}/latest", response_model=PageSnapshotResponse)
def get_latest_snapshot(
    session_id: int,
    snapshot_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    query = db.query(PageSnapshot).filter(PageSnapshot.session_id == session_id)
    if snapshot_type:
        query = query.filter(PageSnapshot.snapshot_type == snapshot_type)
    
    snapshot = query.order_by(PageSnapshot.created_at.desc()).first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到页面快照"
        )
    return PageSnapshotResponse.model_validate(snapshot)


@router.post("", response_model=PageSnapshotResponse)
def create_snapshot(
    snapshot_data: PageSnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    session = db.query(ReviewSession).filter(
        ReviewSession.id == snapshot_data.session_id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )
    
    snapshot = PageSnapshot(
        **snapshot_data.model_dump(),
        created_by=current_user.id
    )
    db.add(snapshot)
    
    session.page_snapshot = snapshot_data.snapshot_data
    session.updated_at = func.now()
    
    db.commit()
    db.refresh(snapshot)
    return PageSnapshotResponse.model_validate(snapshot)


@router.get("/{snapshot_id}", response_model=PageSnapshotResponse)
def get_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_any_role)
):
    snapshot = db.query(PageSnapshot).filter(PageSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="快照不存在"
        )
    return PageSnapshotResponse.model_validate(snapshot)


@router.delete("/{snapshot_id}")
def delete_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_reviewer)
):
    snapshot = db.query(PageSnapshot).filter(PageSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="快照不存在"
        )
    
    db.delete(snapshot)
    db.commit()
    return {"message": "快照已删除"}
