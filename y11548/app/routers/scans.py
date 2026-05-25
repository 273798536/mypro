from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_review, get_visible_fields_for_role
from ..models import User, UserRole, ScanRecord, RecordStatus
from ..schemas import ScanRecordCreate, ScanRecordUpdate, ScanRecordResponse, RecordStatusTransition
from ..utils import (
    log_operation, object_to_dict, is_batch_frozen, can_modify_record,
    can_transition_record_status, generate_no, filter_response_data
)

router = APIRouter(prefix="/scans", tags=["扫码明细"])


@router.post("", response_model=ScanRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    scan_in: ScanRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    if is_batch_frozen(db, scan_in.batch_id):
        raise HTTPException(status_code=400, detail="Cannot add scan record to frozen or completed batch")
    
    scan_data = scan_in.model_dump()
    if not scan_data.get("scan_no"):
        scan_data["scan_no"] = generate_no("SCAN")
    
    db_scan = ScanRecord(**scan_data, created_by=current_user.id)
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    
    log_operation(
        db, "CREATE", "scan_records", db_scan.id,
        new_value=object_to_dict(db_scan),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_scan


@router.get("")
async def list_scans(
    batch_id: int = None,
    scan_type: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(ScanRecord)
    if batch_id:
        query = query.filter(ScanRecord.batch_id == batch_id)
    if scan_type:
        query = query.filter(ScanRecord.scan_type == scan_type)
    scans = query.offset(skip).limit(limit).all()
    visible_fields = get_visible_fields_for_role(current_user.role, "scan")
    return filter_response_data([object_to_dict(s) for s in scans], visible_fields)


@router.get("/{scan_id}")
async def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    scan = db.query(ScanRecord).filter(ScanRecord.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found")
    visible_fields = get_visible_fields_for_role(current_user.role, "scan")
    return filter_response_data(object_to_dict(scan), visible_fields)


@router.put("/{scan_id}", response_model=ScanRecordResponse)
async def update_scan(
    scan_id: int,
    scan_in: ScanRecordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db_scan = db.query(ScanRecord).filter(ScanRecord.id == scan_id).first()
    if not db_scan:
        raise HTTPException(status_code=404, detail="Scan record not found")
    
    if not can_modify_record(db, db_scan.batch_id, db_scan.status):
        raise HTTPException(status_code=400, detail="Cannot modify frozen or reviewed record")
    
    old_value = object_to_dict(db_scan)
    update_data = scan_in.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        del update_data["status"]
    
    for field, value in update_data.items():
        setattr(db_scan, field, value)
    
    db.commit()
    db.refresh(db_scan)
    
    log_operation(
        db, "UPDATE", "scan_records", scan_id,
        old_value=old_value, new_value=object_to_dict(db_scan),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_scan


@router.post("/{scan_id}/transition", response_model=ScanRecordResponse)
async def transition_scan_status(
    scan_id: int,
    transition: RecordStatusTransition,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_scan = db.query(ScanRecord).filter(ScanRecord.id == scan_id).first()
    if not db_scan:
        raise HTTPException(status_code=404, detail="Scan record not found")
    
    target_status = transition.target_status
    
    if target_status in [RecordStatus.REVIEWED, RecordStatus.FROZEN] and not can_review(current_user):
        raise HTTPException(status_code=403, detail="Only reviewer or supervisor can review or freeze record")
    
    if is_batch_frozen(db, db_scan.batch_id):
        raise HTTPException(status_code=400, detail="Cannot change status in frozen or completed batch")
    
    if not can_transition_record_status(db_scan.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {db_scan.status.value} to {target_status.value}"
        )
    
    old_value = object_to_dict(db_scan)
    old_status = db_scan.status
    db_scan.status = target_status
    
    db.commit()
    db.refresh(db_scan)
    
    log_operation(
        db, f"STATUS_CHANGE_{old_status.value}_to_{target_status.value}",
        "scan_records", scan_id,
        old_value=old_value, new_value=object_to_dict(db_scan),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_scan
