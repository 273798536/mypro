from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import pandas as pd
from io import BytesIO
from app.models.ledger import EquipmentLedger, LedgerStatus, RecordType, DuplicateHandling
from app.models.user import UserRole
from app.core.security import apply_field_masking


def ledger_to_export_dict(ledger: EquipmentLedger) -> Dict[str, Any]:
    return {
        'ID': ledger.id,
        '批次号': ledger.batch_number,
        '记录类型': ledger.record_type.value if ledger.record_type else '',
        '状态': ledger.status.value if ledger.status else '',
        '客户名称': ledger.customer_name or '',
        '设备名称': ledger.equipment_name or '',
        '设备型号': ledger.equipment_model or '',
        '数量': ledger.quantity or 0,
        '单价': str(ledger.unit_price) if ledger.unit_price else '',
        '总金额': str(ledger.total_amount) if ledger.total_amount else '',
        '押金金额': str(ledger.deposit_amount) if ledger.deposit_amount else '',
        '已扣押金': str(ledger.deposit_deducted) if ledger.deposit_deducted else '',
        '租赁开始': ledger.rental_start_date.strftime('%Y-%m-%d') if ledger.rental_start_date else '',
        '租赁结束': ledger.rental_end_date.strftime('%Y-%m-%d') if ledger.rental_end_date else '',
        '实际归还': ledger.actual_return_date.strftime('%Y-%m-%d') if ledger.actual_return_date else '',
        '是否脏数据': '是' if ledger.is_dirty else '否',
        '脏数据类型': ledger.dirty_type.value if ledger.dirty_type else '',
        '脏数据说明': ledger.dirty_note or '',
        '修正意见': ledger.correction_note or '',
        '是否重复': '是' if ledger.is_duplicate else '否',
        '重复处理方式': ledger.duplicate_handling.value if ledger.duplicate_handling else '',
        '重复说明': ledger.duplicate_note or '',
        '驳回原因': ledger.rejection_reason or '',
        '变更原因': ledger.change_reason or '',
        '创建时间': ledger.created_at.strftime('%Y-%m-%d %H:%M:%S') if ledger.created_at else '',
        '提交时间': ledger.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if ledger.submitted_at else '',
        '审核时间': ledger.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if ledger.reviewed_at else ''
    }


def apply_export_masking(data: Dict[str, Any], user_role: UserRole) -> Dict[str, Any]:
    if user_role == UserRole.READ_ONLY:
        sensitive_fields = ['单价', '总金额', '押金金额', '已扣押金']
        for field in sensitive_fields:
            if field in data and data[field]:
                data[field] = '***'
    return data


def export_to_excel(
    db: Session,
    user_role: UserRole,
    status: Optional[LedgerStatus] = None,
    record_type: Optional[RecordType] = None,
    is_dirty: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> BytesIO:
    query = db.query(EquipmentLedger)
    
    if status:
        query = query.filter(EquipmentLedger.status == status)
    if record_type:
        query = query.filter(EquipmentLedger.record_type == record_type)
    if is_dirty is not None:
        query = query.filter(EquipmentLedger.is_dirty == is_dirty)
    if is_duplicate is not None:
        query = query.filter(EquipmentLedger.is_duplicate == is_duplicate)
    if start_date:
        query = query.filter(EquipmentLedger.created_at >= start_date)
    if end_date:
        query = query.filter(EquipmentLedger.created_at <= end_date)
    
    records = query.order_by(EquipmentLedger.created_at.desc()).all()
    
    export_data = []
    for record in records:
        row = ledger_to_export_dict(record)
        row = apply_export_masking(row, user_role)
        export_data.append(row)
    
    df = pd.DataFrame(export_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='台账明细', index=False)
        
        worksheet = writer.sheets['台账明细']
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max(),
                len(str(col))
            ) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    return output


def export_summary(
    db: Session,
    user_role: UserRole,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> BytesIO:
    query = db.query(EquipmentLedger)
    
    if start_date:
        query = query.filter(EquipmentLedger.created_at >= start_date)
    if end_date:
        query = query.filter(EquipmentLedger.created_at <= end_date)
    
    records = query.all()
    
    summary_data = []
    for status in LedgerStatus:
        status_records = [r for r in records if r.status == status]
        total_quantity = sum(r.quantity or 0 for r in status_records if not (r.is_duplicate and r.duplicate_handling == DuplicateHandling.IGNORE))
        total_amount = sum(r.total_amount or Decimal('0') for r in status_records if not (r.is_duplicate and r.duplicate_handling == DuplicateHandling.IGNORE))
        total_deposit = sum(r.deposit_amount or Decimal('0') for r in status_records if not (r.is_duplicate and r.duplicate_handling == DuplicateHandling.IGNORE))
        
        summary_data.append({
            '状态': status.value,
            '记录数': len(status_records),
            '总数量': total_quantity,
            '总金额': str(total_amount),
            '总押金': str(total_deposit)
        })
    
    dirty_records = [r for r in records if r.is_dirty]
    duplicate_records = [r for r in records if r.is_duplicate]
    
    summary_data.append({
        '状态': '脏数据',
        '记录数': len(dirty_records),
        '总数量': '',
        '总金额': '',
        '总押金': ''
    })
    
    summary_data.append({
        '状态': '重复数据',
        '记录数': len(duplicate_records),
        '总数量': '',
        '总金额': '',
        '总押金': ''
    })
    
    df = pd.DataFrame(summary_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='汇总统计', index=False)
        
        worksheet = writer.sheets['汇总统计']
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max(),
                len(str(col))
            ) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 30)
    
    output.seek(0)
    return output


def export_finance_view(
    db: Session,
    user_role: UserRole,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> BytesIO:
    query = db.query(EquipmentLedger).filter(
        EquipmentLedger.status == LedgerStatus.SECOND_CONFIRMED
    )
    
    if start_date:
        query = query.filter(EquipmentLedger.second_confirmed_at >= start_date)
    if end_date:
        query = query.filter(EquipmentLedger.second_confirmed_at <= end_date)
    
    records = query.order_by(EquipmentLedger.second_confirmed_at.desc()).all()
    
    finance_data = []
    for record in records:
        row = {
            '批次号': record.batch_number,
            '客户名称': record.customer_name or '',
            '设备名称': record.equipment_name or '',
            '数量': record.quantity or 0,
            '总金额': str(record.total_amount) if record.total_amount else '',
            '押金金额': str(record.deposit_amount) if record.deposit_amount else '',
            '已扣押金': str(record.deposit_deducted) if record.deposit_deducted else '',
            '二次确认时间': record.second_confirmed_at.strftime('%Y-%m-%d %H:%M:%S') if record.second_confirmed_at else '',
            '变更原因': record.change_reason or '',
            '是否有脏数据': '是' if record.is_dirty else '否',
            '是否有重复': '是' if record.is_duplicate else '否'
        }
        row = apply_export_masking(row, user_role)
        finance_data.append(row)
    
    df = pd.DataFrame(finance_data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='财务视图', index=False)
        
        worksheet = writer.sheets['财务视图']
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max(),
                len(str(col))
            ) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 30)
    
    output.seek(0)
    return output
