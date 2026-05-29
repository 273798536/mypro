"""
Web可视化界面 - Flask应用
核心功能：
1. 文件上传
2. 分析结果展示
3. 数据筛选与追溯
4. 图表可视化
5. 报告下载
"""
import os
import json
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, flash, redirect, url_for
from werkzeug.utils import secure_filename

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from charging_station_analytics.core.pipeline import AnalysisPipeline, AnalysisResult
from charging_station_analytics.core.report_generator import ReportGenerator
from charging_station_analytics.config.settings import OUTPUT_DIR, UPLOAD_DIR

app = Flask(__name__)
app.secret_key = 'charging_station_analytics_secret_key'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

pipeline = AnalysisPipeline()
current_result = None
current_file = None


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """首页"""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """上传文件并分析"""
    global current_result, current_file
    
    if 'file' not in request.files:
        flash('请选择要上传的文件', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    if file.filename == '':
        flash('未选择文件', 'error')
        return redirect(url_for('index'))
    
    if not allowed_file(file.filename):
        flash('不支持的文件格式，请上传 Excel 或 CSV 文件', 'error')
        return redirect(url_for('index'))
    
    try:
        filename = secure_filename(file.filename)
        filepath = UPLOAD_DIR / filename
        file.save(filepath)
        current_file = filename
        
        flash(f'文件上传成功：{filename}，正在分析...', 'info')
        current_result = pipeline.run(str(filepath))
        
        return redirect(url_for('dashboard'))
        
    except Exception as e:
        flash(f'文件分析失败：{str(e)}', 'error')
        return redirect(url_for('index'))


@app.route('/dashboard')
def dashboard():
    """分析结果仪表板"""
    global current_result, current_file
    
    if current_result is None:
        flash('请先上传文件进行分析', 'warning')
        return redirect(url_for('index'))
    
    summary = current_result.summary
    
    return render_template('dashboard.html',
                         summary=summary,
                         filename=current_file,
                         result=current_result)


@app.route('/api/summary')
def api_summary():
    """获取汇总数据API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    return jsonify(current_result.summary)


@app.route('/api/normal_orders')
def api_normal_orders():
    """获取正常订单列表API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    search = request.args.get('search', '').lower()
    
    df = current_result.final_normal_df
    
    if search:
        mask = df.astype(str).apply(lambda x: x.str.lower().str.contains(search)).any(axis=1)
        df = df[mask]
    
    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    
    data = df.iloc[start:end].to_dict('records')
    
    return jsonify({
        'data': data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


@app.route('/api/offline_orders')
def api_offline_orders():
    """获取离线订单列表API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    df = current_result.final_offline_df
    data = df.to_dict('records')
    
    return jsonify({
        'data': data,
        'total': len(data)
    })


@app.route('/api/cross_period_orders')
def api_cross_period_orders():
    """获取跨时段订单列表API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    df = current_result.anomaly_result.cross_period_filter
    data = df.to_dict('records')
    
    return jsonify({
        'data': data,
        'total': len(data)
    })


@app.route('/api/stacked_coupon_orders')
def api_stacked_coupon_orders():
    """获取优惠叠加订单列表API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    df = current_result.anomaly_result.stacked_coupon_filter
    data = df.to_dict('records')
    
    return jsonify({
        'data': data,
        'total': len(data)
    })


@app.route('/api/trace/<order_id>')
def api_trace(order_id):
    """获取订单追溯信息API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    trace = pipeline.get_order_trace(current_result, order_id)
    if trace is None:
        return jsonify({'error': 'Order not found'}), 404
    
    return jsonify(trace)


@app.route('/api/period_details')
def api_period_details():
    """获取分时明细API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    df = current_result.tariff_result.df
    data = df.to_dict('records')
    
    return jsonify({
        'data': data,
        'total': len(data)
    })


@app.route('/api/charts_data')
def api_charts_data():
    """获取图表数据API"""
    global current_result
    
    if current_result is None:
        return jsonify({'error': 'No analysis result'}), 404
    
    summary = current_result.summary
    
    revenue_data = {
        'labels': ['电费', '服务费', '优惠抵扣'],
        'values': [
            summary['revenue']['total_electricity_fee'],
            summary['revenue']['total_service_fee'],
            summary['revenue']['total_coupon_discount']
        ],
        'colors': ['#1890FF', '#52C41A', '#FF4D4F']
    }
    
    period_energy = summary['period_distribution']['energy']
    period_energy_data = {
        'labels': list(period_energy.keys()),
        'values': list(period_energy.values()),
        'colors': ['#FF4D4F', '#FA8C16', '#52C41A', '#1890FF']
    }
    
    period_fee = summary['period_distribution']['electricity_fee']
    period_fee_data = {
        'labels': list(period_fee.keys()),
        'values': list(period_fee.values()),
        'colors': ['#FF4D4F', '#FA8C16', '#52C41A', '#1890FF']
    }
    
    anomalies = summary['anomalies']
    anomaly_data = {
        'labels': list(anomalies.keys()),
        'values': [v['count'] for v in anomalies.values()],
        'colors': ['#FF4D4F', '#FF4D4F', '#FF4D4F', '#FA8C16', '#FA8C16', '#52C41A']
    }
    
    device_status = summary['device_status']
    device_data = {
        'labels': ['正常订单', '离线订单'],
        'values': [device_status['normal_orders'], device_status['offline_orders']],
        'colors': ['#52C41A', '#FF4D4F']
    }
    
    return jsonify({
        'revenue': revenue_data,
        'period_energy': period_energy_data,
        'period_fee': period_fee_data,
        'anomalies': anomaly_data,
        'device_status': device_data
    })


@app.route('/download_report')
def download_report():
    """下载Excel报告"""
    global current_result
    
    if current_result is None:
        flash('请先上传文件进行分析', 'warning')
        return redirect(url_for('index'))
    
    try:
        report_generator = ReportGenerator()
        output_path = report_generator.generate_excel_report(current_result)
        return send_file(output_path, as_attachment=True, download_name=Path(output_path).name)
    except Exception as e:
        flash(f'生成报告失败：{str(e)}', 'error')
        return redirect(url_for('dashboard'))


@app.route('/trace/<order_id>')
def trace_detail(order_id):
    """订单追溯详情页面"""
    global current_result, current_file
    
    if current_result is None:
        flash('请先上传文件进行分析', 'warning')
        return redirect(url_for('index'))
    
    return render_template('trace.html',
                         order_id=order_id,
                         filename=current_file)


@app.route('/charts')
def charts():
    """图表分析页面"""
    global current_result, current_file
    
    if current_result is None:
        flash('请先上传文件进行分析', 'warning')
        return redirect(url_for('index'))
    
    return render_template('charts.html',
                         filename=current_file)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
