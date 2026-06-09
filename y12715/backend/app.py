import os
import json
import io
import base64
from datetime import datetime
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from models import db, WrongQuestion, AuditLog, ConstraintCheck
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'error_attribution.db')
STATIC_DIR = os.path.join(os.path.dirname(BASE_DIR), 'frontend')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
CORS(app)

plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def log_audit(question_id, analyst_name, from_status, to_status, change_reason, old_vals, new_vals):
    log = AuditLog(
        question_id=question_id,
        analyst_name=analyst_name,
        from_status=from_status,
        to_status=to_status,
        change_reason=change_reason,
        old_values=json.dumps(old_vals, ensure_ascii=False) if old_vals else None,
        new_values=json.dumps(new_vals, ensure_ascii=False) if new_vals else None,
    )
    db.session.add(log)


def run_constraint_checks(question):
    checks = []
    if question.attribution_reason:
        ref_ok = bool(question.source_ref or question.source_note)
        check = ConstraintCheck(
            question_id=question.id,
            check_type='来源追溯校验',
            check_result='pass' if ref_ok else 'fail',
            check_detail='归因结论已关联原始来源材料' if ref_ok else '归因结论缺少来源行号/图片名/备注，无法追溯',
            source_material_ref=question.source_ref or question.source_note,
        )
        checks.append(check)
    if question.question_content and question.correct_answer:
        check = ConstraintCheck(
            question_id=question.id,
            check_type='数据完整性校验',
            check_result='pass',
            check_detail='题干与标准答案完整',
            source_material_ref=question.source_ref,
        )
        checks.append(check)
    elif not question.correct_answer:
        check = ConstraintCheck(
            question_id=question.id,
            check_type='数据完整性校验',
            check_result='fail',
            check_detail='缺少标准答案，需重新采集',
            source_material_ref=question.source_ref,
        )
        checks.append(check)
    for c in checks:
        db.session.add(c)
    return checks


@app.route('/')
def index_risk():
    return app.send_static_file('risk_analyst.html')


@app.route('/student')
def index_student():
    return app.send_static_file('student.html')


@app.route('/api/questions', methods=['GET'])
def list_questions():
    status = request.args.get('status')
    student_id = request.args.get('student_id')
    query = WrongQuestion.query
    if status:
        query = query.filter_by(status=status)
    if student_id:
        query = query.filter_by(student_id=student_id)
    questions = query.order_by(WrongQuestion.created_at.desc()).all()
    return jsonify([q.to_dict() for q in questions])


@app.route('/api/questions/<int:qid>', methods=['GET'])
def get_question(qid):
    q = WrongQuestion.query.get_or_404(qid)
    return jsonify(q.to_dict(include_detail=True))


@app.route('/api/questions', methods=['POST'])
def create_question():
    data = request.get_json() or {}
    q = WrongQuestion(
        student_id=data.get('student_id', 'S001'),
        student_name=data.get('student_name'),
        question_content=data.get('question_content', ''),
        correct_answer=data.get('correct_answer'),
        student_answer=data.get('student_answer'),
        source_type=data.get('source_type'),
        source_ref=data.get('source_ref'),
        source_note=data.get('source_note'),
        attribution_reason=data.get('attribution_reason'),
        attribution_category=data.get('attribution_category'),
        status=data.get('status', 'pending'),
        data_quality=data.get('data_quality', 'available'),
    )
    db.session.add(q)
    db.session.flush()
    run_constraint_checks(q)
    db.session.commit()
    return jsonify(q.to_dict(include_detail=True)), 201


@app.route('/api/questions/<int:qid>', methods=['PUT'])
def update_question(qid):
    q = WrongQuestion.query.get_or_404(qid)
    data = request.get_json() or {}
    analyst = data.get('analyst_name', 'system')
    change_reason = data.get('change_reason', '')

    old_vals = {
        'status': q.status,
        'attribution_reason': q.attribution_reason,
        'attribution_category': q.attribution_category,
        'data_quality': q.data_quality,
    }

    old_status = q.status
    for field in ['student_name', 'question_content', 'correct_answer', 'student_answer',
                  'source_type', 'source_ref', 'source_note', 'attribution_reason',
                  'attribution_category', 'status', 'data_quality']:
        if field in data:
            setattr(q, field, data[field])

    q.version += 1
    new_status = q.status

    new_vals = {
        'status': q.status,
        'attribution_reason': q.attribution_reason,
        'attribution_category': q.attribution_category,
        'data_quality': q.data_quality,
    }

    log_audit(qid, analyst, old_status, new_status, change_reason, old_vals, new_vals)
    run_constraint_checks(q)
    db.session.commit()
    return jsonify(q.to_dict(include_detail=True))


@app.route('/api/questions/batch-review', methods=['POST'])
def batch_review():
    data = request.get_json() or {}
    ids = data.get('ids', [])
    to_status = data.get('status', 'approved')
    analyst = data.get('analyst_name', 'batch-analyst')
    change_reason = data.get('change_reason', '批量复核')
    updated = []
    for qid in ids:
        q = WrongQuestion.query.get(qid)
        if not q:
            continue
        old_status = q.status
        old_vals = {'status': q.status}
        q.status = to_status
        q.version += 1
        new_vals = {'status': to_status}
        log_audit(qid, analyst, old_status, to_status, change_reason, old_vals, new_vals)
        updated.append(q.to_dict())
    db.session.commit()
    return jsonify({'updated_count': len(updated), 'items': updated})


@app.route('/api/questions/<int:qid>/constraint-check', methods=['POST'])
def check_constraint(qid):
    q = WrongQuestion.query.get_or_404(qid)
    checks = run_constraint_checks(q)
    db.session.commit()
    return jsonify([c.to_dict() for c in checks])


@app.route('/api/questions/<int:qid>/audit-logs', methods=['GET'])
def get_audit_logs(qid):
    logs = AuditLog.query.filter_by(question_id=qid).order_by(AuditLog.created_at.desc()).all()
    return jsonify([l.to_dict() for l in logs])


@app.route('/api/statistics', methods=['GET'])
def statistics():
    questions = WrongQuestion.query.all()
    df = pd.DataFrame([q.to_dict() for q in questions])
    if df.empty:
        return jsonify({'total': 0, 'by_status': {}, 'by_category': {}, 'by_quality': {}})
    by_status = df['status_label'].value_counts().to_dict()
    by_category = df['attribution_category'].fillna('未分类').value_counts().to_dict()
    by_quality = df['data_quality_label'].value_counts().to_dict()
    return jsonify({
        'total': len(df),
        'by_status': by_status,
        'by_category': by_category,
        'by_quality': by_quality,
    })


def _make_chart(df, kind, title, column, labels_map=None):
    fig, ax = plt.subplots(figsize=(8, 5))
    if df.empty:
        ax.text(0.5, 0.5, '暂无数据', ha='center', va='center', transform=ax.transAxes)
    else:
        data = df[column].fillna('未分类').value_counts()
        if labels_map:
            data.index = data.index.map(lambda x: labels_map.get(x, x))
        if kind == 'pie':
            data.plot.pie(ax=ax, autopct='%1.1f%%', startangle=90)
            ax.set_ylabel('')
        else:
            data.plot.bar(ax=ax, color='#4A90E2')
            ax.set_ylabel('数量')
            for i, v in enumerate(data.values):
                ax.text(i, v + 0.05, str(v), ha='center')
    ax.set_title(title)
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100)
    plt.close(fig)
    buf.seek(0)
    return buf


@app.route('/api/export/chart/status.png')
def export_status_chart():
    qs = WrongQuestion.query.all()
    df = pd.DataFrame([q.to_dict() for q in qs])
    labels = {'pending': '待确认', 'approved': '已通过', 'rejected': '需重新采集', 'delayed': '暂缓处理'}
    buf = _make_chart(df, 'pie', '错题归因状态分布', 'status', labels)
    return send_file(buf, mimetype='image/png', download_name='status_distribution.png')


@app.route('/api/export/chart/category.png')
def export_category_chart():
    qs = WrongQuestion.query.all()
    df = pd.DataFrame([q.to_dict() for q in qs])
    buf = _make_chart(df, 'bar', '错题归因类别分布', 'attribution_category')
    return send_file(buf, mimetype='image/png', download_name='category_distribution.png')


@app.route('/api/export/chart/quality.png')
def export_quality_chart():
    qs = WrongQuestion.query.all()
    df = pd.DataFrame([q.to_dict() for q in qs])
    labels = {'available': '数据可用', 'delayed': '数据暂缓', 'recollect': '需重新采集'}
    buf = _make_chart(df, 'pie', '数据质量分布', 'data_quality', labels)
    return send_file(buf, mimetype='image/png', download_name='quality_distribution.png')


@app.route('/api/export/chart/combined.png')
def export_combined_chart():
    qs = WrongQuestion.query.all()
    df = pd.DataFrame([q.to_dict() for q in qs])
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    if df.empty:
        for ax in axes:
            ax.text(0.5, 0.5, '暂无数据', ha='center', va='center', transform=ax.transAxes)
    else:
        status_labels = {'pending': '待确认', 'approved': '已通过', 'rejected': '需重新采集', 'delayed': '暂缓处理'}
        s = df['status'].fillna('pending').value_counts()
        s.index = s.index.map(lambda x: status_labels.get(x, x))
        s.plot.pie(ax=axes[0], autopct='%1.1f%%', startangle=90)
        axes[0].set_title('状态分布')
        axes[0].set_ylabel('')

        c = df['attribution_category'].fillna('未分类').value_counts()
        c.plot.bar(ax=axes[1], color='#4A90E2')
        axes[1].set_title('归因类别分布')
        axes[1].set_ylabel('数量')

        q_labels = {'available': '可用', 'delayed': '暂缓', 'recollect': '重采'}
        dq = df['data_quality'].fillna('available').value_counts()
        dq.index = dq.index.map(lambda x: q_labels.get(x, x))
        dq.plot.bar(ax=axes[2], color='#7ED321')
        axes[2].set_title('数据质量分布')
        axes[2].set_ylabel('数量')

    fig.suptitle('组合计数错题归因总览', fontsize=14)
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100)
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype='image/png', download_name='combined_chart.png')


@app.route('/api/export/questions.xlsx')
def export_excel():
    qs = WrongQuestion.query.order_by(WrongQuestion.id.asc()).all()
    rows = []
    for q in qs:
        rows.append({
            'ID': q.id,
            '学生编号': q.student_id,
            '学生姓名': q.student_name,
            '题目内容': q.question_content,
            '标准答案': q.correct_answer,
            '学生作答': q.student_answer,
            '来源类型': q.source_type,
            '来源引用(行号/图片名)': q.source_ref,
            '来源备注': q.source_note,
            '归因原因': q.attribution_reason,
            '归因类别': q.attribution_category,
            '状态': q._status_label(),
            '数据质量': q._data_quality_label(),
            '版本': q.version,
            '创建时间': q.created_at.strftime('%Y-%m-%d %H:%M:%S') if q.created_at else '',
            '更新时间': q.updated_at.strftime('%Y-%m-%d %H:%M:%S') if q.updated_at else '',
        })
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='错题归因', index=False)
    buf.seek(0)
    return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     download_name='wrong_questions.xlsx')


@app.route('/api/export/audit-logs.xlsx')
def export_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).all()
    rows = []
    for log in logs:
        rows.append({
            '日志ID': log.id,
            '错题ID': log.question_id,
            '风控分析师': log.analyst_name,
            '原状态': {'pending': '待确认', 'approved': '已通过', 'rejected': '需重新采集', 'delayed': '暂缓处理'}.get(log.from_status, log.from_status),
            '新状态': {'pending': '待确认', 'approved': '已通过', 'rejected': '需重新采集', 'delayed': '暂缓处理'}.get(log.to_status, log.to_status),
            '变更原因': log.change_reason,
            '变更时间': log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else '',
        })
    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='审核留痕', index=False)
    buf.seek(0)
    return send_file(buf, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     download_name='audit_logs.xlsx')


@app.route('/api/init-sample', methods=['POST'])
def init_sample():
    db.drop_all()
    db.create_all()

    samples = [
        {
            'student_id': 'S2024001', 'student_name': '张小明',
            'question_content': '从5个不同元素中取3个的组合数是多少？',
            'correct_answer': 'C(5,3)=10',
            'student_answer': 'C(5,3)=60',
            'source_type': 'excel', 'source_ref': '习题册A第12行', 'source_note': '期中测验卷扫描页3',
            'attribution_reason': '混淆了排列与组合公式，使用了P(5,3)而非C(5,3)',
            'attribution_category': '公式混淆',
            'status': 'pending', 'data_quality': 'available',
        },
        {
            'student_id': 'S2024001', 'student_name': '张小明',
            'question_content': '盒子中有3红2白球，取2个恰好1红1白的组合情况数',
            'correct_answer': 'C(3,1)*C(2,1)=6',
            'student_answer': 'C(5,2)=10',
            'source_type': 'image', 'source_ref': 'scan_2024_03_15_008.png', 'source_note': '错题本第17页',
            'attribution_reason': '未理解分类分步，直接总数取2',
            'attribution_category': '分类分步缺失',
            'status': 'pending', 'data_quality': 'available',
        },
        {
            'student_id': 'S2024002', 'student_name': '李华',
            'question_content': '8人围圆桌就坐，有多少种不同坐法？',
            'correct_answer': '(8-1)!=5040',
            'student_answer': '8!=40320',
            'source_type': 'excel', 'source_ref': '圆排列专题第5行', 'source_note': '',
            'attribution_reason': '环形排列未减1，用了线排列公式',
            'attribution_category': '排列模型误判',
            'status': 'approved', 'data_quality': 'available',
        },
        {
            'student_id': 'S2024003', 'student_name': '王芳',
            'question_content': '从1-10中选3个数和为偶数的选法',
            'correct_answer': '',
            'student_answer': '',
            'source_type': 'note', 'source_ref': '', 'source_note': '学生口述，题干记录不完整',
            'attribution_reason': None,
            'attribution_category': None,
            'status': 'rejected', 'data_quality': 'recollect',
        },
        {
            'student_id': 'S2024003', 'student_name': '王芳',
            'question_content': '用0,1,2,3组成无重复数字三位偶数的个数',
            'correct_answer': '10个',
            'student_answer': '12个',
            'source_type': 'excel', 'source_ref': '特殊元素第8行', 'source_note': '课堂练习拍照',
            'attribution_reason': '0作首位的情况未剔除',
            'attribution_category': '特殊元素遗漏',
            'status': 'delayed', 'data_quality': 'delayed',
        },
        {
            'student_id': 'S2024004', 'student_name': '赵强',
            'question_content': '甲乙丙丁4人排成一排，甲不在首位的排法',
            'correct_answer': '18种',
            'student_answer': '24种',
            'source_type': 'image', 'source_ref': 'scan_homework_042.png', 'source_note': '周末作业第3题',
            'attribution_reason': '未考虑甲的位置约束',
            'attribution_category': '约束条件忽略',
            'status': 'pending', 'data_quality': 'available',
        },
    ]
    created = []
    for s in samples:
        q = WrongQuestion(**s)
        db.session.add(q)
        db.session.flush()
        run_constraint_checks(q)
        log_audit(q.id, 'init-script', None, s['status'], '初始化示例数据', None, s)
        created.append(q)
    db.session.commit()
    return jsonify({'created': len(created), 'ids': [q.id for q in created]})


def init_db():
    with app.app_context():
        db.create_all()
        if WrongQuestion.query.count() == 0:
            print('[init] 数据库为空，可调用 POST /api/init-sample 加载示例数据')


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
