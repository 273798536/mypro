from datetime import datetime
from sqlalchemy.orm import Session
from tabulate import tabulate
from .database import AuditLog, WorkOrder, ImportRecord


class HistoryManager:
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def get_work_order_history(self, work_order_id=None, fact_id=None, limit=50):
        query = self.db.query(AuditLog).order_by(AuditLog.changed_at.desc())
        
        if work_order_id:
            query = query.filter(AuditLog.work_order_id == work_order_id)
        elif fact_id:
            wo = self.db.query(WorkOrder).filter(WorkOrder.fact_id == fact_id).first()
            if wo:
                query = query.filter(AuditLog.work_order_id == wo.id)
        
        return query.limit(limit).all()
    
    def get_batch_history(self, batch_id, limit=100):
        query = self.db.query(AuditLog).filter(
            AuditLog.batch_id == batch_id
        ).order_by(AuditLog.changed_at.desc())
        return query.limit(limit).all()
    
    def get_all_import_batches(self):
        return self.db.query(ImportRecord).order_by(ImportRecord.imported_at.desc()).all()
    
    def format_history_table(self, audit_logs):
        table_data = []
        for log in audit_logs:
            work_order = log.work_order
            table_data.append([
                log.id,
                work_order.id if work_order else 'N/A',
                work_order.fact_id if work_order else 'N/A',
                log.field_name,
                (log.old_value or '')[:30],
                (log.new_value or '')[:30],
                log.changed_by,
                log.changed_at.strftime('%Y-%m-%d %H:%M:%S') if log.changed_at else '',
                log.change_reason or ''
            ])
        
        headers = ['日志ID', '工单ID', '事实ID', '字段', '旧值', '新值', '修改人', '修改时间', '原因']
        return tabulate(table_data, headers=headers, tablefmt='simple')
    
    def format_batches_table(self, batches):
        table_data = []
        for batch in batches:
            table_data.append([
                batch.batch_id,
                batch.source_type,
                batch.file_name,
                batch.import_strategy,
                batch.imported_by,
                batch.imported_at.strftime('%Y-%m-%d %H:%M:%S') if batch.imported_at else '',
                batch.total_rows,
                batch.success_count,
                batch.failed_count,
                batch.skipped_count,
                batch.status
            ])
        
        headers = ['批次ID', '来源类型', '文件名', '策略', '导入人', '导入时间', '总行数', '成功', '失败', '跳过', '状态']
        return tabulate(table_data, headers=headers, tablefmt='simple')
