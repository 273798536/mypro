import json
from datetime import datetime
from database import get_connection


RISK_CRITERIA = {
    'high_risk_wind': 6,
    'high_risk_wave': 2.5,
    'medium_risk_wind': 4,
    'medium_risk_wave': 1.5,
    'low_visibility': 3,
    'forbidden_areas': ['禁航区', '保护区', '养殖区']
}

NEXT_ACTIONS = {
    'FORECAST_DELAYED': {
        'action_type': '补材料',
        'description': '联系海洋预报台补发最新风浪预报数据',
        'detail': '风浪预报晚到超过24小时，当前风险评估基于过时数据，需要补录最新预报后重新评估'
    },
    'FORECAST_MISSING': {
        'action_type': '补材料',
        'description': '缺失施工日期的气象预报数据',
        'detail': '该施工日期未关联任何气象预报，请导入对应日期的风浪预报数据'
    },
    'HIGH_RISK': {
        'action_type': '改口径',
        'description': '高风险作业需调整施工方案或延期',
        'detail': '风浪条件超出安全作业阈值，建议修改施工计划或等待天气好转'
    },
    'AREA_CONFLICT': {
        'action_type': '改口径',
        'description': '施工区域涉及敏感海域需重新论证',
        'detail': '施工区域涉及禁航区/保护区，需提供海事部门许可文件或调整作业范围'
    },
    'DATA_INCOMPLETE': {
        'action_type': '补材料',
        'description': '核查记录字段不完整',
        'detail': '缺少坐标、施工类型等关键字段，请补充完整后重新提交'
    }
}


def calculate_risk_score(wind_level, wave_height, visibility):
    score = 0
    if wind_level >= RISK_CRITERIA['high_risk_wind']:
        score += 40
    elif wind_level >= RISK_CRITERIA['medium_risk_wind']:
        score += 20

    if wave_height >= RISK_CRITERIA['high_risk_wave']:
        score += 40
    elif wave_height >= RISK_CRITERIA['medium_risk_wave']:
        score += 20

    if visibility <= RISK_CRITERIA['low_visibility']:
        score += 20

    return score


def determine_risk_level(score):
    if score >= 60:
        return 'high'
    elif score >= 30:
        return 'medium'
    else:
        return 'low'


def check_area_conflict(construction_area):
    for forbidden in RISK_CRITERIA['forbidden_areas']:
        if forbidden in construction_area:
            return True
    return False


def detect_anomalies(record, forecasts):
    anomalies = []
    has_delayed = any(fc['is_delayed'] == 1 for fc in forecasts)
    has_forecast = len(forecasts) > 0

    if has_delayed:
        delayed_fc = [fc for fc in forecasts if fc['is_delayed'] == 1][0]
        anomalies.append({
            'anomaly_type': 'FORECAST_DELAYED',
            'severity': 'warning',
            'description': '风浪预报晚到：{}'.format(delayed_fc.get('delay_reason', '数据延迟')),
            'next_action_key': 'FORECAST_DELAYED'
        })

    if not has_forecast:
        anomalies.append({
            'anomaly_type': 'FORECAST_MISSING',
            'severity': 'error',
            'description': '缺失施工日期的气象预报数据',
            'next_action_key': 'FORECAST_MISSING'
        })

    if check_area_conflict(record['construction_area']):
        anomalies.append({
            'anomaly_type': 'AREA_CONFLICT',
            'severity': 'error',
            'description': '施工区域涉及敏感海域：{}'.format(record['construction_area']),
            'next_action_key': 'AREA_CONFLICT'
        })

    if not record.get('coordinates') or not record.get('construction_type'):
        anomalies.append({
            'anomaly_type': 'DATA_INCOMPLETE',
            'severity': 'warning',
            'description': '核查记录字段不完整',
            'next_action_key': 'DATA_INCOMPLETE'
        })

    if has_forecast and not has_delayed:
        latest_fc = forecasts[-1]
        score = calculate_risk_score(
            latest_fc['wind_level'],
            latest_fc['wave_height'],
            latest_fc['visibility']
        )
        if score >= 60:
            anomalies.append({
                'anomaly_type': 'HIGH_RISK',
                'severity': 'error',
                'description': '高风险：风力{}级，浪高{}米，能见度{}公里'.format(
                    latest_fc['wind_level'],
                    latest_fc['wave_height'],
                    latest_fc['visibility']
                ),
                'next_action_key': 'HIGH_RISK'
            })

    return anomalies


def get_affected_conclusions(record, forecasts, anomalies):
    affected = []
    has_delayed = any(fc['is_delayed'] == 1 for fc in forecasts)
    if has_delayed:
        affected.append('风险分层结论暂不可靠（基于延迟预报数据）')
        affected.append('施工许可审批需暂缓')
        affected.append('安全作业时间窗口需要重新计算')

    high_risk = [a for a in anomalies if a['anomaly_type'] == 'HIGH_RISK']
    if high_risk:
        affected.append('原定施工方案不可行')
        affected.append('需重新评估作业窗口期')

    if not forecasts:
        affected.append('无法进行风险评估')
        affected.append('不能出具施工许可意见')

    return affected


def assess_record(record_id, assessor='system'):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records WHERE id = ?", (record_id,))
    record = dict(cursor.fetchone())

    cursor.execute("SELECT * FROM weather_forecasts WHERE record_id = ? ORDER BY received_time", (record_id,))
    forecasts = [dict(fc) for fc in cursor.fetchall()]

    cursor.execute("SELECT MAX(assessment_version) as max_ver FROM risk_assessments WHERE record_id = ?", (record_id,))
    max_ver = cursor.fetchone()
    new_version = (max_ver['max_ver'] or 0) + 1

    cursor.execute("SELECT risk_level FROM risk_assessments WHERE record_id = ? AND is_latest = 1", (record_id,))
    prev_assessment = cursor.fetchone()
    old_risk_level = prev_assessment['risk_level'] if prev_assessment else None

    if forecasts and not any(fc['is_delayed'] == 1 for fc in forecasts):
        latest_fc = forecasts[-1]
        risk_score = calculate_risk_score(
            latest_fc['wind_level'],
            latest_fc['wave_height'],
            latest_fc['visibility']
        )
        risk_level = determine_risk_level(risk_score)
        criteria = json.dumps({
            'wind_threshold': RISK_CRITERIA,
            'actual_values': {
                'wind_level': latest_fc['wind_level'],
                'wave_height': latest_fc['wave_height'],
                'visibility': latest_fc['visibility']
            }
        }, ensure_ascii=False)
    else:
        risk_score = 0
        risk_level = 'pending'
        criteria = json.dumps({
            'note': '数据不完整或预报延迟，暂无法评估'
        }, ensure_ascii=False)

    anomalies = detect_anomalies(record, forecasts)
    affected_conclusions = get_affected_conclusions(record, forecasts, anomalies)

    cursor.execute("UPDATE risk_assessments SET is_latest = 0 WHERE record_id = ?", (record_id,))

    cursor.execute('''
    INSERT INTO risk_assessments 
    (record_id, assessment_version, risk_level, risk_score, assessment_criteria, 
     affected_conclusions, assessor, is_latest)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ''', (
        record_id, new_version, risk_level, risk_score, criteria,
        json.dumps(affected_conclusions, ensure_ascii=False), assessor
    ))

    if old_risk_level and old_risk_level != risk_level:
        cursor.execute('''
        INSERT INTO assessment_history 
        (record_id, old_risk_level, new_risk_level, change_reason, affected_fields)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            record_id, old_risk_level, risk_level,
            '气象预报数据更新后重新评估',
            'risk_level,risk_score,assessment_criteria'
        ))

    cursor.execute("DELETE FROM anomalies WHERE record_id = ? AND is_resolved = 0", (record_id,))
    for anomaly in anomalies:
        action = NEXT_ACTIONS[anomaly['next_action_key']]
        cursor.execute('''
        INSERT INTO anomalies 
        (record_id, anomaly_type, severity, description, next_action)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            record_id, anomaly['anomaly_type'], anomaly['severity'],
            anomaly['description'],
            json.dumps(action, ensure_ascii=False)
        ))

    status = 'verified' if risk_level != 'pending' and not anomalies else 'action_required'
    cursor.execute("UPDATE records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, record_id))

    conn.commit()

    result = {
        'record_id': record_id,
        'record_no': record['record_no'],
        'assessment_version': new_version,
        'risk_level': risk_level,
        'risk_score': risk_score,
        'anomalies_count': len(anomalies),
        'anomalies': anomalies,
        'affected_conclusions': affected_conclusions,
        'status': status
    }

    conn.close()
    return result


def assess_all_records(assessor='system'):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM records")
    record_ids = [row['id'] for row in cursor.fetchall()]
    conn.close()

    results = []
    for rid in record_ids:
        results.append(assess_record(rid, assessor))
    return results


def import_forecast(record_id, forecast_data):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO weather_forecasts 
    (record_id, forecast_date, wind_level, wave_height, visibility, 
     forecast_source, forecast_time, is_delayed, delay_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        record_id,
        forecast_data['forecast_date'],
        forecast_data.get('wind_level'),
        forecast_data.get('wave_height'),
        forecast_data.get('visibility'),
        forecast_data.get('forecast_source', ''),
        forecast_data.get('forecast_time', ''),
        forecast_data.get('is_delayed', 0),
        forecast_data.get('delay_reason', '')
    ))

    conn.commit()
    conn.close()

    return assess_record(record_id, assessor='manual_import')


def get_anomaly_summary():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT a.*, r.record_no, r.project_name, r.construction_area, r.planned_date
    FROM anomalies a
    JOIN records r ON a.record_id = r.id
    WHERE a.is_resolved = 0
    ORDER BY a.severity DESC, a.created_at DESC
    ''')

    anomalies = []
    for row in cursor.fetchall():
        a = dict(row)
        next_action = json.loads(a['next_action'])
        a['next_action'] = next_action
        anomalies.append(a)

    summary = {
        'total': len(anomalies),
        'by_severity': {
            'error': len([a for a in anomalies if a['severity'] == 'error']),
            'warning': len([a for a in anomalies if a['severity'] == 'warning'])
        },
        'by_type': {},
        'next_steps': {
            '补材料': [],
            '改口径': []
        },
        'details': anomalies
    }

    for a in anomalies:
        atype = a['anomaly_type']
        summary['by_type'][atype] = summary['by_type'].get(atype, 0) + 1
        action_type = a['next_action']['action_type']
        summary['next_steps'][action_type].append({
            'record_no': a['record_no'],
            'project_name': a['project_name'],
            'anomaly_type': a['anomaly_type'],
            'description': a['description'],
            'action_detail': a['next_action']['description']
        })

    conn.close()
    return summary
