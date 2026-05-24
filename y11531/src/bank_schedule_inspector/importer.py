import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
import pandas as pd

from .database import get_connection


SOURCE_TYPES = {
    'schedule': '柜员排班',
    'leave': '请假单',
    'forecast': '业务量预测',
}

SCHEDULE_COLUMNS = {
    '柜员编号': 'teller_id',
    '柜员姓名': 'teller_name',
    '网点编号': 'branch_id',
    '网点名称': 'branch_name',
    '排班日期': 'schedule_date',
    '班次类型': 'shift_type',
    '开始时间': 'start_time',
    '结束时间': 'end_time',
    '窗口号': 'window_no',
    '培训标识': 'is_training',
    '请假标识': 'is_leave',
    '备注': 'remarks',
}

LEAVE_COLUMNS = {
    '柜员编号': 'teller_id',
    '柜员姓名': 'teller_name',
    '网点编号': 'branch_id',
    '请假类型': 'leave_type',
    '开始日期': 'start_date',
    '结束日期': 'end_date',
    '开始时间': 'start_time',
    '结束时间': 'end_time',
    '审批人': 'approver',
    '备注': 'remarks',
}

FORECAST_COLUMNS = {
    '网点编号': 'branch_id',
    '网点名称': 'branch_name',
    '预测日期': 'forecast_date',
    '时间段': 'time_slot',
    '预测业务量': 'forecast_volume',
    '置信度': 'confidence_level',
    '备注': 'remarks',
}


def calculate_file_hash(file_path: str) -> str:
    hash_sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()


def check_duplicate_import(source_type: str, file_hash: str, workspace: Optional[str] = None) -> Tuple[bool, Optional[Dict]]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT id, session_uuid, source_file, imported_at, status
    FROM import_sessions
    WHERE source_type = ? AND file_hash = ?
    ORDER BY imported_at DESC
    LIMIT 1
    ''', (source_type, file_hash))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return True, {
            'id': row['id'],
            'session_uuid': row['session_uuid'],
            'source_file': row['source_file'],
            'imported_at': row['imported_at'],
            'status': row['status'],
        }
    return False, None


def read_excel_file(file_path: str) -> pd.DataFrame:
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path, dtype=str)
    else:
        return pd.read_excel(file_path, dtype=str)


def validate_row(row: Dict, columns_map: Dict) -> Tuple[bool, List[str]]:
    errors = []
    for excel_col, db_col in columns_map.items():
        if excel_col not in row or pd.isna(row[excel_col]) or str(row[excel_col]).strip() == '':
            if db_col in ['teller_id', 'teller_name', 'branch_id', 'schedule_date', 'shift_type',
                          'leave_type', 'start_date', 'end_date', 'forecast_date', 'time_slot', 'forecast_volume']:
                errors.append(f"缺少必填字段: {excel_col}")
    return len(errors) == 0, errors


def process_schedule_row(row: Dict) -> Tuple[bool, Dict, List[str]]:
    is_valid, errors = validate_row(row, SCHEDULE_COLUMNS)
    if not is_valid:
        return False, {}, errors
    
    try:
        data = {
            'teller_id': str(row['柜员编号']).strip(),
            'teller_name': str(row['柜员姓名']).strip(),
            'branch_id': str(row['网点编号']).strip(),
            'branch_name': str(row['网点名称']).strip(),
            'schedule_date': str(row['排班日期']).strip(),
            'shift_type': str(row['班次类型']).strip(),
            'start_time': str(row.get('开始时间', '')).strip() if row.get('开始时间') else '',
            'end_time': str(row.get('结束时间', '')).strip() if row.get('结束时间') else '',
            'window_no': str(row.get('窗口号', '')).strip() if row.get('窗口号') else '',
            'is_training': 1 if str(row.get('培训标识', '')).strip() in ['是', '1', 'True', 'Y'] else 0,
            'is_leave': 1 if str(row.get('请假标识', '')).strip() in ['是', '1', 'True', 'Y'] else 0,
            'remarks': str(row.get('备注', '')).strip() if row.get('备注') else '',
        }
        return True, data, []
    except Exception as e:
        return False, {}, [f"数据解析错误: {str(e)}"]


def process_leave_row(row: Dict) -> Tuple[bool, Dict, List[str]]:
    is_valid, errors = validate_row(row, LEAVE_COLUMNS)
    if not is_valid:
        return False, {}, errors
    
    try:
        data = {
            'teller_id': str(row['柜员编号']).strip(),
            'teller_name': str(row['柜员姓名']).strip(),
            'branch_id': str(row['网点编号']).strip(),
            'leave_type': str(row['请假类型']).strip(),
            'start_date': str(row['开始日期']).strip(),
            'end_date': str(row['结束日期']).strip(),
            'start_time': str(row.get('开始时间', '')).strip() if row.get('开始时间') else '',
            'end_time': str(row.get('结束时间', '')).strip() if row.get('结束时间') else '',
            'approver': str(row.get('审批人', '')).strip() if row.get('审批人') else '',
            'remarks': str(row.get('备注', '')).strip() if row.get('备注') else '',
        }
        return True, data, []
    except Exception as e:
        return False, {}, [f"数据解析错误: {str(e)}"]


def process_forecast_row(row: Dict) -> Tuple[bool, Dict, List[str]]:
    is_valid, errors = validate_row(row, FORECAST_COLUMNS)
    if not is_valid:
        return False, {}, errors
    
    try:
        forecast_volume = int(str(row['预测业务量']).strip())
        confidence_level = float(str(row.get('置信度', '0')).strip()) if row.get('置信度') else 0.0
        
        data = {
            'branch_id': str(row['网点编号']).strip(),
            'branch_name': str(row['网点名称']).strip(),
            'forecast_date': str(row['预测日期']).strip(),
            'time_slot': str(row['时间段']).strip(),
            'forecast_volume': forecast_volume,
            'confidence_level': confidence_level,
            'remarks': str(row.get('备注', '')).strip() if row.get('备注') else '',
        }
        return True, data, []
    except ValueError as e:
        return False, {}, [f"数值格式错误: {str(e)}"]
    except Exception as e:
        return False, {}, [f"数据解析错误: {str(e)}"]


def import_data(source_type: str, file_path: str, imported_by: str = 'system',
                workspace: Optional[str] = None, force: bool = False) -> Dict:
    file_path_obj = Path(file_path)
    if not file_path_obj.exists():
        return {'success': False, 'error': f'文件不存在: {file_path}'}
    
    if source_type not in SOURCE_TYPES:
        return {'success': False, 'error': f'不支持的数据源类型: {source_type}，支持类型: {list(SOURCE_TYPES.keys())}'}
    
    file_hash = calculate_file_hash(file_path)
    is_duplicate, existing = check_duplicate_import(source_type, file_hash, workspace)
    
    if is_duplicate and not force:
        return {
            'success': False,
            'error': '检测到重复导入',
            'existing_session': existing,
        }
    
    try:
        df = read_excel_file(file_path)
    except Exception as e:
        return {'success': False, 'error': f'文件读取失败: {str(e)}'}
    
    session_uuid = str(uuid.uuid4())
    total_rows = len(df)
    success_rows = 0
    failed_rows = 0
    failed_records = []
    success_records = []
    
    row_processors = {
        'schedule': process_schedule_row,
        'leave': process_leave_row,
        'forecast': process_forecast_row,
    }
    
    processor = row_processors[source_type]
    
    for idx, row in df.iterrows():
        original_line_no = idx + 2
        row_dict = row.to_dict()
        is_valid, data, errors = processor(row_dict)
        
        if is_valid:
            success_rows += 1
            success_records.append(data)
        else:
            failed_rows += 1
            failed_records.append({
                'original_line_no': original_line_no,
                'raw_data': json.dumps(row_dict, ensure_ascii=False),
                'error_message': '; '.join(errors),
                'error_type': 'VALIDATION_ERROR',
            })
    
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    try:
        if force and is_duplicate and existing:
            old_session_id = existing['id']
            cursor.execute('UPDATE import_sessions SET status = ? WHERE id = ?', 
                         ('SUPERSEDED', old_session_id))
            cursor.execute('UPDATE failed_records SET fixed = 1 WHERE session_id = ?', 
                         (old_session_id,))
        
        file_hash_for_insert = file_hash if not (force and is_duplicate) else f"{file_hash}_{uuid.uuid4().hex[:8]}"
        
        cursor.execute('''
        INSERT INTO import_sessions
        (session_uuid, source_type, source_file, file_hash, imported_by, imported_at,
         total_rows, success_rows, failed_rows, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_uuid, source_type, str(file_path_obj.name), file_hash_for_insert, imported_by,
            datetime.now().isoformat(), total_rows, success_rows, failed_rows,
            'COMPLETED' if failed_rows == 0 else 'COMPLETED_WITH_ERRORS',
            f'强制覆盖导入,原会话ID:{existing["id"]}' if force and is_duplicate else None,
        ))
        
        session_id = cursor.lastrowid
        
        for record in success_records:
            record['session_id'] = session_id
            record['created_at'] = datetime.now().isoformat()
            
            if source_type == 'schedule':
                cursor.execute('''
                INSERT INTO teller_schedules
                (session_id, teller_id, teller_name, branch_id, branch_name, schedule_date,
                 shift_type, start_time, end_time, window_no, is_training, is_leave, remarks, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record['session_id'], record['teller_id'], record['teller_name'],
                    record['branch_id'], record['branch_name'], record['schedule_date'],
                    record['shift_type'], record['start_time'], record['end_time'],
                    record['window_no'], record['is_training'], record['is_leave'],
                    record['remarks'], record['created_at'],
                ))
            elif source_type == 'leave':
                cursor.execute('''
                INSERT INTO leave_forms
                (session_id, teller_id, teller_name, branch_id, leave_type, start_date,
                 end_date, start_time, end_time, approver, remarks, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record['session_id'], record['teller_id'], record['teller_name'],
                    record['branch_id'], record['leave_type'], record['start_date'],
                    record['end_date'], record['start_time'], record['end_time'],
                    record['approver'], record['remarks'], record['created_at'],
                ))
            elif source_type == 'forecast':
                cursor.execute('''
                INSERT INTO business_forecasts
                (session_id, branch_id, branch_name, forecast_date, time_slot,
                 forecast_volume, confidence_level, remarks, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record['session_id'], record['branch_id'], record['branch_name'],
                    record['forecast_date'], record['time_slot'], record['forecast_volume'],
                    record['confidence_level'], record['remarks'], record['created_at'],
                ))
        
        for fr in failed_records:
            cursor.execute('''
            INSERT INTO failed_records
            (session_id, source_type, original_line_no, raw_data, error_message, error_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id, source_type, fr['original_line_no'], fr['raw_data'],
                fr['error_message'], fr['error_type'], datetime.now().isoformat(),
            ))
        
        conn.commit()
        
        return {
            'success': True,
            'session_id': session_id,
            'session_uuid': session_uuid,
            'source_type': source_type,
            'source_file': file_path_obj.name,
            'total_rows': total_rows,
            'success_rows': success_rows,
            'failed_rows': failed_rows,
            'failed_records': failed_records,
            'was_duplicate': is_duplicate,
            'force_imported': force and is_duplicate,
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': f'数据库写入失败: {str(e)}'}
    finally:
        conn.close()
