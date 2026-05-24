from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db, init_db
from app.models import User, RoleEnum, OrderStatus
from app.permissions import has_permission, Permission, can_edit_order, filter_fields_by_role
from app.services import (
    StyleOrderService, FabricService, SizeModificationService,
    ScanService, ReplayService, UserService
)
from app.schemas import (
    StyleOrderCreate, StyleOrderUpdate, StyleOrderResponse,
    FabricTransactionCreate, FabricTransactionResponse,
    SizeModificationCreate, SizeModificationResponse,
    ScanRecordImport, ScanRecordResponse,
    AuditLogResponse, FailedRecordResponse,
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


@app.post("/orders/", response_model=StyleOrderResponse)
def create_order(data: StyleOrderCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.CREATE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.create(db, data.model_dump(), user.username)
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders/", response_model=List[StyleOrderResponse])
def list_orders(style_code: Optional[str] = None, status: Optional[OrderStatus] = None,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = db.query(StyleOrderService.__module__)
    from app.models import StyleOrder
    query = db.query(StyleOrder)
    if style_code:
        query = query.filter(StyleOrder.style_code == style_code)
    if status:
        query = query.filter(StyleOrder.status == status)
    
    orders = query.all()
    return orders


@app.get("/orders/{order_id}", response_model=StyleOrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import StyleOrder
    order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.put("/orders/{order_id}", response_model=StyleOrderResponse)
def update_order(order_id: int, data: StyleOrderUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.EDIT_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import StyleOrder
    order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not can_edit_order(user.role, order.status):
        raise HTTPException(status_code=403, detail=f"Cannot edit order with status {order.status}")
    
    try:
        updated = StyleOrderService.update(db, order_id, data.model_dump(exclude_unset=True), user.username)
        db.commit()
        db.refresh(updated)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/orders/{order_id}/submit", response_model=StyleOrderResponse)
def submit_order(order_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.SUBMIT_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.submit(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot submit order")
    db.commit()
    db.refresh(order)
    return order


@app.post("/orders/{order_id}/review", response_model=StyleOrderResponse)
def review_order(order_id: int, approved: bool, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.REVIEW_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.review(db, order_id, user.username, approved)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot review order")
    db.commit()
    db.refresh(order)
    return order


@app.post("/orders/{order_id}/freeze", response_model=StyleOrderResponse)
def freeze_order(order_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.FREEZE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.freeze(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=400, detail="Cannot freeze order")
    db.commit()
    db.refresh(order)
    return order


@app.post("/orders/{order_id}/new-version", response_model=StyleOrderResponse)
def create_new_version(order_id: int, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.CREATE_ORDER):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = StyleOrderService.create_new_version(db, order_id, user.username)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.commit()
    db.refresh(order)
    return order


@app.post("/orders/{order_id}/fabric/", response_model=FabricTransactionResponse)
def add_fabric_transaction(order_id: int, data: FabricTransactionCreate,
                           db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.CREATE_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import StyleOrder
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
    return tx


@app.get("/orders/{order_id}/fabric/", response_model=List[FabricTransactionResponse])
def list_fabric_transactions(order_id: int, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import FabricTransaction
    txs = db.query(FabricTransaction).filter(FabricTransaction.style_order_id == order_id).all()
    return txs


@app.get("/fabric/{fabric_code}/balance")
def get_fabric_balance(fabric_code: str, order_id: Optional[int] = None,
                       db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_FABRIC):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    balance = FabricService.get_fabric_balance(db, fabric_code, order_id)
    return {"fabric_code": fabric_code, "balance": balance}


@app.post("/orders/{order_id}/size-modifications/", response_model=SizeModificationResponse)
def add_size_modification(order_id: int, data: SizeModificationCreate,
                          db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.CREATE_SIZE):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    sm = SizeModificationService.add_modification(db, order_id, data.model_dump(), user.username)
    if not sm:
        raise HTTPException(status_code=400, detail="Cannot add modification")
    db.commit()
    db.refresh(sm)
    return sm


@app.get("/orders/{order_id}/size-modifications/", response_model=List[SizeModificationResponse])
def list_size_modifications(order_id: int, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_SIZE):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import SizeModification
    sms = db.query(SizeModification).filter(SizeModification.style_order_id == order_id).all()
    return sms


@app.post("/scans/import")
def import_scans(scans: List[ScanRecordImport], source: str = "api",
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.IMPORT_SCAN):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = ScanService.import_scan(db, [s.model_dump() for s in scans], user.username, source)
    db.commit()
    return result


@app.get("/scans/", response_model=List[ScanRecordResponse])
def list_scans(order_id: Optional[int] = None, valid_only: bool = False,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import ScanRecord
    query = db.query(ScanRecord)
    if order_id:
        query = query.filter(ScanRecord.style_order_id == order_id)
    if valid_only:
        query = query.filter(ScanRecord.is_valid == True)
    return query.all()


@app.get("/audit-logs/", response_model=List[AuditLogResponse])
def list_audit_logs(entity_type: Optional[str] = None, entity_id: Optional[int] = None,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_AUDIT):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import AuditLog
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    return query.order_by(AuditLog.created_at.desc()).all()


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


@app.get("/failed-records/", response_model=List[FailedRecordResponse])
def list_failed_records(record_type: Optional[str] = None, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    if not has_permission(user.role, Permission.VIEW_FAILED):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from app.models import FailedRecord
    query = db.query(FailedRecord)
    if record_type:
        query = query.filter(FailedRecord.record_type == record_type)
    return query.order_by(FailedRecord.created_at.desc()).all()


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
