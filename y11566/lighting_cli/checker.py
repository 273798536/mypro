from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import WorkOrder, AsyncTask, AuditLog


class DataChecker:
    ERROR_CATEGORIES = {
        'retryable': ['network_error', 'timeout_error', 'external_api_error'],
        'manual': ['data_integrity_error', 'business_rule_error', 'validation_error'],
        'permanent': ['invalid_data_error', 'corrupted_data_error', 'security_error']
    }
    
    def __init__(self, db_session: Session, config: dict):
        self.db = db_session
        self.config = config
    
    def check_all(self, batch_id=None):
        query = self.db.query(WorkOrder)
        if batch_id:
            query = query.join(WorkOrder.import_record).filter(
                WorkOrder.import_record.has(batch_id=batch_id)
            )
        
        work_orders = query.all()
        results = {'checked': 0, 'passed': 0, 'failed': 0, 'retryable': 0, 'manual': 0, 'permanent': 0}
        
        for wo in work_orders:
            check_result = self.check_work_order(wo)
            results['checked'] += 1
            if check_result['passed']:
                results['passed'] += 1
            else:
                results['failed'] += 1
                category = check_result['error_category']
                if category in results:
                    results[category] += 1
                self._create_async_task_if_needed(wo, check_result)
        
        return results
    
    def check_work_order(self, work_order: WorkOrder):
        errors = []
        error_category = None
        
        required_fields = self.config['check']['required_fields']
        for field in required_fields:
            value = getattr(work_order, field, None)
            if not value or not str(value).strip():
                errors.append(f'缺少必填字段: {field}')
                error_category = 'manual'
        
        severity_levels = self.config['check']['severity_levels']
        if work_order.severity and work_order.severity not in severity_levels:
            errors.append(f'无效的严重级别: {work_order.severity}')
            error_category = 'manual'
        
        if work_order.spare_part_quantity is not None:
            if work_order.spare_part_quantity < 0:
                errors.append('备件数量不能为负数')
                error_category = 'manual'
        
        if work_order.hotline_time and work_order.hotline_time > datetime.now():
            errors.append('来电时间不能晚于当前时间')
            error_category = 'manual'
        
        if work_order.location and self._check_duplicate_location_issue(work_order):
            pass
        
        passed = len(errors) == 0
        
        work_order.check_status = 'passed' if passed else 'failed'
        work_order.check_error = '; '.join(errors) if errors else None
        work_order.check_error_type = error_category if not passed else None
        
        self.db.commit()
        
        return {
            'passed': passed,
            'errors': errors,
            'error_category': error_category
        }
    
    def _check_duplicate_location_issue(self, work_order: WorkOrder):
        duplicates = self.db.query(WorkOrder).filter(
            WorkOrder.fact_id != work_order.fact_id,
            WorkOrder.location == work_order.location,
            WorkOrder.issue_type == work_order.issue_type,
            WorkOrder.status != 'resolved'
        ).all()
        return len(duplicates) > 0
    
    def _create_async_task_if_needed(self, work_order: WorkOrder, check_result: dict):
        if check_result['passed']:
            return
        
        error_category = check_result['error_category']
        
        existing_task = self.db.query(AsyncTask).filter(
            AsyncTask.work_order_id == work_order.id,
            AsyncTask.status.in_(['pending', 'retrying'])
        ).first()
        
        if existing_task:
            return
        
        task = AsyncTask(
            work_order_id=work_order.id,
            task_type='data_validation',
            status='pending',
            error_category=error_category,
            last_error=check_result['errors'][0] if check_result['errors'] else None
        )
        
        if error_category == 'retryable':
            task.next_retry_at = datetime.now() + timedelta(minutes=5)
        elif error_category == 'manual':
            task.status = 'pending_manual'
        elif error_category == 'permanent':
            task.status = 'failed_permanently'
        
        self.db.add(task)
        self.db.commit()
    
    def get_failed_work_orders(self, error_category=None, batch_id=None):
        query = self.db.query(WorkOrder).filter(WorkOrder.check_status == 'failed')
        
        if error_category:
            query = query.filter(WorkOrder.check_error_type == error_category)
        
        if batch_id:
            query = query.join(WorkOrder.import_record).filter(
                WorkOrder.import_record.has(batch_id=batch_id)
            )
        
        return query.all()
    
    def retry_failed_tasks(self):
        retryable_tasks = self.db.query(AsyncTask).filter(
            AsyncTask.error_category == 'retryable',
            AsyncTask.status.in_(['pending', 'retrying']),
            AsyncTask.retry_count < AsyncTask.max_retries,
            AsyncTask.next_retry_at <= datetime.now()
        ).all()
        
        retried = 0
        for task in retryable_tasks:
            task.retry_count += 1
            task.started_at = datetime.now()
            
            work_order = task.work_order
            check_result = self.check_work_order(work_order)
            
            if check_result['passed']:
                task.status = 'completed'
                task.completed_at = datetime.now()
            else:
                if task.retry_count >= task.max_retries:
                    task.status = 'pending_manual'
                    task.error_category = 'manual'
                    work_order.check_error_type = 'manual'
                else:
                    task.status = 'retrying'
                    task.next_retry_at = datetime.now() + timedelta(minutes=5 * task.retry_count)
            
            self.db.commit()
            retried += 1
        
        return {'retried': retried}
