import json
from datetime import datetime, timedelta
from .database import get_connection

ISSUE_TYPES = {
    'missing_field': '缺失字段',
    'cross_day': '跨日异常',
    'name_change': '名称变更',
    'amount_conflict': '数量冲突',
    'price_conflict': '金额冲突',
    'invalid_format': '格式错误',
    'duplicate_record': '重复记录',
    'invalid_temperature': '温度异常'
}


def check_missing_fields(record, source_type):
    issues = []
    raw_data = json.loads(record['raw_data'])
    
    batch_fields = ['批次号', '锅次', 'batch_no', 'batch']
    has_batch = any(raw_data.get(f) for f in batch_fields)
    
    if not has_batch:
        issues.append({
            'issue_type': 'missing_field',
            'issue_field': 'batch_no',
            'issue_description': '缺少批次号/锅次字段',
            'severity': 'error'
        })
    
    if source_type == 'temperature':
        temp_fields = ['温度', 'temperature', 'temp']
        has_temp = any(raw_data.get(f) for f in temp_fields)
        if not has_temp:
            issues.append({
                'issue_type': 'missing_field',
                'issue_field': 'temperature',
                'issue_description': '缺少温度字段',
                'severity': 'error'
            })
    
    if source_type == 'complaint':
        complaint_fields = ['投诉单号', 'complaint_no', 'complaint']
        has_complaint_no = any(raw_data.get(f) for f in complaint_fields)
        if not has_complaint_no:
            issues.append({
                'issue_type': 'missing_field',
                'issue_field': 'complaint_no',
                'issue_description': '缺少投诉单号',
                'severity': 'error'
            })
    
    if not record.get('store_id'):
        issues.append({
            'issue_type': 'missing_field',
            'issue_field': 'store_id',
            'issue_description': '缺少门店编号',
            'severity': 'warning'
        })
    
    if not record.get('record_date'):
        issues.append({
            'issue_type': 'missing_field',
            'issue_field': 'record_date',
            'issue_description': '缺少记录日期',
            'severity': 'warning'
        })
    
    return issues


def check_time_for_cross_day(time_str, field_name, field_desc):
    issues = []
    
    if not time_str:
        return issues
    
    try:
        time_obj = None
        has_time_component = False
        
        datetime_formats_with_time = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d %H:%M'
        ]
        
        for fmt in datetime_formats_with_time:
            try:
                time_obj = datetime.strptime(time_str, fmt)
                has_time_component = True
                break
            except ValueError:
                continue
        
        if has_time_component and time_obj.hour >= 0 and time_obj.hour < 6:
            issues.append({
                'issue_type': 'cross_day',
                'issue_field': field_name,
                'issue_description': f'{field_desc}{time_str}可能属于跨日夜班',
                'severity': 'warning'
            })
    except Exception:
        pass
    
    return issues


def check_cross_day(record):
    issues = []
    raw_data = json.loads(record['raw_data'])
    source_type = record.get('source_type')
    
    if source_type == 'sample_label':
        time_str = raw_data.get('留样时间') or raw_data.get('sample_time')
        if time_str:
            issues.extend(check_time_for_cross_day(time_str, 'sample_time', '留样时间'))
    elif source_type == 'temperature':
        time_str = raw_data.get('测量时间') or raw_data.get('measure_time')
        if time_str:
            issues.extend(check_time_for_cross_day(time_str, 'measure_time', '测量时间'))
    
    return issues


def check_duplicate_records(record, source_type, all_records):
    issues = []
    batch_no = record.get('batch_no')
    store_id = record.get('store_id')
    
    if not batch_no:
        return issues
    
    for other in all_records:
        if other['id'] == record['id']:
            continue
        
        if other.get('batch_no') == batch_no and other.get('store_id') == store_id:
            issues.append({
                'issue_type': 'duplicate_record',
                'issue_field': 'batch_no',
                'issue_description': f'批次{batch_no}在门店{store_id}存在重复记录（行号:{other["original_line_no"]}）',
                'severity': 'warning'
            })
            break
    
    return issues


def check_name_consistency(record, source_type):
    issues = []
    batch_no = record.get('batch_no')
    
    if not batch_no or source_type != 'sample_label':
        return issues
    
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT product_name FROM sample_labels
            WHERE batch_no = ? AND product_name IS NOT NULL
        """, (batch_no,))
        rows = cursor.fetchall()
        
        names = [r['product_name'] for r in rows if r['product_name']]
        raw_data = json.loads(record['raw_data'])
        current_name = raw_data.get('产品名称') or raw_data.get('product_name')
        
        if current_name and names and current_name not in names:
            issues.append({
                'issue_type': 'name_change',
                'issue_field': 'product_name',
                'issue_description': f'批次{batch_no}产品名称不一致，已存在名称:{",".join(names)}，当前:{current_name}',
                'severity': 'error'
            })
    
    return issues


def check_amount_conflict(record, source_type):
    issues = []
    batch_no = record.get('batch_no')
    
    if not batch_no:
        return issues
    
    raw_data = json.loads(record['raw_data'])
    
    if source_type == 'sample_label':
        amount = raw_data.get('留样量') or raw_data.get('sample_amount')
        if amount:
            try:
                amount_val = float(amount)
                if amount_val <= 0:
                    issues.append({
                        'issue_type': 'amount_conflict',
                        'issue_field': 'sample_amount',
                        'issue_description': f'留样量{amount}异常，应为正数',
                        'severity': 'error'
                    })
                elif amount_val > 10000:
                    issues.append({
                        'issue_type': 'amount_conflict',
                        'issue_field': 'sample_amount',
                        'issue_description': f'留样量{amount}过大，可能单位错误',
                        'severity': 'warning'
                    })
            except ValueError:
                issues.append({
                    'issue_type': 'invalid_format',
                    'issue_field': 'sample_amount',
                    'issue_description': f'留样量{amount}格式错误',
                    'severity': 'error'
                })
    
    elif source_type == 'complaint':
        amount = raw_data.get('投诉数量') or raw_data.get('complaint_amount')
        if amount:
            try:
                amount_val = int(amount)
                if amount_val < 0:
                    issues.append({
                        'issue_type': 'amount_conflict',
                        'issue_field': 'complaint_amount',
                        'issue_description': f'投诉数量{amount}不能为负数',
                        'severity': 'error'
                    })
            except ValueError:
                issues.append({
                    'issue_type': 'invalid_format',
                    'issue_field': 'complaint_amount',
                    'issue_description': f'投诉数量{amount}格式错误',
                    'severity': 'error'
                })
    
    return issues


def check_temperature(record, source_type):
    issues = []
    
    if source_type != 'temperature':
        return issues
    
    raw_data = json.loads(record['raw_data'])
    temp = raw_data.get('温度') or raw_data.get('temperature') or raw_data.get('temp')
    
    if temp:
        try:
            temp_val = float(temp)
            if temp_val < -30 or temp_val > 100:
                issues.append({
                    'issue_type': 'invalid_temperature',
                    'issue_field': 'temperature',
                    'issue_description': f'温度{temp_val}℃超出正常范围(-30~100℃)',
                    'severity': 'error'
                })
            elif temp_val > 60:
                issues.append({
                    'issue_type': 'invalid_temperature',
                    'issue_field': 'temperature',
                    'issue_description': f'温度{temp_val}℃偏高，建议复核',
                    'severity': 'warning'
                })
            elif temp_val < 0:
                issues.append({
                    'issue_type': 'invalid_temperature',
                    'issue_field': 'temperature',
                    'issue_description': f'温度{temp_val}℃偏低，建议复核',
                    'severity': 'warning'
                })
        except ValueError:
            issues.append({
                'issue_type': 'invalid_format',
                'issue_field': 'temperature',
                'issue_description': f'温度{temp}格式错误',
                'severity': 'error'
            })
    
    return issues


def check_record(record, source_type, all_records=None):
    issues = []
    
    issues.extend(check_missing_fields(record, source_type))
    issues.extend(check_cross_day(record))
    issues.extend(check_name_consistency(record, source_type))
    issues.extend(check_amount_conflict(record, source_type))
    issues.extend(check_temperature(record, source_type))
    
    if all_records:
        issues.extend(check_duplicate_records(record, source_type, all_records))
    
    return issues


def check_session(session_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, original_line_no, batch_no, store_id, record_date, raw_data, source_type
            FROM raw_records
            WHERE session_id = ?
            ORDER BY original_line_no
        """, (session_id,))
        records = [dict(row) for row in cursor.fetchall()]
        
        if not records:
            return {'success': False, 'error': '未找到该批次记录'}
        
        source_type = records[0]['source_type']
        
        total_issues = 0
        records_with_issues = 0
        
        cursor.execute("DELETE FROM record_issues WHERE record_id IN (SELECT id FROM raw_records WHERE session_id = ?)", (session_id,))
        
        for record in records:
            issues = check_record(record, source_type, records)
            
            if issues:
                records_with_issues += 1
                for issue in issues:
                    total_issues += 1
                    cursor.execute("""
                        INSERT INTO record_issues (
                            record_id, issue_type, issue_field, issue_description, severity
                        ) VALUES (?, ?, ?, ?, ?)
                    """, (
                        record['id'],
                        issue['issue_type'],
                        issue.get('issue_field'),
                        issue.get('issue_description'),
                        issue.get('severity', 'error')
                    ))
        
        cursor.execute("""
            UPDATE raw_records
            SET status = 'checked'
            WHERE session_id = ?
        """, (session_id,))
        
        cursor.execute("""
            UPDATE import_sessions
            SET status = 'checked',
                valid_rows = ?,
                invalid_rows = ?
            WHERE id = ?
        """, (len(records) - records_with_issues, records_with_issues, session_id))
        
        return {
            'success': True,
            'total_records': len(records),
            'records_with_issues': records_with_issues,
            'total_issues': total_issues
        }


def get_record_issues(record_id=None, session_id=None, status='open'):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        sql = """
            SELECT ri.id, ri.record_id, ri.issue_type, ri.issue_field,
                   ri.issue_description, ri.severity, ri.status,
                   ri.fixed_value, ri.fixed_by, ri.fixed_at, ri.fix_note,
                   r.original_line_no, r.batch_no, r.store_id, r.source_type
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            WHERE 1=1
        """
        params = []
        
        if record_id:
            sql += " AND ri.record_id = ?"
            params.append(record_id)
        
        if session_id:
            sql += " AND r.session_id = ?"
            params.append(session_id)
        
        if status and status != 'all':
            sql += " AND ri.status = ?"
            params.append(status)
        
        sql += " ORDER BY ri.severity DESC, r.original_line_no"
        
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]


def get_issue_summary(session_id=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        sql = """
            SELECT issue_type, severity, status, COUNT(*) as count
            FROM record_issues ri
            JOIN raw_records r ON ri.record_id = r.id
            WHERE 1=1
        """
        params = []
        
        if session_id:
            sql += " AND r.session_id = ?"
            params.append(session_id)
        
        sql += " GROUP BY issue_type, severity, status ORDER BY count DESC"
        
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]
