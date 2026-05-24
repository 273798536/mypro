from datetime import datetime
from typing import Dict, Any, List

from app.models import (
    Ticket, CompensationApproval, PlaybackException,
    ReconciliationRecord, AsyncTask
)
from app.models.log_models import OperationLog
from app.database import get_db_connection


class ReconciliationService:
    def run_reconciliation(self, date: str = None, operator: str = None) -> Dict[str, Any]:
        reconcile_date = date or datetime.now().strftime('%Y-%m-%d')
        
        result = {
            'reconciliation_date': reconcile_date,
            'reconciled_at': datetime.now().isoformat(),
            'reconciled_by': operator,
            'metrics': {},
            'discrepancies': [],
        }

        try:
            ticket_count = self._count_tickets_by_date(reconcile_date)
            compensation_total = self._sum_compensation_by_date(reconcile_date)
            sla_violation_count = self._count_sla_violations(reconcile_date)
            exception_count = self._count_exceptions_by_date(reconcile_date)

            result['metrics'] = {
                'ticket_count': ticket_count,
                'compensation_total': round(compensation_total, 2),
                'sla_violation_count': sla_violation_count,
                'exception_count': exception_count,
            }

            result['discrepancies'] = self._find_discrepancies(reconcile_date)

            ReconciliationRecord.create_record(
                reconciliation_date=reconcile_date,
                ticket_count=ticket_count,
                compensation_total=compensation_total,
                sla_violation_count=sla_violation_count,
                exception_count=exception_count,
                reconciled_by=operator,
                remark=f"Found {len(result['discrepancies'])} discrepancies"
            )

            OperationLog.log_operation(
                operation_type='reconciliation_completed',
                operation_module='reconciliation',
                operator=operator,
                request_params={'date': reconcile_date},
                response_data=result['metrics'],
                response_status='success'
            )

        except Exception as e:
            OperationLog.log_operation(
                operation_type='reconciliation_failed',
                operation_module='reconciliation',
                operator=operator,
                request_params={'date': reconcile_date},
                response_data={'error': str(e)},
                response_status='failed'
            )
            raise

        return result

    def _count_tickets_by_date(self, date_str: str) -> int:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM tickets
                WHERE DATE(created_at) = ?
            """, (date_str,))
            row = cursor.fetchone()
            return row['cnt'] if row else 0

    def _sum_compensation_by_date(self, date_str: str) -> float:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COALESCE(SUM(approved_amount), 0) as total
                FROM compensation_approvals
                WHERE DATE(applied_at) = ? AND approval_status = 'approved'
            """, (date_str,))
            row = cursor.fetchone()
            return row['total'] if row else 0

    def _count_sla_violations(self, date_str: str) -> int:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(DISTINCT ticket_id) as cnt
                FROM playback_exceptions
                WHERE DATE(detected_at) = ? AND exception_type LIKE '%sla%'
            """, (date_str,))
            row = cursor.fetchone()
            return row['cnt'] if row else 0

    def _count_exceptions_by_date(self, date_str: str) -> int:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as cnt
                FROM playback_exceptions
                WHERE DATE(detected_at) = ?
            """, (date_str,))
            row = cursor.fetchone()
            return row['cnt'] if row else 0

    def _find_discrepancies(self, date_str: str) -> List[Dict[str, Any]]:
        discrepancies = []

        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT t.id, t.ticket_no, t.title,
                       c.requested_amount, c.approved_amount,
                       c.approval_status, c.version
                FROM tickets t
                LEFT JOIN compensation_approvals c ON t.id = c.ticket_id
                WHERE DATE(t.created_at) = ?
                  AND c.approval_status NOT IN ('approved', 'rejected')
                  AND c.approved_amount > 0
            """, (date_str,))
            
            for row in cursor.fetchall():
                discrepancies.append({
                    'type': 'pending_compensation',
                    'ticket_id': row['id'],
                    'ticket_no': row['ticket_no'],
                    'message': f"工单 {row['ticket_no']} 补偿审批未完成",
                    'details': {
                        'requested': row['requested_amount'],
                        'approved': row['approved_amount'],
                        'status': row['approval_status'],
                    }
                })

            cursor.execute("""
                SELECT DISTINCT pe.ticket_id, t.ticket_no,
                       pe.exception_type, pe.exception_message
                FROM playback_exceptions pe
                JOIN tickets t ON pe.ticket_id = t.id
                WHERE DATE(pe.detected_at) = ?
                  AND pe.resolution_status = 'open'
            """, (date_str,))
            
            for row in cursor.fetchall():
                discrepancies.append({
                    'type': 'open_exception',
                    'ticket_id': row['ticket_id'],
                    'ticket_no': row['ticket_no'],
                    'message': f"工单 {row['ticket_no']} 存在未解决异常",
                    'details': {
                        'exception_type': row['exception_type'],
                        'exception_message': row['exception_message'],
                    }
                })

        return discrepancies

    def get_reconciliation_history(self, limit: int = 30) -> List[Dict[str, Any]]:
        records = ReconciliationRecord.get_all(limit=limit)
        return [r.to_dict() for r in records]

    def get_reconciliation_by_date(self, date_str: str) -> Dict[str, Any]:
        record = ReconciliationRecord.get_by_date(date_str)
        return record.to_dict() if record else {}

    def trigger_reconciliation_task(self, date: str = None, operator: str = None) -> Dict[str, Any]:
        AsyncTask.create_task(
            task_type='reconciliation',
            params={'date': date, 'operator': operator},
            priority=8,
        )
        return {
            'status': 'queued',
            'message': '对账任务已加入队列',
            'date': date or datetime.now().strftime('%Y-%m-%d'),
        }
