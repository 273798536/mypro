import json
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict

from .database import get_connection


SHIFT_TYPES = {
    '早班': {'start': '08:00', 'end': '14:00', 'lunch_start': '11:30', 'lunch_end': '12:30'},
    '中班': {'start': '10:00', 'end': '16:00', 'lunch_start': '12:00', 'lunch_end': '13:00'},
    '晚班': {'start': '14:00', 'end': '20:00', 'lunch_start': '17:00', 'lunch_end': '18:00'},
    '全天': {'start': '08:00', 'end': '20:00', 'lunch_start': '12:00', 'lunch_end': '13:30'},
}

REQUIRED_TELLERS_PER_SLOT = {
    '08:00-09:00': 2,
    '09:00-11:30': 3,
    '11:30-13:30': 2,
    '13:30-16:00': 3,
    '16:00-18:00': 2,
}


def get_active_schedules(branch_id: str, check_date: str, workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT ts.*, s.session_uuid, s.source_file as import_source
    FROM teller_schedules ts
    JOIN import_sessions s ON ts.session_id = s.id
    WHERE ts.branch_id = ? AND ts.schedule_date = ? AND ts.is_active = 1
    ORDER BY ts.teller_id
    ''', (branch_id, check_date))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_active_leaves(branch_id: str, check_date: str, workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT lf.*, s.session_uuid, s.source_file as import_source
    FROM leave_forms lf
    JOIN import_sessions s ON lf.session_id = s.id
    WHERE lf.branch_id = ? AND lf.is_active = 1
      AND lf.start_date <= ? AND lf.end_date >= ?
    ORDER BY lf.teller_id
    ''', (branch_id, check_date, check_date))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_forecast(branch_id: str, check_date: str, workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT bf.*, s.session_uuid, s.source_file as import_source
    FROM business_forecasts bf
    JOIN import_sessions s ON bf.session_id = s.id
    WHERE bf.branch_id = ? AND bf.forecast_date = ? AND bf.is_active = 1
    ORDER BY bf.time_slot
    ''', (branch_id, check_date))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_all_branches(workspace: Optional[str] = None) -> List[Dict]:
    conn = get_connection(workspace)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT DISTINCT branch_id, branch_name
    FROM teller_schedules
    WHERE is_active = 1
    UNION
    SELECT DISTINCT branch_id, branch_name
    FROM business_forecasts
    WHERE is_active = 1
    ORDER BY branch_id
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def check_staffing_conflict(schedules: List[Dict], leaves: List[Dict], 
                            forecast: List[Dict]) -> List[Dict]:
    issues = []
    if not schedules:
        return issues
    
    branch_id = schedules[0]['branch_id']
    check_date = schedules[0]['schedule_date']
    
    leave_tellers: Set[str] = set(l['teller_id'] for l in leaves)
    
    working_schedules = [
        s for s in schedules 
        if s['teller_id'] not in leave_tellers and not s['is_leave'] and not s['is_training']
    ]
    
    training_tellers = [s for s in schedules if s['is_training']]
    if training_tellers:
        issues.append({
            'check_type': 'staffing',
            'check_item': '临时外出培训',
            'severity': 'warning',
            'description': f"{len(training_tellers)}名柜员外出培训：" + 
                          ", ".join([f"{t['teller_name']}({t['teller_id']})" for t in training_tellers]),
            'related_tellers': json.dumps([t['teller_id'] for t in training_tellers], ensure_ascii=False),
            'result_value': str(len(training_tellers)),
            'expected_value': '0',
        })
    
    slot_coverage = defaultdict(list)
    
    for s in working_schedules:
        shift_type = s['shift_type']
        if shift_type in SHIFT_TYPES:
            shift = SHIFT_TYPES[shift_type]
            for slot, required in REQUIRED_TELLERS_PER_SLOT.items():
                slot_start, slot_end = slot.split('-')
                if shift['start'] <= slot_start and shift['end'] >= slot_end:
                    slot_coverage[slot].append({
                        'teller_id': s['teller_id'],
                        'teller_name': s['teller_name'],
                        'window_no': s['window_no'],
                        'import_source': s.get('import_source', ''),
                    })
    
    for slot, required in REQUIRED_TELLERS_PER_SLOT.items():
        actual = len(slot_coverage[slot])
        if actual < required:
            teller_list = [f"{t['teller_name']}(窗口{t['window_no']})" for t in slot_coverage[slot]]
            issues.append({
                'check_type': 'staffing',
                'check_item': '窗口人手不足',
                'severity': 'error',
                'description': f"{slot} 时段应开{required}个窗口，实际仅{actual}人在岗。在岗柜员：{', '.join(teller_list) if teller_list else '无'}",
                'related_tellers': json.dumps([t['teller_id'] for t in slot_coverage[slot]], ensure_ascii=False),
                'result_value': str(actual),
                'expected_value': str(required),
            })
    
    return issues


def check_lunch_break_rules(schedules: List[Dict], leaves: List[Dict]) -> List[Dict]:
    issues = []
    if not schedules:
        return issues
    
    branch_id = schedules[0]['branch_id']
    check_date = schedules[0]['schedule_date']
    
    leave_tellers: Set[str] = set(l['teller_id'] for l in leaves)
    working_schedules = [
        s for s in schedules 
        if s['teller_id'] not in leave_tellers and not s['is_leave'] and not s['is_training']
    ]
    
    lunch_shift_map = defaultdict(list)
    for s in working_schedules:
        shift_type = s['shift_type']
        if shift_type in SHIFT_TYPES:
            lunch_key = SHIFT_TYPES[shift_type]['lunch_start']
            lunch_shift_map[lunch_key].append(s)
    
    for lunch_start, tellers in lunch_shift_map.items():
        if len(tellers) <= 1:
            continue
        
        half_count = len(tellers) // 2
        if half_count == 0:
            half_count = 1
        
        issues.append({
            'check_type': 'lunch_break',
            'check_item': '午休规则冲突',
            'severity': 'warning',
            'description': f"{lunch_start} 时段有{len(tellers)}人应安排午休，需分批至少{half_count}人值守。涉及柜员：" +
                          ", ".join([f"{t['teller_name']}(窗口{t['window_no']})" for t in tellers]),
            'related_tellers': json.dumps([t['teller_id'] for t in tellers], ensure_ascii=False),
            'result_value': str(len(tellers)),
            'expected_value': f'分批午休，至少{half_count}人值守',
        })
    
    return issues


def check_schedule_leave_overlap(schedules: List[Dict], leaves: List[Dict]) -> List[Dict]:
    issues = []
    if not schedules or not leaves:
        return issues
    
    leave_map: Dict[str, List] = defaultdict(list)
    for l in leaves:
        leave_map[l['teller_id']].append(l)
    
    for s in schedules:
        if s['teller_id'] in leave_map and not s['is_leave']:
            leave_list = leave_map[s['teller_id']]
            for l in leave_list:
                issues.append({
                    'check_type': 'data_consistency',
                    'check_item': '排班与请假冲突',
                    'severity': 'error',
                    'description': f"柜员{s['teller_name']}({s['teller_id']})排班表显示上班，但请假单显示{l['leave_type']}（{l['start_date']}至{l['end_date']}）",
                    'related_tellers': json.dumps([s['teller_id']], ensure_ascii=False),
                    'result_value': '冲突',
                    'expected_value': '一致',
                })
    
    return issues


def check_forecast_staffing_match(schedules: List[Dict], leaves: List[Dict], 
                                  forecast: List[Dict]) -> List[Dict]:
    issues = []
    if not forecast:
        return issues
    
    leave_tellers: Set[str] = set(l['teller_id'] for l in leaves)
    working_schedules = [
        s for s in schedules 
        if s['teller_id'] not in leave_tellers and not s['is_leave'] and not s['is_training']
    ]
    
    for f in forecast:
        volume = f['forecast_volume']
        time_slot = f['time_slot']
        
        required_tellers = max(2, (volume + 49) // 50)
        
        actual_tellers = 0
        for s in working_schedules:
            shift_type = s['shift_type']
            if shift_type in SHIFT_TYPES:
                shift = SHIFT_TYPES[shift_type]
                if shift['start'] <= time_slot.split('-')[0] and shift['end'] >= time_slot.split('-')[-1]:
                    actual_tellers += 1
        
        if actual_tellers < required_tellers:
            issues.append({
                'check_type': 'forecast_match',
                'check_item': '业务量与人手不匹配',
                'severity': 'warning',
                'description': f"{f['forecast_date']} {time_slot} 预测业务量{volume}笔，建议{required_tellers}个窗口，实际仅{actual_tellers}人在岗",
                'related_tellers': json.dumps([], ensure_ascii=False),
                'result_value': str(actual_tellers),
                'expected_value': str(required_tellers),
            })
    
    return issues


def run_inspection(branch_id: Optional[str] = None, check_date: Optional[str] = None,
                   session_id: Optional[int] = None, workspace: Optional[str] = None) -> Dict:
    if check_date is None:
        check_date = date.today().isoformat()
    
    if branch_id is None:
        branches = get_all_branches(workspace)
        if not branches:
            return {'success': False, 'error': '未找到任何网点数据，请先导入排班表'}
    else:
        branches = [{'branch_id': branch_id, 'branch_name': ''}]
    
    all_results = []
    summary = {
        'total_branches': len(branches),
        'branches_with_errors': 0,
        'total_errors': 0,
        'total_warnings': 0,
    }
    
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    try:
        for branch in branches:
            bid = branch['branch_id']
            
            schedules = get_active_schedules(bid, check_date, workspace)
            leaves = get_active_leaves(bid, check_date, workspace)
            forecast = get_forecast(bid, check_date, workspace)
            
            branch_issues = []
            branch_issues.extend(check_staffing_conflict(schedules, leaves, forecast))
            branch_issues.extend(check_lunch_break_rules(schedules, leaves))
            branch_issues.extend(check_schedule_leave_overlap(schedules, leaves))
            branch_issues.extend(check_forecast_staffing_match(schedules, leaves, forecast))
            
            for issue in branch_issues:
                issue['branch_id'] = bid
                issue['branch_name'] = branch['branch_name'] or schedules[0]['branch_name'] if schedules else bid
                issue['check_date'] = check_date
                issue['session_id'] = session_id if session_id and session_id > 0 else None
                issue['created_at'] = datetime.now().isoformat()
                issue['fixed'] = 0
                
                cursor.execute('''
                INSERT INTO inspection_results
                (session_id, branch_id, check_date, check_type, check_item, severity,
                 result_value, expected_value, related_tellers, description, fixed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    issue['session_id'], issue['branch_id'], issue['check_date'],
                    issue['check_type'], issue['check_item'], issue['severity'],
                    issue['result_value'], issue['expected_value'], issue['related_tellers'],
                    issue['description'], issue['fixed'], issue['created_at'],
                ))
                
                all_results.append(issue)
                
                if issue['severity'] == 'error':
                    summary['total_errors'] += 1
                else:
                    summary['total_warnings'] += 1
            
            if branch_issues:
                summary['branches_with_errors'] += 1
        
        conn.commit()
        
        return {
            'success': True,
            'check_date': check_date,
            'summary': summary,
            'issues': all_results,
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': f'巡检失败: {str(e)}'}
    finally:
        conn.close()
