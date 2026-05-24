import os
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    CompensationQueue,
    CompensationStatus,
    ImportRecord
)
from app.schemas.schemas import (
    StatisticsSummary,
    NightAuditReportItem
)

EXPORT_DIR = "exports"


def ensure_export_dir():
    if not os.path.exists(EXPORT_DIR):
        os.makedirs(EXPORT_DIR)


def get_statistics_summary(db: Session) -> StatisticsSummary:
    query = db.query(CompensationQueue)
    
    total_count = query.count()
    total_amount = sum(c.amount for c in query.all()) if total_count > 0 else 0
    
    pending_count = query.filter(CompensationQueue.status == CompensationStatus.PENDING).count()
    processing_count = query.filter(CompensationQueue.status == CompensationStatus.PROCESSING).count()
    waiting_retry_count = query.filter(CompensationQueue.status == CompensationStatus.WAITING_RETRY).count()
    waiting_manual_count = query.filter(CompensationQueue.status == CompensationStatus.WAITING_MANUAL).count()
    manual_takeover_count = query.filter(CompensationQueue.status == CompensationStatus.MANUAL_TAKEOVER).count()
    compensated_count = query.filter(CompensationQueue.status == CompensationStatus.COMPENSATED).count()
    permanent_failed_count = query.filter(CompensationQueue.status == CompensationStatus.PERMANENT_FAILED).count()
    closed_count = query.filter(CompensationQueue.status == CompensationStatus.CLOSED).count()
    
    compensated_amount = sum(
        c.amount for c in query.filter(CompensationQueue.status == CompensationStatus.COMPENSATED).all()
    ) if compensated_count > 0 else 0
    
    return StatisticsSummary(
        total_count=total_count,
        pending_count=pending_count,
        processing_count=processing_count,
        waiting_retry_count=waiting_retry_count,
        waiting_manual_count=waiting_manual_count,
        manual_takeover_count=manual_takeover_count,
        compensated_count=compensated_count,
        permanent_failed_count=permanent_failed_count,
        closed_count=closed_count,
        total_amount=total_amount,
        compensated_amount=compensated_amount
    )


def get_retryable_items(db: Session) -> List[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.status.in_([
            CompensationStatus.WAITING_RETRY,
            CompensationStatus.WAITING_MANUAL
        ])
    ).order_by(CompensationQueue.next_retry_at.asc()).all()


def get_dead_letter_items(db: Session) -> List[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.status == CompensationStatus.PERMANENT_FAILED
    ).order_by(CompensationQueue.created_at.desc()).all()


def get_recovery_items(db: Session) -> List[CompensationQueue]:
    return db.query(CompensationQueue).filter(
        CompensationQueue.status == CompensationStatus.PROCESSING
    ).order_by(CompensationQueue.last_processed_at.asc()).all()


def build_night_audit_report_item(
    compensation: CompensationQueue,
    import_record: Optional[ImportRecord]
) -> NightAuditReportItem:
    return NightAuditReportItem(
        compensation_no=compensation.compensation_no,
        source_type=compensation.source_type.value,
        check_in_no=compensation.check_in_no,
        room_no=compensation.room_no,
        guest_name=compensation.guest_name,
        amount=compensation.amount,
        deposit_amount=compensation.deposit_amount,
        invoice_amount=compensation.invoice_amount,
        status=compensation.status.value,
        retry_count=compensation.retry_count,
        last_error_message=compensation.last_error_message,
        created_at=compensation.created_at,
        source_file=import_record.source_file if import_record else None,
        original_row_number=import_record.original_row_number if import_record else None
    )


def export_night_audit_report(
    db: Session,
    status_filter: Optional[CompensationStatus] = None,
    include_retryable: bool = False,
    include_dead_letter: bool = False,
    include_recovery: bool = False
) -> str:
    ensure_export_dir()
    
    compensations = []
    
    if include_retryable:
        compensations.extend(get_retryable_items(db))
    elif include_dead_letter:
        compensations.extend(get_dead_letter_items(db))
    elif include_recovery:
        compensations.extend(get_recovery_items(db))
    elif status_filter:
        compensations = db.query(CompensationQueue).filter(
            CompensationQueue.status == status_filter
        ).all()
    else:
        compensations = db.query(CompensationQueue).all()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"night_audit_report_{timestamp}.csv"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            '补偿单号',
            '来源类型',
            '入住单号',
            '房间号',
            '客人姓名',
            '金额',
            '押金金额',
            '发票金额',
            '状态',
            '重试次数',
            '最后错误信息',
            '创建时间',
            '来源文件',
            '原始行号'
        ])
        
        for comp in compensations:
            import_record = db.query(ImportRecord).filter(
                ImportRecord.id == comp.import_record_id
            ).first() if comp.import_record_id else None
            
            writer.writerow([
                comp.compensation_no,
                comp.source_type.value,
                comp.check_in_no or '',
                comp.room_no or '',
                comp.guest_name or '',
                comp.amount,
                comp.deposit_amount,
                comp.invoice_amount,
                comp.status.value,
                comp.retry_count,
                comp.last_error_message or '',
                comp.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                import_record.source_file if import_record else '',
                import_record.original_row_number if import_record else ''
            ])
    
    return filepath


def export_retryable_classification(db: Session) -> str:
    ensure_export_dir()
    
    items = get_retryable_items(db)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"retryable_classification_{timestamp}.csv"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            '补偿单号',
            '状态',
            '来源类型',
            '入住单号',
            '房间号',
            '金额',
            '重试次数',
            '最大重试次数',
            '下次重试时间',
            '错误类型',
            '错误信息'
        ])
        
        for item in items:
            writer.writerow([
                item.compensation_no,
                item.status.value,
                item.source_type.value,
                item.check_in_no or '',
                item.room_no or '',
                item.amount,
                item.retry_count,
                item.max_retry_times,
                item.next_retry_at.strftime('%Y-%m-%d %H:%M:%S') if item.next_retry_at else '',
                item.last_failure_type.value if item.last_failure_type else '',
                item.last_error_message or ''
            ])
    
    return filepath


def export_dead_letter_report(db: Session) -> str:
    ensure_export_dir()
    
    items = get_dead_letter_items(db)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"dead_letter_report_{timestamp}.csv"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            '补偿单号',
            '来源类型',
            '入住单号',
            '房间号',
            '金额',
            '重试次数',
            '失败时间',
            '错误信息',
            '建议处理方式'
        ])
        
        for item in items:
            suggestion = "建议人工核查数据准确性后手动补偿或关闭"
            writer.writerow([
                item.compensation_no,
                item.source_type.value,
                item.check_in_no or '',
                item.room_no or '',
                item.amount,
                item.retry_count,
                item.updated_at.strftime('%Y-%m-%d %H:%M:%S') if item.updated_at else '',
                item.last_error_message or '',
                suggestion
            ])
    
    return filepath


def export_recovery_report(db: Session) -> str:
    ensure_export_dir()
    
    items = get_recovery_items(db)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"recovery_report_{timestamp}.csv"
    filepath = os.path.join(EXPORT_DIR, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            '补偿单号',
            '来源类型',
            '入住单号',
            '房间号',
            '金额',
            '最后处理时间',
            'Celery任务ID',
            '建议处理方式'
        ])
        
        for item in items:
            time_diff = (datetime.utcnow() - item.last_processed_at).total_seconds() / 60 if item.last_processed_at else 0
            if time_diff > 30:
                suggestion = "处理超时，建议检查任务状态后手动重置重试"
            else:
                suggestion = "处理中，建议等待或检查Celery工作状态"
            
            writer.writerow([
                item.compensation_no,
                item.source_type.value,
                item.check_in_no or '',
                item.room_no or '',
                item.amount,
                item.last_processed_at.strftime('%Y-%m-%d %H:%M:%S') if item.last_processed_at else '',
                item.celery_task_id or '',
                suggestion
            ])
    
    return filepath
