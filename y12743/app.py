import os
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename

from config import Config, ensure_dirs
from app.data_store import DataStore
from app.rules import RuleEngine
from app.data_import import (
    read_data_file, normalize_columns, allowed_file,
    compute_file_hash, save_uploaded_file
)
from app.sample_data import save_sample_data
from app.charts import generate_summary_charts, generate_sorting_chart
from app.report import generate_review_report, build_text_summary


ensure_dirs()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
app.secret_key = 'sampling-corrector-secret-key'

store = DataStore()
rule_engine = RuleEngine()


def _get_common_context():
    summary = store.get_all_records_summary()
    charts = generate_summary_charts(store)
    sorting_chart = generate_sorting_chart(store)
    if sorting_chart:
        charts['sorting_unstable'] = sorting_chart
    return summary, charts


@app.route('/')
def dashboard():
    summary, charts = _get_common_context()
    message = request.args.get('message')
    message_type = request.args.get('message_type', 'info')
    return render_template('dashboard.html',
                         active_page='dashboard',
                         summary=summary,
                         charts=charts,
                         message=message,
                         message_type=message_type)


@app.route('/constraint-check')
def constraint_check():
    summary, charts = _get_common_context()
    report = generate_review_report(store, rule_engine)
    
    flagged = []
    for rid in list(store.records.keys()):
        rec = store.get_record_with_trace(rid)
        if rec and rec.get('issues'):
            flagged.append(rec)
        if len(flagged) >= 50:
            break
    
    return render_template('constraint_check.html',
                         active_page='constraint',
                         summary=summary,
                         charts=charts,
                         issues_by_type=report['issues_by_type'],
                         flagged_records=flagged)


@app.route('/review')
def review():
    report = generate_review_report(store, rule_engine)
    text_summary = build_text_summary(report)
    return render_template('review.html',
                         active_page='review',
                         report=report,
                         text_summary=text_summary)


@app.route('/formula-review')
def formula_review():
    report = generate_review_report(store, rule_engine)
    return render_template('formula_review.html',
                         active_page='formula',
                         issues_by_type=report['issues_by_type'])


@app.route('/records')
def records():
    status = request.args.get('status')
    if status:
        recs = store.get_records_by_status(status)
    else:
        recs = list(store.records.values())
    
    recs_sorted = sorted(recs, key=lambda r: r.get('last_updated', ''), reverse=True)
    return render_template('records.html',
                         active_page='records',
                         records=recs_sorted)


@app.route('/record/<record_id>')
def record_detail(record_id):
    rec = store.get_record_with_trace(record_id)
    if not rec:
        return "记录不存在", 404
    return render_template('record_detail.html',
                         active_page='records',
                         record=rec)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(url_for('dashboard', message='未选择文件', message_type='error'))
    
    file = request.files['file']
    if file.filename == '':
        return redirect(url_for('dashboard', message='未选择文件', message_type='error'))
    
    if not allowed_file(file.filename):
        return redirect(url_for('dashboard', 
                              message=f'不支持的文件格式，仅支持: {Config.ALLOWED_EXTENSIONS}',
                              message_type='error'))
    
    filename = secure_filename(file.filename)
    filepath = save_uploaded_file(file, filename)
    
    file_hash = compute_file_hash(filepath)
    dup_upload_id = store.check_duplicate_upload(file_hash)
    if dup_upload_id:
        os.remove(filepath)
        return redirect(url_for('dashboard',
                              message=f'检测到重复导入！该文件已于上传ID {dup_upload_id} 导入过，避免出现两份结论。',
                              message_type='warning'))
    
    try:
        df = read_data_file(filepath)
        df = normalize_columns(df)
    except Exception as e:
        return redirect(url_for('dashboard',
                              message=f'文件解析失败: {str(e)}',
                              message_type='error'))
    
    upload_id = store.register_upload(filename, file_hash, len(df))
    store.add_records(upload_id, df)
    
    results = rule_engine.run_all(df, store, upload_id)
    
    total_issues = sum(r.get('count', 0) for r in results.values())
    return redirect(url_for('dashboard',
                          message=f'导入成功！{len(df)} 条记录，检出 {total_issues} 个问题。请到「约束校验」查看详情。',
                          message_type='success'))


@app.route('/load-sample')
def load_sample():
    try:
        filepath, df = save_sample_data()
        file_hash = compute_file_hash(filepath)
        dup_upload_id = store.check_duplicate_upload(file_hash)
        if dup_upload_id:
            return redirect(url_for('dashboard',
                                  message=f'样例数据已导入过（上传ID: {dup_upload_id}），不重复导入。',
                                  message_type='warning'))
        
        upload_id = store.register_upload('sample_data.csv', file_hash, len(df))
        store.add_records(upload_id, df)
        results = rule_engine.run_all(df, store, upload_id)
        
        total_issues = sum(r.get('count', 0) for r in results.values())
        return redirect(url_for('constraint_check'))
    except Exception as e:
        return redirect(url_for('dashboard',
                              message=f'加载样例失败: {str(e)}',
                              message_type='error'))


@app.route('/reset')
def reset_data():
    for rid in list(store.records.keys()):
        del store.records[rid]
    for iid in list(store.issues.keys()):
        del store.issues[iid]
    for uid in list(store.uploads.keys()):
        del store.uploads[uid]
    store.trace_log = []
    store.manual_edits = {}
    store.save_all()
    return redirect(url_for('dashboard',
                          message='已清空所有数据',
                          message_type='info'))


@app.route('/resolve/<issue_id>', methods=['POST'])
def resolve_issue(issue_id):
    resolution = request.form.get('resolution', '人工复核通过')
    operator = request.form.get('operator', '教研编辑')
    store.resolve_issue(issue_id, resolution, operator)
    
    issue = store.issues.get(issue_id, {})
    rid = issue.get('record_id')
    if rid:
        return redirect(url_for('record_detail', record_id=rid))
    return redirect(url_for('constraint-check'))


@app.route('/record/<record_id>/edit', methods=['POST'])
def manual_edit(record_id):
    field_name = request.form.get('field_name')
    new_value = request.form.get('new_value')
    operator = request.form.get('operator', '教研编辑')
    
    if record_id not in store.records:
        return "记录不存在", 404
    
    old_value = store.records[record_id]['data'].get(field_name)
    store.records[record_id]['data'][field_name] = new_value
    store.record_manual_edit(record_id, field_name, str(old_value), new_value, operator)
    
    return redirect(url_for('record_detail', record_id=record_id))


@app.route('/record/<record_id>/status', methods=['POST'])
def change_status(record_id):
    status = request.form.get('status')
    if status not in ['available', 'pending', 'recollect']:
        return "无效状态", 400
    store.set_record_status(record_id, status)
    return redirect(url_for('record_detail', record_id=record_id))


@app.route('/api/report')
def api_report():
    report = generate_review_report(store, rule_engine)
    return jsonify(report)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
