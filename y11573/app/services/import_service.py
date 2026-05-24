import hashlib
import json
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from io import StringIO

from app.models import ImportSource, ImportRawData, Ticket, SlaRule
from app.models.log_models import OperationLog


class ImportService:
    @staticmethod
    def calculate_file_hash(file_content: bytes) -> str:
        return hashlib.sha256(file_content).hexdigest()

    @classmethod
    def check_duplicate_import(cls, file_hash: str) -> Tuple[bool, Optional[ImportSource]]:
        source = ImportSource.get_by_hash(file_hash)
        return (source is not None, source)

    @classmethod
    def import_from_file(cls, file_path: str, imported_by: str = None) -> Dict[str, Any]:
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        file_hash = cls.calculate_file_hash(file_content)
        file_name = file_path.split('/')[-1]
        file_size = len(file_content)
        
        is_duplicate, existing_source = cls.check_duplicate_import(file_hash)
        if is_duplicate:
            OperationLog.log_operation(
                operation_type='import_duplicate_detected',
                operation_module='import',
                operator=imported_by,
                request_params={'file_name': file_name, 'file_hash': file_hash},
                response_status='duplicate'
            )
            return {
                'success': False,
                'is_duplicate': True,
                'message': f'文件已导入，来源ID: {existing_source.id}',
                'import_source_id': existing_source.id
            }
        
        import_source = ImportSource.create(
            source_file_name=file_name,
            source_file_hash=file_hash,
            source_file_size=file_size,
            import_status='parsing',
            imported_by=imported_by
        )
        
        try:
            if file_path.endswith('.json'):
                data = json.loads(file_content.decode('utf-8'))
                rows = data if isinstance(data, list) else data.get('data', [])
            elif file_path.endswith('.csv'):
                content = file_content.decode('utf-8')
                reader = csv.DictReader(StringIO(content))
                rows = list(reader)
            else:
                raise ValueError(f'不支持的文件格式: {file_path}')
            
            total_rows = len(rows)
            success_count = 0
            failed_count = 0
            
            raw_records = []
            for idx, row in enumerate(rows, start=1):
                raw_records.append({
                    'import_source_id': import_source.id,
                    'source_line_number': idx,
                    'raw_content': json.dumps(row, ensure_ascii=False),
                    'parse_status': 'pending'
                })
            
            ImportRawData.bulk_create(raw_records)
            
            for raw_data in ImportRawData.get_by_source_id(import_source.id):
                try:
                    parsed_result = cls._parse_row(raw_data.raw_content)
                    ImportRawData.update(
                        raw_data.id,
                        parse_status='success',
                        parsed_result=json.dumps(parsed_result, ensure_ascii=False),
                        parsed_at=datetime.now().isoformat()
                    )
                    
                    cls._create_ticket_from_parsed(parsed_result, import_source.id, raw_data.id)
                    success_count += 1
                except Exception as e:
                    ImportRawData.update(
                        raw_data.id,
                        parse_status='failed',
                        parse_error=str(e),
                        parsed_at=datetime.now().isoformat()
                    )
                    failed_count += 1
            
            ImportSource.update(
                import_source.id,
                import_status='completed',
                total_rows=total_rows,
                success_rows=success_count,
                failed_rows=failed_count
            )
            
            OperationLog.log_operation(
                operation_type='import_completed',
                operation_module='import',
                operator=imported_by,
                request_params={'file_name': file_name, 'import_source_id': import_source.id},
                response_data={'total': total_rows, 'success': success_count, 'failed': failed_count},
                response_status='success'
            )
            
            return {
                'success': True,
                'import_source_id': import_source.id,
                'total_rows': total_rows,
                'success_rows': success_count,
                'failed_rows': failed_count,
                'is_duplicate': False
            }
            
        except Exception as e:
            ImportSource.update(
                import_source.id,
                import_status='failed',
                remark=str(e)
            )
            raise

    @staticmethod
    def _parse_row(raw_content: str) -> Dict[str, Any]:
        raw = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
        
        parsed = {
            'ticket_no': str(raw.get('ticket_no') or raw.get('工单号') or ''),
            'title': str(raw.get('title') or raw.get('标题') or raw.get('工单标题') or ''),
            'ticket_type': str(raw.get('ticket_type') or raw.get('工单类型') or 'general'),
            'priority_level': str(raw.get('priority') or raw.get('优先级') or raw.get('priority_level') or 'normal'),
            'customer_id': str(raw.get('customer_id') or raw.get('客户ID') or ''),
            'customer_name': str(raw.get('customer_name') or raw.get('客户姓名') or ''),
            'current_handler': str(raw.get('handler') or raw.get('处理人') or raw.get('current_handler') or ''),
            'status': str(raw.get('status') or raw.get('状态') or 'open'),
            'session_summary': str(raw.get('session_summary') or raw.get('会话摘要') or ''),
            'sla_rule_code': str(raw.get('sla_rule') or raw.get('SLA规则') or ''),
            'compensation_amount': float(raw.get('compensation') or raw.get('补偿金额') or 0),
        }
        
        if not parsed['ticket_no']:
            raise ValueError('缺少工单号')
        if not parsed['title']:
            raise ValueError('缺少工单标题')
        
        return parsed

    @classmethod
    def _create_ticket_from_parsed(cls, parsed: Dict[str, Any], 
                                    import_source_id: int, import_raw_id: int) -> Ticket:
        existing = Ticket.get_by_ticket_no(parsed['ticket_no'])
        if existing:
            return existing
        
        sla_rule = None
        if parsed.get('sla_rule_code'):
            sla_rule = SlaRule.get_by_code(parsed['sla_rule_code'])
        
        if not sla_rule:
            sla_rule = SlaRule.match_rule(parsed['ticket_type'], parsed['priority_level'])
        
        ticket = Ticket.create(
            ticket_no=parsed['ticket_no'],
            title=parsed['title'],
            ticket_type=parsed['ticket_type'],
            priority_level=parsed['priority_level'],
            customer_id=parsed['customer_id'],
            customer_name=parsed['customer_name'],
            current_handler=parsed['current_handler'],
            status=parsed['status'],
            sla_rule_id=sla_rule.id if sla_rule else None,
            import_source_id=import_source_id,
            import_raw_id=import_raw_id
        )
        
        return ticket

    @classmethod
    def get_import_history(cls, limit: int = 50) -> List[Dict[str, Any]]:
        sources = ImportSource.get_all(limit=limit)
        return [s.to_dict() for s in sources]

    @classmethod
    def get_raw_data_by_source(cls, source_id: int) -> List[Dict[str, Any]]:
        raw_data_list = ImportRawData.get_by_source_id(source_id)
        return [
            {
                'id': r.id,
                'source_line_number': r.source_line_number,
                'raw_content': json.loads(r.raw_content) if r.raw_content else None,
                'parse_status': r.parse_status,
                'parsed_result': json.loads(r.parsed_result) if r.parsed_result else None,
                'parse_error': r.parse_error,
                'parsed_at': r.parsed_at
            }
            for r in raw_data_list
        ]
