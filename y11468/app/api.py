from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db, init_db
from app.models import User, RoleEnum, OrderStatus, StyleOrder, FabricTransaction, SizeModification, AuditLog, FailedRecord
from app.permissions import has_permission, Permission, can_edit_order, filter_fields_by_role
from app.services import (
    StyleOrderService, FabricService, SizeModificationService,
    ScanService, ReplayService, UserService
)
from app.schemas import (
    StyleOrderCreate, StyleOrderUpdate,
    FabricTransactionCreate,
    SizeModificationCreate,
    ScanRecordImport,
    VersionCompareResponse
)

app = FastAPI(title="服装打版样衣验收回放链路 API", version="1.0.0")


def get_current_user(username: str = Header(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.on_event("startup")
def startup_event():
    init_db()
    db = next(get_db())
    UserService.init_default_users(db)


@app.get("/")
def root():
    return {"message": "服装打版样衣验收回放链路服务", "version": "1.0.0"}


@app.get("/users/me")
def get_me(user: User = Depends(get_current_user)):
    return {"username": user.username, "role": user.role.value}


@app.post("/orders/")
def create_order(data: StyleOrderCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.CREATE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.create(db, data.model_dump(), user.username)
    db.commit()
    db.refresh(order)
    return order_to_dict(order, user.role)


def order_to_dict(order: StyleOrder, role: RoleEnum) -> dict:
    data = {
        "id": order.id,
        "order_no": order.order_no,
        "style_code": order.style_code,
        "style_name": order.style_name,
        "version": order.version,
        "parent_id": order.parent_id,
        "batch_no": order.batch_no,
        "status": order.status.value,
        "created_by": order.created_by,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "reviewed_by": order.reviewed_by,
        "reviewed_at": order.reviewed_at.isoformat() if order.reviewed_at else None,
        "frozen_by": order.frozen_by,
        "frozen_at": order.frozen_at.isoformat() if order.frozen_at else None
    }
    return filter_fields_by_role(data, role, "style_order")


@app.get("/orders/")
def list_orders(style_code: Optional[str] = None, status: Optional[OrderStatus] = None,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> List[dict]:
    if not has_permission(user.role, Permission.VIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = db.query(StyleOrder)
    if style_code:
        query = query.filter(StyleOrder.style_code == style_code)
    if status:
        query = query.filter(StyleOrder.status == status)
    
    orders = query.all()
    return [order_to_dict(o, user.role) for o in orders]


@app.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.VIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_to_dict(order, user.role)


@app.put("/orders/{order_id}")
def update_order(order_id: int, data: StyleOrderUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.EDIT_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not can_edit_order(user.role, order.status):
        raise HTTPException(status_code=403, detail=f"Cannot edit order with status {order.status}")
    
    try:
        updated = StyleOrderService.update(db, order_id, data.model_dump(exclude_unset=True), user.username)
        db.commit()
        db.refresh(updated)
        return order_to_dict(updated, user.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/orders/{order_id}/submit")
def submit_order(order_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.SUBMIT_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.submit(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot submit order")
    db.commit()
    db.refresh(order)
    return order_to_dict(order, user.role)


@app.post("/orders/{order_id}/review")
def review_order(order_id: int, approved: bool, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.REVIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.review(db, order_id, user.username, approved)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot review order")
    db.commit()
    db.refresh(order)
    return order_to_dict(order, user.role)


@app.post("/orders/{order_id}/freeze")
def freeze_order(order_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.FREEZE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.freeze(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot freeze order")
    db.commit()
    db.refresh(order)
    return order_to_dict(order, user.role)


@app.post("/orders/{order_id}/new-version")
def create_new_version(order_id: int, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.CREATE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.create_new_version(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.commit()
    db.refresh(order)
    return order_to_dict(order, user.role)


def fabric_to_dict(tx: FabricTransaction, role: RoleEnum) -> dict:
    data = {
        "id": tx.id,
        "style_order_id": tx.style_order_id,
        "fabric_code": tx.fabric_code,
        "fabric_name": tx.fabric_name,
        "action": tx.action.value,
        "quantity": tx.quantity,
        "unit": tx.unit,
        "batch_no": tx.batch_no,
        "warehouse": tx.warehouse,
        "operator": tx.operator,
        "transaction_time": tx.transaction_time.isoformat() if tx.transaction_time else None,
        "remark": tx.remark,
        "version": tx.version
    }
    return filter_fields_by_role(data, role, "fabric")


def size_mod_to_dict(sm: SizeModification, role: RoleEnum) -> dict:
    data = {
        "id": sm.id,
        "style_order_id": sm.style_order_id,
        "size_code": sm.size_code,
        "part_name": sm.part_name,
        "old_value": sm.old_value,
        "new_value": sm.new_value,
        "modification_reason": sm.modification_reason,
        "version": sm.version,
        "created_by": sm.created_by,
        "created_at": sm.created_at.isoformat() if sm.created_at else None
    }
    return filter_fields_by_role(data, role, "size")


def scan_to_dict(sr) -> dict:
    return {
        "id": sr.id,
        "style_order_id": sr.style_order_id,
        "scan_code": sr.scan_code,
        "scan_type": sr.scan_type,
        "fabric_code": sr.fabric_code,
        "quantity": sr.quantity,
        "scan_time": sr.scan_time.isoformat() if sr.scan_time else None,
        "scanner": sr.scanner,
        "location": sr.location,
        "remark": sr.remark,
        "is_valid": sr.is_valid,
        "validation_error": sr.validation_error
    }


def audit_log_to_dict(log: AuditLog) -> dict:
    return {
        "id": log.id,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "action": log.action.value,
        "operator": log.operator,
        "diff_summary": log.diff_summary,
        "created_at": log.created_at.isoformat() if log.created_at else None
    }


def failed_record_to_dict(fr: FailedRecord) -> dict:
    return {
        "id": fr.id,
        "record_type": fr.record_type,
        "error_message": fr.error_message,
        "source": fr.source,
        "created_at": fr.created_at.isoformat() if fr.created_at else None
    }


@app.post("/orders/{order_id}/fabric/")
def add_fabric_transaction(order_id: int, data: FabricTransactionCreate,
                           db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.CREATE_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
    if not order or order.status == OrderStatus.FROZEN:
        raise HTTPException(status_code=400, detail="Cannot add transaction to this order")
    
    if data.action == "out":
        ok, err = FabricService.validate_out_transaction(db, data.fabric_code, data.quantity, order_id)
        if not ok:
            raise HTTPException(status_code=400, detail=err)
    
    tx = FabricService.add_transaction(db, order_id, data.model_dump(), user.username)
    db.commit()
    db.refresh(tx)
    return fabric_to_dict(tx, user.role)


@app.get("/orders/{order_id}/fabric/")
def list_fabric_transactions(order_id: int, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)) -> List[dict]:
    if not has_permission(user.role, Permission.VIEW_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    txs = db.query(FabricTransaction).filter(FabricTransaction.style_order_id == order_id).all()
    return [fabric_to_dict(tx, user.role) for tx in txs]


@app.get("/fabric/{fabric_code}/balance")
def get_fabric_balance(fabric_code: str, order_id: Optional[int] = None,
                       db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    balance = FabricService.get_fabric_balance(db, fabric_code, order_id)
    return {"fabric_code": fabric_code, "balance": balance}


@app.post("/orders/{order_id}/size-modifications/")
def add_size_modification(order_id: int, data: SizeModificationCreate,
                          db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if not has_permission(user.role, Permission.CREATE_SIZE):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    sm = SizeModificationService.add_modification(db, order_id, data.model_dump(), user.username)
    if not sm:
        raise HTTPException(status_code=400, detail="Cannot add modification")
    db.commit()
    db.refresh(sm)
    return size_mod_to_dict(sm, user.role)


@app.get("/orders/{order_id}/size-modifications/")
def list_size_modifications(order_id: int, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)) -> List[dict]:
    if not has_permission(user.role, Permission.VIEW_SIZE):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    sms = db.query(SizeModification).filter(SizeModification.style_order_id == order_id).all()
    return [size_mod_to_dict(sm, user.role) for sm in sms]


@app.post("/scans/import")
def import_scans(scans: List[ScanRecordImport], source: str = "api",
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.IMPORT_SCAN):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import ScanRecord
    result = ScanService.import_scan(db, [s.model_dump() for s in scans], user.username, source)
    db.commit()
    return result


@app.get("/scans/")
def list_scans(order_id: Optional[int] = None, valid_only: bool = False,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> List[dict]:
    from app.models import ScanRecord
    query = db.query(ScanRecord)
    if order_id:
        query = query.filter(ScanRecord.style_order_id == order_id)
    if valid_only:
        query = query.filter(ScanRecord.is_valid == True)
    return [scan_to_dict(sr) for sr in query.all()]


@app.get("/audit-logs/")
def list_audit_logs(entity_type: Optional[str] = None, entity_id: Optional[int] = None,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> List[dict]:
    if not has_permission(user.role, Permission.VIEW_AUDIT):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    return [audit_log_to_dict(log) for log in query.order_by(AuditLog.created_at.desc()).all()]


@app.get("/orders/{order_id}/history")
def get_order_history(order_id: int, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.REPLAY_HISTORY):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return ReplayService.get_order_history(db, order_id)


@app.get("/orders/compare/{order_id_v1}/{order_id_v2}", response_model=VersionCompareResponse)
def compare_versions(order_id_v1: int, order_id_v2: int, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.REPLAY_HISTORY):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return ReplayService.compare_versions(db, order_id_v1, order_id_v2)


@app.get("/failed-records/")
def list_failed_records(record_type: Optional[str] = None, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)) -> List[dict]:
    if not has_permission(user.role, Permission.VIEW_FAILED):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = db.query(FailedRecord)
    if record_type:
        query = query.filter(FailedRecord.record_type == record_type)
    return [failed_record_to_dict(fr) for fr in query.order_by(FailedRecord.created_at.desc()).all()]


@app.get("/reports/reconciliation")
def reconciliation_report(db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.EXPORT_DATA):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import StyleOrder, SizeModification, ScanRecord
    orders = db.query(StyleOrder).all()
    
    report = []
    for order in orders:
        fabric_balance = {}
        for tx in order.fabric_transactions:
            if tx.fabric_code not in fabric_balance:
                fabric_balance[tx.fabric_code] = 0
            if tx.action == "in":
                fabric_balance[tx.fabric_code] += tx.quantity
            else:
                fabric_balance[tx.fabric_code] -= tx.quantity
        
        mod_count = db.query(SizeModification).filter(
            SizeModification.style_order_id == order.id
        ).count()
        
        scan_count = db.query(ScanRecord).filter(
            ScanRecord.style_order_id == order.id,
            ScanRecord.is_valid == True
        ).count()
        
        report.append({
            "style_order_id": order.id,
            "order_no": order.order_no,
            "status": order.status.value,
            "fabric_balance": fabric_balance,
            "modification_count": mod_count,
            "scan_count": scan_count,
            "last_updated": order.updated_at
        })
    
    return report
