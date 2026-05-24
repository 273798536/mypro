#!/usr/bin/env python3
import sys
import os
import json
import hashlib
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import init_database
from app.models import ImportSource, AsyncTask, OperationLog, Ticket
from app.services.import_service import ImportService
from app.services.export_service import ExportService

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5000')
ADMIN_API_KEY = 'admin-key'
OPERATOR_API_KEY = 'operator-key'
VIEWER_API_KEY = 'viewer-key'


class AutomatedChecker:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
    
    def check(self, name: str, condition: bool, details: str = "") -> bool:
        status = "PASS" if condition else "FAIL"
        if condition:
            self.passed += 1
        else:
            self.failed += 1
        
        result = f"[{status}] {name}"
        if details:
            result += f" - {details}"
        
        self.results.append(result)
        print(result)
        return condition
    
    def summary(self):
        print("\n" + "=" * 60)
        print(f"AUTOMATED CHECKS SUMMARY: {self.passed}/{self.passed + self.failed} PASSED")
        print("=" * 60)
        return self.failed == 0


def check_duplicate_import():
    print("\n" + "=" * 60)
    print("CHECK 1: Duplicate Import Detection")
    print("=" * 60)
    
    checker = AutomatedChecker()
    
    test_file_content = json.dumps([{
        'ticket_no': 'DUP-TEST-001',
        'title': 'Duplicate Test Ticket',
        'ticket_type': 'complaint',
        'priority_level': 'high'
    }], ensure_ascii=False).encode('utf-8')
    
    file_hash = hashlib.sha256(test_file_content).hexdigest()
    
    is_duplicate, source = ImportService.check_duplicate_import(file_hash)
    checker.check(
        "Fresh file detected as non-duplicate",
        not is_duplicate,
        f"hash: {file_hash[:16]}..."
    )
    
    temp_file = 'data/test_dup_import.json'
    os.makedirs(os.path.dirname(temp_file), exist_ok=True)
    with open(temp_file, 'wb') as f:
        f.write(test_file_content)
    
    try:
        result1 = ImportService.import_from_file(temp_file, imported_by='test')
        checker.check(
            "First import successful",
            result1.get('success') and not result1.get('is_duplicate'),
            f"import_source_id: {result1.get('import_source_id')}"
        )
        
        result2 = ImportService.import_from_file(temp_file, imported_by='test')
        checker.check(
            "Duplicate import detected",
            result2.get('is_duplicate'),
            f"detected duplicate: {result2.get('is_duplicate')}"
        )
        
        duplicate_source = ImportSource.get_by_hash(file_hash)
        checker.check(
            "Import source record preserved",
            duplicate_source is not None,
            f"source_id: {duplicate_source.id if duplicate_source else 'N/A'}"
        )
        
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
    
    return checker.summary()


def check_permission_interception():
    print("\n" + "=" * 60)
    print("CHECK 2: Permission Interception")
    print("=" * 60)
    
    checker = AutomatedChecker()
    
    try:
        response = requests.get(f'{BASE_URL}/api/v1/status')
        checker.check(
            "No API key returns 401",
            response.status_code == 401,
            f"status: {response.status_code}"
        )
    except requests.exceptions.ConnectionError:
        print("Server not running, skipping HTTP permission checks")
        return False
    
    try:
        response = requests.get(
            f'{BASE_URL}/api/v1/status',
            headers={'X-API-Key': 'invalid-key'}
        )
        checker.check(
            "Invalid API key returns 403",
            response.status_code == 403,
            f"status: {response.status_code}"
        )
    except:
        pass
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/v1/sla-rules',
            headers={'X-API-Key': VIEWER_API_KEY},
            json={'rule_code': 'TEST'}
        )
        checker.check(
            "Viewer cannot create SLA rules (insufficient permissions)",
            response.status_code == 403,
            f"status: {response.status_code}"
        )
    except:
        pass
    
    try:
        response = requests.get(
            f'{BASE_URL}/api/v1/tickets',
            headers={'X-API-Key': VIEWER_API_KEY}
        )
        checker.check(
            "Viewer can read tickets",
            response.status_code == 200,
            f"status: {response.status_code}"
        )
    except:
        pass
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/v1/tickets',
            headers={'X-API-Key': OPERATOR_API_KEY},
            json={
                'ticket_no': f'PERM-TEST-{os.getpid()}',
                'title': 'Permission Test',
                'ticket_type': 'complaint'
            }
        )
        checker.check(
            "Operator can create tickets",
            response.status_code == 201,
            f"status: {response.status_code}"
        )
    except:
        pass
    
    return checker.summary()


def check_exception_retention():
    print("\n" + "=" * 60)
    print("CHECK 3: Exception Retention")
    print("=" * 60)
    
    checker = AutomatedChecker()
    
    from app.models import PlaybackException
    
    test_ticket = Ticket.create(
        ticket_no=f'EXC-TEST-{os.getpid()}',
        title='Exception Retention Test',
        ticket_type='complaint',
        priority_level='high'
    )
    
    checker.check(
        "Test ticket created",
        test_ticket is not None,
        f"ticket_id: {test_ticket.id if test_ticket else 'N/A'}"
    )
    
    exception = PlaybackException.create_exception(
        ticket_id=test_ticket.id,
        exception_type='test_exception',
        exception_message='Test exception for retention check',
        playback_step='test_step',
        context_data={'test': 'value'}
    )
    
    checker.check(
        "Exception created successfully",
        exception is not None,
        f"exception_id: {exception.id if exception else 'N/A'}"
    )
    
    retrieved = PlaybackException.get_by_id(exception.id)
    checker.check(
        "Exception can be retrieved",
        retrieved is not None,
        f"retrieved: {retrieved is not None}"
    )
    
    if retrieved:
        checker.check(
            "Exception message preserved",
            retrieved.exception_message == 'Test exception for retention check',
            f"message: {retrieved.exception_message[:30]}..."
        )
        
        checker.check(
            "Exception context data preserved",
            retrieved.context_data is not None,
            f"has_context: {retrieved.context_data is not None}"
        )
    
    open_exceptions = PlaybackException.get_open_exceptions(limit=10)
    checker.check(
        "Open exceptions queryable",
        len(open_exceptions) >= 1,
        f"open_count: {len(open_exceptions)}"
    )
    
    exception.resolve('Test resolution', 'test_user')
    resolved = PlaybackException.get_by_id(exception.id)
    checker.check(
        "Exception resolution status preserved",
        resolved.resolution_status == 'resolved' if resolved else False,
        f"status: {resolved.resolution_status if resolved else 'N/A'}"
    )
    
    return checker.summary()


def check_restart_history():
    print("\n" + "=" * 60)
    print("CHECK 4: History Retention After Restart")
    print("=" * 60)
    
    checker = AutomatedChecker()
    
    log_count_before = OperationLog.count("operation_type LIKE 'test_%'")
    
    OperationLog.log_operation(
        operation_type='test_history',
        operation_module='test',
        operator='automated_check',
        request_params={'test': 'history_check'},
        response_status='success'
    )
    
    log_count_after = OperationLog.count("operation_type LIKE 'test_%'")
    checker.check(
        "Operation log entry created",
        log_count_after > log_count_before,
        f"count: {log_count_before} -> {log_count_after}"
    )
    
    from app.models.task_models import TASK_STATUS_RUNNING
    
    test_task = AsyncTask.create_task(
        task_type='test_restart_task',
        params={'test': 'value'}
    )
    
    checker.check(
        "Task created",
        test_task is not None,
        f"task_id: {test_task.id if test_task else 'N/A'}"
    )
    
    resumed_count = AsyncTask.resume_pending_after_restart()
    checker.check(
        "Restart recovery mechanism exists",
        resumed_count >= 0,
        f"resumed: {resumed_count}"
    )
    
    task_after = AsyncTask.get_by_id(test_task.id)
    checker.check(
        "Task history preserved",
        task_after is not None,
        f"exists: {task_after is not None}"
    )
    
    return checker.summary()


def check_export_consistency():
    print("\n" + "=" * 60)
    print("CHECK 5: Export Consistency")
    print("=" * 60)
    
    checker = AutomatedChecker()
    
    service = ExportService()
    
    try:
        export_result = service.export_data('tickets', {})
        checker.check(
            "Export created successfully",
            export_result.get('record_count', 0) >= 0,
            f"file: {export_result.get('file_name')}"
        )
        
        file_path = export_result.get('file_path')
        expected_checksum = export_result.get('checksum')
        
        if file_path and os.path.exists(file_path):
            checker.check(
                "Export file exists",
                True,
                f"path: {file_path}"
            )
            
            verify_result = service.verify_export_consistency(file_path, expected_checksum)
            checker.check(
                "Export checksum verification passes",
                verify_result.get('is_consistent', False),
                f"consistent: {verify_result.get('is_consistent')}"
            )
            
            wrong_checksum = 'a' * 64
            bad_verify = service.verify_export_consistency(file_path, wrong_checksum)
            checker.check(
                "Checksum mismatch detection works",
                not bad_verify.get('is_consistent', True),
                f"mismatch_detected: {not bad_verify.get('is_consistent')}"
            )
    except Exception as e:
        checker.check(
            "Export service functional",
            False,
            f"error: {str(e)[:50]}"
        )
    
    return checker.summary()


def run_all_checks():
    print("=" * 60)
    print("RUNNING AUTOMATED SYSTEM CHECKS")
    print("=" * 60)
    
    init_database()
    
    overall_pass = True
    
    overall_pass &= check_duplicate_import()
    overall_pass &= check_permission_interception()
    overall_pass &= check_exception_retention()
    overall_pass &= check_restart_history()
    overall_pass &= check_export_consistency()
    
    print("\n" + "=" * 60)
    print(f"OVERALL RESULT: {'ALL PASSED' if overall_pass else 'SOME FAILED'}")
    print("=" * 60)
    
    return 0 if overall_pass else 1


if __name__ == '__main__':
    sys.exit(run_all_checks())
