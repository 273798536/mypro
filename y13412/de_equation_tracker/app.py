import os
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory

from core import Processor, ReportGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
INPUT_DIR = os.path.join(DATA_DIR, 'input')
OUTPUT_DIR = os.path.join(DATA_DIR, 'output')
BAD_DIR = os.path.join(DATA_DIR, 'bad_records')
SAMPLES_DIR = os.path.join(DATA_DIR, 'samples')

for d in [INPUT_DIR, OUTPUT_DIR, BAD_DIR, SAMPLES_DIR]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/process', methods=['POST'])
def api_process():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '没有上传文件'}), 400

        f = request.files['file']
        if not f or not f.filename:
            return jsonify({'success': False, 'error': '文件名为空'}), 400

        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ('.csv', '.xlsx', '.xls'):
            return jsonify({'success': False, 'error': f'不支持的文件类型: {ext}，请上传 CSV 或 Excel'}), 400

        safe_name = 'upload_' + str(hash(f.filename + str(os.times()))) + ext
        save_path = os.path.join(INPUT_DIR, safe_name)
        f.save(save_path)

        processor = Processor(DATA_DIR)
        result = processor.process(save_path)

        reporter = ReportGenerator(OUTPUT_DIR)
        report_path = reporter.generate_report(result)
        result['files']['report'] = report_path

        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': f'处理失败: {str(e)}'}), 500


@app.route('/api/download/<category>')
def api_download(category):
    if category == 'success':
        folder = OUTPUT_DIR
    elif category == 'bad':
        folder = BAD_DIR
    elif category == 'report':
        folder = OUTPUT_DIR
    elif category == 'sample':
        folder = SAMPLES_DIR
    else:
        return jsonify({'error': '未知分类'}), 400

    filename = request.args.get('name')
    if not filename:
        return jsonify({'error': '缺少文件名'}), 400

    if '..' in filename or '/' in filename:
        return jsonify({'error': '非法文件名'}), 400

    path = os.path.join(folder, filename)
    if not os.path.isfile(path):
        return jsonify({'error': '文件不存在'}), 404

    return send_file(path, as_attachment=True)


@app.route('/api/samples')
def api_samples():
    files = []
    for name in os.listdir(SAMPLES_DIR):
        if name.startswith('.'):
            continue
        path = os.path.join(SAMPLES_DIR, name)
        if os.path.isfile(path):
            files.append({'name': name, 'size': os.path.getsize(path)})
    files.sort(key=lambda x: x['name'])
    return jsonify({'success': True, 'files': files})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5051, debug=False)
