import csv
import json
import os
from .database import get_connection
from .reporter import generate_report


def export_session(session_id, output_path, format='csv'):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, original_line_no, batch_no, store_id, record_date,
                   status, raw_data, source_type
            FROM raw_records
            WHERE session_id = ?
            ORDER BY original_line_no
        """, (session_id,))
        records = [dict(row) for row in cursor.fetchall()]
        
        if not records:
            return {'success': False, 'error': '未找到记录'}
        
        if format == 'csv':
            return export_to_csv(records, output_path, session_id)
        elif format == 'json':
            return export_to_json(records, output_path)
        else:
            return {'success': False, 'error': f'不支持的格式: {format}'}


def export_to_csv(records, output_path, session_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ri.record_id, ri.issue_type, ri.issue_field,
                   ri.issue_description, ri.severity, ri.status
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            WHERE r.session_id = ?
        """, (session_id,))
        issues = [dict(row) for row in cursor.fetchall()]
        
        issues_by_record = {}
        for issue in issues:
            rid = issue['record_id']
            if rid not in issues_by_record:
                issues_by_record[rid] = []
            issues_by_record[rid].append(issue)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = [
            '原始行号', '批次号', '门店编号', '记录日期', '状态',
            '问题数量', '问题类型', '问题描述', '原始数据'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            record_issues = issues_by_record.get(record['id'], [])
            
            writer.writerow({
                '原始行号': record['original_line_no'],
                '批次号': record['batch_no'] or '',
                '门店编号': record['store_id'] or '',
                '记录日期': record['record_date'] or '',
                '状态': record['status'],
                '问题数量': len(record_issues),
                '问题类型': ';'.join([i['issue_type'] for i in record_issues]) if record_issues else '',
                '问题描述': ';'.join([i['issue_description'] for i in record_issues]) if record_issues else '',
                '原始数据': record['raw_data']
            })
    
    return {'success': True, 'output_path': output_path, 'record_count': len(records)}


def export_to_json(records, output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    
    return {'success': True, 'output_path': output_path, 'record_count': len(records)}


def export_report(session_id, output_path):
    report = generate_report(session_id=session_id)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    return {'success': True, 'output_path': output_path}


def export_batch_tracking(batch_no, output_path):
    from .importer import track_batch_stores
    
    tracking = track_batch_stores(batch_no)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['批次号', '门店编号', '数据来源', '追踪类型', '创建时间', '文件名', '导入人']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in tracking:
            writer.writerow({
                '批次号': record['batch_no'],
                '门店编号': record['store_id'] or '',
                '数据来源': record['source_type'],
                '追踪类型': record['tracking_type'],
                '创建时间': record['created_at'],
                '文件名': record['file_name'] or '',
                '导入人': record['imported_by'] or ''
            })
    
    return {'success': True, 'output_path': output_path, 'record_count': len(tracking)}
