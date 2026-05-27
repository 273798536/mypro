import os
from flask import Flask, render_template, request, jsonify, send_file
from optimizer import Optimizer
from data_handler import DataHandler
from constraints import ConstraintChecker

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

data_handler = DataHandler(UPLOAD_DIR, OUTPUT_DIR)
optimizer = Optimizer()
constraint_checker = ConstraintChecker()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': '未找到上传文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': '文件名为空'}), 400
    try:
        data = data_handler.parse_upload(file)
        return jsonify({
            'status': 'ok',
            'data': data,
            'source': {'filename': file.filename, 'rows': data.get('row_count', 0)}
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'解析失败: {str(e)}',
            'errors': getattr(e, 'row_errors', [])
        }), 400


@app.route('/api/optimize', methods=['POST'])
def optimize():
    payload = request.get_json(force=True)
    work_orders = payload.get('work_orders', [])
    technicians = payload.get('technicians', [])
    config = payload.get('config', {})

    if not work_orders:
        return jsonify({'status': 'error', 'message': '工单数据为空'}), 400
    if not technicians:
        return jsonify({'status': 'error', 'message': '师傅数据为空'}), 400

    scored = optimizer.score_all(work_orders, technicians, config)

    constrained = constraint_checker.filter(scored, config)

    routes = optimizer.build_routes(constrained, technicians, config)

    anomalies = constraint_checker.detect_anomalies(routes, work_orders, technicians)

    schedule = optimizer.generate_schedule(routes, config)

    return jsonify({
        'status': 'ok',
        'scored_orders': scored,
        'routes': routes,
        'anomalies': anomalies,
        'schedule': schedule,
        'trace': data_handler.get_trace()
    })


@app.route('/api/export', methods=['POST'])
def export_report():
    payload = request.get_json(force=True)
    try:
        filepath = data_handler.generate_report(payload)
        return jsonify({
            'status': 'ok',
            'download_url': f'/api/download/{os.path.basename(filepath)}'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'导出失败: {str(e)}'}), 400


@app.route('/api/download/<path:filename>')
def download(filename):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        return jsonify({'status': 'error', 'message': '文件不存在'}), 404
    return send_file(path, as_attachment=True)


@app.route('/api/sample')
def get_sample():
    return jsonify({'status': 'ok', 'sample': data_handler.get_sample_data()})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
