import os
import json
import csv
import re
from datetime import datetime
from io import StringIO
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from models import db, ReinsuranceBatch, ApprovalEmail, OperationHistory, AnomalyRecord, SystemSetting

basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'data', 'reinsurance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(basedir, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

db.init_app(app)

STATUS_LABELS = {
    'pending': '待复核',
    'confirmed': '已确认',
    'withdrawn': '已撤回',
    'reversed': '负数冲正',
    'anomaly': '异常待处理',
    'supplemented': '补录改判'
}


@app.context_processor
def inject_globals():
    pending_count = ReinsuranceBatch.query.filter_by(status='pending').count()
    anomaly_count = AnomalyRecord.query.filter_by(status='pending').count()
    email_count = ApprovalEmail.query.count()
    return {
        'status_labels': STATUS_LABELS,
        'pending_count': pending_count,
        'anomaly_count': anomaly_count,
        'email_count': email_count
    }


def init_db():
    with app.app_context():
        db.create_all()
        if not SystemSetting.query.filter_by(key='current_operator').first():
            db.session.add(SystemSetting(key='current_operator', value='当前用户', description='当前操作人'))
            db.session.commit()


def log_operation(batch_id, op_type, **kwargs):
    batch = ReinsuranceBatch.query.get(batch_id)
    if not batch:
        return
    history = OperationHistory(
        batch_id=batch_id,
        operation_type=op_type,
        operator=kwargs.get('operator', '当前用户'),
        old_status=kwargs.get('old_status', batch.status),
        new_status=kwargs.get('new_status', batch.status),
        old_remark=kwargs.get('old_remark', batch.remark),
        new_remark=kwargs.get('new_remark', batch.remark),
        change_reason=kwargs.get('change_reason', ''),
        next_step=kwargs.get('next_step', ''),
        raw_snapshot=json.dumps({
            'batch_no': batch.batch_no,
            'amount': batch.amount,
            'caliber': batch.caliber,
            'policy_no': batch.policy_no,
            'status_snapshot': batch.status,
            'remark_snapshot': batch.remark,
            'timestamp': datetime.now().isoformat()
        }, ensure_ascii=False),
        is_manual_override=kwargs.get('is_manual_override', False)
    )
    db.session.add(history)


def detect_anomalies():
    batches = ReinsuranceBatch.query.all()
    anomaly_list = []

    for b in batches:
        if b.status == 'withdrawn':
            continue
        if b.amount < 0 and not AnomalyRecord.query.filter_by(
                batch_id=b.id, anomaly_type='negative_amount'
        ).first():
            anomaly = AnomalyRecord(
                batch_id=b.id,
                anomaly_type='negative_amount',
                description=f'负数金额需人工确认: {b.amount} {b.currency}',
                related_batch_ids='',
                status='pending'
            )
            db.session.add(anomaly)
            if b.status == 'pending':
                b.status = 'anomaly'
            anomaly_list.append(anomaly)

    amount_groups = {}
    for b in batches:
        if b.status == 'withdrawn':
            continue
        key = (round(b.amount, 2), b.policy_no or '', b.occur_date or '')
        if key not in amount_groups:
            amount_groups[key] = []
        amount_groups[key].append(b)

    for key, group in amount_groups.items():
        calibers = set(b.caliber for b in group if b.caliber)
        if len(group) > 1 and len(calibers) > 1:
            for b in group:
                existing = AnomalyRecord.query.filter_by(
                    batch_id=b.id, anomaly_type='duplicate_caliber'
                ).first()
                if not existing:
                    related_ids = ','.join(str(x.id) for x in group if x.id != b.id)
                    anomaly = AnomalyRecord(
                        batch_id=b.id,
                        anomaly_type='duplicate_caliber',
                        description=f'同一笔金额被多个口径认领: {",".join(calibers)}',
                        related_batch_ids=related_ids,
                        status='pending'
                    )
                    db.session.add(anomaly)
                    if b.status == 'pending':
                        b.status = 'anomaly'
                    anomaly_list.append(anomaly)
    db.session.commit()
    return anomaly_list


@app.route('/')
def index():
    batches = ReinsuranceBatch.query.order_by(ReinsuranceBatch.created_at.desc()).all()
    pending_count = ReinsuranceBatch.query.filter_by(status='pending').count()
    anomaly_count = AnomalyRecord.query.filter_by(status='pending').count()
    email_count = ApprovalEmail.query.count()
    return render_template('index.html',
                           batches=batches,
                           status_labels=STATUS_LABELS,
                           pending_count=pending_count,
                           anomaly_count=anomaly_count,
                           email_count=email_count)


@app.route('/batch/<int:batch_id>')
def batch_detail(batch_id):
    batch = ReinsuranceBatch.query.get_or_404(batch_id)
    histories = OperationHistory.query.filter_by(batch_id=batch_id).order_by(
        OperationHistory.operation_time.desc()).all()
    anomalies = AnomalyRecord.query.filter_by(batch_id=batch_id).all()
    emails = ApprovalEmail.query.filter(
        (ApprovalEmail.batch_id == batch_id) |
        (ApprovalEmail.related_batch_no == batch.batch_no)
    ).all()
    return render_template('batch_detail.html',
                           batch=batch,
                           histories=histories,
                           histories_json=[h.to_dict() for h in histories],
                           anomalies=anomalies,
                           emails=emails,
                           emails_json=[e.to_dict() for e in emails],
                           status_labels=STATUS_LABELS)


@app.route('/emails')
def email_list():
    emails = ApprovalEmail.query.order_by(ApprovalEmail.created_at.desc()).all()
    return render_template('emails.html', emails=emails, emails_json=[e.to_dict() for e in emails], status_labels=STATUS_LABELS)


@app.route('/anomalies')
def anomaly_list():
    anomalies = AnomalyRecord.query.order_by(AnomalyRecord.created_at.desc()).all()
    batches_map = {b.id: b for b in ReinsuranceBatch.query.all()}
    return render_template('anomalies.html', anomalies=anomalies, batches_map=batches_map, status_labels=STATUS_LABELS)


@app.route('/history')
def history_list():
    histories = OperationHistory.query.order_by(OperationHistory.operation_time.desc()).limit(500).all()
    batches_map = {b.id: b for b in ReinsuranceBatch.query.all()}
    return render_template('history.html', histories=histories, histories_json=[h.to_dict() for h in histories], batches_map=batches_map)


@app.route('/guide')
def guide():
    return render_template('guide.html')


@app.route('/api/batch/import', methods=['POST'])
def import_batches():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': '未找到文件'})
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': '未选择文件'})

    filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{datetime.now().strftime("%Y%m%d_%H%M%S")}_{filename}')
    file.save(filepath)

    count = 0
    try:
        if filename.lower().endswith('.csv'):
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                content = f.read()
            reader = csv.DictReader(StringIO(content))
            for row in reader:
                batch_no = (row.get('批次号') or row.get('batch_no') or row.get('batchNo') or '').strip()
                amount_str = (row.get('金额') or row.get('amount') or '0').strip()
                if not batch_no:
                    continue
                try:
                    amount = float(re.sub(r'[^\d.-]', '', str(amount_str)))
                except ValueError:
                    amount = 0.0
                status = 'pending'
                if amount < 0:
                    status = 'anomaly'
                batch = ReinsuranceBatch(
                    batch_no=batch_no,
                    amount=amount,
                    currency=(row.get('币种') or row.get('currency') or 'CNY').strip(),
                    caliber=(row.get('口径') or row.get('caliber') or '').strip(),
                    policy_no=(row.get('保单号') or row.get('policy_no') or '').strip(),
                    business_type=(row.get('业务类型') or row.get('business_type') or '').strip(),
                    occur_date=(row.get('发生日期') or row.get('occur_date') or '').strip(),
                    status=status,
                    raw_data=json.dumps(row, ensure_ascii=False),
                    source_file=filename
                )
                db.session.add(batch)
                count += 1
        db.session.commit()
        if count > 0:
            detect_anomalies()
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/email/import', methods=['POST'])
def import_emails():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': '未找到文件'})
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': '未选择文件'})

    filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{datetime.now().strftime("%Y%m%d_%H%M%S")}_{filename}')
    file.save(filepath)

    count = 0
    try:
        raw_content = ''
        if filename.lower().endswith('.eml') or filename.lower().endswith('.txt'):
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                raw_content = f.read()
            email = parse_email_text(raw_content, filename)
            if email:
                db.session.add(email)
                count = 1
        elif filename.lower().endswith('.csv'):
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                content = f.read()
            reader = csv.DictReader(StringIO(content))
            for row in reader:
                subject = (row.get('主题') or row.get('subject') or '').strip()
                body = (row.get('正文') or row.get('body') or row.get('内容') or '').strip()
                if not subject and not body:
                    continue
                amount = 0.0
                amount_str = (row.get('金额') or row.get('amount') or '').strip()
                if amount_str:
                    try:
                        amount = float(re.sub(r'[^\d.-]', '', str(amount_str)))
                    except ValueError:
                        pass
                related_batch_no = (row.get('批次号') or row.get('batch_no') or '').strip()
                batch_id = None
                if related_batch_no:
                    batch = ReinsuranceBatch.query.filter_by(batch_no=related_batch_no).first()
                    if batch:
                        batch_id = batch.id
                email = ApprovalEmail(
                    email_subject=subject,
                    email_from=(row.get('发件人') or row.get('from') or '').strip(),
                    email_to=(row.get('收件人') or row.get('to') or '').strip(),
                    email_date=(row.get('日期') or row.get('date') or '').strip(),
                    email_body=body,
                    raw_content=json.dumps(row, ensure_ascii=False),
                    source_file=filename,
                    related_batch_no=related_batch_no,
                    related_amount=amount or None,
                    batch_id=batch_id
                )
                db.session.add(email)
                count += 1
        db.session.commit()
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})


def parse_email_text(text, filename):
    subject = ''
    sender = ''
    recipient = ''
    date_str = ''
    body = ''
    related_batch_no = ''
    related_amount = None

    lines = text.split('\n')
    in_body = False
    body_lines = []
    for line in lines:
        stripped = line.strip()
        if not in_body:
            if stripped.lower().startswith('subject:'):
                subject = stripped[len('subject:'):].strip()
            elif stripped.lower().startswith('from:'):
                sender = stripped[len('from:'):].strip()
            elif stripped.lower().startswith('to:'):
                recipient = stripped[len('to:'):].strip()
            elif stripped.lower().startswith('date:'):
                date_str = stripped[len('date:'):].strip()
            elif stripped == '':
                in_body = True
            else:
                body_lines.append(stripped)
        else:
            body_lines.append(stripped)
    body = '\n'.join(body_lines)

    batch_match = re.search(r'批次[号码]*[\s:：]*([A-Za-z0-9_\-]+)', text)
    if batch_match:
        related_batch_no = batch_match.group(1)

    amount_match = re.search(r'金额[\s:：]*([\d,]+\.?\d*)', text)
    if amount_match:
        try:
            related_amount = float(amount_match.group(1).replace(',', ''))
        except ValueError:
            pass

    batch_id = None
    if related_batch_no:
        batch = ReinsuranceBatch.query.filter_by(batch_no=related_batch_no).first()
        if batch:
            batch_id = batch.id

    return ApprovalEmail(
        email_subject=subject,
        email_from=sender,
        email_to=recipient,
        email_date=date_str,
        email_body=body,
        raw_content=text,
        source_file=filename,
        related_batch_no=related_batch_no,
        related_amount=related_amount,
        batch_id=batch_id
    )


@app.route('/api/batch/<int:batch_id>/confirm', methods=['POST'])
def confirm_batch(batch_id):
    batch = ReinsuranceBatch.query.get_or_404(batch_id)
    data = request.json or {}
    old_status = batch.status
    old_remark = batch.remark
    batch.status = 'confirmed'
    if data.get('remark'):
        batch.remark = data.get('remark')
    log_operation(
        batch_id, 'confirm',
        old_status=old_status, new_status='confirmed',
        old_remark=old_remark, new_remark=batch.remark,
        change_reason=data.get('change_reason', ''),
        is_manual_override=data.get('is_manual_override', False)
    )
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/batch/<int:batch_id>/withdraw', methods=['POST'])
def withdraw_batch(batch_id):
    batch = ReinsuranceBatch.query.get_or_404(batch_id)
    data = request.json or {}
    old_status = batch.status
    old_remark = batch.remark
    batch.status = 'withdrawn'
    if data.get('remark'):
        batch.remark = data.get('remark')
    log_operation(
        batch_id, 'withdraw',
        old_status=old_status, new_status='withdrawn',
        old_remark=old_remark, new_remark=batch.remark,
        change_reason=data.get('change_reason', ''),
        next_step=data.get('next_step', ''),
        is_manual_override=data.get('is_manual_override', False)
    )
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/batch/<int:batch_id>/reverse', methods=['POST'])
def reverse_batch(batch_id):
    batch = ReinsuranceBatch.query.get_or_404(batch_id)
    data = request.json or {}
    if not data.get('change_reason'):
        return jsonify({'success': False, 'error': '负数冲正必须说明原因'})
    if not data.get('next_step'):
        return jsonify({'success': False, 'error': '负数冲正必须说明下一步操作'})
    old_status = batch.status
    old_remark = batch.remark
    batch.status = 'reversed'
    if data.get('remark'):
        batch.remark = data.get('remark')
    log_operation(
        batch_id, 'reverse',
        old_status=old_status, new_status='reversed',
        old_remark=old_remark, new_remark=batch.remark,
        change_reason=data['change_reason'],
        next_step=data['next_step'],
        is_manual_override=True
    )
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/batch/<int:batch_id>/supplement', methods=['POST'])
def supplement_batch(batch_id):
    batch = ReinsuranceBatch.query.get_or_404(batch_id)
    data = request.json or {}
    if not data.get('change_reason'):
        return jsonify({'success': False, 'error': '补录改判必须说明原因'})
    old_status = batch.status
    old_remark = batch.remark
    batch.status = data.get('new_status', 'confirmed')
    if data.get('remark'):
        batch.remark = data.get('remark')
    log_operation(
        batch_id, 'supplement',
        old_status=old_status, new_status=batch.status,
        old_remark=old_remark, new_remark=batch.remark,
        change_reason=data['change_reason'],
        next_step=data.get('next_step', ''),
        is_manual_override=True
    )
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/batch/<int:batch_id>/link_email/<int:email_id>', methods=['POST'])
def link_email(batch_id, email_id):
    email = ApprovalEmail.query.get_or_404(email_id)
    email.batch_id = batch_id
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/anomaly/<int:anomaly_id>/handle', methods=['POST'])
def handle_anomaly(anomaly_id):
    anomaly = AnomalyRecord.query.get_or_404(anomaly_id)
    data = request.json or {}
    anomaly.status = 'handled'
    anomaly.handler = data.get('handler', '当前用户')
    anomaly.handle_remark = data.get('handle_remark', '')
    anomaly.handled_at = datetime.now()
    batch = ReinsuranceBatch.query.get(anomaly.batch_id)
    if batch and batch.status == 'anomaly':
        batch.status = data.get('new_status', 'pending')
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/export/batches')
def export_batches():
    batches = ReinsuranceBatch.query.order_by(ReinsuranceBatch.created_at.desc()).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['批次号', '金额', '币种', '口径', '保单号', '业务类型', '发生日期', '状态', '操作人', '备注', '原始数据', '来源文件', '创建时间'])
    for b in batches:
        writer.writerow([
            b.batch_no, b.amount, b.currency, b.caliber, b.policy_no,
            b.business_type, b.occur_date, STATUS_LABELS.get(b.status, b.status),
            b.operator, b.remark or '', b.raw_data or '', b.source_file or '',
            b.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])
    output.seek(0)
    from flask import make_response
    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    resp.headers['Content-Disposition'] = f'attachment; filename=batches_{datetime.now().strftime("%Y%m%d")}.csv'
    return resp


@app.route('/api/export/history')
def export_history():
    histories = OperationHistory.query.order_by(OperationHistory.operation_time.desc()).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['批次ID', '批次号', '操作类型', '操作人', '操作时间', '原状态', '新状态', '原备注', '新备注', '改判原因', '下一步', '是否人工改判', '原始快照'])
    for h in histories:
        batch = ReinsuranceBatch.query.get(h.batch_id)
        writer.writerow([
            h.batch_id, batch.batch_no if batch else '',
            {'confirm': '确认', 'withdraw': '撤回', 'reverse': '负数冲正', 'supplement': '补录改判'}.get(h.operation_type, h.operation_type),
            h.operator,
            h.operation_time.strftime('%Y-%m-%d %H:%M:%S'),
            STATUS_LABELS.get(h.old_status, h.old_status or ''),
            STATUS_LABELS.get(h.new_status, h.new_status or ''),
            h.old_remark or '', h.new_remark or '',
            h.change_reason or '', h.next_step or '',
            '是' if h.is_manual_override else '否',
            h.raw_snapshot or ''
        ])
    output.seek(0)
    from flask import make_response
    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    resp.headers['Content-Disposition'] = f'attachment; filename=history_{datetime.now().strftime("%Y%m%d")}.csv'
    return resp


@app.route('/api/export/emails')
def export_emails():
    emails = ApprovalEmail.query.order_by(ApprovalEmail.created_at.desc()).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['邮件主题', '发件人', '收件人', '日期', '关联批次号', '关联金额', '正文摘要', '原始内容', '来源文件'])
    for e in emails:
        writer.writerow([
            e.email_subject, e.email_from, e.email_to, e.email_date,
            e.related_batch_no, e.related_amount or '',
            (e.email_body or '')[:200],
            e.raw_content or '', e.source_file or ''
        ])
    output.seek(0)
    from flask import make_response
    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv; charset=utf-8-sig'
    resp.headers['Content-Disposition'] = f'attachment; filename=emails_{datetime.now().strftime("%Y%m%d")}.csv'
    return resp


@app.route('/api/anomalies/redetect', methods=['POST'])
def redetect_anomalies():
    result = detect_anomalies()
    return jsonify({'success': True, 'new_count': len(result)})


if __name__ == '__main__':
    init_db()
    app.run(debug=False, host='127.0.0.1', port=5001)
