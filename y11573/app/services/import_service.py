import hashlib
import json
import csv
import os
import zipfile
import tarfile
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from io import StringIO

from app.models import (
    ImportSource, ImportRawData, Ticket, SlaRule,
    SessionSummary, CompensationApproval
)
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
            warning_count = 0
            failed_count = 0
            failed_records = []
            warning_records = []
            corrected_records = []
            
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
                    
                    warnings = parsed_result.pop('_warnings', [])
                    suggestions = parsed_result.pop('_suggestions', [])
                    parsed_result.pop('_raw', None)
                    parsed_result.pop('_errors', None)
                    
                    parse_status = 'success'
                    if warnings:
                        parse_status = 'warning'
                        warning_count += 1
                        warning_records.append({
                            'line_number': raw_data.source_line_number,
                            'ticket_no': parsed_result.get('ticket_no'),
                            'warnings': warnings,
                            'suggestions': suggestions
                        })
                    else:
                        success_count += 1
                    
                    ImportRawData.update(
                        raw_data.id,
                        parse_status=parse_status,
                        parsed_result=json.dumps(parsed_result, ensure_ascii=False),
                        parse_warnings=json.dumps(warnings, ensure_ascii=False) if warnings else None,
                        parse_suggestions=json.dumps(suggestions, ensure_ascii=False) if suggestions else None,
                        parsed_at=datetime.now().isoformat()
                    )
                    
                    cls._create_ticket_from_parsed(parsed_result, import_source.id, raw_data.id)
                    
                    if warnings:
                        corrected_records.append({
                            'line_number': raw_data.source_line_number,
                            'ticket_no': parsed_result.get('ticket_no'),
                            'original_values': {
                                'compensation_amount': parsed_result.get('compensation_amount'),
                                'approved_amount': parsed_result.get('approved_amount')
                            },
                            'warnings': warnings,
                            'suggestions': suggestions
                        })
                    
                except Exception as e:
                    error_type = 'parse_error'
                    error_details = str(e)
                    
                    if '缺少' in error_details or '缺失' in error_details:
                        error_type = 'missing_field'
                    elif '金额' in error_details:
                        error_type = 'amount_error'
                    elif '时间' in error_details:
                        error_type = 'time_error'
                    
                    ImportRawData.update(
                        raw_data.id,
                        parse_status='failed',
                        parse_error=error_details,
                        parse_error_type=error_type,
                        parsed_at=datetime.now().isoformat()
                    )
                    failed_count += 1
                    failed_records.append({
                        'line_number': raw_data.source_line_number,
                        'error_type': error_type,
                        'error_message': error_details,
                        'suggested_fix': cls._get_fix_suggestion(error_type, raw_data.raw_content)
                    })
            
            ImportSource.update(
                import_source.id,
                import_status='completed',
                total_rows=total_rows,
                success_rows=success_count,
                warning_rows=warning_count,
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
                'warning_rows': warning_count,
                'failed_rows': failed_count,
                'is_duplicate': False,
                'failed_records': failed_records,
                'warning_records': warning_records,
                'corrected_records': corrected_records,
                'summary': {
                    'by_error_type': cls._summarize_by_type(failed_records, 'error_type'),
                    'by_warning_type': cls._summarize_by_type(warning_records, 'warnings'),
                    'compensation_changes': cls._summarize_compensation_changes(corrected_records)
                }
            }
            
        except Exception as e:
            ImportSource.update(
                import_source.id,
                import_status='failed',
                remark=str(e)
            )
            raise

    @staticmethod
    def _get_fix_suggestion(error_type: str, raw_content: str) -> Dict[str, Any]:
        try:
            raw = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
        except:
            raw = {}
        
        suggestions = {
            'missing_field': {
                'ticket_no': {
                    'action': 'add_ticket_no',
                    'message': '请补充工单号',
                    'example': f'TK{datetime.now().strftime("%Y%m%d")}0001'
                },
                'title': {
                    'action': 'add_title',
                    'message': '请补充工单标题',
                    'example': raw.get('工单类型', '工单') + '处理'
                }
            },
            'amount_error': {
                'action': 'check_amount',
                'message': '金额不能为负数，请检查数据',
                'original_value': raw.get('compensation') or raw.get('补偿金额')
            },
            'time_error': {
                'action': 'check_time_order',
                'message': '请检查时间顺序，确保首次响应时间早于解决时间',
                'suggested_format': 'YYYY-MM-DDTHH:MM:SS'
            }
        }
        
        return suggestions.get(error_type, {
            'action': 'review_data',
            'message': '请检查数据格式后重新导入'
        })

    @staticmethod
    def _summarize_by_type(records: List[Dict], key: str) -> Dict[str, int]:
        summary = {}
        for record in records:
            if key == 'warnings':
                for w in record.get('warnings', []):
                    wtype = w.get('type', 'unknown')
                    summary[wtype] = summary.get(wtype, 0) + 1
            else:
                rtype = record.get(key, 'unknown')
                summary[rtype] = summary.get(rtype, 0) + 1
        return summary

    @staticmethod
    def _summarize_compensation_changes(records: List[Dict]) -> Dict[str, Any]:
        total_requested = 0
        total_approved = 0
        mismatches = []
        
        for record in records:
            orig = record.get('original_values', {})
            req = orig.get('compensation_amount', 0)
            app = orig.get('approved_amount', 0)
            total_requested += req
            total_approved += app
            
            if abs(req - app) > 0.01:
                mismatches.append({
                    'ticket_no': record.get('ticket_no'),
                    'requested': req,
                    'approved': app,
                    'diff': abs(req - app)
                })
        
        return {
            'total_requested': round(total_requested, 2),
            'total_approved': round(total_approved, 2),
            'total_diff': round(abs(total_requested - total_approved), 2),
            'mismatch_count': len(mismatches),
            'mismatches': mismatches[:10]
        }

    @staticmethod
    def _parse_row(raw_content: str) -> Dict[str, Any]:
        raw = json.loads(raw_content) if isinstance(raw_content, str) else raw_content
        
        errors = []
        warnings = []
        suggestions = []
        
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
            'compensation_amount': float(raw.get('compensation') or raw.get('补偿金额') or raw.get('compensation_amount') or 0),
            'compensation_type': str(raw.get('compensation_type') or raw.get('补偿类型') or 'refund'),
            'approval_status': str(raw.get('approval_status') or raw.get('审批状态') or 'pending'),
            'approved_amount': float(raw.get('approved_amount') or raw.get('已批金额') or raw.get('compensation') or raw.get('补偿金额') or 0),
            'first_response_at': str(raw.get('first_response_at') or raw.get('首次响应时间') or ''),
            'resolved_at': str(raw.get('resolved_at') or raw.get('解决时间') or ''),
            '_raw': raw,
            '_errors': errors,
            '_warnings': warnings,
            '_suggestions': suggestions,
        }
        
        if not parsed['ticket_no']:
            errors.append({
                'type': 'missing_field',
                'field': 'ticket_no',
                'message': '缺少工单号',
                'severity': 'error'
            })
        if not parsed['title']:
            errors.append({
                'type': 'missing_field',
                'field': 'title',
                'message': '缺少工单标题',
                'severity': 'error'
            })
        
        if parsed['compensation_amount'] < 0:
            errors.append({
                'type': 'amount_invalid',
                'field': 'compensation_amount',
                'message': '补偿金额不能为负数',
                'value': parsed['compensation_amount'],
                'severity': 'error'
            })
        
        if parsed['approved_amount'] < 0:
            errors.append({
                'type': 'amount_invalid',
                'field': 'approved_amount',
                'message': '审批金额不能为负数',
                'value': parsed['approved_amount'],
                'severity': 'error'
            })
        
        if parsed['compensation_amount'] > 0 and abs(parsed['compensation_amount'] - parsed['approved_amount']) > 0.01:
            warnings.append({
                'type': 'amount_mismatch',
                'field': 'compensation_amount',
                'message': '申请金额与审批金额不一致',
                'requested': parsed['compensation_amount'],
                'approved': parsed['approved_amount'],
                'diff': abs(parsed['compensation_amount'] - parsed['approved_amount'])
            })
            suggestions.append({
                'type': 'amount_suggestion',
                'message': '建议核对金额后重新导入，或使用审批金额作为最终补偿',
                'recommended_value': max(parsed['compensation_amount'], parsed['approved_amount'])
            })
        
        if parsed['first_response_at'] and parsed['resolved_at']:
            try:
                from datetime import datetime
                first = datetime.fromisoformat(parsed['first_response_at'].replace('Z', '+00:00'))
                resolved = datetime.fromisoformat(parsed['resolved_at'].replace('Z', '+00:00'))
                if first > resolved:
                    errors.append({
                        'type': 'time_order_invalid',
                        'field': 'first_response_at',
                        'message': '首次响应时间晚于解决时间',
                        'first_response': parsed['first_response_at'],
                        'resolved': parsed['resolved_at'],
                        'severity': 'error'
                    })
            except ValueError:
                warnings.append({
                    'type': 'time_format_invalid',
                    'message': '时间格式无法解析，建议使用ISO格式',
                    'severity': 'warning'
                })
        
        if parsed['resolved_at']:
            try:
                from datetime import datetime
                resolved = datetime.fromisoformat(parsed['resolved_at'].replace('Z', '+00:00'))
                if resolved.hour < 6 or (resolved.hour == 23 and resolved.minute > 0):
                    warnings.append({
                        'type': 'cross_day_operation',
                        'field': 'resolved_at',
                        'message': '解决时间在非工作时段（23:00-06:00），可能涉及跨日计算',
                        'value': parsed['resolved_at'],
                        'severity': 'warning'
                    })
                    suggestions.append({
                        'type': 'cross_day_suggestion',
                        'message': '建议确认是否为跨日工单，SLA计算可能需要特殊处理',
                        'action': 'check_cross_day_calculation'
                    })
            except ValueError:
                pass
        
        if parsed['customer_name'] and parsed['customer_name'] not in ['', '未知']:
            customer_id = parsed['customer_id'] or ''
            if len(customer_id) < 3:
                warnings.append({
                    'type': 'customer_info_incomplete',
                    'message': '客户姓名存在但客户ID不完整',
                    'customer_name': parsed['customer_name'],
                    'customer_id': parsed['customer_id'],
                    'severity': 'warning'
                })
        
        if errors:
            error_msg = '; '.join([e['message'] for e in errors])
            raise ValueError(f'数据校验失败: {error_msg}')
        
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
        
        ticket_data = {
            'ticket_no': parsed['ticket_no'],
            'title': parsed['title'],
            'ticket_type': parsed['ticket_type'],
            'priority_level': parsed['priority_level'],
            'customer_id': parsed['customer_id'],
            'customer_name': parsed['customer_name'],
            'current_handler': parsed['current_handler'],
            'status': parsed['status'],
            'sla_rule_id': sla_rule.id if sla_rule else None,
            'import_source_id': import_source_id,
            'import_raw_id': import_raw_id,
        }
        
        if parsed.get('first_response_at'):
            ticket_data['first_response_at'] = parsed['first_response_at']
        if parsed.get('resolved_at'):
            ticket_data['resolved_at'] = parsed['resolved_at']
        
        ticket = Ticket.create(**ticket_data)
        
        if parsed.get('session_summary'):
            SessionSummary.create(
                ticket_id=ticket.id,
                summary_content=parsed['session_summary'],
                summary_type='imported',
                created_by='import_system',
                version=1
            )
        
        if parsed.get('compensation_amount', 0) > 0:
            CompensationApproval.create(
                ticket_id=ticket.id,
                compensation_type=parsed.get('compensation_type', 'refund'),
                requested_amount=float(parsed['compensation_amount']),
                approved_amount=float(parsed.get('approved_amount', parsed['compensation_amount'])),
                approval_status=parsed.get('approval_status', 'pending'),
                sla_rule_id=sla_rule.id if sla_rule else None,
                calculation_basis=json.dumps({
                    'source': 'import',
                    'original_amount': parsed['compensation_amount'],
                    'import_source_id': import_source_id
                }, ensure_ascii=False),
                applicant='import_system',
                version=1
            )
        
        return ticket

    @classmethod
    def extract_archive(cls, archive_path: str, extract_to: str, archive_type: str) -> List[str]:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_extract_dir = os.path.join(extract_to, f'archive_{timestamp}_{os.path.basename(archive_path)}')
        os.makedirs(unique_extract_dir, exist_ok=True)
        
        extracted_files = []
        
        if archive_type == 'zip':
            with zipfile.ZipFile(archive_path, 'r') as zf:
                zf.extractall(unique_extract_dir)
                for name in zf.namelist():
                    full_path = os.path.join(unique_extract_dir, name)
                    if os.path.isfile(full_path):
                        extracted_files.append(full_path)
        
        elif archive_type in ('tar.gz', 'tgz', 'tar'):
            mode = 'r:gz' if archive_type in ('tar.gz', 'tgz') else 'r:'
            with tarfile.open(archive_path, mode) as tf:
                tf.extractall(unique_extract_dir)
                for member in tf.getmembers():
                    full_path = os.path.join(unique_extract_dir, member.name)
                    if os.path.isfile(full_path):
                        extracted_files.append(full_path)
        
        return extracted_files

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
