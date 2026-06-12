import json
import os
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from database import get_connection, init_db
from risk_engine import assess_all_records, assess_record, import_forecast, get_anomaly_summary

app = Flask(__name__)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': '海上施工禁区核查系统',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/records', methods=['GET'])
def list_records():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT r.*, ra.risk_level, ra.assessment_version, ra.assessment_time
    FROM records r
    LEFT JOIN risk_assessments ra ON r.id = ra.record_id AND ra.is_latest = 1
    ORDER BY r.created_at DESC
    ''')
    records = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'count': len(records), 'records': records})


@app.route('/api/records/<int:record_id>', methods=['GET'])
def get_record_detail(record_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records WHERE id = ?", (record_id,))
    record = dict(cursor.fetchone())

    cursor.execute("SELECT * FROM weather_forecasts WHERE record_id = ? ORDER BY received_time", (record_id,))
    forecasts = [dict(fc) for fc in cursor.fetchall()]

    cursor.execute("SELECT * FROM risk_assessments WHERE record_id = ? ORDER BY assessment_version", (record_id,))
    assessments = []
    for row in cursor.fetchall():
        a = dict(row)
        if a['assessment_criteria']:
            a['assessment_criteria'] = json.loads(a['assessment_criteria'])
        if a['affected_conclusions']:
            a['affected_conclusions'] = json.loads(a['affected_conclusions'])
        assessments.append(a)

    cursor.execute('''
    SELECT * FROM anomalies WHERE record_id = ? ORDER BY is_resolved, created_at DESC
    ''', (record_id,))
    anomalies = []
    for row in cursor.fetchall():
        a = dict(row)
        if a['next_action']:
            a['next_action'] = json.loads(a['next_action'])
        anomalies.append(a)

    cursor.execute('''
    SELECT * FROM assessment_history WHERE record_id = ? ORDER BY changed_at DESC
    ''', (record_id,))
    history = [dict(h) for h in cursor.fetchall()]

    conn.close()

    return jsonify({
        'record': record,
        'forecasts': forecasts,
        'assessments': assessments,
        'anomalies': anomalies,
        'assessment_history': history
    })


@app.route('/api/records/import', methods=['POST'])
def import_record():
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    required_fields = ['record_no', 'project_name', 'construction_area', 'planned_date']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': '缺少必填字段: {}'.format(field)}), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
        INSERT INTO records 
        (record_no, project_name, construction_area, coordinates, planned_date,
         construction_type, submitter, submit_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ''', (
            data['record_no'],
            data['project_name'],
            data['construction_area'],
            data.get('coordinates', ''),
            data['planned_date'],
            data.get('construction_type', ''),
            data.get('submitter', ''),
            data.get('submit_time', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        ))
        conn.commit()
        record_id = cursor.lastrowid
        conn.close()

        result = assess_record(record_id, assessor='api_import')
        return jsonify({
            'message': '记录导入成功',
            'record_id': record_id,
            'assessment': result
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecasts/import', methods=['POST'])
def import_forecast_api():
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    if 'record_id' not in data or 'forecast_date' not in data:
        return jsonify({'error': '缺少必填字段: record_id, forecast_date'}), 400

    try:
        result = import_forecast(data['record_id'], data)
        return jsonify({
            'message': '气象预报导入成功，风险评估已更新',
            'assessment': result,
            'note': '旧评估结果已保留在历史记录中，未被覆盖'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/anomalies', methods=['GET'])
def list_anomalies():
    summary = get_anomaly_summary()
    return jsonify(summary)


@app.route('/api/anomalies/<int:anomaly_id>/resolve', methods=['POST'])
def resolve_anomaly(anomaly_id):
    data = request.get_json() or {}
    resolution_note = data.get('resolution_note', '')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
    UPDATE anomalies 
    SET is_resolved = 1, resolution_note = ?, resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ''', (resolution_note, anomaly_id))

    conn.commit()

    cursor.execute("SELECT record_id FROM anomalies WHERE id = ?", (anomaly_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        assess_record(row['record_id'], assessor='anomaly_resolved')

    return jsonify({'message': '异常已标记为已解决'})


@app.route('/api/assess', methods=['POST'])
def run_assessment():
    data = request.get_json() or {}
    assessor = data.get('assessor', 'manual_trigger')

    if 'record_id' in data:
        result = assess_record(data['record_id'], assessor)
        return jsonify({
            'message': '单条记录评估完成',
            'result': result
        })
    else:
        results = assess_all_records(assessor)
        return jsonify({
            'message': '全部记录评估完成',
            'count': len(results),
            'results': results
        })


@app.route('/api/export', methods=['GET'])
def export_report():
    record_id = request.args.get('record_id', type=int)
    format_type = request.args.get('format', 'txt')

    conn = get_connection()
    cursor = conn.cursor()

    if record_id:
        cursor.execute("SELECT * FROM records WHERE id = ?", (record_id,))
        records = [dict(cursor.fetchone())]
    else:
        cursor.execute("SELECT * FROM records ORDER BY created_at DESC")
        records = [dict(row) for row in cursor.fetchall()]

    report_lines = []
    report_lines.append('=' * 80)
    report_lines.append('海上施工禁区核查报告')
    report_lines.append('生成时间: ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    report_lines.append('=' * 80)

    for record in records:
        rid = record['id']

        cursor.execute('''
        SELECT * FROM risk_assessments 
        WHERE record_id = ? AND is_latest = 1
        ''', (rid,))
        assessment_row = cursor.fetchone()
        assessment = dict(assessment_row) if assessment_row else None

        cursor.execute("SELECT * FROM weather_forecasts WHERE record_id = ? ORDER BY received_time", (rid,))
        forecasts = [dict(fc) for fc in cursor.fetchall()]

        cursor.execute('''
        SELECT * FROM anomalies WHERE record_id = ? AND is_resolved = 0
        ORDER BY severity DESC
        ''', (rid,))
        anomalies = []
        for row in cursor.fetchall():
            a = dict(row)
            if a['next_action']:
                a['next_action'] = json.loads(a['next_action'])
            anomalies.append(a)

        cursor.execute('''
        SELECT * FROM assessment_history WHERE record_id = ? ORDER BY changed_at DESC
        ''', (rid,))
        history = [dict(h) for h in cursor.fetchall()]

        report_lines.append('')
        report_lines.append('-' * 80)
        report_lines.append('记录编号: ' + record['record_no'])
        report_lines.append('项目名称: ' + record['project_name'])
        report_lines.append('施工区域: ' + record['construction_area'])
        report_lines.append('坐标: ' + (record.get('coordinates') or '未提供'))
        report_lines.append('计划施工日期: ' + (record.get('planned_date') or '未指定'))
        report_lines.append('施工类型: ' + (record.get('construction_type') or '未指定'))
        report_lines.append('提交人: ' + (record.get('submitter') or '未知'))
        report_lines.append('提交时间: ' + (record.get('submit_time') or '未知'))
        report_lines.append('记录状态: ' + record['status'])

        if assessment:
            risk_display = {
                'high': '高风险 (RED)',
                'medium': '中风险 (YELLOW)',
                'low': '低风险 (GREEN)',
                'pending': '待评估 (GRAY)'
            }
            report_lines.append('')
            report_lines.append('【风险评估结果】')
            report_lines.append('  评估版本: v' + str(assessment['assessment_version']))
            report_lines.append('  风险等级: ' + risk_display.get(assessment['risk_level'], assessment['risk_level']))
            report_lines.append('  风险评分: ' + str(assessment.get('risk_score', 0)))
            report_lines.append('  评估时间: ' + assessment['assessment_time'])
            report_lines.append('  评估人: ' + (assessment.get('assessor') or 'system'))

            if assessment.get('affected_conclusions'):
                affected = json.loads(assessment['affected_conclusions'])
                if affected:
                    report_lines.append('')
                    report_lines.append('  ⚠️  受影响结论:')
                    for idx, item in enumerate(affected, 1):
                        report_lines.append('     {}. {}'.format(idx, item))

        if forecasts:
            report_lines.append('')
            report_lines.append('【气象预报数据】')
            for fc in forecasts:
                delay_tag = ' [预报晚到]' if fc['is_delayed'] == 1 else ''
                report_lines.append('  预报日期: ' + fc['forecast_date'] + delay_tag)
                report_lines.append('    风力: ' + str(fc.get('wind_level', 'N/A')) + ' 级')
                report_lines.append('    浪高: ' + str(fc.get('wave_height', 'N/A')) + ' 米')
                report_lines.append('    能见度: ' + str(fc.get('visibility', 'N/A')) + ' 公里')
                report_lines.append('    来源: ' + (fc.get('forecast_source') or '未知'))
                report_lines.append('    预报发布时间: ' + (fc.get('forecast_time') or '未知'))
                if fc['is_delayed'] == 1 and fc.get('delay_reason'):
                    report_lines.append('    延迟原因: ' + fc['delay_reason'])
        else:
            report_lines.append('')
            report_lines.append('【气象预报数据】')
            report_lines.append('  ⚠️  缺失施工日期的气象预报数据')

        if anomalies:
            report_lines.append('')
            report_lines.append('【异常记录】')
            report_lines.append('  ┌─────────────────────────────────────────┐')
            report_lines.append('  │ 异常数量: {} 个，需逐一处理'.format(len(anomalies)))
            report_lines.append('  └─────────────────────────────────────────┘')

            for idx, anomaly in enumerate(anomalies, 1):
                severity_tag = '❌ 严重' if anomaly['severity'] == 'error' else '⚠️  警告'
                report_lines.append('')
                report_lines.append('  {}. {} - {}'.format(idx, severity_tag, anomaly['anomaly_type']))
                report_lines.append('     描述: ' + anomaly['description'])
                report_lines.append('     下一步:【{}】 {}'.format(
                    anomaly['next_action']['action_type'],
                    anomaly['next_action']['description']
                ))
                report_lines.append('     详情: ' + anomaly['next_action']['detail'])

        if history:
            report_lines.append('')
            report_lines.append('【评估变更历史】')
            for h in history:
                report_lines.append('  {}: {} → {} ({})'.format(
                    h['changed_at'],
                    h['old_risk_level'],
                    h['new_risk_level'],
                    h['change_reason']
                ))

        has_delayed_forecast = any(fc['is_delayed'] == 1 for fc in forecasts)
        if has_delayed_forecast:
            report_lines.append('')
            report_lines.append('=' * 80)
            report_lines.append('🔴 重要说明：本记录因「风浪预报晚到」被拦截')
            report_lines.append('   原因：海上监测浮标通信故障或其他原因导致预报数据延迟')
            report_lines.append('   影响：当前风险评估基于过时数据，结论暂不可靠')
            report_lines.append('   建议：联系海洋预报台补发最新预报数据后重新评估')
            report_lines.append('=' * 80)

    conn.close()

    report_content = '\n'.join(report_lines)

    if format_type == 'json':
        return jsonify({'report': report_content, 'generated_at': datetime.now().isoformat()})

    filename = '海上施工禁区核查报告_{}.txt'.format(datetime.now().strftime('%Y%m%d_%H%M%S'))
    temp_path = os.path.join('/tmp', filename)

    with open(temp_path, 'w', encoding='utf-8') as f:
        f.write(report_content)

    return send_file(
        temp_path,
        mimetype='text/plain; charset=utf-8',
        as_attachment=True,
        download_name=filename
    )


if __name__ == '__main__':
    init_db()
    print("海上施工禁区核查系统启动中...")
    print("访问 http://localhost:5001/api/health 检查服务状态")
    app.run(host='0.0.0.0', port=5001, debug=True)
