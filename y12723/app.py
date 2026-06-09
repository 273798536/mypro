import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta
from io import BytesIO

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

for _font in ['Arial Unicode MS', 'PingFang SC', 'Heiti SC', 'Microsoft YaHei', 'SimHei', 'Noto Sans CJK SC']:
    try:
        plt.rcParams['font.sans-serif'] = [_font]
        plt.rcParams['axes.unicode_minus'] = False
        break
    except Exception:
        continue
import pandas as pd
from flask import Flask, request, jsonify, send_file
from sqlalchemy import and_, func

from models import db, Student, WrongQuestion, CorrectionLog, WalkPathNode, ImportBatch

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///walk_review.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_AS_ASCII'] = False

db.init_app(app)

EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)

STATUS_VALID = ['pending', 'passed', 'failed']
DATA_STATUS_VALID = ['available', 'pending_review', 'need_recollect']


def compute_import_hash(record):
    key = f"{record.get('student_no', '')}|{record.get('question_id', '')}|{record.get('subject', '')}|{record.get('knowledge_point', '')}|{record.get('wrong_count', 1)}"
    return hashlib.sha256(key.encode('utf-8')).hexdigest()


def serialize_wrong_question(wq):
    return {
        'id': wq.id,
        'question_id': wq.question_id,
        'student_no': wq.student.student_no if wq.student else None,
        'student_name': wq.student.name if wq.student else None,
        'subject': wq.subject,
        'knowledge_point': wq.knowledge_point,
        'wrong_count': wq.wrong_count,
        'first_wrong_at': wq.first_wrong_at.isoformat() if wq.first_wrong_at else None,
        'last_wrong_at': wq.last_wrong_at.isoformat() if wq.last_wrong_at else None,
        'status': wq.status,
        'status_reason': wq.status_reason,
        'data_status': wq.data_status,
        'batch_id': wq.batch_id,
        'created_at': wq.created_at.isoformat(),
        'updated_at': wq.updated_at.isoformat(),
        'correction_history': [
            {
                'old_status': c.old_status,
                'new_status': c.new_status,
                'old_wrong_count': c.old_wrong_count,
                'new_wrong_count': c.new_wrong_count,
                'reason': c.reason,
                'operator': c.operator,
                'created_at': c.created_at.isoformat()
            }
            for c in wq.corrections
        ]
    }


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})


@app.route('/api/batches', methods=['GET'])
def list_batches():
    batches = ImportBatch.query.order_by(ImportBatch.created_at.desc()).all()
    return jsonify([
        {
            'batch_id': b.batch_id,
            'file_name': b.file_name,
            'total_records': b.total_records,
            'new_records': b.new_records,
            'updated_records': b.updated_records,
            'skipped_records': b.skipped_records,
            'operator': b.operator,
            'note': b.note,
            'created_at': b.created_at.isoformat()
        }
        for b in batches
    ])


@app.route('/api/import', methods=['POST'])
def import_data():
    data = request.get_json(force=True)
    batch_id = data.get('batch_id') or f"BATCH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    file_name = data.get('file_name', '')
    operator = data.get('operator', 'system')
    note = data.get('note', '')
    records = data.get('records', [])

    if ImportBatch.query.filter_by(batch_id=batch_id).first():
        return jsonify({'error': f'批次号 {batch_id} 已存在，请勿重复导入。若需覆盖请使用 /api/reimport'}), 409

    batch = ImportBatch(
        batch_id=batch_id,
        file_name=file_name,
        total_records=len(records),
        operator=operator,
        note=note
    )
    db.session.add(batch)

    new_count = 0
    updated_count = 0
    skipped_count = 0
    skipped_details = []

    for rec in records:
        student_no = rec.get('student_no')
        if not student_no:
            skipped_count += 1
            skipped_details.append({'record': rec, 'reason': '缺少 student_no'})
            continue

        student = Student.query.filter_by(student_no=student_no).first()
        if not student:
            student = Student(
                student_no=student_no,
                name=rec.get('student_name', student_no),
                grade=rec.get('grade')
            )
            db.session.add(student)
            db.session.flush()

        question_id = rec.get('question_id', '')
        subject = rec.get('subject', '')
        knowledge_point = rec.get('knowledge_point', '')
        wrong_count = int(rec.get('wrong_count', 1))
        imp_hash = compute_import_hash(rec)

        existing = WrongQuestion.query.filter(
            and_(
                WrongQuestion.student_id == student.id,
                WrongQuestion.question_id == question_id
            )
        ).order_by(WrongQuestion.updated_at.desc()).first()

        if existing and existing.import_hash == imp_hash:
            skipped_count += 1
            skipped_details.append({
                'student_no': student_no,
                'question_id': question_id,
                'reason': '记录完全相同，跳过以避免冲突'
            })
            continue

        if existing and existing.batch_id == batch_id:
            skipped_count += 1
            skipped_details.append({
                'student_no': student_no,
                'question_id': question_id,
                'reason': '同一批次内重复记录，保留首次导入'
            })
            continue

        wq = WrongQuestion(
            question_id=question_id,
            student_id=student.id,
            subject=subject,
            knowledge_point=knowledge_point,
            wrong_count=wrong_count,
            status=rec.get('status', 'pending'),
            status_reason=rec.get('status_reason'),
            data_status=rec.get('data_status', 'available'),
            batch_id=batch_id,
            import_hash=imp_hash
        )
        if 'first_wrong_at' in rec:
            try:
                wq.first_wrong_at = datetime.fromisoformat(rec['first_wrong_at'])
            except (ValueError, TypeError):
                pass
        if 'last_wrong_at' in rec:
            try:
                wq.last_wrong_at = datetime.fromisoformat(rec['last_wrong_at'])
            except (ValueError, TypeError):
                pass

        if existing:
            wq.first_wrong_at = existing.first_wrong_at
            wq.status = existing.status
            wq.status_reason = existing.status_reason
            wq.data_status = existing.data_status
            updated_count += 1
        else:
            new_count += 1

        db.session.add(wq)
        db.session.flush()

        path = rec.get('walk_path', [])
        for idx, node in enumerate(path):
            db.session.add(WalkPathNode(
                wrong_question_id=wq.id,
                step_order=idx,
                from_knowledge=node.get('from'),
                to_knowledge=node.get('to'),
                transition_prob=float(node.get('prob', 0.0)),
                visit_count=int(node.get('visit', 1)),
                batch_id=batch_id
            ))

    batch.new_records = new_count
    batch.updated_records = updated_count
    batch.skipped_records = skipped_count
    db.session.commit()

    return jsonify({
        'batch_id': batch_id,
        'total': len(records),
        'new': new_count,
        'updated': updated_count,
        'skipped': skipped_count,
        'skipped_details': skipped_details[:20]
    })


@app.route('/api/reimport', methods=['POST'])
def reimport_data():
    data = request.get_json(force=True)
    batch_id = data.get('batch_id')
    if not batch_id:
        return jsonify({'error': 'reimport 需要指定 batch_id'}), 400

    existing_batch = ImportBatch.query.filter_by(batch_id=batch_id).first()
    if existing_batch:
        WalkPathNode.query.filter_by(batch_id=batch_id).delete()
        WrongQuestion.query.filter_by(batch_id=batch_id).delete()
        db.session.delete(existing_batch)
        db.session.commit()

    return import_data()


@app.route('/api/wrong-questions', methods=['GET'])
def list_wrong_questions():
    student_no = request.args.get('student_no')
    subject = request.args.get('subject')
    status = request.args.get('status')
    data_status = request.args.get('data_status')
    batch_id = request.args.get('batch_id')

    q = WrongQuestion.query
    if student_no:
        q = q.join(Student).filter(Student.student_no == student_no)
    if subject:
        q = q.filter(WrongQuestion.subject == subject)
    if status:
        q = q.filter(WrongQuestion.status == status)
    if data_status:
        q = q.filter(WrongQuestion.data_status == data_status)
    if batch_id:
        q = q.filter(WrongQuestion.batch_id == batch_id)

    items = q.order_by(WrongQuestion.updated_at.desc()).all()
    return jsonify([serialize_wrong_question(wq) for wq in items])


@app.route('/api/wrong-questions/<int:wq_id>', methods=['GET'])
def get_wrong_question(wq_id):
    wq = WrongQuestion.query.get_or_404(wq_id)
    result = serialize_wrong_question(wq)
    result['walk_path'] = [
        {
            'step': n.step_order,
            'from': n.from_knowledge,
            'to': n.to_knowledge,
            'prob': n.transition_prob,
            'visit': n.visit_count
        }
        for n in sorted(wq.path_nodes, key=lambda x: x.step_order)
    ]
    return jsonify(result)


@app.route('/api/wrong-questions/<int:wq_id>/correct', methods=['POST'])
def correct_wrong_question(wq_id):
    wq = WrongQuestion.query.get_or_404(wq_id)
    data = request.get_json(force=True)

    old_status = wq.status
    old_wrong_count = wq.wrong_count
    new_status = data.get('new_status')
    new_wrong_count = data.get('new_wrong_count')
    reason = data.get('reason', '')
    operator = data.get('operator', 'anonymous')

    if new_status and new_status not in STATUS_VALID:
        return jsonify({'error': f'状态值无效，可选: {STATUS_VALID}'}), 400

    changes = []
    if new_status and new_status != old_status:
        changes.append(f'status: {old_status} -> {new_status}')
        wq.status = new_status

    if new_wrong_count is not None and int(new_wrong_count) != old_wrong_count:
        changes.append(f'wrong_count: {old_wrong_count} -> {new_wrong_count}')
        wq.wrong_count = int(new_wrong_count)

    if 'status_reason' in data:
        wq.status_reason = data['status_reason']
    if 'data_status' in data:
        if data['data_status'] not in DATA_STATUS_VALID:
            return jsonify({'error': f'data_status 无效，可选: {DATA_STATUS_VALID}'}), 400
        wq.data_status = data['data_status']

    if not changes:
        return jsonify({'warning': '未检测到实际变更'})

    db.session.add(CorrectionLog(
        wrong_question_id=wq.id,
        old_status=old_status,
        new_status=new_status or old_status,
        old_wrong_count=old_wrong_count,
        new_wrong_count=new_wrong_count if new_wrong_count is not None else old_wrong_count,
        reason=reason or '; '.join(changes),
        operator=operator
    ))
    db.session.commit()

    return jsonify({
        'id': wq.id,
        'changes': changes,
        'old_status': old_status,
        'new_status': wq.status,
        'old_wrong_count': old_wrong_count,
        'new_wrong_count': wq.wrong_count,
        'reason': reason,
        'operator': operator
    })


@app.route('/api/walk-path/compare', methods=['GET'])
def compare_walk_path():
    student_no = request.args.get('student_no')
    subject = request.args.get('subject')
    from_batch = request.args.get('from_batch')
    to_batch = request.args.get('to_batch')

    if not student_no:
        return jsonify({'error': '缺少 student_no 参数'}), 400

    student = Student.query.filter_by(student_no=student_no).first()
    if not student:
        return jsonify({'error': '学生不存在'}), 404

    q = WrongQuestion.query.filter_by(student_id=student.id)
    if subject:
        q = q.filter_by(subject=subject)

    result = {
        'student_no': student_no,
        'student_name': student.name,
        'batches': [],
        'data_availability': {
            '可用': 0,
            '待复核': 0,
            '需重采': 0
        }
    }

    for wq in q.all():
        ds = wq.data_status
        if ds == 'available':
            result['data_availability']['可用'] += 1
        elif ds == 'pending_review':
            result['data_availability']['待复核'] += 1
        elif ds == 'need_recollect':
            result['data_availability']['需重采'] += 1

    batches = ImportBatch.query.order_by(ImportBatch.created_at.asc()).all()
    for b in batches:
        batch_wqs = q.filter_by(batch_id=b.batch_id).all()
        if batch_wqs:
            result['batches'].append({
                'batch_id': b.batch_id,
                'created_at': b.created_at.isoformat(),
                'note': b.note,
                'wrong_count': sum(w.wrong_count for w in batch_wqs),
                'pending_count': sum(1 for w in batch_wqs if w.status == 'pending'),
                'passed_count': sum(1 for w in batch_wqs if w.status == 'passed'),
                'question_count': len(batch_wqs)
            })

    return jsonify(result)


@app.route('/api/export/chart', methods=['GET'])
def export_chart():
    student_no = request.args.get('student_no')
    subject = request.args.get('subject')
    chart_type = request.args.get('type', 'trend')

    q = WrongQuestion.query
    if student_no:
        q = q.join(Student).filter(Student.student_no == student_no)
    if subject:
        q = q.filter(WrongQuestion.subject == subject)

    items = q.all()
    if not items:
        return jsonify({'error': '无数据可导出'}), 404

    fig, ax = plt.subplots(figsize=(10, 6))

    if chart_type == 'status':
        statuses = {}
        for w in items:
            statuses[w.status] = statuses.get(w.status, 0) + 1
        labels = {'pending': '待确认', 'passed': '已通过', 'failed': '未通过'}
        ax.bar([labels.get(k, k) for k in statuses.keys()], statuses.values(), color=['#FFA500', '#4CAF50', '#F44336'])
        ax.set_title('错题状态分布')
        ax.set_ylabel('数量')
    elif chart_type == 'subject':
        subjects = {}
        for w in items:
            subjects[w.subject] = subjects.get(w.subject, 0) + w.wrong_count
        ax.bar(subjects.keys(), subjects.values(), color='#2196F3')
        ax.set_title('各学科错题次数统计')
        ax.set_ylabel('错题次数')
        plt.xticks(rotation=30)
    elif chart_type == 'data_status':
        ds_map = {'available': '可用', 'pending_review': '待复核', 'need_recollect': '需重采'}
        dss = {}
        for w in items:
            key = ds_map.get(w.data_status, w.data_status)
            dss[key] = dss.get(key, 0) + 1
        ax.bar(dss.keys(), dss.values(), color=['#4CAF50', '#FFC107', '#F44336'])
        ax.set_title('数据可用性分布')
        ax.set_ylabel('数量')
    else:
        df = pd.DataFrame([{
            'date': w.created_at.date(),
            'wrong_count': w.wrong_count
        } for w in items])
        daily = df.groupby('date').sum().sort_index()
        ax.plot(daily.index.astype(str), daily['wrong_count'], marker='o', color='#2196F3')
        ax.set_title('错题次数趋势 (随机游走路径复盘)')
        ax.set_ylabel('错题次数')
        ax.set_xlabel('日期')
        plt.xticks(rotation=30)

    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=120)
    buf.seek(0)
    plt.close(fig)

    filename = f"walk_review_{chart_type}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"
    return send_file(buf, mimetype='image/png', as_attachment=True, download_name=filename)


@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    student_no = request.args.get('student_no')
    subject = request.args.get('subject')

    q = WrongQuestion.query
    if student_no:
        q = q.join(Student).filter(Student.student_no == student_no)
    if subject:
        q = q.filter(WrongQuestion.subject == subject)

    items = q.all()
    rows = []
    for w in items:
        rows.append({
            '学号': w.student.student_no if w.student else '',
            '姓名': w.student.name if w.student else '',
            '题目ID': w.question_id,
            '学科': w.subject,
            '知识点': w.knowledge_point,
            '错误次数': w.wrong_count,
            '状态': {'pending': '待确认', 'passed': '已通过', 'failed': '未通过'}.get(w.status, w.status),
            '状态原因': w.status_reason or '',
            '数据状态': {'available': '可用', 'pending_review': '待复核', 'need_recollect': '需重采'}.get(w.data_status, w.data_status),
            '批次': w.batch_id,
            '首次错误': w.first_wrong_at.isoformat() if w.first_wrong_at else '',
            '最近错误': w.last_wrong_at.isoformat() if w.last_wrong_at else ''
        })

    df = pd.DataFrame(rows)
    buf = BytesIO()
    df.to_csv(buf, index=False, encoding='utf-8-sig')
    buf.seek(0)
    filename = f"walk_review_export_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    return send_file(buf, mimetype='text/csv', as_attachment=True, download_name=filename)


@app.route('/api/export/dashboard', methods=['GET'])
def export_dashboard():
    total = WrongQuestion.query.count()
    pending = WrongQuestion.query.filter_by(status='pending').count()
    passed = WrongQuestion.query.filter_by(status='passed').count()
    failed = WrongQuestion.query.filter_by(status='failed').count()

    avail = WrongQuestion.query.filter_by(data_status='available').count()
    review = WrongQuestion.query.filter_by(data_status='pending_review').count()
    recollect = WrongQuestion.query.filter_by(data_status='need_recollect').count()

    recent = CorrectionLog.query.order_by(CorrectionLog.created_at.desc()).limit(10).all()

    return jsonify({
        'summary': {
            '总错题数': total,
            '待确认': pending,
            '已通过': passed,
            '未通过': failed
        },
        'data_availability': {
            '可用数据': avail,
            '待复核数据': review,
            '需重新采集': recollect,
            '说明': {
                '可用数据': '字段完整、可直接用于投委会复盘结论',
                '待复核数据': '参数缺失或存在冲突，需风控分析师人工判定',
                '需重新采集': '原始数据异常或批次冲突，需要从源头重新采集'
            }
        },
        'recent_corrections': [
            {
                '时间': c.created_at.isoformat(),
                '操作人': c.operator,
                '错题ID': c.wrong_question_id,
                '状态变更': f"{c.old_status} -> {c.new_status}",
                '次数变更': f"{c.old_wrong_count} -> {c.new_wrong_count}" if c.old_wrong_count != c.new_wrong_count else None,
                '原因': c.reason
            }
            for c in recent
        ]
    })


with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
