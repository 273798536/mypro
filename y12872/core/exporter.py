import os
import json
from datetime import datetime
import pandas as pd
from core.database import get_conn, rows_to_list, row_to_dict
from core.processor import get_sample_box, get_abnormal_summary
from config import EXPORT_DIR, STATUS_LABELS, ABNORMAL_TYPES


def export_report(format_type='excel', status_filter=None, include_details=True):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    conn = get_conn()
    c = conn.cursor()
    
    query = 'SELECT * FROM sample_boxes'
    params = []
    if status_filter:
        query += ' WHERE status = ?'
        params.append(status_filter)
    query += ' ORDER BY id DESC'
    
    boxes = rows_to_list(c.execute(query, params).fetchall())
    
    summary = get_abnormal_summary()
    
    review_notes = rows_to_list(c.execute('SELECT * FROM review_notes ORDER BY id DESC').fetchall())
    
    processing_records = rows_to_list(c.execute('''
        SELECT pr.*, sb.box_code 
        FROM processing_records pr 
        LEFT JOIN sample_boxes sb ON pr.box_id = sb.id 
        ORDER BY pr.id DESC
    ''').fetchall())
    
    conn.close()
    
    if format_type == 'excel':
        return _export_excel(timestamp, boxes, summary, review_notes, processing_records, include_details)
    elif format_type == 'csv':
        return _export_csv(timestamp, boxes)
    elif format_type == 'json':
        return _export_json(timestamp, boxes, summary, review_notes, processing_records)
    else:
        return {'success': False, 'message': f'不支持的导出格式: {format_type}'}


def _export_excel(timestamp, boxes, summary, review_notes, processing_records, include_details):
    file_name = f'样品箱追踪报告_{timestamp}.xlsx'
    file_path = os.path.join(EXPORT_DIR, file_name)
    
    with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
        summary_data = {
            '指标': ['样品箱总数', '正常', '预警', '异常', '已复核', '待处理'],
            '数量': [
                summary['total'],
                summary['normal'],
                summary['warning'],
                summary['abnormal'],
                summary['reviewed'],
                summary['pending']
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='汇总', index=False)
        
        box_rows = []
        for box in boxes:
            abnormal_list = box.get('abnormal_types', '').split(',') if box.get('abnormal_types') else []
            abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in abnormal_list]
            
            box_rows.append({
                '样品箱编号': box.get('box_code', ''),
                '航次名称': box.get('expedition_name', ''),
                '站点名称': box.get('station_name', ''),
                '样品类型': box.get('sample_type', ''),
                '采样时间': box.get('collection_time', ''),
                '存储温度(℃)': box.get('storage_temp', ''),
                '运输状态': box.get('transport_status', ''),
                '状态': STATUS_LABELS.get(box.get('status', ''), box.get('status', '')),
                '异常类型': '、'.join(abnormal_names),
                '创建时间': box.get('created_at', ''),
                '更新时间': box.get('updated_at', '')
            })
        
        pd.DataFrame(box_rows).to_excel(writer, sheet_name='样品箱列表', index=False)
        
        if include_details:
            review_rows = []
            for note in review_notes:
                box_code = ''
                for b in boxes:
                    if b['id'] == note['box_id']:
                        box_code = b['box_code']
                        break
                review_rows.append({
                    '样品箱编号': box_code,
                    '复核人': note.get('reviewer', ''),
                    '复核结果': note.get('review_result', ''),
                    '复核意见': note.get('opinion', ''),
                    '处理建议': note.get('handling_suggestion', ''),
                    '复核时间': note.get('created_at', '')
                })
            
            if review_rows:
                pd.DataFrame(review_rows).to_excel(writer, sheet_name='复核记录', index=False)
            
            proc_rows = []
            for rec in processing_records:
                proc_rows.append({
                    '样品箱编号': rec.get('box_code', ''),
                    '记录类型': rec.get('record_type', ''),
                    '操作': rec.get('action', ''),
                    '操作人': rec.get('operator', ''),
                    '详情': rec.get('detail', ''),
                    '来源文件': rec.get('source_file', ''),
                    '来源行号': rec.get('source_row', ''),
                    '操作时间': rec.get('created_at', '')
                })
            
            if proc_rows:
                pd.DataFrame(proc_rows).to_excel(writer, sheet_name='处理记录', index=False)
    
    return {
        'success': True,
        'file_name': file_name,
        'file_path': file_path,
        'box_count': len(boxes)
    }


def _export_csv(timestamp, boxes):
    file_name = f'样品箱列表_{timestamp}.csv'
    file_path = os.path.join(EXPORT_DIR, file_name)
    
    box_rows = []
    for box in boxes:
        abnormal_list = box.get('abnormal_types', '').split(',') if box.get('abnormal_types') else []
        abnormal_names = [ABNORMAL_TYPES.get(a, a) for a in abnormal_list]
        
        box_rows.append({
            '样品箱编号': box.get('box_code', ''),
            '航次名称': box.get('expedition_name', ''),
            '站点名称': box.get('station_name', ''),
            '样品类型': box.get('sample_type', ''),
            '采样时间': box.get('collection_time', ''),
            '存储温度': box.get('storage_temp', ''),
            '状态': STATUS_LABELS.get(box.get('status', ''), box.get('status', '')),
            '异常类型': '、'.join(abnormal_names),
        })
    
    pd.DataFrame(box_rows).to_csv(file_path, index=False, encoding='utf-8-sig')
    
    return {
        'success': True,
        'file_name': file_name,
        'file_path': file_path,
        'box_count': len(boxes)
    }


def _export_json(timestamp, boxes, summary, review_notes, processing_records):
    file_name = f'样品箱追踪数据_{timestamp}.json'
    file_path = os.path.join(EXPORT_DIR, file_name)
    
    data = {
        'export_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'summary': summary,
        'sample_boxes': boxes,
        'review_notes': review_notes,
        'processing_records': processing_records
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return {
        'success': True,
        'file_name': file_name,
        'file_path': file_path,
        'box_count': len(boxes)
    }


def export_single_box_report(box_id, format_type='excel'):
    box = get_sample_box(box_id)
    if not box:
        return {'success': False, 'message': '样品箱不存在'}
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    if format_type == 'excel':
        file_name = f'样品箱_{box["box_code"]}_详情_{timestamp}.xlsx'
        file_path = os.path.join(EXPORT_DIR, file_name)
        
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            basic_data = {
                '项目': ['样品箱编号', '航次名称', '站点名称', '样品类型', '采样时间', 
                        '存储温度(℃)', '运输状态', '当前状态', '异常类型', '创建时间', '更新时间'],
                '内容': [
                    box.get('box_code', ''),
                    box.get('expedition_name', ''),
                    box.get('station_name', ''),
                    box.get('sample_type', ''),
                    box.get('collection_time', ''),
                    str(box.get('storage_temp', '')) if box.get('storage_temp') is not None else '',
                    box.get('transport_status', ''),
                    STATUS_LABELS.get(box.get('status', ''), box.get('status', '')),
                    '、'.join([ABNORMAL_TYPES.get(a, a) for a in box.get('abnormal_list', [])]),
                    box.get('created_at', ''),
                    box.get('updated_at', '')
                ]
            }
            pd.DataFrame(basic_data).to_excel(writer, sheet_name='基本信息', index=False)
            
            if box.get('aquaculture_log'):
                log = box['aquaculture_log']
                log_data = {
                    '项目': ['日期', '站点名称', '水温(℃)', '盐度', '溶解氧(mg/L)', 'PH值', '投饵量(kg)', '死亡数(尾)', '备注', '来源文件'],
                    '内容': [
                        log.get('log_date', ''),
                        log.get('station_name', ''),
                        str(log.get('water_temp', '')) if log.get('water_temp') is not None else '',
                        str(log.get('salinity', '')) if log.get('salinity') is not None else '',
                        str(log.get('dissolved_oxygen', '')) if log.get('dissolved_oxygen') is not None else '',
                        str(log.get('ph', '')) if log.get('ph') is not None else '',
                        str(log.get('feeding_amount', '')) if log.get('feeding_amount') is not None else '',
                        str(log.get('mortality', '')) if log.get('mortality') is not None else '',
                        log.get('notes', ''),
                        log.get('source_file', '')
                    ]
                }
                pd.DataFrame(log_data).to_excel(writer, sheet_name='养殖日志', index=False)
            
            if box.get('wave_forecast'):
                wf = box['wave_forecast']
                wf_data = {
                    '项目': ['预报日期', '预报时间', '站点名称', '浪高(m)', '浪周期(s)', '风速(m/s)', '风向',
                            '预报发布时间', '实际到达时间', '是否延迟', '延迟原因', '来源文件'],
                    '内容': [
                        wf.get('forecast_date', ''),
                        wf.get('forecast_time', ''),
                        wf.get('station_name', ''),
                        str(wf.get('wave_height', '')) if wf.get('wave_height') is not None else '',
                        str(wf.get('wave_period', '')) if wf.get('wave_period') is not None else '',
                        str(wf.get('wind_speed', '')) if wf.get('wind_speed') is not None else '',
                        wf.get('wind_direction', ''),
                        wf.get('forecast_issue_time', ''),
                        wf.get('actual_arrival_time', ''),
                        '是' if wf.get('is_delayed') else '否',
                        wf.get('delay_reason', ''),
                        wf.get('source_file', '')
                    ]
                }
                pd.DataFrame(wf_data).to_excel(writer, sheet_name='风浪预报', index=False)
            
            if box.get('processing_records'):
                proc_rows = []
                for rec in box['processing_records']:
                    proc_rows.append({
                        '记录类型': rec.get('record_type', ''),
                        '操作': rec.get('action', ''),
                        '操作人': rec.get('operator', ''),
                        '详情': rec.get('detail', ''),
                        '来源文件': rec.get('source_file', ''),
                        '来源行号': rec.get('source_row', ''),
                        '操作时间': rec.get('created_at', '')
                    })
                pd.DataFrame(proc_rows).to_excel(writer, sheet_name='处理记录', index=False)
            
            if box.get('review_notes'):
                rev_rows = []
                for note in box['review_notes']:
                    rev_rows.append({
                        '复核人': note.get('reviewer', ''),
                        '复核结果': note.get('review_result', ''),
                        '复核意见': note.get('opinion', ''),
                        '处理建议': note.get('handling_suggestion', ''),
                        '复核时间': note.get('created_at', '')
                    })
                pd.DataFrame(rev_rows).to_excel(writer, sheet_name='复核记录', index=False)
        
        return {
            'success': True,
            'file_name': file_name,
            'file_path': file_path
        }
    
    return {'success': False, 'message': '不支持的格式'}
