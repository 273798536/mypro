from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models import (
    User, BorrowApplication, ExpressOrder, CompensationRecord, RefundRecord,
    AuditLog, ImportRecord, InventoryDifference,
    WorkflowStatus, RecordStatus, DamageType
)
from app.schemas import (
    BorrowApplicationCreate, BorrowApplicationUpdate,
    ExpressOrderCreate, ExpressOrderUpdate,
    CompensationRecordCreate, CompensationRecordUpdate,
    RefundRecordCreate, RefundRecordUpdate,
    CostCalculationResponse, CostBreakdown
)
import json


def log_audit(
    db: Session,
    user: User,
    action: str,
    table_name: str,
    record_id: int,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    change_reason: Optional[str] = None,
    ip_address: Optional[str] = None
):
    audit_log = AuditLog(
        user_id=user.id,
        user_name=user.username,
        user_role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        action=action,
        table_name=table_name,
        record_id=record_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        change_reason=change_reason,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.flush()


def detect_dirty_record(db: Session, record_type: str, record_id: int) -> List[str]:
    issues = []
    
    if record_type == "borrow_application":
        record = db.query(BorrowApplication).filter(BorrowApplication.id == record_id).first()
        if not record:
            return issues
        
        if not record.reader_name or not record.reader_id or not record.book_title:
            issues.append("缺少必填字段")
        if not record.lending_library or not record.borrowing_library:
            issues.append("缺少必填字段")
        if record.apply_date and record.expected_return_date:
            if record.apply_date > record.expected_return_date:
                issues.append("申请日期晚于应还日期")
        if record.actual_return_date and record.expected_return_date:
            if (record.actual_return_date - record.expected_return_date).days >= 1:
                issues.append("跨日")
        
        if record.raw_original_data and record.reader_name:
            try:
                original = json.loads(record.raw_original_data)
                original_name = original.get("reader_name")
                if original_name and original_name != record.reader_name:
                    issues.append("改名")
            except (json.JSONDecodeError, TypeError):
                pass
    
    elif record_type == "express_order":
        record = db.query(ExpressOrder).filter(ExpressOrder.id == record_id).first()
        if not record:
            return issues
        
        if not record.order_no:
            issues.append("缺少必填字段")
        if record.send_date and record.receive_date:
            if record.send_date > record.receive_date:
                issues.append("寄件日期晚于收件日期")
            if (record.receive_date - record.send_date).days >= 1:
                issues.append("跨日")
        
        if record.shipping_cost is not None and record.shipping_cost < 0:
            issues.append("金额冲突")
    
    elif record_type == "compensation_record":
        record = db.query(CompensationRecord).filter(CompensationRecord.id == record_id).first()
        if not record:
            return issues
        
        if not record.reader_name or not record.reader_id or not record.damage_type:
            issues.append("缺少必填字段")
        if record.total_amount is not None and record.total_amount < 0:
            issues.append("金额冲突")
        if record.overdue_days is not None and record.overdue_days < 0:
            issues.append("数量冲突")
        
        if record.total_amount is not None and record.total_amount > 0:
            calculated = (record.overdue_days or 0) * (record.daily_overdue_fee or 0) + \
                         (record.soiling_fee or 0) + (record.other_fees or 0)
            if abs(record.total_amount - calculated) > 0.01:
                issues.append("金额冲突")
        
        if record.raw_original_data and record.reader_name:
            try:
                original = json.loads(record.raw_original_data)
                original_name = original.get("reader_name")
                if original_name and original_name != record.reader_name:
                    issues.append("改名")
            except (json.JSONDecodeError, TypeError):
                pass
    
    elif record_type == "refund_record":
        record = db.query(RefundRecord).filter(RefundRecord.id == record_id).first()
        if not record:
            return issues
        
        if not record.refund_no or not record.reader_id:
            issues.append("缺少必填字段")
        if record.refund_amount is not None and record.refund_amount < 0:
            issues.append("金额冲突")
        
        if record.compensation_record_id:
            comp = db.query(CompensationRecord).filter(
                CompensationRecord.id == record.compensation_record_id
            ).first()
            if comp and comp.paid_amount is not None:
                total_refunds = db.query(RefundRecord).filter(
                    RefundRecord.compensation_record_id == record.compensation_record_id,
                    RefundRecord.id != record_id
                ).all()
                total_refunded = sum(r.refund_amount or 0 for r in total_refunds) + (record.refund_amount or 0)
                if total_refunded > comp.paid_amount:
                    issues.append("金额冲突")
    
    elif record_type == "inventory_difference":
        record = db.query(InventoryDifference).filter(InventoryDifference.id == record_id).first()
        if not record:
            return issues
        
        if record.expected_quantity is not None and record.actual_quantity is not None:
            if record.expected_quantity < 0 or record.actual_quantity < 0:
                issues.append("数量冲突")
            if record.difference_quantity is not None:
                expected_diff = record.expected_quantity - record.actual_quantity
                if expected_diff != record.difference_quantity:
                    issues.append("数量冲突")
    
    return issues


def validate_record_status(db: Session, record_type: str, record_id: int) -> RecordStatus:
    issues = detect_dirty_record(db, record_type, record_id)
    if not issues:
        return RecordStatus.NORMAL
    
    if "缺少必填字段" in issues:
        return RecordStatus.DIRTY_MISSING_FIELD
    elif "跨日" in issues:
        return RecordStatus.DIRTY_CROSS_DAY
    elif "改名" in issues:
        return RecordStatus.DIRTY_NAME_CHANGE
    elif "金额冲突" in issues:
        return RecordStatus.DIRTY_AMOUNT_CONFLICT
    elif "数量冲突" in issues:
        return RecordStatus.DIRTY_QUANTITY_CONFLICT
    
    return RecordStatus.NEEDS_MANUAL_CONFIRM


def check_duplicate(db: Session, record_type: str, unique_key: str) -> bool:
    if record_type == "borrow_application":
        return db.query(BorrowApplication).filter(BorrowApplication.application_no == unique_key).first() is not None
    elif record_type == "express_order":
        return db.query(ExpressOrder).filter(ExpressOrder.order_no == unique_key).first() is not None
    elif record_type == "compensation_record":
        return db.query(CompensationRecord).filter(CompensationRecord.record_no == unique_key).first() is not None
    elif record_type == "refund_record":
        return db.query(RefundRecord).filter(RefundRecord.refund_no == unique_key).first() is not None
    return False


def create_borrow_application(db: Session, app: BorrowApplicationCreate, user: User, raw_data: Optional[str] = None) -> BorrowApplication:
    db_app = BorrowApplication(
        **app.model_dump(),
        created_by=user.id,
        raw_original_data=raw_data or json.dumps(app.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_app)
    db.flush()
    
    record_status = validate_record_status(db, "borrow_application", db_app.id)
    if record_status != RecordStatus.NORMAL:
        db_app.record_status = record_status
        log_audit(db, user, "标记异常记录", "borrow_applications", db_app.id, 
                   change_reason=f"自动检测到异常: {record_status.value}")
    
    log_audit(db, user, "创建借阅申请", "borrow_applications", db_app.id)
    return db_app


def update_borrow_application(db: Session, app_id: int, update: BorrowApplicationUpdate, user: User) -> Optional[BorrowApplication]:
    db_app = db.query(BorrowApplication).filter(BorrowApplication.id == app_id).first()
    if not db_app:
        return None
    
    update_data = update.model_dump(exclude_unset=True)
    change_reason = update_data.pop("change_reason", None)
    
    for field, new_value in update_data.items():
        old_value = getattr(db_app, field)
        if old_value != new_value:
            setattr(db_app, field, new_value)
            log_audit(db, user, "更新字段", "borrow_applications", app_id,
                       field_name=field,
                       old_value=str(old_value) if old_value else None,
                       new_value=str(new_value) if new_value else None,
                       change_reason=change_reason)
    
    db_app.updated_by = user.id
    db_app.updated_at = datetime.now()
    
    record_status = validate_record_status(db, "borrow_application", app_id)
    if record_status != RecordStatus.NORMAL and db_app.record_status == RecordStatus.NORMAL:
        db_app.record_status = record_status
        log_audit(db, user, "标记异常记录", "borrow_applications", app_id,
                   change_reason=f"更新后检测到异常: {record_status.value}")
    
    log_audit(db, user, "更新借阅申请", "borrow_applications", app_id, change_reason=change_reason)
    return db_app


def create_express_order(db: Session, order: ExpressOrderCreate, user: User, raw_data: Optional[str] = None) -> ExpressOrder:
    db_order = ExpressOrder(
        **order.model_dump(),
        created_by=user.id,
        raw_original_data=raw_data or json.dumps(order.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_order)
    db.flush()
    
    record_status = validate_record_status(db, "express_order", db_order.id)
    if record_status != RecordStatus.NORMAL:
        db_order.record_status = record_status
        log_audit(db, user, "标记异常记录", "express_orders", db_order.id,
                   change_reason=f"自动检测到异常: {record_status.value}")
    
    log_audit(db, user, "创建快递单", "express_orders", db_order.id)
    return db_order


def create_compensation_record(db: Session, record: CompensationRecordCreate, user: User, raw_data: Optional[str] = None) -> CompensationRecord:
    db_record = CompensationRecord(
        **record.model_dump(),
        created_by=user.id,
        raw_original_data=raw_data or json.dumps(record.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_record)
    db.flush()
    
    record_status = validate_record_status(db, "compensation_record", db_record.id)
    if record_status != RecordStatus.NORMAL:
        db_record.record_status = record_status
        log_audit(db, user, "标记异常记录", "compensation_records", db_record.id,
                   change_reason=f"自动检测到异常: {record_status.value}")
    
    log_audit(db, user, "创建赔偿记录", "compensation_records", db_record.id)
    return db_record


def create_refund_record(db: Session, record: RefundRecordCreate, user: User, raw_data: Optional[str] = None) -> RefundRecord:
    db_record = RefundRecord(
        **record.model_dump(),
        created_by=user.id,
        raw_original_data=raw_data or json.dumps(record.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_record)
    db.flush()
    
    record_status = validate_record_status(db, "refund_record", db_record.id)
    if record_status != RecordStatus.NORMAL:
        db_record.record_status = record_status
        log_audit(db, user, "标记异常记录", "refund_records", db_record.id,
                   change_reason=f"自动检测到异常: {record_status.value}")
    
    log_audit(db, user, "创建退款记录", "refund_records", db_record.id)
    return db_record


def transition_workflow_status(
    db: Session,
    record_type: str,
    record_id: int,
    new_status: WorkflowStatus,
    user: User,
    rejection_reason: Optional[str] = None
) -> bool:
    model_map = {
        "borrow_application": BorrowApplication,
        "express_order": ExpressOrder,
        "compensation_record": CompensationRecord,
        "refund_record": RefundRecord,
        "inventory_difference": InventoryDifference
    }
    
    model = model_map.get(record_type)
    if not model:
        return False
    
    record = db.query(model).filter(model.id == record_id).first()
    if not record:
        return False
    
    old_status = record.status
    record.status = new_status
    
    if rejection_reason:
        record.rejection_reason = rejection_reason
    
    record.updated_by = user.id
    record.updated_at = datetime.now()
    
    log_audit(db, user, f"状态变更: {old_status.value} -> {new_status.value}",
               record_type, record_id,
               field_name="status",
               old_value=old_status.value,
               new_value=new_status.value,
               change_reason=rejection_reason)
    
    return True


def calculate_cost_trace(db: Session, application_no: str) -> Tuple[CostBreakdown, List[str]]:
    app = db.query(BorrowApplication).filter(BorrowApplication.application_no == application_no).first()
    if not app:
        return CostBreakdown(), ["未找到借阅申请"]
    
    trace = []
    breakdown = CostBreakdown()
    
    trace.append(f"开始计算申请 {application_no} 的费用")
    trace.append(f"读者: {app.reader_name}, 图书: {app.book_title}")
    
    if app.actual_return_date and app.expected_return_date:
        overdue_days = (app.actual_return_date - app.expected_return_date).days
        if overdue_days > 0:
            breakdown.overdue_days = overdue_days
            daily_fee = 0.5
            for comp in app.compensation_records:
                if comp.daily_overdue_fee:
                    daily_fee = comp.daily_overdue_fee
                    break
            breakdown.overdue_cost = overdue_days * daily_fee
            trace.append(f"逾期 {overdue_days} 天, 每日 {daily_fee} 元, 合计 {breakdown.overdue_cost} 元")
        else:
            trace.append("无逾期")
    
    for comp in app.compensation_records:
        if comp.damage_type == DamageType.SOILED:
            breakdown.soiling_cost += comp.soiling_fee or 0
            trace.append(f"污损费用: {comp.soiling_fee or 0} 元")
        elif comp.damage_type in [DamageType.LOST, DamageType.DAMAGED]:
            breakdown.damage_cost += comp.compensation_amount or 0
            trace.append(f"赔偿费用: {comp.compensation_amount or 0} 元")
        if comp.other_fees:
            breakdown.other_cost += comp.other_fees
            trace.append(f"其他费用: {comp.other_fees} 元")
        if comp.paid_amount:
            breakdown.paid_amount += comp.paid_amount
            trace.append(f"已支付: {comp.paid_amount} 元")
    
    for express in app.express_orders:
        if express.shipping_cost:
            breakdown.shipping_cost += express.shipping_cost
            trace.append(f"快递费用: {express.shipping_cost} 元")
    
    for refund in app.refund_records:
        if refund.refund_amount:
            breakdown.refund_amount += refund.refund_amount
            trace.append(f"退款: {refund.refund_amount} 元")
    
    breakdown.total_cost = breakdown.overdue_cost + breakdown.soiling_cost + \
                           breakdown.damage_cost + breakdown.shipping_cost + breakdown.other_cost
    breakdown.final_balance = breakdown.total_cost - breakdown.paid_amount + breakdown.refund_amount
    
    trace.append(f"总费用: {breakdown.total_cost} 元")
    trace.append(f"最终余额: {breakdown.final_balance} 元")
    
    return breakdown, trace


def get_statistics(db: Session) -> Dict:
    total_apps = db.query(BorrowApplication).count()
    
    unprocessed = db.query(BorrowApplication).filter(
        BorrowApplication.record_status.in_([
            RecordStatus.DIRTY_MISSING_FIELD,
            RecordStatus.DIRTY_CROSS_DAY,
            RecordStatus.DIRTY_NAME_CHANGE,
            RecordStatus.DIRTY_AMOUNT_CONFLICT,
            RecordStatus.DIRTY_QUANTITY_CONFLICT
        ])
    ).count()
    
    corrected = db.query(BorrowApplication).filter(
        BorrowApplication.record_status == RecordStatus.CORRECTED
    ).count()
    
    needs_confirm = db.query(BorrowApplication).filter(
        BorrowApplication.record_status == RecordStatus.NEEDS_MANUAL_CONFIRM
    ).count()
    
    total_comp = db.query(CompensationRecord).all()
    total_comp_amount = sum(c.total_amount or 0 for c in total_comp)
    
    total_refund = db.query(RefundRecord).all()
    total_refund_amount = sum(r.refund_amount or 0 for r in total_refund)
    
    by_status = {}
    for status in RecordStatus:
        count = db.query(BorrowApplication).filter(
            BorrowApplication.record_status == status
        ).count()
        by_status[status.value] = count
    
    by_damage = {}
    for dtype in DamageType:
        count = db.query(CompensationRecord).filter(
            CompensationRecord.damage_type == dtype
        ).count()
        by_damage[dtype.value] = count
    
    by_workflow = {}
    for wf in WorkflowStatus:
        count = db.query(BorrowApplication).filter(
            BorrowApplication.status == wf
        ).count()
        by_workflow[wf.value] = count
    
    return {
        "total_records": total_apps,
        "unprocessed_records": unprocessed,
        "corrected_records": corrected,
        "needs_manual_confirm_records": needs_confirm,
        "total_compensation_amount": total_comp_amount,
        "total_refund_amount": total_refund_amount,
        "by_record_status": by_status,
        "by_damage_type": by_damage,
        "by_workflow_status": by_workflow
    }


def get_role_view(db: Session, user: User) -> Dict:
    recent_changes = db.query(AuditLog).order_by(
        AuditLog.created_at.desc()
    ).limit(20).all()
    
    pending_items = []
    if user.role in ["reviewer", "supervisor"]:
        pending = db.query(BorrowApplication).filter(
            BorrowApplication.status == WorkflowStatus.SUBMITTED
        ).limit(10).all()
        for item in pending:
            pending_items.append({
                "id": item.id,
                "application_no": item.application_no,
                "reader_name": item.reader_name,
                "book_title": item.book_title,
                "status": item.status.value,
                "created_at": item.created_at
            })
    
    summary = get_statistics(db)
    
    return {
        "view_type": user.role.value,
        "summary": summary,
        "recent_changes": recent_changes,
        "pending_items": pending_items
    }
