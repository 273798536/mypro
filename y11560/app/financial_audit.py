import json
import pandas as pd
from io import BytesIO
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from .models import (
    AuditBatch, BatchStatus, CheckinRecord, DepositRecord, RoomChangeRecord,
    DirtyRecord, DirtyRecordType, StateTransition, SupervisorComment, User
)
from .schemas import FinancialSummary
from .diff_tracker import get_freeze_status_comparison


def calculate_batch_financials(batch: AuditBatch, db: Session) -> Dict[str, Any]:
    checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch.id).all()
    deposits = db.query(DepositRecord).filter(DepositRecord.batch_id == batch.id).all()
    room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch.id).all()
    
    total_room_fee = sum(c.actual_room_fee for c in checkins)
    total_deposit = sum(d.deposit_amount for d in deposits)
    total_invoice = sum(c.invoice_amount for c in checkins)
    total_rate_diff = sum(r.rate_difference for r in room_changes)
    
    extended_stays = [c for c in checkins if c.is_extended]
    midnight_room_changes = [r for r in room_changes if r.change_time and 0 <= r.change_time.hour < 6]
    
    return {
        "total_room_fee": total_room_fee,
        "total_deposit": total_deposit,
        "total_invoice": total_invoice,
        "total_rate_diff": total_rate_diff,
        "discrepancy_amount": total_invoice - total_room_fee,
        "checkin_count": len(checkins),
        "deposit_count": len(deposits),
        "room_change_count": len(room_changes),
        "extended_stay_count": len(extended_stays),
        "midnight_room_change_count": len(midnight_room_changes),
    }


def get_financial_summary(db: Session, batch_id: int) -> Optional[FinancialSummary]:
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        return None
    
    freeze_info = get_freeze_status_comparison(db, batch_id)
    financials = calculate_batch_financials(batch, db)
    
    dirty_records = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id).all()
    dirty_summary = {}
    for dr in dirty_records:
        dr_type = dr.dirty_type.value
        dirty_summary[dr_type] = dirty_summary.get(dr_type, 0) + 1
    
    manual_reason = None
    if freeze_info.get("is_frozen"):
        comments = db.query(SupervisorComment).filter(
            SupervisorComment.batch_id == batch_id
        ).order_by(SupervisorComment.created_at.desc()).first()
        if comments:
            manual_reason = comments.comment
    
    return FinancialSummary(
        batch_no=batch.batch_no,
        audit_date=batch.audit_date,
        status_before_freeze=freeze_info.get("status_before_freeze"),
        status_after_freeze=freeze_info.get("status_after_freeze"),
        total_room_fee=financials["total_room_fee"],
        total_deposit=financials["total_deposit"],
        total_invoice=financials["total_invoice"],
        discrepancy_amount=financials["discrepancy_amount"],
        manual_reason=manual_reason or batch.freeze_reason,
        dirty_record_summary=dirty_summary,
    )


def export_batch_to_excel(db: Session, batch_ids: List[int], include_dirty_records: bool = True, include_state_transitions: bool = True) -> BytesIO:
    output = BytesIO()
    writer = pd.ExcelWriter(output, engine='openpyxl')
    
    summary_data = []
    all_checkins = []
    all_deposits = []
    all_room_changes = []
    all_dirty_records = []
    all_transitions = []
    
    for batch_id in batch_ids:
        batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
        if not batch:
            continue
        
        fin_summary = get_financial_summary(db, batch_id)
        
        summary_data.append({
            "批次号": batch.batch_no,
            "审计日期": batch.audit_date.strftime("%Y-%m-%d") if batch.audit_date else "",
            "状态": batch.status.value,
            "总房费": fin_summary.total_room_fee if fin_summary else 0,
            "总押金": fin_summary.total_deposit if fin_summary else 0,
            "总发票": fin_summary.total_invoice if fin_summary else 0,
            "差异金额": fin_summary.discrepancy_amount if fin_summary else 0,
            "冻结原因": batch.freeze_reason or "",
            "创建时间": batch.created_at.strftime("%Y-%m-%d %H:%M:%S") if batch.created_at else "",
        })
        
        checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch_id).all()
        for c in checkins:
            all_checkins.append({
                "批次号": batch.batch_no,
                "记录编号": c.record_no,
                "客人姓名": c.guest_name,
                "房间号": c.room_no,
                "入住时间": c.checkin_time.strftime("%Y-%m-%d %H:%M:%S") if c.checkin_time else "",
                "退房时间": c.checkout_time.strftime("%Y-%m-%d %H:%M:%S") if c.checkout_time else "",
                "房价": c.room_rate,
                "实际房费": c.actual_room_fee,
                "发票金额": c.invoice_amount,
                "是否延住": "是" if c.is_extended else "否",
            })
        
        deposits = db.query(DepositRecord).filter(DepositRecord.batch_id == batch_id).all()
        for d in deposits:
            all_deposits.append({
                "批次号": batch.batch_no,
                "记录编号": d.record_no,
                "入住单号": d.checkin_record_no,
                "客人姓名": d.guest_name,
                "房间号": d.room_no,
                "押金金额": d.deposit_amount,
                "押金方式": d.deposit_method,
                "押金时间": d.deposit_time.strftime("%Y-%m-%d %H:%M:%S") if d.deposit_time else "",
                "退款金额": d.refund_amount,
                "余额": d.balance,
            })
        
        room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch_id).all()
        for r in room_changes:
            all_room_changes.append({
                "批次号": batch.batch_no,
                "记录编号": r.record_no,
                "入住单号": r.checkin_record_no,
                "客人姓名": r.guest_name,
                "原房间号": r.old_room_no,
                "新房间号": r.new_room_no,
                "换房时间": r.change_time.strftime("%Y-%m-%d %H:%M:%S") if r.change_time else "",
                "原房价": r.old_room_rate,
                "新房价": r.new_room_rate,
                "差价": r.rate_difference,
                "原因": r.reason,
            })
        
        if include_dirty_records:
            dirty_records = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id).all()
            for dr in dirty_records:
                resolver = db.query(User).filter(User.id == dr.resolved_by).first() if dr.resolved_by else None
                all_dirty_records.append({
                    "批次号": batch.batch_no,
                    "记录类型": dr.record_type.value,
                    "脏记录类型": dr.dirty_type.value,
                    "描述": dr.description,
                    "字段名": dr.field_name or "",
                    "原始值": dr.original_value or "",
                    "修正值": dr.corrected_value or "",
                    "是否已解决": "是" if dr.is_resolved else "否",
                    "解决人": resolver.username if resolver else "",
                    "解决时间": dr.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if dr.resolved_at else "",
                    "解决备注": dr.resolution_note or "",
                })
        
        if include_state_transitions:
            transitions = db.query(StateTransition).filter(StateTransition.batch_id == batch_id).all()
            for t in transitions:
                operator = db.query(User).filter(User.id == t.transition_by).first()
                all_transitions.append({
                    "批次号": batch.batch_no,
                    "从状态": t.from_status.value,
                    "到状态": t.to_status.value,
                    "操作人": operator.username if operator else "",
                    "操作时间": t.transition_at.strftime("%Y-%m-%d %H:%M:%S") if t.transition_at else "",
                    "原因": t.reason or "",
                })
    
    pd.DataFrame(summary_data).to_excel(writer, sheet_name='财务汇总', index=False)
    pd.DataFrame(all_checkins).to_excel(writer, sheet_name='入住记录', index=False)
    pd.DataFrame(all_deposits).to_excel(writer, sheet_name='押金流水', index=False)
    pd.DataFrame(all_room_changes).to_excel(writer, sheet_name='换房记录', index=False)
    
    if include_dirty_records and all_dirty_records:
        pd.DataFrame(all_dirty_records).to_excel(writer, sheet_name='异常记录', index=False)
    
    if include_state_transitions and all_transitions:
        pd.DataFrame(all_transitions).to_excel(writer, sheet_name='状态流转', index=False)
    
    writer.close()
    output.seek(0)
    return output


def explain_anomalies(db: Session, batch_id: int) -> Dict[str, Any]:
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        return {}
    
    checkins = db.query(CheckinRecord).filter(CheckinRecord.batch_id == batch_id).all()
    room_changes = db.query(RoomChangeRecord).filter(RoomChangeRecord.batch_id == batch_id).all()
    
    explanations = []
    
    extended_stays = [c for c in checkins if c.is_extended]
    if extended_stays:
        explanations.append({
            "type": "extended_stay",
            "title": "延住导致房费不同步",
            "description": f"发现 {len(extended_stays)} 笔延住记录，延住可能导致系统自动计算的房费与实际收取房费不一致。",
            "details": [
                {
                    "guest_name": c.guest_name,
                    "room_no": c.room_no,
                    "original_checkout": c.original_checkout.strftime("%Y-%m-%d") if c.original_checkout else "",
                    "actual_checkout": c.checkout_time.strftime("%Y-%m-%d") if c.checkout_time else "",
                    "room_fee": c.actual_room_fee,
                    "invoice_amount": c.invoice_amount,
                }
                for c in extended_stays
            ]
        })
    
    midnight_changes = [r for r in room_changes if r.change_time and 0 <= r.change_time.hour < 6]
    if midnight_changes:
        explanations.append({
            "type": "midnight_room_change",
            "title": "半夜换房导致费用不同步",
            "description": f"发现 {len(midnight_changes)} 笔半夜换房记录（00:00-06:00），换房时间跨夜可能导致房费计算、押金、发票不同步。",
            "details": [
                {
                    "guest_name": r.guest_name,
                    "old_room_no": r.old_room_no,
                    "new_room_no": r.new_room_no,
                    "change_time": r.change_time.strftime("%Y-%m-%d %H:%M:%S") if r.change_time else "",
                    "old_rate": r.old_room_rate,
                    "new_rate": r.new_room_rate,
                    "rate_diff": r.rate_difference,
                }
                for r in midnight_changes
            ]
        })
    
    dirty_records = db.query(DirtyRecord).filter(
        DirtyRecord.batch_id == batch_id,
        DirtyRecord.is_resolved == False
    ).all()
    
    return {
        "batch_no": batch.batch_no,
        "audit_date": batch.audit_date,
        "explanations": explanations,
        "unresolved_issues_count": len(dirty_records),
    }
