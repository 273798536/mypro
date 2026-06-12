import os
import json
from datetime import datetime, timedelta
import pandas as pd
from core.database import get_conn, row_to_dict, rows_to_list
from config import ABNORMAL_TYPES


def add_processing_record(box_id, record_type, action, operator='系统', detail='', source_file=None, source_row=None):
    conn = get_conn()
    c = conn.cursor()
    _add_processing_record_internal(c, box_id, record_type, action, operator, detail, source_file, source_row)
    conn.commit()
    conn.close()


def _add_processing_record_internal(c, box_id, record_type, action, operator='系统', detail='', source_file=None, source_row=None):
    c.execute('''
        INSERT INTO processing_records (box_id, record_type, action, operator, detail, source_file, source_row)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (box_id, record_type, action, operator, detail, source_file, source_row))


def detect_abnormalities(box_id):
    conn = get_conn()
    c = conn.cursor()
    result = _detect_abnormalities_internal(c, box_id)
    conn.commit()
    conn.close()
    return result


def _detect_abnormalities_internal(c, box_id):
    box = c.execute('SELECT * FROM sample_boxes WHERE id = ?', (box_id,)).fetchone()
    if not box:
        return []
    
    abnormalities = []
    
    if box['storage_temp'] is not None:
        if box['storage_temp'] > 8 or box['storage_temp'] < 2:
            abnormalities.append('sample_temp_exceed')
    
    if box['transport_status'] and box['transport_status'] == 'delayed':
        abnormalities.append('transport_delay')
    
    box_code = box['box_code']
    collection_date = None
    if box['collection_time']:
        try:
            collection_date = box['collection_time'][:10]
        except:
            pass
    
    if collection_date and box['station_name']:
        wave = c.execute('''
            SELECT * FROM wave_forecasts 
            WHERE forecast_date = ? AND station_name = ?
            ORDER BY id DESC LIMIT 1
        ''', (collection_date, box['station_name'])).fetchone()
        
        if wave and wave['is_delayed']:
            abnormalities.append('wave_forecast_delay')
    
    if collection_date and box['station_name']:
        log = c.execute('''
            SELECT * FROM aquaculture_logs 
            WHERE log_date = ? AND station_name = ?
            LIMIT 1
        ''', (collection_date, box['station_name'])).fetchone()
        
        if not log:
            abnormalities.append('log_missing')
    
    abnormal_types_str = ','.join(abnormalities) if abnormalities else ''
    
    if abnormalities:
        status = 'abnormal'
    else:
        status = 'normal'
    
    c.execute('''
        UPDATE sample_boxes 
        SET status = ?, abnormal_types = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
    ''', (status, abnormal_types_str, box_id))
    
    if abnormalities:
        detail = f"检测到异常: {', '.join([ABNORMAL_TYPES.get(a, a) for a in abnormalities])}"
        _add_processing_record_internal(c, box_id, 'detection', '异常检测', '系统', detail)
    
    return abnormalities


def import_sample_boxes(file_path, operator='海洋老师'):
    if not os.path.exists(file_path):
        return {'success': False, 'message': f'文件不存在: {file_path}'}
    
    df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
    
    conn = get_conn()
    c = conn.cursor()
    imported = 0
    updated = 0
    
    for idx, row in df.iterrows():
        box_code = str(row.get('样品箱编号', row.get('box_code', ''))).strip()
        if not box_code:
            continue
        
        existing = c.execute('SELECT id FROM sample_boxes WHERE box_code = ?', (box_code,)).fetchone()
        
        collection_time = str(row.get('采样时间', row.get('collection_time', ''))) or None
        storage_temp = row.get('存储温度', row.get('storage_temp', None))
        transport_status = str(row.get('运输状态', row.get('transport_status', ''))) or None
        
        if existing:
            c.execute('''
                UPDATE sample_boxes SET
                    expedition_name = ?,
                    station_name = ?,
                    sample_type = ?,
                    collection_time = ?,
                    storage_temp = ?,
                    transport_status = ?,
                    updated_at = datetime('now', 'localtime')
                WHERE id = ?
            ''', (
                str(row.get('航次名称', row.get('expedition_name', ''))) or None,
                str(row.get('站点名称', row.get('station_name', ''))) or None,
                str(row.get('样品类型', row.get('sample_type', ''))) or None,
                collection_time,
                storage_temp if pd.notna(storage_temp) else None,
                transport_status,
                existing['id']
            ))
            box_id = existing['id']
            updated += 1
            action = '更新'
        else:
            c.execute('''
                INSERT INTO sample_boxes 
                (box_code, expedition_name, station_name, sample_type, collection_time, storage_temp, transport_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                box_code,
                str(row.get('航次名称', row.get('expedition_name', ''))) or None,
                str(row.get('站点名称', row.get('station_name', ''))) or None,
                str(row.get('样品类型', row.get('sample_type', ''))) or None,
                collection_time,
                storage_temp if pd.notna(storage_temp) else None,
                transport_status
            ))
            box_id = c.lastrowid
            imported += 1
            action = '导入'
        
        detail = f"{action}样品箱: {box_code}"
        c.execute('''
            INSERT INTO processing_records (box_id, record_type, action, operator, detail, source_file, source_row)
            VALUES (?, 'import', ?, ?, ?, ?, ?)
        ''', (box_id, action, operator, detail, os.path.basename(file_path), idx + 2))
    
    c.execute('''
        INSERT INTO data_imports (import_type, file_name, record_count, operator, remark)
        VALUES (?, ?, ?, ?, ?)
    ''', ('sample_boxes', os.path.basename(file_path), imported + updated, operator, f'新增{imported}条，更新{updated}条'))
    
    all_boxes = c.execute('SELECT id FROM sample_boxes').fetchall()
    for b in all_boxes:
        _detect_abnormalities_internal(c, b['id'])
    
    conn.commit()
    conn.close()
    
    return {'success': True, 'imported': imported, 'updated': updated, 'total': imported + updated}


def import_aquaculture_logs(file_path, operator='海洋老师'):
    if not os.path.exists(file_path):
        return {'success': False, 'message': f'文件不存在: {file_path}'}
    
    df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
    
    conn = get_conn()
    c = conn.cursor()
    imported = 0
    
    for idx, row in df.iterrows():
        log_date = str(row.get('日期', row.get('log_date', ''))).strip()
        if not log_date:
            continue
        
        c.execute('''
            INSERT INTO aquaculture_logs 
            (log_date, station_name, water_temp, salinity, dissolved_oxygen, ph, feeding_amount, mortality, notes, source_file)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log_date,
            str(row.get('站点名称', row.get('station_name', ''))) or None,
            row.get('水温', row.get('water_temp', None)) if pd.notna(row.get('水温', row.get('water_temp', None))) else None,
            row.get('盐度', row.get('salinity', None)) if pd.notna(row.get('盐度', row.get('salinity', None))) else None,
            row.get('溶解氧', row.get('dissolved_oxygen', None)) if pd.notna(row.get('溶解氧', row.get('dissolved_oxygen', None))) else None,
            row.get('PH值', row.get('ph', None)) if pd.notna(row.get('PH值', row.get('ph', None))) else None,
            row.get('投饵量', row.get('feeding_amount', None)) if pd.notna(row.get('投饵量', row.get('feeding_amount', None))) else None,
            int(row.get('死亡数', row.get('mortality', 0))) if pd.notna(row.get('死亡数', row.get('mortality', 0))) else 0,
            str(row.get('备注', row.get('notes', ''))) or None,
            os.path.basename(file_path)
        ))
        imported += 1
    
    c.execute('''
        INSERT INTO data_imports (import_type, file_name, record_count, operator, remark)
        VALUES (?, ?, ?, ?, ?)
    ''', ('aquaculture_logs', os.path.basename(file_path), imported, operator, f'导入{imported}条养殖日志'))
    
    conn.commit()
    conn.close()
    
    _recheck_all_boxes()
    
    return {'success': True, 'imported': imported}


def import_wave_forecasts(file_path, operator='海洋老师'):
    if not os.path.exists(file_path):
        return {'success': False, 'message': f'文件不存在: {file_path}'}
    
    df = pd.read_excel(file_path) if file_path.endswith(('.xlsx', '.xls')) else pd.read_csv(file_path)
    
    conn = get_conn()
    c = conn.cursor()
    imported = 0
    
    for idx, row in df.iterrows():
        forecast_date = str(row.get('预报日期', row.get('forecast_date', ''))).strip()
        if not forecast_date:
            continue
        
        is_delayed = 0
        delay_reason = None
        
        delay_status = str(row.get('是否延迟', row.get('is_delayed', ''))).strip()
        if delay_status in ['是', '1', 'true', 'True', '延迟', '晚到']:
            is_delayed = 1
            delay_reason = str(row.get('延迟原因', row.get('delay_reason', ''))) or None
        
        c.execute('''
            INSERT INTO wave_forecasts 
            (forecast_date, forecast_time, station_name, wave_height, wave_period, 
             wind_speed, wind_direction, forecast_issue_time, actual_arrival_time, 
             is_delayed, delay_reason, source_file)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            forecast_date,
            str(row.get('预报时间', row.get('forecast_time', ''))) or None,
            str(row.get('站点名称', row.get('station_name', ''))) or None,
            row.get('浪高', row.get('wave_height', None)) if pd.notna(row.get('浪高', row.get('wave_height', None))) else None,
            row.get('浪周期', row.get('wave_period', None)) if pd.notna(row.get('浪周期', row.get('wave_period', None))) else None,
            row.get('风速', row.get('wind_speed', None)) if pd.notna(row.get('风速', row.get('wind_speed', None))) else None,
            str(row.get('风向', row.get('wind_direction', ''))) or None,
            str(row.get('预报发布时间', row.get('forecast_issue_time', ''))) or None,
            str(row.get('实际到达时间', row.get('actual_arrival_time', ''))) or None,
            is_delayed,
            delay_reason,
            os.path.basename(file_path)
        ))
        imported += 1
    
    c.execute('''
        INSERT INTO data_imports (import_type, file_name, record_count, operator, remark)
        VALUES (?, ?, ?, ?, ?)
    ''', ('wave_forecasts', os.path.basename(file_path), imported, operator, f'导入{imported}条风浪预报，其中延迟{sum(1 for _, row in df.iterrows() if str(row.get("是否延迟", row.get("is_delayed", ""))).strip() in ["是", "1", "true", "True", "延迟", "晚到"])}条'))
    
    conn.commit()
    conn.close()
    
    _recheck_all_boxes()
    
    return {'success': True, 'imported': imported}


def _recheck_all_boxes():
    conn = get_conn()
    c = conn.cursor()
    boxes = c.execute('SELECT id FROM sample_boxes').fetchall()
    for b in boxes:
        _detect_abnormalities_internal(c, b['id'])
    conn.commit()
    conn.close()


def get_sample_box(box_id=None, box_code=None):
    conn = get_conn()
    c = conn.cursor()
    
    if box_id:
        box = c.execute('SELECT * FROM sample_boxes WHERE id = ?', (box_id,)).fetchone()
    elif box_code:
        box = c.execute('SELECT * FROM sample_boxes WHERE box_code = ?', (box_code,)).fetchone()
    else:
        return None
    
    result = row_to_dict(box) if box else None
    
    if result:
        if result.get('abnormal_types'):
            result['abnormal_list'] = result['abnormal_types'].split(',')
        else:
            result['abnormal_list'] = []
        
        result['processing_records'] = rows_to_list(
            c.execute('SELECT * FROM processing_records WHERE box_id = ? ORDER BY id DESC', (result['id'],)).fetchall()
        )
        
        result['review_notes'] = rows_to_list(
            c.execute('SELECT * FROM review_notes WHERE box_id = ? ORDER BY id DESC', (result['id'],)).fetchall()
        )
        
        if result.get('collection_time') and result.get('station_name'):
            date_str = result['collection_time'][:10]
            result['aquaculture_log'] = row_to_dict(
                c.execute('SELECT * FROM aquaculture_logs WHERE log_date = ? AND station_name = ? LIMIT 1',
                         (date_str, result['station_name'])).fetchone()
            )
            result['wave_forecast'] = row_to_dict(
                c.execute('SELECT * FROM wave_forecasts WHERE forecast_date = ? AND station_name = ? ORDER BY id DESC LIMIT 1',
                         (date_str, result['station_name'])).fetchone()
            )
    
    conn.close()
    return result


def list_sample_boxes(status=None, keyword=None):
    conn = get_conn()
    c = conn.cursor()
    
    query = 'SELECT * FROM sample_boxes WHERE 1=1'
    params = []
    
    if status:
        query += ' AND status = ?'
        params.append(status)
    
    if keyword:
        query += ' AND (box_code LIKE ? OR station_name LIKE ? OR expedition_name LIKE ?)'
        kw = f'%{keyword}%'
        params.extend([kw, kw, kw])
    
    query += ' ORDER BY id DESC'
    
    boxes = c.execute(query, params).fetchall()
    result = rows_to_list(boxes)
    
    for box in result:
        if box.get('abnormal_types'):
            box['abnormal_list'] = box['abnormal_types'].split(',')
        else:
            box['abnormal_list'] = []
    
    conn.close()
    return result


def add_review_note(box_id, reviewer, review_result, opinion='', handling_suggestion=''):
    conn = get_conn()
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO review_notes (box_id, reviewer, review_result, opinion, handling_suggestion)
        VALUES (?, ?, ?, ?, ?)
    ''', (box_id, reviewer, review_result, opinion, handling_suggestion))
    
    if review_result == '通过':
        new_status = 'reviewed'
    elif review_result == '驳回':
        new_status = 'abnormal'
    else:
        new_status = 'warning'
    
    c.execute('''
        UPDATE sample_boxes SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
    ''', (new_status, box_id))
    
    detail = f"复核完成，结果: {review_result}。意见: {opinion}"
    c.execute('''
        INSERT INTO processing_records (box_id, record_type, action, operator, detail)
        VALUES (?, 'review', '复核', ?, ?)
    ''', (box_id, reviewer, detail))
    
    conn.commit()
    conn.close()
    
    return True


def get_trace_chain(box_id):
    box = get_sample_box(box_id)
    if not box:
        return None
    
    chain = {
        'box': box,
        'processing_records': box.get('processing_records', []),
        'review_notes': box.get('review_notes', []),
        'related_data': {}
    }
    
    if box.get('aquaculture_log'):
        chain['related_data']['aquaculture_log'] = box['aquaculture_log']
    
    if box.get('wave_forecast'):
        chain['related_data']['wave_forecast'] = box['wave_forecast']
    
    return chain


def get_abnormal_summary():
    conn = get_conn()
    c = conn.cursor()
    
    summary = {
        'total': 0,
        'normal': 0,
        'warning': 0,
        'abnormal': 0,
        'reviewed': 0,
        'pending': 0,
        'by_type': {}
    }
    
    rows = c.execute('SELECT status, COUNT(*) as cnt FROM sample_boxes GROUP BY status').fetchall()
    total = 0
    for r in rows:
        summary[r['status']] = r['cnt']
        total += r['cnt']
    summary['total'] = total
    
    for atype in ABNORMAL_TYPES.keys():
        cnt = c.execute('''
            SELECT COUNT(*) as cnt FROM sample_boxes 
            WHERE abnormal_types LIKE ?
        ''', (f'%{atype}%',)).fetchone()['cnt']
        summary['by_type'][atype] = cnt
    
    conn.close()
    return summary
