import json
from datetime import datetime
from .database import get_connection

FIELD_KEY_MAPPING = {
    'batch_no': ['批次号', 'batch_no', 'batch', '锅次'],
    'store_id': ['门店编号', '门店', 'store_id', 'store'],
    'record_date': ['日期', 'record_date', 'date'],
    'product_name': ['产品名称', 'product_name', 'product', '品名'],
    'sample_time': ['留样时间', 'sample_time', 'time'],
    'sample_amount': ['留样量', 'sample_amount', 'amount'],
    'keeper': ['留样人', 'keeper', '保存人'],
    'measure_time': ['测量时间', 'measure_time', 'time'],
    'temperature': ['温度', 'temperature', 'temp'],
    'measure_point': ['测量点', 'measure_point', 'point'],
    'operator': ['操作人员', 'operator', '操作员'],
    'complaint_no': ['投诉单号', 'complaint_no', 'complaint'],
    'complaint_type': ['投诉类型', 'complaint_type', 'type'],
    'complaint_desc': ['投诉描述', 'complaint_desc', 'description', 'desc'],
    'complaint_amount': ['投诉数量', 'complaint_amount', 'amount'],
    'complaint_date': ['投诉日期', 'complaint_date', 'date'],
    'handler': ['处理人', 'handler'],
    'handle_result': ['处理结果', 'handle_result', 'result'],
    'handle_date': ['处理日期', 'handle_date']
}


def get_actual_field_key(raw_data, field_name):
    possible_keys = FIELD_KEY_MAPPING.get(field_name, [field_name])
    for key in possible_keys:
        if key in raw_data:
            return key
    return field_name if field_name in raw_data else possible_keys[0]


def fix_issue(issue_id, fixed_value, fix_note, username):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ri.*, r.raw_data, r.source_type
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            WHERE ri.id = ?
        """, (issue_id,))
        issue = cursor.fetchone()
        
        if not issue:
            return {'success': False, 'error': '问题记录不存在'}
        
        cursor.execute("""
            UPDATE record_issues
            SET status = 'fixed',
                fixed_value = ?,
                fixed_by = ?,
                fixed_at = CURRENT_TIMESTAMP,
                fix_note = ?
            WHERE id = ?
        """, (fixed_value, username, fix_note, issue_id))
        
        issue_field = issue['issue_field']
        if issue_field and fixed_value:
            raw_data = json.loads(issue['raw_data'])
            actual_key = get_actual_field_key(raw_data, issue_field)
            raw_data[actual_key] = fixed_value
            new_raw_data = json.dumps(raw_data, ensure_ascii=False)
            
            cursor.execute("""
                UPDATE raw_records
                SET raw_data = ?, status = 'fixed'
                WHERE id = ?
            """, (new_raw_data, issue['record_id']))
        
        return {'success': True, 'issue_id': issue_id}


def batch_fix(session_id, fix_instructions, username):
    results = []
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ri.id, ri.issue_type, ri.issue_field, ri.issue_description
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            WHERE r.session_id = ? AND ri.status = 'open'
        """, (session_id,))
        issues = cursor.fetchall()
        
        for issue in issues:
            instruction = fix_instructions.get(issue['issue_type'])
            if instruction:
                result = fix_issue(issue['id'], instruction.get('value'), 
                                   instruction.get('note'), username)
                results.append(result)
    
    return {'success': True, 'fixed_count': len(results), 'results': results}


def verify_record(record_id, username):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT status FROM raw_records WHERE id = ?", (record_id,))
        record = cursor.fetchone()
        
        if not record:
            return {'success': False, 'error': '记录不存在'}
        
        cursor.execute("""
            UPDATE raw_records
            SET status = 'verified'
            WHERE id = ?
        """, (record_id,))
        
        for table in ['sample_labels', 'temperature_records', 'store_complaints']:
            cursor.execute(f"""
                UPDATE {table}
                SET status = 'verified',
                    verified_by = ?,
                    verified_at = CURRENT_TIMESTAMP
                WHERE record_id = ?
            """, (username, record_id))
        
        return {'success': True, 'record_id': record_id}


def reimport_after_fix(session_id):
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
    
    def get_batch_no(data):
        return data.get('批次号') or data.get('batch_no') or data.get('锅次')
    
    def get_store_id(data):
        return data.get('门店编号') or data.get('门店') or data.get('store_id') or data.get('store')
    
    def get_record_date(data):
        return data.get('日期') or data.get('record_date') or data.get('date')
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, original_line_no, raw_data, source_type, batch_no, store_id
            FROM raw_records
            WHERE session_id = ? AND status = 'fixed'
            ORDER BY original_line_no
        """, (session_id,))
        fixed_records = cursor.fetchall()
        
        reimported = 0
        for record in fixed_records:
            raw_data = json.loads(record['raw_data'])
            source_type = record['source_type']
            
            new_batch_no = get_batch_no(raw_data)
            new_store_id = get_store_id(raw_data)
            new_record_date = get_record_date(raw_data)
            
            old_batch_no = record['batch_no']
            
            if source_type == 'sample_label':
                cursor.execute("""
                    UPDATE sample_labels
                    SET batch_no = ?, product_name = ?, sample_time = ?, sample_amount = ?,
                        keeper = ?, store_id = ?, record_date = ?, status = 'reimported'
                    WHERE record_id = ?
                """, (
                    new_batch_no,
                    raw_data.get('产品名称') or raw_data.get('product_name'),
                    raw_data.get('留样时间') or raw_data.get('sample_time'),
                    safe_float(raw_data.get('留样量') or raw_data.get('sample_amount')),
                    raw_data.get('留样人') or raw_data.get('keeper'),
                    new_store_id,
                    new_record_date,
                    record['id']
                ))
            elif source_type == 'temperature':
                cursor.execute("""
                    UPDATE temperature_records
                    SET batch_no = ?, store_id = ?, measure_time = ?,
                        temperature = ?, measure_point = ?, operator = ?,
                        record_date = ?, status = 'reimported'
                    WHERE record_id = ?
                """, (
                    new_batch_no,
                    new_store_id,
                    raw_data.get('测量时间') or raw_data.get('measure_time'),
                    safe_float(raw_data.get('温度') or raw_data.get('temperature')),
                    raw_data.get('测量点') or raw_data.get('measure_point'),
                    raw_data.get('操作人员') or raw_data.get('operator'),
                    new_record_date,
                    record['id']
                ))
            elif source_type == 'complaint':
                cursor.execute("""
                    UPDATE store_complaints
                    SET store_id = ?, batch_no = ?, product_name = ?,
                        complaint_type = ?, complaint_desc = ?, complaint_amount = ?,
                        complaint_date = ?, handler = ?, handle_result = ?,
                        handle_date = ?, status = 'reimported'
                    WHERE record_id = ?
                """, (
                    new_store_id,
                    new_batch_no,
                    raw_data.get('产品名称') or raw_data.get('product_name'),
                    raw_data.get('投诉类型') or raw_data.get('complaint_type'),
                    raw_data.get('投诉描述') or raw_data.get('complaint_desc'),
                    safe_int(raw_data.get('投诉数量') or raw_data.get('complaint_amount')),
                    raw_data.get('投诉日期') or raw_data.get('complaint_date'),
                    raw_data.get('处理人') or raw_data.get('handler'),
                    raw_data.get('处理结果') or raw_data.get('handle_result'),
                    raw_data.get('处理日期') or raw_data.get('handle_date'),
                    record['id']
                ))
            
            cursor.execute("""
                UPDATE raw_records
                SET batch_no = ?, store_id = ?, record_date = ?, status = 'reimported'
                WHERE id = ?
            """, (new_batch_no, new_store_id, new_record_date, record['id']))
            
            if new_batch_no and new_batch_no != old_batch_no:
                if old_batch_no:
                    cursor.execute("""
                        DELETE FROM batch_tracking
                        WHERE batch_no = ? AND record_id = ?
                    """, (old_batch_no, record['id']))
                
                cursor.execute("""
                    INSERT INTO batch_tracking (
                        batch_no, source_type, store_id, record_id, tracking_type
                    ) VALUES (?, ?, ?, ?, 'reimport')
                """, (new_batch_no, source_type, new_store_id, record['id']))
            elif new_batch_no and new_batch_no == old_batch_no:
                cursor.execute("""
                    UPDATE batch_tracking
                    SET store_id = ?, tracking_type = 'reimport'
                    WHERE batch_no = ? AND record_id = ?
                """, (new_store_id, new_batch_no, record['id']))
            
            reimported += 1
        
        cursor.execute("""
            UPDATE import_sessions
            SET status = 'reimported'
            WHERE id = ?
        """, (session_id,))
        
        return {'success': True, 'reimported_count': reimported}


def get_fix_history(session_id=None, username=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        sql = """
            SELECT ri.id, ri.record_id, ri.issue_type, ri.issue_field,
                   ri.issue_description, ri.fixed_value, ri.fixed_by,
                   ri.fixed_at, ri.fix_note,
                   r.original_line_no, r.batch_no, r.store_id,
                   s.file_name, s.source_type
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            JOIN import_sessions s ON r.session_id = s.id
            WHERE ri.status = 'fixed'
        """
        params = []
        
        if session_id:
            sql += " AND r.session_id = ?"
            params.append(session_id)
        
        if username:
            sql += " AND ri.fixed_by = ?"
            params.append(username)
        
        sql += " ORDER BY ri.fixed_at DESC"
        
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]
