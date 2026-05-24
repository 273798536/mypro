import csv
import json
import os
from datetime import datetime
from .database import get_connection

SOURCE_TYPES = ['sample_label', 'temperature', 'complaint', 'supplement']


def parse_csv_file(file_path):
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        return list(reader)


def detect_source_type(header_fields):
    header_lower = [h.lower() for h in header_fields]
    
    if (any('batch' in h and 'no' in h for h in header_lower) and any('sample' in h for h in header_lower)) or \
       (any('批次' in h for h in header_fields) and any('留样' in h for h in header_fields)):
        return 'sample_label'
    elif any('temp' in h for h in header_lower) or any('temperature' in h for h in header_lower) or \
         any('温度' in h for h in header_fields):
        return 'temperature'
    elif any('complaint' in h for h in header_lower) or any('投诉' in h for h in header_fields):
        return 'complaint'
    elif any('supplement' in h for h in header_lower) or any('补录' in h for h in header_fields):
        return 'supplement'
    
    return 'unknown'


def extract_key_fields(row, source_type):
    def get_value(*keys):
        for key in keys:
            if key in row:
                return row[key].strip() if row[key] else None
        return None
    
    result = {}
    
    if source_type == 'sample_label':
        result = {
            'batch_no': get_value('批次号', 'batch_no', 'batch', '锅次'),
            'product_name': get_value('产品名称', 'product_name', 'product', '品名'),
            'sample_time': get_value('留样时间', 'sample_time', 'time'),
            'sample_amount': get_value('留样量', 'sample_amount', 'amount'),
            'keeper': get_value('留样人', 'keeper', '保存人'),
            'store_id': get_value('门店编号', '门店', 'store_id', 'store'),
            'record_date': get_value('日期', 'record_date', 'date')
        }
    elif source_type == 'temperature':
        result = {
            'batch_no': get_value('批次号', 'batch_no', 'batch', '锅次'),
            'store_id': get_value('门店编号', '门店', 'store_id', 'store'),
            'measure_time': get_value('测量时间', 'measure_time', 'time'),
            'temperature': get_value('温度', 'temperature', 'temp'),
            'measure_point': get_value('测量点', 'measure_point', 'point'),
            'operator': get_value('操作人员', 'operator', '操作员'),
            'record_date': get_value('日期', 'record_date', 'date')
        }
    elif source_type == 'complaint':
        result = {
            'complaint_no': get_value('投诉单号', 'complaint_no', 'complaint'),
            'store_id': get_value('门店编号', '门店', 'store_id', 'store'),
            'batch_no': get_value('批次号', 'batch_no', 'batch', '锅次'),
            'product_name': get_value('产品名称', 'product_name', 'product', '品名'),
            'complaint_type': get_value('投诉类型', 'complaint_type', 'type'),
            'complaint_desc': get_value('投诉描述', 'complaint_desc', 'description', 'desc'),
            'complaint_amount': get_value('投诉数量', 'complaint_amount', 'amount'),
            'complaint_date': get_value('投诉日期', 'complaint_date', 'date'),
            'handler': get_value('处理人', 'handler'),
            'handle_result': get_value('处理结果', 'handle_result', 'result'),
            'handle_date': get_value('处理日期', 'handle_date')
        }
    elif source_type == 'supplement':
        result = {
            'batch_no': get_value('批次号', 'batch_no', 'batch', '锅次'),
            'store_id': get_value('门店编号', '门店', 'store_id', 'store'),
            'record_date': get_value('日期', 'record_date', 'date'),
            'supplement_reason': get_value('补录原因', 'reason'),
            'supplement_by': get_value('补录人', 'operator', '补录人')
        }
    
    return result


def import_file(file_path, source_type, username):
    if not os.path.exists(file_path):
        return {'success': False, 'error': f'文件不存在: {file_path}'}
    
    try:
        rows = parse_csv_file(file_path)
    except Exception as e:
        return {'success': False, 'error': f'文件解析失败: {str(e)}'}
    
    if not rows:
        return {'success': False, 'error': '文件为空'}
    
    if source_type == 'auto':
        source_type = detect_source_type(rows[0].keys())
        if source_type == 'unknown':
            return {'success': False, 'error': '无法自动识别数据类型，请指定 --type 参数'}
    
    if source_type not in SOURCE_TYPES:
        return {'success': False, 'error': f'不支持的数据类型: {source_type}'}
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO import_sessions (source_type, file_name, imported_by, total_rows, status)
            VALUES (?, ?, ?, ?, 'imported')
        """, (source_type, os.path.basename(file_path), username, len(rows)))
        
        session_id = cursor.lastrowid
        
        for line_no, row in enumerate(rows, start=1):
            key_fields = extract_key_fields(row, source_type)
            raw_data = json.dumps(row, ensure_ascii=False)
            
            cursor.execute("""
                INSERT INTO raw_records (
                    session_id, source_type, original_line_no, raw_data,
                    batch_no, store_id, record_date, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'imported')
            """, (
                session_id, source_type, line_no, raw_data,
                key_fields.get('batch_no'),
                key_fields.get('store_id'),
                key_fields.get('record_date') or key_fields.get('complaint_date')
            ))
            
            record_id = cursor.lastrowid
            
            def safe_float(val):
                if not val:
                    return None
                try:
                    return float(val)
                except (ValueError, TypeError):
                    return None
            
            def safe_int(val):
                if not val:
                    return None
                try:
                    return int(val)
                except (ValueError, TypeError):
                    return None
            
            if source_type == 'sample_label':
                cursor.execute("""
                    INSERT INTO sample_labels (
                        record_id, batch_no, product_name, sample_time,
                        sample_amount, keeper, store_id, record_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'imported')
                """, (
                    record_id,
                    key_fields.get('batch_no'),
                    key_fields.get('product_name'),
                    key_fields.get('sample_time'),
                    safe_float(key_fields.get('sample_amount')),
                    key_fields.get('keeper'),
                    key_fields.get('store_id'),
                    key_fields.get('record_date')
                ))
            elif source_type == 'temperature':
                cursor.execute("""
                    INSERT INTO temperature_records (
                        record_id, batch_no, store_id, measure_time,
                        temperature, measure_point, operator, record_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'imported')
                """, (
                    record_id,
                    key_fields.get('batch_no'),
                    key_fields.get('store_id'),
                    key_fields.get('measure_time'),
                    safe_float(key_fields.get('temperature')),
                    key_fields.get('measure_point'),
                    key_fields.get('operator'),
                    key_fields.get('record_date')
                ))
            elif source_type == 'complaint':
                cursor.execute("""
                    INSERT INTO store_complaints (
                        record_id, complaint_no, store_id, batch_no, product_name,
                        complaint_type, complaint_desc, complaint_amount, complaint_date,
                        handler, handle_result, handle_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')
                """, (
                    record_id,
                    key_fields.get('complaint_no'),
                    key_fields.get('store_id'),
                    key_fields.get('batch_no'),
                    key_fields.get('product_name'),
                    key_fields.get('complaint_type'),
                    key_fields.get('complaint_desc'),
                    safe_int(key_fields.get('complaint_amount')),
                    key_fields.get('complaint_date'),
                    key_fields.get('handler'),
                    key_fields.get('handle_result'),
                    key_fields.get('handle_date')
                ))
            
            if key_fields.get('batch_no'):
                cursor.execute("""
                    INSERT INTO batch_tracking (
                        batch_no, source_type, store_id, record_id, tracking_type
                    ) VALUES (?, ?, ?, ?, 'import')
                """, (
                    key_fields.get('batch_no'),
                    source_type,
                    key_fields.get('store_id'),
                    record_id
                ))
        
        return {
            'success': True,
            'session_id': session_id,
            'source_type': source_type,
            'total_rows': len(rows),
            'file_name': os.path.basename(file_path)
        }


def get_import_sessions(limit=20):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, source_type, file_name, imported_by, imported_at,
                   total_rows, valid_rows, invalid_rows, status
            FROM import_sessions
            ORDER BY imported_at DESC
            LIMIT ?
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]


def get_session_records(session_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, original_line_no, batch_no, store_id, record_date,
                   status, raw_data
            FROM raw_records
            WHERE session_id = ?
            ORDER BY original_line_no
        """, (session_id,))
        return [dict(row) for row in cursor.fetchall()]


def track_batch_stores(batch_no):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT bt.batch_no, bt.store_id, bt.source_type,
                   bt.tracking_type, bt.created_at,
                   s.file_name, s.imported_by
            FROM batch_tracking bt
            LEFT JOIN raw_records r ON bt.record_id = r.id
            LEFT JOIN import_sessions s ON r.session_id = s.id
            WHERE bt.batch_no = ?
            ORDER BY bt.created_at
        """, (batch_no,))
        return [dict(row) for row in cursor.fetchall()]
