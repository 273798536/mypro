import json
import os
import sys
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from io import BytesIO

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.models.database import init_database, get_db_connection, row_to_dict, rows_to_list
from api.services.task_service import TaskService
from api.services.calculation_service import CalculationService
from api.services.report_service import ReportService

app = Flask(__name__)
CORS(app)

task_service = TaskService()
calculation_service = CalculationService()
report_service = ReportService()

def to_camel_case(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def transform_keys(obj):
    if isinstance(obj, dict):
        return {to_camel_case(k): transform_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [transform_keys(item) for item in obj]
    return obj

def format_task(task_dict):
    result = {
        'id': task_dict.get('id'),
        'name': task_dict.get('name'),
        'status': task_dict.get('status'),
        'createdAt': task_dict.get('created_at'),
        'updatedAt': task_dict.get('updated_at'),
    }
    
    packages = task_dict.get('rawDataPackages', [])
    result['packageCount'] = len(packages)
    
    latest_result = task_dict.get('latestResult')
    if latest_result:
        result['contentHash'] = latest_result.get('contentHash')
        try:
            em = json.loads(latest_result.get('energy_model', '{}')) if isinstance(latest_result.get('energy_model'), str) else latest_result.get('energy_model', {})
            rt = json.loads(latest_result.get('return_threshold', '{}')) if isinstance(latest_result.get('return_threshold'), str) else latest_result.get('return_threshold', {})
            risks = json.loads(latest_result.get('risks', '[]')) if isinstance(latest_result.get('risks'), str) else latest_result.get('risks', [])
            result['totalRiskCount'] = len(risks) if isinstance(risks, list) else 0
            safety_margins = rt.get('safetyMargins', {}) if isinstance(rt, dict) else {}
            result['safetyScore'] = safety_margins.get('overallScore', safety_margins.get('overallSafetyScore', 0))
        except (json.JSONDecodeError, TypeError):
            result['totalRiskCount'] = 0
            result['safetyScore'] = 0
    
    if result.get('totalRiskCount') is None:
        result['totalRiskCount'] = 0
    if result.get('safetyScore') is None:
        result['safetyScore'] = 0
    
    result['isDuplicate'] = task_dict.get('isDuplicate', False)
    
    return result

def format_package(pkg_dict):
    content = pkg_dict.get('content', '{}')
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            content = {}
    
    return {
        'id': pkg_dict.get('id'),
        'taskId': pkg_dict.get('task_id'),
        'type': pkg_dict.get('type'),
        'source': pkg_dict.get('source'),
        'content': content,
        'importedBy': pkg_dict.get('imported_by', ''),
        'importedAt': pkg_dict.get('imported_at'),
        'isProcessed': False,
    }

def format_calculation_result(result_dict):
    energy_model = result_dict.get('energyModel', {})
    curve = energy_model.get('curve', [])
    energy_curve = []
    for point in curve:
        energy_curve.append({
            'distance': point.get('distance', 0),
            'power': point.get('power', 0),
            'energyConsumed': point.get('energy', 0),
            'batteryLevel': point.get('battery', 0),
            'windSpeed': point.get('windSpeed', 0),
            'altitude': 100,
        })
    
    formatted_energy = {
        'totalEnergyRequired': energy_model.get('totalEnergyRequired', 0),
        'remainingEnergy': energy_model.get('remainingEnergy', 0),
        'energyCurve': energy_curve,
        'effectiveDistance': energy_model.get('effectiveDistance', 0),
        'averagePower': energy_model.get('averagePower', 0),
        'maxPower': energy_model.get('maxPower', max(p.get('power', 0) for p in curve) if curve else 0),
        'hasWindSuddenChange': energy_model.get('hasWindSuddenChange', False),
        'windSuddenChangePoint': energy_model.get('windSuddenChangePoint'),
        'windSpeedIncrease': energy_model.get('windSpeedIncrease'),
        'energyIncreasePercentage': energy_model.get('energyIncreasePercentage'),
    }
    
    threshold = result_dict.get('returnThreshold', {})
    formatted_threshold = {
        'minBatteryLevel': threshold.get('minBatteryLevel', 15),
        'maxSafeDistance': threshold.get('maxSafeDistance', 0),
        'returnUrgency': threshold.get('returnUrgency', 'low'),
        'safetyScore': threshold.get('safetyScore', threshold.get('safetyMargins', {}).get('overallScore', 50)),
        'distanceMargin': threshold.get('distanceMargin', 0),
        'batteryMargin': threshold.get('batteryMargin', 0),
        'windAdjustmentFactor': threshold.get('windAdjustmentFactor', 1.0),
    }
    
    risks = result_dict.get('risks', [])
    formatted_risks = []
    for risk in risks:
        formatted_risks.append({
            'id': risk.get('id', ''),
            'type': risk.get('type', ''),
            'level': risk.get('level', 'low'),
            'message': risk.get('message', ''),
            'details': risk.get('details', {}),
            'sourcePackageId': risk.get('sourceTraceId'),
            'recommendation': risk.get('details', {}).get('recommendation', ''),
        })
    
    return {
        'id': result_dict.get('resultId', ''),
        'taskId': result_dict.get('taskId', ''),
        'energyModel': formatted_energy,
        'returnThreshold': formatted_threshold,
        'risks': formatted_risks,
        'calculatedAt': result_dict.get('calculatedAt', ''),
        'safetyScore': formatted_threshold['safetyScore'],
        'isDuplicate': result_dict.get('isDuplicate', False),
        'duplicateOfTaskId': result_dict.get('duplicateTaskId'),
    }

def format_correction(correction_dict):
    return {
        'id': correction_dict.get('id'),
        'taskId': correction_dict.get('task_id'),
        'action': 'correction',
        'parameter': correction_dict.get('field', ''),
        'oldValue': correction_dict.get('old_value'),
        'newValue': correction_dict.get('new_value'),
        'correctedBy': correction_dict.get('corrected_by', ''),
        'reason': correction_dict.get('reason', ''),
        'timestamp': correction_dict.get('corrected_at'),
        'sourcePackageId': None,
    }

def format_report_for_frontend(report, raw_result):
    summary = report.get('summary', {})
    risk_analysis = report.get('riskAnalysis', {})
    risk_details = risk_analysis.get('details', [])
    em_raw = raw_result.get('energyModel', {})
    rt_raw = raw_result.get('returnThreshold', {})
    raw_risks = raw_result.get('risks', [])

    curve = em_raw.get('curve', [])
    energy_curve = []
    for point in curve:
        energy_curve.append({
            'distance': point.get('distance', 0),
            'power': point.get('power', 0),
            'energyConsumed': point.get('energy', 0),
            'batteryLevel': point.get('battery', 0),
            'windSpeed': point.get('windSpeed', 0),
            'altitude': 100,
        })

    formatted_risks = []
    for risk in raw_risks:
        formatted_risks.append({
            'id': risk.get('id', ''),
            'type': risk.get('type', ''),
            'level': risk.get('level', 'low'),
            'message': risk.get('message', ''),
            'details': risk.get('details', {}),
            'sourcePackageId': risk.get('sourceTraceId'),
            'recommendation': risk.get('details', {}).get('recommendation', ''),
        })

    formatted_energy = {
        'totalEnergyRequired': em_raw.get('totalEnergyRequired', 0),
        'remainingEnergy': em_raw.get('remainingEnergy', 0),
        'energyCurve': energy_curve,
        'effectiveDistance': em_raw.get('effectiveDistance', 0),
        'averagePower': em_raw.get('averagePower', 0),
        'maxPower': em_raw.get('maxPower', max(p.get('power', 0) for p in curve) if curve else 0),
        'hasWindSuddenChange': em_raw.get('hasWindSuddenChange', False),
        'windSuddenChangePoint': em_raw.get('windSuddenChangePoint'),
        'windSpeedIncrease': em_raw.get('windSpeedIncrease'),
        'energyIncreasePercentage': em_raw.get('energyIncreasePercentage'),
    }

    safety_margins = rt_raw.get('safetyMargins', {})
    formatted_threshold = {
        'minBatteryLevel': rt_raw.get('minBatteryLevel', 15),
        'maxSafeDistance': rt_raw.get('maxSafeDistance', rt_raw.get('maxDistance', 0)),
        'returnUrgency': rt_raw.get('returnUrgency', 'low'),
        'safetyScore': safety_margins.get('overallScore', safety_margins.get('overallSafetyScore', 50)),
        'distanceMargin': rt_raw.get('distanceMargin', 0),
        'batteryMargin': rt_raw.get('batteryMargin', 0),
        'windAdjustmentFactor': rt_raw.get('windAdjustmentFactor', 1.0),
    }

    data_sources = []
    for src in report.get('dataSources', []):
        preview_data = src.get('contentPreview', {})
        preview_str = json.dumps(preview_data, ensure_ascii=False)[:100] if preview_data else ''
        data_sources.append({
            'source': src.get('source', ''),
            'type': src.get('type', ''),
            'preview': preview_str,
            'packageId': src.get('packageId', ''),
        })

    correction_history = []
    for corr in report.get('correctionHistory', []):
        correction_history.append({
            'id': corr.get('correctionId', ''),
            'taskId': report.get('taskId', ''),
            'action': 'correction',
            'parameter': corr.get('field', ''),
            'oldValue': corr.get('oldValue'),
            'newValue': corr.get('newValue'),
            'correctedBy': corr.get('correctedBy', ''),
            'reason': corr.get('reason', ''),
            'timestamp': corr.get('correctedAt', ''),
            'sourcePackageId': None,
        })

    calc_trace = []
    for trace in report.get('calculationTrace', []):
        calc_trace.append({
            'id': trace.get('traceId', ''),
            'type': trace.get('type', 'raw_data'),
            'description': trace.get('description', ''),
            'value': trace.get('value'),
            'source': '',
            'timestamp': trace.get('timestamp', ''),
            'previousNodeId': trace.get('previousNodeId'),
            'sourcePackageId': trace.get('sourcePackageId'),
        })

    critical_count = sum(1 for r in raw_risks if r.get('level') == 'critical')

    return {
        'taskId': report.get('taskId', ''),
        'taskName': report.get('taskName', ''),
        'generatedAt': report.get('generatedAt', ''),
        'summary': {
            'totalEnergy': summary.get('totalEnergyRequired', 0),
            'minBatteryLevel': summary.get('minBatteryForReturn', 0),
            'safetyScore': safety_margins.get('overallScore', safety_margins.get('overallSafetyScore', 0)),
            'riskCount': len(raw_risks),
            'criticalRiskCount': critical_count,
        },
        'risks': formatted_risks,
        'energyModel': formatted_energy,
        'returnThreshold': formatted_threshold,
        'dataSources': data_sources,
        'correctionHistory': correction_history,
        'calculationTrace': calc_trace,
        'conclusions': report.get('conclusions', []),
        'recommendations': report.get('recommendations', []),
    }

def success_response(data, message=None):
    response = {'success': True, 'data': data}
    if message:
        response['message'] = message
    return jsonify(response)

def error_response(message, status_code=400):
    return jsonify({'success': False, 'message': message}), status_code

@app.route('/api/health', methods=['GET'])
def health_check():
    return success_response({'status': 'ok'})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    status = request.args.get('status')
    include_duplicates = request.args.get('includeDuplicates', 'true').lower() == 'true'
    try:
        tasks = task_service.get_all_tasks(status=status, include_duplicates=include_duplicates)
        formatted = [format_task(t) for t in tasks]
        return success_response(formatted)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        name = data.get('name', '未命名任务')
        task = task_service.create_task(name)
        return success_response(format_task(task), '任务创建成功')
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    try:
        task = task_service.get_task(task_id)
        if not task:
            return error_response('任务不存在', 404)
        return success_response(format_task(task))
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        result = task_service.delete_task(task_id)
        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/packages', methods=['GET'])
def get_packages(task_id):
    try:
        task = task_service.get_task(task_id)
        if not task:
            return error_response('任务不存在', 404)
        packages = task.get('rawDataPackages', [])
        formatted = [format_package(p) for p in packages]
        return success_response(formatted)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/packages', methods=['POST'])
def import_package(task_id):
    try:
        data = request.get_json()
        package_type = data.get('type', 'mixed')
        content = data.get('content', {})
        source = data.get('source', 'unknown')
        imported_by = data.get('importedBy', 'user')

        if package_type == 'mixed':
            result = task_service.import_mixed_package(task_id, content, source, imported_by)
        else:
            result = task_service.import_data_package(task_id, package_type, content, source, imported_by)
        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/packages/mixed', methods=['POST'])
def import_mixed_package(task_id):
    try:
        data = request.get_json()
        mixed_data = data.get('mixedData', {})
        source = data.get('source', 'unknown')
        imported_by = data.get('importedBy', 'user')
        result = task_service.import_mixed_package(task_id, mixed_data, source, imported_by)
        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/calculation', methods=['GET'])
def get_calculation(task_id):
    try:
        result = calculation_service.get_result(task_id)
        if not result:
            return success_response(None)
        formatted = format_calculation_result(result)
        return success_response(formatted)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/calculation', methods=['POST'])
def run_calculation(task_id):
    try:
        result = calculation_service.calculate(task_id)
        if result.get('isDuplicate'):
            formatted = format_calculation_result(result)
            formatted['message'] = result.get('message', '检测到重复计算')
            return success_response(formatted, result.get('message', '检测到重复计算'))
        formatted = format_calculation_result(result)
        return success_response(formatted, '计算完成')
    except ValueError as e:
        return error_response(str(e), 404)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/corrections', methods=['GET'])
def get_corrections(task_id):
    try:
        corrections = calculation_service.get_corrections(task_id)
        formatted = [format_correction(c) for c in corrections]
        return success_response(formatted)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/corrections', methods=['POST'])
def add_correction(task_id):
    try:
        data = request.get_json()
        field = data.get('parameter', data.get('field'))
        old_value = data.get('oldValue', data.get('old_value'))
        new_value = data.get('newValue', data.get('new_value'))
        reason = data.get('reason', '')
        corrected_by = data.get('correctedBy', 'user')

        if not field:
            return error_response('缺少修正字段', 400)

        result = calculation_service.apply_correction(
            task_id, field, old_value, new_value, corrected_by, reason
        )
        formatted = format_correction({
            'id': result.get('correctionId'),
            'task_id': task_id,
            'field': field,
            'old_value': old_value,
            'new_value': new_value,
            'corrected_by': corrected_by,
            'reason': reason,
            'corrected_at': result.get('timestamp'),
        })
        return success_response(formatted)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/corrections/summary', methods=['GET'])
def get_correction_summary(task_id):
    try:
        corrections = calculation_service.get_corrections(task_id)
        return success_response({
            'totalCorrections': len(corrections),
            'corrections': [format_correction(c) for c in corrections]
        })
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/report', methods=['GET'])
def generate_report(task_id):
    try:
        result = calculation_service.get_result(task_id)
        if not result:
            return error_response('计算结果不存在', 404)

        task = task_service.get_task(task_id)
        if task:
            result['task'] = task
            result['rawPackages'] = task.get('rawDataPackages', [])

        risks = result.get('risks', [])
        risk_summary = calculation_service.risk_detector.calculate_risk_summary(risks)
        result['riskSummary'] = risk_summary

        report = report_service.generate_report(task_id, result)
        formatted_report = format_report_for_frontend(report, result)
        return success_response(formatted_report)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/report/export', methods=['GET'])
def export_report(task_id):
    try:
        result = calculation_service.get_result(task_id)
        if not result:
            return error_response('计算结果不存在', 404)

        task = task_service.get_task(task_id)
        if task:
            result['task'] = task
            result['rawPackages'] = task.get('rawDataPackages', [])

        risks = result.get('risks', [])
        risk_summary = calculation_service.risk_detector.calculate_risk_summary(risks)
        result['riskSummary'] = risk_summary

        report = report_service.generate_report(task_id, result)
        text_report = report_service.export_report_text(report)

        format_type = request.args.get('format', 'json')
        buf = BytesIO(text_report.encode('utf-8'))
        buf.seek(0)
        return send_file(
            buf,
            mimetype='text/plain; charset=utf-8',
            as_attachment=True,
            download_name=f'返航计算报告_{task_id}.txt'
        )
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/calculation/<result_id>/traces', methods=['GET'])
def get_traces(result_id):
    try:
        with get_db_connection() as conn:
            traces = conn.execute(
                'SELECT * FROM source_traces WHERE result_id = ? ORDER BY timestamp',
                (result_id,)
            ).fetchall()
        return success_response(rows_to_list(traces))
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/traces/<trace_id>/chain', methods=['GET'])
def get_trace_chain(trace_id):
    try:
        with get_db_connection() as conn:
            trace = conn.execute(
                'SELECT * FROM source_traces WHERE id = ?',
                (trace_id,)
            ).fetchone()
            if not trace:
                return error_response('追踪记录不存在', 404)
            return success_response(row_to_dict(trace))
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/tasks/<task_id>/clone', methods=['POST'])
def clone_task(task_id):
    try:
        data = request.get_json() or {}
        task = task_service.get_task(task_id)
        if not task:
            return error_response('任务不存在', 404)
        new_name = data.get('name') or f'{task.get("name", "任务")} - 副本'
        result = task_service.clone_task(task_id, new_name)
        return success_response(result)
    except Exception as e:
        return error_response(str(e), 500)

@app.route('/api/samples/dirty-sample/import', methods=['POST'])
def import_dirty_sample():
    try:
        data = request.get_json() or {}
        task_name = data.get('name', '逆风突变脏样例测试任务')

        task = task_service.create_task(task_name)
        task_id = task['id']

        dirty_sample_data = {
            'waypoint_plan': {
                'waypoints': [
                    {'lat': 31.2304, 'lng': 121.4737, 'altitude': 100, 'speed': 15},
                    {'lat': 31.2400, 'lng': 121.4800, 'altitude': 120, 'speed': 14},
                    {'lat': 31.2500, 'lng': 121.4900, 'altitude': 100, 'speed': 16}
                ],
                'totalDistance': 12.5,
                'estimatedDuration': 45
            },
            'payload_weight': {
                'payload': 2.5,
                'takeoffWeight': 15.0,
                'emptyWeight': 12.5
            },
            'wind_field': {
                'baseWindSpeed': 5,
                'suddenChange': {
                    'point': 5.2,
                    'windSpeed': 12,
                    'windDirection': 180
                }
            }
        }

        task_service.import_mixed_package(
            task_id,
            dirty_sample_data,
            '航测队-2024-05-15-上海区域',
            'system'
        )

        battery_data = {
            'battery': {
                'initialCapacity': 16000,
                'currentCapacity': 12800,
                'cycleCount': 156,
                'agingFactor': 0.8
            }
        }

        task_service.import_data_package(
            task_id,
            'payload_weight',
            battery_data,
            '电池管理系统导出',
            'system'
        )

        nfz_data = {
            'no_fly_zones': [
                {
                    'id': 'nfz-001',
                    'center': {'lat': 31.24, 'lng': 121.48},
                    'radius': 1000,
                    'detourDistance': 3.2
                }
            ]
        }

        task_service.import_data_package(
            task_id,
            'waypoint_plan',
            nfz_data,
            '民航局禁飞区数据库',
            'system'
        )

        formatted_task = format_task(task_service.get_task(task_id))
        return success_response(formatted_task, '脏样例数据导入成功')

    except Exception as e:
        return error_response(str(e), 500)

if __name__ == '__main__':
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'drone_calculator.db')
    if os.path.exists(db_path):
        os.remove(db_path)
    init_database()
    print('Database initialized')
    app.run(host='0.0.0.0', port=5001, debug=True)
