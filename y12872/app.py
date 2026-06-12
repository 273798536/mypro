import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from core.database import init_db
from core.processor import (
    list_sample_boxes, get_sample_box, add_review_note,
    get_abnormal_summary, get_trace_chain, detect_abnormalities
)
from core.exporter import export_report, export_single_box_report
from config import STATUS_COLORS, STATUS_LABELS, ABNORMAL_TYPES, EXPORT_DIR

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sample-tracker-secret-key'


@app.context_processor
def inject_config():
    return {
        'STATUS_COLORS': STATUS_COLORS,
        'STATUS_LABELS': STATUS_LABELS,
        'ABNORMAL_TYPES': ABNORMAL_TYPES,
        'app_name': '海洋科考样品箱追踪系统'
    }


@app.route('/')
def index():
    status = request.args.get('status', '')
    keyword = request.args.get('keyword', '')
    
    boxes = list_sample_boxes(status=status if status else None, keyword=keyword if keyword else None)
    summary = get_abnormal_summary()
    
    return render_template('index.html',
                          boxes=boxes,
                          summary=summary,
                          current_status=status,
                          keyword=keyword)


@app.route('/box/<int:box_id>')
def box_detail(box_id):
    box = get_sample_box(box_id=box_id)
    if not box:
        return '样品箱不存在', 404
    
    chain = get_trace_chain(box_id)
    
    return render_template('detail.html', box=box, chain=chain)


@app.route('/box/<int:box_id>/review', methods=['POST'])
def box_review(box_id):
    reviewer = request.form.get('reviewer', '海洋老师')
    result = request.form.get('result', '待跟进')
    opinion = request.form.get('opinion', '')
    suggestion = request.form.get('suggestion', '')
    
    add_review_note(box_id, reviewer, result, opinion, suggestion)
    
    return redirect(url_for('box_detail', box_id=box_id))


@app.route('/export')
def export_page():
    return render_template('export.html')


@app.route('/export/generate', methods=['POST'])
def generate_export():
    fmt = request.form.get('format', 'excel')
    status = request.form.get('status', '')
    
    result = export_report(format_type=fmt, status_filter=status if status else None)
    
    if result.get('success'):
        return jsonify({
            'success': True,
            'file_name': result['file_name'],
            'file_path': result['file_path'],
            'box_count': result.get('box_count', 0)
        })
    else:
        return jsonify({'success': False, 'message': result.get('message', '导出失败')})


@app.route('/export/<int:box_id>')
def export_single(box_id):
    result = export_single_box_report(box_id)
    if result.get('success'):
        return jsonify({'success': True, 'file_name': result['file_name'], 'file_path': result['file_path']})
    return jsonify({'success': False, 'message': result.get('message', '导出失败')})


@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(EXPORT_DIR, filename, as_attachment=True)


@app.route('/api/summary')
def api_summary():
    return jsonify(get_abnormal_summary())


@app.route('/api/boxes')
def api_boxes():
    status = request.args.get('status', '')
    keyword = request.args.get('keyword', '')
    boxes = list_sample_boxes(status=status if status else None, keyword=keyword if keyword else None)
    return jsonify(boxes)


@app.route('/api/box/<int:box_id>')
def api_box(box_id):
    box = get_sample_box(box_id=box_id)
    return jsonify(box or {})


@app.route('/api/trace/<int:box_id>')
def api_trace(box_id):
    chain = get_trace_chain(box_id)
    return jsonify(chain or {})


def init_app():
    init_db()


if __name__ == '__main__':
    init_app()
    app.run(debug=True, host='0.0.0.0', port=8080)
