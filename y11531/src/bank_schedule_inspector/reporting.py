import csv
import json
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

from .database import get_connection


def get_import_history(limit: int = 50, source_type: Optional[str] = None,
                       workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    query = '''
    SELECT s.*,
           (SELECT COUNT(*) FROM failed_records WHERE session_id = s.id AND fixed = 0) as pending_fixes
    FROM import_sessions s
    '''
    params = []
    
    if source_type:
        query += ' WHERE s.source_type = ?'
        params.append(source_type)
    
    query += ' ORDER BY s.imported_at DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_session_details(session_id: int, workspace: Optional[str] = None) -> Dict:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM import_sessions WHERE id = ?', (session_id,))
    session_row = cursor.fetchone()
    
    if not session_row:
        conn.close()
        return {}
    
    session = dict(session_row)
    
    cursor.execute('''
    SELECT * FROM failed_records 
    WHERE session_id = ? 
    ORDER BY original_line_no
    ''', (session_id,))
    failed_rows = cursor.fetchall()
    
    session['failed_records'] = [dict(row) for row in failed_rows]
    
    source_type = session['source_type']
    if source_type == 'schedule':
        cursor.execute('SELECT * FROM teller_schedules WHERE session_id = ? ORDER BY teller_id, schedule_date', (session_id,))
    elif source_type == 'leave':
        cursor.execute('SELECT * FROM leave_forms WHERE session_id = ? ORDER BY teller_id, start_date', (session_id,))
    elif source_type == 'forecast':
        cursor.execute('SELECT * FROM business_forecasts WHERE session_id = ? ORDER BY branch_id, forecast_date, time_slot', (session_id,))
    
    success_rows = cursor.fetchall()
    session['success_records'] = [dict(row) for row in success_rows]
    
    conn.close()
    return session


def get_failed_records(session_id: Optional[int] = None, fixed: Optional[bool] = None,
                       workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    query = '''
    SELECT fr.*, s.source_file, s.imported_at
    FROM failed_records fr
    JOIN import_sessions s ON fr.session_id = s.id
    '''
    params = []
    conditions = []
    
    if session_id:
        conditions.append('fr.session_id = ?')
        params.append(session_id)
    
    if fixed is not None:
        conditions.append('fr.fixed = ?')
        params.append(1 if fixed else 0)
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    query += ' ORDER BY fr.created_at DESC'
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def get_inspection_results(branch_id: Optional[str] = None, check_date: Optional[str] = None,
                           fixed: Optional[bool] = None, workspace: Optional[str] = None) -> Dict:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    query = '''
    SELECT ir.*, s.source_file as import_source
    FROM inspection_results ir
    LEFT JOIN import_sessions s ON ir.session_id = s.id
    '''
    params = []
    conditions = []
    
    if branch_id:
        conditions.append('ir.branch_id = ?')
        params.append(branch_id)
    
    if check_date:
        conditions.append('ir.check_date = ?')
        params.append(check_date)
    
    if fixed is not None:
        conditions.append('ir.fixed = ?')
        params.append(1 if fixed else 0)
    
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
    
    query += ' ORDER BY ir.check_date DESC, ir.branch_id, ir.severity DESC'
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    results = [dict(row) for row in rows]
    
    summary = defaultdict(lambda: {'errors': 0, 'warnings': 0})
    for r in results:
        key = r['check_date']
        if r['severity'] == 'error':
            summary[key]['errors'] += 1
        else:
            summary[key]['warnings'] += 1
    
    return {
        'results': results,
        'summary': dict(summary),
    }


def export_to_excel(session_id: Optional[int] = None, output_path: str = None,
                    include_failed: bool = True, workspace: Optional[str] = None) -> Dict:
    import pandas as pd
    
    if output_path is None:
        output_path = f'bsi_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    output_path = str(Path(output_path).resolve())
    
    try:
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            if session_id:
                session = get_session_details(session_id, workspace)
                if not session:
                    return {'success': False, 'error': f'找不到会话ID: {session_id}'}
                
                if session['success_records']:
                    df_success = pd.DataFrame(session['success_records'])
                    df_success.to_excel(writer, sheet_name='成功记录', index=False)
                
                if include_failed and session['failed_records']:
                    df_failed = pd.DataFrame(session['failed_records'])
                    df_failed.to_excel(writer, sheet_name='失败记录', index=False)
                
                df_session = pd.DataFrame([session])
                df_session.to_excel(writer, sheet_name='导入会话', index=False)
            else:
                history = get_import_history(limit=1000, workspace=workspace)
                if history:
                    df_history = pd.DataFrame(history)
                    df_history.to_excel(writer, sheet_name='导入历史', index=False)
                
                failed = get_failed_records(fixed=False, workspace=workspace)
                if failed:
                    df_failed = pd.DataFrame(failed)
                    df_failed.to_excel(writer, sheet_name='待修复记录', index=False)
                
                inspection = get_inspection_results(fixed=False, workspace=workspace)
                if inspection['results']:
                    df_inspection = pd.DataFrame(inspection['results'])
                    df_inspection.to_excel(writer, sheet_name='巡检问题', index=False)
        
        return {
            'success': True,
            'output_file': output_path,
        }
    except Exception as e:
        return {'success': False, 'error': f'导出失败: {str(e)}'}


def mark_failed_records_fixed(session_id: int, fixed_session_id: int, 
                               failed_record_ids: Optional[List[int]] = None,
                               workspace: Optional[str] = None) -> Dict:
    """标记失败记录为已修复
    
    Args:
        session_id: 原会话ID
        fixed_session_id: 修正后重新导入的新会话ID
        failed_record_ids: 可选，指定要标记的失败记录ID列表，如不传则标记该会话所有失败记录
        workspace: 工作目录
    
    Returns:
        标记结果字典
    """
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    try:
        if failed_record_ids:
            placeholders = ','.join(['?'] * len(failed_record_ids))
            query = f'''
            UPDATE failed_records 
            SET fixed = 1, fixed_session_id = ?
            WHERE session_id = ? AND id IN ({placeholders})
            '''
            params = [fixed_session_id, session_id] + failed_record_ids
        else:
            query = '''
            UPDATE failed_records 
            SET fixed = 1, fixed_session_id = ?
            WHERE session_id = ? AND fixed = 0
            '''
            params = [fixed_session_id, session_id]
        
        cursor.execute(query, params)
        updated_count = cursor.rowcount
        
        cursor.execute('''
        UPDATE import_sessions
        SET status = ?
        WHERE id = ?
        ''', ('FIXED', session_id))
        
        conn.commit()
        
        return {
            'success': True,
            'session_id': session_id,
            'fixed_session_id': fixed_session_id,
            'updated_count': updated_count,
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()


def export_failed_records_csv(session_id: Optional[int] = None, output_path: str = None,
                              workspace: Optional[str] = None) -> Dict:
    if output_path is None:
        output_path = f'failed_records_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    output_path = str(Path(output_path).resolve())
    
    failed = get_failed_records(session_id=session_id, fixed=False, workspace=workspace)
    
    if not failed:
        return {'success': False, 'error': '没有待修复的失败记录'}
    
    try:
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            fieldnames = ['id', 'session_id', 'source_type', 'original_line_no', 
                         'error_message', 'error_type', 'created_at', 'raw_data']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for record in failed:
                row = {k: record.get(k, '') for k in fieldnames}
                writer.writerow(row)
        
        return {
            'success': True,
            'output_file': output_path,
            'record_count': len(failed),
        }
    except Exception as e:
        return {'success': False, 'error': f'导出失败: {str(e)}'}


def generate_report(check_date: Optional[str] = None, branch_id: Optional[str] = None,
                    output_format: str = 'text', workspace: Optional[str] = None) -> Dict:
    if check_date is None:
        check_date = date.today().isoformat()
    
    inspection = get_inspection_results(branch_id=branch_id, check_date=check_date, 
                                        fixed=False, workspace=workspace)
    
    history = get_import_history(limit=10, workspace=workspace)
    
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT COUNT(*) as total,
           SUM(CASE WHEN fixed = 0 THEN 1 ELSE 0 END) as pending
    FROM failed_records
    ''')
    failed_stats = dict(cursor.fetchone())
    conn.close()
    
    report_data = {
        'report_date': datetime.now().isoformat(),
        'check_date': check_date,
        'branch_id': branch_id,
        'inspection_summary': inspection['summary'],
        'inspection_issues': inspection['results'],
        'recent_imports': history,
        'failed_stats': failed_stats,
    }
    
    if output_format == 'json':
        output_path = f'report_{check_date}_{datetime.now().strftime("%H%M%S")}.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        report_data['output_file'] = output_path
    
    return {
        'success': True,
        'report': report_data,
    }


def mark_inspection_fixed(result_id: int, workspace: Optional[str] = None) -> Dict:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM inspection_results WHERE id = ?', (result_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {'success': False, 'error': f'找不到巡检记录ID: {result_id}'}
        
        cursor.execute('UPDATE inspection_results SET fixed = 1 WHERE id = ?', (result_id,))
        conn.commit()
        
        return {'success': True, 'result_id': result_id}
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()
