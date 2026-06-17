from flask import Flask, render_template, jsonify, request, send_file
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from replay_engine import ReplayEngine

app = Flask(__name__, template_folder='../templates', static_folder='../static')
engine = ReplayEngine()


@app.route('/')
def index():
    return render_template('dashboard.html')


@app.route('/api/batches')
def get_batches():
    batches = engine.get_run_batches()
    return jsonify(batches)


@app.route('/api/statistics')
def get_statistics():
    batch_id = request.args.get('batch_id')
    stats = engine.get_statistics(batch_id)
    return jsonify(stats)


@app.route('/api/compare')
def compare_batches():
    batch1 = request.args.get('batch1', 'RUN-001')
    batch2 = request.args.get('batch2', 'RUN-002')
    result = engine.compare_batches(batch1, batch2)
    return jsonify(result)


@app.route('/api/details')
def get_details():
    batch_id = request.args.get('batch_id')
    status_filter = request.args.get('status')
    details = engine.get_failure_details(batch_id)
    if status_filter:
        details = [d for d in details if d['status'] == status_filter]
    return jsonify(details)


@app.route('/api/lost')
def get_lost_records():
    batch_id = request.args.get('batch_id')
    records = engine.find_lost_records(batch_id)
    return jsonify(records)


@app.route('/api/replay', methods=['POST'])
def run_replay():
    data = request.get_json()
    batch_id = data.get('batch_id')
    question_ids = data.get('question_ids')
    new_batch, calls = engine.run_replay(batch_id=batch_id, question_ids=question_ids)
    return jsonify({
        'batch_id': new_batch,
        'call_count': len(calls),
        'calls': calls
    })


@app.route('/api/supplement', methods=['POST'])
def add_supplement():
    data = request.get_json()
    question_id = data.get('question_id')
    field_name = data.get('field_name')
    field_value = data.get('field_value')
    operator = data.get('operator', '系统')
    success = engine.add_supplement(question_id, field_name, field_value, operator)
    return jsonify({'success': success})


@app.route('/api/confirm', methods=['POST'])
def manual_confirm():
    data = request.get_json()
    question_id = data.get('question_id')
    result = data.get('result')
    comment = data.get('comment', '')
    operator = data.get('operator', '系统')
    success = engine.add_manual_confirm(question_id, result, comment, operator)
    return jsonify({'success': success})


@app.route('/api/export')
def export_report():
    batch_id = request.args.get('batch_id')
    fmt = request.args.get('format', 'json')
    filename, filepath = engine.export_report(batch_id, fmt)
    return send_file(filepath, as_attachment=True, download_name=filename)


@app.route('/api/questions')
def get_questions():
    questions = []
    for qid, q in engine.question_by_id.items():
        mid = q.get('关联材料', '')
        m = engine.material_by_id.get(mid, {})
        feedbacks = engine.feedback_by_qid.get(qid, [])
        calls = engine.calls_by_qid.get(qid, [])
        questions.append({
            'id': qid,
            'text': q.get('题干', ''),
            'material': m.get('材料名称', ''),
            'material_id': mid,
            'unit': q.get('单位', ''),
            'type': q.get('题目类型', ''),
            'difficulty': q.get('难度标签', ''),
            'remark': q.get('备注', ''),
            'feedback_count': len(feedbacks),
            'call_count': len(calls),
            'is_supplement': '补录' in q.get('备注', ''),
            'is_old': '旧表' in q.get('备注', ''),
            'is_bias': '偏科' in q.get('备注', '')
        })
    return jsonify(questions)


@app.route('/api/materials')
def get_materials():
    materials = []
    for mid, m in engine.material_by_id.items():
        materials.append({
            'id': mid,
            'name': m['材料名称'],
            'batch': m.get('切分批次', ''),
            'operator': m.get('切分人', ''),
            'date': m.get('切分日期', ''),
            'remark': m.get('备注', ''),
            'is_supplement': m.get('补录标记') == '是'
        })
    return jsonify(materials)


@app.route('/api/feedbacks')
def get_feedbacks():
    question_id = request.args.get('question_id')
    if question_id:
        feedbacks = engine.feedback_by_qid.get(question_id, [])
    else:
        feedbacks = engine.human_feedback
    return jsonify(feedbacks)


if __name__ == '__main__':
    app.run(debug=True, port=5678, host='0.0.0.0')
