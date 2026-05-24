from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_review
from ..models import User, UserRole, BorrowRecord, RecordStatus
from ..schemas import BorrowRecordCreate, BorrowRecordUpdate, BorrowRecordResponse, RecordStatusTransition
from ..utils import log_operation, object_to_dict, is_batch_frozen, can_modify_record, can_transition_record_status

router = APIRouter(prefix="/borrow", tags=["借用记录"])


@router.post("", response_model=BorrowRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_borrow(
    borrow_in: BorrowRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    if is_batch_frozen(db, borrow_in.batch_id):
        raise HTTPException(status_code=400, detail="Cannot add borrow record to frozen or completed batch")
    
    existing = db.query(BorrowRecord).filter(BorrowRecord.borrow_no == borrow_in.borrow_no).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Borrow no {borrow_in.borrow_no} already exists")
    
    db_borrow = BorrowRecord(**borrow_in.model_dump(), created_by=current_user.id)
    db.add(db_borrow)
    db.commit()
    db.refresh(db_borrow)
    
    log_operation(
        db, "CREATE", "borrow_records", db_borrow.id,
        new_value=object_to_dict(db_borrow),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_borrow


@router.get("", response_model=list[BorrowRecordResponse])
async def list_borrows(
    batch_id: int = None,
    is_returned: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(BorrowRecord)
    if batch_id:
        query = query.filter(BorrowRecord.batch_id == batch_id)
    if is_returned is not None:
        query = query.filter(BorrowRecord.is_returned == is_returned)
    borrows = query.offset(skip).limit(limit).all()
    return borrows


@router.get("/{borrow_id}", response_model=BorrowRecordResponse)
async def get_borrow(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    borrow = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    return borrow


@router.put("/{borrow_id}", response_model=BorrowRecordResponse)
async def update_borrow(
    borrow_id: int,
    borrow_in: BorrowRecordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db_borrow = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    
    if not can_modify_record(db, db_borrow.batch_id, db_borrow.status):
        raise HTTPException(status_code=400, detail="Cannot modify frozen or reviewed record")
    
    old_value = object_to_dict(db_borrow)
    update_data = borrow_in.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        del update_data["status"]
    
    for field, value in update_data.items():
        setattr(db_borrow, field, value)
    
    db.commit()
    db.refresh(db_borrow)
    
    log_operation(
        db, "UPDATE", "borrow_records", borrow_id,
        old_value=old_value, new_value=object_to_dict(db_borrow),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_borrow


@router.post("/{borrow_id}/transition", response_model=BorrowRecordResponse)
async def transition_borrow_status(
    borrow_id: int,
    transition: RecordStatusTransition,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_borrow = db.query(BorrowRecord).filter(BorrowRecord.id == borrow_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    
    target_status = transition.target_status
    
    if target_status in [RecordStatus.REVIEWED, RecordStatus.FROZEN] and not can_review(current_user):
        raise HTTPException(status_code=403, detail="Only reviewer or supervisor can review or freeze record")
    
    if is_batch_frozen(db, db_borrow.batch_id):
        raise HTTPException(status_code=400, detail="Cannot change status in frozen or completed batch")
    
    if not can_transition_record_status(db_borrow.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {db_borrow.status.value} to {target_status.value}"
        )
    
    old_value = object_to_dict(db_borrow)
    old_status = db_borrow.status
    db_borrow.status = target_status
    
    db.commit()
    db.refresh(db_borrow)
    
    log_operation(
        db, f"STATUS_CHANGE_{old_status.value}_to_{target_status.value}",
        "borrow_records", borrow_id,
        old_value=old_value, new_value=object_to_dict(db_borrow),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_borrow


@router.get("/unreturned/summary")
async def get_unreturned_summary(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    unreturned = db.query(BorrowRecord).filter(
        BorrowRecord.batch_id == batch_id,
        BorrowRecord.is_returned == False
    ).all()
    
    summary = []
    for record in unreturned:
        diff = record.quantity - record.return_quantity
        if diff > 0:
            summary.append({
                "borrow_no": record.borrow_no,
                "borrower_name": record.borrower_name,
                "borrower_department": record.borrower_department,
                "material_code": record.material_code,
                "material_name": record.material_name,
                "total_quantity": record.quantity,
                "returned_quantity": record.return_quantity,
                "missing_quantity": diff,
                "borrow_date": record.borrow_date,
                "expected_return_date": record.expected_return_date
            })
    
    return {
        "total_unreturned_records": len(summary),
        "total_missing_quantity": sum(s["missing_quantity"] for s in summary),
        "details": summary
    }
