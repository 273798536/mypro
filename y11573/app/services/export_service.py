import json
import csv
import hashlib
from datetime import datetime
from typing import Dict, Any, List
from io import StringIO

from app.models import Ticket, ImportSource, ImportRawData, OperationLog, ReconciliationRecord
from app.models.log_models import OperationLog


class ExportService:
    def __init__(self):
        self.export_dir = "data/exports"

    def export_data(self, export_type: str, filters: Dict = None) -> Dict[str, Any]:
        filters = filters or {}
        
        if export_type == 'tickets':
            return self._export_tickets(filters)
        elif export_type == 'imports':
            return self._export_imports(filters)
        elif export_type == 'logs':
            return self._export_logs(filters)
        elif export_type == 'reconciliation':
            return self._export_reconciliation(filters)
        elif export_type == 'full_evidence':
            return self._export_full_evidence(filters)
        else:
            raise ValueError(f"Unsupported export type: {export_type}")

    def _export_tickets(self, filters: Dict) -> Dict[str, Any]:
        where_clause = []
        params = []
        
        if 'status' in filters:
            where_clause.append("status = ?")
            params.append(filters['status'])
        if 'ticket_type' in filters:
            where_clause.append("ticket_type = ?")
            params.append(filters['ticket_type'])
        if 'handler' in filters:
            where_clause.append("current_handler = ?")
            params.append(filters['handler'])
        
        where_str = " AND ".join(where_clause) if where_clause else ""
        
        tickets = Ticket.query(where_str, tuple(params), order_by="created_at DESC", limit=10000)
        
        rows = []
        for ticket in tickets:
            rows.append({
                'ticket_id': ticket.id,
                'ticket_no': ticket.ticket_no,
                'title': ticket.title,
                'ticket_type': ticket.ticket_type,
                'priority_level': ticket.priority_level,
                'status': ticket.status,
                'customer_id': ticket.customer_id,
                'customer_name': ticket.customer_name,
                'current_handler': ticket.current_handler,
                'sla_rule_id': ticket.sla_rule_id,
                'created_at': ticket.created_at,
                'updated_at': ticket.updated_at,
                'resolved_at': ticket.resolved_at,
                'import_source_id': ticket.import_source_id,
                'import_raw_id': ticket.import_raw_id,
            })
        
        return self._write_export('tickets', rows)

    def _export_imports(self, filters: Dict) -> Dict[str, Any]:
        sources = ImportSource.get_all(limit=1000)
        
        rows = []
        for source in sources:
            rows.append({
                'import_id': source.id,
                'source_file_name': source.source_file_name,
                'source_file_hash': source.source_file_hash,
                'import_status': source.import_status,
                'imported_by': source.imported_by,
                'imported_at': source.imported_at,
                'total_rows': source.total_rows,
                'success_rows': source.success_rows,
                'failed_rows': source.failed_rows,
            })
        
        return self._write_export('imports', rows)

    def _export_logs(self, filters: Dict) -> Dict[str, Any]:
        logs = OperationLog.get_recent_logs(minutes=60 * 24 * 7, limit=10000)
        
        rows = []
        for log in logs:
            rows.append({
                'log_id': log.id,
                'operation_type': log.operation_type,
                'operation_module': log.operation_module,
                'operator': log.operator,
                'ip_address': log.ip_address,
                'request_path': log.request_path,
                'request_method': log.request_method,
                'response_status': log.response_status,
                'created_at': log.created_at,
                'ticket_id': log.ticket_id,
            })
        
        return self._write_export('operation_logs', rows)

    def _export_reconciliation(self, filters: Dict) -> Dict[str, Any]:
        records = ReconciliationRecord.get_all(limit=365)
        
        rows = []
        for rec in records:
            rows.append({
                'reconciliation_date': rec.reconciliation_date,
                'ticket_count': rec.ticket_count,
                'compensation_total': rec.compensation_total,
                'sla_violation_count': rec.sla_violation_count,
                'exception_count': rec.exception_count,
                'reconciliation_status': rec.reconciliation_status,
                'reconciled_by': rec.reconciled_by,
                'reconciled_at': rec.reconciled_at,
            })
        
        return self._write_export('reconciliation', rows)

    def _export_full_evidence(self, filters: Dict) -> Dict[str, Any]:
        ticket_id = filters.get('ticket_id')
        if not ticket_id:
            raise ValueError("ticket_id is required for full evidence export")
        
        ticket = Ticket.get_by_id(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")
        
        evidence = {
            'export_time': datetime.now().isoformat(),
            'ticket': ticket.to_dict(),
            'raw_data': None,
            'import_source': None,
            'operations': [],
        }
        
        if ticket.import_raw_id:
            raw = ImportRawData.get_by_id(ticket.import_raw_id)
            if raw:
                evidence['raw_data'] = {
                    'source_line_number': raw.source_line_number,
                    'raw_content': json.loads(raw.raw_content) if raw.raw_content else None,
                    'parsed_result': json.loads(raw.parsed_result) if raw.parsed_result else None,
                    'parse_status': raw.parse_status,
                }
        
        if ticket.import_source_id:
            source = ImportSource.get_by_id(ticket.import_source_id)
            if source:
                evidence['import_source'] = {
                    'file_name': source.source_file_name,
                    'file_hash': source.source_file_hash,
                    'imported_at': source.imported_at,
                    'imported_by': source.imported_by,
                }
        
        logs = OperationLog.get_by_ticket_id(ticket_id, limit=100)
        evidence['operations'] = [l.to_dict() for l in logs]
        
        export_hash = hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest()
        evidence['evidence_hash'] = export_hash
        
        file_name = f"evidence_ticket_{ticket.ticket_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        file_path = f"{self.export_dir}/{file_name}"
        
        import os
        os.makedirs(self.export_dir, exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(evidence, f, ensure_ascii=False, indent=2)
        
        OperationLog.log_operation(
            operation_type='export_evidence',
            operation_module='export',
            request_params={'ticket_id': ticket_id, 'file_name': file_name},
            response_data={'evidence_hash': export_hash},
            response_status='success'
        )
        
        return {
            'export_type': 'full_evidence',
            'file_name': file_name,
            'file_path': file_path,
            'evidence_hash': export_hash,
            'record_count': 1,
        }

    def _write_export(self, data_type: str, rows: List[Dict]) -> Dict[str, Any]:
        import os
        os.makedirs(self.export_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        file_name = f"{data_type}_{timestamp}.csv"
        file_path = f"{self.export_dir}/{file_name}"
        
        if rows:
            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
        
        checksum = self._calculate_file_checksum(file_path) if rows else None
        
        OperationLog.log_operation(
            operation_type='export_completed',
            operation_module='export',
            request_params={'export_type': data_type, 'file_name': file_name},
            response_data={'record_count': len(rows), 'checksum': checksum},
            response_status='success'
        )
        
        return {
            'export_type': data_type,
            'file_name': file_name,
            'file_path': file_path,
            'record_count': len(rows),
            'checksum': checksum,
        }

    @staticmethod
    def _calculate_file_checksum(file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def verify_export_consistency(self, file_path: str, expected_checksum: str) -> Dict[str, Any]:
        actual_checksum = self._calculate_file_checksum(file_path)
        is_consistent = actual_checksum == expected_checksum
        
        return {
            'file_path': file_path,
            'expected_checksum': expected_checksum,
            'actual_checksum': actual_checksum,
            'is_consistent': is_consistent,
        }

    def get_export_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        logs = OperationLog.query(
            "operation_type LIKE ?",
            ('export_%',),
            order_by="created_at DESC",
            limit=limit
        )
        return [l.to_dict() for l in logs]
