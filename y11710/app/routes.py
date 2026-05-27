import os
import json
from flask import render_template, request, jsonify, send_file, Response
from app import app
from app.core.fitting import fit_damped_oscillation, estimate_period_by_peaks
from app.core.anomaly import detect_all_anomalies, summarize_anomalies
from app.utils.data_loader import load_data, validate_data
from app.utils.report_generator import generate_report, save_report_json, export_report_data
from app.utils.history import add_record, get_all_records, get_record, add_correction
from app.utils.sample_data import generate_sample_data
from config import EXPORT_DIR


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        content = file.read().decode('utf-8')
        data = load_data(content, file.filename)
        
        validation = validate_data(data)
        
        return jsonify({
            'success': True,
            'data': data,
            'validation': validation
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/sample', methods=['POST'])
def load_sample():
    try:
        student_id = request.json.get('student_id', 'S001') if request.json else 'S001'
        with_anomalies = request.json.get('with_anomalies', True) if request.json else True
        
        data = generate_sample_data(student_id, with_anomalies=with_anomalies)
        validation = validate_data(data)
        
        return jsonify({
            'success': True,
            'data': data,
            'validation': validation
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    try:
        body = request.json
        if not body or 'time' not in body or 'displacement' not in body:
            return jsonify({'error': '缺少时间或位移数据'}), 400
        
        t = body['time']
        x = body['displacement']
        metadata = body.get('metadata', {})
        source = body.get('source', 'manual_input')
        
        data = {
            'time': t,
            'displacement': x,
            'metadata': metadata,
            'source': source,
            'unit_warnings': body.get('unit_warnings', [])
        }
        
        validation = validate_data(data)
        if not validation['valid']:
            return jsonify({
                'success': False,
                'error': '数据验证失败',
                'validation': validation
            }), 400
        
        fit_result = fit_damped_oscillation(t, x)
        
        residuals = fit_result['residuals']
        anomalies = detect_all_anomalies(t, x, residuals)
        anomaly_summary = summarize_anomalies(anomalies)
        
        T_peak, T_std_peak, peak_msg = estimate_period_by_peaks(t, x)
        period_peak = {
            'period': T_peak,
            'std': T_std_peak,
            'message': peak_msg
        }
        
        student_id = metadata.get('student_id', 'unknown')
        results_for_history = {
            'fit': fit_result,
            'anomalies': anomalies,
            'anomaly_summary': anomaly_summary
        }
        record_id = add_record(student_id, source, results_for_history)
        
        report = generate_report(data, fit_result, anomalies, anomaly_summary, period_peak, validation, record_id)
        
        save_report_json(report, record_id)
        
        return jsonify({
            'success': True,
            'record_id': record_id,
            'fit_result': fit_result,
            'anomalies': anomalies,
            'anomaly_summary': anomaly_summary,
            'period_peak': period_peak,
            'validation': validation,
            'report': report
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history')
def get_history():
    try:
        records = get_all_records()
        return jsonify({
            'success': True,
            'records': records
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<record_id>')
def get_single_record(record_id):
    try:
        record = get_record(record_id)
        if not record:
            return jsonify({'error': '记录不存在'}), 404
        return jsonify({
            'success': True,
            'record': record
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/correct', methods=['POST'])
def correct_record():
    try:
        body = request.json
        record_id = body.get('record_id')
        correction_type = body.get('type')
        old_value = body.get('old_value')
        new_value = body.get('new_value')
        reason = body.get('reason', '')
        
        if not all([record_id, correction_type, old_value is not None, new_value is not None]):
            return jsonify({'error': '缺少必要参数'}), 400
        
        success = add_correction(record_id, correction_type, old_value, new_value, reason)
        if not success:
            return jsonify({'error': '记录不存在'}), 404
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/<record_id>/<format_type>')
def export_report(record_id, format_type):
    try:
        record = get_record(record_id)
        if not record:
            return jsonify({'error': '记录不存在'}), 404
        
        if format_type == 'json':
            filename = f'report_{record_id}.json'
            filepath = os.path.join(EXPORT_DIR, filename)
            if not os.path.exists(filepath):
                return jsonify({'error': '报告文件不存在'}), 404
            return send_file(filepath, as_attachment=True, download_name=filename)
        
        elif format_type == 'txt':
            report = {
                'record_id': record_id,
                'generated_at': record['timestamp'],
                'student_id': record.get('student_id', '未知'),
                'data_source': record.get('data_source', '未知'),
                'summary': f"周期 T={record['results']['fit']['period']:.4f}s | 阻尼 γ={record['results']['fit']['gamma']:.6f}s⁻¹ | R²={record['results']['fit']['r_squared']:.4f}",
                'fit_results': record['results']['fit'],
                'anomalies': record['results'].get('anomalies', []),
                'anomaly_summary': record['results'].get('anomaly_summary', {'total': 0, 'by_type': {}}),
                'period_peak_estimate': None,
                'validation': {'errors': [], 'warnings': []}
            }
            content = export_report_data(report)
            return Response(
                content,
                mimetype='text/plain',
                headers={'Content-Disposition': f'attachment; filename=report_{record_id}.txt'}
            )
        
        elif format_type == 'png':
            filename = f'plot_{record_id}.png'
            filepath = os.path.join(EXPORT_DIR, filename)
            if not os.path.exists(filepath):
                return jsonify({'error': '图表文件不存在'}), 404
            return send_file(filepath, as_attachment=True, download_name=filename)
        
        else:
            return jsonify({'error': '不支持的导出格式'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
