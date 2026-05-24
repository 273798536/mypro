from sqlalchemy.orm import Session
from app.models import (
    StyleOrder, SizeModification, FabricTransaction, ScanRecord,
    AuditLog, FailedRecord, User, OrderStatus, FabricAction, AuditAction, RoleEnum
)
from datetime import datetime
import json
from typing import Optional, Dict, Any, List, Tuple


class AuditService:
    @staticmethod
    def log(db: Session, entity_type: str, entity_id: int, action: AuditAction,
            operator: str, old_values: Optional[Dict] = None, new_values: Optional[Dict] = None):
        diff = []
        if old_values and new_values:
            for key in set(old_values.keys()) | set(new_values.keys()):
                old_val = old_values.get(key)
                new_val = new_values.get(key)
                if old_val != new_val:
                    diff.append(f"{key}: {old_val} -> {new_val}")
        
        log = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            operator=operator,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            diff_summary="; ".join(diff) if diff else None
        )
        db.add(log)
        db.flush()
        return log


class StyleOrderService:
    @staticmethod
    def create(db: Session, data: Dict, operator: str) -> StyleOrder:
        order = StyleOrder(
            order_no=data["order_no"],
            style_code=data["style_code"],
            style_name=data.get("style_name"),
            batch_no=data.get("batch_no"),
            created_by=operator
        )
        db.add(order)
        db.flush()
        
        AuditService.log(db, "style_order", order.id, AuditAction.CREATE,
                        operator, new_values=data)
        return order

    @staticmethod
    def update(db: Session, order_id: int, data: Dict, operator: str) -> Optional[StyleOrder]:
        order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not order:
            return None
        
        if order.status == OrderStatus.FROZEN:
            raise ValueError("Cannot modify frozen order")
        
        old_values = {
            "style_name": order.style_name,
            "batch_no": order.batch_no,
            "status": order.status.value
        }
        
        if "style_name" in data:
            order.style_name = data["style_name"]
        if "batch_no" in data:
            order.batch_no = data["batch_no"]
        
        AuditService.log(db, "style_order", order.id, AuditAction.UPDATE,
                        operator, old_values=old_values, new_values=data)
        return order

    @staticmethod
    def submit(db: Session, order_id: int, operator: str) -> Optional[StyleOrder]:
        order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not order or order.status != OrderStatus.DRAFT:
            return None
        
        old_status = order.status.value
        order.status = OrderStatus.SUBMITTED
        
        AuditService.log(db, "style_order", order.id, AuditAction.SUBMIT,
                        operator, old_values={"status": old_status},
                        new_values={"status": OrderStatus.SUBMITTED.value})
        return order

    @staticmethod
    def review(db: Session, order_id: int, operator: str, approved: bool) -> Optional[StyleOrder]:
        order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not order or order.status != OrderStatus.SUBMITTED:
            return None
        
        old_status = order.status.value
        order.status = OrderStatus.REVIEWED if approved else OrderStatus.REJECTED
        order.reviewed_by = operator
        order.reviewed_at = datetime.utcnow()
        
        AuditService.log(db, "style_order", order.id, AuditAction.REVIEW,
                        operator, old_values={"status": old_status},
                        new_values={"status": order.status.value, "reviewed_by": operator})
        return order

    @staticmethod
    def freeze(db: Session, order_id: int, operator: str) -> Optional[StyleOrder]:
        order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not order:
            return None
        
        old_status = order.status.value
        order.status = OrderStatus.FROZEN
        order.frozen_by = operator
        order.frozen_at = datetime.utcnow()
        
        AuditService.log(db, "style_order", order.id, AuditAction.FREEZE,
                        operator, old_values={"status": old_status},
                        new_values={"status": OrderStatus.FROZEN.value, "frozen_by": operator})
        return order

    @staticmethod
    def create_new_version(db: Session, order_id: int, operator: str) -> Optional[StyleOrder]:
        old_order = db.query(StyleOrder).filter(StyleOrder.id == order_id).first()
        if not old_order:
            return None
        
        new_version = old_order.version + 1
        new_order = StyleOrder(
            order_no=f"{old_order.order_no}_v{new_version}",
            style_code=old_order.style_code,
            style_name=old_order.style_name,
            version=new_version,
            parent_id=old_order.id,
            batch_no=old_order.batch_no,
            created_by=operator
        )
        db.add(new_order)
        db.flush()
        
        for sm in old_order.size_modifications:
            new_sm = SizeModification(
                style_order_id=new_order.id,
                size_code=sm.size_code,
                part_name=sm.part_name,
                old_value=sm.new_value,
                new_value=sm.new_value,
                version=new_version,
                created_by=operator
            )
            db.add(new_sm)
        
        for ft in old_order.fabric_transactions:
            if ft.is_active:
                new_ft = FabricTransaction(
                    style_order_id=new_order.id,
                    fabric_code=ft.fabric_code,
                    fabric_name=ft.fabric_name,
                    action=ft.action,
                    quantity=ft.quantity,
                    unit=ft.unit,
                    batch_no=ft.batch_no,
                    warehouse=ft.warehouse,
                    operator=operator,
                    version=new_version,
                    is_active=True
                )
                db.add(new_ft)
        
        AuditService.log(db, "style_order", new_order.id, AuditAction.CREATE,
                        operator, new_values={"parent_id": old_order.id, "version": new_version})
        return new_order


class FabricService:
    @staticmethod
    def add_transaction(db: Session, style_order_id: int, data: Dict, operator: str) -> Optional[FabricTransaction]:
        order = db.query(StyleOrder).filter(StyleOrder.id == style_order_id).first()
        if not order or order.status == OrderStatus.FROZEN:
            return None
        
        tx = FabricTransaction(
            style_order_id=style_order_id,
            fabric_code=data["fabric_code"],
            fabric_name=data.get("fabric_name"),
            action=data["action"],
            quantity=data["quantity"],
            unit=data.get("unit", "meter"),
            batch_no=data.get("batch_no"),
            warehouse=data.get("warehouse"),
            operator=operator,
            remark=data.get("remark"),
            version=order.version
        )
        db.add(tx)
        db.flush()
        
        AuditService.log(db, "fabric", tx.id, AuditAction.CREATE, operator, new_values=data)
        return tx

    @staticmethod
    def get_fabric_balance(db: Session, fabric_code: str, style_order_id: Optional[int] = None) -> float:
        query = db.query(FabricTransaction).filter(
            FabricTransaction.fabric_code == fabric_code,
            FabricTransaction.is_active == True
        )
        if style_order_id:
            query = query.filter(FabricTransaction.style_order_id == style_order_id)
        
        balance = 0.0
        for tx in query.all():
            if tx.action == FabricAction.IN:
                balance += tx.quantity
            elif tx.action == FabricAction.OUT:
                balance -= tx.quantity
        return balance

    @staticmethod
    def validate_out_transaction(db: Session, fabric_code: str, quantity: float,
                                  style_order_id: Optional[int] = None) -> Tuple[bool, str]:
        balance = FabricService.get_fabric_balance(db, fabric_code, style_order_id)
        if balance < quantity:
            return False, f"Insufficient fabric balance. Available: {balance}, Requested: {quantity}"
        return True, ""


class SizeModificationService:
    @staticmethod
    def add_modification(db: Session, style_order_id: int, data: Dict, operator: str) -> Optional[SizeModification]:
        order = db.query(StyleOrder).filter(StyleOrder.id == style_order_id).first()
        if not order or order.status == OrderStatus.FROZEN:
            return None
        
        sm = SizeModification(
            style_order_id=style_order_id,
            size_code=data["size_code"],
            part_name=data["part_name"],
            old_value=data.get("old_value"),
            new_value=data["new_value"],
            modification_reason=data.get("modification_reason"),
            version=order.version,
            created_by=operator
        )
        db.add(sm)
        db.flush()
        
        AuditService.log(db, "size_modification", sm.id, AuditAction.CREATE, operator, new_values=data)
        return sm


class ScanService:
    @staticmethod
    def import_scan(db: Session, scan_data: List[Dict], operator: str, source: str = "manual") -> Dict:
        success_count = 0
        failed_count = 0
        
        for record in scan_data:
            try:
                if "scan_code" not in record:
                    raise ValueError("Missing required field: scan_code")
                
                style_order_id = record.get("style_order_id")
                if style_order_id:
                    order = db.query(StyleOrder).filter(StyleOrder.id == style_order_id).first()
                    if not order:
                        raise ValueError(f"Style order {style_order_id} not found")
                
                scan = ScanRecord(
                    style_order_id=style_order_id,
                    scan_code=record["scan_code"],
                    scan_type=record.get("scan_type"),
                    fabric_code=record.get("fabric_code"),
                    quantity=record.get("quantity", 1),
                    scanner=operator,
                    location=record.get("location"),
                    remark=record.get("remark")
                )
                
                if scan.fabric_code and style_order_id:
                    ok, err = FabricService.validate_out_transaction(
                        db, scan.fabric_code, scan.quantity, style_order_id
                    )
                    if not ok:
                        scan.is_valid = False
                        scan.validation_error = err
                        FailedRecordService.add(db, "scan", record, err, source)
                        failed_count += 1
                    else:
                        db.add(scan)
                        success_count += 1
                else:
                    db.add(scan)
                    success_count += 1
                
            except Exception as e:
                FailedRecordService.add(db, "scan", record, str(e), source)
                failed_count += 1
        
        db.flush()
        return {"success": success_count, "failed": failed_count}


class FailedRecordService:
    @staticmethod
    def add(db: Session, record_type: str, raw_data: Dict, error_message: str, source: str):
        failed = FailedRecord(
            record_type=record_type,
            raw_data=json.dumps(raw_data),
            error_message=error_message,
            source=source
        )
        db.add(failed)
        return failed


class ReplayService:
    @staticmethod
    def get_order_history(db: Session, order_id: int) -> List[Dict]:
        logs = db.query(AuditLog).filter(
            AuditLog.entity_type == "style_order",
            AuditLog.entity_id == order_id
        ).order_by(AuditLog.created_at).all()
        
        return [{
            "timestamp": log.created_at.isoformat(),
            "action": log.action.value,
            "operator": log.operator,
            "diff": log.diff_summary
        } for log in logs]

    @staticmethod
    def compare_versions(db: Session, order_id_v1: int, order_id_v2: int) -> Dict:
        v1 = db.query(StyleOrder).filter(StyleOrder.id == order_id_v1).first()
        v2 = db.query(StyleOrder).filter(StyleOrder.id == order_id_v2).first()
        
        if not v1 or not v2:
            return {"error": "Order not found"}
        
        fabrics_v1 = db.query(FabricTransaction).filter(
            FabricTransaction.style_order_id == order_id_v1,
            FabricTransaction.is_active == True
        ).all()
        fabrics_v2 = db.query(FabricTransaction).filter(
            FabricTransaction.style_order_id == order_id_v2,
            FabricTransaction.is_active == True
        ).all()
        
        fabric_balance_v1 = {}
        fabric_balance_v2 = {}
        
        for f in fabrics_v1:
            fabric_balance_v1[f.fabric_code] = fabric_balance_v1.get(f.fabric_code, 0) + (
                f.quantity if f.action == FabricAction.IN else -f.quantity
            )
        for f in fabrics_v2:
            fabric_balance_v2[f.fabric_code] = fabric_balance_v2.get(f.fabric_code, 0) + (
                f.quantity if f.action == FabricAction.IN else -f.quantity
            )
        
        return {
            "order_v1": {"version": v1.version, "status": v1.status.value},
            "order_v2": {"version": v2.version, "status": v2.status.value},
            "fabric_diff": {
                k: {
                    "v1": fabric_balance_v1.get(k, 0),
                    "v2": fabric_balance_v2.get(k, 0),
                    "diff": fabric_balance_v2.get(k, 0) - fabric_balance_v1.get(k, 0)
                }
                for k in set(fabric_balance_v1.keys()) | set(fabric_balance_v2.keys())
            }
        }


class UserService:
    @staticmethod
    def init_default_users(db: Session):
        users = [
            ("entry_clerk", RoleEnum.DATA_ENTRY),
            ("reviewer_zhang", RoleEnum.REVIEWER),
            ("supervisor_wang", RoleEnum.SUPERVISOR),
            ("viewer_li", RoleEnum.READ_ONLY)
        ]
        
        for username, role in users:
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                db.add(User(username=username, role=role))
        db.commit()
