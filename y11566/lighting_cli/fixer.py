from datetime import datetime
from sqlalchemy.orm import Session
from .database import WorkOrder, AsyncTask, AuditLog
from .utils import parse_datetime, safe_int, safe_str


class DataFixer:
    def __init__(self, db_session: Session, config: dict):
        self.db = db_session
        self.config = config
    
    def fix_work_order(self, work_order_id, field_updates, fixed_by='manual', reason='manual_fix'):
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return {'success': False, 'error': 'Work order not found'}
        
        updated_fields = []
        
        for field, new_value in field_updates.items():
            if not hasattr(work_order, field):
                continue
            
            old_value = getattr(work_order, field)
            old_value_str = str(old_value) if old_value is not None else ''
            new_value_str = str(new_value) if new_value is not None else ''
            
            if old_value_str == new_value_str:
                continue
            
            self._log_audit(work_order_id, field, old_value_str, new_value_str, fixed_by, reason)
            
            if 'time' in field:
                setattr(work_order, field, parse_datetime(new_value))
            elif 'quantity' in field:
                setattr(work_order, field, safe_int(new_value))
            else:
                setattr(work_order, field, safe_str(new_value))
            
            updated_fields.append(field)
        
        if updated_fields:
            work_order.check_status = 'needs_recheck'
            work_order.updated_at = datetime.now()
            
            pending_tasks = self.db.query(AsyncTask).filter(
                AsyncTask.work_order_id == work_order_id,
                AsyncTask.status == 'pending_manual'
            ).all()
            
            for task in pending_tasks:
                task.status = 'pending'
            
            self.db.commit()
        
        return {
            'success': True,
            'updated_fields': updated_fields,
            'work_order_id': work_order_id
        }
    
    def batch_fix(self, fixes, fixed_by='manual'):
        results = []
        for fix in fixes:
            work_order_id = fix.get('work_order_id')
            field_updates = fix.get('fields', {})
            reason = fix.get('reason', 'batch_fix')
            result = self.fix_work_order(work_order_id, field_updates, fixed_by, reason)
            results.append(result)
        
        return results
    
    def _log_audit(self, work_order_id, field_name, old_value, new_value, changed_by, reason):
        audit = AuditLog(
            work_order_id=work_order_id,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            changed_by=changed_by,
            change_reason=reason
        )
        self.db.add(audit)
    
    def mark_as_manual_fixed(self, work_order_id, fixed_by='manual'):
        work_order = self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        if not work_order:
            return {'success': False, 'error': 'Work order not found'}
        
        work_order.check_status = 'passed'
        work_order.check_error = None
        work_order.check_error_type = None
        
        pending_tasks = self.db.query(AsyncTask).filter(
            AsyncTask.work_order_id == work_order_id,
            AsyncTask.status == 'pending_manual'
        ).all()
        
        for task in pending_tasks:
            task.status = 'completed'
            task.completed_at = datetime.now()
        
        self._log_audit(work_order_id, 'check_status', 'failed', 'passed', fixed_by, 'manual_approval')
        
        self.db.commit()
        return {'success': True, 'work_order_id': work_order_id}
    
    def get_pending_manual_tasks(self, batch_id=None):
        query = self.db.query(AsyncTask).filter(AsyncTask.status == 'pending_manual')
        
        if batch_id:
            query = query.join(AsyncTask.work_order).join(WorkOrder.import_record).filter(
                WorkOrder.import_record.has(batch_id=batch_id)
            )
        
        return query.all()
